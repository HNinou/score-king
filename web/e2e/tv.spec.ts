// Captures « mode télé » (à la demande : SHOTS=1 npx playwright test tv).
import { test } from '@playwright/test';
import { newGame, nextRound, playRound } from './helpers';

test.skip(!process.env.SHOTS, 'captures à la demande');

for (const [w, h] of [[1920, 1080], [2560, 640]] as const) {
  test(`télé ${w}x${h}`, async ({ browser }) => {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    await page.emulateMedia({ colorScheme: 'dark' });
    const names = ['Anne', 'Barnabé', 'Capucine-Héloïse', 'Dédé', 'Eli', 'Fanny'];
    await newGame(page, names);
    await page.screenshot({ path: `../docs/screenshots/web/tv-bids-${w}x${h}.png` });
    await playRound(page, names, [0, 1, 0, 0, 0, 0], [0, 1, 0, 0, 0, 0]);
    await page.screenshot({ path: `../docs/screenshots/web/tv-recap-${w}x${h}.png` });
    await page.getByRole('button', { name: 'Manche suivante' }).click();
    await page.waitForTimeout(2600);
    await page.screenshot({ path: `../docs/screenshots/web/tv-ranking-${w}x${h}.png` });
    await page.getByRole('dialog', { name: 'Classement' }).getByRole('button').click();
    void nextRound;
    await page.close();
  });
}
