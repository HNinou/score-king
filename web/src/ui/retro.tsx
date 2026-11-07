// Le « cachet » rétro : curseurs pixel, traînée de pièces derrière la souris, étincelles au tap,
// lanterne qui se balance, navire qui passe, bandeau défilant, badges 88×31 et compteur à l'ancienne.
import { useEffect, useRef } from 'react';
import { audio } from '../audio/audio';
import type { Game } from '../game/model';
import { t } from '../i18n/t';
import { HOOK, LANTERN, SABRE, SHIP, spriteSvg, spriteUrl } from './pixel';

const COLORS = ['#E2B84A', '#F6D98A', '#FFFFFF', '#7FC4E0', '#C9A227'];
const GRID = 3;

interface Bit {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  star: boolean;
}

function motionReduced(): boolean {
  return document.documentElement.dataset.motion === 'reduced' || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Calque plein écran : traînée de pièces (souris) et gerbes d'étincelles (tap). */
export function RetroLayer({ enabled }: { enabled: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (enabled) {
      root.style.setProperty('--cursor-default', `${spriteUrl(SABRE, 2)} 1 1, auto`);
      root.style.setProperty('--cursor-pointer', `${spriteUrl(HOOK, 2)} 3 3, pointer`);
      root.dataset.retro = 'on';
    } else {
      delete root.dataset.retro;
    }
  }, [enabled]);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!enabled || !canvas || !ctx) return;
    const bits: Bit[] = [];
    let raf = 0;
    let last = performance.now();
    let lastSpawn = 0;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;
    };
    resize();

    const spawn = (x: number, y: number, n: number, burst: boolean) => {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = burst ? 60 + Math.random() * 140 : 10 + Math.random() * 30;
        bits.push({
          x,
          y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp - (burst ? 60 : 0),
          life: 0,
          max: burst ? 700 + Math.random() * 300 : 500 + Math.random() * 300,
          size: Math.random() < 0.3 ? 2 : 1,
          color: COLORS[Math.floor(Math.random() * COLORS.length)] ?? '#E2B84A',
          star: Math.random() < 0.25,
        });
      }
      if (bits.length > 240) bits.splice(0, bits.length - 240);
      if (!raf) {
        last = performance.now();
        raf = requestAnimationFrame(tick);
      }
    };

    const tick = (now: number) => {
      const dt = Math.min(50, now - last) / 1000;
      last = now;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = bits.length - 1; i >= 0; i--) {
        const b = bits[i];
        if (!b) continue;
        b.life += dt * 1000;
        if (b.life >= b.max) {
          bits.splice(i, 1);
          continue;
        }
        b.vy += 260 * dt;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        const k = 1 - b.life / b.max;
        ctx.globalAlpha = k > 0.5 ? 1 : k * 2;
        ctx.fillStyle = b.color;
        const px = Math.round(b.x / GRID) * GRID;
        const py = Math.round(b.y / GRID) * GRID;
        const s = b.size * GRID;
        if (b.star) {
          ctx.fillRect(px - s, py, s * 3, s);
          ctx.fillRect(px, py - s, s, s * 3);
        } else {
          ctx.fillRect(px, py, s, s);
        }
      }
      ctx.globalAlpha = 1;
      raf = bits.length ? requestAnimationFrame(tick) : 0;
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || motionReduced()) return;
      const now = performance.now();
      if (now - lastSpawn < 24) return;
      lastSpawn = now;
      spawn(e.clientX + 6, e.clientY + 6, 1, false);
    };
    const onDown = (e: PointerEvent) => {
      if (motionReduced()) return;
      spawn(e.clientX, e.clientY, e.pointerType === 'mouse' ? 8 : 12, true);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('resize', resize);
    };
  }, [enabled]);

  return enabled ? <canvas ref={ref} className="retro-canvas" aria-hidden="true" /> : null;
}

function Pixel({ svg, className }: { svg: string; className?: string }) {
  return <span className={`pixel ${className ?? ''}`} aria-hidden="true" dangerouslySetInnerHTML={{ __html: svg }} />;
}

/** La lanterne qui se balance ; la toucher éteint ou rallume la lumière. */
export function SwingingLantern({ mode, off, onToggle }: { mode: 'page' | 'bar'; off: boolean; onToggle: () => void }) {
  return (
    <div className={`lantern-wrap ${mode}`}>
      <div className="lantern-rope" />
      <button
        type="button"
        className="lantern"
        aria-pressed={off}
        aria-label={t(off ? 'home.lightsOn' : 'home.lightsOff')}
        onClick={() => {
          onToggle();
          audio.play('twang', { force: true });
        }}
      >
        <Pixel svg={spriteSvg(LANTERN, mode === 'bar' ? 2.5 : 3)} />
        {!off && <span className="lantern-glow" />}
      </button>
    </div>
  );
}

export function ShipParade() {
  return (
    <div className="ship-lane" aria-hidden="true">
      <div className="ship">
        <Pixel svg={spriteSvg(SHIP, 3)} />
      </div>
      <div className="waves" />
    </div>
  );
}

export function Ticker() {
  const items = t('home.ticker').split(' | ');
  const line = items.map((x) => `★ ${x}`).join('   ');
  return (
    <div className="ticker" role="note" aria-label={items.join('. ')}>
      <div className="ticker-track" aria-hidden="true">
        <span>{line}</span>
        <span>{line}</span>
      </div>
    </div>
  );
}

export function VisitCounter({ value }: { value: number }) {
  const digits = String(value).padStart(6, '0').split('');
  return (
    <div className="counter-retro" aria-label={t('home.counter', { c: value })}>
      <span className="counter-label">{t('home.counterLabel')}</span>
      <span className="counter-digits" aria-hidden="true">
        {digits.map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </span>
    </div>
  );
}

export function Badges() {
  const badges: [string, string, string][] = [
    ['b1', 'SCORE KING', t('badge.handmade')],
    ['b2', t('badge.noAds'), t('badge.noTrack')],
    ['b3', t('badge.best'), t('badge.lantern')],
    ['b4', 'HISSEZ HAUT', 'v1.0'],
  ];
  return (
    <div className="badges" aria-hidden="true">
      {badges.map(([k, a, b]) => (
        <span key={k} className={`badge88 ${k}`}>
          <b>{a}</b>
          <i>{b}</i>
        </span>
      ))}
    </div>
  );
}

/** La mer se lève au fil de la partie : bruine à mi-parcours, orage et éclairs lointains à la fin. */
export function StormLayer({ game }: { game: Game }) {
  const progress = game.rounds.length / game.settings.cardsPerRound.length;
  const lvl = progress > 0.8 ? 3 : progress > 0.5 ? 2 : 1;
  return lvl > 1 ? <div className={`storm-layer lvl-${lvl}`} aria-hidden="true" /> : null;
}
