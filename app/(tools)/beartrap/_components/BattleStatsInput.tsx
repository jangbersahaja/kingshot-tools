"use client";

import { Input } from "@/app/_shared/components/Input";
import { TROOP_TYPES } from "@/app/_shared/data/troops";
import type { BearTrapSecondaryStats, TroopType } from "@/app/_shared/types";

interface BattleStatsInputProps {
  stats: BearTrapSecondaryStats;
  onStatsChange: (stats: BearTrapSecondaryStats) => void;
}

export default function BattleStatsInput({
  stats,
  onStatsChange,
}: BattleStatsInputProps) {
  const handleStatsChange = (
    troopType: TroopType,
    key: string,
    value: number,
  ) => {
    onStatsChange({
      ...stats,
      [troopType]: {
        ...stats[troopType],
        [key]: value,
      },
    });
  };

  return (
    <div className="space-y-6">
      {Object.entries(TROOP_TYPES).map(([key, label]) => (
        <div key={key}>
          <h4 className="text-sm font-semibold text-gray-200 mb-3">{label}</h4>
          <div className="grid grid-cols-2 gap-2">
            <Input
              label="Attack"
              type="number"
              value={stats[key as TroopType].attack}
              onChange={(e) =>
                handleStatsChange(
                  key as TroopType,
                  "attack",
                  parseFloat(e.target.value) || 0,
                )
              }
              min={0}
            />
            <Input
              label="Defense"
              type="number"
              value={stats[key as TroopType].defense}
              onChange={(e) =>
                handleStatsChange(
                  key as TroopType,
                  "defense",
                  parseFloat(e.target.value) || 0,
                )
              }
              min={0}
            />
            <Input
              label="Lethality"
              type="number"
              value={stats[key as TroopType].lethality}
              onChange={(e) =>
                handleStatsChange(
                  key as TroopType,
                  "lethality",
                  parseFloat(e.target.value) || 0,
                )
              }
              min={0}
              step="0.1"
            />
            <Input
              label="Health"
              type="number"
              value={stats[key as TroopType].health}
              onChange={(e) =>
                handleStatsChange(
                  key as TroopType,
                  "health",
                  parseFloat(e.target.value) || 0,
                )
              }
              min={0}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
