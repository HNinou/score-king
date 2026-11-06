// Service audio unique : préchargement, priorités, variantes sans répétition, muet, volume.
export type SoundId =
  | 'tap-wood'
  | 'bell-bids'
  | 'seal-stamp'
  | 'coins'
  | 'slide-up'
  | 'splash'
  | 'sad-trombone'
  | 'cannon'
  | 'siren-song'
  | 'parrot-squawk'
  | 'new-captain'
  | 'rewind'
  | 'chest-fanfare'
  | 'drumroll'
  | 'whoosh';

const VARIANTS: Partial<Record<SoundId, number>> = { 'tap-wood': 3, coins: 3, splash: 2 };
export const PRIORITY: Record<SoundId, number> = {
  'tap-wood': 0,
  rewind: 1,
  whoosh: 1,
  'bell-bids': 2,
  'seal-stamp': 2,
  coins: 3,
  splash: 3,
  'slide-up': 4,
  'parrot-squawk': 4,
  'sad-trombone': 5,
  cannon: 5,
  'new-captain': 5,
  'siren-song': 6,
  drumroll: 6,
  'chest-fanfare': 7,
};

class AudioService {
  private pool = new Map<string, HTMLAudioElement>();
  private last = new Map<SoundId, number>();
  private busyUntil = 0;
  private busyPriority = -1;
  private ready = false;
  enabled = true;
  volume = 0.8;
  /** Espion pour les tests : chaque son effectivement joué. */
  played: SoundId[] = [];

  /** Précharge les sons (fichiers embarqués) au premier geste utilisateur. */
  unlock(): void {
    if (this.ready || typeof Audio !== 'function') return;
    this.ready = true;
    const names = (Object.keys(PRIORITY) as SoundId[]).flatMap((id) => {
      const v = VARIANTS[id];
      return v ? Array.from({ length: v }, (_, i) => `${id}-${i + 1}`) : [id];
    });
    for (const n of names) {
      const el = new Audio(`${import.meta.env.BASE_URL}sounds/${n}.m4a`);
      el.preload = 'auto';
      this.pool.set(n, el);
    }
  }

  setVolume(v: number): void {
    this.volume = v;
  }

  play(id: SoundId, opts: { force?: boolean } = {}): void {
    if (!this.enabled) return;
    const now = performance.now();
    const pr = PRIORITY[id];
    // un seul bruitage d'événement à la fois : le plus important gagne
    if (!opts.force && pr > 0 && now < this.busyUntil && pr < this.busyPriority) return;
    const v = VARIANTS[id];
    let name: string = id;
    if (v) {
      let k = 1 + Math.floor(Math.random() * v);
      if (k === this.last.get(id)) k = (k % v) + 1;
      this.last.set(id, k);
      name = `${id}-${k}`;
    }
    this.played.push(id);
    const base = this.pool.get(name);
    if (!base) return;
    const el = base.cloneNode(true) as HTMLAudioElement;
    el.volume = this.volume;
    void el.play().catch(() => undefined);
    if (pr > 0) {
      const d = Number.isFinite(base.duration) ? base.duration : 1;
      this.busyUntil = now + d * 1000;
      this.busyPriority = pr;
    }
  }
}

export const audio = new AudioService();
