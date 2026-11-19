import MultiplayerStatus from "../components/MultiplayerStatus";
import { setCursorLayer } from "./cursors";

// Everything multiplayer drawn on top of the desktop site: other people's
// cursors and the connection status. Loaded on its own (see App), and
// mounting it opens the connection.
const MultiplayerLayer = () => (
  <>
    <div
      ref={setCursorLayer}
      className="pointer-events-none fixed inset-0 z-30 overflow-hidden"
      aria-hidden="true"
    />
    <MultiplayerStatus />
  </>
);

export default MultiplayerLayer;
