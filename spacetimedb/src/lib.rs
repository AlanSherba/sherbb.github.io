use spacetimedb::http::{Request, Timeout};
use spacetimedb::{
    AnonymousViewContext, ConnectionId, Identity, ProcedureContext, ReducerContext, ScheduleAt, Table, TimeDuration,
    Timestamp,
};
use std::time::Duration;

// Cursor panels (see Cursor::panel)
const PANEL_HIDDEN: u8 = 255;
const PANEL_MAX: u8 = 2;
// Cursor coordinates are pixels; anything beyond this is junk
const MAX_COORD: f32 = 100_000.0;

// Longest chat text, in bytes (the client limits it to 120 characters)
const MAX_CHAT_LEN: usize = 480;

// Dinner bell: longest message, in characters, and how long after a ring
// before anyone can ring again
const MAX_BELL_CHARS: usize = 240;
const BELL_COOLDOWN: Duration = Duration::from_secs(5 * 60);

// Settings supplied when the module is published, never stored in the
// (public) source. Set with:
//   DISCORD_WEBHOOK_URL=... spacetime publish sherbb-site --env-only --yes
#[allow(non_snake_case)]
#[spacetimedb::env]
pub struct Env {
    // Discord webhook the dinner bell posts to. While unset, rings are
    // accepted but nothing is sent.
    pub DISCORD_WEBHOOK_URL: Option<String>,
    // Discord user ID (a number, not a username) to @mention in each ring,
    // so it notifies them
    pub DISCORD_PING_USER_ID: Option<String>,
    // Discord webhook new guest book messages are posted to. While unset,
    // messages are kept but not posted.
    pub DISCORD_GUEST_BOOK_WEBHOOK_URL: Option<String>,
    // The password that crowns the site owner (see claim_owner). While unset,
    // or shorter than MIN_OWNER_PASSWORD_CHARS, nobody can claim.
    pub OWNER_PASSWORD: Option<String>,
}

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
    ctx.db.owner_tab().connection_id().delete(connection_id);
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
        if ctx.db.owner().identity().find(ctx.sender()).is_some() {
            ctx.db.owner_tab().insert(OwnerTab { connection_id });
        }
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

// ---- Dinner bell ----
//
// A visitor rings the bell (with an optional message) and the site owner
// gets a Discord message, so they can come and meet the visitor on the site.
// One ring per BELL_COOLDOWN across all visitors keeps it from being spammed.

// When the bell was last rung and when it can next be rung. A single row
// (id 0), absent until the first ring. Public so every visitor can show the
// cooldown.
#[spacetimedb::table(accessor = bell, public)]
pub struct Bell {
    #[primary_key]
    pub id: u8,
    pub rung_at: Timestamp,
    pub ready_at: Timestamp,
}

// A ring waiting to be sent to Discord. Each row runs send_bell once, right
// away, and is then deleted. Private: the message never goes to clients.
#[spacetimedb::table(accessor = bell_ring, scheduled(send_bell))]
pub struct BellRing {
    #[primary_key]
    #[auto_inc]
    pub scheduled_id: u64,
    pub scheduled_at: ScheduleAt,
    pub message: String,
    // The page the visitor was reading, and how many were reading it
    pub location: String,
    pub readers: u32,
}

#[spacetimedb::reducer]
pub fn ring_bell(ctx: &ReducerContext, message: String) -> Result<(), String> {
    let message = message.trim().to_string();
    if message.chars().count() > MAX_BELL_CHARS {
        return Err("Message too long".into());
    }
    let connection_id = ctx.connection_id().ok_or("no connection")?;
    let online = ctx
        .db
        .online()
        .connection_id()
        .find(connection_id)
        .ok_or("not connected")?;
    let bell = ctx.db.bell().id().find(0);
    if let Some(bell) = &bell {
        if bell.ready_at > ctx.timestamp {
            return Err("The bell was rung recently".into());
        }
    }
    let row = Bell {
        id: 0,
        rung_at: ctx.timestamp,
        ready_at: ctx.timestamp + TimeDuration::from(BELL_COOLDOWN),
    };
    if bell.is_some() {
        ctx.db.bell().id().update(row);
    } else {
        ctx.db.bell().insert(row);
    }
    let readers = ctx
        .db
        .page_readers()
        .location()
        .find(online.location.clone())
        .map_or(0, |page| page.readers);
    ctx.db.bell_ring().insert(BellRing {
        scheduled_id: 0,
        scheduled_at: ScheduleAt::Time(ctx.timestamp),
        message,
        location: online.location,
        readers,
    });
    Ok(())
}

// The Discord message for a ring
fn bell_text(ring: &BellRing) -> String {
    let page = if ring.location.is_empty() {
        "the site"
    } else {
        &ring.location
    };
    let mut text = format!("\u{1F514} **Dinner bell!** Someone is reading `{page}`");
    let others = ring.readers.saturating_sub(1);
    if others > 0 {
        let plural = if others == 1 { "" } else { "s" };
        text += &format!(" ({others} other{plural} there too)");
    }
    for line in ring.message.lines() {
        text += "\n> ";
        text += line;
    }
    text
}

// ---- The owner's bedtime ----
//
// The owner lives on Central European Time and sleeps from 20:00 to 08:00
// there. Rings during that time are still sent, but without the @mention, so
// they don't wake anyone. The site shows visitors the same hours (see
// DinnerBell.tsx).

const BEDTIME_HOUR: i64 = 20;
const WAKE_HOUR: i64 = 8;

// Days since 1970-01-01 of a date (proleptic Gregorian)
fn days_from_civil(year: i64, month: i64, day: i64) -> i64 {
    let year = if month <= 2 { year - 1 } else { year };
    let era = year.div_euclid(400);
    let year_of_era = year - era * 400;
    let day_of_year = (153 * ((month + 9) % 12) + 2) / 5 + day - 1;
    let day_of_era = year_of_era * 365 + year_of_era / 4 - year_of_era / 100 + day_of_year;
    era * 146_097 + day_of_era - 719_468
}

// The year containing a day (days since 1970-01-01)
fn year_from_days(days: i64) -> i64 {
    let days = days + 719_468;
    let era = days.div_euclid(146_097);
    let day_of_era = days - era * 146_097;
    let year_of_era =
        (day_of_era - day_of_era / 1460 + day_of_era / 36_524 - day_of_era / 146_096) / 365;
    let day_of_year = day_of_era - (365 * year_of_era + year_of_era / 4 - year_of_era / 100);
    let month_index = (5 * day_of_year + 2) / 153; // 0 = March
    year_of_era + era * 400 + if month_index >= 10 { 1 } else { 0 }
}

// Last Sunday of a 31-day month, as days since 1970-01-01
fn last_sunday(year: i64, month: i64) -> i64 {
    let last = days_from_civil(year, month, 31);
    // 1970-01-01 was a Thursday
    last - (last + 4).rem_euclid(7)
}

// The hour (0-23) in Central European Time: UTC+1, or UTC+2 (summer time)
// from 01:00 UTC on the last Sunday of March to 01:00 UTC on the last Sunday
// of October
fn central_european_hour(seconds_since_epoch: i64) -> i64 {
    let year = year_from_days(seconds_since_epoch.div_euclid(86_400));
    let summer_start = last_sunday(year, 3) * 86_400 + 3600;
    let summer_end = last_sunday(year, 10) * 86_400 + 3600;
    let offset_hours = if (summer_start..summer_end).contains(&seconds_since_epoch) {
        2
    } else {
        1
    };
    (seconds_since_epoch + offset_hours * 3600).rem_euclid(86_400) / 3600
}

fn owner_asleep(now: Timestamp) -> bool {
    let hour = central_european_hour(now.to_micros_since_unix_epoch().div_euclid(1_000_000));
    !(WAKE_HOUR..BEDTIME_HOUR).contains(&hour)
}

// Post a message to a Discord webhook, @mentioning `ping` (a Discord user
// ID) if given. Nothing a visitor types can ping anyone (@everyone, roles,
// users): only `ping` may be mentioned.
fn post_to_discord(
    ctx: &mut ProcedureContext,
    what: &str,
    url: Option<String>,
    content: String,
    ping: Option<String>,
) {
    let Some(url) = url else {
        log::warn!("{what}: no webhook URL is set, so nothing was sent");
        return;
    };
    let content = match &ping {
        Some(id) => format!("<@{id}> {content}"),
        None => content,
    };
    let body = serde_json::json!({
        "content": content,
        "allowed_mentions": { "parse": [], "users": ping.into_iter().collect::<Vec<_>>() },
    })
    .to_string();
    let request = match Request::builder()
        .uri(url)
        .method("POST")
        .header("Content-Type", "application/json")
        .extension(Timeout::from(TimeDuration::from(Duration::from_millis(500))))
        .body(body)
    {
        Ok(request) => request,
        Err(error) => {
            log::error!("{what}: bad webhook URL: {error}");
            return;
        }
    };
    match ctx.http.send(request) {
        Ok(response) if response.status().is_success() => log::info!("{what} sent"),
        Ok(response) => log::error!("{what}: Discord answered {}", response.status()),
        Err(error) => log::error!("{what}: request failed: {error}"),
    }
}

// Post a ring to Discord. A procedure, since reducers can't make requests.
#[spacetimedb::procedure]
pub fn send_bell(ctx: &mut ProcedureContext, ring: BellRing) {
    // Ping the owner, if set and they're awake
    let ping = ctx
        .env
        .DISCORD_PING_USER_ID()
        .filter(|id| !id.is_empty() && id.bytes().all(|byte| byte.is_ascii_digit()))
        .filter(|_| !owner_asleep(ctx.timestamp));
    let url = ctx.env.DISCORD_WEBHOOK_URL();
    post_to_discord(ctx, "Dinner bell", url, bell_text(&ring), ping);
}

// ---- Guest book ----
//
// Visitors leave public messages. Anyone can delete their own messages, and
// anyone can report someone else's message, which hides it behind a
// "Censored" cover for everyone until anyone un-reports it. The owner
// deletes messages with SQL:
//   spacetime sql sherbb-site "DELETE FROM guest_message WHERE id = 12"
// Each new message is also posted to Discord (its own webhook, set with
// DISCORD_GUEST_BOOK_WEBHOOK_URL like DISCORD_WEBHOOK_URL), without a ping.

const MAX_GUEST_NAME_CHARS: usize = 24;
const MAX_GUEST_MESSAGE_CHARS: usize = 240;
// How long a visitor waits between messages
const GUEST_COOLDOWN: Duration = Duration::from_secs(30);
// How many of the latest messages clients see (see recent_guest_messages)
const GUEST_BOOK_PAGE: usize = 100;

// Every message. Private: clients read the latest ones through
// recent_guest_messages, and only while the guest book is open.
#[spacetimedb::table(accessor = guest_message)]
pub struct GuestMessage {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    // Who wrote it; only they can delete it
    #[index(btree)]
    pub sender: Identity,
    pub name: String,
    pub text: String,
    #[index(btree)]
    pub sent_at: Timestamp,
    // Hidden behind a cover until un-reported
    pub reported: bool,
}

// The latest GUEST_BOOK_PAGE messages, oldest first
#[spacetimedb::view(accessor = recent_guest_messages, public)]
fn recent_guest_messages(ctx: &AnonymousViewContext) -> Vec<GuestMessage> {
    let mut messages: Vec<GuestMessage> = ctx
        .db
        .guest_message()
        .sent_at()
        .filter(Timestamp::UNIX_EPOCH..)
        .collect();
    let skip = messages.len().saturating_sub(GUEST_BOOK_PAGE);
    messages.drain(..skip);
    messages
}

// A new message waiting to be posted to Discord, like BellRing
#[spacetimedb::table(accessor = guest_post, scheduled(send_guest_post))]
pub struct GuestPost {
    #[primary_key]
    #[auto_inc]
    pub scheduled_id: u64,
    pub scheduled_at: ScheduleAt,
    pub name: String,
    pub text: String,
}

#[spacetimedb::reducer]
pub fn sign_guest_book(ctx: &ReducerContext, name: String, text: String) -> Result<(), String> {
    // Names are one line
    let name = name.split_whitespace().collect::<Vec<_>>().join(" ");
    let text = text.trim().to_string();
    if name.chars().count() > MAX_GUEST_NAME_CHARS {
        return Err("Name too long".into());
    }
    if text.is_empty() {
        return Err("Write a message first".into());
    }
    if text.starts_with("/claim") || text.starts_with("/unclaim") {
        return Err("That's a command, not a message".into());
    }
    if text.chars().count() > MAX_GUEST_MESSAGE_CHARS {
        return Err("Message too long".into());
    }
    let ready = ctx
        .db
        .guest_message()
        .sender()
        .filter(&ctx.sender())
        .all(|message| message.sent_at + TimeDuration::from(GUEST_COOLDOWN) <= ctx.timestamp);
    if !ready {
        return Err("You just signed the guest book. Try again in a moment.".into());
    }
    let name = if name.is_empty() { "Anonymous".to_string() } else { name };
    ctx.db.guest_message().insert(GuestMessage {
        id: 0,
        sender: ctx.sender(),
        name: name.clone(),
        text: text.clone(),
        sent_at: ctx.timestamp,
        reported: false,
    });
    ctx.db.guest_post().insert(GuestPost {
        scheduled_id: 0,
        scheduled_at: ScheduleAt::Time(ctx.timestamp),
        name,
        text,
    });
    Ok(())
}

// Delete one of your own messages
#[spacetimedb::reducer]
pub fn delete_guest_message(ctx: &ReducerContext, id: u64) -> Result<(), String> {
    let message = ctx.db.guest_message().id().find(id).ok_or("No such message")?;
    if message.sender != ctx.sender() {
        return Err("You can only delete your own messages".into());
    }
    ctx.db.guest_message().id().delete(id);
    Ok(())
}

// Report someone else's message (hiding it), or un-report it
#[spacetimedb::reducer]
pub fn report_guest_message(ctx: &ReducerContext, id: u64, reported: bool) -> Result<(), String> {
    let message = ctx.db.guest_message().id().find(id).ok_or("No such message")?;
    if message.sender == ctx.sender() {
        return Err("You can't report your own message".into());
    }
    if message.reported != reported {
        ctx.db.guest_message().id().update(GuestMessage { reported, ..message });
    }
    Ok(())
}

// The Discord message for a guest book message
fn guest_post_text(post: &GuestPost) -> String {
    // The name is shown in bold, so drop anything Discord would format
    let name: String = post
        .name
        .chars()
        .filter(|c| !"*_~`|<>[]()\\#@:".contains(*c))
        .collect();
    let mut text = format!("\u{1F4D6} **{name}** signed the guest book");
    for line in post.text.lines() {
        text += "\n> ";
        text += line;
    }
    text
}

#[spacetimedb::procedure]
pub fn send_guest_post(ctx: &mut ProcedureContext, post: GuestPost) {
    let url = ctx.env.DISCORD_GUEST_BOOK_WEBHOOK_URL();
    post_to_discord(ctx, "Guest book message", url, guest_post_text(&post), None);
}

// ---- Site owner ----
//
// The owner (me) is shown with a crown, on my cursor and my guest book
// messages. A browser becomes the owner by sending OWNER_PASSWORD (a
// database setting, never in the source) to claim_owner; the guest book
// sends it when I type "/claim <password>" as a message. Each browser has
// its own identity, so each one claims once. To revoke one:
//   spacetime sql sherbb-site "DELETE FROM owner WHERE identity = 0x..."
// (its open tabs keep their crown until they reload)

// A short password could be guessed, so it must be at least this long
const MIN_OWNER_PASSWORD_CHARS: usize = 16;

// Identities that have claimed the owner. Public, so clients can crown
// their guest book messages.
#[spacetimedb::table(accessor = owner, public)]
pub struct Owner {
    #[primary_key]
    pub identity: Identity,
}

// The owner's open tabs, so clients can crown their cursors (which carry a
// connection, not an identity)
#[spacetimedb::table(accessor = owner_tab, public)]
pub struct OwnerTab {
    #[primary_key]
    pub connection_id: ConnectionId,
}

// Compare without stopping at the first difference, so the time taken
// doesn't hint at how much of a guess was right
fn same_secret(a: &str, b: &str) -> bool {
    a.len() == b.len() && a.bytes().zip(b.bytes()).fold(0u8, |diff, (x, y)| diff | (x ^ y)) == 0
}

#[spacetimedb::reducer]
pub fn claim_owner(ctx: &ReducerContext, password: String) -> Result<(), String> {
    let expected = ctx
        .env
        .OWNER_PASSWORD()
        .filter(|expected| expected.chars().count() >= MIN_OWNER_PASSWORD_CHARS);
    match expected {
        Some(expected) if same_secret(password.trim(), &expected) => {}
        _ => {
            log::warn!("Wrong owner password from {}", ctx.sender());
            return Err("Wrong password".into());
        }
    }
    if ctx.db.owner().identity().find(ctx.sender()).is_none() {
        ctx.db.owner().insert(Owner { identity: ctx.sender() });
    }
    // Crown this identity's open tabs
    let tabs: Vec<ConnectionId> = ctx
        .db
        .online()
        .iter()
        .filter(|tab| tab.identity == ctx.sender())
        .map(|tab| tab.connection_id)
        .collect();
    for connection_id in tabs {
        if ctx.db.owner_tab().connection_id().find(connection_id).is_none() {
            ctx.db.owner_tab().insert(OwnerTab { connection_id });
        }
    }
    log::info!("Owner claimed by {}", ctx.sender());
    Ok(())
}

// Give up the crown in this browser
#[spacetimedb::reducer]
pub fn release_owner(ctx: &ReducerContext) -> Result<(), String> {
    ctx.db.owner().identity().delete(ctx.sender());
    let tabs: Vec<ConnectionId> = ctx
        .db
        .online()
        .iter()
        .filter(|tab| tab.identity == ctx.sender())
        .map(|tab| tab.connection_id)
        .collect();
    for connection_id in tabs {
        ctx.db.owner_tab().connection_id().delete(connection_id);
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    // Seconds since the epoch of a UTC date and time
    fn utc(year: i64, month: i64, day: i64, hour: i64, minute: i64) -> i64 {
        days_from_civil(year, month, day) * 86_400 + hour * 3600 + minute * 60
    }

    #[test]
    fn central_european_time() {
        // Winter: UTC+1
        assert_eq!(central_european_hour(utc(2026, 11, 19, 13, 30)), 14);
        assert_eq!(central_european_hour(utc(2027, 1, 1, 23, 0)), 0);
        // Summer: UTC+2
        assert_eq!(central_european_hour(utc(2026, 7, 1, 5, 59)), 7);
        // Clocks go forward at 01:00 UTC on 2026-03-29
        assert_eq!(central_european_hour(utc(2026, 3, 29, 0, 59)), 1);
        assert_eq!(central_european_hour(utc(2026, 3, 29, 1, 0)), 3);
        // ...and back at 01:00 UTC on 2026-10-25
        assert_eq!(central_european_hour(utc(2026, 10, 25, 0, 59)), 2);
        assert_eq!(central_european_hour(utc(2026, 10, 25, 1, 0)), 2);
        assert_eq!(central_european_hour(utc(2026, 10, 25, 2, 0)), 3);
        // Year boundaries and leap days
        assert_eq!(year_from_days(days_from_civil(2028, 2, 29)), 2028);
        assert_eq!(year_from_days(days_from_civil(2026, 12, 31)), 2026);
        assert_eq!(year_from_days(days_from_civil(2027, 1, 1)), 2027);
    }

    #[test]
    fn bedtime() {
        let at = |seconds: i64| Timestamp::from_micros_since_unix_epoch(seconds * 1_000_000);
        // 19:59 and 20:00 CET
        assert!(!owner_asleep(at(utc(2026, 11, 19, 18, 59))));
        assert!(owner_asleep(at(utc(2026, 11, 19, 19, 0))));
        // 07:59 and 08:00 CEST
        assert!(owner_asleep(at(utc(2026, 7, 1, 5, 59))));
        assert!(!owner_asleep(at(utc(2026, 7, 1, 6, 0))));
    }
}
