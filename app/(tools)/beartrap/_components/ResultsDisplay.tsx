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

  const troopMeta = {
    infantry: { icon: "⚔️", label: "Infantry", color: "blue" as const },
    cavalry:  { icon: "🐴", label: "Cavalry",  color: "green" as const },
    archer:   { icon: "🏹", label: "Archer",   color: "orange" as const },
  };

  const colorClasses = {
    blue:   { card: "bg-blue-500/10 border-blue-500/20",   text: "text-blue-400" },
    green:  { card: "bg-green-500/10 border-green-500/20", text: "text-green-400" },
    orange: { card: "bg-orange-500/10 border-orange-500/20", text: "text-orange-400" },
  };

  return (
    <div className="space-y-6">
      {/* Configuration Summary */}
      <Card title="Configuration">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-400">Player Type</p>
            <p className="text-lg font-semibold text-white capitalize">
              {config.playerType}
            </p>
          </div>
          <div>
            <p className="text-gray-400">March Capacity</p>
            <p className="text-lg font-semibold text-white">
              {formatNumber(config.marchCapacity)}
            </p>
          </div>
          <div>
            <p className="text-gray-400">Joiner Limit</p>
            <p className="text-lg font-semibold text-white">
              {formatNumber(config.joinerLimit)}
            </p>
          </div>
          <div>
            <p className="text-gray-400">Trap Level</p>
            <p className="text-lg font-semibold text-white">
              {config.trapEnhancementLevel}
            </p>
          </div>
        </div>
      </Card>

      {/* Own Rally Formation */}
      {config.playerType !== "joiner" && (
        <Card title="Your Rally Formation">
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              {(["infantry", "cavalry", "archer"] as const).map((type) => {
                const { icon, label, color } = troopMeta[type];
                const { card, text } = colorClasses[color];
                const count = formation.ownRally[type];
                const tiers = formation.ownRally[`${type}Tiers` as keyof typeof formation.ownRally] as Record<string, number> | undefined;
                return (
                  <div key={type} className={`${card} border p-3 rounded-lg`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-base leading-none">{icon}</span>
                      <p className="text-xs text-gray-400">{label}</p>
                    </div>
                    <p className={`text-lg font-bold ${text}`}>
                      {formatNumber(count)}
                    </p>
                    {tiers && Object.keys(tiers).length > 0 && (
                      <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                        {Object.entries(tiers)
                          .sort(([a], [b]) => parseInt(b) - parseInt(a))
                          .map(([tier, cnt]) => (
                            <div key={tier}>T{tier}: {formatNumber(cnt)}</div>
                          ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="border-t border-white/10 pt-3">
              <p className="text-sm text-gray-400">Total Troops</p>
              <p className="text-xl font-bold text-white">
                {formatNumber(formation.ownRally.totalTroops)}
              </p>
              <p className="text-sm text-gray-400 mt-3">Estimated Damage</p>
              <p className="text-lg font-bold text-white">
                {formatNumber(Math.floor(formation.ownRally.estimatedDamage))}
              </p>
              {formation.ownRally.damageByType && (
                <div className="mt-3 pt-3 border-t border-white/10">
                  <p className="text-xs text-gray-400 mb-2">Damage by Type</p>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {([ "infantry", "cavalry", "archer"] as const).map((type) => {
                      const { icon, label, color } = troopMeta[type];
                      const { card, text } = colorClasses[color];
                      return (
                        <div key={type} className={`${card} border p-2 rounded`}>
                          <p className="text-gray-400">{icon} {label}</p>
                          <p className={`font-bold ${text}`}>
                            {formatNumber(Math.floor(formation.ownRally.damageByType![type]))}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Joiners Marches */}
      {formation.joiners.length > 0 && (
        <Card title="Joiner Marches">
          <div className="space-y-4">
            {/* Desktop Grid View */}
            <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {formation.joiners.map((march) => (
                <div
                  key={march.marchIndex}
                  className="bg-white/5 border border-white/10 p-4 rounded-lg hover:border-white/20 transition-colors"
                >
                  <div className="flex justify-between items-center mb-3">
                    <p className="text-sm font-bold text-gray-200">
                      March #{march.marchIndex}
                    </p>
                    <p className="text-sm font-bold text-kingshot-gold-400">
                      {formatNumber(Math.floor(march.estimatedDamage))}
                    </p>
                  </div>
                  <div className="space-y-2 mb-3 pb-3 border-b border-white/10">
                    {(["infantry", "cavalry", "archer"] as const).map((type) => {
                      const { icon, label, color } = troopMeta[type];
                      const { text } = colorClasses[color];
                      const count = march[type];
                      const tiers = march[`${type}Tiers` as keyof typeof march] as Record<string, number> | undefined;
                      return (
                        <div key={type}>
                          <p className={`text-xs font-semibold ${text} mb-1`}>
                            {icon} {label}
                          </p>
                          <p className="text-sm font-bold text-white">
                            {formatNumber(count as number)}
                          </p>
                          {tiers && Object.keys(tiers).length > 0 && (
                            <div className="text-xs text-gray-500 mt-1 space-y-0.5 font-mono">
                              {Object.entries(tiers)
                                .sort(([a], [b]) => parseInt(b) - parseInt(a))
                                .map(([tier, cnt]) => (
                                  <div key={tier}>T{tier}: {formatNumber(cnt)}</div>
                                ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {march.damageByType && (
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      {(["infantry", "cavalry", "archer"] as const).map((type) => {
                        const { icon, color } = troopMeta[type];
                        const { text } = colorClasses[color];
                        return (
                          <div key={type} className="text-center">
                            <p className="text-gray-500">{icon}</p>
                            <p className={`font-bold ${text}`}>
                              {formatNumber(Math.floor(march.damageByType![type]))}
                            </p>
                          </div>
                        );
                      })}
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
                  className="bg-white/5 border border-white/10 p-4 rounded-lg"
                >
                  <div className="flex justify-between items-center mb-3">
                    <p className="text-sm font-semibold text-gray-200">
                      March #{march.marchIndex}
                    </p>
                    <p className="text-lg font-bold text-kingshot-gold-400">
                      {formatNumber(Math.floor(march.estimatedDamage))} dmg
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {(["infantry", "cavalry", "archer"] as const).map((type) => {
                      const { icon, label, color } = troopMeta[type];
                      const { card, text } = colorClasses[color];
                      return (
                        <div key={type} className={`${card} border p-2 rounded`}>
                          <p className="text-xs text-gray-400">{icon} {label}</p>
                          <p className={`text-sm font-bold ${text}`}>
                            {formatNumber(march[type] as number)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                  <div className="border-t border-white/10 pt-3">
                    <p className="text-xs text-gray-400">Total Troops</p>
                    <p className="text-sm font-bold text-white">
                      {formatNumber(march.totalTroops)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Formation Ratios */}
      {formation.debugInfo && (
        <>
          <Card title="Formation Ratios">
            <div className="space-y-4">
              {formation.debugInfo.ownRallyRatio && (
                <div>
                  <p className="text-sm text-gray-400 mb-1">
                    Your Rally Formation
                  </p>
                  <p className="text-lg font-semibold text-white font-mono">
                    {formation.debugInfo.ownRallyRatio}
                  </p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-400 mb-1">
                  Joiner Marches Formation
                </p>
                <p className="text-lg font-semibold text-white font-mono">
                  {formation.debugInfo.joinerRatio}
                </p>
              </div>
            </div>
          </Card>

          {/* Rally Damage Summary */}
          <Card title="Rally Damage Summary">
            <div className="space-y-4">
              {config.playerType !== "joiner" && (
                <div className="flex justify-between items-baseline gap-4">
                  <div>
                    <p className="text-sm text-gray-400">Own Rally Damage</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {Math.floor(
                        formation.ownRally.estimatedDamage,
                      ).toLocaleString()}{" "}
                      × {config.ownRallyCount}
                    </p>
                  </div>
                  <p className="text-2xl font-bold text-blue-400">
                    {formatNumber(Math.floor(formation.ownRallyDamage ?? 0))}
                  </p>
                </div>
              )}
              <div className="flex justify-between items-baseline gap-4">
                <div>
                  <p className="text-sm text-gray-400">Joined Rally Damage</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    (Sum × ⅔) × {config.joinedRallyCount}
                  </p>
                </div>
                <p className="text-2xl font-bold text-green-400">
                  {formatNumber(Math.floor(formation.joinedRallyDamage ?? 0))}
                </p>
              </div>
              {config.playerType !== "joiner" && (
                <div className="border-t border-white/10 pt-4">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-semibold text-gray-200">
                      Total Event Damage
                    </p>
                    <p className="text-3xl font-bold text-kingshot-gold-400">
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

          {/* Troop Allocation Table */}
          <Card title="Troop Allocation Details">
            <div className="space-y-6">
              {(["usedTroops", "unusedTroops"] as const).map((section) => {
                const label =
                  section === "usedTroops" ? "Used Troops" : "Unused Troops";
                const allKeys = [
                  ...Object.keys(formation.debugInfo!.usedTroops),
                  ...Object.keys(formation.debugInfo!.unusedTroops),
                ];
                const tierSet = new Set<number>();
                allKeys.forEach((k) => {
                  const match = k.match(/_T(\d+)$/);
                  if (match) tierSet.add(parseInt(match[1]));
                });
                const sortedTiers = Array.from(tierSet).sort((a, b) => a - b);

                return (
                  <div key={section}>
                    <h3 className="text-sm font-semibold text-gray-200 mb-3">
                      {label}
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-white/10">
                            <th className="text-left py-2 px-2 text-gray-400 font-semibold">
                              Type
                            </th>
                            {sortedTiers.map((tier) => (
                              <th
                                key={tier}
                                className="text-right py-2 px-2 text-gray-400 font-semibold"
                              >
                                T{tier}
                              </th>
                            ))}
                            <th className="text-right py-2 px-2 text-gray-400 font-semibold">
                              Total
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {["infantry", "cavalry", "archer"].map((type) => {
                            const tierCounts: Record<number, number> = {};
                            sortedTiers.forEach((tier) => {
                              tierCounts[tier] = Object.entries(
                                formation.debugInfo![section],
                              )
                                .filter(
                                  ([k]) =>
                                    k === `${type}_T${tier}` ||
                                    (k.startsWith(type) &&
                                      k.endsWith(`_T${tier}`)),
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
                                className="border-b border-white/5"
                              >
                                <td className="py-2 px-2 text-gray-200 font-medium capitalize">
                                  {type}
                                </td>
                                {sortedTiers.map((tier) => (
                                  <td
                                    key={tier}
                                    className="text-right py-2 px-2 text-gray-300"
                                  >
                                    {formatNumber(tierCounts[tier])}
                                  </td>
                                ))}
                                <td className="text-right py-2 px-2 text-white font-semibold">
                                  {formatNumber(total)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
