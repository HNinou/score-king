import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { newGame, nextRound, playRound, row, scoreOf, setBids, setTricks, skipScenes, type BonusInput } from './helpers';

interface FixturePlayer {
  id: string;
  bid: number;
  tricks: number;
  bonus?: BonusInput;
  cannon?: string;
}
interface FixtureGame {
  id: string;
  playerIds: string[];
  rounds: { cardsDealt: number; players: FixturePlayer[] }[];
  expectedRunningTotals: Record<string, number>[];
}
const fixtures = JSON.parse(readFileSync(fileURLToPath(new URL('../../shared/fixtures/scoring-cases.json', import.meta.url)), 'utf-8')) as {
  gameCases: FixtureGame[];
};

test('1. partie complète de 10 manches (fixture partie-01)', async ({ page }) => {
  const g = fixtures.gameCases[0] as FixtureGame;
  const names: Record<string, string> = { A: 'Anne', B: 'Bart', C: 'Cléo' };
  const order = g.playerIds.map((id) => names[id] as string);
  await newGame(page, order);
  for (const [k, r] of g.rounds.entries()) {
    const bonuses: Record<string, BonusInput> = {};
    for (const p of r.players) if (p.bonus) bonuses[names[p.id] as string] = p.bonus;
    await playRound(
      page,
      order,
      r.players.map((p) => p.bid),
      r.players.map((p) => p.tricks),
      bonuses,
    );
    const expected = g.expectedRunningTotals[k] as Record<string, number>;
    for (const id of g.playerIds) expect(await scoreOf(page, names[id] as string), `manche ${k + 1}, ${id}`).toBe(expected[id]);
    if (k < g.rounds.length - 1) await nextRound(page);
  }
  // annonce finale, de la dernière place au vainqueur
  await page.getByRole('button', { name: 'Découvrir le classement final' }).click();
  await page.getByRole('dialog', { name: 'Classement' }).getByRole('button').click();
  const reveal = page.getByRole('dialog', { name: 'Le Trésor' });
  for (let i = 0; i < 3; i++) await reveal.getByRole('button', { name: 'Continuer' }).click({ timeout: 6000 });
  await expect(page.getByRole('heading', { name: 'Le Trésor' })).toBeVisible();
  const list = page.locator('main ol.card li');
  await expect(list.nth(0)).toContainText('Anne');
  await expect(list.nth(0)).toContainText('450');
  await expect(list.nth(1)).toContainText('390');
  await expect(list.nth(2)).toContainText('110');
});

test('2. Rascal à 2 joueurs, Escarmouche salée, Boulet/Mitraille (fixture partie-02)', async ({ page }) => {
  const g = fixtures.gameCases[1] as FixtureGame;
  const names = ['Ana', 'Bob'];
  await newGame(page, names, async (p) => {
    await p.getByText('Options').click();
    await p.getByRole('button', { name: 'Rascal', exact: true }).click();
    await p.getByLabel('Boulet / Mitraille').check();
    await p.getByLabel('Planning des manches').selectOption('swiftAndSalty');
  });
  for (const [k, r] of g.rounds.entries()) {
    await setBids(page, names, r.players.map((p) => p.bid));
    for (const [i, p] of r.players.entries()) {
      if (p.cannon === 'cannonball') await row(page, names[i] as string).getByRole('button', { name: 'Boulet' }).click();
    }
    await page.getByRole('button', { name: "À l'abordage !" }).click();
    await setTricks(page, names, r.players.map((p) => p.tricks));
    for (const [i, p] of r.players.entries()) {
      if (p.bonus) {
        await row(page, names[i] as string).getByRole('button', { name: '+ Bonus' }).click();
        const dlg = page.getByRole('dialog');
        if (p.bonus.standard14) await dlg.getByRole('button', { name: '14 de couleur +1' }).click();
        if (p.bonus.black14) await dlg.getByRole('checkbox', { name: '14 noir' }).check();
        await dlg.getByRole('button', { name: 'Fermer' }).click();
      }
    }
    await page.getByRole('button', { name: 'Valider la manche' }).click();
    await skipScenes(page);
    const expected = g.expectedRunningTotals[k] as Record<string, number>;
    expect(await scoreOf(page, 'Ana')).toBe(expected.A);
    expect(await scoreOf(page, 'Bob')).toBe(expected.B);
    if (k < g.rounds.length - 1) await nextRound(page);
  }
});

test('3. erreur bloquante puis correction', async ({ page }) => {
  const names = ['Anne', 'Bart', 'Cléo'];
  await newGame(page, names);
  await setBids(page, names, [0, 1, 0]);
  await page.getByRole('button', { name: "À l'abordage !" }).click();
  await setTricks(page, names, [1, 1, 0]);
  await expect(page.getByRole('status').first()).toContainText('de trop');
  await expect(page.getByRole('button', { name: 'Valider la manche' })).toHaveAttribute('aria-disabled', 'true');
  await expect(page.getByText('Corrigez les erreurs en rouge')).toBeVisible();
  await page.getByRole('group', { name: 'Plis de Anne' }).getByRole('button', { name: '0', exact: true }).click();
  await expect(page.getByRole('status').first()).toContainText('Tous les plis sont attribués');
  await page.getByRole('button', { name: 'Valider la manche' }).click();
  await skipScenes(page);
  await expect(page.getByRole('heading', { name: 'Le bilan' })).toBeVisible();
});

test('4. correction a posteriori : seuls les cumuls suivants changent', async ({ page }) => {
  const names = ['Anne', 'Bart'];
  await newGame(page, names);
  await playRound(page, names, [1, 0], [1, 0]); // A +20, B +10
  await nextRound(page);
  await playRound(page, names, [1, 1], [1, 1]); // A +20, B +20
  expect(await scoreOf(page, 'Anne')).toBe(40);
  await page.getByRole('button', { name: 'Grand Livre' }).click();
  await page.locator('.ledger tbody tr').first().locator('td button').first().click();
  await page.getByRole('button', { name: 'Confirmer' }).click();
  const editor = page.getByRole('dialog', { name: 'Manche 1' });
  await editor.getByRole('group', { name: 'Plis de Anne' }).getByRole('button', { name: '0', exact: true }).click();
  await editor.getByRole('button', { name: 'Confirmer' }).click();
  await page.keyboard.press('Escape');
  expect(await scoreOf(page, 'Anne')).toBe(10); // −10 au lieu de +20
  expect(await scoreOf(page, 'Bart')).toBe(30);
});

test('5. annuler 5 saisies revient à l’état de départ', async ({ page }) => {
  const names = ['Anne', 'Bart', 'Cléo', 'Dédé', 'Eli'];
  await newGame(page, names);
  await setBids(page, names, [1, 0, 1, 0, 1]);
  for (const n of names) await expect(row(page, n).locator('.value')).not.toHaveText('–');
  for (let i = 0; i < 5; i++) await page.getByRole('button', { name: 'Annuler' }).click();
  for (const n of names) await expect(row(page, n).locator('.value')).toHaveText('–');
  await expect(page.getByRole('button', { name: 'Annuler' })).toBeDisabled();
});

test('6. reprise après rechargement au milieu des paris', async ({ page }) => {
  const names = ['Anne', 'Bart', 'Cléo'];
  await newGame(page, names);
  for (let r = 0; r < 3; r++) {
    await playRound(page, names, [0, 0, 0], [r + 1, 0, 0]);
    await nextRound(page);
  }
  await setBids(page, ['Anne', 'Bart'], [2, 1]);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Annoncez vos paris !' })).toBeVisible();
  await expect(page.locator('.round-num')).toHaveText('4');
  await expect(row(page, 'Anne').locator('.value')).toHaveText('2');
  await expect(row(page, 'Bart').locator('.value')).toHaveText('1');
  await expect(row(page, 'Cléo').locator('.value')).toHaveText('–');
});

test('7. hors-ligne après un premier chargement', async ({ page, context }) => {
  await page.goto('./');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Nouvelle partie' })).toBeVisible();
  await newGame(page, ['Anne', 'Bart']);
  await context.setOffline(false);
});

test('8. huit joueurs : planning plafonné et grille limitée', async ({ page }) => {
  const names = ['A1', 'B2', 'C3', 'D4', 'E5', 'F6', 'G7', 'H8'];
  await page.goto('./');
  await page.getByRole('button', { name: 'Nouvelle partie' }).click();
  const input = page.getByPlaceholder('Nom du pirate');
  for (const n of names) {
    await input.fill(n);
    await input.press('Enter');
  }
  await page.getByText('Options').click();
  await expect(page.getByText('1 · 2 · 3 · 4 · 5 · 6 · 7 · 8 · 8 · 8')).toBeVisible();
  await expect(page.getByText('À 8 joueurs, maximum 8 cartes par manche.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: "Lever l'ancre" }).click();
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem('score-king:v1') ?? '{}') as { games: { settings: { cardsPerRound: number[] } }[] });
  expect(state.games[0]?.settings.cardsPerRound).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 8, 8]);
});

test('9. son coupé : préférence persistée', async ({ page }) => {
  await newGame(page, ['Anne', 'Bart']);
  await page.getByRole('button', { name: 'Couper le son' }).click();
  await expect(page.getByRole('button', { name: 'Activer le son' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Activer le son' })).toHaveAttribute('aria-pressed', 'true');
});

test('10. égalité en tête : même marche du podium', async ({ page }) => {
  const names = ['Anne', 'Bart', 'Cléo'];
  await newGame(page, names, async (p) => {
    await p.getByText('Options').click();
    await p.getByLabel('Planning des manches').selectOption('pastYourBedtime');
  });
  await playRound(page, names, [0, 0, 1], [0, 0, 1]); // 10, 10, 20 → pas d'égalité
  await page.getByRole('button', { name: 'Modifier cette manche' }).click();
  const editor = page.getByRole('dialog', { name: 'Manche 1' });
  await editor.getByRole('group', { name: 'Pari de Cléo' }).getByRole('button', { name: '0', exact: true }).click();
  await editor.getByRole('group', { name: 'Plis de Cléo' }).getByRole('button', { name: '0', exact: true }).click();
  await editor.getByRole('group', { name: 'Plis de Bart' }).getByRole('button', { name: '1', exact: true }).click();
  await editor.getByRole('group', { name: 'Pari de Bart' }).getByRole('button', { name: '1', exact: true }).click();
  await editor.getByRole('button', { name: 'Confirmer' }).click(); // Anne 10, Bart 20, Cléo 10
  await page.getByRole('button', { name: 'Découvrir le classement final' }).click();
  await page.getByRole('dialog', { name: 'Classement' }).getByRole('button').click();
  const reveal = page.getByRole('dialog', { name: 'Le Trésor' });
  await expect(reveal.getByText('Et à la place n°2…')).toBeVisible();
  await expect(reveal.locator('.reveal-card')).toHaveCount(2, { timeout: 5000 }); // Anne et Cléo ex aequo
  await reveal.getByRole('button', { name: 'Continuer' }).click();
  await reveal.getByRole('button', { name: 'Continuer' }).click({ timeout: 6000 });
  const steps = page.locator('.podium-step');
  await expect(steps.nth(0)).toContainText('Anne');
  await expect(steps.nth(0)).toContainText('Cléo');
});

test('accessibilité (axe) : accueil, paris, plis, bilan — 2 thèmes', async ({ page }) => {
  for (const scheme of ['dark', 'light'] as const) {
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
    await page.goto('./');
    const check = async () => {
      const r = await new AxeBuilder({ page }).analyze();
      expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
    };
    await check();
    await newGame(page, ['Anne', 'Bart', 'Cléo']);
    await check();
    await setBids(page, ['Anne', 'Bart', 'Cléo'], [0, 1, 0]);
    await page.getByRole('button', { name: "À l'abordage !" }).click();
    await check();
    await setTricks(page, ['Anne', 'Bart', 'Cléo'], [0, 1, 0]);
    await page.getByRole('button', { name: 'Valider la manche' }).click();
    await page.waitForTimeout(400);
    await check();
    await page.evaluate(() => localStorage.clear());
  }
});

test('11. cartes spéciales : Kraken activé en cours de partie', async ({ page }) => {
  const names = ['Anne', 'Bart', 'Cléo'];
  await newGame(page, names, async (p) => {
    await p.getByText('Options').click();
    await p.getByLabel('Planning des manches').selectOption('swiftAndSalty');
  });
  await setBids(page, names, [2, 1, 1]);
  await page.getByRole('button', { name: "À l'abordage !" }).click();
  await setTricks(page, names, [2, 1, 1]);
  await expect(page.getByRole('status').first()).toContainText('Il manque 1');
  await page.getByRole('button', { name: 'Kraken' }).click();
  await page.getByRole('group', { name: 'Plis détruits ou défaussés' }).getByRole('button', { name: '1', exact: true }).click();
  await expect(page.getByRole('status').first()).toContainText('Tous les plis sont attribués');
  await page.getByRole('button', { name: 'Valider la manche' }).click();
  const cinema = page.getByRole('dialog', { name: "Ce qui s'est passé" });
  await expect(cinema.getByText('KRAKEN !')).toBeVisible();
  await cinema.getByRole('button', { name: 'Passer' }).click();
  expect(await scoreOf(page, 'Anne')).toBe(40);
});

test('12. incident : redistribuer puis annuler la manche', async ({ page }) => {
  const names = ['Anne', 'Bart'];
  await newGame(page, names);
  await setBids(page, names, [1, 0]);
  await page.getByRole('button', { name: 'Incident' }).click();
  await page.getByRole('button', { name: 'Redistribuer' }).click();
  await expect(row(page, 'Anne').locator('.value')).toHaveText('–');
  await page.getByRole('button', { name: 'Incident' }).click();
  await page.getByRole('button', { name: 'Annuler la manche' }).click();
  await page.getByRole('button', { name: 'Confirmer' }).click();
  await expect(page.locator('.round-num')).toHaveText('2');
  expect(await scoreOf(page, 'Anne')).toBe(0);
  await page.getByRole('button', { name: 'Grand Livre' }).click();
  await expect(page.locator('.ledger tbody tr').first()).toContainText('annulée');
});

test('13. annonce du classement : une remarque vise un joueur', async ({ page }) => {
  const names = ['Anne', 'Bart', 'Cléo'];
  await newGame(page, names);
  await playRound(page, names, [0, 1, 0], [0, 1, 0]);
  await page.getByRole('button', { name: 'Manche suivante' }).click();
  const show = page.getByRole('dialog', { name: 'Classement' });
  await expect(show.locator('.bubble')).toBeVisible({ timeout: 6000 });
  await expect(show.locator('.show-row.targeted')).toHaveCount(1);
});

test('14. six joueurs : partie lancée, tout le monde visible en haut', async ({ page }) => {
  const names = ['Anne', 'Bart', 'Cléo', 'Dédé', 'Eli', 'Fanny'];
  await newGame(page, names);
  await expect(page.locator('.leader-chip')).toHaveCount(6);
  for (const chip of await page.locator('.leader-chip').all()) await expect(chip).toBeInViewport();
  await playRound(page, names, [0, 0, 0, 0, 0, 1], [0, 0, 0, 0, 0, 1]);
  expect(await scoreOf(page, 'Fanny')).toBe(20);
  expect(await scoreOf(page, 'Anne')).toBe(10);
});
