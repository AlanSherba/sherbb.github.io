import { CHAT_MAX_LENGTH, ChatBubble } from "./chatBubble";
import { CURSOR_TIP, cursorSvg } from "./cursorShape";
import { addToCursorLayer } from "./cursors";

// This visitor's cursor chat, like Figma's: start typing anywhere and the
// text appears in a bubble beside your cursor, sent as you type.
//
//   Enter      start a new message (the old one slides away)
//              or close chat if the message is empty
//   Escape     close chat
//   idle       chat closes after a pause in typing: longer for longer
//              messages, short for an empty one
//   mouse      moving the mouse closes an empty chat
//
// Typing goes into a hidden text field, so editing (Backspace, arrow keys,
// paste, accented characters) works as in any text box.
//
// The operating system hides the mouse pointer while you type, so during
// chat the page draws the pointer itself (and hides the system one) until
// the mouse next moves after chat closes. While chat is
// available the page itself gets no keyboard input: keys that would scroll
// or move focus (Space, arrows, Page Up/Down, Home/End, Tab) are swallowed.

// How long chat stays open after the last keystroke: a base time plus a
// little per character, so longer messages can be read
const IDLE_BASE_MS = 4000;
const IDLE_PER_CHAR_MS = 50;
const IDLE_MAX_MS = 10_000;
// ...and with nothing typed (after Enter, or after deleting everything)
const IDLE_EMPTY_MS = 3000;
// Moving the mouse this far closes an empty chat
const EMPTY_MOVE_CLOSE_PX = 10;

// Own cursor is white, so own bubble is too
const OWN_COLOR = "white";

// Keys that scroll the page or move focus when nothing takes them
const PAGE_KEYS = new Set([
  " ",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "PageUp",
  "PageDown",
  "Home",
  "End",
  "Tab",
]);

export interface ChatConnection {
  // Whether chat can be used now (connected and on a page)
  available(): boolean;
  send(message: number, text: string): void;
  // Drop any unsent text; tell the server unless it already knows
  close(tellServer: boolean): void;
}

let connection: ChatConnection | null = null;
let input: HTMLInputElement | null = null;
let holder: HTMLDivElement | null = null; // follows the pointer
let drawing = false; // whether the page is drawing the pointer
let bubble: ChatBubble | null = null;
let open = false;
let message = 0;
let idleTimer = 0;
// The last pointer position, tracked even while chat is closed so the
// bubble opens at the cursor rather than waiting for the next mouse move
let pointerX = 0;
let pointerY = 0;

const placeHolder = () =>
{
  if (holder)
  {
    holder.style.transform = `translate3d(${pointerX}px, ${pointerY}px, 0)`;
  }
};

const createElements = () =>
{
  input = document.createElement("input");
  input.type = "text";
  input.maxLength = CHAT_MAX_LENGTH;
  input.autocomplete = "off";
  input.spellcheck = false;
  input.setAttribute("aria-label", "Cursor chat");
  input.style.cssText =
    "position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none;";
  document.body.appendChild(input);
  input.addEventListener("input", onInput);

  holder = document.createElement("div");
  holder.className = "absolute left-0 top-0";
  holder.style.display = "none";
  const pointer = document.createElement("div");
  pointer.className = "absolute";
  pointer.style.left = pointer.style.top = `${-CURSOR_TIP}px`;
  pointer.innerHTML = cursorSvg(OWN_COLOR);
  holder.appendChild(pointer);
  bubble = new ChatBubble(OWN_COLOR, true);
  holder.appendChild(bubble.element);
  addToCursorLayer(holder);
};

// Where the pointer was when the chat last became empty
let emptyX = 0;
let emptyY = 0;

const restartIdleTimer = () =>
{
  const length = input?.value.length ?? 0;
  if (length === 0)
  {
    emptyX = pointerX;
    emptyY = pointerY;
  }
  const wait = length
    ? Math.min(IDLE_MAX_MS, IDLE_BASE_MS + IDLE_PER_CHAR_MS * length)
    : IDLE_EMPTY_MS;
  window.clearTimeout(idleTimer);
  idleTimer = window.setTimeout(() => closeChat(), wait);
};

// Draw the pointer in the page instead of using the system one (see
// [data-drawn-pointer] in index.css)
const setDrawing = (on: boolean) =>
{
  drawing = on;
  document.documentElement.toggleAttribute("data-drawn-pointer", on);
  if (holder)
  {
    holder.style.display = on ? "" : "none";
  }
};

const focusInput = () => input?.focus({ preventScroll: true });

const openChat = () =>
{
  if (!holder)
  {
    createElements();
  }
  open = true;
  message++;
  input!.value = "";
  bubble!.set(message, "");
  placeHolder();
  setDrawing(true);
  restartIdleTimer();
};

// Close chat. `tellServer` is false when the server already closed it (for
// example after a page change).
export const closeChat = (tellServer = true) =>
{
  if (!open)
  {
    return;
  }
  open = false;
  window.clearTimeout(idleTimer);
  // The drawn pointer stays until the mouse moves, since the system one may
  // still be hidden from typing
  bubble?.clear();
  if (input)
  {
    input.value = "";
    input.blur();
  }
  connection?.close(tellServer);
};

const newMessage = () =>
{
  message++;
  input!.value = "";
  bubble!.set(message, "");
  connection?.send(message, "");
  restartIdleTimer();
};

function onInput()
{
  if (!open || !input)
  {
    return;
  }
  bubble!.set(message, input.value);
  connection?.send(message, input.value);
  restartIdleTimer();
}

const onKeyDown = (event: KeyboardEvent) =>
{
  if (!connection?.available())
  {
    return;
  }
  // Leave browser and system shortcuts alone (copy, reload, ...), and text
  // being composed (IME)
  if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing)
  {
    return;
  }
  const typing = open && document.activeElement === input;
  const printable = event.key.length === 1;

  if (event.key === "Escape")
  {
    if (open)
    {
      event.preventDefault();
      closeChat();
    }
    return;
  }
  if (event.key === "Enter")
  {
    event.preventDefault();
    if (open)
    {
      focusInput();
      if (input!.value.trim())
      {
        newMessage();
      }
      else
      {
        closeChat();
      }
    }
    return;
  }
  if (printable && !open)
  {
    // A space doesn't start a chat
    if (event.key === " ")
    {
      event.preventDefault();
      return;
    }
    openChat();
  }
  if (open && !typing && (printable || event.key === "Backspace" || event.key === "Delete"))
  {
    // Focusing the field now sends this key's character into it
    focusInput();
    return;
  }
  // Inside the field, Space and arrows edit text; Page Up/Down and Tab would
  // still scroll or move focus
  if (typing ? event.key === "PageUp" || event.key === "PageDown" || event.key === "Tab" : PAGE_KEYS.has(event.key))
  {
    event.preventDefault();
  }
};

const onPointerMove = (event: PointerEvent) =>
{
  pointerX = event.clientX;
  pointerY = event.clientY;
  placeHolder();
  // Moving away from an empty chat closes it
  if (
    open &&
    !input?.value &&
    Math.hypot(pointerX - emptyX, pointerY - emptyY) > EMPTY_MOVE_CLOSE_PX
  )
  {
    closeChat();
  }
  // Moving the mouse brings the system pointer back
  if (drawing && !open)
  {
    setDrawing(false);
  }
};

export const startLocalChat = (chatConnection: ChatConnection) =>
{
  connection = chatConnection;
  window.addEventListener("keydown", onKeyDown, true);
  window.addEventListener("pointermove", onPointerMove);
};
