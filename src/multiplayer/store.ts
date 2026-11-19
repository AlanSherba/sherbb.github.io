import { useSyncExternalStore } from "react";

// Multiplayer state shared by the page and the connection. This file has no
// SpacetimeDB code, so the page can import it without pulling the SDK into
// the main bundle. connection.ts (loaded later) fills it in.

export type MultiplayerStatus =
  | "connecting"
  | "connected"
  | "reconnecting"
  | "offline";

export interface MultiplayerState {
  status: MultiplayerStatus;
  // Tabs reading each page, keyed by location (see pageLocation)
  readers: ReadonlyMap<string, number>;
  // The page this tab is reading
  location: string;
  // The location the server has counted this tab at
  confirmedLocation: string;
  // The dinner bell's last ring, or null if it was never rung
  bell: BellState | null;
}

// Times in milliseconds since the Unix epoch, by the server's clock
export interface BellState {
  rungAt: number;
  // When the bell can next be rung
  readyAt: number;
}

let state: MultiplayerState = {
  status: "connecting",
  readers: new Map(),
  location: "",
  confirmedLocation: "",
  bell: null,
};
const listeners = new Set<() => void>();

export const getMultiplayerState = () => state;

export const updateMultiplayerState = (next: Partial<MultiplayerState>) =>
{
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
};

export const subscribeMultiplayer = (listener: () => void) =>
{
  listeners.add(listener);
  return () =>
  {
    listeners.delete(listener);
  };
};

export const useMultiplayer = (): MultiplayerState =>
  useSyncExternalStore(subscribeMultiplayer, getMultiplayerState);

// A page's location key: the site mode, then the project title or post slug
// ("projects/Gridform", "blog/markdown-test"). The mode prefix lets counts
// be grouped per mode.
export const pageLocation = (mode: string, key: string) => `${mode}/${key}`;

// Tell the server which page this tab is reading
export const setLocation = (location: string) =>
{
  if (location !== state.location)
  {
    updateMultiplayerState({ location });
  }
};

// Readers of a page, not counting this tab
export const otherReaders = (
  { readers, confirmedLocation }: MultiplayerState,
  location: string,
): number =>
  Math.max(
    0,
    (readers.get(location) ?? 0) - (location === confirmedLocation ? 1 : 0),
  );
