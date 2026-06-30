import { type CSSProperties, type MouseEvent as ReactMouseEvent, useEffect, useState } from "react";
import Titlebar from "./Titlebar";
import Panel from "./Panel";
import { defaultSettings, type ImageEntry, type ImageSettings, type Rect } from "./types";

// Width the panel occupies when expanded (matches the panel width in Panel.tsx).
const PANEL_WIDTH = 230;

const isMac = window.electronAPI.platform === "darwin";

// Space occupied to the LEFT of the overlay area for a given panel state. The
// image's X offset is relative to the overlay area's left edge, so this is how
// much the image visually shifts when the layout changes.
function leftOccupied(side: "left" | "right", collapsed: boolean): number {
  return side === "left" && !collapsed ? PANEL_WIDTH : 0;
}

// Collect every [data-interactive] rectangle and hand it to the main process,
// which uses them to decide where clicks pass through to the app underneath.
function reportInteractiveRects() {
  const els = Array.from(document.querySelectorAll<HTMLElement>("[data-interactive]"));
  const rects: Rect[] = [];
  for (const el of els) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) rects.push({ x: r.x, y: r.y, width: r.width, height: r.height });
  }
  window.electronAPI.updateInteractiveRects(rects);
}

function overlayStyle(s: ImageSettings, matchDisplayScale: boolean): CSSProperties {
  // Read DPR at render time so moving the window between monitors stays correct.
  const dprDivisor = matchDisplayScale ? window.devicePixelRatio || 1 : 1;
  const renderScale = s.scale / dprDivisor;
  return {
    transform: `translate(${s.x}px, ${s.y}px) scale(${renderScale})`,
    opacity: s.opacity,
    filter: `hue-rotate(${s.hueOffset}deg)`,
  };
}

export default function App() {
  const [images, setImages] = useState<ImageEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [panelSide, setPanelSide] = useState<"left" | "right">("left");
  const [isMoveMode, setIsMoveMode] = useState(false);
  // Divide rendered scale by the display's device-pixel-ratio so screenshots
  // captured at e.g. 2x (Retina) display at their on-screen size. On by default.
  const [matchDisplayScale, setMatchDisplayScale] = useState(true);

  const selected = images.find((img) => img.id === selectedId);
  const empty = images.length === 0;

  const dpr = window.devicePixelRatio || 1;
  const dprHint = dpr !== 1 ? `÷${dpr} (${dpr}x display)` : "1x display";

  // Re-report interactive regions after every render (layout may have changed)
  // and whenever the window resizes.
  useEffect(() => {
    reportInteractiveRects();
  });
  useEffect(() => {
    window.addEventListener("resize", reportInteractiveRects);
    return () => window.removeEventListener("resize", reportInteractiveRects);
  }, []);

  // When empty, capture all mouse events (so the window isn't click-through and
  // drag-and-drop works); otherwise the main-process cursor poll takes over.
  useEffect(() => {
    window.electronAPI.setForceInteractive(empty);
  }, [empty]);

  // ── Image management ─────────────────────────────
  const openFiles = async () => {
    const files = await window.electronAPI.openFileDialog();
    if (files.length === 0) return;
    const added: ImageEntry[] = files.map((f) => ({
      id: crypto.randomUUID(),
      name: f.name,
      dataUrl: f.dataUrl,
      settings: defaultSettings(),
    }));
    setImages((prev) => [...prev, ...added]);
    setSelectedId(added[added.length - 1].id);
  };

  const removeImage = (id: string) => {
    const idx = images.findIndex((img) => img.id === id);
    if (idx === -1) return;
    const next = images.filter((img) => img.id !== id);
    setImages(next);
    if (selectedId === id) {
      setSelectedId(next.length > 0 ? next[Math.min(idx, next.length - 1)].id : null);
    }
  };

  const updateSelectedSettings = (patch: Partial<ImageSettings>) => {
    if (!selectedId) return;
    setImages((prev) => prev.map((img) => (img.id === selectedId ? { ...img, settings: { ...img.settings, ...patch } } : img)));
  };

  // Shift every image's X so it stays put on screen when the overlay area moves.
  const shiftImagesX = (delta: number) => {
    setImages((prev) => prev.map((img) => ({ ...img, settings: { ...img.settings, x: img.settings.x + delta } })));
  };

  // ── Panel collapse + side ────────────────────────
  const togglePanel = () => {
    const oldLeft = leftOccupied(panelSide, panelCollapsed);
    const newLeft = leftOccupied(panelSide, !panelCollapsed);
    setPanelCollapsed((c) => !c);
    shiftImagesX(oldLeft - newLeft);
  };

  const switchSide = () => {
    const newSide = panelSide === "left" ? "right" : "left";
    const oldLeft = leftOccupied(panelSide, panelCollapsed);
    const newLeft = leftOccupied(newSide, panelCollapsed);
    setPanelSide(newSide);
    shiftImagesX(oldLeft - newLeft);
  };

  // ── Drags ────────────────────────────────────────
  // Manual titlebar drag works on transparent windows cross-platform.
  const onTitlebarMouseDown = (e: ReactMouseEvent) => {
    if ((e.target as Element).closest("button")) return;
    const startScreenX = e.screenX;
    const startScreenY = e.screenY;
    const [winX, winY] = window.electronAPI.getWindowPosition();
    const restoreForce = images.length === 0;
    window.electronAPI.setForceInteractive(true);
    const move = (ev: MouseEvent) =>
      window.electronAPI.setWindowPosition(winX + (ev.screenX - startScreenX), winY + (ev.screenY - startScreenY));
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      window.electronAPI.setForceInteractive(restoreForce);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    e.preventDefault();
  };

  const onImageDragMouseDown = (e: ReactMouseEvent) => {
    if (!selected) return;
    const id = selected.id;
    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const startX = selected.settings.x;
    const startY = selected.settings.y;
    window.electronAPI.setForceInteractive(true);
    const move = (ev: MouseEvent) => {
      const nx = Math.round(startX + (ev.clientX - startClientX));
      const ny = Math.round(startY + (ev.clientY - startClientY));
      setImages((prev) => prev.map((img) => (img.id === id ? { ...img, settings: { ...img.settings, x: nx, y: ny } } : img)));
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      // Empty state keeps full capture, otherwise resume cursor-poll click-through.
      window.electronAPI.setForceInteractive(false);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    e.preventDefault();
  };

  const panel = !empty && (
    <Panel
      collapsed={panelCollapsed}
      side={panelSide}
      images={images}
      selectedId={selectedId}
      selected={selected}
      matchDisplayScale={matchDisplayScale}
      dprHint={dprHint}
      isMoveMode={isMoveMode}
      onSelect={setSelectedId}
      onRemove={removeImage}
      onOpenFile={openFiles}
      onSwitchSide={switchSide}
      onToggleMatch={setMatchDisplayScale}
      onUpdateSettings={updateSelectedSettings}
      onToggleMove={() => setIsMoveMode((m) => !m)}
    />
  );

  return (
    <>
      <Titlebar
        isMac={isMac}
        panelSide={panelSide}
        panelCollapsed={panelCollapsed}
        showPanelToggle={!empty}
        onTogglePanel={togglePanel}
        onClose={() => window.electronAPI.closeWindow()}
        onMinimize={() => window.electronAPI.minimizeWindow()}
        onMaximize={() => window.electronAPI.toggleMaximize()}
        onMouseDown={onTitlebarMouseDown}
      />

      <div className="flex h-[calc(100vh-32px)] relative">
        {panelSide === "left" && panel}

        <div className="flex-1 relative bg-transparent overflow-hidden" {...(isMoveMode ? { "data-interactive": "true" } : {})}>
          {selected && (
            <img
              className="absolute top-0 left-0 origin-top-left pointer-events-none z-0 block max-w-none"
              draggable={false}
              src={selected.dataUrl}
              alt=""
              style={overlayStyle(selected.settings, matchDisplayScale)}
            />
          )}
          {isMoveMode && (
            <div className="absolute top-0 left-0 w-full h-full cursor-move z-[2]" onMouseDown={onImageDragMouseDown} />
          )}
        </div>

        {panelSide === "right" && panel}

        {empty && (
          <div
            data-interactive="true"
            className="absolute inset-0 flex items-center justify-center bg-[rgba(18,18,28,0.98)] z-[5]"
          >
            <div className="flex flex-col items-center gap-1.5 px-10 py-8 border-2 border-dashed border-[rgba(255,255,255,0.18)] rounded-xl bg-[rgba(18,18,28,0.6)]">
              <div className="text-[40px] opacity-50 mb-1.5">📷</div>
              <div className="text-[15px] text-[rgba(255,255,255,0.8)]">No image loaded</div>
              <div className="text-xs text-[rgba(255,255,255,0.4)] mb-3.5">Open an image to compare against your UI</div>
              <button
                onClick={openFiles}
                className="px-[18px] py-2 border border-[rgba(99,120,255,0.4)] rounded-[5px] bg-[rgba(99,120,255,0.15)] text-[rgba(180,190,255,0.9)] cursor-pointer text-xs text-center transition-colors hover:bg-[rgba(99,120,255,0.28)] hover:border-[rgba(99,120,255,0.7)]"
              >
                + Open file
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
