import { ComponentType, ReactNode, useEffect, useRef, useState } from "react";
import { startMultiplayer } from "../multiplayer/connection";
import {
  MultiplayerStatus as Status,
  useMultiplayer,
} from "../multiplayer/store";
import DinnerBell, { BellIcon } from "./DinnerBell";
import GuestBook, { GuestBookIcon } from "./GuestBook";

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

// The chips beside the status pill, shown while connected. Each opens a
// panel above the bar; one panel is open at a time.
interface Chip {
  id: string;
  label: string;
  // Shown above the chip while it's hovered (and its panel is closed)
  tooltip: string;
  // The chip's color while its panel is open, and the tooltip's
  color: string;
  icon: ReactNode;
  // Stays mounted while closed, so a half-typed message survives closing
  Panel: ComponentType<{ open: boolean }>;
}

const CHIPS: Chip[] = [
  {
    id: "bell",
    label: "Dinner bell",
    tooltip: "Ping me",
    color: "bg-mode-projects",
    icon: <BellIcon />,
    Panel: DinnerBell,
  },
  {
    id: "guest-book",
    label: "Guest book",
    tooltip: "Guest book",
    color: "bg-mode-projects",
    icon: <GuestBookIcon />,
    Panel: GuestBook,
  },
];

// Connection status in the bottom-left corner, with the chips. Mounting it
// opens the multiplayer connection.
const MultiplayerStatus = () =>
{
  const { status } = useMultiplayer();
  const connected = status === "connected";
  const [openChip, setOpenChip] = useState<string | null>(null);
  const bar = useRef<HTMLDivElement>(null);

  useEffect(startMultiplayer, []);

  // Panels close when the connection drops, on Escape, and on a click
  // anywhere outside the bar
  const panelOpen = connected && openChip !== null;
  useEffect(() =>
  {
    if (!panelOpen)
    {
      return;
    }
    const onKey = (event: KeyboardEvent) =>
    {
      if (event.key === "Escape")
      {
        setOpenChip(null);
      }
    };
    const onPointerDown = (event: PointerEvent) =>
    {
      if (!bar.current?.contains(event.target as Node))
      {
        setOpenChip(null);
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointerDown);
    return () =>
    {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [panelOpen]);

  return (
    <div ref={bar} className="fixed bottom-0 left-0 z-20 flex gap-px">
      <div className={`relative ${panelOpen ? "" : "group"}`}>
        <Tutorial />
        <div
          className={`flex h-full cursor-default items-center gap-1.5 px-2 py-1 font-mono text-xs text-black ${COLORS[status]}`}
          role="status"
        >
          <Globe />
          {LABELS[status]}
        </div>
      </div>
      {connected &&
        CHIPS.map(({ id, label, tooltip, color, icon }) => (
          <div key={id} className={`relative flex ${panelOpen ? "" : "group/chip"}`}>
            <p aria-hidden="true" className={`pointer-events-none invisible absolute bottom-full left-1/2 mb-4 -translate-x-1/2 whitespace-nowrap px-5 py-1 font-serif text-3xl text-white opacity-0 transition-opacity duration-150 group-hover/chip:visible group-hover/chip:opacity-100 ${color}`}>
              {tooltip}
            </p>
            <button
              type="button"
              className={`flex items-center px-1.5 text-black transition-colors ${openChip === id ? color : "bg-neutral-500 hover:bg-neutral-400"}`}
              aria-label={label}
              aria-expanded={openChip === id}
              onClick={() => setOpenChip(openChip === id ? null : id)}
            >
              {icon}
            </button>
          </div>
        ))}
      {connected &&
        CHIPS.map(({ id, Panel }) => <Panel key={id} open={openChip === id} />)}
    </div>
  );
};

export default MultiplayerStatus;
