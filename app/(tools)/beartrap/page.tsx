"use client";

import { Card } from "@/app/_shared/components/Card";
import { useLocalStorage } from "@/app/_shared/hooks/useLocalStorage";
import type {
  BearTrapConfig,
  BearTrapProfile,
  BearTrapSecondaryStats,
  CalculationResult,
} from "@/app/_shared/types";
import { useCallback, useEffect, useRef, useState } from "react";
import BattleStatsInput from "./_components/BattleStatsInput";
import CustomRatioSliders from "./_components/CustomRatioSliders";
import ProfileManager, { MAX_PROFILES } from "./_components/ProfileManager";
import RallySettings from "./_components/RallySettings";
import ResultsDisplay from "./_components/ResultsDisplay";
import TroopsInput from "./_components/TroopsInput";
import { calculateBearTrapFormation } from "./_lib/calculations";

const defaultSecondaryStats: BearTrapSecondaryStats = {
  infantry: { attack: 438.7, defense: 450.7, lethality: 287.3, health: 330 },
  archer: { attack: 376.5, defense: 392.5, lethality: 303.5, health: 252.8 },
  cavalry: { attack: 374.4, defense: 388.4, lethality: 276.9, health: 240.2 },
};

const DEFAULT_CONFIG: BearTrapConfig = {
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
  customRatio: {
    ownRally: { infantry: 5, cavalry: 30, archer: 65 },
    joiner: { infantry: 5, cavalry: 30, archer: 65 },
  },
};

function makeProfile(
  name: string,
  config: BearTrapConfig,
  secondaryStats: BearTrapSecondaryStats,
): BearTrapProfile {
  return {
    id: crypto.randomUUID(),
    name,
    config,
    secondaryStats,
    savedAt: Date.now(),
  };
}

export default function BearTrapPage() {
  // ── Profiles ────────────────────────────────────────────────────────────
  const [profiles, setProfiles] = useLocalStorage<BearTrapProfile[]>(
    "beartrap:profiles",
    [],
  );
  const [activeProfileId, setActiveProfileId] = useLocalStorage<string | null>(
    "beartrap:activeProfileId",
    null,
  );

  // ── Draft (auto-persisted so unsaved changes survive a page refresh) ────
  // Stores the in-progress edits together with the profile they belong to.
  // Cleared on Save or when switching away to another profile.
  const [draft, setDraft] = useLocalStorage<{
    profileId: string;
    config: BearTrapConfig;
    secondaryStats: BearTrapSecondaryStats;
  } | null>("beartrap:draft", null);

  const [config, setConfigRaw] = useState<BearTrapConfig>(DEFAULT_CONFIG);
  const [secondaryStats, setSecondaryStatsRaw] =
    useState<BearTrapSecondaryStats>(defaultSecondaryStats);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Wrapped setters that also write to the draft immediately
  const setConfig = useCallback(
    (value: BearTrapConfig | ((prev: BearTrapConfig) => BearTrapConfig)) => {
      setConfigRaw((prev) => {
        const next = typeof value === "function" ? value(prev) : value;
        setDraft((d) => ({
          profileId: d?.profileId ?? activeProfileId ?? "",
          config: next,
          secondaryStats: d?.secondaryStats ?? defaultSecondaryStats,
        }));
        setHasUnsavedChanges(true);
        return next;
      });
    },
    [activeProfileId, setDraft],
  );

  const setSecondaryStats = useCallback(
    (
      value:
        | BearTrapSecondaryStats
        | ((prev: BearTrapSecondaryStats) => BearTrapSecondaryStats),
    ) => {
      setSecondaryStatsRaw((prev) => {
        const next = typeof value === "function" ? value(prev) : value;
        setDraft((d) => ({
          profileId: d?.profileId ?? activeProfileId ?? "",
          config: d?.config ?? DEFAULT_CONFIG,
          secondaryStats: next,
        }));
        setHasUnsavedChanges(true);
        return next;
      });
    },
    [activeProfileId, setDraft],
  );

  // ── Hydrate from active profile (or draft) on mount ─────────────────────
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;

    if (profiles.length === 0) {
      // First launch — create a default profile and treat it as active
      const first = makeProfile(
        "Profile 1",
        DEFAULT_CONFIG,
        defaultSecondaryStats,
      );
      setProfiles([first]);
      setActiveProfileId(first.id);
      setConfigRaw(first.config);
      setSecondaryStatsRaw(first.secondaryStats);
      return;
    }

    const active =
      profiles.find((p) => p.id === activeProfileId) ?? profiles[0];
    setActiveProfileId(active.id);

    // Restore draft if it belongs to the active profile
    if (draft && draft.profileId === active.id) {
      setConfigRaw(draft.config);
      setSecondaryStatsRaw(draft.secondaryStats);
      setHasUnsavedChanges(true);
    } else {
      setConfigRaw(active.config);
      setSecondaryStatsRaw(active.secondaryStats);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Profile actions ──────────────────────────────────────────────────────
  const handleSave = useCallback(() => {
    setProfiles((prev) =>
      prev.map((p) =>
        p.id === activeProfileId
          ? { ...p, config, secondaryStats, savedAt: Date.now() }
          : p,
      ),
    );
    setDraft(null);
    setHasUnsavedChanges(false);
  }, [activeProfileId, config, secondaryStats, setDraft, setProfiles]);

  const handleSwitch = useCallback(
    (id: string) => {
      if (id === activeProfileId) return;
      const target = profiles.find((p) => p.id === id);
      if (!target) return;
      setActiveProfileId(id);
      setConfigRaw(target.config);
      setSecondaryStatsRaw(target.secondaryStats);
      setDraft(null);
      setHasUnsavedChanges(false);
    },
    [activeProfileId, profiles, setActiveProfileId, setDraft],
  );

  const handleNew = useCallback(() => {
    if (profiles.length >= MAX_PROFILES) return;
    const name = `Profile ${profiles.length + 1}`;
    const fresh = makeProfile(name, DEFAULT_CONFIG, defaultSecondaryStats);
    setProfiles((prev) => [...prev, fresh]);
    setActiveProfileId(fresh.id);
    setConfigRaw(fresh.config);
    setSecondaryStatsRaw(fresh.secondaryStats);
    setDraft(null);
    setHasUnsavedChanges(false);
  }, [profiles, setProfiles, setActiveProfileId, setDraft]);

  const handleRename = useCallback(
    (id: string, name: string) => {
      setProfiles((prev) =>
        prev.map((p) => (p.id === id ? { ...p, name } : p)),
      );
    },
    [setProfiles],
  );

  const handleDuplicate = useCallback(
    (id: string) => {
      if (profiles.length >= MAX_PROFILES) return;
      const source = profiles.find((p) => p.id === id);
      if (!source) return;
      // If duplicating the active profile, use the current working state
      // so unsaved edits are carried over into the copy.
      const srcConfig = id === activeProfileId ? config : source.config;
      const srcStats =
        id === activeProfileId ? secondaryStats : source.secondaryStats;
      const copy = makeProfile(`${source.name} (copy)`, srcConfig, srcStats);
      setProfiles((prev) => [...prev, copy]);
      // Switch to the new copy and load it as working state
      setActiveProfileId(copy.id);
      setConfigRaw(copy.config);
      setSecondaryStatsRaw(copy.secondaryStats);
      setDraft(null);
      setHasUnsavedChanges(false);
    },
    [
      activeProfileId,
      config,
      profiles,
      secondaryStats,
      setActiveProfileId,
      setDraft,
      setProfiles,
    ],
  );

  const handleDelete = useCallback(
    (id: string) => {
      const remaining = profiles.filter((p) => p.id !== id);
      if (remaining.length === 0) {
        // Should not happen (delete disabled at 1 profile), but guard anyway
        const fresh = makeProfile(
          "Profile 1",
          DEFAULT_CONFIG,
          defaultSecondaryStats,
        );
        setProfiles([fresh]);
        setActiveProfileId(fresh.id);
        setConfigRaw(fresh.config);
        setSecondaryStatsRaw(fresh.secondaryStats);
        setDraft(null);
        return;
      }
      setProfiles(remaining);
      if (id === activeProfileId) {
        const next = remaining[0];
        setActiveProfileId(next.id);
        setConfigRaw(next.config);
        setSecondaryStatsRaw(next.secondaryStats);
        setDraft(null);
        setHasUnsavedChanges(false);
      }
    },
    [activeProfileId, profiles, setActiveProfileId, setDraft, setProfiles],
  );

  // ── Calculation ──────────────────────────────────────────────────────────
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const handleCalculate = () => {
    if (config.inventory.items.length === 0) {
      alert("Please add at least one troop to your inventory");
      return;
    }
    setIsCalculating(true);
    // Defer to next tick so the loading state renders before the CPU-bound work
    setTimeout(() => {
      try {
        const formation = calculateBearTrapFormation(config, secondaryStats);
        setResult({
          config,
          secondaryStats,
          formation,
          recommendations: [],
        });
      } finally {
        setIsCalculating(false);
      }
    }, 0);
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

        {/* Profile Manager */}
        <ProfileManager
          profiles={profiles}
          activeProfileId={activeProfileId}
          hasUnsavedChanges={hasUnsavedChanges}
          onSwitch={handleSwitch}
          onSave={handleSave}
          onNew={handleNew}
          onDuplicate={handleDuplicate}
          onRename={handleRename}
          onDelete={handleDelete}
        />

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
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex-1 space-y-2">
              <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide">
                Player Type
              </label>
              {/* Segmented picker */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {(
                  [
                    {
                      value: "strong",
                      label: "Strong",
                      sub: "Own rally first",
                    },
                    { value: "average", label: "Average", sub: "Balanced" },
                    { value: "joiner", label: "Joiner", sub: "Join only" },
                    { value: "custom", label: "Custom", sub: "Set own ratio" },
                  ] as const
                ).map(({ value, label, sub }) => {
                  const active = config.playerType === value;
                  return (
                    <button
                      key={value}
                      onClick={() =>
                        setConfig({ ...config, playerType: value })
                      }
                      className={`rounded-lg border px-2 py-2 text-center transition-all ${
                        active
                          ? value === "custom"
                            ? "border-purple-500 bg-purple-500/10 text-purple-400"
                            : "border-kingshot-gold-500 bg-kingshot-gold-500/10 text-kingshot-gold-400"
                          : "border-white/10 bg-white/5 text-gray-400 hover:border-white/20 hover:text-gray-300"
                      }`}
                    >
                      <p className="text-xs font-semibold">{label}</p>
                      <p className="text-[10px] opacity-70 mt-0.5">{sub}</p>
                    </button>
                  );
                })}
              </div>

              {/* Contextual disclaimer */}
              {config.playerType === "strong" && (
                <div className="mt-2 rounded-lg border border-kingshot-gold-500/20 bg-kingshot-gold-500/5 px-3 py-2 space-y-1">
                  <p className="text-[11px] font-semibold text-kingshot-gold-400">
                    🏆 Strong — You lead the rally
                  </p>
                  <p className="text-[10px] text-gray-500 leading-relaxed">
                    Best if you consistently{" "}
                    <span className="text-gray-400">
                      open and fill your own rallies
                    </span>
                    . Your own march is optimised first with your highest-tier
                    troops; remaining troops are distributed to joiner marches.
                    Choose this when your march capacity is large (e.g. 125k+)
                    and your alliance reliably fills your rallies.
                  </p>
                </div>
              )}
              {config.playerType === "average" && (
                <div className="mt-2 rounded-lg border border-blue-500/20 bg-blue-500/5 px-3 py-2 space-y-1">
                  <p className="text-[11px] font-semibold text-blue-400">
                    ⚖️ Average — Lead & join
                  </p>
                  <p className="text-[10px] text-gray-500 leading-relaxed">
                    Best for <span className="text-gray-400">most players</span>{" "}
                    — you open rallies but also join others. Troops are spread
                    evenly across all marches (own rally + joiners) using a
                    globally optimal ratio. Joiner marches are treated as
                    equally important as your own rally.
                  </p>
                </div>
              )}
              {config.playerType === "joiner" && (
                <div className="mt-2 rounded-lg border border-orange-500/20 bg-orange-500/5 px-3 py-2 space-y-1">
                  <p className="text-[11px] font-semibold text-orange-400">
                    🔗 Joiner — Join only, no own rally
                  </p>
                  <p className="text-[10px] text-gray-500 leading-relaxed">
                    All march slots are optimised purely for{" "}
                    <span className="text-gray-400">
                      joining other players' rallies
                    </span>
                    . No own rally is calculated.
                  </p>
                  <p className="text-[10px] text-orange-400/70 leading-relaxed border-t border-orange-500/15 pt-1.5 mt-1">
                    ⚠️ <span className="font-medium">Alliance policy:</span>{" "}
                    Many alliances require members to open rallies, not just
                    join. Check with your R4/R5 before using joiner-only mode —
                    it may violate participation rules.
                  </p>
                </div>
              )}
              {config.playerType === "custom" && (
                <div className="mt-2 rounded-lg border border-purple-500/20 bg-purple-500/5 px-3 py-2 space-y-1">
                  <p className="text-[11px] font-semibold text-purple-400">
                    🎛️ Custom — Set your own troop ratio
                  </p>
                  <p className="text-[10px] text-gray-500 leading-relaxed">
                    Define the exact{" "}
                    <span className="text-gray-400">
                      infantry / cavalry / archer mix
                    </span>{" "}
                    for your own rally and joiner marches. The calculator fills
                    as close to your target as your supply allows, then cascades
                    any leftover capacity to available types.
                  </p>
                  <CustomRatioSliders
                    ownRally={
                      config.customRatio?.ownRally ?? {
                        infantry: 5,
                        cavalry: 30,
                        archer: 65,
                      }
                    }
                    joiner={
                      config.customRatio?.joiner ?? {
                        infantry: 5,
                        cavalry: 30,
                        archer: 65,
                      }
                    }
                    onOwnRallyChange={(v) =>
                      setConfig({
                        ...config,
                        customRatio: {
                          ownRally: v,
                          joiner: config.customRatio?.joiner ?? {
                            infantry: 5,
                            cavalry: 30,
                            archer: 65,
                          },
                        },
                      })
                    }
                    onJoinerChange={(v) =>
                      setConfig({
                        ...config,
                        customRatio: {
                          ownRally: config.customRatio?.ownRally ?? {
                            infantry: 5,
                            cavalry: 30,
                            archer: 65,
                          },
                          joiner: v,
                        },
                      })
                    }
                  />
                </div>
              )}
            </div>

            <button
              onClick={handleCalculate}
              disabled={isCalculating}
              className="sm:w-48 rounded-xl bg-linear-to-r from-kingshot-gold-500 to-kingshot-gold-600 hover:from-kingshot-gold-600 hover:to-kingshot-gold-700 px-6 py-4 text-white font-bold shadow-lg shadow-kingshot-gold-500/30 hover:shadow-kingshot-gold-500/50 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100 disabled:shadow-none flex items-center justify-center gap-2"
            >
              {isCalculating ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Calculating…
                </>
              ) : (
                "Calculate Formation"
              )}
            </button>
          </div>
        </div>

        {/* Results - full width below inputs */}
        <div>
          {result ? (
            <ResultsDisplay
              result={result}
              onConfigChange={setConfig}
              onRecalculate={handleCalculate}
            />
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
