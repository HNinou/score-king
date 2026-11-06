// Lecture validée des données stockées et import/export au format commun.
import type { Game, Player, Round, Settings } from './model';

export interface StoredState {
  games: Game[];
  currentId: string | null;
  recentNames: string[];
  lastSettings: Settings | null;
  lastPlayers: Player[];
  prefs?: unknown;
}

type Obj = Record<string, unknown>;
const isObj = (x: unknown): x is Obj => typeof x === 'object' && x !== null && !Array.isArray(x);
const isInt = (x: unknown): x is number => typeof x === 'number' && Number.isInteger(x);
const isStr = (x: unknown): x is string => typeof x === 'string';
const isBool = (x: unknown): x is boolean => typeof x === 'boolean';

function isPlayer(x: unknown): x is Player {
  return isObj(x) && isStr(x.id) && isStr(x.name) && isStr(x.emblem) && isStr(x.color);
}

function isSettings(x: unknown): x is Settings {
  if (!isObj(x)) return false;
  const e = x.expansions;
  return (
    (x.scoring === 'skullKing' || x.scoring === 'rascal') &&
    isBool(x.cannonEnabled) &&
    isStr(x.preset) &&
    Array.isArray(x.cardsPerRound) &&
    x.cardsPerRound.length > 0 &&
    x.cardsPerRound.every((c) => isInt(c) && c >= 1) &&
    isObj(e) &&
    isBool(e.loot) &&
    isBool(e.kraken) &&
    isBool(e.whiteWhale) &&
    isBool(x.pirateAbilities) &&
    isBool(x.originalEdition) &&
    isInt(x.firstDealerIndex)
  );
}

function isRound(x: unknown): x is Round {
  if (!isObj(x)) return false;
  return (
    isInt(x.index) &&
    isInt(x.cardsDealt) &&
    (x.phase === 'bids' || x.phase === 'tricks' || x.phase === 'done') &&
    isInt(x.destroyedTricks) &&
    (x.voided === undefined || isBool(x.voided)) &&
    Array.isArray(x.lootAlliances) &&
    x.lootAlliances.every((a) => isObj(a) && isStr(a.playedBy) && isStr(a.capturedBy)) &&
    Array.isArray(x.entries) &&
    x.entries.every(
      (e) =>
        isObj(e) &&
        isStr(e.playerId) &&
        (e.bid === null || isInt(e.bid)) &&
        (e.tricks === null || isInt(e.tricks)) &&
        isInt(e.harryAdjustment) &&
        isInt(e.rascalWager) &&
        (e.cannon === 'grapeshot' || e.cannon === 'cannonball') &&
        isObj(e.bonus) &&
        isInt(e.bonus.standard14) &&
        isBool(e.bonus.black14) &&
        isInt(e.bonus.piratesBySkullKing) &&
        isBool(e.bonus.skullKingByMermaid) &&
        isInt(e.bonus.mermaidsByPirate),
    )
  );
}

export function isGame(x: unknown): x is Game {
  return (
    isObj(x) &&
    x.schemaVersion === 1 &&
    isStr(x.id) &&
    isStr(x.createdAt) &&
    isStr(x.updatedAt) &&
    (x.status === 'inProgress' || x.status === 'finished' || x.status === 'abandoned') &&
    Array.isArray(x.players) &&
    x.players.length >= 2 &&
    x.players.every(isPlayer) &&
    isSettings(x.settings) &&
    Array.isArray(x.rounds) &&
    x.rounds.every(isRound)
  );
}

export function parseStored(x: unknown): StoredState | null {
  if (!isObj(x) || !Array.isArray(x.games) || !x.games.every(isGame)) return null;
  return {
    games: x.games,
    currentId: isStr(x.currentId) ? x.currentId : null,
    recentNames: Array.isArray(x.recentNames) ? x.recentNames.filter(isStr) : [],
    lastSettings: isSettings(x.lastSettings) ? x.lastSettings : null,
    lastPlayers: Array.isArray(x.lastPlayers) ? x.lastPlayers.filter(isPlayer) : [],
    prefs: x.prefs,
  };
}

export function exportGames(games: Game[]): string {
  return JSON.stringify({ app: 'score-king', exportVersion: 1, games }, null, 2);
}

/** Renvoie les parties valides d'un fichier d'export, ou null si le fichier est invalide. */
export function importGames(text: string): Game[] | null {
  try {
    const x = JSON.parse(text) as unknown;
    if (!isObj(x) || x.app !== 'score-king' || x.exportVersion !== 1 || !Array.isArray(x.games)) return null;
    return x.games.every(isGame) ? x.games : null;
  } catch {
    return null;
  }
}
