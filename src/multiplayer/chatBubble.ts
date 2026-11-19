import { CURSOR_SIZE } from "./cursorShape";

// The chat bubble beside a cursor, for other people's cursors and this
// visitor's own. Filled with the cursor's color, with black text and a black
// outline like the cursor's.
//
// Starting a new message (Enter) doesn't wipe the old one: a copy of it
// slides up and fades out while the bubble starts over empty.

export const CHAT_MAX_LENGTH = 120;

// Outline width, matching the cursor's outline
const OUTLINE_PX = 2;
const SLIDE_AWAY_MS = 600;

const BUBBLE_CLASS =
  "absolute w-max max-w-xs whitespace-pre-wrap break-words px-3 py-1 font-mono text-base font-bold leading-snug text-black";

export class ChatBubble
{
  readonly element: HTMLDivElement;
  private readonly textNode: Text;
  private message = 0;
  private text = "";

  constructor(color: string, private readonly caret = false)
  {
    this.element = this.makeBubble(color);
    this.textNode = document.createTextNode("");
    this.element.appendChild(this.textNode);
    if (caret)
    {
      // A blinking block caret, shown on this visitor's own bubble
      const caretElement = document.createElement("span");
      caretElement.className = "ml-px inline-block h-[1.1em] w-[0.5ch] translate-y-[0.15em] animate-pulse bg-black";
      this.element.appendChild(caretElement);
    }
    this.render();
  }

  // Show `text` as message number `message`. A new message number slides the
  // previous text away first.
  set(message: number, text: string)
  {
    if (message !== this.message && this.text)
    {
      this.slideAway();
    }
    this.message = message;
    this.text = text;
    this.render();
  }

  // Close the bubble, letting any text slide away
  clear()
  {
    if (this.text)
    {
      this.slideAway();
    }
    this.text = "";
    this.element.style.display = "none";
  }

  remove()
  {
    this.element.remove();
  }

  private render()
  {
    this.textNode.data = this.text;
    // Other people's empty bubbles aren't shown; this visitor's own shows
    // its caret
    this.element.style.display = this.text || this.caret ? "" : "none";
  }

  private makeBubble(color: string): HTMLDivElement
  {
    const element = document.createElement("div");
    element.className = BUBBLE_CLASS;
    element.style.left = `${CURSOR_SIZE - 4}px`;
    element.style.top = `${CURSOR_SIZE - 4}px`;
    element.style.backgroundColor = color;
    element.style.outline = `${OUTLINE_PX}px solid black`;
    return element;
  }

  // A copy of the current text floats up and fades out
  private slideAway()
  {
    const ghost = this.element.cloneNode(false) as HTMLDivElement;
    ghost.style.display = "";
    ghost.textContent = this.text;
    this.element.parentElement?.appendChild(ghost);
    ghost.animate(
      [
        { transform: "translateY(0)", opacity: 1 },
        { transform: "translateY(-150%)", opacity: 0 },
      ],
      {
        duration: SLIDE_AWAY_MS,
        easing: "cubic-bezier(0.3, 0, 0.2, 1)",
        fill: "forwards",
      },
    );
    // A timer rather than the animation's end, which never comes while the
    // tab is in the background
    window.setTimeout(() => ghost.remove(), SLIDE_AWAY_MS);
  }
}
