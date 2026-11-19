import { CURSOR_TIP, cursorSvg } from "./cursorShape";
import {
  PANEL_HIDDEN,
  Point,
  panelShows,
  panelToScreen,
  screenToPanel,
} from "./panels";

// Draws other people's cursors. Positions arrive a few times a second, so
// each cursor is smoothed in two stages:
//
//  1. Glide: a target point slides in a straight line from the previous
//     position to the newest one, taking about one update interval. Smooth
//     mouse motion on the other end becomes smooth, steady motion here
//     instead of a jump every update.
//  2. Spring: the drawn cursor follows the gliding target on a spring, which
//     rounds off the corners between glides and eases into stops.
//
// This trails the real pointer by about one glide plus a little spring lag,
// in exchange for motion that looks natural.

// How often cursor positions are sent (see connection.ts)
export const CURSOR_UPDATES_PER_SECOND = 16;
// Each glide lasts a little longer than the gap between updates, so the
// next update arrives before the target stops, even when it arrives late.
// The margin covers typical network jitter (about +-20 ms) at any rate.
const GLIDE_MARGIN_MS = 40;
const GLIDE_MS = 1000 / CURSOR_UPDATES_PER_SECOND + GLIDE_MARGIN_MS;

// Spring tuning (unit mass). Critically damped (DAMPING = 2 * sqrt(STIFFNESS)):
// no overshoot, and stops settle in about 0.3 s. Lower STIFFNESS (keeping
// DAMPING at 2 * sqrt of it) for softer, slower motion.
const STIFFNESS = 600;
const DAMPING = 49;
// Physics step, and the longest gap to simulate (after a longer pause, such
// as a background tab, cursors jump to their targets)
const STEP = 1 / 240;
const MAX_GAP = 0.25;

interface RemoteCursor {
  element: HTMLDivElement;
  panel: number; // PANEL_HIDDEN while hidden
  // All points are in `panel` coordinates
  position: Point; // where the cursor is drawn
  velocity: Point; // px per second
  glideFrom: Point; // the glide runs from here...
  glideTo: Point; // ...to the newest shared position
  glideStart: number; // when the glide began (performance.now() ms)
}

const cursors = new Map<string, RemoteCursor>();
let layer: HTMLElement | null = null;
let frame = 0;
let lastFrame = 0;

// A color picked from the cursor's id, so everyone sees the same color for
// the same person
const cursorColor = (id: string) =>
{
  let hash = 0;
  for (let i = 0; i < id.length; i++)
  {
    hash = Math.imul(hash ^ id.charCodeAt(i), 0x01000193);
  }
  const hue = (hash >>> 0) % 360;
  return `hsl(${hue}, 85%, 62%)`;
};

const lerp = (a: Point, b: Point, t: number): Point => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
});

// Where the gliding target is at `now`
const glidePoint = (cursor: RemoteCursor, now: number): Point =>
  lerp(
    cursor.glideFrom,
    cursor.glideTo,
    Math.min(1, (now - cursor.glideStart) / GLIDE_MS),
  );

// Snap a cursor to `point`, at rest
const place = (cursor: RemoteCursor, point: Point, now: number) =>
{
  cursor.position = { ...point };
  cursor.velocity = { x: 0, y: 0 };
  cursor.glideFrom = { ...point };
  cursor.glideTo = point;
  cursor.glideStart = now;
};

// Advance a cursor's spring by `seconds`, following the gliding target
const simulate = (cursor: RemoteCursor, seconds: number, now: number) =>
{
  const target = glidePoint(cursor, now);
  const { position, velocity } = cursor;
  if (seconds > MAX_GAP)
  {
    cursor.position = { ...target };
    cursor.velocity = { x: 0, y: 0 };
    return;
  }
  for (let left = seconds; left > 0; left -= STEP)
  {
    const dt = Math.min(STEP, left);
    // Semi-implicit Euler: update velocity first, then position
    velocity.x += (STIFFNESS * (target.x - position.x) - DAMPING * velocity.x) * dt;
    velocity.y += (STIFFNESS * (target.y - position.y) - DAMPING * velocity.y) * dt;
    position.x += velocity.x * dt;
    position.y += velocity.y * dt;
  }
};

const draw = (now: number) =>
{
  frame = 0;
  const seconds = lastFrame ? (now - lastFrame) / 1000 : 0;
  lastFrame = now;
  cursors.forEach((cursor) =>
  {
    if (cursor.panel !== PANEL_HIDDEN)
    {
      simulate(cursor, seconds, now);
    }
    const screen =
      cursor.panel === PANEL_HIDDEN
        ? null
        : panelToScreen(cursor.panel, cursor.position);
    if (screen)
    {
      cursor.element.style.transform = `translate3d(${screen.x - CURSOR_TIP}px, ${screen.y - CURSOR_TIP}px, 0)`;
    }
    const visible = !!screen && panelShows(cursor.panel, screen);
    cursor.element.style.opacity = visible ? "1" : "0";
  });
  // Keep drawing while there are cursors: the local page can scroll and
  // move them at any time
  if (cursors.size > 0)
  {
    frame = requestAnimationFrame(draw);
  }
  else
  {
    lastFrame = 0;
  }
};

const startDrawing = () =>
{
  if (!frame)
  {
    frame = requestAnimationFrame(draw);
  }
};

export const setCursorLayer = (element: HTMLElement | null) =>
{
  layer = element;
  if (layer)
  {
    cursors.forEach((cursor) => layer?.appendChild(cursor.element));
  }
};

export const updateCursor = (id: string, panel: number, target: Point) =>
{
  const now = performance.now();
  let cursor = cursors.get(id);
  if (!cursor)
  {
    const element = document.createElement("div");
    element.className = "absolute left-0 top-0 opacity-0 transition-opacity duration-150 will-change-transform";
    element.innerHTML = cursorSvg(cursorColor(id));
    layer?.appendChild(element);
    cursor = {
      element,
      panel,
      position: { ...target },
      velocity: { x: 0, y: 0 },
      glideFrom: { ...target },
      glideTo: target,
      glideStart: now,
    };
    cursors.set(id, cursor);
  }
  else if (panel === PANEL_HIDDEN || cursor.panel === PANEL_HIDDEN)
  {
    // Hiding, or appearing again: jump rather than move
    place(cursor, target, now);
  }
  else
  {
    // Start the next glide from wherever the current one has reached, so
    // the target never jumps even if updates arrive early or late
    let from = glidePoint(cursor, now);
    if (panel !== cursor.panel)
    {
      // Moving into another panel: carry on from the same screen spots, in
      // the new panel's coordinates. Panels are only offset from each
      // other, so the velocity carries over unchanged.
      const toNewPanel = (point: Point) =>
      {
        const screen = panelToScreen(cursor!.panel, point);
        return (screen && screenToPanel(panel, screen)) ?? { ...target };
      };
      cursor.position = toNewPanel(cursor.position);
      from = toNewPanel(from);
    }
    cursor.glideFrom = from;
    cursor.glideTo = target;
    cursor.glideStart = now;
  }
  cursor.panel = panel;
  startDrawing();
};

export const removeCursor = (id: string) =>
{
  cursors.get(id)?.element.remove();
  cursors.delete(id);
};

export const clearCursors = () =>
{
  cursors.forEach((cursor) => cursor.element.remove());
  cursors.clear();
};
