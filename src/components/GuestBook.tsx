import { CSSProperties, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  deleteGuestMessage,
  openGuestBook,
  reportGuestMessage,
  signGuestBook,
} from "../multiplayer/connection";
import { GuestEntry, useMultiplayer } from "../multiplayer/store";
import MessageField from "./MessageField";

// The guest book: visitors leave public messages, shown above the form with
// the newest at the bottom. Its messages are loaded (and kept up to date)
// only while it's open. Visitors can delete their own messages and report
// anyone else's, which hides it behind a cover for everyone until someone
// un-reports it (see the guest book in the module).

const NAME_LENGTH = 24;
const MESSAGE_LENGTH = 240;
const NAME_KEY = "guest-book-name";

// Storage can be unavailable (private windows, blocked site data)
const readName = () =>
{
  try
  {
    return localStorage.getItem(NAME_KEY) ?? "";
  }
  catch
  {
    return "";
  }
};

const writeName = (name: string) =>
{
  try
  {
    localStorage.setItem(NAME_KEY, name);
  }
  catch
  {
    // Not remembered
  }
};

export const GuestBookIcon = () => (
  <svg viewBox="0 0 16 16" className="h-3 w-3" fill="currentColor" aria-hidden="true">
    <path d="M1.5 2.5h13v9h-8l-3.5 3v-3h-1.5z" />
  </svg>
);

// Report: a disc with an exclamation mark cut out of it
const ReportIcon = () => (
  <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true">
    <mask id="guest-book-report">
      <rect width="16" height="16" fill="white" />
      <rect x="7" y="3.5" width="2" height="5.5" fill="black" />
      <rect x="7" y="10.5" width="2" height="2" fill="black" />
    </mask>
    <circle cx="8" cy="8" r="7" fill="currentColor" mask="url(#guest-book-report)" />
  </svg>
);

// Un-report: a disc with a tick cut out of it
const RestoreIcon = () => (
  <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true">
    <mask id="guest-book-restore">
      <rect width="16" height="16" fill="white" />
      <path d="M4.5 8.25l2.5 2.5 4.5-4.75" fill="none" stroke="black" strokeWidth="2" />
    </mask>
    <circle cx="8" cy="8" r="7" fill="currentColor" mask="url(#guest-book-restore)" />
  </svg>
);

const TrashIcon = () => (
  <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor" aria-hidden="true">
    <rect x="6" y="1" width="4" height="2" />
    <rect x="2" y="2.5" width="12" height="2" />
    <path d="M3.5 5.5h9l-1 9.5h-7z" />
  </svg>
);

const formatDate = (ms: number) =>
  new Date(ms).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

// Opening the guest book fades the messages in one after another, from the
// newest (quickly) up through the older ones (more slowly). Only messages
// near the bottom get their own step; the rest are out of view anyway.
const fadeIn = (fromBottom: number): CSSProperties =>
{
  const step = Math.min(fromBottom, 12);
  return {
    animationDuration: step === 0 ? "200ms" : "500ms",
    animationDelay: step === 0 ? "0ms" : `${60 + step * 90}ms`,
    animationFillMode: "both",
  };
};

interface EntryProps {
  entry: GuestEntry;
  // Its place counting up from the newest message (0) when it appeared
  fromBottom: number;
  revealed: boolean;
  onReveal: () => void;
  onError: (error: unknown) => void;
}

const Entry = ({ entry, fromBottom, revealed, onReveal, onError }: EntryProps) =>
{
  // Fixed when the message first shows; messages arriving later are newest,
  // so fade in right away
  const [fade] = useState(() => fadeIn(fromBottom));
  if (entry.reported && !revealed)
  {
    return (
      <li className="motion-safe:animate-fadeInFast" style={fade}>
        <button
          type="button"
          className="w-full bg-neutral-900 py-10 font-mono text-base text-white transition-colors hover:bg-neutral-800"
          title="Someone reported this message. Click to read it."
          onClick={onReveal}
        >
          Censored
        </button>
      </li>
    );
  }
  let action = { label: "Report", icon: <ReportIcon />, run: () => reportGuestMessage(entry.id, true) };
  if (entry.mine)
  {
    action = { label: "Delete", icon: <TrashIcon />, run: () => deleteGuestMessage(entry.id) };
  }
  else if (entry.reported)
  {
    action = { label: "Un-report", icon: <RestoreIcon />, run: () => reportGuestMessage(entry.id, false) };
  }
  return (
    <li style={fade} className={`relative flex flex-col gap-3 p-3 pr-10 motion-safe:animate-fadeInFast ${entry.reported ? "bg-neutral-900" : "bg-neutral-700"}`}>
      <span className="truncate font-serif text-3xl leading-none">{entry.name}</span>
      <p className="whitespace-pre-wrap break-words font-mono text-sm leading-relaxed">
        {entry.text}
      </p>
      <time className="font-mono text-xs text-white/40" dateTime={new Date(entry.sentAt).toISOString()}>
        {formatDate(entry.sentAt)}
      </time>
      <button
        type="button"
        className="absolute right-3 top-3 text-neutral-500 transition-colors hover:text-white"
        aria-label={action.label}
        title={action.label}
        onClick={() => action.run().catch(onError)}
      >
        {action.icon}
      </button>
    </li>
  );
};

type Phase = "idle" | "signing" | "signed" | "error";

interface GuestBookProps {
  open: boolean;
}

const GuestBook = ({ open }: GuestBookProps) =>
{
  const { guestBook } = useMultiplayer();
  const [name, setName] = useState(readName);
  const [message, setMessage] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");
  // Reported messages this visitor chose to read
  const [revealed, setRevealed] = useState<ReadonlySet<bigint>>(new Set());
  const field = useRef<HTMLTextAreaElement>(null);
  const list = useRef<HTMLOListElement>(null);
  // Whether the list is scrolled to the bottom, so new messages keep it there
  const atBottom = useRef(true);

  // Messages load only while it's open
  useEffect(() =>
  {
    if (!open)
    {
      return;
    }
    field.current?.focus({ preventScroll: true });
    atBottom.current = true;
    return openGuestBook();
  }, [open]);

  useEffect(() =>
  {
    if (!open)
    {
      setRevealed(new Set());
      setPhase((current) => (current === "signing" ? current : "idle"));
    }
  }, [open]);

  // Start at the newest message, and follow new ones while at the bottom
  useLayoutEffect(() =>
  {
    if (list.current && atBottom.current)
    {
      list.current.scrollTop = list.current.scrollHeight;
    }
  }, [guestBook]);

  // ...and when the window (so the list) changes size
  const hasList = !!guestBook?.length;
  useEffect(() =>
  {
    const element = list.current;
    if (!element)
    {
      return;
    }
    const observer = new ResizeObserver(() =>
    {
      if (atBottom.current)
      {
        element.scrollTop = element.scrollHeight;
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [hasList]);

  // "Signed!" shows briefly
  useEffect(() =>
  {
    if (phase !== "signed")
    {
      return;
    }
    const timer = window.setTimeout(() => setPhase("idle"), 2000);
    return () => window.clearTimeout(timer);
  }, [phase]);

  const fail = (reason: unknown) =>
  {
    setError(reason instanceof Error ? reason.message : String(reason));
    setPhase("error");
  };

  const sign = () =>
  {
    if (phase === "signing" || !message.trim())
    {
      return;
    }
    setPhase("signing");
    writeName(name);
    atBottom.current = true;
    signGuestBook(name, message)
      .then(() =>
      {
        setPhase("signed");
        setMessage("");
      })
      .catch(fail);
  };

  let button = "Sign the book";
  if (phase === "signing")
  {
    button = "Signing…";
  }
  else if (phase === "signed")
  {
    button = "Signed!";
  }

  // Same spacing as the dinner bell: boxes sit 12px (gap-3) apart and from
  // the panel's edges
  return (
    <div
      className={`absolute bottom-full left-5 mb-3 max-h-[calc(100vh-3rem)] w-96 flex-col gap-3 ${open ? "flex" : "hidden"}`}
      role="dialog"
      aria-label="Guest book"
    >
      {guestBook && guestBook.length > 0 && (
        <ol
          ref={list}
          className="ml-14 flex min-h-0 flex-col gap-3 overflow-y-auto overscroll-contain text-white [scrollbar-width:none]"
          aria-label="Guest book messages"
          onScroll={(event) =>
          {
            const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
            atBottom.current = scrollHeight - scrollTop - clientHeight < 8;
          }}
        >
          {guestBook.map((entry, index) => (
            <Entry
              key={String(entry.id)}
              entry={entry}
              fromBottom={guestBook.length - 1 - index}
              revealed={revealed.has(entry.id)}
              onReveal={() => setRevealed(new Set(revealed).add(entry.id))}
              onError={fail}
            />
          ))}
        </ol>
      )}
      <div className="flex shrink-0 flex-col gap-3 bg-mode-projects p-3 text-white">
        <div className="flex flex-col gap-4 p-2">
          <h2 className="font-serif text-4xl leading-none">Guest Book</h2>
          <p className="font-mono text-base leading-relaxed">
            Leave a message in the guest book.{" "}
            <span className="underline underline-offset-4">Messages are public</span>
          </p>
        </div>
        <input
          className="bg-white/15 px-3 py-2 font-mono text-base text-white outline-none placeholder:text-white/60 focus:bg-white/20"
          placeholder="Name"
          aria-label="Name"
          maxLength={NAME_LENGTH}
          value={name}
          onChange={(event) => setName(event.target.value.slice(0, NAME_LENGTH))}
          onKeyDown={(event) =>
          {
            if (event.key === "Enter")
            {
              event.preventDefault();
              field.current?.focus();
            }
          }}
        />
        <MessageField
          id="guest-book"
          value={message}
          maxLength={MESSAGE_LENGTH}
          onChange={setMessage}
          onSubmit={sign}
          fieldRef={field}
        />
        {phase === "error" && (
          <p className="px-2 font-mono text-sm leading-relaxed" role="status">
            {error}
          </p>
        )}
        <button
          type="button"
          className="bg-white py-2 font-mono text-2xl font-bold uppercase tracking-wide text-black transition-colors hover:bg-offwhite disabled:bg-white/40 disabled:text-black/60"
          disabled={phase === "signing" || phase === "signed" || !message.trim()}
          onClick={sign}
        >
          {button}
        </button>
      </div>
    </div>
  );
};

export default GuestBook;
