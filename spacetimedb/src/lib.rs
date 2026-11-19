use spacetimedb::{ConnectionId, Identity, ReducerContext, Table, Timestamp};

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
        ctx.db.online().connection_id().update(Online { location, ..row });
    }
    Ok(())
}
