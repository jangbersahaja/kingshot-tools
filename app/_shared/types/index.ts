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
  debugInfo?: {
    usedTroops: Record<string, number>; // troopId -> count used
    unusedTroops: Record<string, number>; // troopId -> count unused
    ownRallyRatio?: string; // e.g., "4:24:72 (inf:cav:arc)"
    joinerRatio?: string; // e.g., "10:25:65 (inf:cav:arc)"
  };
}

// Bear Trap Event Configuration
export interface BearTrapConfig {
  inventory: TroopInventory;
  marchCapacity: number;
  joinerLimit: number;
  marchCount: number;
  trapEnhancementLevel: number;
  playerType: "strong" | "average" | "joiner";
  ownRallyCount: number;
  joinedRallyCount: number;
}

export interface BattleStatsInput {
  attack: number;
  defense: number;
  lethality: number;
  health: number;
}

export type BearTrapSecondaryStats = Record<TroopType, BattleStatsInput>;

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
