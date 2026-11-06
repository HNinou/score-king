// Distribution des portraits : pièces de chaque pirate (dessinés dans avatars.tsx).

type Hat = 'tricorne' | 'bandana' | 'bicorne' | 'feather' | 'knit' | 'scarf' | 'none';
type Hair = 'none' | 'short' | 'long' | 'braids' | 'curly' | 'ponytail';
type Beard = 'none' | 'full' | 'goatee' | 'stubble' | 'braided' | 'sideburns';
type Mustache = 'none' | 'thin' | 'handlebar' | 'walrus';

export interface PirateLook {
  id: string;
  name: string;
  skin: string;
  hat: Hat;
  hatColor: string;
  hair: Hair;
  hairColor: string;
  beard: Beard;
  mustache: Mustache;
  coat: string;
  iris: string;
  skull?: boolean;
  eyepatch?: boolean;
  scar?: boolean;
  earring?: boolean;
  goldTooth?: boolean;
  parrot?: boolean;
  freckles?: boolean;
  wrinkles?: boolean;
  brows: 'grumpy' | 'raised' | 'calm';
  mouth: 'snarl' | 'smirk' | 'open' | 'flat';
}

export const PIRATES: readonly PirateLook[] = [
  { id: 'redbeard', name: 'Barbe-Rousse', skin: '#D3A07A', hat: 'tricorne', hatColor: '#24201E', hair: 'short', hairColor: '#8E3A1C', beard: 'full', mustache: 'walrus', coat: '#4E1A18', iris: '#5D7F8C', scar: true, brows: 'grumpy', mouth: 'snarl', earring: true, wrinkles: true },
  { id: 'glasseye', name: "L'Œil-de-Verre", skin: '#A9744F', hat: 'bandana', hatColor: '#6E1C1C', hair: 'none', hairColor: '#1E1612', beard: 'stubble', mustache: 'thin', coat: '#1E2A30', iris: '#8C6A2A', eyepatch: true, brows: 'grumpy', mouth: 'snarl', goldTooth: true },
  { id: 'coral', name: 'Capitaine Corail', skin: '#D8A884', hat: 'feather', hatColor: '#2A1E26', hair: 'long', hairColor: '#3E1E12', beard: 'none', mustache: 'none', coat: '#203A34', iris: '#3F6B4E', brows: 'raised', mouth: 'smirk', earring: true },
  { id: 'oldsalt', name: 'Le Vieux Sel', skin: '#C9946C', hat: 'knit', hatColor: '#2C3A44', hair: 'short', hairColor: '#B9B2A6', beard: 'braided', mustache: 'walrus', coat: '#3A2E22', iris: '#6E8A96', brows: 'grumpy', mouth: 'flat', wrinkles: true },
  { id: 'scarlet', name: 'Anne la Rouge', skin: '#7E5034', hat: 'scarf', hatColor: '#7A2218', hair: 'curly', hairColor: '#160E0A', beard: 'none', mustache: 'none', coat: '#2E2236', iris: '#7A5A2A', scar: true, earring: true, brows: 'grumpy', mouth: 'smirk' },
  { id: 'barrel', name: 'Gros-Tonneau', skin: '#DDB08E', hat: 'none', hatColor: '#000000', hair: 'none', hairColor: '#3A2A1A', beard: 'stubble', mustache: 'handlebar', coat: '#4A3418', iris: '#5A4A2A', goldTooth: true, brows: 'raised', mouth: 'open', wrinkles: true },
  { id: 'blackpearl', name: 'Perle Noire', skin: '#55341F', hat: 'bicorne', hatColor: '#121418', hair: 'braids', hairColor: '#0E0907', beard: 'none', mustache: 'none', coat: '#16313A', iris: '#A07A2E', earring: true, brows: 'calm', mouth: 'smirk' },
  { id: 'revenant', name: 'Le Revenant', skin: '#D9CFB6', hat: 'tricorne', hatColor: '#1A1816', hair: 'long', hairColor: '#4A463E', beard: 'none', mustache: 'none', coat: '#26302C', iris: '#7FE0C8', skull: true, brows: 'calm', mouth: 'flat' },
  { id: 'parrot', name: 'Pete le Perroquet', skin: '#A06C46', hat: 'tricorne', hatColor: '#3A2618', hair: 'ponytail', hairColor: '#20160F', beard: 'goatee', mustache: 'thin', coat: '#3E1C1C', iris: '#4E6A3A', parrot: true, brows: 'raised', mouth: 'smirk', earring: true },
  { id: 'mad', name: 'Sabre-Fou', skin: '#BC8558', hat: 'bandana', hatColor: '#1C2638', hair: 'long', hairColor: '#4A321C', beard: 'goatee', mustache: 'handlebar', coat: '#3A1E1E', iris: '#9A3A2A', scar: true, earring: true, brows: 'grumpy', mouth: 'open' },
  { id: 'cabinboy', name: 'Mousse Malin', skin: '#E2BB9A', hat: 'knit', hatColor: '#6A2A1E', hair: 'short', hairColor: '#9A6430', beard: 'none', mustache: 'none', coat: '#22384A', iris: '#4A7A9A', freckles: true, brows: 'raised', mouth: 'smirk' },
  { id: 'kraken', name: 'Dame Kraken', skin: '#94603E', hat: 'feather', hatColor: '#0E2A2A', hair: 'long', hairColor: '#1A0E0A', beard: 'none', mustache: 'none', coat: '#3A1630', iris: '#5AA0A0', eyepatch: true, earring: true, brows: 'calm', mouth: 'smirk' },
];

export const PIRATE_IDS = PIRATES.map((p) => p.id);

export function pirateById(id: string): PirateLook {
  return PIRATES.find((p) => p.id === id) ?? (PIRATES[0] as PirateLook);
}


const MEN = ['Rocko', 'Jacques', 'Thomas', 'Grandpa', 'Eddy', 'Reed', 'Daniel', 'Nicolas'];
const WOMEN = ['Flo', 'Amélie', 'Sandy', 'Shelley', 'Audrey', 'Marie', 'Grandma'];

/** Voix de chaque pirate : voix préférées (si installées), hauteur et débit. */
export const PIRATE_VOICES: Record<string, { names: string[]; pitch: number; rate: number }> = {
  redbeard: { names: ['Rocko', ...MEN], pitch: 0.7, rate: 1 },
  glasseye: { names: ['Jacques', ...MEN], pitch: 0.6, rate: 0.95 },
  coral: { names: ['Flo', ...WOMEN], pitch: 1, rate: 1 },
  oldsalt: { names: ['Grandpa', ...MEN], pitch: 0.6, rate: 0.85 },
  scarlet: { names: ['Sandy', ...WOMEN], pitch: 0.9, rate: 1.05 },
  barrel: { names: ['Rocko', 'Grandpa', ...MEN], pitch: 0.4, rate: 0.9 },
  blackpearl: { names: ['Shelley', ...WOMEN], pitch: 0.85, rate: 1 },
  revenant: { names: ['Grandpa', ...MEN], pitch: 0.1, rate: 0.7 },
  parrot: { names: ['Eddy', 'Flo', ...MEN], pitch: 1.9, rate: 1.25 },
  mad: { names: ['Reed', 'Rocko', ...MEN], pitch: 1.2, rate: 1.25 },
  cabinboy: { names: ['Eddy', 'Reed', ...MEN], pitch: 1.4, rate: 1.15 },
  kraken: { names: ['Grandma', 'Shelley', ...WOMEN], pitch: 0.5, rate: 0.85 },
};
