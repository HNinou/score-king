import { expect, test } from './fixtures';
import { newGame, row } from './helpers';

test('bureau : saisie des paris au clavier', async ({ page }) => {
  const names = ['Anne', 'Bart', 'Cléo'];
  await newGame(page, names);
  // l'entame (Bart) est le premier joueur actif
  await page.keyboard.press('1');
  await page.keyboard.press('0');
  await page.keyboard.press('0');
  await expect(row(page, 'Bart').locator('.value')).toHaveText('1');
  await expect(row(page, 'Cléo').locator('.value')).toHaveText('0');
  await expect(row(page, 'Anne').locator('.value')).toHaveText('0');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Comptez le butin' })).toBeVisible();
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+z' : 'Control+z');
  await expect(page.getByRole('heading', { name: 'Annoncez vos paris !' })).toBeVisible();
});
