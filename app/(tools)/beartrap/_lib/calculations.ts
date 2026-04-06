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
  const grouped: Record<string, { type: string; tier: number; count: number }> = {};
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
  // If tier data not provided or empty, use simplified calculation
  if (
    !infantryTiers ||
    !cavalryTiers ||
    !archerTiers ||
    !troops ||
    Object.keys(infantryTiers).length === 0
  ) {
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
      // Add extra for TG3 T10 archers
      if (tier === 10) {
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
  // If tier data not provided or empty, use simplified calculation
  if (
    !infantryTiers ||
    !cavalryTiers ||
    !archerTiers ||
    !troops ||
    Object.keys(infantryTiers).length === 0
  ) {
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
      // Add extra for TG3 T10 archers
      if (tier === 10) {
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
 * Allocate troops by tier, preferring higher tiers to earlier marches
 * Returns tier breakdown for each march
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

        // Move to next tier when current is exhausted
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
} /**
 * Strong Player Strategy: Optimize own rally first
 */
function calculateStrongPlayerFormation(
  config: BearTrapConfig,
  stats: BearTrapSecondaryStats,
): RallyFormation {
  const ownRallyCapacity = config.marchCapacity;
  const joinerLimit = config.joinerLimit;
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

  // Own rally: 4:24:72 ratio + fill remaining with cavalry (all rounded to 100)
  const ownRallyInfantry =
    Math.floor(
      Math.min(remainingInfantry, Math.floor(ownRallyCapacity * 0.04)) / 100,
    ) * 100;
  remainingInfantry -= ownRallyInfantry;

  const ownRallyArcher =
    Math.floor(
      Math.min(remainingArcher, Math.floor(ownRallyCapacity * 0.72)) / 100,
    ) * 100;
  remainingArcher -= ownRallyArcher;

  // Fill base cavalry slot (rounded to 100)
  let ownRallyCavalry =
    Math.floor(
      Math.min(remainingCavalry, Math.floor(ownRallyCapacity * 0.24)) / 100,
    ) * 100;
  remainingCavalry -= ownRallyCavalry;

  // Fill remaining capacity with cavalry (rounded to 100)
  const remainingOwnRallyCapacity =
    ownRallyCapacity - ownRallyInfantry - ownRallyCavalry - ownRallyArcher;
  if (remainingOwnRallyCapacity > 0 && remainingCavalry > 0) {
    const extraCavalry =
      Math.floor(Math.min(remainingOwnRallyCapacity, remainingCavalry) / 100) *
      100;
    ownRallyCavalry += extraCavalry;
    remainingCavalry -= extraCavalry;
  }

  // Own rally damage will be recalculated after tier allocation with proper tier data
  let ownRallyDamage = 0;

  // Allocate own rally troops by tier FIRST (highest tiers first)
  // 1. Divide remaining archers evenly across all marches
  // 2. Set infantry to 5% minimum per march
  // 3. Fill remaining space with cavalry
  // 4. If cavalry runs out, increase infantry for remaining marches
  // All values rounded to nearest 100
  const joiners: MarchFormation[] = [];
  const marchCapacity = joinerLimit; // Each march can hold up to joiner limit

  // Calculate per-march allocation
  const archerPerMarch =
    Math.floor(remainingArcher / config.marchCount / 100) * 100;
  const infantryMinimum = Math.floor((marchCapacity * 0.05) / 100) * 100; // 5% = 3,250 per march

  // Pre-calculate all march allocations to distribute tiers properly
  const marchAllocations: { inf: number; cav: number; arch: number }[] = [];

  for (let i = 0; i < config.marchCount; i++) {
    // Step 1: Allocate archers (evenly divided, rounded to 100)
    const archerAllocation = archerPerMarch;

    // Step 2: Set infantry to minimum
    let finalInfantry = Math.min(infantryMinimum, remainingInfantry);

    // Step 3: Fill remaining space with cavalry (rounded to 100)
    const cavalrySpace = Math.max(
      0,
      marchCapacity - finalInfantry - archerAllocation,
    );
    const finalCavalry =
      Math.floor(Math.min(cavalrySpace, remainingCavalry) / 100) * 100;

    // Step 4: If cavalry runs out, increase infantry to fill remaining space (rounded to 100)
    const spaceAfterCavalry =
      marchCapacity - finalInfantry - finalCavalry - archerAllocation;
    if (spaceAfterCavalry > 0 && remainingInfantry - finalInfantry > 0) {
      const additionalInfantry =
        Math.floor(
          Math.min(spaceAfterCavalry, remainingInfantry - finalInfantry) / 100,
        ) * 100;
      finalInfantry += additionalInfantry;
    }

    // Update remaining troops
    remainingArcher -= archerAllocation;
    remainingInfantry -= finalInfantry;
    remainingCavalry -= finalCavalry;

    marchAllocations.push({
      inf: finalInfantry,
      cav: finalCavalry,
      arch: archerAllocation,
    });
  }

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
  for (let i = 0; i < config.marchCount; i++) {
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
        stats.infantry,
      ),
      calculateEffectiveAttackFactor(
        config.inventory.items,
        "cavalry",
        stats.cavalry,
      ),
      calculateEffectiveAttackFactor(
        config.inventory.items,
        "archer",
        stats.archer,
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
        stats.infantry,
      ),
      calculateEffectiveAttackFactor(
        config.inventory.items,
        "cavalry",
        stats.cavalry,
      ),
      calculateEffectiveAttackFactor(
        config.inventory.items,
        "archer",
        stats.archer,
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

  // Now calculate own rally damage with tier data
  ownRallyDamage = calculateRallyDamage(
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

  // Calculate total rally damages for result
  const totalJoinerDamage = joiners.reduce(
    (sum, m) => sum + m.estimatedDamage,
    0,
  );
  const calculatedOwnRallyDamage = ownRallyDamage * config.ownRallyCount;
  const calculatedJoinedRallyDamage =
    (totalJoinerDamage / config.marchCount) * (2 / 3) * config.joinedRallyCount;

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
    debugInfo: {
      usedTroops,
      unusedTroops,
      ownRallyRatio: `${Math.round((ownRallyInfantry / (ownRallyInfantry + ownRallyCavalry + ownRallyArcher || 1)) * 100)}% inf : ${Math.round((ownRallyCavalry / (ownRallyInfantry + ownRallyCavalry + ownRallyArcher || 1)) * 100)}% cav : ${Math.round((ownRallyArcher / (ownRallyInfantry + ownRallyCavalry + ownRallyArcher || 1)) * 100)}% arc`,
      joinerRatio,
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
  const ownRallyCapacity = config.marchCapacity;
  const joinerLimit = config.joinerLimit;
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

  // Joiners FIRST but fair share of archers to own rally
  // Divide ALL archers across (marchCount + 1) for fair distribution
  const joiners: MarchFormation[] = [];
  const joinerMarchCapacity = joinerLimit;

  // Infantry and cavalry per march: 5% minimum + fill with cavalry
  const infantryTarget = Math.floor((joinerMarchCapacity * 0.05) / 100) * 100; // 3,250 per march
  const infantryOwnRally = Math.floor((ownRallyCapacity * 0.05) / 100) * 100;

  // Divide archers across joiners + own rally (rounded to 100)
  const totalArchersToAllocate = remainingArcher;
  const archersPerMarch =
    Math.floor(totalArchersToAllocate / (config.marchCount + 1) / 100) * 100;
  const archersOwnRally = archersPerMarch; // Own rally gets same per-march share

  // Pre-calculate all joiner march allocations
  const marchAllocations: { inf: number; cav: number; arch: number }[] = [];

  for (let i = 0; i < config.marchCount; i++) {
    // Each march gets equal archer share (rounded to 100)
    const finalArcher =
      Math.floor(Math.min(archersPerMarch, remainingArcher) / 100) * 100;

    // Infantry: 5% minimum
    let finalInfantry =
      Math.floor(Math.min(infantryTarget, remainingInfantry) / 100) * 100;

    // Cavalry: fill remaining space
    const finalCavalry =
      Math.floor(
        Math.min(
          joinerMarchCapacity - finalInfantry - finalArcher,
          remainingCavalry,
        ) / 100,
      ) * 100;

    // If cavalry runs out, increase infantry
    const spaceAfterCavalry =
      joinerMarchCapacity - finalInfantry - finalCavalry - finalArcher;
    if (spaceAfterCavalry > 0 && remainingInfantry - finalInfantry > 0) {
      const extraInfantry =
        Math.floor(
          Math.min(spaceAfterCavalry, remainingInfantry - finalInfantry) / 100,
        ) * 100;
      finalInfantry += extraInfantry;
    }

    // Update remaining troops
    remainingArcher -= finalArcher;
    remainingInfantry -= finalInfantry;
    remainingCavalry -= finalCavalry;

    marchAllocations.push({
      inf: finalInfantry,
      cav: finalCavalry,
      arch: finalArcher,
    });
  }

  // Own rally: gets fair share of archers + leftover troops
  const ownRallyArcher =
    Math.floor(Math.min(archersOwnRally, remainingArcher) / 100) * 100;
  let ownRallyInfantry =
    Math.floor(Math.min(infantryOwnRally, remainingInfantry) / 100) * 100;
  const ownRallyCavalry =
    Math.floor(
      Math.min(
        ownRallyCapacity - ownRallyInfantry - ownRallyArcher,
        remainingCavalry,
      ) / 100,
    ) * 100;

  // If cavalry runs out, increase infantry
  const ownRallySpaceAfterCavalry =
    ownRallyCapacity - ownRallyInfantry - ownRallyCavalry - ownRallyArcher;
  if (
    ownRallySpaceAfterCavalry > 0 &&
    remainingInfantry - ownRallyInfantry > 0
  ) {
    const extraInfantry =
      Math.floor(
        Math.min(
          ownRallySpaceAfterCavalry,
          remainingInfantry - ownRallyInfantry,
        ) / 100,
      ) * 100;
    ownRallyInfantry += extraInfantry;
  }

  // Allocate troops by tier: joiners FIRST (higher tiers to earlier marches)
  const infantryRemaining = infantry.map((t) => ({ ...t }));
  const cavalryRemaining = cavalry.map((t) => ({ ...t }));
  const archerRemaining = archers.map((t) => ({ ...t }));

  // Allocate joiner tiers from full pool
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

  // Subtract joiner allocations from tier groups
  infantryByTier.forEach((tierMap) => {
    Object.entries(tierMap).forEach(([tier, count]) => {
      const tierNum = parseInt(tier);
      const tierGroup = infantryRemaining.find((t) => t.tier === tierNum);
      if (tierGroup) tierGroup.count -= count;
    });
  });
  cavalryByTier.forEach((tierMap) => {
    Object.entries(tierMap).forEach(([tier, count]) => {
      const tierNum = parseInt(tier);
      const tierGroup = cavalryRemaining.find((t) => t.tier === tierNum);
      if (tierGroup) tierGroup.count -= count;
    });
  });
  archerByTier.forEach((tierMap) => {
    Object.entries(tierMap).forEach(([tier, count]) => {
      const tierNum = parseInt(tier);
      const tierGroup = archerRemaining.find((t) => t.tier === tierNum);
      if (tierGroup) tierGroup.count -= count;
    });
  });

  // NOW allocate own rally troops by tier from remaining pools
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
  for (let i = 0; i < config.marchCount; i++) {
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
  const calculatedJoinedRallyDamage =
    (totalJoinerDamage / config.marchCount) * (2 / 3) * config.joinedRallyCount;

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
    debugInfo: {
      usedTroops,
      unusedTroops,
      ownRallyRatio: `${Math.round((ownRallyInfantry / (ownRallyInfantry + ownRallyCavalry + ownRallyArcher || 1)) * 100)}% inf : ${Math.round((ownRallyCavalry / (ownRallyInfantry + ownRallyCavalry + ownRallyArcher || 1)) * 100)}% cav : ${Math.round((ownRallyArcher / (ownRallyInfantry + ownRallyCavalry + ownRallyArcher || 1)) * 100)}% arc`,
      joinerRatio,
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
  const joinerLimit = config.joinerLimit;
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

  const joiners: MarchFormation[] = [];
  const marchCapacity = joinerLimit; // Each march can hold up to joiner limit

  // Calculate per-march allocation based on 5:5:90 ratio (all rounded to 100)
  const infantryTarget = Math.floor((marchCapacity * 0.05) / 100) * 100; // 3,250 per march
  const cavalryTarget = Math.floor((marchCapacity * 0.05) / 100) * 100; // 3,250 per march

  // Divide total remaining archers across all marches (rounded to 100)
  const archersPerMarch =
    Math.floor(remainingArcher / config.marchCount / 100) * 100;

  // Pre-calculate all march allocations to distribute tiers properly
  const marchAllocations: { inf: number; cav: number; arch: number }[] = [];

  // Target ratio: 5:5:90 (Infantry:Cavalry:Archer)
  for (let i = 0; i < config.marchCount; i++) {
    // Allocate archers equally across all marches (rounded to 100)
    const finalArcher =
      Math.floor(Math.min(archersPerMarch, remainingArcher) / 100) * 100;

    const finalInfantry =
      Math.floor(Math.min(infantryTarget, remainingInfantry) / 100) * 100;
    const finalCavalry =
      Math.floor(Math.min(cavalryTarget, remainingCavalry) / 100) * 100;

    // Fill remaining capacity with cavalry if needed to reach march capacity (rounded to 100)
    let finalCavalryAdjusted = finalCavalry;
    const remainingCapacity =
      marchCapacity - finalArcher - finalInfantry - finalCavalry;
    if (remainingCapacity > 0 && remainingCavalry > finalCavalry) {
      const extraCavalry =
        Math.floor(
          Math.min(remainingCapacity, remainingCavalry - finalCavalry) / 100,
        ) * 100;
      finalCavalryAdjusted += extraCavalry;
    }

    // Update remaining troops
    remainingArcher -= finalArcher;
    remainingInfantry -= finalInfantry;
    remainingCavalry -= finalCavalryAdjusted;

    marchAllocations.push({
      inf: finalInfantry,
      cav: finalCavalryAdjusted,
      arch: finalArcher,
    });
  }

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
  for (let i = 0; i < config.marchCount; i++) {
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
  const calculatedJoinedRallyDamage =
    (totalDamage / config.marchCount) * (2 / 3) * config.joinedRallyCount;

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
    debugInfo: {
      usedTroops,
      unusedTroops,
      joinerRatio,
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
  switch (config.playerType) {
    case "strong":
      return calculateStrongPlayerFormation(config, secondaryStats);
    case "average":
      return calculateAveragePlayerFormation(config, secondaryStats);
    case "joiner":
      return calculatePureJoinerFormation(config, secondaryStats);
    default:
      return calculateAveragePlayerFormation(config, secondaryStats);
  }
}
