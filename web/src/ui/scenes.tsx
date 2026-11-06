// Scènes de fin de manche, façon dessin animé : ce qui s'est vraiment passé (Kraken, pirates croqués,
// Roi noyé, naufrage…), de plus en plus déjanté à mesure que la partie avance (intensité 1 → 3).
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { audio, type SoundId } from '../audio/audio';
import { voice } from '../audio/voice';
import type { Scene, SceneReel } from '../game/events';
import { playerById, type Game, type Player } from '../game/model';
import { t } from '../i18n/t';
import { PirateAvatar } from './avatars';
import { Avatar, Crown } from './common';
import { PIRATES } from './pirates';

const DURATION = { 1: 2300, 2: 2700, 3: 3100 } as const;

const SOUND: Record<Scene['kind'], SoundId> = {
  kraken: 'kraken-roar',
  whale: 'splash',
  skullFeast: 'cannon',
  mermaidDrown: 'siren-song',
  lootPact: 'coins',
  shipwreck: 'sad-trombone',
  ghost: 'slide-up',
  crownSteal: 'new-captain',
};

const SHOUT: Record<Scene['kind'], string> = {
  kraken: 'scene.kraken',
  whale: 'scene.whale',
  skullFeast: 'scene.feast',
  mermaidDrown: 'scene.mermaid',
  lootPact: 'scene.loot',
  shipwreck: 'scene.wreck',
  ghost: 'scene.ghost',
  crownSteal: 'scene.crown',
};

const css = (o: Record<string, string | number>) => o as CSSProperties;
const rnd = (i: number) => ((i * 9301 + 49297) % 233280) / 233280;

function Title({ text, sub }: { text: string; sub?: string }) {
  return (
    <div className="cine-caption">
      <div className="cine-title">{text}</div>
      {sub && <div className="cine-sub">{sub}</div>}
    </div>
  );
}

interface TentacleSpec {
  x: number;
  y: number;
  len: number;
  width: number;
  /** courbure totale en radians (signe = sens d'enroulement) */
  curl: number;
  lean: number;
}

/** Tentacule effilé dont la pointe s'enroule : ligne médiane intégrée pas à pas, largeur décroissante. */
function tentacleShape(sp: TentacleSpec): { body: string; suckers: { x: number; y: number; r: number }[] } {
  const N = 48;
  const step = sp.len / N;
  let ang = -Math.PI / 2 + sp.lean;
  let x = sp.x;
  let y = sp.y;
  const left: string[] = [];
  const right: string[] = [];
  const suckers: { x: number; y: number; r: number }[] = [];
  const side = sp.curl >= 0 ? 1 : -1;
  for (let i = 0; i <= N; i++) {
    const k = i / N;
    const w = Math.max(1.2, (sp.width / 2) * Math.pow(1 - k, 0.85));
    const nx = Math.cos(ang + Math.PI / 2);
    const ny = Math.sin(ang + Math.PI / 2);
    left.push(`${(x + nx * w).toFixed(1)} ${(y + ny * w).toFixed(1)}`);
    right.push(`${(x - nx * w).toFixed(1)} ${(y - ny * w).toFixed(1)}`);
    if (i % 4 === 2 && k < 0.92) suckers.push({ x: x + nx * w * 0.55 * side, y: y + ny * w * 0.55 * side, r: Math.max(1.2, w * 0.32) });
    ang += (sp.curl / N) * (0.25 + 2.2 * k * k);
    x += Math.cos(ang) * step;
    y += Math.sin(ang) * step;
  }
  const body = `M${left.join(' L')} L${right.reverse().join(' L')} Z`;
  return { body, suckers };
}

function Tentacle({ sp, i, className = '' }: { sp: TentacleSpec; i: number; className?: string }) {
  const { body, suckers } = tentacleShape(sp);
  return (
    <g className={`tentacle ${className}`} style={css({ '--d': `${200 + i * 120}ms`, '--sw': `${4 + (i % 3) * 2}deg` })}>
      <path d={body} fill="url(#krakenSkin)" stroke="#2A0F26" strokeWidth="2" strokeLinejoin="round" />
      {suckers.map((c, k) => (
        <circle key={k} cx={c.x} cy={c.y} r={c.r} fill="#F2B8D2" stroke="#7A2E5A" strokeWidth="1" />
      ))}
    </g>
  );
}

const SIDE_TENTACLES: TentacleSpec[] = [
  { x: 40, y: 600, len: 330, width: 40, curl: 4.2, lean: -0.35 },
  { x: 360, y: 600, len: 340, width: 40, curl: -4.2, lean: 0.35 },
  { x: 110, y: 590, len: 230, width: 34, curl: -3.6, lean: -0.2 },
  { x: 290, y: 590, len: 240, width: 34, curl: 3.6, lean: 0.2 },
  { x: 8, y: 610, len: 420, width: 46, curl: -3, lean: 0.15 },
  { x: 392, y: 610, len: 410, width: 46, curl: 3, lean: -0.15 },
  { x: 150, y: 600, len: 160, width: 26, curl: 5, lean: -0.6 },
  { x: 250, y: 600, len: 170, width: 26, curl: -5, lean: 0.6 },
];

function KrakenScene({ intensity }: { intensity: number }) {
  const n = intensity === 3 ? 8 : intensity === 2 ? 6 : 4;
  return (
    <div className="scene kraken">
      <svg className="kraken-svg" viewBox="0 0 400 700" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        <defs>
          <radialGradient id="krakenSkin" cx="35%" cy="30%" r="80%">
            <stop offset="0%" stopColor="#B04A86" />
            <stop offset="60%" stopColor="#7A2E5A" />
            <stop offset="100%" stopColor="#3E1232" />
          </radialGradient>
          <radialGradient id="krakenEye" cx="40%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#FFF3A0" />
            <stop offset="70%" stopColor="#F2C14E" />
            <stop offset="100%" stopColor="#C97A1E" />
          </radialGradient>
        </defs>
        <g className="kraken-rise">
          {SIDE_TENTACLES.slice(0, n).map((sp, i) => (
            <Tentacle key={i} sp={sp} i={i} />
          ))}
          <g className="kraken-head">
            <path d="M104 610 C 86 520 98 400 200 360 C 302 400 314 520 296 610 Z" fill="url(#krakenSkin)" stroke="#2A0F26" strokeWidth="3" />
            {[[150, 420, 9], [236, 404, 7], [262, 450, 10], [130, 470, 6], [200, 392, 5], [170, 450, 4]].map(([cx, cy, r]) => (
              <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill="#C866A0" opacity="0.6" />
            ))}
            <path d="M138 486 L 182 500 M262 486 L 218 500" stroke="#2A0F26" strokeWidth="9" strokeLinecap="round" />
            <g className="kraken-eyes">
              <ellipse cx="162" cy="520" rx="24" ry="20" fill="url(#krakenEye)" stroke="#2A0F26" strokeWidth="3" />
              <ellipse cx="238" cy="520" rx="24" ry="20" fill="url(#krakenEye)" stroke="#2A0F26" strokeWidth="3" />
              <rect x="158" y="503" width="8" height="34" rx="4" fill="#14060F" />
              <rect x="234" y="503" width="8" height="34" rx="4" fill="#14060F" />
              <circle cx="154" cy="512" r="4" fill="#FFFFFF" opacity="0.8" />
              <circle cx="230" cy="512" r="4" fill="#FFFFFF" opacity="0.8" />
            </g>
          </g>
        </g>
        <g className="kraken-grab">
          <Tentacle sp={{ x: 330, y: 640, len: 540, width: 44, curl: -2.7, lean: 0 }} i={9} className="grabber" />
        </g>
        <g className="kraken-sea">
          <path d="M-20 590 Q 20 572 60 590 T 140 590 T 220 590 T 300 590 T 380 590 T 460 590 V 720 H -20 Z" fill="#0E2A3A" />
          <path d="M-20 590 Q 20 572 60 590 T 140 590 T 220 590 T 300 590 T 380 590 T 460 590" fill="none" stroke="#7FC4E0" strokeWidth="4" />
        </g>
      </svg>
      <Cards className="cine-trick dragged" />
      {intensity >= 2 &&
        Array.from({ length: intensity * 8 }, (_, i) => (
          <span key={i} className="spray" style={css({ left: `${10 + rnd(i) * 80}%`, '--dx': `${(rnd(i + 2) - 0.5) * 260}px`, '--d': `${400 + rnd(i + 5) * 700}ms` })} />
        ))}
      <Title text={t('scene.kraken')} sub={t('scene.krakenSub')} />
    </div>
  );
}

function Cards({ className }: { className: string }) {
  return (
    <div className={className} aria-hidden="true">
      {[0, 1, 2, 3].map((k) => (
        <span key={k} className="cine-card" style={css({ '--k': k })}>
          <span />
        </span>
      ))}
    </div>
  );
}

function WhaleScene() {
  return (
    <div className="scene whale">
      <Cards className="cine-trick blown" />
      <div className="whale-x">
        <svg className="whale-y" viewBox="0 0 210 110" aria-hidden="true">
          <path d="M8 60 C 30 18 120 8 170 40 C 185 30 195 14 204 8 C 200 36 194 50 184 58 C 194 70 198 86 204 102 C 190 92 180 82 170 74 C 120 102 40 100 8 60 Z" fill="#E9EEF2" stroke="#7FA0B4" strokeWidth="3" />
          <path d="M30 70 Q 70 84 120 76" stroke="#9FB6C4" strokeWidth="3" fill="none" />
          <circle cx="40" cy="50" r="4" fill="#1A100A" />
          <path d="M26 44 C 22 26 30 12 40 6 M30 42 C 30 24 40 14 52 10" stroke="#BEE3F2" strokeWidth="3" fill="none" />
        </svg>
      </div>
      {Array.from({ length: 16 }, (_, i) => <span key={i} className="spray" style={css({ left: `${30 + rnd(i) * 40}%`, '--dx': `${(rnd(i + 2) - 0.5) * 300}px`, '--d': `${700 + rnd(i + 5) * 300}ms` })} />)}
      <Title text={t('scene.whale')} sub={t('scene.whaleSub')} />
    </div>
  );
}

function SkullFeastScene({ player, heads, intensity }: { player: Player; heads: number; intensity: number }) {
  const n = Math.min(6, heads);
  const victims = PIRATES.filter((p) => p.id !== player.emblem).slice(0, n);
  const step = 1600 / Math.max(1, n);
  return (
    <div className="scene feast">
      <div className="feast-eater">
        <span className="feast-crown">
          <Crown size={90} />
        </span>
        <Avatar player={player} size={170} />
        <span className="feast-mouth" style={css({ '--n': n, '--step': `${step}ms` })} />
      </div>
      {victims.map((v, i) => (
        <span key={v.id} className="feast-head" style={css({ '--from': i % 2 ? '60vw' : '-60vw', '--d': `${300 + i * step}ms`, '--spin': `${(i % 2 ? 1 : -1) * 540}deg` })}>
          <PirateAvatar pirate={v.id} color="#3A3230" size={64} />
        </span>
      ))}
      {victims.map((v, i) => (
        <span key={`c${v.id}`} className="chomp" style={css({ '--d': `${300 + i * step + step * 0.8}ms`, left: `${30 + (i % 3) * 20}%` })}>
          {t('scene.chomp')}
        </span>
      ))}
      {intensity >= 2 &&
        Array.from({ length: 10 * intensity }, (_, i) => (
          <span key={`b${i}`} className="bone" style={css({ '--dx': `${(rnd(i) - 0.5) * 420}px`, '--dy': `${(rnd(i + 9) - 0.2) * -300}px`, '--d': `${600 + rnd(i + 4) * 1400}ms` })} />
        ))}
      <Title text={t('scene.feast')} sub={t('scene.feastSub', { nom: player.name, nb: heads })} />
    </div>
  );
}

function MermaidScene({ player }: { player: Player }) {
  return (
    <div className="scene mermaid">
      <span className="falling-crown">
        <Crown size={120} />
      </span>
      <svg className="tail" viewBox="0 0 100 210" aria-hidden="true">
        <defs>
          <pattern id="scales" width="10" height="8" patternUnits="userSpaceOnUse">
            <path d="M0 8 Q5 0 10 8" stroke="#1C6E6E" fill="none" strokeWidth="1.5" />
          </pattern>
        </defs>
        <path d="M38 210 C 30 160 44 120 44 80 C 30 56 10 40 0 18 C 24 24 40 32 50 48 C 60 32 76 24 100 18 C 90 40 70 56 56 80 C 56 120 70 160 62 210 Z" fill="#2E9E9A" />
        <path d="M38 210 C 30 160 44 120 44 80 L 56 80 C 56 120 70 160 62 210 Z" fill="url(#scales)" />
      </svg>
      {Array.from({ length: 18 }, (_, i) => <span key={i} className="bubble-up" style={css({ left: `${35 + rnd(i) * 30}%`, '--d': `${1100 + rnd(i + 3) * 900}ms`, '--s': `${6 + rnd(i + 6) * 14}px` })} />)}
      <div className="sea" />
      <span className="corner-avatar">
        <Avatar player={player} size={84} />
      </span>
      <Title text={t('scene.mermaid')} sub={t('scene.mermaidSub', { nom: player.name })} />
    </div>
  );
}

function LootScene({ a, b }: { a: Player; b: Player }) {
  return (
    <div className="scene loot">
      <span className="pact left">
        <Avatar player={a} size={120} />
      </span>
      <span className="pact right">
        <Avatar player={b} size={120} />
      </span>
      <span className="clank" />
      {Array.from({ length: 28 }, (_, i) => (
        <span key={i} className="fountain-coin" style={css({ '--dx': `${(rnd(i) - 0.5) * 380}px`, '--dy': `${-200 - rnd(i + 3) * 260}px`, '--d': `${900 + i * 25}ms` })} />
      ))}
      <Title text={t('scene.loot')} sub={t('scene.lootSub', { a: a.name, b: b.name })} />
    </div>
  );
}

function ShipwreckScene({ player, points, intensity }: { player: Player; points: number; intensity: number }) {
  return (
    <div className="scene wreck">
      {intensity >= 2 && <div className="rain" />}
      {intensity >= 3 && <div className="lightning" />}
      <div className="raft">
        <Avatar player={player} size={110} />
        <span className="planks" />
      </div>
      <svg className="fin" viewBox="0 0 60 50" aria-hidden="true">
        <path d="M0 50 C 20 40 30 18 44 0 C 44 20 50 38 60 50 Z" fill="#3E4E5A" />
      </svg>
      <div className="sea storm" />
      <Title text={t('scene.wreck')} sub={t('scene.wreckSub', { nom: player.name, points: `−${Math.abs(points)}` })} />
    </div>
  );
}

function GhostScene({ player }: { player: Player }) {
  return (
    <div className="scene ghost">
      <div className="sneak">
        <Avatar player={player} size={110} />
        <svg className="barrel" viewBox="0 0 120 130" aria-hidden="true">
          <path d="M14 30 C 6 60 6 90 14 124 L 106 124 C 114 90 114 60 106 30 Z" fill="#8A5A2B" stroke="#3A2210" strokeWidth="4" />
          <path d="M10 52 L 110 52 M8 92 L 112 92" stroke="#5A5A5A" strokeWidth="7" />
          <path d="M40 30 L 36 124 M80 30 L 84 124 M60 30 L 60 124" stroke="#6A4320" strokeWidth="2.5" />
          <ellipse cx="60" cy="30" rx="47" ry="10" fill="#5A3A1A" stroke="#3A2210" strokeWidth="4" />
          <text x="60" y="80" textAnchor="middle" fontFamily="Pirata One, serif" fontSize="22" fill="#F2E4C4">POUDRE</text>
        </svg>
      </div>
 {Array.from({ length: 6 }, (_, i) => <span key={i} className="step" style={css({ left: `${12 + i * 14}%`, '--d': `${250 + i * 300}ms` })} />)}
      <Title text={t('scene.ghost')} sub={t('scene.ghostSub', { nom: player.name })} />
    </div>
  );
}

function CrownScene({ from, to }: { from: Player; to: Player }) {
  return (
    <div className="scene crown">
      <span className="podest left sad">
        <Avatar player={from} size={110} />
      </span>
      <span className="podest right happy">
        <Avatar player={to} size={110} />
      </span>
      <span className="jumping-crown">
        <Crown size={70} />
      </span>
      <Title text={t('scene.crown')} sub={t('scene.crownSub', { nom: to.name })} />
    </div>
  );
}

function renderScene(game: Game, s: Scene, intensity: number): ReactNode {
  const p = (id: string) => playerById(game, id);
  switch (s.kind) {
    case 'kraken':
      return <KrakenScene intensity={intensity} />;
    case 'whale':
      return <WhaleScene />;
    case 'skullFeast': {
      const x = p(s.playerId);
      return x ? <SkullFeastScene player={x} heads={s.heads} intensity={intensity} /> : null;
    }
    case 'mermaidDrown': {
      const x = p(s.playerId);
      return x ? <MermaidScene player={x} /> : null;
    }
    case 'lootPact': {
      const a = p(s.a);
      const b = p(s.b);
      return a && b ? <LootScene a={a} b={b} /> : null;
    }
    case 'shipwreck': {
      const x = p(s.playerId);
      return x ? <ShipwreckScene player={x} points={s.points} intensity={intensity} /> : null;
    }
    case 'ghost': {
      const x = p(s.playerId);
      return x ? <GhostScene player={x} /> : null;
    }
    case 'crownSteal': {
      const a = p(s.from);
      const b = p(s.to);
      return a && b ? <CrownScene from={a} to={b} /> : null;
    }
  }
}

/** Enchaîne les scènes de la manche ; un tap passe à la suivante. */
export function Cinema({ game, reel, onDone }: { game: Game; reel: SceneReel; onDone: () => void }) {
  const [i, setI] = useState(0);
  const scene = reel.scenes[i];
  const next = () => (i + 1 >= reel.scenes.length ? onDone() : setI(i + 1));
  const nextRef = useRef(next);
  nextRef.current = next;
  const stageRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = stageRef.current;
    const h = (e: MouseEvent) => {
      if (!(e.target instanceof HTMLElement && e.target.closest('button'))) nextRef.current();
    };
    el?.addEventListener('click', h);
    return () => el?.removeEventListener('click', h);
  }, []);

  useEffect(() => {
    if (!scene) {
      onDone();
      return;
    }
    audio.play(SOUND[scene.kind], { force: true });
    const shout = SHOUT[scene.kind];
    window.setTimeout(() => voice.say(t(shout), { shout: true }), 250);
    const timers = [window.setTimeout(() => (i + 1 >= reel.scenes.length ? onDone() : setI(i + 1)), DURATION[reel.intensity])];
    if (scene.kind === 'skullFeast') {
      const n = Math.min(6, scene.heads);
      for (let k = 0; k < n; k++) timers.push(window.setTimeout(() => audio.play('chomp', { force: true }), 300 + ((k + 0.8) * 1600) / n));
    }
    if (scene.kind === 'kraken') timers.push(window.setTimeout(() => audio.play('splash', { force: true }), DURATION[reel.intensity] * 0.5));
    if (scene.kind === 'crownSteal') timers.push(window.setTimeout(() => audio.play('twang', { force: true }), DURATION[reel.intensity] * 0.45));
    return () => timers.forEach((x) => window.clearTimeout(x));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);

  if (!scene) return null;
  return (
    <div className={`cinema int-${reel.intensity}`} role="dialog" aria-modal="true" aria-label={t('scene.label')} ref={stageRef}>
      <div key={i} className="cinema-stage" style={css({ '--dur': `${DURATION[reel.intensity]}ms` })}>
        {renderScene(game, scene, reel.intensity)}
        {(reel.nth[i] ?? 1) > 1 && <span className="again-sticker">{t('scene.again', { n: reel.nth[i] ?? 1 })}</span>}
      </div>
      <div className="cinema-bar">
        <span className="cinema-dots" aria-hidden="true">
          {reel.scenes.map((_, k) => (
            <span key={k} className={k === i ? 'on' : ''} />
          ))}
        </span>
        <button type="button" className="btn" onClick={next}>
          {t('scene.next')}
        </button>
        <button type="button" className="btn ghost" onClick={onDone}>
          {t('scene.skip')}
        </button>
      </div>
    </div>
  );
}
