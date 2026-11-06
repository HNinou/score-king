import { expect, type Page } from '@playwright/test';

export interface BonusInput {
  standard14?: number;
  black14?: boolean;
  piratesBySkullKing?: number;
  skullKingByMermaid?: boolean;
  mermaidsByPirate?: number;
}

export async function newGame(page: Page, names: string[], options?: (page: Page) => Promise<void>): Promise<void> {
  await page.goto('./');
  await page.getByRole('button', { name: 'Nouvelle partie' }).click();
  const input = page.getByPlaceholder('Nom du pirate');
  for (const n of names) {
    await input.fill(n);
    await input.press('Enter');
  }
  if (options) await options(page);
  await page.getByRole('button', { name: "Lever l'ancre" }).click();
  await expect(page.getByRole('heading', { name: 'Annoncez vos paris !' })).toBeVisible();
}

export const row = (page: Page, name: string) => page.locator('main li.prow').filter({ has: page.getByText(name, { exact: true }) });

export async function setBids(page: Page, names: string[], bids: number[]): Promise<void> {
  for (let i = 0; i < names.length; i++) {
    const n = names[i] as string;
    await page.getByRole('group', { name: `Pari de ${n}` }).getByRole('button', { name: String(bids[i]), exact: true }).click();
  }
}

export async function setTricks(page: Page, names: string[], tricks: number[]): Promise<void> {
  for (let i = 0; i < names.length; i++) {
    const n = names[i] as string;
    await page.getByRole('group', { name: `Plis de ${n}` }).getByRole('button', { name: String(tricks[i]), exact: true }).click();
  }
}

export async function setBonus(page: Page, name: string, b: BonusInput): Promise<void> {
  await row(page, name).getByRole('button', { name: '+ Bonus' }).click();
  const dlg = page.getByRole('dialog');
  for (let k = 0; k < (b.standard14 ?? 0); k++) await dlg.getByRole('button', { name: '14 de couleur +1' }).click();
  for (let k = 0; k < (b.piratesBySkullKing ?? 0); k++) await dlg.getByRole('button', { name: 'Pirates capturés par le Skull King +1' }).click();
  for (let k = 0; k < (b.mermaidsByPirate ?? 0); k++) await dlg.getByRole('button', { name: 'Sirènes capturées par un pirate +1' }).click();
  if (b.black14) await dlg.getByRole('checkbox', { name: '14 noir' }).check();
  if (b.skullKingByMermaid) await dlg.getByRole('checkbox', { name: 'Skull King capturé par une sirène' }).check();
  await dlg.getByRole('button', { name: 'Fermer' }).click();
}

export async function playRound(
  page: Page,
  names: string[],
  bids: number[],
  tricks: number[],
  bonuses: Record<string, BonusInput> = {},
): Promise<void> {
  await setBids(page, names, bids);
  await page.getByRole('button', { name: "À l'abordage !" }).click();
  await setTricks(page, names, tricks);
  for (const [n, b] of Object.entries(bonuses)) await setBonus(page, n, b);
  await page.getByRole('button', { name: 'Valider la manche' }).click();
  await skipScenes(page);
  await expect(page.getByRole('heading', { name: 'Le bilan' })).toBeVisible();
}

/** Les scènes animées de fin de manche s'affichent avant le bilan : on les passe. */
export async function skipScenes(page: Page): Promise<void> {
  const cinema = page.getByRole('dialog', { name: "Ce qui s'est passé" });
  await expect(page.getByRole('heading', { name: 'Le bilan' }).or(cinema).first()).toBeVisible();
  if (await cinema.isVisible()) await cinema.getByRole('button', { name: 'Passer' }).click();
}

export async function nextRound(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Manche suivante' }).click();
  await page.getByRole('dialog', { name: 'Classement' }).getByRole('button').click();
  await expect(page.getByRole('heading', { name: 'Annoncez vos paris !' })).toBeVisible();
}

export async function scoreOf(page: Page, name: string): Promise<number> {
  const txt = await page.locator('.leader-chip').filter({ hasText: name }).locator('b').innerText();
  return Number(txt);
}
