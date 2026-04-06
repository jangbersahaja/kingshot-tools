"use client";

import { Card } from "@/app/_shared/components/Card";
import type {
  BearTrapConfig,
  BearTrapSecondaryStats,
  CalculationResult,
} from "@/app/_shared/types";
import { useState } from "react";
import { useLocalStorage } from "@/app/_shared/hooks/useLocalStorage";
import BattleStatsInput from "./_components/BattleStatsInput";
import RallySettings from "./_components/RallySettings";
import ResultsDisplay from "./_components/ResultsDisplay";
import TroopsInput from "./_components/TroopsInput";
import { calculateBearTrapFormation } from "./_lib/calculations";

const defaultSecondaryStats: BearTrapSecondaryStats = {
  infantry: { attack: 438.7, defense: 450.7, lethality: 287.3, health: 330 },
  archer: { attack: 376.5, defense: 392.5, lethality: 303.5, health: 252.8 },
  cavalry: { attack: 374.4, defense: 388.4, lethality: 276.9, health: 240.2 },
};

export default function BearTrapPage() {
  const [config, setConfig] = useLocalStorage<BearTrapConfig>("beartrap:config", {
    inventory: {
      items: [],
      trueGold: { infantry: 0, archer: 0, cavalry: 0 },
    },
    marchCapacity: 125000,
    joinerLimit: 65000,
    marchCount: 6,
    trapEnhancementLevel: 5,
    playerType: "average",
    ownRallyCount: 5,
    joinedRallyCount: 50,
  });

  const [secondaryStats, setSecondaryStats] = useLocalStorage<BearTrapSecondaryStats>(
    "beartrap:secondaryStats",
    defaultSecondaryStats,
  );

  const [result, setResult] = useState<CalculationResult | null>(null);

  const handleCalculate = () => {
    if (config.inventory.items.length === 0) {
      alert("Please add at least one troop to your inventory");
      return;
    }
    const formation = calculateBearTrapFormation(config, secondaryStats);
    setResult({
      config,
      secondaryStats,
      formation,
      recommendations: [],
    });
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-screen-2xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl sm:text-4xl font-bold bg-linear-to-r from-kingshot-gold-400 via-kingshot-primary-400 to-kingshot-gold-400 bg-clip-text text-transparent">
            Bear Formation Generator
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Optimize your bear trap event formation for maximum damage output
          </p>
        </div>

        {/* Input Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          {/* Left: Troop Inventory - spans 2 rows */}
          <div className="lg:row-span-2">
            <Card title="Troop Inventory" className="h-full">
              <TroopsInput config={config} onConfigChange={setConfig} />
            </Card>
          </div>

          {/* Top-right: Rally Settings + Battle Stats */}
          <Card title="Rally Settings">
            <RallySettings config={config} onConfigChange={setConfig} />
          </Card>

          <Card title="Battle Stats">
            <BattleStatsInput
              stats={secondaryStats}
              onStatsChange={setSecondaryStats}
            />
          </Card>

          {/* Bottom-right: Player Type + Calculate spanning 2 cols */}
          <div className="lg:col-span-2 flex flex-col sm:flex-row gap-4">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3 flex-1">
              <label className="block text-sm font-medium text-kingshot-gold-400">
                Player Type
              </label>
              <select
                value={config.playerType}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    playerType: e.target.value as
                      | "strong"
                      | "average"
                      | "joiner",
                  })
                }
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-white focus:border-kingshot-gold-500 focus:ring-2 focus:ring-kingshot-gold-500/20 outline-none transition-all"
              >
                <option value="strong" className="bg-zinc-900">
                  Strong (Own Rally First)
                </option>
                <option value="average" className="bg-zinc-900">
                  Average (Balanced)
                </option>
                <option value="joiner" className="bg-zinc-900">
                  Pure Joiner (Joining Only)
                </option>
              </select>
            </div>

            <button
              onClick={handleCalculate}
              className="sm:w-48 rounded-xl bg-linear-to-r from-kingshot-gold-500 to-kingshot-gold-600 hover:from-kingshot-gold-600 hover:to-kingshot-gold-700 px-6 py-4 text-white font-bold shadow-lg shadow-kingshot-gold-500/30 hover:shadow-kingshot-gold-500/50 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Calculate Formation
            </button>
          </div>
        </div>

        {/* Results - full width below inputs */}
        <div>
          {result ? (
            <ResultsDisplay result={result} />
          ) : (
            <Card>
              <div className="flex flex-col items-center justify-center h-48 space-y-3">
                <div className="w-16 h-16 rounded-full bg-linear-to-br from-kingshot-primary-500/20 to-kingshot-gold-500/20 flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-kingshot-gold-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <p className="text-gray-400 text-center text-sm">
                  Fill in your settings above, then click{" "}
                  <span className="text-kingshot-gold-400 font-semibold">
                    Calculate Formation
                  </span>
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
