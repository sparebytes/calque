import { useEffect, useState } from "react";

interface SettingProps {
  label: string;
  unit: string;
  /** Display value (already scaled for presentation, e.g. opacity 0.5 -> 50). */
  value: number;
  sliderMin: number;
  sliderMax: number;
  step?: number;
  numberMin?: number;
  numberMax?: number;
  onChange: (value: number) => void;
}

const numClass =
  "w-[52px] min-w-0 bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.12)] rounded text-[#e0e0e0] px-1 py-0.5 text-[11px] text-right tabular-nums focus:outline-none focus:border-[rgba(99,120,255,0.6)]";

/**
 * A labeled slider paired with an exact number field. The two stay in sync: the
 * slider clamps to its own range while the number field can hold any value. A
 * local text buffer lets you type intermediate states (a lone "-", an empty
 * field) without the controlled value snapping back mid-edit.
 */
export default function Setting({
  label,
  unit,
  value,
  sliderMin,
  sliderMax,
  step = 1,
  numberMin,
  numberMax,
  onChange,
}: SettingProps) {
  const [text, setText] = useState(String(value));
  // Resync the text buffer when the value changes from the outside (slider,
  // image-drag, switching the selected image) but not from our own keystrokes.
  useEffect(() => setText(String(value)), [value]);

  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-[5px]">
        <label className="text-[11px] text-[rgba(255,255,255,0.6)]">{label}</label>
        <div className="flex items-center gap-[3px]">
          <input
            type="number"
            className={numClass}
            min={numberMin}
            max={numberMax}
            step={step}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              const n = Number(e.target.value);
              if (e.target.value.trim() !== "" && !Number.isNaN(n)) onChange(n);
            }}
          />
          <span className="text-[10px] text-[rgba(255,255,255,0.35)] w-4">{unit}</span>
        </div>
      </div>
      <input
        type="range"
        className="block w-full min-w-0 h-[3px] accent-[#6378ff] cursor-pointer"
        min={sliderMin}
        max={sliderMax}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
