// La voix du Bosco : synthèse vocale de l'appareil, uniquement avec une voix française installée
// localement (aucun appel réseau). Lit les remarques, annonces et cris des scènes.

function frenchVoice(): SpeechSynthesisVoice | null {
  if (typeof speechSynthesis === 'undefined') return null;
  const voices = speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('fr') && v.localService);
  // « Grandpa » (macOS/iOS) fait un vieux bosco parfait ; sinon une voix grave française
  const pref = ['Grandpa', 'Rocko', 'Jacques', 'Thomas', 'Daniel', 'Nicolas', 'Amélie'];
  for (const name of pref) {
    const v = voices.find((x) => x.lang === 'fr-FR' && x.name.includes(name));
    if (v) return v;
  }
  return voices.find((v) => v.lang === 'fr-FR') ?? voices[0] ?? null;
}

/** Rend le texte prononçable : signes, pluriels entre parenthèses, symboles. */
export function speakable(text: string): string {
  return text
    .replace(/[−-](\d)/g, ' moins $1')
    .replace(/\+(\d)/g, ' plus $1')
    .replace(/\(s\)/g, 's')
    .replace(/\(e\)/g, '')
    .replace(/·/g, ',')
    .replace(/[★✓✗▲▼]/g, '')
    .replace(/n°/g, 'numéro ')
    .replace(/\s+/g, ' ')
    .trim();
}

const OPENERS = ['Arrr !', 'Morbleu !', 'Sacrebleu !', 'Par les dents du kraken !', 'Ohé, moussaillons !', 'Ho ho !', 'Par ma jambe de bois…', 'Mille milliards de mouettes !'];
const CLOSERS = ['Arrr.', 'Yo-ho !', 'Hé hé hé…', 'Foi de pirate.', 'Arrrgh.'];
const pick = (a: string[]): string => a[Math.floor(Math.random() * a.length)] ?? '';

/** Habille la réplique en vieux loup de mer : juron d'ouverture, ponctuation traînante, ricanement final. */
export function piratize(text: string, shout = false, rnd: () => number = Math.random): string {
  if (shout) return `Arrrgh ! ${text}`;
  let out = text.replace(/\. /g, '… ');
  if (rnd() < 0.55) out = `${pick(OPENERS)} ${out}`;
  if (rnd() < 0.4) out = `${out} ${pick(CLOSERS)}`;
  return out;
}

class VoiceService {
  enabled = true;
  volume = 0.8;
  /** Prévenu quand le Bosco commence / finit de parler (pour baisser la musique). */
  onSpeak: ((speaking: boolean) => void) | null = null;
  private voice: SpeechSynthesisVoice | null = null;

  available(): boolean {
    if (!this.voice) this.voice = frenchVoice();
    return this.voice !== null;
  }

  constructor() {
    if (typeof speechSynthesis !== 'undefined') {
      speechSynthesis.addEventListener('voiceschanged', () => {
        this.voice = frenchVoice();
      });
    }
  }

  /** shout = cri de scène (plus aigu, plus rapide) ; sinon voix grave et posée de vieux loup de mer. */
  say(text: string, opts: { shout?: boolean; interrupt?: boolean } = {}): void {
    if (!this.enabled || !text || !this.available() || !this.voice) return;
    try {
      if (opts.interrupt !== false) speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(speakable(piratize(text, opts.shout)));
      u.voice = this.voice;
      u.lang = this.voice.lang;
      u.volume = this.volume;
      // voix grave et traînante de vieux bosco ; les cris de scène, rauques et rapides
      u.pitch = opts.shout ? 0.9 : 0.55;
      u.rate = opts.shout ? 1.1 : 0.92;
      u.onstart = () => this.onSpeak?.(true);
      u.onend = () => this.onSpeak?.(false);
      speechSynthesis.speak(u);
    } catch {
      // synthèse vocale indisponible
    }
  }

  stop(): void {
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
  }
}

export const voice = new VoiceService();
