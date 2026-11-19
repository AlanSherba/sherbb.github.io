// Cursor positions are shared relative to a "panel", so a cursor points at
// the same content for everyone, whatever their window size or scroll:
//
//   0 (page)    - the top left of the content: the page top, at the left
//                 edge of the name in the header (data-cursor-origin)
//   1 (list)    - the scrolled list of pages (data-cursor-panel="list")
//   2 (details) - the scrolled page details (data-cursor-panel="details")
//
// For the scrolling panels, x and y are measured from the top left of the
// scrolled content, not of the visible box.

export const PANEL_PAGE = 0;
export const PANEL_LIST = 1;
export const PANEL_DETAILS = 2;
export const PANEL_HIDDEN = 255; // the pointer is outside the window

const PANEL_NAMES: Record<string, number> = {
  list: PANEL_LIST,
  details: PANEL_DETAILS,
};

export interface CursorTransform {
  x: number;
  y: number;
  panel: number;
}

export interface Point {
  x: number;
  y: number;
}

const scrollingPanel = (panel: number): HTMLElement | null =>
{
  const name = Object.keys(PANEL_NAMES).find((key) => PANEL_NAMES[key] === panel);
  return name
    ? document.querySelector<HTMLElement>(`[data-cursor-panel="${name}"]`)
    : null;
};

const pageOrigin = (): Point =>
{
  const name = document.querySelector("[data-cursor-origin]");
  return { x: name ? name.getBoundingClientRect().left : 0, y: 0 };
};

// The top left of a panel's content, in screen (client) pixels
const panelOrigin = (panel: number): Point | null =>
{
  if (panel === PANEL_PAGE)
  {
    return pageOrigin();
  }
  const element = scrollingPanel(panel);
  if (!element)
  {
    return null;
  }
  const rect = element.getBoundingClientRect();
  return {
    x: rect.left - element.scrollLeft,
    y: rect.top - element.scrollTop,
  };
};

// This visitor's pointer, as a transform to share
export const transformAt = (clientX: number, clientY: number): CursorTransform =>
{
  const target = document.elementFromPoint(clientX, clientY);
  const name = target
    ?.closest<HTMLElement>("[data-cursor-panel]")
    ?.getAttribute("data-cursor-panel");
  const panel = (name && PANEL_NAMES[name]) || PANEL_PAGE;
  const origin = panelOrigin(panel) ?? pageOrigin();
  return { x: clientX - origin.x, y: clientY - origin.y, panel };
};

// Where a point in a panel is on this screen, or null if that panel isn't
// on the page
export const panelToScreen = (panel: number, point: Point): Point | null =>
{
  const origin = panelOrigin(panel);
  return origin ? { x: origin.x + point.x, y: origin.y + point.y } : null;
};

// A screen point in a panel's coordinates
export const screenToPanel = (panel: number, point: Point): Point | null =>
{
  const origin = panelOrigin(panel);
  return origin ? { x: point.x - origin.x, y: point.y - origin.y } : null;
};

// Whether a screen point is inside the visible box of a panel. Cursors in a
// scrolling panel are hidden while scrolled out of view.
export const panelShows = (panel: number, point: Point): boolean =>
{
  const element = scrollingPanel(panel);
  if (!element)
  {
    return panel === PANEL_PAGE;
  }
  const rect = element.getBoundingClientRect();
  return (
    point.x >= rect.left &&
    point.x <= rect.right &&
    point.y >= rect.top &&
    point.y <= rect.bottom
  );
};
