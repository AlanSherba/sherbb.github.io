import { useEffect } from "react";
import { startMultiplayer } from "../multiplayer/connection";
import {
  MultiplayerStatus as Status,
  useMultiplayer,
} from "../multiplayer/store";

const LABELS: Record<Status, string> = {
  connecting: "Connecting",
  connected: "Multiplayer Connected",
  reconnecting: "Reconnecting",
  offline: "Offline",
};

const COLORS: Record<Status, string> = {
  connecting: "bg-amber-400",
  connected: "bg-green-500",
  reconnecting: "bg-amber-400",
  offline: "bg-neutral-600",
};

const Globe = () => (
  <svg
    viewBox="0 0 16 16"
    className="h-3 w-3"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    aria-hidden="true"
  >
    <circle cx="8" cy="8" r="6.25" />
    <ellipse cx="8" cy="8" rx="2.75" ry="6.25" />
    <path d="M1.75 8h12.5" />
  </svg>
);

// Shown above the status pill while it's hovered
const Tutorial = () => (
  <div className="pointer-events-none invisible absolute bottom-full left-8 mb-5 flex w-[25rem] flex-col gap-4 bg-green-500 p-5 text-white opacity-0 transition-opacity duration-150 group-hover:visible group-hover:opacity-100">
    <h2 className="font-serif text-4xl leading-none">
      This website is multiplayer!
    </h2>
    <p className="font-mono text-base leading-relaxed">
      Any cursors you see on screen are other people reading the same page!
    </p>
    <p className="font-mono text-base font-bold underline underline-offset-4">
      Type anywhere to chat
    </p>
  </div>
);

// Connection status in the bottom-left corner. Mounting it opens the
// multiplayer connection.
const MultiplayerStatus = () =>
{
  const { status } = useMultiplayer();

  useEffect(startMultiplayer, []);

  return (
    <div className="group fixed bottom-0 left-0 z-20">
      <Tutorial />
      <div
        className={`flex cursor-default items-center gap-1.5 px-2 py-1 font-mono text-xs text-black ${COLORS[status]}`}
        role="status"
      >
        <Globe />
        {LABELS[status]}
      </div>
    </div>
  );
};

export default MultiplayerStatus;
