// Musique d'ambiance : deux boucles (« Mer calme » / « Gros temps ») mêlées selon l'avancée de la partie,
// baissées automatiquement quand le Bosco parle ou qu'un bruitage important retentit.
// Passe par Web Audio (élément <audio> → GainNode) pour que le volume fonctionne aussi sur iPhone.

const BASE = 0.22; // la musique reste loin derrière les voix des joueurs
const DUCK = 0.3;

class MusicService {
  enabled = true;
  volume = 0.5;
  private ctx: AudioContext | null = null;
  private calm: { el: HTMLAudioElement; gain: GainNode } | null = null;
  private storm: { el: HTMLAudioElement; gain: GainNode } | null = null;
  private mood = 0;
  private ducked = 0;
  private duckTimer = 0;
  private active = false;

  private build(): void {
    if (this.ctx || typeof window.AudioContext !== 'function') return;
    try {
      const ctx = new window.AudioContext();
      const make = (name: string) => {
        const el = new Audio(`${import.meta.env.BASE_URL}sounds/${name}.m4a`);
        el.loop = true;
        el.preload = 'auto';
        const gain = ctx.createGain();
        gain.gain.value = 0;
        ctx.createMediaElementSource(el).connect(gain).connect(ctx.destination);
        return { el, gain };
      };
      this.ctx = ctx;
      this.calm = make('music-calm');
      this.storm = make('music-storm');
      document.addEventListener('visibilitychange', () => this.apply());
    } catch {
      this.ctx = null;
    }
  }

  /** À appeler sur un geste utilisateur (les navigateurs bloquent la lecture automatique). */
  unlock(): void {
    this.build();
    if (this.ctx?.state === 'suspended') void this.ctx.resume().catch(() => undefined);
    this.apply();
  }

  /** 0 = début de partie (mer calme), 1 = fin de partie (gros temps). */
  setMood(m: number): void {
    this.mood = Math.max(0, Math.min(1, m));
    this.apply();
  }

  setActive(on: boolean): void {
    this.active = on;
    this.apply();
  }

  /** Baisse la musique pendant `ms` (bruitage) ou jusqu'à nouvel ordre (ms = Infinity, voix). */
  duck(ms: number): void {
    this.ducked++;
    this.apply();
    window.clearTimeout(this.duckTimer);
    if (Number.isFinite(ms)) {
      this.duckTimer = window.setTimeout(() => {
        this.ducked = 0;
        this.apply();
      }, ms);
    }
  }

  unduck(): void {
    this.ducked = 0;
    this.apply();
  }

  apply(): void {
    const ctx = this.ctx;
    if (!ctx || !this.calm || !this.storm) return;
    const on = this.enabled && this.active && document.visibilityState === 'visible';
    const level = on ? BASE * this.volume * (this.ducked > 0 ? DUCK : 1) : 0;
    // « Gros temps » n'arrive qu'après la mi-partie, en fondu
    const storm = Math.max(0, Math.min(1, (this.mood - 0.45) / 0.35));
    const now = ctx.currentTime;
    for (const [track, g] of [
      [this.calm, level * (1 - storm)],
      [this.storm, level * storm],
    ] as const) {
      track.gain.gain.cancelScheduledValues(now);
      track.gain.gain.setTargetAtTime(g, now, 0.6);
      if (g > 0.0001 && track.el.paused) void track.el.play().catch(() => undefined);
    }
    if (!on) {
      window.setTimeout(() => {
        if (!(this.enabled && this.active && document.visibilityState === 'visible')) {
          this.calm?.el.pause();
          this.storm?.el.pause();
        }
      }, 2500);
    }
  }
}

export const music = new MusicService();
