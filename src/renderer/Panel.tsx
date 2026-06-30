import clsx from "clsx";
import Setting from "./Setting";
import type { ImageEntry, ImageSettings } from "./types";

interface PanelProps {
  collapsed: boolean;
  side: "left" | "right";
  images: ImageEntry[];
  selectedId: string | null;
  selected: ImageEntry | undefined;
  matchDisplayScale: boolean;
  dprHint: string;
  isMoveMode: boolean;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onOpenFile: () => void;
  onSwitchSide: () => void;
  onToggleMatch: (value: boolean) => void;
  onUpdateSettings: (patch: Partial<ImageSettings>) => void;
  onToggleMove: () => void;
}

const sectionLabel = "text-[10px] font-semibold tracking-[0.1em] uppercase text-[rgba(255,255,255,0.35)] mb-2";

const btnMoveBase = "w-full px-2.5 py-[7px] border rounded-[5px] cursor-pointer text-xs text-center transition-colors";
const btnMoveIdle =
  "border-[rgba(255,255,255,0.15)] bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.7)] hover:bg-[rgba(255,255,255,0.12)]";
const btnMoveActive = "border-[rgba(99,120,255,0.6)] bg-[rgba(99,120,255,0.25)] text-white";

const btnOpen =
  "w-full px-2.5 py-[7px] border border-[rgba(99,120,255,0.4)] rounded-[5px] bg-[rgba(99,120,255,0.15)] text-[rgba(180,190,255,0.9)] cursor-pointer text-xs text-center transition-colors hover:bg-[rgba(99,120,255,0.28)] hover:border-[rgba(99,120,255,0.7)]";

export default function Panel({
  collapsed,
  side,
  images,
  selectedId,
  selected,
  matchDisplayScale,
  dprHint,
  isMoveMode,
  onSelect,
  onRemove,
  onOpenFile,
  onSwitchSide,
  onToggleMatch,
  onUpdateSettings,
  onToggleMove,
}: PanelProps) {
  const panelClass = clsx(
    "h-full bg-[rgba(18,18,28,0.99)] flex flex-col overflow-hidden relative shrink-0",
    collapsed ? "w-0 min-w-0" : "w-[230px] min-w-[230px]",
    !collapsed && (side === "left" ? "border-r border-[rgba(255,255,255,0.07)]" : "border-l border-[rgba(255,255,255,0.07)]"),
  );

  return (
    <div className={panelClass} data-interactive="true">
      <div className="p-3 border-b border-[rgba(255,255,255,0.06)] shrink-0">
        <button className={clsx(btnMoveBase, btnMoveIdle)} onClick={onSwitchSide}>
          {side === "left" ? "Move panel to right ⇥" : "⇤Move panel to left"}
        </button>
      </div>

      <div className="p-3 border-b border-[rgba(255,255,255,0.06)] shrink-0">
        <div className={sectionLabel}>Images</div>
        <div className="flex flex-col gap-1 max-h-[200px] overflow-y-auto overflow-x-hidden mb-2">
          {images.map((img) => (
            <div
              key={img.id}
              onClick={() => onSelect(img.id)}
              className={clsx(
                "flex items-center gap-2 px-2 py-1.5 rounded-[5px] cursor-pointer transition-colors border",
                img.id === selectedId
                  ? "bg-[rgba(99,120,255,0.2)] border-[rgba(99,120,255,0.4)]"
                  : "bg-[rgba(255,255,255,0.04)] border-transparent hover:bg-[rgba(255,255,255,0.08)]",
              )}
            >
              <img className="w-8 h-8 object-cover rounded-[3px] shrink-0 bg-[rgba(255,255,255,0.05)]" src={img.dataUrl} alt="" />
              <span
                className="flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[11px] text-[rgba(255,255,255,0.75)]"
                title={img.name}
              >
                {img.name}
              </span>
              <button
                title="Remove"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(img.id);
                }}
                className="w-[18px] h-[18px] rounded-[3px] bg-transparent text-[rgba(255,255,255,0.3)] cursor-pointer text-xs flex items-center justify-center shrink-0 border-none transition-colors hover:bg-[rgba(220,60,60,0.5)] hover:text-white"
              >
                {"✕"}
              </button>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-1.5">
          <button className={btnOpen} onClick={onOpenFile}>
            + Open file
          </button>
        </div>
      </div>

      {selected && (
        <div className="p-3 flex-1 overflow-y-auto overflow-x-hidden">
          <div className={sectionLabel}>Settings</div>

          <label className="flex items-start gap-[7px] mb-3.5 cursor-pointer">
            <input
              type="checkbox"
              className="mt-px accent-[#6378ff] cursor-pointer shrink-0"
              checked={matchDisplayScale}
              onChange={(e) => onToggleMatch(e.target.checked)}
            />
            <span className="text-[11px] text-[rgba(255,255,255,0.6)] leading-[1.3]">
              Match display scale
              <span className="block text-[10px] text-[rgba(255,255,255,0.3)] tabular-nums">{dprHint}</span>
            </span>
          </label>

          <Setting
            label="Scale"
            unit="%"
            value={Math.round(selected.settings.scale * 100)}
            sliderMin={10}
            sliderMax={300}
            numberMin={10}
            numberMax={300}
            onChange={(v) => onUpdateSettings({ scale: v / 100 })}
          />
          <Setting
            label="Opacity"
            unit="%"
            value={Math.round(selected.settings.opacity * 100)}
            sliderMin={0}
            sliderMax={100}
            numberMin={0}
            numberMax={100}
            onChange={(v) => onUpdateSettings({ opacity: v / 100 })}
          />
          <Setting
            label="Hue"
            unit="°"
            value={Math.round(selected.settings.hueOffset)}
            sliderMin={0}
            sliderMax={360}
            numberMin={0}
            numberMax={360}
            onChange={(v) => onUpdateSettings({ hueOffset: v })}
          />
          <Setting
            label="X offset"
            unit="px"
            value={Math.round(selected.settings.x)}
            sliderMin={-1000}
            sliderMax={1000}
            onChange={(v) => onUpdateSettings({ x: v })}
          />
          <Setting
            label="Y offset"
            unit="px"
            value={Math.round(selected.settings.y)}
            sliderMin={-1000}
            sliderMax={1000}
            onChange={(v) => onUpdateSettings({ y: v })}
          />

          <button className={clsx(btnMoveBase, "mt-1", isMoveMode ? btnMoveActive : btnMoveIdle)} onClick={onToggleMove}>
            {isMoveMode ? "Done repositioning" : "Reposition image"}
          </button>
        </div>
      )}
    </div>
  );
}
