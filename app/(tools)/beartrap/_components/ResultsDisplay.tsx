"use client";

import { Card } from "@/app/_shared/components/Card";
import type { CalculationResult } from "@/app/_shared/types";

interface ResultsDisplayProps {
  result: CalculationResult;
}

export default function ResultsDisplay({ result }: ResultsDisplayProps) {
  const { formation, config } = result;

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Configuration Summary */}
      <Card title="Configuration">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-600 dark:text-gray-400">Player Type</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
              {config.playerType}
            </p>
          </div>
          <div>
            <p className="text-gray-600 dark:text-gray-400">March Capacity</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {formatNumber(config.marchCapacity)}
            </p>
          </div>
          <div>
            <p className="text-gray-600 dark:text-gray-400">Joiner Limit</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {formatNumber(config.joinerLimit)}
            </p>
          </div>
          <div>
            <p className="text-gray-600 dark:text-gray-400">Trap Level</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {config.trapEnhancementLevel}
            </p>
          </div>
        </div>
      </Card>

      {/* Rally Damage Summary */}
      <Card title="Rally Damage Summary">
        <div className="space-y-4">
          {config.playerType !== "joiner" && (
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Own Rally Damage
              </p>
              <div className="flex justify-between items-baseline gap-4">
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  {Math.floor(
                    formation.ownRally.estimatedDamage,
                  ).toLocaleString()}{" "}
                  × {config.ownRallyCount}
                </p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {formatNumber(Math.floor(formation.ownRallyDamage ?? 0))}
                </p>
              </div>
            </div>
          )}
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Joined Rally Damage
            </p>
            <div className="flex justify-between items-baseline gap-4">
              <p className="text-xs text-gray-500 dark:text-gray-500">
                (Sum × ⅔) × {config.joinedRallyCount}
              </p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {formatNumber(Math.floor(formation.joinedRallyDamage ?? 0))}
              </p>
            </div>
          </div>
          {config.playerType !== "joiner" && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <div className="flex justify-between items-center">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  Total Event Damage
                </p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {formatNumber(
                    Math.floor(
                      (formation.ownRallyDamage ?? 0) +
                        (formation.joinedRallyDamage ?? 0),
                    ),
                  )}
                </p>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Own Rally Formation */}
      {config.playerType !== "joiner" && (
        <Card title="Your Rally Formation">
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded">
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Infantry
                </p>
                <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {formatNumber(formation.ownRally.infantry)}
                </p>
                {formation.ownRally.infantryTiers &&
                  Object.keys(formation.ownRally.infantryTiers).length > 0 && (
                    <div className="text-xs text-gray-600 dark:text-gray-500 mt-1 space-y-0.5">
                      {Object.entries(formation.ownRally.infantryTiers)
                        .sort(([a], [b]) => parseInt(b) - parseInt(a))
                        .map(([tier, count]) => (
                          <div key={tier}>
                            T{tier}: {formatNumber(count)}
                          </div>
                        ))}
                    </div>
                  )}
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded">
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Cavalry
                </p>
                <p className="text-lg font-bold text-green-600 dark:text-green-400">
                  {formatNumber(formation.ownRally.cavalry)}
                </p>
                {formation.ownRally.cavalryTiers &&
                  Object.keys(formation.ownRally.cavalryTiers).length > 0 && (
                    <div className="text-xs text-gray-600 dark:text-gray-500 mt-1 space-y-0.5">
                      {Object.entries(formation.ownRally.cavalryTiers)
                        .sort(([a], [b]) => parseInt(b) - parseInt(a))
                        .map(([tier, count]) => (
                          <div key={tier}>
                            T{tier}: {formatNumber(count)}
                          </div>
                        ))}
                    </div>
                  )}
              </div>
              <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded">
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Archer
                </p>
                <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
                  {formatNumber(formation.ownRally.archer)}
                </p>
                {formation.ownRally.archerTiers &&
                  Object.keys(formation.ownRally.archerTiers).length > 0 && (
                    <div className="text-xs text-gray-600 dark:text-gray-500 mt-1 space-y-0.5">
                      {Object.entries(formation.ownRally.archerTiers)
                        .sort(([a], [b]) => parseInt(b) - parseInt(a))
                        .map(([tier, count]) => (
                          <div key={tier}>
                            T{tier}: {formatNumber(count)}
                          </div>
                        ))}
                    </div>
                  )}
              </div>
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Total Troops
              </p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {formatNumber(formation.ownRally.totalTroops)}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
                Estimated Damage
              </p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {formatNumber(Math.floor(formation.ownRally.estimatedDamage))}
              </p>
              {formation.ownRally.damageByType && (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                    Damage by Type
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                      <p className="text-gray-600 dark:text-gray-400">
                        Infantry
                      </p>
                      <p className="font-bold text-blue-600 dark:text-blue-400">
                        {formatNumber(
                          Math.floor(formation.ownRally.damageByType.infantry),
                        )}
                      </p>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded">
                      <p className="text-gray-600 dark:text-gray-400">
                        Cavalry
                      </p>
                      <p className="font-bold text-green-600 dark:text-green-400">
                        {formatNumber(
                          Math.floor(formation.ownRally.damageByType.cavalry),
                        )}
                      </p>
                    </div>
                    <div className="bg-orange-50 dark:bg-orange-900/20 p-2 rounded">
                      <p className="text-gray-600 dark:text-gray-400">Archer</p>
                      <p className="font-bold text-orange-600 dark:text-orange-400">
                        {formatNumber(
                          Math.floor(formation.ownRally.damageByType.archer),
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Joiners Marches - Responsive Layout */}
      {formation.joiners.length > 0 && (
        <Card title="Joiner Marches">
          <div className="space-y-4">
            {/* Desktop Grid View */}
            <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {formation.joiners.map((march) => (
                <div
                  key={march.marchIndex}
                  className="bg-linear-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-center mb-3">
                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                      March #{march.marchIndex}
                    </p>
                    <p className="text-base font-bold text-gray-900 dark:text-white">
                      {formatNumber(Math.floor(march.estimatedDamage))}
                    </p>
                  </div>

                  {/* Troops Section */}
                  <div className="space-y-2 mb-3 pb-3 border-b border-gray-200 dark:border-gray-700">
                    <div>
                      <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">
                        Infantry
                      </p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">
                        {formatNumber(march.infantry)}
                      </p>
                      {march.infantryTiers &&
                        Object.keys(march.infantryTiers).length > 0 && (
                          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 space-y-0.5">
                            {Object.entries(march.infantryTiers)
                              .sort(([a], [b]) => parseInt(b) - parseInt(a))
                              .map(([tier, count]) => (
                                <div key={tier} className="font-mono">
                                  T{tier}: {formatNumber(count)}
                                </div>
                              ))}
                          </div>
                        )}
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-green-600 dark:text-green-400 mb-1">
                        Cavalry
                      </p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">
                        {formatNumber(march.cavalry)}
                      </p>
                      {march.cavalryTiers &&
                        Object.keys(march.cavalryTiers).length > 0 && (
                          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 space-y-0.5">
                            {Object.entries(march.cavalryTiers)
                              .sort(([a], [b]) => parseInt(b) - parseInt(a))
                              .map(([tier, count]) => (
                                <div key={tier} className="font-mono">
                                  T{tier}: {formatNumber(count)}
                                </div>
                              ))}
                          </div>
                        )}
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-orange-600 dark:text-orange-400 mb-1">
                        Archer
                      </p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">
                        {formatNumber(march.archer)}
                      </p>
                      {march.archerTiers &&
                        Object.keys(march.archerTiers).length > 0 && (
                          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 space-y-0.5">
                            {Object.entries(march.archerTiers)
                              .sort(([a], [b]) => parseInt(b) - parseInt(a))
                              .map(([tier, count]) => (
                                <div key={tier} className="font-mono">
                                  T{tier}: {formatNumber(count)}
                                </div>
                              ))}
                          </div>
                        )}
                    </div>
                  </div>

                  {/* Damage Breakdown */}
                  {march.damageByType && (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
                        Damage by Type
                      </p>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="text-center">
                          <p className="text-gray-600 dark:text-gray-400">
                            Inf
                          </p>
                          <p className="font-bold text-blue-600 dark:text-blue-400">
                            {formatNumber(
                              Math.floor(march.damageByType.infantry),
                            )}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-gray-600 dark:text-gray-400">
                            Cav
                          </p>
                          <p className="font-bold text-green-600 dark:text-green-400">
                            {formatNumber(
                              Math.floor(march.damageByType.cavalry),
                            )}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-gray-600 dark:text-gray-400">
                            Arc
                          </p>
                          <p className="font-bold text-orange-600 dark:text-orange-400">
                            {formatNumber(
                              Math.floor(march.damageByType.archer),
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
              {formation.joiners.map((march) => (
                <div
                  key={march.marchIndex}
                  className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex justify-between items-center mb-3">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      March #{march.marchIndex}
                    </p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {formatNumber(Math.floor(march.estimatedDamage))} dmg
                    </p>
                  </div>

                  {/* Troops Grid */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Infantry
                      </p>
                      <p className="text-sm font-bold text-blue-600 dark:text-blue-400">
                        {formatNumber(march.infantry)}
                      </p>
                      {march.infantryTiers &&
                        Object.keys(march.infantryTiers).length > 0 && (
                          <div className="text-xs text-gray-600 dark:text-gray-500 mt-1 space-y-0.5">
                            {Object.entries(march.infantryTiers)
                              .sort(([a], [b]) => parseInt(b) - parseInt(a))
                              .map(([tier, count]) => (
                                <div key={tier}>
                                  T{tier}: {formatNumber(count)}
                                </div>
                              ))}
                          </div>
                        )}
                    </div>

                    <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded">
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Cavalry
                      </p>
                      <p className="text-sm font-bold text-green-600 dark:text-green-400">
                        {formatNumber(march.cavalry)}
                      </p>
                      {march.cavalryTiers &&
                        Object.keys(march.cavalryTiers).length > 0 && (
                          <div className="text-xs text-gray-600 dark:text-gray-500 mt-1 space-y-0.5">
                            {Object.entries(march.cavalryTiers)
                              .sort(([a], [b]) => parseInt(b) - parseInt(a))
                              .map(([tier, count]) => (
                                <div key={tier}>
                                  T{tier}: {formatNumber(count)}
                                </div>
                              ))}
                          </div>
                        )}
                    </div>

                    <div className="bg-orange-50 dark:bg-orange-900/20 p-2 rounded">
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Archer
                      </p>
                      <p className="text-sm font-bold text-orange-600 dark:text-orange-400">
                        {formatNumber(march.archer)}
                      </p>
                      {march.archerTiers &&
                        Object.keys(march.archerTiers).length > 0 && (
                          <div className="text-xs text-gray-600 dark:text-gray-500 mt-1 space-y-0.5">
                            {Object.entries(march.archerTiers)
                              .sort(([a], [b]) => parseInt(b) - parseInt(a))
                              .map(([tier, count]) => (
                                <div key={tier}>
                                  T{tier}: {formatNumber(count)}
                                </div>
                              ))}
                          </div>
                        )}
                    </div>
                  </div>

                  {/* Damage Breakdown */}
                  {march.damageByType && (
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                        Damage by Type
                      </p>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="text-center">
                          <p className="text-gray-600 dark:text-gray-400">
                            Infantry
                          </p>
                          <p className="font-bold text-blue-600 dark:text-blue-400">
                            {formatNumber(
                              Math.floor(march.damageByType.infantry),
                            )}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-gray-600 dark:text-gray-400">
                            Cavalry
                          </p>
                          <p className="font-bold text-green-600 dark:text-green-400">
                            {formatNumber(
                              Math.floor(march.damageByType.cavalry),
                            )}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-gray-600 dark:text-gray-400">
                            Archer
                          </p>
                          <p className="font-bold text-orange-600 dark:text-orange-400">
                            {formatNumber(
                              Math.floor(march.damageByType.archer),
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3">
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Total Troops
                    </p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                      {formatNumber(march.totalTroops)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Total Summary */}
      <Card title="Total Formation Summary">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-600 dark:text-gray-400">
              Total Damage
            </span>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatNumber(Math.floor(formation.totalDamage))}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600 dark:text-gray-400">Marches</span>
            <span className="text-gray-900 dark:text-white font-medium">
              {config.playerType === "joiner"
                ? formation.joiners.length
                : formation.joiners.length + 1}
            </span>
          </div>
        </div>
      </Card>

      {/* Debug Info: Formation Ratios */}
      {formation.debugInfo && (
        <>
          <Card title="Formation Ratios">
            <div className="space-y-4">
              {formation.debugInfo.ownRallyRatio && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Your Rally Formation
                  </p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white font-mono">
                    {formation.debugInfo.ownRallyRatio}
                  </p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Joiner Marches Formation
                </p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white font-mono">
                  {formation.debugInfo.joinerRatio}
                </p>
              </div>
            </div>
          </Card>

          {/* Debug Info: Troop Allocation Table */}
          <Card title="Troop Allocation Details">
            <div className="space-y-6">
              {/* Used Troops */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  Used Troops
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-2 px-2 text-gray-600 dark:text-gray-400 font-semibold">
                          Type
                        </th>
                        {(() => {
                          // Extract unique tiers from BOTH used and unused to ensure consistent columns
                          const usedKeys = Object.keys(
                            formation.debugInfo!.usedTroops,
                          );
                          const unusedKeys = Object.keys(
                            formation.debugInfo!.unusedTroops,
                          );
                          const allKeys = [...usedKeys, ...unusedKeys];
                          const tierSet = new Set<number>();
                          allKeys.forEach((k) => {
                            const match = k.match(/_T(\d+)$/);
                            if (match) tierSet.add(parseInt(match[1]));
                          });
                          const sortedTiers = Array.from(tierSet).sort(
                            (a, b) => a - b,
                          );
                          return sortedTiers.map((tier) => (
                            <th
                              key={`th-used-t${tier}`}
                              className="text-right py-2 px-2 text-gray-600 dark:text-gray-400 font-semibold"
                            >
                              T{tier}
                            </th>
                          ));
                        })()}
                        <th className="text-right py-2 px-2 text-gray-600 dark:text-gray-400 font-semibold">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {["infantry", "cavalry", "archer"].map((type) => {
                        // Get all tiers from both used and unused
                        const usedKeys = Object.keys(
                          formation.debugInfo!.usedTroops,
                        );
                        const unusedKeys = Object.keys(
                          formation.debugInfo!.unusedTroops,
                        );
                        const allKeys = [...usedKeys, ...unusedKeys];
                        const tierSet = new Set<number>();
                        allKeys.forEach((k) => {
                          const match = k.match(/_T(\d+)$/);
                          if (match) tierSet.add(parseInt(match[1]));
                        });
                        const sortedTiers = Array.from(tierSet).sort(
                          (a, b) => a - b,
                        );

                        const tierCounts: Record<number, number> = {};
                        sortedTiers.forEach((tier) => {
                          tierCounts[tier] = Object.entries(
                            formation.debugInfo!.usedTroops,
                          )
                            .filter(
                              ([k]) =>
                                k === `${type}_T${tier}` ||
                                (k.startsWith(type) && k.endsWith(`_T${tier}`)),
                            )
                            .reduce((sum, [, v]) => sum + v, 0);
                        });

                        const total = Object.values(tierCounts).reduce(
                          (a, b) => a + b,
                          0,
                        );

                        return (
                          <tr
                            key={type}
                            className="border-b border-gray-100 dark:border-gray-800"
                          >
                            <td className="py-2 px-2 text-gray-900 dark:text-white font-medium capitalize">
                              {type}
                            </td>
                            {sortedTiers.map((tier) => (
                              <td
                                key={`${type}-used-t${tier}`}
                                className="text-right py-2 px-2 text-gray-700 dark:text-gray-300"
                              >
                                {formatNumber(tierCounts[tier])}
                              </td>
                            ))}
                            <td className="text-right py-2 px-2 text-gray-900 dark:text-white font-semibold">
                              {formatNumber(total)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Unused Troops */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  Unused Troops
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-2 px-2 text-gray-600 dark:text-gray-400 font-semibold">
                          Type
                        </th>
                        {(() => {
                          // Extract unique tiers from BOTH used and unused to ensure consistent columns
                          const usedKeys = Object.keys(
                            formation.debugInfo!.usedTroops,
                          );
                          const unusedKeys = Object.keys(
                            formation.debugInfo!.unusedTroops,
                          );
                          const allKeys = [...usedKeys, ...unusedKeys];
                          const tierSet = new Set<number>();
                          allKeys.forEach((k) => {
                            const match = k.match(/_T(\d+)$/);
                            if (match) tierSet.add(parseInt(match[1]));
                          });
                          const sortedTiers = Array.from(tierSet).sort(
                            (a, b) => a - b,
                          );
                          return sortedTiers.map((tier) => (
                            <th
                              key={`th-unused-t${tier}`}
                              className="text-right py-2 px-2 text-gray-600 dark:text-gray-400 font-semibold"
                            >
                              T{tier}
                            </th>
                          ));
                        })()}
                        <th className="text-right py-2 px-2 text-gray-600 dark:text-gray-400 font-semibold">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {["infantry", "cavalry", "archer"].map((type) => {
                        // Get all tiers from both used and unused
                        const usedKeys = Object.keys(
                          formation.debugInfo!.usedTroops,
                        );
                        const unusedKeys = Object.keys(
                          formation.debugInfo!.unusedTroops,
                        );
                        const allKeys = [...usedKeys, ...unusedKeys];
                        const tierSet = new Set<number>();
                        allKeys.forEach((k) => {
                          const match = k.match(/_T(\d+)$/);
                          if (match) tierSet.add(parseInt(match[1]));
                        });
                        const sortedTiers = Array.from(tierSet).sort(
                          (a, b) => a - b,
                        );

                        const tierCounts: Record<number, number> = {};
                        sortedTiers.forEach((tier) => {
                          tierCounts[tier] = Object.entries(
                            formation.debugInfo!.unusedTroops,
                          )
                            .filter(
                              ([k]) =>
                                k === `${type}_T${tier}` ||
                                (k.startsWith(type) && k.endsWith(`_T${tier}`)),
                            )
                            .reduce((sum, [, v]) => sum + v, 0);
                        });

                        const total = Object.values(tierCounts).reduce(
                          (a, b) => a + b,
                          0,
                        );

                        return (
                          <tr
                            key={type}
                            className="border-b border-gray-100 dark:border-gray-800"
                          >
                            <td className="py-2 px-2 text-gray-900 dark:text-white font-medium capitalize">
                              {type}
                            </td>
                            {sortedTiers.map((tier) => (
                              <td
                                key={`${type}-unused-t${tier}`}
                                className="text-right py-2 px-2 text-gray-700 dark:text-gray-300"
                              >
                                {formatNumber(tierCounts[tier])}
                              </td>
                            ))}
                            <td className="text-right py-2 px-2 text-gray-900 dark:text-white font-semibold">
                              {formatNumber(total)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
