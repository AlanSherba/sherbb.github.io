import { useEffect, useRef, useState } from "react";
import { ringBell } from "../multiplayer/connection";
import { useMultiplayer } from "../multiplayer/store";
import MessageField from "./MessageField";

// The dinner bell: a visitor rings it (with an optional message) and I get
// a Discord message, so I can come and meet them on the site. After a ring
// the bell rests for a few minutes for everyone (see ring_bell in the
// module).

export const BELL_MESSAGE_LENGTH = 240;

export const BellIcon = () => (
  <svg viewBox="0 0 16 16" className="h-3 w-3" fill="currentColor" aria-hidden="true">
    <rect x="7" y="3.5" width="2" height="2" />
    <path d="M2.5 11.5a5.5 5.5 0 0 1 11 0z" />
    <rect x="1" y="12.5" width="14" height="1.5" />
  </svg>
);

// My time zone (Central European Time) and the hours I'm probably asleep.
// The module uses the same hours to skip the @mention at night (see
// owner_asleep in lib.rs).
const OWNER_TIME_ZONE = "Europe/Berlin";
const BEDTIME_HOUR = 20;
const WAKE_HOUR = 8;

const ownerClock = new Intl.DateTimeFormat("en-US", {
  timeZone: OWNER_TIME_ZONE,
  hour: "numeric",
  minute: "2-digit",
  hourCycle: "h23",
});

// My local time: whether I'm probably asleep, and the time like "2:15pm"
const ownerTime = (now: number) =>
{
  const parts = ownerClock.formatToParts(now);
  const hour = Number(parts.find((part) => part.type === "hour")?.value) % 24;
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";
  return {
    asleep: hour >= BEDTIME_HOUR || hour < WAKE_HOUR,
    time: `${hour % 12 || 12}:${minute}${hour < 12 ? "am" : "pm"}`,
  };
};

// A crescent moon: a disc with an offset disc cut out of it
const Moon = () => (
  <svg viewBox="0 0 32 32" className="h-9 w-9 shrink-0" aria-hidden="true">
    <mask id="dinner-bell-moon">
      <rect width="32" height="32" fill="white" />
      <circle cx="22.5" cy="12.5" r="10.5" fill="black" />
    </mask>
    <circle cx="15" cy="17" r="13" fill="white" mask="url(#dinner-bell-moon)" />
  </svg>
);

type Phase = "idle" | "ringing" | "rang" | "error";

// Whole minutes and seconds, like 3:07
const clock = (ms: number) =>
{
  const seconds = Math.ceil(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
};

const ago = (ms: number) =>
{
  const minutes = Math.floor(ms / 60_000);
  return minutes < 1 ? "just now" : `${minutes} min ago`;
};

interface DinnerBellProps {
  open: boolean;
}

const DinnerBell = ({ open }: DinnerBellProps) =>
{
  const { bell } = useMultiplayer();
  const [message, setMessage] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now);
  const field = useRef<HTMLTextAreaElement>(null);

  const resting = bell ? Math.max(0, bell.readyAt - now) : 0;
  const owner = ownerTime(now);

  // Tick the countdown while it's showing
  useEffect(() =>
  {
    if (!open)
    {
      return;
    }
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [open]);

  useEffect(() =>
  {
    if (open)
    {
      field.current?.focus({ preventScroll: true });
    }
    else if (phase === "rang" || phase === "error")
    {
      // Closing clears the last result
      setPhase("idle");
    }
  }, [open, phase]);

  const ring = () =>
  {
    if (phase === "ringing" || resting > 0)
    {
      return;
    }
    setPhase("ringing");
    ringBell(message)
      .then(() =>
      {
        setPhase("rang");
        setMessage("");
      })
      .catch((reason) =>
      {
        setError(reason instanceof Error ? reason.message : String(reason));
        setPhase("error");
      });
  };

  let note = "";
  if (phase === "error")
  {
    note = `Couldn't ring the bell: ${error}`;
  }
  else if (bell && resting > 0 && phase !== "rang")
  {
    note = `Someone rang the bell ${ago(now - bell.rungAt)}. It can ring again in ${clock(resting)}.`;
  }

  let button = "Ring the bell";
  if (phase === "ringing")
  {
    button = "Ringing…";
  }
  else if (phase === "rang")
  {
    button = "Rung!";
  }
  else if (resting > 0)
  {
    button = `Ready in ${clock(resting)}`;
  }

  // Spacing: the boxes (moon, message, button) sit 12px (gap-3) from the panel's
  // edges and from each other; text sits a little further in
  return (
    <div
      className={`absolute bottom-full left-5 mb-3 w-96 flex-col gap-3 bg-mode-projects p-3 text-white ${open ? "flex" : "hidden"}`}
      role="dialog"
      aria-label="Dinner bell"
    >
      <div className="flex flex-col gap-4 p-2">
        <h2 className="font-serif text-4xl leading-none">Dinner Bell</h2>
        <p className="font-mono text-base leading-relaxed">
          Ring the bell to let me know you are here and I might be able to
          meet you. This sends a notification to my phone.
        </p>
      </div>
      {owner.asleep && (
        <div className="flex items-center gap-4 bg-black px-5 py-4 font-mono text-base leading-relaxed">
          <Moon />
          <div>
            <p className="text-white">I'm probably asleep right now</p>
            <p className="text-white/50">It's {owner.time} here</p>
          </div>
        </div>
      )}
      <MessageField
        id="bell"
        value={message}
        maxLength={BELL_MESSAGE_LENGTH}
        onChange={setMessage}
        onSubmit={ring}
        fieldRef={field}
      />
      {note && (
        <p className="px-2 font-mono text-sm leading-relaxed" role="status">
          {note}
        </p>
      )}
      <button
        type="button"
        className="bg-white py-2 font-mono text-2xl font-bold uppercase tracking-wide text-black transition-colors hover:bg-offwhite disabled:bg-white/40 disabled:text-black/60"
        disabled={phase === "ringing" || phase === "rang" || resting > 0}
        onClick={ring}
      >
        {button}
      </button>
    </div>
  );
};

export default DinnerBell;
