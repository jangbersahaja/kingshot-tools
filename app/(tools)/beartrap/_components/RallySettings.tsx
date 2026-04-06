"use client";

import type { BearTrapConfig } from "@/app/_shared/types";

interface RallySettingsProps {
  config: BearTrapConfig;
  onConfigChange: (config: BearTrapConfig) => void;
}

interface FieldProps {
  label: string;
  hint?: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (val: number) => void;
}

function Field({ label, hint, value, min, max, onChange }: FieldProps) {
  return (
    <div className="space-y-0.5">
      <label className="block text-xs font-medium text-gray-400">{label}</label>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(parseInt(e.target.value) || min || 0)}
        className="w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-sm text-white tabular-nums outline-none transition-colors focus:border-kingshot-gold-500 focus:ring-1 focus:ring-kingshot-gold-500/20"
      />
      {hint && <p className="text-[11px] text-gray-600 leading-tight">{hint}</p>}
    </div>
  );
}

export default function RallySettings({ config, onConfigChange }: RallySettingsProps) {
  const set = (updates: Partial<BearTrapConfig>) => onConfigChange({ ...config, ...updates });

  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-3">
      <Field
        label="Deploy Capacity"
        hint="Own rally troop cap"
        value={config.marchCapacity}
        min={0}
        onChange={(v) => set({ marchCapacity: v })}
      />
      <Field
        label="Joiner Limit"
        hint="Per-march troop cap"
        value={config.joinerLimit}
        min={0}
        onChange={(v) => set({ joinerLimit: v })}
      />
      <Field
        label="March Count"
        hint="Joiner formations"
        value={config.marchCount}
        min={1}
        max={20}
        onChange={(v) => set({ marchCount: v })}
      />
      <Field
        label="Trap Level"
        hint="+5% atk/lvl, max 25%"
        value={config.trapEnhancementLevel}
        min={1}
        max={5}
        onChange={(v) => set({ trapEnhancementLevel: v })}
      />
      <Field
        label="Own Rallies Led"
        hint="Times you led a rally"
        value={config.ownRallyCount}
        min={1}
        onChange={(v) => set({ ownRallyCount: v })}
      />
      <Field
        label="Rallies Joined"
        hint="Times you joined"
        value={config.joinedRallyCount}
        min={0}
        onChange={(v) => set({ joinedRallyCount: v })}
      />
    </div>
  );
}
