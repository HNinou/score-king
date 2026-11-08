// Diffusion en direct : un hôte et un spectateur dans deux navigateurs distincts.
// Nécessite Internet (mise en relation PeerJS) : le test est ignoré hors ligne.
import { expect, test } from './fixtures';
import { newGame, setBids } from './helpers';

test('16. un spectateur suit la partie en direct, sans pouvoir la modifier', async ({ browser, request }) => {
  const online = await request
    .get('https://0.peerjs.com/peerjs/id', { timeout: 5000 })
    .then((r) => r.ok())
    .catch(() => false);
  test.skip(!online, 'pas d’accès au service de mise en relation');

  const hostCtx = await browser.newContext();
  const host = await hostCtx.newPage();
  const names = ['Anne', 'Bart', 'Cléo'];
  await newGame(host, names);
  await host.getByRole('button', { name: 'Menu' }).click();
  await host.getByRole('button', { name: 'Diffuser la partie' }).click();
  const dialog = host.getByRole('dialog', { name: 'Diffusion en direct' });
  await expect(dialog.getByRole('status')).toContainText('En direct', { timeout: 20000 });
  const code = (await dialog.locator('.live-code').innerText()).trim();

  const specCtx = await browser.newContext();
  const spec = await specCtx.newPage();
  await spec.goto(`./#voir=${code}`);
  await expect(spec.getByRole('heading', { name: 'Tribune des spectateurs' })).toBeVisible();
  await expect(spec.locator('.watch-card')).toHaveCount(3, { timeout: 30000 });
  await expect(dialog.getByRole('status')).toContainText('1 spectateur', { timeout: 15000 });

  await dialog.getByRole('button', { name: 'Fermer' }).click();
  await setBids(host, names, [0, 1, 0]);
  await expect(spec.locator('.watch-card').filter({ hasText: 'Bart' })).toContainText('Pari 1', { timeout: 15000 });
  // lecture seule : aucune grille de saisie chez le spectateur
  await expect(spec.locator('.numgrid')).toHaveCount(0);
  if (process.env.SHOTS) {
    await spec.screenshot({ path: '../docs/screenshots/web/spectator-mobile.png' });
    const tv = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    await tv.goto(`./#voir=${code}`);
    await expect(tv.locator('.watch-card')).toHaveCount(3, { timeout: 30000 });
    await tv.waitForTimeout(1200);
    await tv.screenshot({ path: '../docs/screenshots/web/spectator-tv.png' });
    await tv.close();
  }

  await hostCtx.close();
  await specCtx.close();
});
