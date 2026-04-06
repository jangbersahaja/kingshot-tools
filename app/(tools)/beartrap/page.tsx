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
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Magic Bear Formation
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Optimize your bear trap event formation for maximum damage output
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Input Panel */}
        <div className="lg:col-span-1 space-y-4">
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

          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-100">
              Player Type
            </label>
            <select
              value={config.playerType}
              onChange={(e) =>
                setConfig({
                  ...config,
                  playerType: e.target.value as "strong" | "average" | "joiner",
                })
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="strong">Strong (Own Rally First)</option>
              <option value="average">Average (Balanced)</option>
              <option value="joiner">Pure Joiner (Joining Only)</option>
            </select>
          </div>

          <button
            onClick={handleCalculate}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 transition-colors"
          >
            Calculate Formation
          </button>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-2">
          {result ? (
            <ResultsDisplay result={result} />
          ) : (
            <Card>
              <div className="flex items-center justify-center h-96">
                <p className="text-gray-500 dark:text-gray-400">
                  Fill in your troops and settings, then click Calculate
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
