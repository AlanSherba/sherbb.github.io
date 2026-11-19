use spacetimedb::{ConnectionId, Identity, ReducerContext, Table, Timestamp};

// Cursor panels (see Cursor::panel)
const PANEL_HIDDEN: u8 = 255;
const PANEL_MAX: u8 = 2;
// Cursor coordinates are pixels; anything beyond this is junk
const MAX_COORD: f32 = 100_000.0;

// Longest chat text, in bytes (the client limits it to 120 characters)
const MAX_CHAT_LEN: usize = 480;

// Longest location a client may report. Locations are short keys like
// "projects/Gridform" or "blog/markdown-test".
const MAX_LOCATION_LEN: usize = 128;

// One row per open browser tab. Rows are added when a client connects and
// removed when it disconnects. Private: clients see only the per-page
// counts in `page_readers`, never who is where.
#[spacetimedb::table(accessor = online)]
pub struct Online {
    #[primary_key]
    pub connection_id: ConnectionId,
    pub identity: Identity,
    pub connected_at: Timestamp,
    // The page this tab is reading, or "" until the client reports one
    #[index(btree)]
    #[default("")]
    pub location: String,
}

// How many tabs are reading each page; pages with no readers have no row.
// Kept in step with `online` by the reducers below. Clients subscribe to
// this table only, so a page change sends them one or two small row
// changes and nothing else.
#[spacetimedb::table(accessor = page_readers, public)]
pub struct PageReaders {
    #[primary_key]
    pub location: String,
    pub readers: u32,
}

// One row per tab that is sharing its cursor. A tab only sends cursor
// moves while someone else is on its page, and its row is removed when it
// changes page or disconnects. Clients subscribe to the rows for their own
// page: SELECT * FROM cursor WHERE page = <page_id(location)>.
#[spacetimedb::table(accessor = cursor, public)]
pub struct Cursor {
    #[primary_key]
    pub connection_id: ConnectionId,
    // page_id of the page the cursor is on. A number rather than the
    // location text keeps every cursor update small.
    #[index(btree)]
    pub page: u32,
    pub x: f32,
    pub y: f32,
    // What x and y are relative to: 0 = the page (top left of the content,
    // above the name), 1 = the scrolled list of pages, 2 = the scrolled page
    // details. 255 = hidden (pointer left the window).
    pub panel: u8,
}

// What each tab is typing in its cursor chat, like Figma's cursor chat. One
// row per tab with chat open; the row is removed when chat closes, the tab
// changes page, or it disconnects. Kept apart from `cursor` so cursor moves
// never carry text, and typing never carries a position. Clients subscribe
// to their page's rows: SELECT * FROM chat WHERE page = <page_id(location)>.
#[spacetimedb::table(accessor = chat, public)]
pub struct Chat {
    #[primary_key]
    pub connection_id: ConnectionId,
    #[index(btree)]
    pub page: u32,
    // Counts the messages this tab has started. Pressing Enter starts a new
    // one: the count goes up and the text empties. Clients animate the
    // previous text away when they see the count change.
    pub message: u32,
    // The message as typed so far, updated as the person types
    pub text: String,
}

// 32-bit FNV-1a hash of a location. The client computes the same hash to
// subscribe to its page's cursors.
pub fn page_id(location: &str) -> u32 {
    location.bytes().fold(0x811c_9dc5u32, |hash, byte| {
        (hash ^ byte as u32).wrapping_mul(0x0100_0193)
    })
}

fn enter(ctx: &ReducerContext, location: &str) {
    if location.is_empty() {
        return;
    }
    let pages = ctx.db.page_readers();
    match pages.location().find(location.to_string()) {
        Some(page) => {
            pages.location().update(PageReaders {
                readers: page.readers + 1,
                ..page
            });
        }
        None => {
            pages.insert(PageReaders {
                location: location.to_string(),
                readers: 1,
            });
        }
    }
}

fn leave(ctx: &ReducerContext, location: &str) {
    if location.is_empty() {
        return;
    }
    let pages = ctx.db.page_readers();
    if let Some(page) = pages.location().find(location.to_string()) {
        if page.readers <= 1 {
            pages.location().delete(location.to_string());
        } else {
            pages.location().update(PageReaders {
                readers: page.readers - 1,
                ..page
            });
        }
    }
}

// Remove a tab and its count
fn remove_connection(ctx: &ReducerContext, connection_id: ConnectionId) {
    if let Some(row) = ctx.db.online().connection_id().find(connection_id) {
        leave(ctx, &row.location);
        ctx.db.online().connection_id().delete(connection_id);
    }
    ctx.db.cursor().connection_id().delete(connection_id);
    ctx.db.chat().connection_id().delete(connection_id);
}

#[spacetimedb::reducer(client_connected)]
pub fn client_connected(ctx: &ReducerContext) {
    if let Some(connection_id) = ctx.connection_id() {
        remove_connection(ctx, connection_id);
        ctx.db.online().insert(Online {
            connection_id,
            identity: ctx.sender(),
            connected_at: ctx.timestamp,
            location: String::new(),
        });
    }
}

#[spacetimedb::reducer(client_disconnected)]
pub fn client_disconnected(ctx: &ReducerContext) {
    if let Some(connection_id) = ctx.connection_id() {
        remove_connection(ctx, connection_id);
    }
}

// "I am reading this page." Clients call this only when their page changes.
#[spacetimedb::reducer]
pub fn set_location(ctx: &ReducerContext, location: String) -> Result<(), String> {
    if location.len() > MAX_LOCATION_LEN {
        return Err("location too long".into());
    }
    let connection_id = ctx.connection_id().ok_or("no connection")?;
    let row = ctx
        .db
        .online()
        .connection_id()
        .find(connection_id)
        .ok_or("not connected")?;
    if row.location != location {
        leave(ctx, &row.location);
        enter(ctx, &location);
        // The cursor and chat belonged to the old page
        ctx.db.cursor().connection_id().delete(connection_id);
        ctx.db.chat().connection_id().delete(connection_id);
        ctx.db.online().connection_id().update(Online { location, ..row });
    }
    Ok(())
}

// Share this tab's cursor with others on its page. Clients send this a few
// times a second, only while the cursor moves and someone else is reading
// the same page.
#[spacetimedb::reducer]
pub fn move_cursor(ctx: &ReducerContext, x: f32, y: f32, panel: u8) -> Result<(), String> {
    if !(x.is_finite() && y.is_finite() && x.abs() <= MAX_COORD && y.abs() <= MAX_COORD) {
        return Err("bad position".into());
    }
    if panel > PANEL_MAX && panel != PANEL_HIDDEN {
        return Err("bad panel".into());
    }
    let connection_id = ctx.connection_id().ok_or("no connection")?;
    let Some(row) = ctx.db.online().connection_id().find(connection_id) else {
        return Err("not connected".into());
    };
    if row.location.is_empty() {
        return Ok(());
    }
    let cursor = Cursor {
        connection_id,
        page: page_id(&row.location),
        x,
        y,
        panel,
    };
    if ctx.db.cursor().connection_id().find(connection_id).is_some() {
        ctx.db.cursor().connection_id().update(cursor);
    } else {
        ctx.db.cursor().insert(cursor);
    }
    Ok(())
}

// Open chat, or update what this tab is typing. `message` is the tab's
// message count (see Chat::message).
#[spacetimedb::reducer]
pub fn set_chat(ctx: &ReducerContext, message: u32, text: String) -> Result<(), String> {
    if text.len() > MAX_CHAT_LEN {
        return Err("chat text too long".into());
    }
    let connection_id = ctx.connection_id().ok_or("no connection")?;
    let Some(row) = ctx.db.online().connection_id().find(connection_id) else {
        return Err("not connected".into());
    };
    if row.location.is_empty() {
        return Ok(());
    }
    let chat = Chat {
        connection_id,
        page: page_id(&row.location),
        message,
        text,
    };
    if ctx.db.chat().connection_id().find(connection_id).is_some() {
        ctx.db.chat().connection_id().update(chat);
    } else {
        ctx.db.chat().insert(chat);
    }
    Ok(())
}

#[spacetimedb::reducer]
pub fn close_chat(ctx: &ReducerContext) -> Result<(), String> {
    let connection_id = ctx.connection_id().ok_or("no connection")?;
    ctx.db.chat().connection_id().delete(connection_id);
    Ok(())
}
