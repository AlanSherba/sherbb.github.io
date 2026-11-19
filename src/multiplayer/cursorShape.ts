// The multiplayer cursor: an outlined triangle pointing up and to the left.
// Used for other people's cursors (filled with their color) and for this
// visitor's own mouse pointer (filled white).

export const CURSOR_SIZE = 24; // px

// Where the tip sits inside the image, in px from the top left
export const CURSOR_TIP = 1;

export const cursorSvg = (fill: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${CURSOR_SIZE}" height="${CURSOR_SIZE}" viewBox="0 0 512 512">` +
  `<polygon points="48,48 466,256 256,466" fill="${fill}" stroke="black" stroke-width="36" stroke-linejoin="miter"/>` +
  `</svg>`;

// A CSS `cursor` value that draws the triangle as the mouse pointer
export const cursorCss = (fill: string) =>
  `url("data:image/svg+xml,${encodeURIComponent(cursorSvg(fill))}") ${CURSOR_TIP} ${CURSOR_TIP}, auto`;
