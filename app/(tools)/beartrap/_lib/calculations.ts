/**
 * Bear Trap Formation Calculation Logic
 * Rally Optimization Formula:
 * D = 1/3 × A_inf × √f_inf + A_cav × √f_cav + 4/3 × A_arc × √f_arc × 1.1
 */

import { TROOPS } from "@/app/_shared/data/troops";
import type {
  BearTrapConfig,
  BearTrapSecondaryStats,
  MarchFormation,
  RallyFormation,
  TroopInventoryItem,
} from "@/app/_shared/types";

/**
 * Default battle stats used for joiner march damage estimation.
 * Joiners are random players — we use a conservative average baseline
 * rather than the rally leader's own stats.
 */
const DEFAULT_JOINER_STATS: BearTrapSecondaryStats = {
  infantry: { attack: 438.7, defense: 450.7, lethality: 287.3, health: 330 },
  cavalry: { attack: 374.4, defense: 388.4, lethality: 276.9, health: 240.2 },
  archer: { attack: 376.5, defense: 392.5, lethality: 303.5, health: 252.8 },
};

/**
 * Build the step-by-step ratio explanation for the UI.
 *
 * Steps:
 *  1. Tier-k: weighted true_attack per type from inventory
 *  2. Archer extra multipliers (ranged-strike, T7+, TG3)
 *  3. Attack factor A = (1 + atk%) × (1 + leth%) from player stats
 *  4. Final k = tierK × mults × A  →  k²-ideal ratio
 *  5. Supply / capacity constraint flags
 */
function buildRatioExplanation(
  infantryTierGroups: { tier: number; count: number; isTG?: boolean }[],
  cavalryTierGroups: { tier: number; count: number; isTG?: boolean }[],
  archerTierGroups: { tier: number; count: number; isTG?: boolean }[],
  infantryFactor: number,
  cavalryFactor: number,
  archerFactor: number,
  infantryTgLevel: number,
  cavalryTgLevel: number,
  archerTgLevel: number,
  availInfantry: number,
  availCavalry: number,
  availArcher: number,
  actualInfantry: number,
  actualCavalry: number,
  actualArcher: number,
  capacity: number,
  gridStep: number | null,
): NonNullable<
  NonNullable<
    import("@/app/_shared/types").RallyFormation["debugInfo"]
  >["ratioExplanation"]
> {
  // Step 1 — tier-only k using the SAME tgLevel as the formation calculation
  const taInf = computeWeightedTrueAttack(
    infantryTierGroups,
    "infantry",
    infantryTgLevel,
  );
  const taCav = computeWeightedTrueAttack(
    cavalryTierGroups,
    "cavalry",
    cavalryTgLevel,
  );
  const taArc = computeWeightedTrueAttack(
    archerTierGroups,
    "archer",
    archerTgLevel,
  );

  // Step 2 — archer extra multipliers
  const totalArcCount = archerTierGroups.reduce((s, g) => s + g.count, 0);
  const weightedArcTier =
    totalArcCount > 0
      ? archerTierGroups.reduce((s, g) => s + g.tier * g.count, 0) /
        totalArcCount
      : 0;
  const t7Plus = weightedArcTier >= 7;
  const tg3T10 = weightedArcTier >= 10 && archerTgLevel >= 3;
  let arcMult = 1.1;
  if (t7Plus) arcMult *= 1.1;
  if (tg3T10) arcMult *= 1.1;

  // Step 3 — attack factors already passed in

  // Step 4 — final k and ideal ratio
  const kInf = taInf * infantryFactor;
  const kCav = taCav * cavalryFactor;
  const kArc = taArc * arcMult * archerFactor;
  const kInf2 = kInf * kInf;
  const kCav2 = kCav * kCav;
  const kArc2 = kArc * kArc;
  const kTotal2 = kInf2 + kCav2 + kArc2;

  const idealRatio =
    kTotal2 > 0
      ? {
          infantry: Math.round((kInf2 / kTotal2) * 100),
          cavalry: Math.round((kCav2 / kTotal2) * 100),
          archer: Math.round((kArc2 / kTotal2) * 100),
        }
      : { infantry: 33, cavalry: 34, archer: 33 };

  // Normalise so they sum to exactly 100
  const ratioSum = idealRatio.infantry + idealRatio.cavalry + idealRatio.archer;
  if (ratioSum !== 100) idealRatio.archer += 100 - ratioSum;

  // Used ratio — derived from actual counts passed in
  const actualTotal = actualInfantry + actualCavalry + actualArcher;
  const usedRatio =
    actualTotal > 0
      ? {
          infantry: Math.round((actualInfantry / actualTotal) * 100),
          cavalry: Math.round((actualCavalry / actualTotal) * 100),
          archer: Math.round((actualArcher / actualTotal) * 100),
        }
      : { infantry: 0, cavalry: 0, archer: 100 };
  const usedRatioSum =
    usedRatio.infantry + usedRatio.cavalry + usedRatio.archer;
  if (usedRatioSum !== 100) usedRatio.archer += 100 - usedRatioSum;

  // Step 5 — constraint flags
  // Only flag supply-constrained if the shortfall is large enough to shift
  // the rounded percentage by at least 1 point (avoids spurious warnings from
  // pure floating-point / rounding noise on near-exact matches).
  const minShortfall = Math.max(1, Math.round(capacity * 0.005)); // ~0.5% of capacity
  const idealInf = (kInf2 / (kTotal2 || 1)) * capacity;
  const idealCav = (kCav2 / (kTotal2 || 1)) * capacity;
  const idealArc = (kArc2 / (kTotal2 || 1)) * capacity;
  const supplyConstrained = {
    infantry: idealInf - availInfantry >= minShortfall,
    cavalry: idealCav - availCavalry >= minShortfall,
    archer: idealArc - availArcher >= minShortfall,
  };
  const capacityConstrained =
    actualInfantry + actualCavalry + actualArcher < capacity - 9; // allow 1 rounding slot

  return {
    tierK: { infantry: taInf, cavalry: taCav, archer: taArc },
    archerMults: { rangedStrike: 1.1, t7Plus, tg3T10 },
    attackFactor: {
      infantry: infantryFactor,
      cavalry: cavalryFactor,
      archer: archerFactor,
    },
    finalK: { infantry: kInf, cavalry: kCav, archer: kArc },
    idealRatio,
    usedRatio,
    supplyConstrained,
    capacityConstrained,
    gridStep,
  };
}

/**
 * Build used/unused troops map for debugging
 * Tracks troops by tier based on actual tier allocation
 */
function buildTroopsDebugInfo(
  items: TroopInventoryItem[],
  infantryTierBreakdown: Record<number, number>,
  cavalryTierBreakdown: Record<number, number>,
  archerTierBreakdown: Record<number, number>,
): {
  usedTroops: Record<string, number>;
  unusedTroops: Record<string, number>;
} {
  const usedTroops: Record<string, number> = {};
  const unusedTroops: Record<string, number> = {};

  // First, group inventory by type+tier (handles any legacy duplicates in stored data)
  const grouped: Record<string, { type: string; tier: number; count: number }> =
    {};
  items.forEach((item) => {
    const key = `${item.type}_T${item.tier}`;
    if (grouped[key]) {
      grouped[key].count += item.count;
    } else {
      grouped[key] = { type: item.type, tier: item.tier, count: item.count };
    }
  });

  Object.entries(grouped).forEach(([tierLabel, { type, tier, count }]) => {
    let used = 0;
    if (type === "infantry") used = infantryTierBreakdown[tier] ?? 0;
    else if (type === "cavalry") used = cavalryTierBreakdown[tier] ?? 0;
    else if (type === "archer") used = archerTierBreakdown[tier] ?? 0;

    const unused = Math.max(0, count - used);
    if (used > 0) usedTroops[tierLabel] = used;
    if (unused > 0) unusedTroops[tierLabel] = unused;
  });

  return { usedTroops, unusedTroops };
}

/**
 * Get attack factor for a troop type
 * A = (1 + attack_bonus) × (1 + lethality_bonus)
 */
/**
 * Calculate trap enhancement bonus based on level
 * Level 1: 5%, Level 2: 10%, Level 3: 15%, Level 4: 20%, Level 5: 25%
 */
function getTrapEnhancementBonus(level: number): number {
  return Math.min(level * 5, 25); // 5% per level, capped at 25%
}

export function calculateAttackFactor(
  stats: {
    attack: number;
    lethality: number;
  },
  trapEnhancementLevel?: number,
): number {
  const trapBonus = trapEnhancementLevel
    ? getTrapEnhancementBonus(trapEnhancementLevel)
    : 0;
  const totalAttackBonus = stats.attack + trapBonus;
  const attackBonus = totalAttackBonus > 0 ? totalAttackBonus / 100 : 0;
  const lethalityBonus = stats.lethality > 0 ? stats.lethality / 100 : 0;
  return (1 + attackBonus) * (1 + lethalityBonus);
}

/**
 * Calculate effective attack factor including true_attack
 * Used to combine base troop attack value with player bonuses
 */
function calculateEffectiveAttackFactor(
  items: TroopInventoryItem[],
  type: "infantry" | "archer" | "cavalry",
  stats: { attack: number; lethality: number },
  trapEnhancementLevel?: number,
): number {
  // Attack factor is just the player's bonuses + trap enhancement
  // True attack per tier is applied separately in the damage formula
  return calculateAttackFactor(stats, trapEnhancementLevel);
}

/**
 * Calculate rally damage using optimization formula
 * D = 1/3 × A_inf × √f_inf + A_cav × √f_cav + 4/3 × A_arc × √f_arc × 1.1
 */
export function calculateRallyDamage(
  infantryCount: number,
  cavalryCount: number,
  archerCount: number,
  infantryFactor: number,
  cavalryFactor: number,
  archerFactor: number,
  infantryTiers?: Record<number, number>,
  cavalryTiers?: Record<number, number>,
  archerTiers?: Record<number, number>,
  troops?: TroopInventoryItem[],
  infantryTrueGoldLevel?: number,
  cavalryTrueGoldLevel?: number,
  archerTrueGoldLevel?: number,
): number {
  // If tier data not provided or all three are empty, use simplified calculation.
  // Do NOT fall back just because one type (e.g. infantry) is absent from the march —
  // the tier-based formula handles zero counts correctly via Math.sqrt(0) = 0.
  const hasTierData =
    troops &&
    infantryTiers &&
    cavalryTiers &&
    archerTiers &&
    (Object.keys(infantryTiers).length > 0 ||
      Object.keys(cavalryTiers).length > 0 ||
      Object.keys(archerTiers).length > 0);
  if (!hasTierData) {
    const infantryDamage =
      (1 / 3) * infantryFactor * Math.sqrt(Math.max(0, infantryCount));
    const cavalryDamage =
      1 * cavalryFactor * Math.sqrt(Math.max(0, cavalryCount));
    const archerDamage =
      (4 / 3) * archerFactor * Math.sqrt(Math.max(0, archerCount)) * 1.1;

    return infantryDamage + cavalryDamage + archerDamage;
  }

  let totalDamage = 0;

  // Build the ID suffix based on true gold level for each troop type
  const infantryTgSuffix =
    infantryTrueGoldLevel && infantryTrueGoldLevel > 0
      ? `_tg${infantryTrueGoldLevel}`
      : "";
  const cavalryTgSuffix =
    cavalryTrueGoldLevel && cavalryTrueGoldLevel > 0
      ? `_tg${cavalryTrueGoldLevel}`
      : "";
  const archerTgSuffix =
    archerTrueGoldLevel && archerTrueGoldLevel > 0
      ? `_tg${archerTrueGoldLevel}`
      : "";

  // Calculate infantry damage by tier
  Object.entries(infantryTiers).forEach(([tierStr, tierCount]) => {
    const tier = parseInt(tierStr);
    const troopData = TROOPS.find(
      (t) =>
        t.type === "infantry" &&
        t.id === `infantry_t${tier}${infantryTgSuffix}`,
    );
    if (troopData && tierCount > 0 && infantryCount > 0) {
      const trueAttack = troopData.true_attack || 1;
      const extraAttackMult = 1; // Infantry base
      const proportion = tierCount / infantryCount;
      const infantryDamageForTier =
        ((trueAttack * extraAttackMult * proportion * 1.2) / 1000) *
        Math.sqrt(5000 * infantryCount) *
        infantryFactor *
        10;
      totalDamage += infantryDamageForTier;
    }
  });

  // Calculate cavalry damage by tier
  Object.entries(cavalryTiers).forEach(([tierStr, tierCount]) => {
    const tier = parseInt(tierStr);
    const troopData = TROOPS.find(
      (t) =>
        t.type === "cavalry" && t.id === `cavalry_t${tier}${cavalryTgSuffix}`,
    );
    if (troopData && tierCount > 0 && cavalryCount > 0) {
      const trueAttack = troopData.true_attack || 1;
      const extraAttackMult = 1; // Cavalry base
      const proportion = tierCount / cavalryCount;
      const cavalryDamageForTier =
        ((trueAttack * extraAttackMult * proportion * 1.2) / 1000) *
        Math.sqrt(5000 * cavalryCount) *
        cavalryFactor *
        10;
      totalDamage += cavalryDamageForTier;
    }
  });

  // Calculate archer damage by tier (with 1.1 multiplier for archers)
  Object.entries(archerTiers).forEach(([tierStr, tierCount]) => {
    const tier = parseInt(tierStr);
    const troopData = TROOPS.find(
      (t) => t.type === "archer" && t.id === `archer_t${tier}${archerTgSuffix}`,
    );
    if (troopData && tierCount > 0 && archerCount > 0) {
      const trueAttack = troopData.true_attack || 1;
      let extraAttackMult = 1.1; // Archer ranged strike
      // Add extra for T7+ archers
      if (tier >= 7) {
        extraAttackMult *= 1.1;
      }
      // Add extra for TG3 T10 archers (only when player actually has TG3)
      if (tier === 10 && archerTrueGoldLevel && archerTrueGoldLevel >= 3) {
        extraAttackMult *= 1.1;
      }
      const proportion = tierCount / archerCount;
      const archerDamageForTier =
        ((trueAttack * extraAttackMult * proportion * 1.2) / 1000) *
        Math.sqrt(5000 * archerCount) *
        archerFactor *
        10;
      totalDamage += archerDamageForTier;
    }
  });

  return Math.ceil(totalDamage);
}

/**
 * Calculate rally damage by troop type
 */
export function calculateRallyDamageByType(
  infantryCount: number,
  cavalryCount: number,
  archerCount: number,
  infantryFactor: number,
  cavalryFactor: number,
  archerFactor: number,
  infantryTiers?: Record<number, number>,
  cavalryTiers?: Record<number, number>,
  archerTiers?: Record<number, number>,
  troops?: TroopInventoryItem[],
  infantryTrueGoldLevel?: number,
  cavalryTrueGoldLevel?: number,
  archerTrueGoldLevel?: number,
): { infantry: number; cavalry: number; archer: number } {
  // If tier data not provided or all three are empty, use simplified calculation.
  // Do NOT fall back just because one type (e.g. infantry) is absent from the march —
  // the tier-based formula handles zero counts correctly via Math.sqrt(0) = 0.
  const hasTierData =
    troops &&
    infantryTiers &&
    cavalryTiers &&
    archerTiers &&
    (Object.keys(infantryTiers).length > 0 ||
      Object.keys(cavalryTiers).length > 0 ||
      Object.keys(archerTiers).length > 0);
  if (!hasTierData) {
    const infantryDamage =
      (1 / 3) * infantryFactor * Math.sqrt(Math.max(0, infantryCount));
    const cavalryDamage =
      1 * cavalryFactor * Math.sqrt(Math.max(0, cavalryCount));
    const archerDamage =
      (4 / 3) * archerFactor * Math.sqrt(Math.max(0, archerCount)) * 1.1;

    return {
      infantry: Math.ceil(infantryDamage),
      cavalry: Math.ceil(cavalryDamage),
      archer: Math.ceil(archerDamage),
    };
  }

  let infantryTotalDamage = 0;
  let cavalryTotalDamage = 0;
  let archerTotalDamage = 0;

  // Build the ID suffix based on true gold level for each troop type
  const infantryTgSuffix =
    infantryTrueGoldLevel && infantryTrueGoldLevel > 0
      ? `_tg${infantryTrueGoldLevel}`
      : "";
  const cavalryTgSuffix =
    cavalryTrueGoldLevel && cavalryTrueGoldLevel > 0
      ? `_tg${cavalryTrueGoldLevel}`
      : "";
  const archerTgSuffix =
    archerTrueGoldLevel && archerTrueGoldLevel > 0
      ? `_tg${archerTrueGoldLevel}`
      : "";

  // Calculate infantry damage by tier
  Object.entries(infantryTiers).forEach(([tierStr, tierCount]) => {
    const tier = parseInt(tierStr);
    const troopData = TROOPS.find(
      (t) =>
        t.type === "infantry" &&
        t.id === `infantry_t${tier}${infantryTgSuffix}`,
    );
    if (troopData && tierCount > 0 && infantryCount > 0) {
      const trueAttack = troopData.true_attack || 1;
      const extraAttackMult = 1; // Infantry base
      const proportion = tierCount / infantryCount;
      const infantryDamageForTier =
        ((trueAttack * extraAttackMult * proportion * 1.2) / 1000) *
        Math.sqrt(5000 * infantryCount) *
        infantryFactor *
        10;
      infantryTotalDamage += infantryDamageForTier;
    }
  });

  // Calculate cavalry damage by tier
  Object.entries(cavalryTiers).forEach(([tierStr, tierCount]) => {
    const tier = parseInt(tierStr);
    const troopData = TROOPS.find(
      (t) =>
        t.type === "cavalry" && t.id === `cavalry_t${tier}${cavalryTgSuffix}`,
    );
    if (troopData && tierCount > 0 && cavalryCount > 0) {
      const trueAttack = troopData.true_attack || 1;
      const extraAttackMult = 1; // Cavalry base
      const proportion = tierCount / cavalryCount;
      const cavalryDamageForTier =
        ((trueAttack * extraAttackMult * proportion * 1.2) / 1000) *
        Math.sqrt(5000 * cavalryCount) *
        cavalryFactor *
        10;
      cavalryTotalDamage += cavalryDamageForTier;
    }
  });

  // Calculate archer damage by tier (with 1.1 multiplier for archers)
  Object.entries(archerTiers).forEach(([tierStr, tierCount]) => {
    const tier = parseInt(tierStr);
    const troopData = TROOPS.find(
      (t) => t.type === "archer" && t.id === `archer_t${tier}${archerTgSuffix}`,
    );
    if (troopData && tierCount > 0 && archerCount > 0) {
      const trueAttack = troopData.true_attack || 1;
      let extraAttackMult = 1.1; // Archer ranged strike
      // Add extra for T7+ archers
      if (tier >= 7) {
        extraAttackMult *= 1.1;
      }
      // Add extra for TG3 T10 archers (only when player actually has TG3)
      if (tier === 10 && archerTrueGoldLevel && archerTrueGoldLevel >= 3) {
        extraAttackMult *= 1.1;
      }
      const proportion = tierCount / archerCount;
      const archerDamageForTier =
        ((trueAttack * extraAttackMult * proportion * 1.2) / 1000) *
        Math.sqrt(5000 * archerCount) *
        archerFactor *
        10;
      archerTotalDamage += archerDamageForTier;
    }
  });

  return {
    infantry: Math.ceil(infantryTotalDamage),
    cavalry: Math.ceil(cavalryTotalDamage),
    archer: Math.ceil(archerTotalDamage),
  };
}

/**
 * Get best tier troops from inventory
 */
function getBestTroopsForType(
  items: TroopInventoryItem[],
  type: "infantry" | "archer" | "cavalry",
  trueGoldLevel: number,
): { tier: number; count: number; isTG: boolean }[] {
  const grouped: { [key: string]: number } = {};

  // Group troops by tier, counting all troops of this type regardless of ID
  // The trueGoldLevel will be used to look up the correct stats from the TROOPS data
  items.forEach((item) => {
    if (item.type === type) {
      const key = `t${item.tier}`;
      grouped[key] = (grouped[key] || 0) + item.count;
    }
  });

  const sorted = Object.entries(grouped)
    .sort(([a], [b]) => {
      const tierA = parseInt(a.substring(1));
      const tierB = parseInt(b.substring(1));
      return tierB - tierA;
    })
    .map(([tier, count]) => ({
      tier: parseInt(tier.substring(1)),
      count,
      isTG: trueGoldLevel > 0,
    }));

  return sorted;
}

/**
 * Allocate troops by tier sequentially across marches.
 *
 * March #0 gets the highest-tier troops first, then march #1 gets what
 * remains, etc. This preserves priority ordering — the caller controls
 * priority by the order they pass allocations (and by calling this before
 * or after allocating own-rally troops from the same pool).
 *
 * Returns tier breakdown for each march.
 */
function allocateTroopsByTier(
  tierGroups: { tier: number; count: number }[],
  allocations: number[],
): Record<number, number>[] {
  const marchesTierBreakdown: Record<number, number>[] = allocations.map(
    () => ({}),
  );
  let tierIndex = 0;
  let tierOffset = 0;

  for (let marchIdx = 0; marchIdx < allocations.length; marchIdx++) {
    let needed = allocations[marchIdx];
    while (needed > 0 && tierIndex < tierGroups.length) {
      const available = tierGroups[tierIndex].count - tierOffset;
      if (available > 0) {
        const toAllocate = Math.min(needed, available);
        const tier = tierGroups[tierIndex].tier;
        marchesTierBreakdown[marchIdx][tier] =
          (marchesTierBreakdown[marchIdx][tier] || 0) + toAllocate;
        needed -= toAllocate;
        tierOffset += toAllocate;
        if (tierOffset >= tierGroups[tierIndex].count) {
          tierIndex++;
          tierOffset = 0;
        }
      } else {
        tierIndex++;
        tierOffset = 0;
      }
    }
  }

  return marchesTierBreakdown;
}

/**
 * Allocate a single total amount across multiple tiers
 * Used for own rally allocation where we want to track multiple tiers in one formation
 */
function allocateSingleTroopTotal(
  tierGroups: { tier: number; count: number }[],
  totalNeeded: number,
): Record<number, number> {
  const tierBreakdown: Record<number, number> = {};
  let needed = totalNeeded;
  let tierIndex = 0;

  while (needed > 0 && tierIndex < tierGroups.length) {
    const available = tierGroups[tierIndex].count;

    if (available > 0) {
      const toAllocate = Math.min(needed, available);
      const tier = tierGroups[tierIndex].tier;

      tierBreakdown[tier] = (tierBreakdown[tier] || 0) + toAllocate;

      needed -= toAllocate;
    }

    tierIndex++;
  }

  return tierBreakdown;
}

/**
 * Allocate joiner march troop counts using the fundamental bear trap priority:
 *   1. Archers — spread evenly across all marches (highest damage per slot)
 *   2. Cavalry — fills remaining capacity per march
 *   3. Infantry — fills whatever cavalry cannot cover
 *
 * Works for both new players (scarce troops, fill everything) and veterans
 * (surplus troops, capacity is the constraint — best troops fill first).
 *
 * Returns an array of {inf, cav, arch} per march.  Mutates the three
 * `remaining*` accumulators passed in.
 */
/**
 * Compute the inventory-weighted average true_attack for a troop type.
 *
 * For each tier the player owns, look up that tier's true_attack from TROOPS,
 * weight it by the count of that tier in the player's inventory, and average.
 * This reflects a weak/new player who only has T4–T6 troops just as accurately
 * as a veteran with mostly T10.
 *
 * The `extraMult` for archers (ranged-strike × T7 bonus × TG3 bonus = 1.1³) is
 * handled separately in the caller so this function stays generic.
 */
function computeWeightedTrueAttack(
  tierGroups: { tier: number; count: number; isTG?: boolean }[],
  type: "infantry" | "cavalry" | "archer",
  tgLevel: number,
): number {
  let totalCount = 0;
  let weightedTA = 0;

  for (const { tier, count } of tierGroups) {
    if (count <= 0) continue;
    const tgSuffix = tgLevel > 0 ? `_tg${tgLevel}` : "";
    const troopId = `${type}_t${tier}${tgSuffix}`;
    const troopData =
      TROOPS.find((t) => t.id === troopId) ??
      // Fallback: try without TG suffix (player may have base tier troops)
      TROOPS.find((t) => t.id === `${type}_t${tier}`);
    if (!troopData) continue;
    weightedTA += (troopData.true_attack ?? 0) * count;
    totalCount += count;
  }

  if (totalCount === 0) return 0;
  return weightedTA / totalCount;
}

/**
 * Compute the damage-optimal split of `capacity` troops across three types.
 *
 * Damage formula: D_type = k_type × √N_type   where
 *   k_type = weightedTrueAttack_type × extraMult_type × attackFactor_type
 *
 * Optimal N* ∝ k²  (equal marginal damage condition: k/2√N = λ).
 *
 * Coefficients are derived from the PLAYER'S ACTUAL INVENTORY tier mix so a
 * player with only T4 infantry and T10 archers gets a ratio that reflects their
 * real troops, not a hardcoded T10-only assumption.
 *
 * IMPORTANT: The k² fractions for T10 troops heavily favour archers and cavalry
 * over infantry (kArc >> kCav >> kInf). If we blindly apply these fractions per
 * march, infantry gets ~3% and cavalry fills the rest — infantry is never used.
 *
 * Instead we solve GLOBALLY: given the total pool across ALL marches, find how
 * much of each type to use in total (capped to supply), then divide evenly per
 * march. Any capacity freed by a supply-constrained type cascades down by
 * priority (archer → cavalry → infantry) so every spare slot is filled.
 */
function computeOptimalSplit(
  capacity: number,
  availArcher: number,
  availCavalry: number,
  availInfantry: number,
  archerTierGroups: { tier: number; count: number; isTG?: boolean }[],
  cavalryTierGroups: { tier: number; count: number; isTG?: boolean }[],
  infantryTierGroups: { tier: number; count: number; isTG?: boolean }[],
  archerTgLevel: number,
  cavalryTgLevel: number,
  infantryTgLevel: number,
): { arch: number; cav: number; inf: number } {
  // Attack factors from DEFAULT_JOINER_STATS (consistent with rest of joiner estimation)
  const fInf =
    (1 + DEFAULT_JOINER_STATS.infantry.attack / 100) *
    (1 + DEFAULT_JOINER_STATS.infantry.lethality / 100);
  const fCav =
    (1 + DEFAULT_JOINER_STATS.cavalry.attack / 100) *
    (1 + DEFAULT_JOINER_STATS.cavalry.lethality / 100);
  const fArc =
    (1 + DEFAULT_JOINER_STATS.archer.attack / 100) *
    (1 + DEFAULT_JOINER_STATS.archer.lethality / 100);

  // Weighted true_attack from actual inventory tiers
  const taInf = computeWeightedTrueAttack(
    infantryTierGroups,
    "infantry",
    infantryTgLevel,
  );
  const taCav = computeWeightedTrueAttack(
    cavalryTierGroups,
    "cavalry",
    cavalryTgLevel,
  );
  const taArc = computeWeightedTrueAttack(
    archerTierGroups,
    "archer",
    archerTgLevel,
  );

  // Archer extra multipliers: ranged-strike (×1.1), T7+ bonus, TG3 T10 bonus
  const totalArcCount = archerTierGroups.reduce((s, g) => s + g.count, 0);
  const weightedArcTier =
    totalArcCount > 0
      ? archerTierGroups.reduce((s, g) => s + g.tier * g.count, 0) /
        totalArcCount
      : 0;
  let arcExtraMult = 1.1; // ranged-strike always applies
  if (weightedArcTier >= 7) arcExtraMult *= 1.1;
  if (weightedArcTier >= 10 && archerTgLevel >= 3) arcExtraMult *= 1.1;

  const kInf = taInf * fInf;
  const kCav = taCav * fCav;
  const kArc = taArc * arcExtraMult * fArc;

  const kInf2 = kInf * kInf;
  const kCav2 = kCav * kCav;
  const kArc2 = kArc * kArc;
  const kTotal2 = kInf2 + kCav2 + kArc2;

  if (kTotal2 === 0) {
    // No troop data at all — fill whatever we have in priority order
    let arch = Math.min(Math.floor(availArcher / 10) * 10, capacity);
    let cav = Math.min(Math.floor(availCavalry / 10) * 10, capacity - arch);
    const inf = Math.min(
      Math.floor(availInfantry / 10) * 10,
      capacity - arch - cav,
    );
    return { arch, cav, inf };
  }

  // k² fractions give the unconstrained ideal.
  // Apply them, cap each to available supply, then cascade freed capacity.
  // Sorted by priority: archer first, then cavalry, then infantry.
  const idealArch = Math.floor((capacity * (kArc2 / kTotal2)) / 10) * 10;
  const idealCav = Math.floor((capacity * (kCav2 / kTotal2)) / 10) * 10;
  const idealInf = Math.floor((capacity * (kInf2 / kTotal2)) / 10) * 10;

  let arch = Math.min(idealArch, Math.floor(availArcher / 10) * 10);
  let cav = Math.min(idealCav, Math.floor(availCavalry / 10) * 10);
  let inf = Math.min(idealInf, Math.floor(availInfantry / 10) * 10);

  // Cascade freed capacity: if a type is supply-limited, give its leftover
  // to the next type in priority order (archer → cavalry → infantry).
  let spare = capacity - arch - cav - inf;

  if (spare > 0 && availArcher > arch) {
    const extra = Math.floor(Math.min(spare, availArcher - arch) / 10) * 10;
    arch += extra;
    spare -= extra;
  }
  if (spare > 0 && availCavalry > cav) {
    const extra = Math.floor(Math.min(spare, availCavalry - cav) / 10) * 10;
    cav += extra;
    spare -= extra;
  }
  if (spare > 0 && availInfantry > inf) {
    const extra = Math.floor(Math.min(spare, availInfantry - inf) / 10) * 10;
    inf += extra;
  }

  return { arch, cav, inf };
}

function allocateJoinerMarches(
  marchCount: number,
  marchCapacity: number,
  remainingArcher: { value: number },
  remainingCavalry: { value: number },
  remainingInfantry: { value: number },
  archerTierGroups: { tier: number; count: number; isTG?: boolean }[],
  cavalryTierGroups: { tier: number; count: number; isTG?: boolean }[],
  infantryTierGroups: { tier: number; count: number; isTG?: boolean }[],
  archerTgLevel: number,
  cavalryTgLevel: number,
  infantryTgLevel: number,
  /** When true every march gets the same base allocation; no per-march spare
   *  cascade. The rounding remainder stays in the `remaining*` accumulators
   *  so the caller can absorb it (e.g. into own rally). */
  uniform = false,
): { inf: number; cav: number; arch: number }[] {
  // Solve GLOBALLY: compute the optimal total allocation across ALL marches at once,
  // then divide evenly per march. This avoids per-march cascade eating all spare
  // capacity with cavalry before infantry gets any slots.
  const totalCapacity = marchCount * marchCapacity;

  const {
    arch: totalArch,
    cav: totalCav,
    inf: totalInf,
  } = computeOptimalSplit(
    totalCapacity,
    remainingArcher.value,
    remainingCavalry.value,
    remainingInfantry.value,
    archerTierGroups,
    cavalryTierGroups,
    infantryTierGroups,
    archerTgLevel,
    cavalryTgLevel,
    infantryTgLevel,
  );

  // Per-march base allocation (rounded down to 100)
  const archPerMarch = Math.floor(totalArch / marchCount / 10) * 10;
  const cavPerMarch = Math.floor(totalCav / marchCount / 10) * 10;
  const infPerMarch = Math.floor(totalInf / marchCount / 10) * 10;

  const allocations: { inf: number; cav: number; arch: number }[] = [];

  if (uniform) {
    // Strict uniform mode: every march gets the same allocation.
    // Compute the per-march optimal split directly (capacity = marchCapacity,
    // supply = total available / marchCount) so we never double-floor.
    const perMarchAvailArch =
      Math.floor(remainingArcher.value / marchCount / 10) * 10;
    const perMarchAvailCav =
      Math.floor(remainingCavalry.value / marchCount / 10) * 10;
    const perMarchAvailInf =
      Math.floor(remainingInfantry.value / marchCount / 10) * 10;
    const perMarchSplit = computeOptimalSplit(
      marchCapacity,
      perMarchAvailArch,
      perMarchAvailCav,
      perMarchAvailInf,
      archerTierGroups,
      cavalryTierGroups,
      infantryTierGroups,
      archerTgLevel,
      cavalryTgLevel,
      infantryTgLevel,
    );
    for (let i = 0; i < marchCount; i++) {
      const arch = Math.min(
        perMarchSplit.arch,
        Math.floor(remainingArcher.value / 10) * 10,
      );
      const cav = Math.min(
        perMarchSplit.cav,
        Math.floor(remainingCavalry.value / 10) * 10,
      );
      const inf = Math.min(
        perMarchSplit.inf,
        Math.floor(remainingInfantry.value / 10) * 10,
      );
      remainingArcher.value -= arch;
      remainingCavalry.value -= cav;
      remainingInfantry.value -= inf;
      allocations.push({ inf, cav, arch });
    }
    return allocations;
  }

  // Non-uniform path: recover all rounding slack so no capacity is wasted.
  //
  // Two sources of lost slots:
  // 1. computeOptimalSplit floors each type's ideal independently, leaving up
  //    to (types-1)*9 spare slots even when supply is plentiful.
  // 2. Dividing per-march re-floors, losing another fraction per type.
  //
  // Fix: compute the total spare across all marches after base floors, then
  // fill it from available surplus troops (arc → cav → inf priority).
  const baseSparePerMarch =
    marchCapacity - archPerMarch - cavPerMarch - infPerMarch;
  const totalSpare =
    baseSparePerMarch * marchCount +
    (totalArch - archPerMarch * marchCount) +
    (totalCav - cavPerMarch * marchCount) +
    (totalInf - infPerMarch * marchCount);

  let sparePool = totalSpare;
  const extraArchTotal =
    Math.floor(
      Math.min(sparePool, Math.max(0, remainingArcher.value - totalArch)) / 10,
    ) * 10;
  sparePool -= extraArchTotal;
  const extraCavTotal =
    Math.floor(
      Math.min(sparePool, Math.max(0, remainingCavalry.value - totalCav)) / 10,
    ) * 10;
  sparePool -= extraCavTotal;
  const extraInfTotal =
    Math.floor(
      Math.min(sparePool, Math.max(0, remainingInfantry.value - totalInf)) / 10,
    ) * 10;

  const finalTotalArch = totalArch + extraArchTotal;
  const finalTotalCav = totalCav + extraCavTotal;
  const finalTotalInf = totalInf + extraInfTotal;

  const finalArchPerMarch = Math.floor(finalTotalArch / marchCount / 10) * 10;
  const finalCavPerMarch = Math.floor(finalTotalCav / marchCount / 10) * 10;
  const finalInfPerMarch = Math.floor(finalTotalInf / marchCount / 10) * 10;

  // Any remainder after re-flooring goes to the last march so nothing is wasted.
  const archBonus = finalTotalArch - finalArchPerMarch * marchCount;
  const cavBonus = finalTotalCav - finalCavPerMarch * marchCount;
  const infBonus = finalTotalInf - finalInfPerMarch * marchCount;

  for (let i = 0; i < marchCount; i++) {
    const isLast = i === marchCount - 1;
    const arch = Math.min(
      finalArchPerMarch + (isLast ? archBonus : 0),
      Math.floor(remainingArcher.value / 10) * 10,
    );
    const cav = Math.min(
      finalCavPerMarch + (isLast ? cavBonus : 0),
      Math.floor(remainingCavalry.value / 10) * 10,
    );
    // Cap infantry so the march total never exceeds marchCapacity
    const infTarget = finalInfPerMarch + (isLast ? infBonus : 0);
    const inf = Math.min(
      infTarget,
      Math.floor(
        Math.min(remainingInfantry.value, marchCapacity - arch - cav) / 10,
      ) * 10,
    );

    remainingArcher.value -= arch;
    remainingCavalry.value -= cav;
    remainingInfantry.value -= inf;
    allocations.push({ inf, cav, arch });
  }

  return allocations;
}

/**
 * Score a candidate own-rally formation using the actual tier-aware damage formula.
 * Pure function — reads tier pools but does NOT mutate them.
 */
function scoreFormation(
  infCount: number,
  cavCount: number,
  arcCount: number,
  infantryTierPool: { tier: number; count: number }[],
  cavalryTierPool: { tier: number; count: number }[],
  archerTierPool: { tier: number; count: number }[],
  infantryFactor: number,
  cavalryFactor: number,
  archerFactor: number,
  infantryTrueGoldLevel: number,
  cavalryTrueGoldLevel: number,
  archerTrueGoldLevel: number,
): number {
  const infTiers = allocateSingleTroopTotal(infantryTierPool, infCount);
  const cavTiers = allocateSingleTroopTotal(cavalryTierPool, cavCount);
  const arcTiers = allocateSingleTroopTotal(archerTierPool, arcCount);
  return calculateRallyDamage(
    infCount,
    cavCount,
    arcCount,
    infantryFactor,
    cavalryFactor,
    archerFactor,
    infTiers,
    cavTiers,
    arcTiers,
    [],
    infantryTrueGoldLevel,
    cavalryTrueGoldLevel,
    archerTrueGoldLevel,
  );
}

/**
 * Grid-search optimizer for own rally formation.
 *
 * Iterates infantry% and archer% from MIN_PCT in STEP=2% increments;
 * cavalry fills remainder. All three types are guaranteed ≥ MIN_PCT
 * (no-zeroes rule). Uses the actual tier-aware damage formula for scoring.
 * ~625 iterations — runs in <1 ms.
 */
function findOptimalOwnRallyFormation(
  availableInfantry: number,
  availableCavalry: number,
  availableArcher: number,
  capacity: number,
  infantryTierPool: { tier: number; count: number }[],
  cavalryTierPool: { tier: number; count: number }[],
  archerTierPool: { tier: number; count: number }[],
  infantryFactor: number,
  cavalryFactor: number,
  archerFactor: number,
  infantryTrueGoldLevel: number,
  cavalryTrueGoldLevel: number,
  archerTrueGoldLevel: number,
): { inf: number; cav: number; arc: number } {
  const STEP = 1; // 1% grid resolution
  const MIN_PCT = 1; // each type must be ≥ 1% of capacity (no-zeroes rule)

  let bestDamage = -1;
  let bestInf = 0;
  let bestArc = 0;

  for (let pInf = MIN_PCT; pInf <= 100 - MIN_PCT * 2; pInf += STEP) {
    for (let pArc = MIN_PCT; pArc <= 100 - pInf - MIN_PCT; pArc += STEP) {
      const pCav = 100 - pInf - pArc;
      if (pCav < MIN_PCT) continue;

      // Convert percentages → troop counts (floor to nearest 100)
      const infCount =
        Math.floor(Math.min((pInf / 100) * capacity, availableInfantry) / 100) *
        100;
      const arcCount =
        Math.floor(Math.min((pArc / 100) * capacity, availableArcher) / 100) *
        100;
      // Cavalry fills whatever capacity remains after inf + arc, capped by available
      const cavCount = Math.min(
        Math.floor((capacity - infCount - arcCount) / 10) * 10,
        Math.floor(availableCavalry / 10) * 10,
      );

      // Skip only if the player truly has none of a type
      if (
        (availableInfantry > 0 && infCount === 0) ||
        (availableCavalry > 0 && cavCount === 0) ||
        (availableArcher > 0 && arcCount === 0)
      )
        continue;

      const dmg = scoreFormation(
        infCount,
        cavCount,
        arcCount,
        infantryTierPool,
        cavalryTierPool,
        archerTierPool,
        infantryFactor,
        cavalryFactor,
        archerFactor,
        infantryTrueGoldLevel,
        cavalryTrueGoldLevel,
        archerTrueGoldLevel,
      );

      if (dmg > bestDamage) {
        bestDamage = dmg;
        bestInf = infCount;
        bestArc = arcCount;
      }
    }
  }

  // Fallback: if grid found nothing (all zero), fill greedily by priority
  if (bestInf === 0 && bestArc === 0) {
    const fallbackArc = Math.min(
      Math.floor(availableArcher / 10) * 10,
      Math.floor(capacity / 10) * 10,
    );
    const fallbackCav = Math.min(
      Math.floor(availableCavalry / 10) * 10,
      Math.floor((capacity - fallbackArc) / 10) * 10,
    );
    const fallbackInf = Math.min(
      Math.floor(availableInfantry / 10) * 10,
      Math.floor((capacity - fallbackArc - fallbackCav) / 10) * 10,
    );
    return { inf: fallbackInf, cav: fallbackCav, arc: fallbackArc };
  }

  const bestCav = Math.min(
    Math.floor((capacity - bestInf - bestArc) / 10) * 10,
    Math.floor(availableCavalry / 10) * 10,
  );

  return { inf: bestInf, cav: bestCav, arc: bestArc };
}

/**
 * When the inventory is smaller than what all configured slots need, compute
 * the effective march parameters that maximise expected event score:
 *   eventScore = ownDmg × ownRallyCount
 *              + avgJoinerDmg × (2/3) × effectiveJoinedRallyCount
 *
 * Joined rally count is scaled proportionally with march count because fewer
 * marches means fewer rallies you can join in the same time window.
 * e.g. if 6 marches → joinedRallyCount rallies joined, then mc marches →
 * round(joinedRallyCount × mc / marchCount).
 *
 * Strategy tested: reduce march count (keep full caps) vs. scale caps down.
 * We pick the (marchCount, joinerCap) pair with the highest event score while
 * ensuring every march is at least MIN_FILL_PCT filled.
 *
 * If all slots can be filled at the configured capacities, returns them
 * unchanged with no warnings.
 */
function computeEffectiveMarchParams(
  totalInfantry: number,
  totalCavalry: number,
  totalArcher: number,
  marchCapacity: number,
  joinerLimit: number,
  marchCount: number,
  ownRallyCount: number,
  joinedRallyCount: number,
  includeOwnRally: boolean,
): {
  effectiveMarchCount: number;
  effectiveOwnCap: number;
  effectiveJoinerCap: number;
  warnings: string[];
} {
  const MIN_FILL_PCT = 0.35; // a march must be ≥35% filled to be included
  const CAP_STEP = 5000;

  const totalTroops = totalInfantry + totalCavalry + totalArcher;
  const slotsNeeded = (includeOwnRally ? 1 : 0) + marchCount;
  const minNeeded =
    (includeOwnRally ? marchCapacity : 0) + marchCount * joinerLimit;

  // No shortfall — return as-is
  if (totalTroops >= minNeeded) {
    return {
      effectiveMarchCount: marchCount,
      effectiveOwnCap: marchCapacity,
      effectiveJoinerCap: joinerLimit,
      warnings: [],
    };
  }

  // Simple damage scorer (tier-agnostic, mirrors the formula structure)
  // Uses archer T10 multipliers as a proxy — good enough for this sizing decision
  const INF_SCORE = 472 * 1.0;
  const CAV_SCORE = 1416 * 1.0;
  const ARC_SCORE = 1888 * 1.331; // 1.1^3 for T10 archer
  const K = (1.2 / 1000) * Math.sqrt(5000) * 10;
  function quickDmg(inf: number, cav: number, arc: number): number {
    return (
      K *
      (INF_SCORE * Math.sqrt(inf) +
        CAV_SCORE * Math.sqrt(cav) +
        ARC_SCORE * Math.sqrt(arc))
    );
  }

  // Approximate own-rally allocation using the same k²-optimal split as the actual allocator.
  function ownRallyApprox(cap: number): {
    inf: number;
    cav: number;
    arc: number;
  } {
    const idealArcFrac = ARC_SCORE * ARC_SCORE;
    const idealCavFrac = CAV_SCORE * CAV_SCORE;
    const idealInfFrac = INF_SCORE * INF_SCORE;
    const idealTotal = idealArcFrac + idealCavFrac + idealInfFrac;
    let arc = Math.min(
      Math.floor((cap * (idealArcFrac / idealTotal)) / 10) * 10,
      totalArcher,
    );
    let cav = Math.min(
      Math.floor((cap * (idealCavFrac / idealTotal)) / 10) * 10,
      totalCavalry,
    );
    let inf = Math.min(
      Math.floor((cap * (idealInfFrac / idealTotal)) / 10) * 10,
      totalInfantry,
    );
    let spare = cap - arc - cav - inf;
    if (spare > 0 && totalArcher > arc) {
      const e = Math.floor(Math.min(spare, totalArcher - arc) / 10) * 10;
      arc += e;
      spare -= e;
    }
    if (spare > 0 && totalCavalry > cav) {
      const e = Math.floor(Math.min(spare, totalCavalry - cav) / 10) * 10;
      cav += e;
      spare -= e;
    }
    if (spare > 0 && totalInfantry > inf) {
      const e = Math.floor(Math.min(spare, totalInfantry - inf) / 10) * 10;
      inf += e;
    }
    return {
      inf: Math.max(0, inf),
      cav: Math.max(0, cav),
      arc: Math.max(0, arc),
    };
  }

  let bestScore = -1;
  let bestMarchCount = 1;
  let bestOwnCap = includeOwnRally
    ? Math.floor(totalTroops / slotsNeeded / 10) * 10
    : marchCapacity;

  // Test 3 confirmed: reducing joiner cap below the configured maximum ALWAYS
  // reduces event score because the √N troop-count penalty outweighs any ratio
  // improvement. We therefore never reduce joiner cap — sweep march count only.
  const jCap = joinerLimit;

  // Sweep own rally cap (only when includeOwnRally)
  const ownCapMin = includeOwnRally
    ? Math.floor((marchCapacity * 0.2) / 10) * 10
    : marchCapacity;
  const ownCapMax = marchCapacity;
  const ownCapStep = includeOwnRally ? CAP_STEP : marchCapacity;

  for (let ownCap = ownCapMin; ownCap <= ownCapMax; ownCap += ownCapStep) {
    const own = ownRallyApprox(ownCap);
    const remInf = totalInfantry - own.inf;
    const remCav = totalCavalry - own.cav;
    const remArc = totalArcher - own.arc;

    for (let mc = 1; mc <= marchCount; mc++) {
      // Simulate joiner allocation using global k²-optimal split.
      let rI = remInf,
        rC = remCav,
        rA = remArc;

      const joinerDmgs: number[] = [];
      // Use global optimal split for total joiner capacity, then divide per march.
      // This correctly accounts for infantry filling spare capacity when archers/cavalry are scarce.
      const totalJoinerCap = mc * jCap;
      const idealArcFrac = ARC_SCORE * ARC_SCORE;
      const idealCavFrac = CAV_SCORE * CAV_SCORE;
      const idealInfFrac = INF_SCORE * INF_SCORE;
      const idealTotal = idealArcFrac + idealCavFrac + idealInfFrac;
      let gArc = Math.min(
        Math.floor((totalJoinerCap * (idealArcFrac / idealTotal)) / 100) * 100,
        rA,
      );
      let gCav = Math.min(
        Math.floor((totalJoinerCap * (idealCavFrac / idealTotal)) / 100) * 100,
        rC,
      );
      let gInf = Math.min(
        Math.floor((totalJoinerCap * (idealInfFrac / idealTotal)) / 100) * 100,
        rI,
      );
      // Cascade spare to next type by priority (archer → cavalry → infantry)
      let gSpare = totalJoinerCap - gArc - gCav - gInf;
      if (gSpare > 0 && rA > gArc) {
        const e = Math.floor(Math.min(gSpare, rA - gArc) / 10) * 10;
        gArc += e;
        gSpare -= e;
      }
      if (gSpare > 0 && rC > gCav) {
        const e = Math.floor(Math.min(gSpare, rC - gCav) / 10) * 10;
        gCav += e;
        gSpare -= e;
      }
      if (gSpare > 0 && rI > gInf) {
        const e = Math.floor(Math.min(gSpare, rI - gInf) / 10) * 10;
        gInf += e;
      }
      // Reject this mc if troops can't meaningfully fill the marches.
      if (jCap > 0 && (gArc + gCav + gInf) / totalJoinerCap < MIN_FILL_PCT) {
        continue;
      }
      const arcPerM = Math.floor(gArc / mc / 10) * 10;
      const cavPerM = Math.floor(gCav / mc / 10) * 10;
      const infPerM = Math.floor(gInf / mc / 10) * 10;
      for (let i = 0; i < mc; i++) {
        const arc = Math.min(arcPerM, rA);
        const cav = Math.min(cavPerM, rC);
        const inf = Math.min(infPerM, rI);
        rA -= arc;
        rC -= cav;
        rI -= inf;
        joinerDmgs.push(quickDmg(inf, cav, arc));
      }

      const ownDmg = includeOwnRally ? quickDmg(own.inf, own.cav, own.arc) : 0;
      const avgJoiner = joinerDmgs.reduce((a, b) => a + b, 0) / mc;
      // Scale joined rally count proportionally: fewer marches → fewer rallies joined
      const effectiveJoinedCount = Math.round(
        (joinedRallyCount * mc) / marchCount,
      );
      const score =
        ownDmg * ownRallyCount + avgJoiner * (2 / 3) * effectiveJoinedCount;

      if (score > bestScore) {
        bestScore = score;
        bestMarchCount = mc;
        bestOwnCap = ownCap;
      }
    }
  }

  const warnings: string[] = [];
  if (bestMarchCount < marchCount) {
    const scaledRallies = Math.round(
      (joinedRallyCount * bestMarchCount) / marchCount,
    );
    warnings.push(
      `Only ${bestMarchCount} of ${marchCount} joiner marches can be meaningfully filled with your current inventory. Joined rally count scaled to ${scaledRallies} (from ${joinedRallyCount}) to match. Consider adding more troops or reducing march count in Rally Settings.`,
    );
  }
  if (includeOwnRally && bestOwnCap < marchCapacity) {
    warnings.push(
      `Own rally capacity reduced from ${marchCapacity.toLocaleString()} to ${bestOwnCap.toLocaleString()} to share troops fairly with joiner marches.`,
    );
  }

  return {
    effectiveMarchCount: bestMarchCount,
    effectiveOwnCap: includeOwnRally ? bestOwnCap : marchCapacity,
    effectiveJoinerCap: jCap,
    warnings,
  };
}

/**
 * Strong Player Strategy: Optimize own rally first
 */
function calculateStrongPlayerFormation(
  config: BearTrapConfig,
  stats: BearTrapSecondaryStats,
): RallyFormation {
  const trueGoldLevels = config.inventory.trueGold;

  const archers = getBestTroopsForType(
    config.inventory.items,
    "archer",
    trueGoldLevels.archer,
  );
  const cavalry = getBestTroopsForType(
    config.inventory.items,
    "cavalry",
    trueGoldLevels.cavalry,
  );
  const infantry = getBestTroopsForType(
    config.inventory.items,
    "infantry",
    trueGoldLevels.infantry,
  );

  let remainingArcher = archers.reduce((sum, t) => sum + t.count, 0);
  let remainingCavalry = cavalry.reduce((sum, t) => sum + t.count, 0);
  let remainingInfantry = infantry.reduce((sum, t) => sum + t.count, 0);

  const {
    effectiveMarchCount: strongMarchCount,
    effectiveOwnCap,
    effectiveJoinerCap: strongJoinerCap,
    warnings,
  } = computeEffectiveMarchParams(
    remainingInfantry,
    remainingCavalry,
    remainingArcher,
    config.marchCapacity,
    config.joinerLimit,
    config.marchCount,
    config.ownRallyCount,
    config.joinedRallyCount,
    true,
  );

  // ── Own rally: derive optimal ratio from battle stats ──────────────────────
  const infFactor = calculateAttackFactor(
    stats.infantry,
    config.trapEnhancementLevel,
  );
  const cavFactor = calculateAttackFactor(
    stats.cavalry,
    config.trapEnhancementLevel,
  );
  const arcFactor = calculateAttackFactor(
    stats.archer,
    config.trapEnhancementLevel,
  );

  // Snapshot tier pools for scoring — scoreFormation reads but does not mutate these
  const infantryTierPoolSnap = infantry.map((t) => ({ ...t }));
  const cavalryTierPoolSnap = cavalry.map((t) => ({ ...t }));
  const archerTierPoolSnap = archers.map((t) => ({ ...t }));

  const ownRallyOptimal = findOptimalOwnRallyFormation(
    remainingInfantry,
    remainingCavalry,
    remainingArcher,
    effectiveOwnCap,
    infantryTierPoolSnap,
    cavalryTierPoolSnap,
    archerTierPoolSnap,
    infFactor,
    cavFactor,
    arcFactor,
    trueGoldLevels.infantry,
    trueGoldLevels.cavalry,
    trueGoldLevels.archer,
  );

  let ownRallyInfantry = Math.min(ownRallyOptimal.inf, remainingInfantry);
  remainingInfantry -= ownRallyInfantry;

  let ownRallyArcher = Math.min(ownRallyOptimal.arc, remainingArcher);
  remainingArcher -= ownRallyArcher;

  // Use the cavalry result directly from the grid search (not a secondary
  // optimisation) — the grid already found the best cav share.
  let ownRallyCavalry = Math.min(ownRallyOptimal.cav, remainingCavalry);
  remainingCavalry -= ownRallyCavalry;

  // Fill any rounding remainder (capacity - inf - cav - arc > 0) using the
  // player's own priority: arc → cav → inf (optimal order for bear trap).
  let ownSpare =
    effectiveOwnCap - ownRallyInfantry - ownRallyCavalry - ownRallyArcher;
  if (ownSpare > 0) {
    // Deterministic priority: arc → cav → inf (already correct for bear trap)
    for (const type of ["arc", "cav", "inf"] as const) {
      if (ownSpare <= 0) break;
      if (type === "arc" && remainingArcher > 0) {
        const extra = Math.floor(Math.min(ownSpare, remainingArcher) / 10) * 10;
        ownRallyArcher += extra;
        remainingArcher -= extra;
        ownSpare -= extra;
      } else if (type === "cav" && remainingCavalry > 0) {
        const extra =
          Math.floor(Math.min(ownSpare, remainingCavalry) / 10) * 10;
        ownRallyCavalry += extra;
        remainingCavalry -= extra;
        ownSpare -= extra;
      } else if (type === "inf" && remainingInfantry > 0) {
        const extra =
          Math.floor(Math.min(ownSpare, remainingInfantry) / 10) * 10;
        ownRallyInfantry += extra;
        remainingInfantry -= extra;
        ownSpare -= extra;
      }
    }
  }

  const finalOwnRallyInfantry = ownRallyInfantry;

  // Own rally damage will be recalculated after tier allocation with proper tier data
  let ownRallyDamage = 0;

  // Allocate own rally troops by tier FIRST (highest tiers first)
  // 1. Divide remaining archers evenly across all marches
  // 2. Set infantry to 5% minimum per march
  // 3. Fill remaining space with cavalry
  // 4. If cavalry runs out, increase infantry for remaining marches
  // All values rounded to nearest 100
  const joiners: MarchFormation[] = [];
  const marchCapacity = strongJoinerCap; // Each march can hold up to (effective) joiner limit

  // Allocate joiner marches: formula-optimal split based on actual inventory tier mix
  const rArch = { value: remainingArcher };
  const rCav = { value: remainingCavalry };
  const rInf = { value: remainingInfantry };
  const marchAllocations = allocateJoinerMarches(
    strongMarchCount,
    marchCapacity,
    rArch,
    rCav,
    rInf,
    archers,
    cavalry,
    infantry,
    trueGoldLevels.archer,
    trueGoldLevels.cavalry,
    trueGoldLevels.infantry,
  );
  remainingArcher = rArch.value;
  remainingCavalry = rCav.value;
  remainingInfantry = rInf.value;

  // Allocate own rally troops by tier FIRST (highest tiers first)
  // This ensures own rally gets priority with highest tiers
  const infantryRemaining = infantry.map((t) => ({ ...t }));
  const cavalryRemaining = cavalry.map((t) => ({ ...t }));
  const archerRemaining = archers.map((t) => ({ ...t }));

  const ownRallyInfantryByTier = allocateSingleTroopTotal(
    infantryRemaining,
    ownRallyInfantry,
  );
  const ownRallyCavalryByTier = allocateSingleTroopTotal(
    cavalryRemaining,
    ownRallyCavalry,
  );
  const ownRallyArcherByTier = allocateSingleTroopTotal(
    archerRemaining,
    ownRallyArcher,
  );

  // Subtract own rally allocations from remaining tier groups
  Object.entries(ownRallyInfantryByTier).forEach(([tier, count]) => {
    const tierNum = parseInt(tier);
    const tierGroup = infantryRemaining.find((t) => t.tier === tierNum);
    if (tierGroup) tierGroup.count -= count;
  });
  Object.entries(ownRallyCavalryByTier).forEach(([tier, count]) => {
    const tierNum = parseInt(tier);
    const tierGroup = cavalryRemaining.find((t) => t.tier === tierNum);
    if (tierGroup) tierGroup.count -= count;
  });
  Object.entries(ownRallyArcherByTier).forEach(([tier, count]) => {
    const tierNum = parseInt(tier);
    const tierGroup = archerRemaining.find((t) => t.tier === tierNum);
    if (tierGroup) tierGroup.count -= count;
  });

  // NOW allocate troops by tier to joiner marches from remaining pools
  const infantryByTier = allocateTroopsByTier(
    infantryRemaining,
    marchAllocations.map((m) => m.inf),
  );
  const cavalryByTier = allocateTroopsByTier(
    cavalryRemaining,
    marchAllocations.map((m) => m.cav),
  );
  const archerByTier = allocateTroopsByTier(
    archerRemaining,
    marchAllocations.map((m) => m.arch),
  );

  // Now create the actual march formations with tier data
  for (let i = 0; i < strongMarchCount; i++) {
    const finalInfantry = marchAllocations[i].inf;
    const finalCavalry = marchAllocations[i].cav;
    const finalArcher = marchAllocations[i].arch;

    const marchDamage = calculateRallyDamage(
      finalInfantry,
      finalCavalry,
      finalArcher,
      calculateEffectiveAttackFactor(
        config.inventory.items,
        "infantry",
        DEFAULT_JOINER_STATS.infantry,
      ),
      calculateEffectiveAttackFactor(
        config.inventory.items,
        "cavalry",
        DEFAULT_JOINER_STATS.cavalry,
      ),
      calculateEffectiveAttackFactor(
        config.inventory.items,
        "archer",
        DEFAULT_JOINER_STATS.archer,
      ),
      infantryByTier[i],
      cavalryByTier[i],
      archerByTier[i],
      config.inventory.items,
      config.inventory.trueGold.infantry,
      config.inventory.trueGold.cavalry,
      config.inventory.trueGold.archer,
    );

    const marchDamageByType = calculateRallyDamageByType(
      finalInfantry,
      finalCavalry,
      finalArcher,
      calculateEffectiveAttackFactor(
        config.inventory.items,
        "infantry",
        DEFAULT_JOINER_STATS.infantry,
      ),
      calculateEffectiveAttackFactor(
        config.inventory.items,
        "cavalry",
        DEFAULT_JOINER_STATS.cavalry,
      ),
      calculateEffectiveAttackFactor(
        config.inventory.items,
        "archer",
        DEFAULT_JOINER_STATS.archer,
      ),
      infantryByTier[i],
      cavalryByTier[i],
      archerByTier[i],
      config.inventory.items,
      config.inventory.trueGold.infantry,
      config.inventory.trueGold.cavalry,
      config.inventory.trueGold.archer,
    );

    joiners.push({
      marchIndex: i + 1,
      infantry: finalInfantry,
      cavalry: finalCavalry,
      archer: finalArcher,
      totalTroops: finalInfantry + finalCavalry + finalArcher,
      estimatedDamage: marchDamage,
      damageByType: marchDamageByType,
      infantryTiers: infantryByTier[i],
      cavalryTiers: cavalryByTier[i],
      archerTiers: archerByTier[i],
    });
  }
  ownRallyDamage = calculateRallyDamage(
    finalOwnRallyInfantry,
    ownRallyCavalry,
    ownRallyArcher,
    calculateEffectiveAttackFactor(
      config.inventory.items,
      "infantry",
      stats.infantry,
      config.trapEnhancementLevel,
    ),
    calculateEffectiveAttackFactor(
      config.inventory.items,
      "cavalry",
      stats.cavalry,
      config.trapEnhancementLevel,
    ),
    calculateEffectiveAttackFactor(
      config.inventory.items,
      "archer",
      stats.archer,
      config.trapEnhancementLevel,
    ),
    ownRallyInfantryByTier,
    ownRallyCavalryByTier,
    ownRallyArcherByTier,
    config.inventory.items,
    config.inventory.trueGold.infantry,
    config.inventory.trueGold.cavalry,
    config.inventory.trueGold.archer,
  );

  const ownRallyDamageByType = calculateRallyDamageByType(
    finalOwnRallyInfantry,
    ownRallyCavalry,
    ownRallyArcher,
    calculateEffectiveAttackFactor(
      config.inventory.items,
      "infantry",
      stats.infantry,
      config.trapEnhancementLevel,
    ),
    calculateEffectiveAttackFactor(
      config.inventory.items,
      "cavalry",
      stats.cavalry,
      config.trapEnhancementLevel,
    ),
    calculateEffectiveAttackFactor(
      config.inventory.items,
      "archer",
      stats.archer,
      config.trapEnhancementLevel,
    ),
    ownRallyInfantryByTier,
    ownRallyCavalryByTier,
    ownRallyArcherByTier,
    config.inventory.items,
    config.inventory.trueGold.infantry,
    config.inventory.trueGold.cavalry,
    config.inventory.trueGold.archer,
  );

  const totalDamage =
    ownRallyDamage + joiners.reduce((sum, m) => sum + m.estimatedDamage, 0);

  // Calculate total rally damages for result
  const totalJoinerDamage = joiners.reduce(
    (sum, m) => sum + m.estimatedDamage,
    0,
  );
  const calculatedOwnRallyDamage = ownRallyDamage * config.ownRallyCount;
  const effectiveJoinedRallyCount = Math.round(
    (config.joinedRallyCount * strongMarchCount) / config.marchCount,
  );
  const calculatedJoinedRallyDamage =
    (totalJoinerDamage / config.marchCount) *
    (2 / 3) *
    effectiveJoinedRallyCount;

  // Build tier breakdowns from all allocations (own rally + joiners)
  const allInfantryTiers: Record<number, number> = {
    ...ownRallyInfantryByTier,
  };
  const allCavalryTiers: Record<number, number> = {
    ...ownRallyCavalryByTier,
  };
  const allArcherTiers: Record<number, number> = {
    ...ownRallyArcherByTier,
  };

  // Aggregate tier data from all joiners
  joiners.forEach((march) => {
    if (march.infantryTiers) {
      Object.entries(march.infantryTiers).forEach(([tier, count]) => {
        const tierNum = parseInt(tier);
        allInfantryTiers[tierNum] = (allInfantryTiers[tierNum] || 0) + count;
      });
    }
    if (march.cavalryTiers) {
      Object.entries(march.cavalryTiers).forEach(([tier, count]) => {
        const tierNum = parseInt(tier);
        allCavalryTiers[tierNum] = (allCavalryTiers[tierNum] || 0) + count;
      });
    }
    if (march.archerTiers) {
      Object.entries(march.archerTiers).forEach(([tier, count]) => {
        const tierNum = parseInt(tier);
        allArcherTiers[tierNum] = (allArcherTiers[tierNum] || 0) + count;
      });
    }
  });

  const { usedTroops, unusedTroops } = buildTroopsDebugInfo(
    config.inventory.items,
    allInfantryTiers,
    allCavalryTiers,
    allArcherTiers,
  );

  // Calculate actual joiner ratio from total joiner allocation (all marches combined)
  const totalJoinerInfantry = joiners.reduce((sum, m) => sum + m.infantry, 0);
  const totalJoinerCavalry = joiners.reduce((sum, m) => sum + m.cavalry, 0);
  const totalJoinerArcher = joiners.reduce((sum, m) => sum + m.archer, 0);
  const totalJoinerTroops =
    totalJoinerInfantry + totalJoinerCavalry + totalJoinerArcher;
  const joinerRatio =
    totalJoinerTroops > 0
      ? `${Math.round((totalJoinerInfantry / totalJoinerTroops) * 100)}% inf : ${Math.round((totalJoinerCavalry / totalJoinerTroops) * 100)}% cav : ${Math.round((totalJoinerArcher / totalJoinerTroops) * 100)}% arc`
      : "N/A";

  return {
    ownRally: {
      marchIndex: 0,
      infantry: finalOwnRallyInfantry,
      cavalry: ownRallyCavalry,
      archer: ownRallyArcher,
      totalTroops: finalOwnRallyInfantry + ownRallyCavalry + ownRallyArcher,
      estimatedDamage: ownRallyDamage,
      damageByType: ownRallyDamageByType,
      infantryTiers: ownRallyInfantryByTier,
      cavalryTiers: ownRallyCavalryByTier,
      archerTiers: ownRallyArcherByTier,
    },
    joiners,
    totalDamage,
    ownRallyDamage: calculatedOwnRallyDamage,
    joinedRallyDamage: calculatedJoinedRallyDamage,
    warnings: warnings.length > 0 ? warnings : undefined,
    debugInfo: {
      usedTroops,
      unusedTroops,
      ownRallyRatio: `${Math.round((finalOwnRallyInfantry / (finalOwnRallyInfantry + ownRallyCavalry + ownRallyArcher || 1)) * 100)}% inf : ${Math.round((ownRallyCavalry / (finalOwnRallyInfantry + ownRallyCavalry + ownRallyArcher || 1)) * 100)}% cav : ${Math.round((ownRallyArcher / (finalOwnRallyInfantry + ownRallyCavalry + ownRallyArcher || 1)) * 100)}% arc`,
      joinerRatio,
      ratioExplanation: buildRatioExplanation(
        infantry,
        cavalry,
        archers,
        infFactor,
        cavFactor,
        arcFactor,
        trueGoldLevels.infantry,
        trueGoldLevels.cavalry,
        trueGoldLevels.archer,
        remainingInfantry + finalOwnRallyInfantry,
        remainingCavalry + ownRallyCavalry,
        remainingArcher + ownRallyArcher,
        finalOwnRallyInfantry,
        ownRallyCavalry,
        ownRallyArcher,
        effectiveOwnCap,
        1,
      ),
    },
  };
}

/**
 * Average Player Strategy: Optimize joiners first
 */
function calculateAveragePlayerFormation(
  config: BearTrapConfig,
  stats: BearTrapSecondaryStats,
): RallyFormation {
  const trueGoldLevels = config.inventory.trueGold;

  const archers = getBestTroopsForType(
    config.inventory.items,
    "archer",
    trueGoldLevels.archer,
  );
  const cavalry = getBestTroopsForType(
    config.inventory.items,
    "cavalry",
    trueGoldLevels.cavalry,
  );
  const infantry = getBestTroopsForType(
    config.inventory.items,
    "infantry",
    trueGoldLevels.infantry,
  );

  let remainingArcher = archers.reduce((sum, t) => sum + t.count, 0);
  let remainingCavalry = cavalry.reduce((sum, t) => sum + t.count, 0);
  let remainingInfantry = infantry.reduce((sum, t) => sum + t.count, 0);

  const {
    effectiveMarchCount: avgMarchCount,
    effectiveOwnCap: avgOwnCap,
    effectiveJoinerCap: avgJoinerCap,
    warnings,
  } = computeEffectiveMarchParams(
    remainingInfantry,
    remainingCavalry,
    remainingArcher,
    config.marchCapacity,
    config.joinerLimit,
    config.marchCount,
    config.ownRallyCount,
    config.joinedRallyCount,
    true,
  );

  // Average player: reserve 1/(marchCount+1) of archers for own rally, give the rest to joiners.
  // Then: archers first → cavalry fills → infantry fills the rest.
  const joiners: MarchFormation[] = [];
  const joinerMarchCapacity = avgJoinerCap;

  // ── Tier pools (mutable copies — highest tier first) ─────────────────────
  const infantryRemaining = infantry.map((t) => ({ ...t }));
  const cavalryRemaining = cavalry.map((t) => ({ ...t }));
  const archerRemaining = archers.map((t) => ({ ...t }));

  // ── Global solve: own rally + all joiner marches treated as equal slots ───
  // Target ratio 4% inf : 35% cav : 61% arc (true k²-optimal for T10 troops).
  // Own rally is just one more slot — same ratio target, no special treatment.
  // This ensures every march including own rally gets a decent formation and
  // none is left with only leftover troops.
  // Total capacity = all joiner marches + own rally (treated as one more slot)
  const totalCapacity = avgMarchCount * joinerMarchCapacity + avgOwnCap;

  const globalSplit = computeOptimalSplit(
    totalCapacity,
    remainingArcher,
    remainingCavalry,
    remainingInfantry,
    archers,
    cavalry,
    infantry,
    trueGoldLevels.archer,
    trueGoldLevels.cavalry,
    trueGoldLevels.infantry,
  );

  // Distribute own rally share proportionally by capacity
  const ownCapFraction = avgOwnCap / totalCapacity;
  let ownRallyArcher =
    Math.floor((globalSplit.arch * ownCapFraction) / 10) * 10;
  let ownRallyCavalry =
    Math.floor((globalSplit.cav * ownCapFraction) / 10) * 10;
  let ownRallyInfantry =
    Math.floor((globalSplit.inf * ownCapFraction) / 10) * 10;

  // Cap to own rally capacity and available troops
  const ownTotal = ownRallyArcher + ownRallyCavalry + ownRallyInfantry;
  if (ownTotal > avgOwnCap) {
    // Scale down proportionally if over cap (rare due to floor rounding)
    const scale = avgOwnCap / ownTotal;
    ownRallyArcher = Math.floor((ownRallyArcher * scale) / 10) * 10;
    ownRallyCavalry = Math.floor((ownRallyCavalry * scale) / 10) * 10;
    ownRallyInfantry = Math.floor((ownRallyInfantry * scale) / 10) * 10;
  }
  ownRallyArcher = Math.min(ownRallyArcher, remainingArcher);
  ownRallyCavalry = Math.min(ownRallyCavalry, remainingCavalry);
  ownRallyInfantry = Math.min(ownRallyInfantry, remainingInfantry);

  // Fill any spare own-rally capacity (arc → cav → inf)
  let ownSpare =
    avgOwnCap - ownRallyArcher - ownRallyCavalry - ownRallyInfantry;
  if (ownSpare > 0 && remainingArcher > ownRallyArcher) {
    const e =
      Math.floor(Math.min(ownSpare, remainingArcher - ownRallyArcher) / 100) *
      100;
    ownRallyArcher += e;
    ownSpare -= e;
  }
  if (ownSpare > 0 && remainingCavalry > ownRallyCavalry) {
    const e =
      Math.floor(Math.min(ownSpare, remainingCavalry - ownRallyCavalry) / 100) *
      100;
    ownRallyCavalry += e;
    ownSpare -= e;
  }
  if (ownSpare > 0 && remainingInfantry > ownRallyInfantry) {
    const e =
      Math.floor(
        Math.min(ownSpare, remainingInfantry - ownRallyInfantry) / 100,
      ) * 100;
    ownRallyInfantry += e;
  }

  // ── Joiner marches: count allocation (quantity only, not tiers yet) ────────
  // Joiners run FIRST so they get the best tiers (average player priority:
  // joiner 1 > joiner 2 > ... > joiner N > own rally).
  // Deduct own rally from scalar pools BEFORE joiner allocation so joiners
  // don't claim troops that own rally needs (tier pool stays full for now —
  // joiner tier allocation happens next, then own rally gets what remains).
  const rArchAvg = { value: remainingArcher - ownRallyArcher };
  const rCavAvg = { value: remainingCavalry - ownRallyCavalry };
  const rInfAvg = { value: remainingInfantry - ownRallyInfantry };
  // uniform=true: all joiner marches are identical; rounding remainder stays
  // in the accumulators and gets absorbed into own rally below.
  const marchAllocations = allocateJoinerMarches(
    avgMarchCount,
    joinerMarchCapacity,
    rArchAvg,
    rCavAvg,
    rInfAvg,
    archers,
    cavalry,
    infantry,
    trueGoldLevels.archer,
    trueGoldLevels.cavalry,
    trueGoldLevels.infantry,
    true, // uniform
  );
  // Remainder after uniform joiner allocation — absorb into own rally
  // (arc → cav → inf, capped by own rally capacity).
  const joinerRemainder = {
    arch: rArchAvg.value,
    cav: rCavAvg.value,
    inf: rInfAvg.value,
  };
  let ownCap = avgOwnCap - ownRallyArcher - ownRallyCavalry - ownRallyInfantry;
  for (const type of ["arch", "cav", "inf"] as const) {
    if (ownCap <= 0) break;
    const available = joinerRemainder[type];
    if (available <= 0) continue;
    const extra = Math.floor(Math.min(ownCap, available) / 10) * 10;
    if (type === "arch") ownRallyArcher += extra;
    else if (type === "cav") ownRallyCavalry += extra;
    else ownRallyInfantry += extra;
    joinerRemainder[type] -= extra;
    ownCap -= extra;
  }
  remainingArcher = joinerRemainder.arch;
  remainingCavalry = joinerRemainder.cav;
  remainingInfantry = joinerRemainder.inf;

  // Allocate joiner tiers from the full tier pools (joiners get best tiers first)
  const infantryByTier = allocateTroopsByTier(
    infantryRemaining,
    marchAllocations.map((m) => m.inf),
  );
  const cavalryByTier = allocateTroopsByTier(
    cavalryRemaining,
    marchAllocations.map((m) => m.cav),
  );
  const archerByTier = allocateTroopsByTier(
    archerRemaining,
    marchAllocations.map((m) => m.arch),
  );

  // Subtract joiner tier usage from tier pools
  for (const byTier of infantryByTier) {
    Object.entries(byTier).forEach(([tier, count]) => {
      const tg = infantryRemaining.find((t) => t.tier === parseInt(tier));
      if (tg) tg.count -= count;
    });
  }
  for (const byTier of cavalryByTier) {
    Object.entries(byTier).forEach(([tier, count]) => {
      const tg = cavalryRemaining.find((t) => t.tier === parseInt(tier));
      if (tg) tg.count -= count;
    });
  }
  for (const byTier of archerByTier) {
    Object.entries(byTier).forEach(([tier, count]) => {
      const tg = archerRemaining.find((t) => t.tier === parseInt(tier));
      if (tg) tg.count -= count;
    });
  }

  // Own rally gets whatever tiers remain (lowest priority for average player)
  const ownRallyInfantryByTier = allocateSingleTroopTotal(
    infantryRemaining,
    ownRallyInfantry,
  );
  const ownRallyCavalryByTier = allocateSingleTroopTotal(
    cavalryRemaining,
    ownRallyCavalry,
  );
  const ownRallyArcherByTier = allocateSingleTroopTotal(
    archerRemaining,
    ownRallyArcher,
  );

  // Create joiner march formations with tier data
  for (let i = 0; i < avgMarchCount; i++) {
    const finalInfantry = marchAllocations[i].inf;
    const finalCavalry = marchAllocations[i].cav;
    const finalArcher = marchAllocations[i].arch;

    const marchDamage = calculateRallyDamage(
      finalInfantry,
      finalCavalry,
      finalArcher,
      calculateEffectiveAttackFactor(
        config.inventory.items,
        "infantry",
        DEFAULT_JOINER_STATS.infantry,
      ),
      calculateEffectiveAttackFactor(
        config.inventory.items,
        "cavalry",
        DEFAULT_JOINER_STATS.cavalry,
      ),
      calculateEffectiveAttackFactor(
        config.inventory.items,
        "archer",
        DEFAULT_JOINER_STATS.archer,
      ),
      infantryByTier[i],
      cavalryByTier[i],
      archerByTier[i],
      config.inventory.items,
      config.inventory.trueGold.infantry,
      config.inventory.trueGold.cavalry,
      config.inventory.trueGold.archer,
    );

    const marchDamageByType = calculateRallyDamageByType(
      finalInfantry,
      finalCavalry,
      finalArcher,
      calculateEffectiveAttackFactor(
        config.inventory.items,
        "infantry",
        DEFAULT_JOINER_STATS.infantry,
      ),
      calculateEffectiveAttackFactor(
        config.inventory.items,
        "cavalry",
        DEFAULT_JOINER_STATS.cavalry,
      ),
      calculateEffectiveAttackFactor(
        config.inventory.items,
        "archer",
        DEFAULT_JOINER_STATS.archer,
      ),
      infantryByTier[i],
      cavalryByTier[i],
      archerByTier[i],
      config.inventory.items,
      config.inventory.trueGold.infantry,
      config.inventory.trueGold.cavalry,
      config.inventory.trueGold.archer,
    );

    joiners.push({
      marchIndex: i + 1,
      infantry: finalInfantry,
      cavalry: finalCavalry,
      archer: finalArcher,
      totalTroops: finalInfantry + finalCavalry + finalArcher,
      estimatedDamage: marchDamage,
      damageByType: marchDamageByType,
      infantryTiers: infantryByTier[i],
      cavalryTiers: cavalryByTier[i],
      archerTiers: archerByTier[i],
    });
  }

  const ownRallyDamage = calculateRallyDamage(
    ownRallyInfantry,
    ownRallyCavalry,
    ownRallyArcher,
    calculateEffectiveAttackFactor(
      config.inventory.items,
      "infantry",
      stats.infantry,
      config.trapEnhancementLevel,
    ),
    calculateEffectiveAttackFactor(
      config.inventory.items,
      "cavalry",
      stats.cavalry,
      config.trapEnhancementLevel,
    ),
    calculateEffectiveAttackFactor(
      config.inventory.items,
      "archer",
      stats.archer,
      config.trapEnhancementLevel,
    ),
    ownRallyInfantryByTier,
    ownRallyCavalryByTier,
    ownRallyArcherByTier,
    config.inventory.items,
    config.inventory.trueGold.infantry,
    config.inventory.trueGold.cavalry,
    config.inventory.trueGold.archer,
  );

  const ownRallyDamageByType = calculateRallyDamageByType(
    ownRallyInfantry,
    ownRallyCavalry,
    ownRallyArcher,
    calculateEffectiveAttackFactor(
      config.inventory.items,
      "infantry",
      stats.infantry,
      config.trapEnhancementLevel,
    ),
    calculateEffectiveAttackFactor(
      config.inventory.items,
      "cavalry",
      stats.cavalry,
      config.trapEnhancementLevel,
    ),
    calculateEffectiveAttackFactor(
      config.inventory.items,
      "archer",
      stats.archer,
      config.trapEnhancementLevel,
    ),
    ownRallyInfantryByTier,
    ownRallyCavalryByTier,
    ownRallyArcherByTier,
    config.inventory.items,
    config.inventory.trueGold.infantry,
    config.inventory.trueGold.cavalry,
    config.inventory.trueGold.archer,
  );

  const totalDamage =
    ownRallyDamage + joiners.reduce((sum, m) => sum + m.estimatedDamage, 0);

  // Build tier breakdowns from all allocations (joiners + own rally)
  const allInfantryTiers: Record<number, number> = {
    ...ownRallyInfantryByTier,
  };
  const allCavalryTiers: Record<number, number> = {
    ...ownRallyCavalryByTier,
  };
  const allArcherTiers: Record<number, number> = {
    ...ownRallyArcherByTier,
  };

  // Aggregate tier data from all joiners
  joiners.forEach((march) => {
    if (march.infantryTiers) {
      Object.entries(march.infantryTiers).forEach(([tier, count]) => {
        const tierNum = parseInt(tier);
        allInfantryTiers[tierNum] = (allInfantryTiers[tierNum] || 0) + count;
      });
    }
    if (march.cavalryTiers) {
      Object.entries(march.cavalryTiers).forEach(([tier, count]) => {
        const tierNum = parseInt(tier);
        allCavalryTiers[tierNum] = (allCavalryTiers[tierNum] || 0) + count;
      });
    }
    if (march.archerTiers) {
      Object.entries(march.archerTiers).forEach(([tier, count]) => {
        const tierNum = parseInt(tier);
        allArcherTiers[tierNum] = (allArcherTiers[tierNum] || 0) + count;
      });
    }
  });

  const { usedTroops, unusedTroops } = buildTroopsDebugInfo(
    config.inventory.items,
    allInfantryTiers,
    allCavalryTiers,
    allArcherTiers,
  );

  // Calculate actual joiner ratio from total joiner allocation (all marches combined)
  const totalJoinerInfantry = joiners.reduce((sum, m) => sum + m.infantry, 0);
  const totalJoinerCavalry = joiners.reduce((sum, m) => sum + m.cavalry, 0);
  const totalJoinerArcher = joiners.reduce((sum, m) => sum + m.archer, 0);
  const totalJoinerTroops =
    totalJoinerInfantry + totalJoinerCavalry + totalJoinerArcher;
  const joinerRatio =
    totalJoinerTroops > 0
      ? `${Math.round((totalJoinerInfantry / totalJoinerTroops) * 100)}% inf : ${Math.round((totalJoinerCavalry / totalJoinerTroops) * 100)}% cav : ${Math.round((totalJoinerArcher / totalJoinerTroops) * 100)}% arc`
      : "N/A";

  // Calculate total rally damages for result
  const totalJoinerDamage = joiners.reduce(
    (sum, m) => sum + m.estimatedDamage,
    0,
  );
  const calculatedOwnRallyDamage = ownRallyDamage * config.ownRallyCount;
  const effectiveJoinedRallyCount = Math.round(
    (config.joinedRallyCount * avgMarchCount) / config.marchCount,
  );
  const calculatedJoinedRallyDamage =
    (totalJoinerDamage / avgMarchCount) * (2 / 3) * effectiveJoinedRallyCount;

  return {
    ownRally: {
      marchIndex: 0,
      infantry: ownRallyInfantry,
      cavalry: ownRallyCavalry,
      archer: ownRallyArcher,
      totalTroops: ownRallyInfantry + ownRallyCavalry + ownRallyArcher,
      estimatedDamage: ownRallyDamage,
      damageByType: ownRallyDamageByType,
      infantryTiers: ownRallyInfantryByTier,
      cavalryTiers: ownRallyCavalryByTier,
      archerTiers: ownRallyArcherByTier,
    },
    joiners,
    totalDamage,
    ownRallyDamage: calculatedOwnRallyDamage,
    joinedRallyDamage: calculatedJoinedRallyDamage,
    warnings: warnings.length > 0 ? warnings : undefined,
    debugInfo: {
      usedTroops,
      unusedTroops,
      ownRallyRatio: `${Math.round((ownRallyInfantry / (ownRallyInfantry + ownRallyCavalry + ownRallyArcher || 1)) * 100)}% inf : ${Math.round((ownRallyCavalry / (ownRallyInfantry + ownRallyCavalry + ownRallyArcher || 1)) * 100)}% cav : ${Math.round((ownRallyArcher / (ownRallyInfantry + ownRallyCavalry + ownRallyArcher || 1)) * 100)}% arc`,
      joinerRatio,
      ratioExplanation: buildRatioExplanation(
        infantry,
        cavalry,
        archers,
        (1 + DEFAULT_JOINER_STATS.infantry.attack / 100) *
          (1 + DEFAULT_JOINER_STATS.infantry.lethality / 100),
        (1 + DEFAULT_JOINER_STATS.cavalry.attack / 100) *
          (1 + DEFAULT_JOINER_STATS.cavalry.lethality / 100),
        (1 + DEFAULT_JOINER_STATS.archer.attack / 100) *
          (1 + DEFAULT_JOINER_STATS.archer.lethality / 100),
        trueGoldLevels.infantry,
        trueGoldLevels.cavalry,
        trueGoldLevels.archer,
        archers.reduce((s, t) => s + t.count, 0),
        cavalry.reduce((s, t) => s + t.count, 0),
        infantry.reduce((s, t) => s + t.count, 0),
        ownRallyInfantry,
        ownRallyCavalry,
        ownRallyArcher,
        avgOwnCap,
        null,
      ),
    },
  };
}

/**
 * Pure Joiner Strategy: No own rally
 */
function calculatePureJoinerFormation(
  config: BearTrapConfig,
  stats: BearTrapSecondaryStats,
): RallyFormation {
  const trueGoldLevels = config.inventory.trueGold;

  const archers = getBestTroopsForType(
    config.inventory.items,
    "archer",
    trueGoldLevels.archer,
  );
  const cavalry = getBestTroopsForType(
    config.inventory.items,
    "cavalry",
    trueGoldLevels.cavalry,
  );
  const infantry = getBestTroopsForType(
    config.inventory.items,
    "infantry",
    trueGoldLevels.infantry,
  );

  let remainingArcher = archers.reduce((sum, t) => sum + t.count, 0);
  let remainingCavalry = cavalry.reduce((sum, t) => sum + t.count, 0);
  let remainingInfantry = infantry.reduce((sum, t) => sum + t.count, 0);

  const {
    effectiveMarchCount: joinerMarchCount,
    effectiveJoinerCap: joinerCap,
    warnings,
  } = computeEffectiveMarchParams(
    remainingInfantry,
    remainingCavalry,
    remainingArcher,
    config.marchCapacity,
    config.joinerLimit,
    config.marchCount,
    config.ownRallyCount,
    config.joinedRallyCount,
    false,
  );

  const joiners: MarchFormation[] = [];
  const marchCapacity = joinerCap; // Each march can hold up to (effective) joiner limit

  // Allocate joiner marches: archers first, then cavalry, then infantry
  const rArchJ = { value: remainingArcher };
  const rCavJ = { value: remainingCavalry };
  const rInfJ = { value: remainingInfantry };
  const marchAllocations = allocateJoinerMarches(
    joinerMarchCount,
    marchCapacity,
    rArchJ,
    rCavJ,
    rInfJ,
    archers,
    cavalry,
    infantry,
    trueGoldLevels.archer,
    trueGoldLevels.cavalry,
    trueGoldLevels.infantry,
  );
  remainingArcher = rArchJ.value;
  remainingCavalry = rCavJ.value;
  remainingInfantry = rInfJ.value;

  // Allocate troops by tier to each march (higher tiers to earlier marches)
  const infantryByTier = allocateTroopsByTier(
    infantry,
    marchAllocations.map((m) => m.inf),
  );
  const cavalryByTier = allocateTroopsByTier(
    cavalry,
    marchAllocations.map((m) => m.cav),
  );
  const archerByTier = allocateTroopsByTier(
    archers,
    marchAllocations.map((m) => m.arch),
  );

  // Now create the actual march formations with tier data
  for (let i = 0; i < joinerMarchCount; i++) {
    const finalInfantry = marchAllocations[i].inf;
    const finalCavalry = marchAllocations[i].cav;
    const finalArcher = marchAllocations[i].arch;

    const marchDamage = calculateRallyDamage(
      finalInfantry,
      finalCavalry,
      finalArcher,
      calculateEffectiveAttackFactor(
        config.inventory.items,
        "infantry",
        DEFAULT_JOINER_STATS.infantry,
        config.trapEnhancementLevel,
      ),
      calculateEffectiveAttackFactor(
        config.inventory.items,
        "cavalry",
        DEFAULT_JOINER_STATS.cavalry,
        config.trapEnhancementLevel,
      ),
      calculateEffectiveAttackFactor(
        config.inventory.items,
        "archer",
        DEFAULT_JOINER_STATS.archer,
        config.trapEnhancementLevel,
      ),
      infantryByTier[i],
      cavalryByTier[i],
      archerByTier[i],
      config.inventory.items,
      config.inventory.trueGold.infantry,
      config.inventory.trueGold.cavalry,
      config.inventory.trueGold.archer,
    );

    const marchDamageByType = calculateRallyDamageByType(
      finalInfantry,
      finalCavalry,
      finalArcher,
      calculateEffectiveAttackFactor(
        config.inventory.items,
        "infantry",
        DEFAULT_JOINER_STATS.infantry,
        config.trapEnhancementLevel,
      ),
      calculateEffectiveAttackFactor(
        config.inventory.items,
        "cavalry",
        DEFAULT_JOINER_STATS.cavalry,
        config.trapEnhancementLevel,
      ),
      calculateEffectiveAttackFactor(
        config.inventory.items,
        "archer",
        DEFAULT_JOINER_STATS.archer,
        config.trapEnhancementLevel,
      ),
      infantryByTier[i],
      cavalryByTier[i],
      archerByTier[i],
      config.inventory.items,
      config.inventory.trueGold.infantry,
      config.inventory.trueGold.cavalry,
      config.inventory.trueGold.archer,
    );

    joiners.push({
      marchIndex: i + 1,
      infantry: finalInfantry,
      cavalry: finalCavalry,
      archer: finalArcher,
      totalTroops: finalInfantry + finalCavalry + finalArcher,
      estimatedDamage: marchDamage,
      damageByType: marchDamageByType,
      infantryTiers: infantryByTier[i],
      cavalryTiers: cavalryByTier[i],
      archerTiers: archerByTier[i],
    });

    remainingInfantry -= finalInfantry;
    remainingCavalry -= finalCavalry;
    remainingArcher -= finalArcher;
  }

  const totalDamage = joiners.reduce((sum, m) => sum + m.estimatedDamage, 0);

  // Build tier breakdowns from all joiner allocations
  const allInfantryTiers: Record<number, number> = {};
  const allCavalryTiers: Record<number, number> = {};
  const allArcherTiers: Record<number, number> = {};

  // Aggregate tier data from all joiners
  joiners.forEach((march) => {
    if (march.infantryTiers) {
      Object.entries(march.infantryTiers).forEach(([tier, count]) => {
        const tierNum = parseInt(tier);
        allInfantryTiers[tierNum] = (allInfantryTiers[tierNum] || 0) + count;
      });
    }
    if (march.cavalryTiers) {
      Object.entries(march.cavalryTiers).forEach(([tier, count]) => {
        const tierNum = parseInt(tier);
        allCavalryTiers[tierNum] = (allCavalryTiers[tierNum] || 0) + count;
      });
    }
    if (march.archerTiers) {
      Object.entries(march.archerTiers).forEach(([tier, count]) => {
        const tierNum = parseInt(tier);
        allArcherTiers[tierNum] = (allArcherTiers[tierNum] || 0) + count;
      });
    }
  });

  const { usedTroops, unusedTroops } = buildTroopsDebugInfo(
    config.inventory.items,
    allInfantryTiers,
    allCavalryTiers,
    allArcherTiers,
  );

  // Calculate actual joiner ratio from total joiner allocation (all marches combined)
  const totalJoinerInfantry = joiners.reduce((sum, m) => sum + m.infantry, 0);
  const totalJoinerCavalry = joiners.reduce((sum, m) => sum + m.cavalry, 0);
  const totalJoinerArcher = joiners.reduce((sum, m) => sum + m.archer, 0);
  const totalJoinerTroops =
    totalJoinerInfantry + totalJoinerCavalry + totalJoinerArcher;
  const joinerRatio =
    totalJoinerTroops > 0
      ? `${Math.round((totalJoinerInfantry / totalJoinerTroops) * 100)}% inf : ${Math.round((totalJoinerCavalry / totalJoinerTroops) * 100)}% cav : ${Math.round((totalJoinerArcher / totalJoinerTroops) * 100)}% arc`
      : "N/A";

  // Calculate total rally damages for result
  const effectiveJoinedRallyCount = Math.round(
    (config.joinedRallyCount * joinerMarchCount) / config.marchCount,
  );
  const calculatedJoinedRallyDamage =
    (totalDamage / joinerMarchCount) * (2 / 3) * effectiveJoinedRallyCount;

  return {
    ownRally: {
      marchIndex: 0,
      infantry: 0,
      cavalry: 0,
      archer: 0,
      totalTroops: 0,
      estimatedDamage: 0,
      infantryTiers: {},
      cavalryTiers: {},
      archerTiers: {},
    },
    joiners,
    totalDamage,
    ownRallyDamage: 0,
    joinedRallyDamage: calculatedJoinedRallyDamage,
    warnings: warnings.length > 0 ? warnings : undefined,
    debugInfo: {
      usedTroops,
      unusedTroops,
      joinerRatio,
      ratioExplanation: buildRatioExplanation(
        infantry,
        cavalry,
        archers,
        (1 + DEFAULT_JOINER_STATS.infantry.attack / 100) *
          (1 + DEFAULT_JOINER_STATS.infantry.lethality / 100),
        (1 + DEFAULT_JOINER_STATS.cavalry.attack / 100) *
          (1 + DEFAULT_JOINER_STATS.cavalry.lethality / 100),
        (1 + DEFAULT_JOINER_STATS.archer.attack / 100) *
          (1 + DEFAULT_JOINER_STATS.archer.lethality / 100),
        trueGoldLevels.infantry,
        trueGoldLevels.cavalry,
        trueGoldLevels.archer,
        archers.reduce((s, t) => s + t.count, 0),
        cavalry.reduce((s, t) => s + t.count, 0),
        infantry.reduce((s, t) => s + t.count, 0),
        totalJoinerInfantry,
        totalJoinerCavalry,
        totalJoinerArcher,
        marchCapacity,
        null,
      ),
    },
  };
}

/**
 * Main calculation function - routes to appropriate strategy
 */
export function calculateBearTrapFormation(
  config: BearTrapConfig,
  secondaryStats: BearTrapSecondaryStats,
): RallyFormation {
  let formation: RallyFormation;
  switch (config.playerType) {
    case "strong":
      formation = calculateStrongPlayerFormation(config, secondaryStats);
      break;
    case "average":
      formation = calculateAveragePlayerFormation(config, secondaryStats);
      break;
    case "joiner":
      formation = calculatePureJoinerFormation(config, secondaryStats);
      break;
    default:
      formation = calculateAveragePlayerFormation(config, secondaryStats);
  }

  // Test 2 insight: alliance rally activity has a 3.3× larger impact on event
  // score than troop composition. Warn the user when rally frequency is low
  // (< 3 rallies joined per march slot) so they focus on the right lever.
  //
  // Threshold: joinedRallyCount / marchCount < 3
  // Exception: joiner-only mode (marchCount = 0 or no own-rally context)
  if (config.playerType !== "joiner" && config.marchCount > 0) {
    const ralliesPerSlot = config.joinedRallyCount / config.marchCount;
    if (ralliesPerSlot < 3) {
      const activityWarning =
        `Low alliance activity detected (${config.joinedRallyCount} rallies joined across ${config.marchCount} march slots = ` +
        `${ralliesPerSlot.toFixed(1)} rallies/slot). ` +
        `Rally participation has a 3× bigger impact on your event score than troop optimisation — ` +
        `encouraging your alliance to open more rallies will matter more than adjusting march composition.`;
      formation = {
        ...formation,
        warnings: [activityWarning, ...(formation.warnings ?? [])],
      };
    }
  }

  return formation;
}
