"use client";

import { Card } from "@/app/_shared/components/Card";
import type { CalculationResult, MarchFormation } from "@/app/_shared/types";

interface ResultsDisplayProps {
  result: CalculationResult;
}

// ─── helpers ────────────────────────────────────────────────────────────────

const TROOP_TYPES = ["infantry", "cavalry", "archer"] as const;

const TROOP_META = {
  infantry: { icon: "⚔️", label: "Inf", color: "blue" as const },
  cavalry: { icon: "🐴", label: "Cav", color: "green" as const },
  archer: { icon: "🏹", label: "Arc", color: "orange" as const },
} as const;

const COLOR = {
  blue: {
    bg: "bg-blue-500/10",
    border: "border-blue-500/25",
    text: "text-blue-400",
    bar: "bg-blue-500",
  },
  green: {
    bg: "bg-green-500/10",
    border: "border-green-500/25",
    text: "text-green-400",
    bar: "bg-green-500",
  },
  orange: {
    bg: "bg-orange-500/10",
    border: "border-orange-500/25",
    text: "text-orange-400",
    bar: "bg-orange-500",
  },
} as const;

/** 1 234 567  →  1.23M  |  987 654  →  987.6K  |  < 1 000  →  raw */
function fmtDmg(n: number): string {
  const v = Math.floor(n);
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toLocaleString();
}

function fmtNum(n: number): string {
  return Math.floor(n).toLocaleString();
}

// ─── sub-components ─────────────────────────────────────────────────────────

/** Formation ratio bar: coloured segments proportional to each troop type */
function FormationBar({
  infantry,
  cavalry,
  archer,
}: {
  infantry: number;
  cavalry: number;
  archer: number;
}) {
  const total = infantry + cavalry + archer;
  if (total === 0) return null;
  const pct = (n: number) => ((n / total) * 100).toFixed(1);
  return (
    <div className="w-full h-2 rounded-full overflow-hidden flex gap-px">
      {infantry > 0 && (
        <div
          className="bg-blue-500 h-full rounded-l-full"
          style={{ width: `${pct(infantry)}%` }}
        />
      )}
      {cavalry > 0 && (
        <div
          className="bg-green-500 h-full"
          style={{ width: `${pct(cavalry)}%` }}
        />
      )}
      {archer > 0 && (
        <div
          className="bg-orange-500 h-full rounded-r-full"
          style={{ width: `${pct(archer)}%` }}
        />
      )}
    </div>
  );
}

/** One troop-type column: icon + label, big count, tier breakdown */
function TroopColumn({
  type,
  count,
  tiers,
}: {
  type: (typeof TROOP_TYPES)[number];
  count: number;
  tiers?: Record<string, number>;
}) {
  const { icon, label, color } = TROOP_META[type];
  const { bg, border, text } = COLOR[color];
  const sortedTiers = tiers
    ? Object.entries(tiers).sort(([a], [b]) => parseInt(b) - parseInt(a))
    : [];

  return (
    <div
      className={`${bg} border ${border} rounded-lg p-3 flex flex-col gap-1`}
    >
      {/* Header */}
      <div className="flex items-center gap-1.5">
        <span className="text-sm leading-none">{icon}</span>
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          {label}
        </span>
      </div>
      {/* Total count */}
      <p className={`text-lg font-bold ${text} tabular-nums`}>
        {fmtNum(count)}
      </p>
      {/* Tier breakdown */}
      {sortedTiers.length > 0 && (
        <div className="mt-1 space-y-0.5 border-t border-white/10 pt-1">
          {sortedTiers.map(([tier, cnt]) => (
            <div key={tier} className="flex justify-between text-[11px]">
              <span className="text-gray-500">T{tier}</span>
              <span className="text-gray-300 tabular-nums font-medium">
                {fmtNum(cnt)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Damage by type row — compact 3-cell strip */
function DamageByTypeRow({
  damageByType,
}: {
  damageByType: Record<string, number>;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {TROOP_TYPES.map((type) => {
        const { icon, label, color } = TROOP_META[type];
        const { text } = COLOR[color];
        return (
          <div key={type} className="text-center">
            <p className="text-[10px] text-gray-500 mb-0.5">
              {icon} {label}
            </p>
            <p className={`text-xs font-bold tabular-nums ${text}`}>
              {fmtDmg(damageByType[type] ?? 0)}
            </p>
          </div>
        );
      })}
    </div>
  );
}

/** A single march card — used for both own rally and joiners */
function MarchCard({
  march,
  label,
  showDamage = true,
}: {
  march: MarchFormation;
  label: string;
  showDamage?: boolean;
}) {
  const total = march.totalTroops;
  const pctOf = (n: number) =>
    total > 0 ? `${((n / total) * 100).toFixed(0)}%` : "—";

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 hover:border-white/20 transition-colors flex flex-col gap-3">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-gray-200">{label}</span>
        <span className="text-xs text-gray-500 tabular-nums">
          {fmtNum(total)} troops
        </span>
      </div>

      {/* Formation bar */}
      <FormationBar
        infantry={march.infantry}
        cavalry={march.cavalry}
        archer={march.archer}
      />

      {/* Ratio pills */}
      <div className="flex gap-2 text-[11px]">
        {TROOP_TYPES.map((type) => {
          const { icon, color } = TROOP_META[type];
          const { text } = COLOR[color];
          return (
            <span key={type} className={`${text} font-semibold tabular-nums`}>
              {icon} {pctOf(march[type])}
            </span>
          );
        })}
      </div>

      {/* Three-column troop breakdown */}
      <div className="grid grid-cols-3 gap-2">
        {TROOP_TYPES.map((type) => (
          <TroopColumn
            key={type}
            type={type}
            count={march[type]}
            tiers={
              march[`${type}Tiers` as keyof MarchFormation] as
                | Record<string, number>
                | undefined
            }
          />
        ))}
      </div>

      {/* Damage footer */}
      {showDamage && (
        <div className="border-t border-white/10 pt-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Est. Damage</span>
            <span className="text-base font-bold text-kingshot-gold-400 tabular-nums">
              {fmtDmg(march.estimatedDamage)}
            </span>
          </div>
          {march.damageByType && (
            <DamageByTypeRow damageByType={march.damageByType} />
          )}
        </div>
      )}
    </div>
  );
}

// ─── sidebar sub-components ─────────────────────────────────────────────────

function FormationRatiosCard({
  formation,
}: {
  formation: CalculationResult["formation"];
}) {
  if (!formation.debugInfo) return null;
  return (
    <Card title="Formation Ratios">
      <div className="space-y-2">
        {formation.debugInfo.ownRallyRatio && (
          <div className="bg-white/5 rounded-lg p-3">
            <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">
              Own Rally
            </p>
            <p className="text-sm font-semibold text-white font-mono">
              {formation.debugInfo.ownRallyRatio}
            </p>
          </div>
        )}
        {formation.debugInfo.joinerRatio && (
          <div className="bg-white/5 rounded-lg p-3">
            <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">
              Joiner Marches
            </p>
            <p className="text-sm font-semibold text-white font-mono">
              {formation.debugInfo.joinerRatio}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}

function RallyDamageSummaryCard({
  formation,
  config,
}: Pick<CalculationResult, "formation" | "config">) {
  return (
    <Card title="Rally Damage Summary">
      <div className="space-y-2">
        {config.playerType !== "joiner" && (
          <div className="bg-blue-500/5 border border-blue-500/15 rounded-lg px-3 py-2.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-gray-400">Own Rally</p>
                <p className="text-[10px] text-gray-600 mt-0.5">
                  {fmtDmg(formation.ownRally.estimatedDamage)} ×{" "}
                  {config.ownRallyCount}
                </p>
              </div>
              <p className="text-lg font-bold text-blue-400 tabular-nums">
                {fmtDmg(formation.ownRallyDamage ?? 0)}
              </p>
            </div>
          </div>
        )}
        <div className="bg-green-500/5 border border-green-500/15 rounded-lg px-3 py-2.5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs text-gray-400">Joined Rallies</p>
              <p className="text-[10px] text-gray-600 mt-0.5">
                avg × ⅔ × {config.joinedRallyCount}
              </p>
            </div>
            <p className="text-lg font-bold text-green-400 tabular-nums">
              {fmtDmg(formation.joinedRallyDamage ?? 0)}
            </p>
          </div>
        </div>
        {config.playerType !== "joiner" && (
          <div className="bg-kingshot-gold-500/5 border border-kingshot-gold-500/20 rounded-lg px-3 py-3 mt-1">
            <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">
              Total Event Damage
            </p>
            <p className="text-2xl font-bold text-kingshot-gold-400 tabular-nums">
              {fmtDmg(
                (formation.ownRallyDamage ?? 0) +
                  (formation.joinedRallyDamage ?? 0),
              )}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}

// ─── main component ──────────────────────────────────────────────────────────

export default function ResultsDisplay({ result }: ResultsDisplayProps) {
  const { formation, config } = result;

  const allocationSection = formation.debugInfo && (
    <Card title="Troop Allocation Details">
      <div className="space-y-6">
        {(["usedTroops", "unusedTroops"] as const).map((section) => {
          const debugData = formation.debugInfo![section];
          const allKeys = Object.keys(debugData);
          if (allKeys.length === 0) return null;
          const tierSet = new Set<number>();
          allKeys.forEach((k) => {
            const m = k.match(/_T(\d+)$/);
            if (m) tierSet.add(parseInt(m[1]));
          });
          const sortedTiers = Array.from(tierSet).sort((a, b) => b - a);
          const isUsed = section === "usedTroops";
          return (
            <div key={section}>
              <h3
                className={`text-xs font-semibold uppercase tracking-wide mb-2 ${isUsed ? "text-green-400" : "text-gray-500"}`}
              >
                {isUsed ? "✓ Used Troops" : "◌ Unused Troops"}
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-1.5 pr-3 text-gray-500 font-medium">
                        Type
                      </th>
                      {sortedTiers.map((tier) => (
                        <th
                          key={tier}
                          className="text-right py-1.5 px-2 text-gray-500 font-medium"
                        >
                          T{tier}
                        </th>
                      ))}
                      <th className="text-right py-1.5 pl-3 text-gray-500 font-medium">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {TROOP_TYPES.map((type) => {
                      const { icon, color } = TROOP_META[type];
                      const { text } = COLOR[color];
                      const tierCounts: Record<number, number> = {};
                      sortedTiers.forEach((tier) => {
                        tierCounts[tier] = Object.entries(debugData)
                          .filter(([k]) => k === `${type}_T${tier}`)
                          .reduce((s, [, v]) => s + v, 0);
                      });
                      const total = Object.values(tierCounts).reduce(
                        (a, b) => a + b,
                        0,
                      );
                      if (total === 0) return null;
                      return (
                        <tr key={type} className="border-b border-white/5">
                          <td
                            className={`py-1.5 pr-3 font-semibold capitalize ${text}`}
                          >
                            {icon} {type}
                          </td>
                          {sortedTiers.map((tier) => (
                            <td
                              key={tier}
                              className="text-right py-1.5 px-2 text-gray-300 tabular-nums"
                            >
                              {tierCounts[tier] > 0
                                ? fmtNum(tierCounts[tier])
                                : "—"}
                            </td>
                          ))}
                          <td className="text-right py-1.5 pl-3 text-white font-bold tabular-nums">
                            {fmtNum(total)}
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
  );

  return (
    // Desktop: 2/3 main + 1/3 sidebar. Mobile: single column.
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      {/* ── Main column (2/3) ── */}
      <div className="w-full lg:flex-2 space-y-6 min-w-0">
        {/* Configuration Summary */}
        <Card title="Configuration">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            {[
              { label: "Player Type", value: config.playerType, cap: true },
              {
                label: "March Capacity",
                value: fmtNum(config.marchCapacity),
                cap: false,
              },
              {
                label: "Joiner Limit",
                value: fmtNum(config.joinerLimit),
                cap: false,
              },
              {
                label: "Trap Level",
                value: `Lv ${config.trapEnhancementLevel}`,
                cap: false,
              },
            ].map(({ label, value, cap }) => (
              <div key={label}>
                <p className="text-xs text-gray-500 uppercase tracking-wide">
                  {label}
                </p>
                <p
                  className={`text-base font-semibold text-white mt-0.5 ${cap ? "capitalize" : ""}`}
                >
                  {value}
                </p>
              </div>
            ))}
          </div>
        </Card>

        {/* Own Rally Formation */}
        {config.playerType !== "joiner" && (
          <Card title="Your Rally Formation">
            <MarchCard
              march={formation.ownRally}
              label="Own Rally"
              showDamage
            />
          </Card>
        )}

        {/* Joiner Marches */}
        {formation.joiners.length > 0 && (
          <Card title="Joiner Marches">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {formation.joiners.map((march) => (
                <MarchCard
                  key={march.marchIndex}
                  march={march}
                  label={`March #${march.marchIndex}`}
                  showDamage
                />
              ))}
            </div>
          </Card>
        )}

        {/* Troop Allocation — full width, below marches */}
        {allocationSection}
      </div>

      {/* ── Sidebar (1/3) ── */}
      <div className="w-full lg:flex-1 space-y-4 lg:sticky lg:top-20 min-w-0">
        <FormationRatiosCard formation={formation} />
        <RallyDamageSummaryCard formation={formation} config={config} />
      </div>
    </div>
  );
}
