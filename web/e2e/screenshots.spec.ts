// Captures de revue visuelle : chaque écran dans un état réaliste (lancé à la demande : SHOTS=1 npx playwright test screenshots).
import { expect, test, type Page } from '@playwright/test';
import { newGame, nextRound, playRound, setBids, setTricks, skipScenes } from './helpers';

const OUT = '../docs/screenshots/web';
const names = ['Anne', 'Barnabé', 'Capucine-Héloïse', 'Dédé', 'Eli', 'Fanny'];

test.skip(!process.env.SHOTS, 'captures à la demande');

async function shot(page: Page, name: string): Promise<void> {
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });
}

for (const scheme of ['dark', 'light'] as const) {
  test(`écrans ${scheme}`, async ({ page }, info) => {
    const size = info.project.name;
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto('./');
    await shot(page, `home-${scheme}-${size}`);
    await newGame(page, names);
    await shot(page, `bids-empty-${scheme}-${size}`);
    // quelques manches pour avoir des scores contrastés
    const plays: [number[], number[]][] = [
      [[0, 1, 0, 0, 0, 0], [0, 1, 0, 0, 0, 0]],
      [[1, 0, 1, 0, 0, 0], [1, 0, 0, 1, 0, 0]],
      [[1, 1, 0, 1, 0, 0], [2, 0, 0, 1, 0, 0]],
    ];
    for (const [b, tr] of plays) {
      await playRound(page, names, b, tr);
      await nextRound(page);
    }
    await setBids(page, names.slice(0, 3), [2, 1, 0]);
    await shot(page, `bids-partial-${scheme}-${size}`);
    await setBids(page, names.slice(3), [1, 0, 0]);
    await page.getByRole('button', { name: "À l'abordage !" }).click();
    await setTricks(page, names, [2, 1, 1, 0, 0, 0]);
    await shot(page, `tricks-error-${scheme}-${size}`);
    await page.getByRole('group', { name: 'Plis de Capucine-Héloïse' }).getByRole('button', { name: '0', exact: true }).click();
    await page.getByRole('group', { name: 'Plis de Dédé' }).getByRole('button', { name: '1', exact: true }).click();
    await page.getByRole('button', { name: 'Valider la manche' }).click();
    await skipScenes(page);
    await shot(page, `recap-${scheme}-${size}`);
    await page.getByRole('button', { name: 'Manche suivante' }).click();
    await page.waitForTimeout(2600);
    await shot(page, `ranking-${scheme}-${size}`);
    await page.getByRole('dialog', { name: 'Classement' }).getByRole('button').click();
    await page.getByRole('button', { name: 'Grand Livre' }).click();
    await shot(page, `ledger-${scheme}-${size}`);
    await expect(page.getByRole('dialog')).toBeVisible();
  });
}
