// La voix du Bosco : synthèse vocale de l'appareil, uniquement avec une voix française installée
// localement (aucun appel réseau). Lit les remarques, annonces et cris des scènes.

function frenchVoice(): SpeechSynthesisVoice | null {
  if (typeof speechSynthesis === 'undefined') return null;
  const voices = speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('fr') && v.localService);
  // « Grandpa » (macOS/iOS) fait un vieux bosco parfait ; sinon une voix grave française
  const pref = ['Grandpa', 'Jacques', 'Rocko', 'Thomas', 'Daniel', 'Nicolas', 'Amélie'];
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

class VoiceService {
  enabled = true;
  volume = 0.8;
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
      const u = new SpeechSynthesisUtterance(speakable(text));
      u.voice = this.voice;
      u.lang = this.voice.lang;
      u.volume = this.volume;
      u.pitch = opts.shout ? 1.25 : 0.7;
      u.rate = opts.shout ? 1.15 : 1.02;
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
