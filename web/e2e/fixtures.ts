// La synthèse vocale du système bloque le navigateur de test pendant qu'elle parle (et dépend des voix
// installées sur la machine) : en e2e, chaque annonce « se termine » aussitôt, sans son.
import { test as base } from '@playwright/test';

export { expect, type Page } from '@playwright/test';

export const test = base.extend({
  page: async ({ page }, provide) => {
    await page.addInitScript(() => {
      speechSynthesis.speak = (u: SpeechSynthesisUtterance) => {
        setTimeout(() => u.onend?.(new SpeechSynthesisEvent('end', { utterance: u })), 0);
      };
    });
    await provide(page);
  },
});
