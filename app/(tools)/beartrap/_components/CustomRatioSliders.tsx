"use client";

import { useRef, useState } from "react";

import type { TroopRatio } from "@/app/_shared/types";

interface RatioSliderGroupProps {
  label: string;
  value: TroopRatio;
  onChange: (v: TroopRatio) => void;
}

function ClickToEditPercent({
  value,
  color,
  onChange,
}: {
  value: number;
  color: string;
  onChange: (v: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const open = () => {
    setDraft(String(value));
    setEditing(true);
    // Focus after render
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const commit = () => {
    const n = parseInt(draft, 10);
    if (!isNaN(n)) onChange(Math.max(0, Math.min(100, n)));
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        min={0}
        max={100}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") setEditing(false);
        }}
        className="w-10 text-right text-[11px] font-mono font-semibold bg-white/10 border border-white/20 rounded px-1 py-0.5 outline-none focus:border-white/40 tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
        style={{ color }}
        autoFocus
      />
    );
  }

  return (
    <button
      onClick={open}
      title="Click to type a value"
      className="w-10 text-right text-[11px] font-mono font-semibold tabular-nums rounded px-1 py-0.5 hover:bg-white/10 transition-colors cursor-text shrink-0"
      style={{ color }}
    >
      {value}%
    </button>
  );
}

const TYPES = [
  {
    key: "infantry" as const,
    label: "Infantry",
    textColor: "text-blue-400",
    trackColor: "#3b82f6",
  },
  {
    key: "cavalry" as const,
    label: "Cavalry",
    textColor: "text-green-400",
    trackColor: "#22c55e",
  },
  {
    key: "archer" as const,
    label: "Archer",
    textColor: "text-amber-400",
    trackColor: "#f59e0b",
  },
];

function RatioSliderGroup({ label, value, onChange }: RatioSliderGroupProps) {
  const handleChange = (type: keyof TroopRatio, rawVal: number) => {
    const newVal = Math.max(0, Math.min(100, rawVal));
    const others = (["infantry", "cavalry", "archer"] as const).filter(
      (t) => t !== type,
    );
    const otherSum = value[others[0]] + value[others[1]];
    const remaining = 100 - newVal;
    let a0: number;
    let a1: number;
    if (otherSum === 0) {
      a0 = Math.floor(remaining / 2);
      a1 = remaining - a0;
    } else {
      a0 = Math.round((remaining * value[others[0]]) / otherSum);
      a1 = remaining - a0;
    }
    onChange({
      ...value,
      [type]: newVal,
      [others[0]]: Math.max(0, a0),
      [others[1]]: Math.max(0, a1),
    });
  };

  const sum = value.infantry + value.cavalry + value.archer;
  const isValid = sum === 100;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
          {label}
        </span>
        <span
          className={`text-[10px] font-mono tabular-nums ${isValid ? "text-green-400" : "text-red-400"}`}
        >
          {value.infantry}% + {value.cavalry}% + {value.archer}% ={" "}
          <span className="font-bold">{sum}%</span>
        </span>
      </div>
      {TYPES.map(({ key, label: typeLabel, textColor }) => (
        <div key={key} className="flex items-center gap-2.5">
          <span
            className={`text-[10px] font-medium w-14 shrink-0 ${textColor}`}
          >
            {typeLabel}
          </span>
          {/* Bar track */}
          <div className="relative flex-1 h-5 flex items-center">
            {/* Filled portion */}
            <div
              className="absolute left-0 h-1.5 rounded-full pointer-events-none transition-all"
              style={{
                width: `${value[key]}%`,
                background:
                  key === "infantry"
                    ? "#3b82f6"
                    : key === "cavalry"
                      ? "#22c55e"
                      : "#f59e0b",
                opacity: 0.7,
              }}
            />
            {/* Track background */}
            <div className="absolute inset-0 flex items-center">
              <div className="w-full h-1.5 rounded-full bg-white/10" />
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={value[key]}
              onChange={(e) => handleChange(key, parseInt(e.target.value))}
              className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
              style={{ zIndex: 1 }}
            />
            {/* Thumb indicator */}
            <div
              className="absolute w-3 h-3 rounded-full border-2 border-white/80 shadow pointer-events-none transition-all"
              style={{
                left: `calc(${value[key]}% - 6px)`,
                background:
                  key === "infantry"
                    ? "#3b82f6"
                    : key === "cavalry"
                      ? "#22c55e"
                      : "#f59e0b",
              }}
            />
          </div>
          <ClickToEditPercent
            value={value[key]}
            color={
              key === "infantry"
                ? "#3b82f6"
                : key === "cavalry"
                  ? "#22c55e"
                  : "#f59e0b"
            }
            onChange={(v) => handleChange(key, v)}
          />
        </div>
      ))}
    </div>
  );
}

interface CustomRatioSlidersProps {
  ownRally: TroopRatio;
  joiner: TroopRatio;
  onOwnRallyChange: (v: TroopRatio) => void;
  onJoinerChange: (v: TroopRatio) => void;
}

export default function CustomRatioSliders({
  ownRally,
  joiner,
  onOwnRallyChange,
  onJoinerChange,
}: CustomRatioSlidersProps) {
  return (
    <div className="mt-3 rounded-lg border border-purple-500/20 bg-purple-500/5 px-3 py-3 space-y-4">
      <RatioSliderGroup
        label="Own Rally Ratio"
        value={ownRally}
        onChange={onOwnRallyChange}
      />
      <div className="border-t border-white/8" />
      <RatioSliderGroup
        label="Joiner March Ratio"
        value={joiner}
        onChange={onJoinerChange}
      />
      <p className="text-[10px] text-gray-600 leading-relaxed">
        Drag sliders to set your desired troop mix. If you don&apos;t have
        enough of a type, remaining capacity fills with available troops (arc →
        cav → inf). Values must sum to 100%.
      </p>
    </div>
  );
}
