// Sprites en pixel art, dessinés à la main sur une grille (un caractère = un pixel).

export type Sprite = { rows: string[]; palette: Record<string, string> };

const OUTLINE = '#1A100A';

export const SABRE: Sprite = {
  palette: { k: OUTLINE, w: '#FFFFFF', s: '#B9C2CC', g: '#E2B84A', b: '#7A4A22' },
  rows: [
    'kk..............',
    'kwk.............',
    'kswk............',
    '.kswk...........',
    '..kswk..........',
    '...kswk.........',
    '....kswk........',
    '.....kswk.......',
    '......kswk.kk...',
    '.......kswkgk...',
    '........kskgk...',
    '.......kgggk....',
    '......kgkkbk....',
    '.......k..kbk...',
    '...........kbk..',
    '............kk..',
  ],
};

export const HOOK: Sprite = {
  palette: { k: OUTLINE, w: '#FFFFFF', s: '#B9C2CC', g: '#E2B84A', b: '#7A4A22', d: '#4E2E14' },
  rows: [
    '.kk.............',
    'kwsk............',
    'kk.sk...........',
    '....sk..........',
    '....sk..........',
    '....sk..........',
    '...kssk.........',
    '..kbbbbk........',
    '.kbbbbbbk.......',
    '.kbgbbgbk.......',
    '.kbbbbbbk.......',
    '.kdbbbbdk.......',
    '..kdddddk.......',
    '...kkkkk........',
    '................',
    '................',
  ],
};

export const LANTERN: Sprite = {
  palette: { k: OUTLINE, g: '#C9A227', y: '#FFE08A', o: '#F2A23A', r: '#B3402A', d: '#6A4E14' },
  rows: [
    '.....kk.....',
    '....k..k....',
    '...kkkkkk...',
    '..kggggggk..',
    '.kgkkkkkkgk.',
    '.kgkyyyykgk.',
    '.kgkyooykgk.',
    '.kgkyorykgk.',
    '.kgkyooykgk.',
    '.kgkyyyykgk.',
    '.kgkkkkkkgk.',
    '..kggggggk..',
    '...kddddk...',
    '....kkkk....',
  ],
};

export const SHIP: Sprite = {
  palette: { k: OUTLINE, w: '#F2E4C4', s: '#D9CDB0', b: '#7A4A22', d: '#4E2E14', r: '#B3262A', y: '#E2B84A' },
  rows: [
    '...........k............',
    '...........kr...........',
    '...........krr..........',
    '........kkkk............',
    '.......kwwwwk...kkk.....',
    '......kwwwwwwk.kwwwk....',
    '......kwwwwwwk.kwwwwk...',
    '......kswwwwsk.kswwwk...',
    '.......kssssk...ksssk...',
    '..........k.......k.....',
    'kk........k.......k...kk',
    'kbkkkkkkkkkkkkkkkkkkkkbk',
    '.kbbybbbbybbbbybbbbybbk.',
    '..kbbbbbbbbbbbbbbbbbbk..',
    '...kddddddddddddddddk...',
    '....kkkkkkkkkkkkkkkk....',
  ],
};

export function spriteSvg(s: Sprite, scale = 1): string {
  const h = s.rows.length;
  const w = Math.max(...s.rows.map((r) => r.length));
  let rects = '';
  s.rows.forEach((row, y) => {
    [...row].forEach((c, x) => {
      const col = s.palette[c];
      if (col) rects += `<rect x='${x}' y='${y}' width='1.02' height='1.02' fill='${col}'/>`;
    });
  });
  return `<svg xmlns='http://www.w3.org/2000/svg' width='${w * scale}' height='${h * scale}' viewBox='0 0 ${w} ${h}' shape-rendering='crispEdges'>${rects}</svg>`;
}

export function spriteUrl(s: Sprite, scale = 2): string {
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(spriteSvg(s, scale))}")`;
}
