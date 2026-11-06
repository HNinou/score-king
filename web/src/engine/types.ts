// Types du moteur de calcul. Aucune dépendance UI.

export type Scoring = 'skullKing' | 'rascal';
export type Cannon = 'grapeshot' | 'cannonball';
export type PresetKey =
  | 'standard'
  | 'evenKeeled'
  | 'skipToTheBrawl'
  | 'swiftAndSalty'
  | 'broadsideBarrage'
  | 'whirlpool'
  | 'pastYourBedtime'
  | 'custom';

export interface Bonus {
  standard14: number;
  black14: boolean;
  piratesBySkullKing: number;
  skullKingByMermaid: boolean;
  mermaidsByPirate: number;
}

export interface Expansions {
  loot: boolean;
  kraken: boolean;
  whiteWhale: boolean;
}

export interface Rules {
  scoring: Scoring;
  skullKingByMermaidBonus: number;
  mermaidByPirateBonusEnabled: boolean;
  /** Règle maison : les bonus de cartes comptent même si le pari est raté (le Butin garde sa règle). */
  bonusAlwaysCounts: boolean;
}

/** Saisie d'un joueur pour une manche (forme compacte des fixtures, champs optionnels = défaut). */
export interface PlayerRoundInput {
  id: string;
  bid: number;
  tricks: number;
  harryAdjustment?: number;
  rascalWager?: number;
  cannon?: string;
  bonus?: Partial<Bonus>;
}

export interface LootAlliance {
  playedBy: string;
  capturedBy: string;
}

export interface RoundInput {
  cardsDealt: number;
  players: PlayerRoundInput[];
  destroyedTricks?: number;
  lootAlliances?: LootAlliance[];
}

export interface RoundResult {
  bidPoints: number;
  bonusPoints: number;
  wagerPoints: number;
  total: number;
}

export interface ScheduleSetup {
  playerCount: number;
  preset: PresetKey;
  expansions?: Partial<Expansions>;
  custom?: number[];
}

export interface ValidationSetup {
  expansions?: Partial<Expansions>;
}

export type ErrorCode =
  | 'BID_OUT_OF_RANGE'
  | 'TRICKS_OUT_OF_RANGE'
  | 'HARRY_INVALID'
  | 'WAGER_INVALID'
  | 'CANNON_INVALID'
  | 'DESTROYED_TRICKS_INVALID'
  | 'TRICKS_SUM_MISMATCH'
  | 'BONUS_NEGATIVE'
  | 'BONUS_WITHOUT_TRICK'
  | 'STANDARD14_TOTAL_EXCEEDED'
  | 'BLACK14_TOTAL_EXCEEDED'
  | 'SKULL_KING_CAPTURE_CONFLICT'
  | 'PIRATES_BY_SK_EXCEEDED'
  | 'MERMAIDS_BY_PIRATE_EXCEEDED'
  | 'LOOT_INVALID';

export const ERROR_CODES: readonly ErrorCode[] = [
  'BID_OUT_OF_RANGE',
  'TRICKS_OUT_OF_RANGE',
  'HARRY_INVALID',
  'WAGER_INVALID',
  'CANNON_INVALID',
  'DESTROYED_TRICKS_INVALID',
  'TRICKS_SUM_MISMATCH',
  'BONUS_NEGATIVE',
  'BONUS_WITHOUT_TRICK',
  'STANDARD14_TOTAL_EXCEEDED',
  'BLACK14_TOTAL_EXCEEDED',
  'SKULL_KING_CAPTURE_CONFLICT',
  'PIRATES_BY_SK_EXCEEDED',
  'MERMAIDS_BY_PIRATE_EXCEEDED',
  'LOOT_INVALID',
];
