// Portraits de pirates originaux, style « gravure peinte » : visages burinés, lumière rasante,
// ombres hachurées, grain de toile. Dessinés en SVG à partir de pièces (chapeau, barbe, cheveux…).
import { useId } from 'react';
import { pirateById, type PirateLook } from './pirates';

const INK = '#1A100A';
const GOLD = '#C29A45';
const GOLD_HI = '#E8C878';
const HEAD = 'M29 46 Q28 25 50 24 Q72 25 71 46 Q71 60 66 70 Q59 80 50 81 Q41 80 34 70 Q29 60 29 46 Z';
const FACE_SHADE = 'M55 25 Q71 27 71 46 Q71 60 66 70 Q59 80 50 81 Q61 70 62 52 Q62 34 55 25 Z';

function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number): number => Math.max(0, Math.min(255, Math.round(v + amt * 255)));
  const r = c((n >> 16) & 255);
  const g = c((n >> 8) & 255);
  const b = c(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

interface PartProps {
  p: PirateLook;
  hatch: string;
}

function BackHair({ p }: PartProps) {
  const c = p.hairColor;
  switch (p.hair) {
    case 'long':
      return (
        <g>
          <path d="M26 44 Q22 72 16 98 L84 98 Q78 72 74 44 Q72 21 50 20 Q28 21 26 44 Z" fill={c} />
          <path d="M30 60 Q27 78 24 96 M70 60 Q73 78 76 96 M34 70 Q33 84 32 96" stroke={shade(c, 0.1)} strokeWidth="1" fill="none" opacity="0.7" />
        </g>
      );
    case 'braids':
      return (
        <g fill={c}>
          <path d="M27 46 Q24 70 27 92 L36 92 Q32 70 33 46 Z" />
          <path d="M73 46 Q76 70 73 92 L64 92 Q68 70 67 46 Z" />
          {[58, 65, 72, 79, 86].map((y) => (
            <g key={y} stroke={shade(c, 0.14)} strokeWidth="1.1">
              <path d={`M27 ${y} Q31 ${y + 3} 35 ${y}`} fill="none" />
              <path d={`M65 ${y} Q69 ${y + 3} 73 ${y}`} fill="none" />
            </g>
          ))}
          <circle cx="31" cy="92" r="2" fill={GOLD} />
          <circle cx="69" cy="92" r="2" fill={GOLD} />
        </g>
      );
    case 'curly':
      return (
        <g fill={c}>
          {[[25, 44], [23, 56], [25, 68], [29, 78], [75, 44], [77, 56], [75, 68], [71, 78], [32, 30], [68, 30], [50, 23], [40, 24], [60, 24]].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="9" />
          ))}
        </g>
      );
    case 'ponytail':
      return <path d="M69 44 Q88 52 84 84 Q79 70 71 62 Z" fill={c} />;
    default:
      return null;
  }
}

function TopHair({ p }: PartProps) {
  if (p.hair === 'short' && (p.hat === 'none' || p.hat === 'knit')) {
    return <path d="M29 44 Q28 24 50 23 Q72 24 71 44 Q64 33 50 33 Q36 33 29 44 Z" fill={p.hairColor} />;
  }
  if (p.hair === 'long' || p.hair === 'braids' || p.hair === 'ponytail') {
    return <path d="M29 46 Q31 30 50 30 Q69 30 71 46 Q63 36 50 37 Q37 36 29 46 Z" fill={p.hairColor} />;
  }
  return null;
}

function Beard({ p, hatch }: PartProps) {
  const c = p.hairColor;
  const strands = (
    <path d="M36 70 Q38 80 42 86 M44 72 Q45 82 47 88 M56 72 Q55 82 53 88 M64 70 Q62 80 58 86" stroke={shade(c, 0.12)} strokeWidth="0.9" fill="none" />
  );
  switch (p.beard) {
    case 'full':
      return (
        <g>
          <path d="M29 52 Q29 86 50 92 Q71 86 71 52 Q67 66 59 68 Q50 64 41 68 Q33 66 29 52 Z" fill={c} />
          <path d="M50 92 Q71 86 71 52 Q67 66 59 68 Q64 80 50 92 Z" fill={`url(#${hatch})`} />
          {strands}
        </g>
      );
    case 'braided':
      return (
        <g fill={c}>
          <path d="M29 52 Q29 80 50 86 Q71 80 71 52 Q67 66 59 68 Q50 64 41 68 Q33 66 29 52 Z" />
          {strands}
          <path d="M46 84 L54 84 L52.5 99 L47.5 99 Z" />
          <rect x="46.5" y="90" width="7" height="3" fill={GOLD} />
        </g>
      );
    case 'goatee':
      return <path d="M44 70 Q50 89 56 70 Q50 73 44 70 Z" fill={c} />;
    case 'stubble':
      return <path d="M30 54 Q31 80 50 82 Q69 80 70 54 Q66 70 50 72 Q34 70 30 54 Z" fill={c} opacity="0.42" />;
    case 'sideburns':
      return (
        <g fill={c}>
          <path d="M29 44 Q28 62 35 69 L37 60 Q33 54 33 44 Z" />
          <path d="M71 44 Q72 62 65 69 L63 60 Q67 54 67 44 Z" />
        </g>
      );
    default:
      return null;
  }
}

function Mustache({ p }: PartProps) {
  const c = shade(p.hairColor, -0.04);
  switch (p.mustache) {
    case 'thin':
      return <path d="M42 64.5 Q50 61 58 64.5 Q50 63 42 64.5 Z" fill={c} stroke={c} strokeWidth="1.3" />;
    case 'handlebar':
      return <path d="M50 62.5 Q42 59 36 64 Q30 63 31 57 Q29 65 36 67.5 Q44 67.5 50 64.5 Q56 67.5 64 67.5 Q71 65 69 57 Q70 63 64 64 Q58 59 50 62.5 Z" fill={c} />;
    case 'walrus':
      return <path d="M37 68 Q38 59 50 60.5 Q62 59 63 68 Q56 64.5 50 65.5 Q44 64.5 37 68 Z" fill={c} />;
    default:
      return null;
  }
}

function Mouth({ p }: PartProps) {
  if (p.skull) {
    return (
      <g>
        <path d="M40 68 Q50 72 60 68 L59 73 Q50 76 41 73 Z" fill="#2A221A" />
        {[43, 46.5, 50, 53.5, 57].map((x) => (
          <rect key={x} x={x - 1.3} y="68.6" width="2.6" height="4" rx="0.6" fill="#E8DFC8" />
        ))}
      </g>
    );
  }
  switch (p.mouth) {
    case 'snarl':
      return (
        <g>
          <path d="M42 68 Q50 65.5 59 66.5 Q55 72.5 49 72.5 Q44 72 42 68 Z" fill="#3A1410" />
          <path d="M44 68 Q50 66.6 57 67.4 L56.4 69 Q50 68.4 44.6 69.4 Z" fill="#E8DCC0" />
          {p.goldTooth && <rect x="51" y="67.2" width="2.6" height="2.2" fill={GOLD_HI} />}
          <path d="M44 74.5 Q50 76 55 74" stroke={INK} strokeWidth="0.8" fill="none" opacity="0.4" />
        </g>
      );
    case 'smirk':
      return <path d="M43.5 69.5 Q51 71.5 58 66.5" fill="none" stroke="#3A1A12" strokeWidth="1.9" strokeLinecap="round" />;
    case 'open':
      return (
        <g>
          <path d="M44 68 Q50 66 56 68 Q55.5 75 50 75.5 Q44.5 75 44 68 Z" fill="#3A1410" stroke={INK} strokeWidth="0.8" />
          {p.goldTooth && <rect x="48.6" y="67.4" width="3" height="2.2" fill={GOLD_HI} />}
        </g>
      );
    default:
      return <path d="M44 70 Q50 68.8 56 70" fill="none" stroke="#3A1A12" strokeWidth="1.9" strokeLinecap="round" />;
  }
}

function Brows({ p }: PartProps) {
  if (p.skull) return null;
  const pale = ['#B9B2A6'].includes(p.hairColor);
  const c = pale ? '#8E877C' : shade(p.hairColor, -0.04);
  const d =
    p.brows === 'grumpy'
      ? ['M34 42 Q40 42 46.5 46.5 L46 48 Q40 45 34 44.5 Z', 'M66 42 Q60 42 53.5 46.5 L54 48 Q60 45 66 44.5 Z']
      : p.brows === 'raised'
        ? ['M34 44 Q40 38.5 46.5 42.5 L46 44 Q40 41 34 45.5 Z', 'M54 42 Q60 37.5 66 41.5 L66 43.5 Q60 40 54 43.5 Z']
        : ['M34 44 Q40 42 46.5 44 L46.5 45.6 Q40 44 34 45.6 Z', 'M53.5 44 Q60 42 66 44 L66 45.6 Q60 44 53.5 45.6 Z'];
  return (
    <g fill={c}>
      {d.map((x) => (
        <path key={x} d={x} />
      ))}
    </g>
  );
}

function Eyes({ p }: PartProps) {
  if (p.skull) {
    return (
      <g>
        <path d="M34 46 Q40 41 47 46 Q46 55 40 55 Q34 54 34 46 Z" fill="#14100C" />
        <path d="M53 46 Q60 41 66 46 Q66 54 60 55 Q54 55 53 46 Z" fill="#14100C" />
        <circle cx="40.5" cy="49.5" r="1.8" fill={p.iris} />
        <circle cx="59.5" cy="49.5" r="1.8" fill={p.iris} />
        <circle cx="40.5" cy="49.5" r="4" fill={p.iris} opacity="0.25" />
        <circle cx="59.5" cy="49.5" r="4" fill={p.iris} opacity="0.25" />
        <path d="M50 56 L47.5 62 L52.5 62 Z" fill="#14100C" />
        <path d="M33 60 Q36 64 41 64 M67 60 Q64 64 59 64" stroke="#8E8470" strokeWidth="1" fill="none" />
        <path d="M45 30 L48 36 L46 40" stroke="#8E8470" strokeWidth="0.9" fill="none" />
      </g>
    );
  }
  const eye = (cx: number) => (
    <g>
      <ellipse cx={cx} cy="50.5" rx="5.6" ry="3.6" fill="#000" opacity="0.2" />
      <path d={`M${cx - 3.6} 50.6 Q${cx} 47.8 ${cx + 3.6} 50.4 Q${cx} 52.6 ${cx - 3.6} 50.6 Z`} fill="#EDE3CC" />
      <circle cx={cx + 0.4} cy="50.4" r="1.6" fill={p.iris} />
      <circle cx={cx + 0.4} cy="50.4" r="0.8" fill={INK} />
      <circle cx={cx + 0.9} cy="49.9" r="0.4" fill="#FFF" />
      <path d={`M${cx - 3.9} 50.5 Q${cx} 47.4 ${cx + 3.9} 50.2`} stroke={INK} strokeWidth="1.1" fill="none" />
    </g>
  );
  return (
    <g>
      {eye(40.5)}
      {p.eyepatch ? (
        <g>
          <path d="M27 40 Q46 43 73 55" stroke="#0E0B09" strokeWidth="1.6" fill="none" />
          <path d="M53.5 46.5 Q59.5 44 65 47 Q65.5 54 59.5 55.5 Q54 54.5 53.5 46.5 Z" fill="#0E0B09" />
          <path d="M55 47.5 Q59 46 62 47.5" stroke="#4A3E36" strokeWidth="0.8" fill="none" />
        </g>
      ) : (
        eye(59.5)
      )}
    </g>
  );
}

function Face({ p, hatch }: PartProps) {
  const dark = shade(p.skin, -0.16);
  return (
    <g>
      {/* ombre du côté droit + hachures façon gravure */}
      <path d={FACE_SHADE} fill="#2A1408" opacity="0.28" />
      <path d={FACE_SHADE} fill={`url(#${hatch})`} />
      {/* pommettes et joues creusées */}
      <path d="M33 60 Q37 63.5 42 62" stroke={dark} strokeWidth="1.1" fill="none" opacity="0.8" />
      <path d="M67 60 Q63 63.5 58 62" stroke={dark} strokeWidth="1.1" fill="none" opacity="0.8" />
      {!p.skull && (
        <g>
          {/* nez */}
          <path d="M50.5 48 Q53.5 57 53 60 Q51 62 48 60.6" stroke={dark} strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <path d="M51 49 Q54 57 53 60 Q52 61 50.5 61 Q53 56 51 49 Z" fill="#2A1408" opacity="0.25" />
          {/* sillons */}
          <path d="M45 62 Q42 65.5 42.6 70" stroke={dark} strokeWidth="1" fill="none" opacity="0.7" />
          <path d="M55 62 Q58 65.5 57.4 70" stroke={dark} strokeWidth="1" fill="none" opacity="0.7" />
        </g>
      )}
      {p.wrinkles && (
        <g stroke={dark} strokeWidth="0.9" fill="none" opacity="0.75">
          <path d="M40 35 Q50 33 60 35 M42 38.5 Q50 37 58 38.5" />
          <path d="M32 50 L29.6 48.6 M32 52 L29.4 52.4 M68 50 L70.4 48.6 M68 52 L70.6 52.4" />
        </g>
      )}
      {p.freckles && (
        <g fill={dark}>
          {[[36, 57], [39, 59], [34, 60], [64, 57], [61, 59], [66, 60], [49, 56], [52, 56]].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="0.8" />
          ))}
        </g>
      )}
      {/* lumière rasante sur la gauche */}
      <path d="M31 44 Q31 30 44 26" stroke="#FFF1D8" strokeWidth="1.6" fill="none" opacity="0.35" strokeLinecap="round" />
    </g>
  );
}

function Hat({ p, hatch }: PartProps) {
  const c = p.hatColor;
  const hi = shade(c, 0.1);
  switch (p.hat) {
    case 'tricorne':
      return (
        <g>
          <path d="M29 31 Q29 9 50 8 Q71 9 71 31 Z" fill={c} />
          <path d="M55 9 Q71 10 71 31 L60 31 Q62 16 55 9 Z" fill={`url(#${hatch})`} />
          <path d="M6 33 Q16 19 33 27 Q50 17 67 27 Q84 19 94 33 Q86 41 66 36 Q50 40 34 36 Q14 41 6 33 Z" fill={hi} />
          <path d="M6 33 Q16 19 33 27 Q50 17 67 27 Q84 19 94 33" fill="none" stroke={GOLD} strokeWidth="1.4" />
          <path d="M14 30 L16 33 M84 30 L82 34 M40 23 L41 26" stroke={shade(c, -0.1)} strokeWidth="1.2" />
          {p.skull && <path d="M74 25 L80 33 L86 27" fill="none" stroke={shade(c, -0.1)} strokeWidth="1.4" />}
        </g>
      );
    case 'bicorne':
      return (
        <g>
          <path d="M5 39 Q22 6 50 3 Q78 6 95 39 Q72 28 50 29 Q28 28 5 39 Z" fill={c} />
          <path d="M60 5 Q80 10 95 39 Q80 31 66 29 Q68 16 60 5 Z" fill={`url(#${hatch})`} />
          <path d="M5 39 Q28 28 50 29 Q72 28 95 39" fill="none" stroke={GOLD} strokeWidth="1.8" />
          <circle cx="50" cy="19" r="5" fill="#2A2420" stroke={GOLD} strokeWidth="1.4" />
          <path d="M47 19 L53 19 M50 16 L50 22" stroke={GOLD} strokeWidth="1.2" />
        </g>
      );
    case 'feather':
      return (
        <g>
          <path d="M60 22 Q78 2 97 0 Q90 12 68 25 Z" fill="#8E8270" />
          <path d="M62 22 Q79 7 95 1" stroke="#5A5044" strokeWidth="0.8" fill="none" />
          <path d="M66 18 L70 21 M72 13 L76 16 M78 9 L82 11" stroke="#5A5044" strokeWidth="0.7" />
          <path d="M30 33 Q30 11 50 11 Q70 11 70 33 Z" fill={c} />
          <path d="M57 12 Q70 13 70 33 L61 33 Q62 20 57 12 Z" fill={`url(#${hatch})`} />
          <path d="M14 35 Q50 26 86 35 Q78 41 50 39 Q22 41 14 35 Z" fill={hi} />
          <path d="M30 29 Q50 25 70 29 L70 32 Q50 28 30 32 Z" fill={GOLD} opacity="0.85" />
        </g>
      );
    case 'bandana':
      return (
        <g>
          <path d="M27 43 Q25 17 50 16 Q75 17 73 43 Q62 34 50 34 Q38 34 27 43 Z" fill={c} />
          <path d="M58 17 Q75 19 73 43 Q68 38 62 36 Q64 24 58 17 Z" fill={`url(#${hatch})`} />
          <path d="M71 36 L87 29 L83 42 Z M71 39 L85 49 L74 48 Z" fill={shade(c, -0.06)} />
          <path d="M32 30 Q50 22 68 30" stroke={shade(c, 0.12)} strokeWidth="1" fill="none" />
        </g>
      );
    case 'scarf':
      return (
        <g>
          <path d="M26 45 Q23 15 50 14 Q77 15 74 45 Q64 33 50 33 Q36 33 26 45 Z" fill={c} />
          <path d="M58 15 Q77 17 74 45 Q69 37 63 35 Q65 23 58 15 Z" fill={`url(#${hatch})`} />
          <path d="M29 36 Q50 27 71 36" stroke={shade(c, 0.14)} strokeWidth="1.6" fill="none" />
          <circle cx="27" cy="41" r="3" fill={GOLD} />
        </g>
      );
    case 'knit':
      return (
        <g>
          <path d="M29 38 Q28 11 50 11 Q72 11 71 38 Z" fill={c} />
          <path d="M57 12 Q72 14 71 38 L62 38 Q64 22 57 12 Z" fill={`url(#${hatch})`} />
          <rect x="27" y="32" width="46" height="9" rx="3" fill={shade(c, -0.08)} />
          {[32, 37, 42, 47, 52, 57, 62, 67].map((x) => (
            <line key={x} x1={x} y1="33" x2={x} y2="40" stroke={shade(c, 0.08)} strokeWidth="1" />
          ))}
        </g>
      );
    default:
      return <path d="M36 32 Q44 26 54 27" stroke="#FFF1D8" strokeWidth="2.4" fill="none" opacity="0.3" strokeLinecap="round" />;
  }
}

function Parrot({ hatch }: { hatch: string }) {
  return (
    <g transform="translate(-10 -2)">
      <path d="M78 99 Q72 84 76 72 Q80 62 88 64 Q94 68 92 78 Q90 90 82 99 Z" fill="#2E6E3E" />
      <path d="M80 88 Q84 80 90 82 Q88 92 82 99 Z" fill="#1E4A7A" />
      <path d="M86 66 Q92 70 91 80 Q88 90 82 99 Q88 84 86 66 Z" fill={`url(#${hatch})`} />
      <circle cx="86" cy="66" r="7" fill="#9E2A20" />
      <path d="M91 64 Q98 66 95 72 Q93 69 90 69 Z" fill="#D9B060" stroke={INK} strokeWidth="0.8" />
      <circle cx="87" cy="64" r="1.6" fill="#EDE3CC" />
      <circle cx="87.4" cy="64" r="0.8" fill={INK} />
    </g>
  );
}

export function PirateAvatar({
  pirate,
  color,
  size = 48,
  label,
}: {
  pirate: string;
  color: string;
  size?: number;
  label?: string;
}) {
  const p = pirateById(pirate);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const hatch = `h${uid}`;
  const skinShadow = shade(p.skin, -0.2);
  const parts: PartProps = { p, hatch };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className="pirate-avatar"
    >
      <defs>
        <clipPath id={`c${uid}`}>
          <circle cx="50" cy="50" r="44" />
        </clipPath>
        <radialGradient id={`bg${uid}`} cx="38%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#9A7445" />
          <stop offset="45%" stopColor="#4A3420" />
          <stop offset="100%" stopColor="#0E0906" />
        </radialGradient>
        <radialGradient id={`glow${uid}`} cx="50%" cy="100%" r="70%">
          <stop offset="0%" stopColor={color} stopOpacity="0.7" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`skin${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={shade(p.skin, 0.08)} />
          <stop offset="60%" stopColor={p.skin} />
          <stop offset="100%" stopColor={shade(p.skin, -0.14)} />
        </linearGradient>
        <linearGradient id={`ring${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={GOLD_HI} />
          <stop offset="50%" stopColor={GOLD} />
          <stop offset="100%" stopColor="#6A4E1E" />
        </linearGradient>
        <pattern id={hatch} width="2.4" height="2.4" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
          <line x1="0" y1="0" x2="0" y2="2.4" stroke="#140A04" strokeWidth="0.7" opacity="0.32" />
        </pattern>
        <filter id={`grain${uid}`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="2" seed="7" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.1  0 0 0 0 0.06  0 0 0 0 0.02  0 0 0 0.4 0" />
        </filter>
      </defs>
      <circle cx="50" cy="50" r="49.5" fill={`url(#ring${uid})`} />
      <circle cx="50" cy="50" r="46.6" fill={color} />
      <g clipPath={`url(#c${uid})`}>
        <rect width="100" height="100" fill={`url(#bg${uid})`} />
        <rect width="100" height="100" fill={`url(#glow${uid})`} opacity="0.55" />
        <BackHair {...parts} />
        <path d="M10 104 Q13 81 34 76 L66 76 Q87 81 90 104 Z" fill={p.coat} />
        <path d="M58 76 L66 76 Q87 81 90 104 L64 104 Q66 88 58 76 Z" fill={`url(#${hatch})`} />
        <path d="M41 76 L50 92 L59 76 Z" fill={p.skull ? '#3A3A32' : '#CFC2A4'} />
        <path d="M37 77 L50 97 M63 77 L50 97" stroke={GOLD} strokeWidth="1.3" />
        <path d="M42 70 L42 84 L58 84 L58 70 Z" fill={skinShadow} />
        <ellipse cx="28.5" cy="52" rx="3.6" ry="5.4" fill={skinShadow} />
        <ellipse cx="71.5" cy="52" rx="3.6" ry="5.4" fill={skinShadow} />
        <path d={HEAD} fill={`url(#skin${uid})`} />
        <TopHair {...parts} />
        <Face {...parts} />
        <Beard {...parts} />
        <Eyes {...parts} />
        <Brows {...parts} />
        <Mouth {...parts} />
        <Mustache {...parts} />
        {p.scar && <path d="M35 44 L41 61 M35.6 48 L38.6 47 M37.4 53 L40.4 52 M39 57.5 L42 56.5" stroke="#7A3024" strokeWidth="1.2" strokeLinecap="round" />}
        {p.earring && <circle cx="28" cy="59.5" r="2.6" fill="none" stroke={GOLD_HI} strokeWidth="1.4" />}
        <Hat {...parts} />
        {p.parrot && <Parrot hatch={hatch} />}
        <rect width="100" height="100" filter={`url(#grain${uid})`} />
        <circle cx="50" cy="50" r="44" fill="none" stroke="#000" strokeOpacity="0.55" strokeWidth="5" />
      </g>
      <circle cx="50" cy="50" r="44.2" fill="none" stroke={shade(color, -0.35)} strokeWidth="0.8" />
    </svg>
  );
}
