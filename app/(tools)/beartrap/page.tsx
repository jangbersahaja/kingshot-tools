"use client";

import { Card } from "@/app/_shared/components/Card";
import type {
  BearTrapConfig,
  BearTrapSecondaryStats,
  CalculationResult,
  TroopInventory,
} from "@/app/_shared/types";
import { useState } from "react";
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

const defaultInventory: TroopInventory = {
  items: [
    { id: "infantry-t10-default", type: "infantry", tier: 10, count: 200000 },
    { id: "infantry-t9-default", type: "infantry", tier: 9, count: 100000 },
    { id: "infantry-t8-default", type: "infantry", tier: 8, count: 50000 },
    { id: "cavalry-t10-default", type: "cavalry", tier: 10, count: 200000 },
    { id: "cavalry-t9-default", type: "cavalry", tier: 9, count: 100000 },
    { id: "cavalry-t8-default", type: "cavalry", tier: 8, count: 50000 },
    { id: "archer-t10-default", type: "archer", tier: 10, count: 200000 },
    { id: "archer-t9-default", type: "archer", tier: 9, count: 100000 },
    { id: "archer-t8-default", type: "archer", tier: 8, count: 50000 },
  ],
  trueGold: {
    infantry: 0,
    archer: 0,
    cavalry: 0,
  },
};

export default function BearTrapPage() {
  const [config, setConfig] = useState<BearTrapConfig>({
    inventory: defaultInventory,
    marchCapacity: 125000,
    joinerLimit: 65000,
    marchCount: 6,
    trapEnhancementLevel: 5,
    playerType: "average",
    ownRallyCount: 5,
    joinedRallyCount: 50,
  });

  const [secondaryStats, setSecondaryStats] = useState<BearTrapSecondaryStats>(
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
    <div className="min-h-screen bg-linear-to-br from-kingshot-dark-50 via-kingshot-primary-950 to-kingshot-dark-50 dark:from-gray-950 dark:via-kingshot-primary-950 dark:to-gray-950">
      <div className="max-w-450 mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6 lg:mb-8">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-linear-to-r from-kingshot-gold-400 via-kingshot-primary-400 to-kingshot-gold-400 bg-clip-text text-transparent">
            Magic Bear Formation
          </h1>
          <p className="mt-2 text-sm sm:text-base text-gray-300 dark:text-gray-400">
            Optimize your bear trap event formation for maximum damage output
          </p>
        </div>

        {/* Main Grid - Side by Side on Desktop */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-8">
          {/* Left Panel - Inputs (Sticky on Desktop) */}
          <div className="xl:col-span-4 space-y-4">
            <div className="xl:sticky xl:top-8 space-y-4">
              <Card title="Troop Inventory">
                <TroopsInput config={config} onConfigChange={setConfig} />
              </Card>

              <Card title="Rally Settings">
                <RallySettings config={config} onConfigChange={setConfig} />
              </Card>

              <Card title="Battle Stats">
                <BattleStatsInput
                  stats={secondaryStats}
                  onStatsChange={setSecondaryStats}
                />
              </Card>

              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 space-y-3">
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
                  <option value="strong">Strong (Own Rally First)</option>
                  <option value="average">Average (Balanced)</option>
                  <option value="joiner">Pure Joiner (Joining Only)</option>
                </select>
              </div>

              <button
                onClick={handleCalculate}
                className="w-full rounded-xl bg-linear-to-r from-kingshot-gold-500 to-kingshot-gold-600 hover:from-kingshot-gold-600 hover:to-kingshot-gold-700 px-6 py-3.5 text-white font-bold shadow-lg shadow-kingshot-gold-500/30 hover:shadow-kingshot-gold-500/50 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
              >
                Calculate Formation
              </button>
            </div>
          </div>

          {/* Right Panel - Results */}
          <div className="xl:col-span-8">
            {result ? (
              <ResultsDisplay result={result} />
            ) : (
              <Card>
                <div className="flex flex-col items-center justify-center h-96 space-y-4">
                  <div className="w-24 h-24 rounded-full bg-linear-to-br from-kingshot-primary-500/20 to-kingshot-gold-500/20 flex items-center justify-center">
                    <svg
                      className="w-12 h-12 text-kingshot-gold-400"
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
                  <p className="text-gray-400 dark:text-gray-500 text-center">
                    Fill in your troops and settings, then click{" "}
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
    </div>
  );
}
