import { DbConnection } from "../module_bindings";
import {
  getMultiplayerState,
  subscribeMultiplayer,
  updateMultiplayerState,
} from "./store";

// The one SpacetimeDB connection for this tab (desktop only). It opens on
// the first call to startMultiplayer() and stays open for the life of the
// page; the SDK reconnects on its own if the connection drops.
//
// Bandwidth: the tab sends one small message when its page changes, and
// receives only the per-page reader counts, and only the counts that change.

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
  updateMultiplayerState({ status: "connected", confirmedLocation: "" });
  syncLocation();
};

const onLost = (status: "reconnecting" | "offline") =>
{
  connected = false;
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
      conn
        .subscriptionBuilder()
        .onApplied(recount)
        .subscribe("SELECT * FROM page_readers");
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
    connect(readToken());
  }
};
