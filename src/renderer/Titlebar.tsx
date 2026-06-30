import type { MouseEvent as ReactMouseEvent } from "react";
import clsx from "clsx";

interface TitlebarProps {
  isMac: boolean;
  panelSide: "left" | "right";
  panelCollapsed: boolean;
  showPanelToggle: boolean;
  onTogglePanel: () => void;
  onClose: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
  onMouseDown: (e: ReactMouseEvent) => void;
}

function wcClass(isMac: boolean, kind: "close" | "min" | "max"): string {
  if (isMac) {
    // Traffic-light circles; glyphs stay transparent until the cluster is hovered.
    const color = kind === "close" ? "bg-[#ff5f57]" : kind === "min" ? "bg-[#febc2e]" : "bg-[#28c840]";
    return clsx(
      "w-3 h-3 rounded-full text-[9px] leading-none text-transparent flex items-center justify-center cursor-pointer border-none p-0 shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.15)] transition-[filter] hover:brightness-90 group-hover:text-[rgba(0,0,0,0.55)]",
      color,
    );
  }
  const base =
    "w-6 h-6 rounded p-0 bg-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.6)] cursor-pointer flex items-center justify-center text-[13px] border-none transition-colors hover:text-white";
  return clsx(base, kind === "close" ? "hover:bg-[rgba(220,60,60,0.7)]" : "hover:bg-[rgba(255,255,255,0.16)]");
}

export default function Titlebar({
  isMac,
  panelSide,
  panelCollapsed,
  showPanelToggle,
  onTogglePanel,
  onClose,
  onMinimize,
  onMaximize,
  onMouseDown,
}: TitlebarProps) {
  const windowControls = (
    <div className={clsx("flex items-center cursor-default", isMac ? "group flex-row gap-2 mr-1" : "flex-row-reverse gap-1")}>
      <button onClick={onClose} title="Close" className={wcClass(isMac, "close")}>
        {"✕"}
      </button>
      <button onClick={onMinimize} title="Minimize" className={wcClass(isMac, "min")}>
        {"−"}
      </button>
      <button onClick={onMaximize} title="Zoom" className={wcClass(isMac, "max")}>
        {"+"}
      </button>
    </div>
  );

  // Arrow points the way the panel will move: collapse pushes it toward its own
  // edge; expand pulls it back toward the center.
  const left = panelSide === "left";
  const collapseGlyph = left ? "‹" : "›"; // ‹ : ›
  const expandGlyph = left ? "›" : "‹";
  const panelToggle = showPanelToggle ? (
    <button
      onClick={onTogglePanel}
      title={panelCollapsed ? "Expand panel" : "Collapse panel"}
      className="w-6 h-6 border-none rounded bg-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.6)] cursor-pointer flex items-center justify-center text-[13px] transition-colors hover:bg-[rgba(255,255,255,0.16)] hover:text-white"
    >
      {panelCollapsed ? expandGlyph : collapseGlyph}
    </button>
  ) : null;

  return (
    <div
      onMouseDown={onMouseDown}
      data-interactive="true"
      className="flex items-center justify-between h-8 pl-3 pr-2 bg-[rgba(18,18,28,0.98)] border-b border-[rgba(255,255,255,0.08)] shrink-0 cursor-move"
    >
      <div className="flex items-center gap-2">
        {isMac && windowControls}
        {panelSide === "left" && panelToggle}
        <span className="text-xs font-semibold tracking-[0.05em] text-[rgba(255,255,255,0.7)]">Calque</span>
      </div>
      <div className="flex items-center gap-2">
        {panelSide === "right" && panelToggle}
        {!isMac && windowControls}
      </div>
    </div>
  );
}
