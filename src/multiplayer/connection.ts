import { DbConnection, SubscriptionHandle } from "../module_bindings";
import { Bell as BellRow, Chat as ChatRow, Cursor as CursorRow } from "../module_bindings/types";
import {
  CURSOR_UPDATES_PER_SECOND,
  clearCursors,
  removeChat,
  removeCursor,
  setCursorOwner,
  updateChat,
  updateCursor,
} from "./cursors";
import { closeChat, startLocalChat } from "./localChat";
import { CursorTransform, PANEL_HIDDEN, transformAt } from "./panels";
import {
  getMultiplayerState,
  otherReaders,
  subscribeMultiplayer,
  updateMultiplayerState,
} from "./store";

// The one SpacetimeDB connection for this tab (desktop only). It opens on
// the first call to startMultiplayer() and stays open for the life of the
// page; the SDK reconnects on its own if the connection drops.
//
// Bandwidth: the tab sends one small message when its page changes, and
// receives only the per-page reader counts, and only the counts that change
// (plus the dinner bell's single row, which changes once per ring). The
// guest book's messages are sent only while it's open. The site owner's
// identities and open tabs (a row or two) are always sent, for their crowns.
// Cursors: the tab sends its cursor at most CURSOR_UPDATES_PER_SECOND times a
// second (see cursors.ts), only when it moved and only while someone else is
// on the same page, and receives only the cursors on its own page.

const HOST = "https://maincloud.spacetimedb.com";
const DATABASE = "sherbb-site";
const TOKEN_KEY = "spacetimedb-token";

// Storage can be unavailable (private windows, blocked site data)
const readToken = (): string | undefined =>
{
  try
  {
    return localStorage.getItem(TOKEN_KEY) ?? undefined;
  }
  catch
  {
    return undefined;
  }
};

const writeToken = (token: string | null) =>
{
  try
  {
    if (token)
    {
      localStorage.setItem(TOKEN_KEY, token);
    }
    else
    {
      localStorage.removeItem(TOKEN_KEY);
    }
  }
  catch
  {
    // Not saved: the next visit gets a new identity
  }
};

let connection: DbConnection | null = null;
let connected = false;
// The last location sent on the current connection
let sentLocation = "";

// Send this tab's location if it changed since it was last sent
const syncLocation = () =>
{
  const { location } = getMultiplayerState();
  if (!connection || !connected || location === sentLocation)
  {
    return;
  }
  sentLocation = location;
  connection.reducers
    .setLocation({ location })
    .then(() =>
    {
      // The reader counts arrive with the same update, so this tab is now
      // counted at `location`
      if (sentLocation === location)
      {
        updateMultiplayerState({ confirmedLocation: location });
      }
    })
    .catch((error) => console.warn("Multiplayer location failed:", error));
};

// 32-bit FNV-1a hash of a location; matches page_id() in the module
const pageId = (location: string): number =>
{
  const bytes = new TextEncoder().encode(location);
  let hash = 0x811c9dc5;
  for (let i = 0; i < bytes.length; i++)
  {
    hash = Math.imul(hash ^ bytes[i], 0x01000193);
  }
  return hash >>> 0;
};

// ---- Receiving cursors and chat ----

// The page whose cursors and chats are subscribed, and the subscription
let cursorPage: number | null = null;
let cursorSubscription: SubscriptionHandle | null = null;

// Subscribe to the cursors and chats on this tab's page, replacing the
// previous page's subscription once the new one is in place
const syncCursorSubscription = () =>
{
  const { confirmedLocation } = getMultiplayerState();
  if (!connection || !connected || !confirmedLocation)
  {
    return;
  }
  const page = pageId(confirmedLocation);
  if (page === cursorPage)
  {
    return;
  }
  cursorPage = page;
  clearCursors();
  // The server dropped this tab's chat with the old page
  closeChat(false);
  const previous = cursorSubscription;
  cursorSubscription = connection
    .subscriptionBuilder()
    .onApplied(() =>
    {
      if (previous && !previous.isEnded())
      {
        previous.unsubscribe();
      }
    })
    .subscribe([
      `SELECT * FROM cursor WHERE page = ${page}`,
      `SELECT * FROM chat WHERE page = ${page}`,
    ]);
};

const showCursor = (row: CursorRow) =>
{
  const id = row.connectionId.toHexString();
  // Skip this tab's own cursor, and rows from a page just left
  if (id === connection?.connectionId.toHexString() || row.page !== cursorPage)
  {
    return;
  }
  updateCursor(id, row.panel, { x: row.x, y: row.y });
};

const hideCursor = (row: CursorRow) => removeCursor(row.connectionId.toHexString());

const showChat = (row: ChatRow) =>
{
  const id = row.connectionId.toHexString();
  if (id === connection?.connectionId.toHexString() || row.page !== cursorPage)
  {
    return;
  }
  updateChat(id, row.message, row.text);
};

const hideChat = (row: ChatRow) => removeChat(row.connectionId.toHexString());

// ---- Sending this tab's chat ----

// Typing is sent as it happens, but at most CURSOR_UPDATES_PER_SECOND times a
// second; the latest text always goes out.
let pendingChat: { message: number; text: string } | null = null;
let chatTimer = 0;
let lastChatSend = 0;

const flushChat = () =>
{
  chatTimer = 0;
  if (!pendingChat || !connection || !connected)
  {
    return;
  }
  lastChatSend = performance.now();
  connection.reducers.setChat(pendingChat).catch(() => {});
  pendingChat = null;
};

const sendChat = (message: number, text: string) =>
{
  pendingChat = { message, text };
  if (!chatTimer)
  {
    const wait = Math.max(0, lastChatSend + 1000 / CURSOR_UPDATES_PER_SECOND - performance.now());
    chatTimer = window.setTimeout(flushChat, wait);
  }
};

const sendCloseChat = (tellServer: boolean) =>
{
  pendingChat = null;
  window.clearTimeout(chatTimer);
  chatTimer = 0;
  if (tellServer && connection && connected)
  {
    connection.reducers.closeChat({}).catch(() => {});
  }
};

// ---- Sending this tab's cursor ----


// The pointer in screen coordinates, or null when it's outside the window
let pointer: { x: number; y: number } | null = null;
// The last cursor sent, and the page it was sent on
let sentCursor: CursorTransform | null = null;
let sentCursorLocation = "";

const sendCursor = () =>
{
  const state = getMultiplayerState();
  const location = state.confirmedLocation;
  // Alone on the page (or nowhere yet): send nothing. Forgetting the last
  // send means the cursor is sent again as soon as someone arrives.
  if (!connection || !connected || !location || otherReaders(state, location) === 0)
  {
    sentCursor = null;
    return;
  }
  if (location !== sentCursorLocation)
  {
    // The server drops the cursor when the page changes
    sentCursor = null;
    sentCursorLocation = location;
  }
  const next: CursorTransform = pointer
    ? transformAt(pointer.x, pointer.y)
    : { x: 0, y: 0, panel: PANEL_HIDDEN };
  next.x = Math.round(next.x);
  next.y = Math.round(next.y);
  if (sentCursor
    ? sentCursor.x === next.x && sentCursor.y === next.y && sentCursor.panel === next.panel
    : next.panel === PANEL_HIDDEN)
  {
    return;
  }
  sentCursor = next;
  connection.reducers.moveCursor(next).catch(() =>
  {
    // Dropped (for example while reconnecting); the next move resends
    sentCursor = null;
  });
};

const trackPointer = () =>
{
  window.addEventListener("pointermove", (event) =>
  {
    pointer = { x: event.clientX, y: event.clientY };
  });
  document.documentElement.addEventListener("pointerleave", () =>
  {
    pointer = null;
  });
  document.addEventListener("visibilitychange", () =>
  {
    if (document.hidden)
    {
      pointer = null;
    }
  });
  // At most this many sends a second; other tabs smooth the motion between
  // them (see cursors.ts)
  window.setInterval(sendCursor, 1000 / CURSOR_UPDATES_PER_SECOND);
};

// ---- Dinner bell ----

const showBell = (row: BellRow | null) =>
  updateMultiplayerState({
    bell: row && {
      rungAt: Number(row.rungAt.toMillis()),
      readyAt: Number(row.readyAt.toMillis()),
    },
  });

// Ring the dinner bell, which sends the site owner a Discord message.
// Rejects with the server's reason if the bell can't be rung (for example
// while it's cooling down after the last ring).
export const ringBell = async (message: string) =>
{
  if (!connection || !connected)
  {
    throw new Error("Not connected");
  }
  await connection.reducers.ringBell({ message });
};

// ---- Guest book ----

// Its subscription, while the guest book is open
let guestSubscription: SubscriptionHandle | null = null;

const showGuestBook = () =>
{
  if (!connection || !guestSubscription)
  {
    return;
  }
  const me = connection.identity?.toHexString();
  const owners = new Set(Array.from(connection.db.owner.iter(), (row) => row.identity.toHexString()));
  const entries = Array.from(connection.db.recentGuestMessages.iter(), (row) => ({
    id: row.id,
    name: row.name,
    text: row.text,
    sentAt: Number(row.sentAt.toMillis()),
    mine: row.sender.toHexString() === me,
    reported: row.reported,
    owner: owners.has(row.sender.toHexString()),
  }));
  entries.sort((a, b) => a.sentAt - b.sentAt || Number(a.id - b.id));
  updateMultiplayerState({ guestBook: entries });
};

// Load the guest book's latest messages and keep them up to date until the
// returned function is called
export const openGuestBook = () =>
{
  if (!connection || guestSubscription)
  {
    return () => {};
  }
  const subscription = connection
    .subscriptionBuilder()
    .onApplied(showGuestBook)
    .subscribe(["SELECT * FROM recent_guest_messages"]);
  guestSubscription = subscription;
  return () =>
  {
    guestSubscription = null;
    if (!subscription.isEnded())
    {
      subscription.unsubscribe();
    }
    updateMultiplayerState({ guestBook: null });
  };
};

const guestReducers = () =>
{
  if (!connection || !connected)
  {
    throw new Error("Not connected");
  }
  return connection.reducers;
};

export const signGuestBook = async (name: string, text: string) =>
  guestReducers().signGuestBook({ name, text });

export const deleteGuestMessage = async (id: bigint) =>
  guestReducers().deleteGuestMessage({ id });

export const reportGuestMessage = async (id: bigint, reported: boolean) =>
  guestReducers().reportGuestMessage({ id, reported });

// ---- Site owner ----

const showCrowned = () =>
{
  const me = connection?.identity?.toHexString();
  const crowned = !!me && Array.from(connection!.db.owner.iter()).some((row) => row.identity.toHexString() === me);
  if (crowned !== getMultiplayerState().crowned)
  {
    updateMultiplayerState({ crowned });
  }
};

const ownersChanged = () =>
{
  showCrowned();
  showGuestBook();
};

// Crown this browser as the site owner, if `password` is right (see
// claim_owner in the module)
export const claimOwner = async (password: string) =>
  guestReducers().claimOwner({ password });

export const releaseOwner = async () => guestReducers().releaseOwner({});

const countReaders = (conn: DbConnection) =>
{
  const readers = new Map(
    Array.from(conn.db.pageReaders.iter(), (row) => [row.location, row.readers]),
  );
  updateMultiplayerState({ readers });
};

// Each new connection (including automatic reconnects) starts with no
// location on the server
const onConnected = (conn: DbConnection) =>
{
  connected = true;
  sentLocation = "";
  sentCursor = null;
  updateMultiplayerState({ status: "connected", confirmedLocation: "" });
  syncLocation();
};

const onLost = (status: "reconnecting" | "offline") =>
{
  connected = false;
  closeChat(false);
  updateMultiplayerState({ status, confirmedLocation: "" });
};

const connect = (token: string | undefined) =>
{
  updateMultiplayerState({ status: "connecting" });
  connection = DbConnection.builder()
    .withUri(HOST)
    .withDatabaseName(DATABASE)
    .withToken(token)
    .withAutomaticReconnect()
    .onConnect((conn, _identity, newToken) =>
    {
      writeToken(newToken);
      const recount = () => countReaders(conn);
      conn.db.pageReaders.onInsert(recount);
      conn.db.pageReaders.onDelete(recount);
      conn.db.pageReaders.onUpdate(recount);
      conn.db.cursor.onInsert((_ctx, row) => showCursor(row));
      conn.db.cursor.onUpdate((_ctx, _old, row) => showCursor(row));
      conn.db.cursor.onDelete((_ctx, row) => hideCursor(row));
      conn.db.chat.onInsert((_ctx, row) => showChat(row));
      conn.db.chat.onUpdate((_ctx, _old, row) => showChat(row));
      conn.db.chat.onDelete((_ctx, row) => hideChat(row));
      conn.db.bell.onInsert((_ctx, row) => showBell(row));
      conn.db.bell.onUpdate((_ctx, _old, row) => showBell(row));
      conn.db.bell.onDelete(() => showBell(null));
      conn.db.recentGuestMessages.onInsert(showGuestBook);
      conn.db.recentGuestMessages.onDelete(showGuestBook);
      conn.db.owner.onInsert(ownersChanged);
      conn.db.owner.onDelete(ownersChanged);
      conn.db.ownerTab.onInsert((_ctx, row) => setCursorOwner(row.connectionId.toHexString(), true));
      conn.db.ownerTab.onDelete((_ctx, row) => setCursorOwner(row.connectionId.toHexString(), false));
      conn
        .subscriptionBuilder()
        .onApplied(recount)
        .subscribe([
          "SELECT * FROM page_readers",
          "SELECT * FROM bell",
          "SELECT * FROM owner",
          "SELECT * FROM owner_tab",
        ]);
      onConnected(conn);
    })
    .onAutomaticReconnect((conn) => onConnected(conn))
    .onDisconnect((_ctx, _error, nextAttempt) =>
      onLost(nextAttempt === undefined ? "offline" : "reconnecting"),
    )
    .onConnectError((_ctx, error, nextAttempt) =>
    {
      if (nextAttempt !== undefined)
      {
        onLost("reconnecting");
        return;
      }
      // A saved token can stop working (for example if the database was
      // recreated). Forget it and try once more as a new visitor.
      if (token)
      {
        writeToken(null);
        connect(undefined);
        return;
      }
      console.warn("Multiplayer connection failed:", error);
      onLost("offline");
    })
    .build();
};

export const startMultiplayer = () =>
{
  if (!connection)
  {
    subscribeMultiplayer(syncLocation);
    subscribeMultiplayer(syncCursorSubscription);
    trackPointer();
    startLocalChat({
      available: () => connected && !!getMultiplayerState().confirmedLocation,
      send: sendChat,
      close: sendCloseChat,
    });
    connect(readToken());
  }
};
