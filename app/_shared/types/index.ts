/**
 * Core type definitions for kingshot-tools
 */

// Troop/Unit Types
export type TroopType = "infantry" | "archer" | "cavalry";

export interface Troop {
  id: string;
  name: string;
  type: TroopType;
  power: number;
  attack: number;
  defense: number;
  health: number;
  lethality: number;
  speed: number;
  load: number;
  true_attack: number;
}

export interface TroopConfig {
  troopId: string;
  count: number;
  level: number;
}

export interface Squad {
  id: string;
  troops: TroopConfig[];
  totalAttack: number;
  totalDefense: number;
  totalHealth: number;
  estimatedDPS: number;
}

// Troop Inventory Management
export type TroopTier = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
export type TrueGoldLevel = 0 | 1 | 2 | 3;

export interface TroopInventoryItem {
  id: string;
  type: TroopType;
  tier: TroopTier;
  count: number;
}

export interface TroopInventory {
  items: TroopInventoryItem[];
  trueGold: Record<TroopType, TrueGoldLevel>;
}

// Formation structures
export interface TroopFormation {
  infantry: number;
  cavalry: number;
  archer: number;
  totalTroops: number;
  estimatedDamage: number;
  damageByType?: {
    infantry: number;
    cavalry: number;
    archer: number;
  };
}

export interface MarchFormation extends TroopFormation {
  marchIndex: number;
  infantryTiers?: Record<number, number>; // tier -> count
  cavalryTiers?: Record<number, number>; // tier -> count
  archerTiers?: Record<number, number>; // tier -> count
}

export interface RallyFormation {
  ownRally: MarchFormation;
  joiners: MarchFormation[];
  totalDamage: number;
  ownRallyDamage?: number; // Own Rally Damage = per rally damage x own rally organized count
  joinedRallyDamage?: number; // Joined Rally Damage = (sum of all joiner march damage) x 2/3 x joined rally count
  /** Warnings shown to the user when inventory is too small to fill all configured slots */
  warnings?: string[];
  debugInfo?: {
    usedTroops: Record<string, number>; // troopId -> count used
    unusedTroops: Record<string, number>; // troopId -> count unused
    ownRallyRatio?: string; // e.g., "4:24:72 (inf:cav:arc)"
    joinerRatio?: string; // e.g., "10:25:65 (inf:cav:arc)"
    /** Step-by-step breakdown of how the optimal ratio was derived */
    ratioExplanation?: {
      /** Weighted true_attack per type from inventory tier mix */
      tierK: { infantry: number; cavalry: number; archer: number };
      /** Archer extra multipliers: ranged-strike, T7+, TG3 */
      archerMults: { rangedStrike: number; t7Plus: boolean; tg3T10: boolean };
      /** Player's personal attack factor A = (1+atk%)×(1+leth%) */
      attackFactor: { infantry: number; cavalry: number; archer: number };
      /** Final k per type = tierK × mults × A */
      finalK: { infantry: number; cavalry: number; archer: number };
      /** k²-optimal ratio before supply/capacity constraints */
      idealRatio: { infantry: number; cavalry: number; archer: number };
      /** Actual ratio used in the formation after constraints */
      usedRatio: { infantry: number; cavalry: number; archer: number };
      /** Whether supply ran out for any type, forcing a suboptimal ratio */
      supplyConstrained: {
        infantry: boolean;
        cavalry: boolean;
        archer: boolean;
      };
      /** Whether march capacity forced a cap on any type */
      capacityConstrained: boolean;
      /** Grid search resolution in % (strong path only, null for average) */
      gridStep: number | null;
    };
  };
}

/** Troop ratio as percentages (infantry + cavalry + archer should sum to 100) */
export interface TroopRatio {
  infantry: number;
  cavalry: number;
  archer: number;
}

// Bear Trap Event Configuration
export interface BearTrapConfig {
  inventory: TroopInventory;
  marchCapacity: number;
  joinerLimit: number;
  marchCount: number;
  trapEnhancementLevel: number;
  playerType: "strong" | "average" | "joiner" | "custom";
  ownRallyCount: number;
  joinedRallyCount: number;
  /** Custom ratio targets — only used when playerType === "custom" */
  customRatio?: {
    ownRally: TroopRatio;
    joiner: TroopRatio;
  };
}

export interface BattleStatsInput {
  attack: number;
  defense: number;
  lethality: number;
  health: number;
}

export type BearTrapSecondaryStats = Record<TroopType, BattleStatsInput>;

// Bear Trap Profiles
export interface BearTrapProfile {
  id: string;
  name: string;
  config: BearTrapConfig;
  secondaryStats: BearTrapSecondaryStats;
  savedAt: number; // Date.now()
}

// Calculation Results
export interface FormationRecommendation {
  id: string;
  name: string;
  description: string;
  squads: Squad[];
  totalDamage: number;
  estimatedCompletionTime: number;
  efficiency: number;
  powerTier: "strong" | "average" | "joiner";
}

export interface CalculationResult {
  config: BearTrapConfig;
  secondaryStats: BearTrapSecondaryStats;
  formation: RallyFormation;
  recommendations: FormationRecommendation[];
  selectedRecommendation?: FormationRecommendation;
}
