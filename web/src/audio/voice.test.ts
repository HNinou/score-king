import { describe, expect, it } from 'vitest';
import { piratize, speakable } from './voice';

describe('voix du Bosco', () => {
  it('rend les signes et pluriels prononçables', () => {
    expect(speakable('Anne : −70. 2 pli(s) · +40')).toBe('Anne : moins 70. 2 plis , plus 40');
  });
  it('habille la réplique en pirate', () => {
    expect(piratize('Bien joué. Encore', false, () => 0)).toMatch(/^\S.*Bien joué… Encore .+$/);
    expect(piratize('Bien joué', false, () => 0.99)).toBe('Bien joué');
    expect(piratize('KRAKEN !', true)).toBe('Arrrgh ! KRAKEN !');
  });
});
