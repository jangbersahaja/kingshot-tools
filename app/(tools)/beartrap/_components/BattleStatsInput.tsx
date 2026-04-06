"use client";

import type { BearTrapSecondaryStats, TroopType } from "@/app/_shared/types";

interface BattleStatsInputProps {
  stats: BearTrapSecondaryStats;
  onStatsChange: (stats: BearTrapSecondaryStats) => void;
}

const TROOP_META: { type: TroopType; icon: string; label: string; color: string }[] = [
  { type: "infantry", icon: "⚔️", label: "Infantry", color: "text-blue-400"   },
  { type: "cavalry",  icon: "🐴", label: "Cavalry",  color: "text-green-400"  },
  { type: "archer",   icon: "🏹", label: "Archer",   color: "text-orange-400" },
];

const STAT_FIELDS: { key: keyof BearTrapSecondaryStats[TroopType]; label: string; step?: string }[] = [
  { key: "attack",    label: "Atk"  },
  { key: "defense",   label: "Def"  },
  { key: "lethality", label: "Leth", step: "0.1" },
  { key: "health",    label: "HP"   },
];

export default function BattleStatsInput({ stats, onStatsChange }: BattleStatsInputProps) {
  const set = (type: TroopType, key: string, value: number) =>
    onStatsChange({ ...stats, [type]: { ...stats[type], [key]: value } });

  return (
    <div className="space-y-4">
      {/* Column headers */}
      <div className="grid grid-cols-[1fr_repeat(4,minmax(0,1fr))] gap-x-2 gap-y-0">
        <div />
        {STAT_FIELDS.map(({ label }) => (
          <p key={label} className="text-[11px] text-center font-medium text-gray-500 uppercase tracking-wide pb-1">
            {label}
          </p>
        ))}

        {/* One row per troop type */}
        {TROOP_META.map(({ type, icon, label, color }) => (
          <>
            {/* Row label */}
            <div key={`${type}-label`} className="flex items-center gap-1.5 pr-1">
              <span className="text-sm leading-none">{icon}</span>
              <span className={`text-xs font-semibold ${color}`}>{label}</span>
            </div>
            {/* Stat inputs */}
            {STAT_FIELDS.map(({ key, step }) => (
              <input
                key={`${type}-${key}`}
                type="number"
                min={0}
                step={step ?? "0.1"}
                value={stats[type][key]}
                onChange={(e) => set(type, key, parseFloat(e.target.value) || 0)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-1.5 py-1.5 text-xs text-white text-right tabular-nums outline-none transition-colors focus:border-kingshot-gold-500 focus:ring-1 focus:ring-kingshot-gold-500/20"
              />
            ))}
          </>
        ))}
      </div>
      <p className="text-[11px] text-gray-600">Values are % bonuses from research / equipment</p>
    </div>
  );
}
