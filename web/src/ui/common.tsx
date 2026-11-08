import { useEffect, useRef, type ReactNode } from 'react';
import type { FactKind } from '../game/events';
import type { Player } from '../game/model';
import { t } from '../i18n/t';
import { PirateAvatar } from './avatars';
import { PLAYER_HEX } from './tokens';


export function Avatar({ player, size = 44, labelled = false }: { player: Player; size?: number; labelled?: boolean }) {
  return (
    <PirateAvatar
      pirate={player.emblem}
      color={PLAYER_HEX[player.color] ?? '#8C7A1E'}
      size={size}
      {...(labelled ? { label: player.name } : {})}
    />
  );
}

// ------------------------------------------------------------ icônes (grille 24, trait 1.8)
const ICONS: Record<string, ReactNode> = {
  undo: <path d="M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3" />,
  redo: <path d="m15 14 5-5-5-5M20 9H10a6 6 0 0 0 0 12h3" />,
  book: (
    <>
      <path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" />
      <path d="M4 21V5M8 7h7M8 11h7" />
    </>
  ),
  bell: (
    <>
      <path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z" />
      <path d="M10 20a2 2 0 0 0 4 0M12 3v2" />
    </>
  ),
  bellOff: (
    <>
      <path d="M6 16V11a6 6 0 0 1 9.5-4.9M18 11v5l2 2H8" />
      <path d="M10 20a2 2 0 0 0 4 0M3 3l18 18" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  back: <path d="M15 5 8 12l7 7" />,
  next: <path d="m9 5 7 7-7 7" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  up: <path d="m6 15 6-6 6 6" />,
  down: <path d="m6 9 6 6 6-6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="m5 12 5 5 9-10" />,
  cross: <path d="M6 6l12 12M18 6 6 18" />,
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" />
    </>
  ),
  scroll: (
    <>
      <path d="M7 3h11a2 2 0 0 1 2 2v2h-4" />
      <path d="M16 7v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2h11" />
      <path d="M7 3a2 2 0 0 0-2 2v12M9 9h4M9 13h4" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6M12 7.5v.5" />
    </>
  ),
  share: (
    <>
      <path d="M12 3v12M7 8l5-5 5 5" />
      <path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
    </>
  ),
  people: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </>
  ),
  fist: (
    <>
      <path d="M7 10V7a2 2 0 0 1 4 0v3M11 9V6a2 2 0 0 1 4 0v4M15 9a2 2 0 0 1 4 0v4a7 7 0 0 1-7 7h-1a6 6 0 0 1-6-6v-2a2 2 0 0 1 2-2h4" />
    </>
  ),
  hand: (
    <>
      <path d="M8 13V5a1.5 1.5 0 0 1 3 0v6M11 10V3.5a1.5 1.5 0 0 1 3 0V10M14 10V5a1.5 1.5 0 0 1 3 0v8a7 7 0 0 1-7 7 6 6 0 0 1-5-3l-2.5-4.5a1.5 1.5 0 0 1 2.6-1.5L8 13" />
    </>
  ),
  trash: <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />,
  coin: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v8M9.5 10h4a1.5 1.5 0 0 1 0 3h-3a1.5 1.5 0 0 0 0 3h4" />
    </>
  ),
  dice: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M8.5 8.5h.01M15.5 8.5h.01M12 12h.01M8.5 15.5h.01M15.5 15.5h.01" strokeWidth="2.6" strokeLinecap="round" />
    </>
  ),
};

export function Icon({ name, size = 24 }: { name: keyof typeof ICONS | string; size?: number }) {
  return (
    <svg className="icon" viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      {ICONS[name]}
    </svg>
  );
}

export function Crown({ size = 36 }: { size?: number }) {
  return (
    <svg viewBox="0 0 48 36" width={size} height={(size * 36) / 48} aria-hidden="true">
      <path d="M4 30 L2 8 L14 18 L24 2 L34 18 L46 8 L44 30 Z" fill="#E2B84A" stroke="#6A4E14" strokeWidth="2" strokeLinejoin="round" />
      <rect x="4" y="28" width="40" height="6" rx="2" fill="#C9A227" stroke="#6A4E14" strokeWidth="2" />
      <circle cx="24" cy="18" r="3" fill="#9E1B1B" />
      <circle cx="13" cy="22" r="2" fill="#12384D" />
      <circle cx="35" cy="22" r="2" fill="#12384D" />
    </svg>
  );
}

export function Seal({ text }: { text: string }) {
  return (
    <svg className="seal" viewBox="0 0 120 120" aria-hidden="true">
      <path
        d="M60 6 C72 4 80 12 90 14 C102 18 106 30 112 40 C118 52 114 64 114 74 C112 88 102 96 92 104 C80 112 70 116 58 114 C44 114 34 110 24 100 C14 92 6 80 6 66 C4 52 10 40 18 30 C26 18 40 8 60 6 Z"
        fill="#8E2420"
      />
      <circle cx="60" cy="60" r="40" fill="none" stroke="#6A1612" strokeWidth="3" />
      <circle cx="60" cy="60" r="34" fill="none" stroke="#B2433A" strokeWidth="1.5" strokeDasharray="3 4" />
      <text x="60" y="71" textAnchor="middle" fontFamily="system-ui, sans-serif" fontWeight="800" fontSize="32" fill="#F2D9C4">
        {text}
      </text>
    </svg>
  );
}

export function Compass() {
  return (
    <svg className="compass" viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r="46" fill="none" stroke="#C9A227" strokeWidth="3" />
      <circle cx="50" cy="50" r="38" fill="none" stroke="#C9A227" strokeWidth="1" strokeDasharray="2 5" />
      <path d="M50 10 L54 50 L50 90 L46 50 Z M10 50 L50 46 L90 50 L50 54 Z" fill="none" stroke="#C9A227" strokeWidth="1.2" />
      <g className="needle">
        <path d="M50 16 L56 50 L50 50 Z" fill="#9E1B1B" />
        <path d="M50 16 L44 50 L50 50 Z" fill="#C8463C" />
        <path d="M50 84 L56 50 L50 50 Z" fill="#BCA683" />
        <path d="M50 84 L44 50 L50 50 Z" fill="#F2E4C4" />
      </g>
      <circle cx="50" cy="50" r="4" fill="#C9A227" />
    </svg>
  );
}

// ------------------------------------------------------------ saisie
export function NumberGrid({
  max,
  value,
  onPick,
  label,
}: {
  max: number;
  value: number | null;
  onPick: (v: number) => void;
  label: string;
}) {
  const count = max + 1;
  const cols = count <= 6 ? count : Math.ceil(count / 2);
  return (
    <div className="numgrid" role="group" aria-label={label} style={{ ['--cols' as string]: cols }}>
      {Array.from({ length: count }, (_, i) => (
        <button key={i} type="button" aria-pressed={value === i} onClick={() => onPick(i)}>
          {i}
        </button>
      ))}
    </div>
  );
}

export function Modal({ onClose, label, children }: { onClose: () => void; label: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const backdrop = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = backdrop.current;
    const onDown = (e: MouseEvent) => {
      if (e.target === el) onClose();
    };
    el?.addEventListener('mousedown', onDown);
    return () => el?.removeEventListener('mousedown', onDown);
  }, [onClose]);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      prev?.focus();
    };
  }, [onClose]);
  return (
    <div className="modal-backdrop" ref={backdrop}>
      <div className="modal card" role="dialog" aria-modal="true" aria-label={label} tabIndex={-1} ref={ref}>
        {children}
      </div>
    </div>
  );
}

export function Confirm({ text, onYes, onNo }: { text: string; onYes: () => void; onNo: () => void }) {
  return (
    <Modal onClose={onNo} label={text}>
      <p style={{ fontSize: 'var(--fs-l)', marginTop: 0 }}>{text}</p>
      <div className="row">
        <button className="btn block" type="button" onClick={onNo}>
          {t('common.cancel')}
        </button>
        <button className="btn block primary" type="button" onClick={onYes}>
          {t('common.confirm')}
        </button>
      </div>
    </Modal>
  );
}

export function Signed({ value, className = '' }: { value: number; className?: string }) {
  const sign = value > 0 ? '+' : value < 0 ? '−' : '±';
  return (
    <span className={`num ${value > 0 ? 'pos' : value < 0 ? 'neg' : 'muted'} ${className}`}>
      {sign}
      {Math.abs(value)}
    </span>
  );
}

/** Nombre qui « roule » jusqu'à sa valeur. */
export function RollingNumber({ to, from = 0, duration = 900, delay = 0 }: { to: number; from?: number; duration?: number; delay?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced = document.documentElement.dataset.motion === 'reduced' || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      el.textContent = String(to);
      return;
    }
    let raf = 0;
    const start = performance.now() + delay;
    const step = (now: number) => {
      const k = Math.max(0, Math.min(1, (now - start) / duration));
      const e = 1 - Math.pow(1 - k, 3);
      el.textContent = String(Math.round(from + (to - from) * e));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    el.textContent = String(from);
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, from, duration, delay]);
  return (
    <span ref={ref} className="num">
      {to}
    </span>
  );
}

// ------------------------------------------------------------ effets par fait de jeu
const seeded = (i: number) => ((i * 9301 + 49297) % 233280) / 233280;

export function FactFx({ kind, delay = 0 }: { kind: FactKind; delay?: number }) {
  const style = { animationDelay: `${delay}ms` };
  switch (kind) {
    case 'bidMade':
    case 'grazed':
    case 'zeroBidMade':
      return (
        <div className="fx-layer" aria-hidden="true">
          {Array.from({ length: kind === 'zeroBidMade' ? 10 : 7 }, (_, i) => (
            <span
              key={i}
              className="fx-coin"
              style={{ ...style, animationDelay: `${delay + i * 70}ms`, ['--x' as string]: `${(seeded(i) - 0.5) * 160}px` }}
            />
          ))}
          {kind === 'zeroBidMade' &&
            Array.from({ length: 12 }, (_, i) => {
              const a = (i / 12) * Math.PI * 2;
              return (
                <span
                  key={`b${i}`}
                  className="fx-burst"
                  style={{ ...style, background: '#E2B84A', ['--dx' as string]: `${Math.cos(a) * 90}px`, ['--dy' as string]: `${Math.sin(a) * 60}px` }}
                />
              );
            })}
        </div>
      );
    case 'bidMissed':
    case 'zeroBidMissed':
      return (
        <div className="fx-layer" aria-hidden="true">
          {Array.from({ length: 8 }, (_, i) => (
            <span key={i} className="fx-drop" style={{ animationDelay: `${delay + i * 60}ms`, left: `${10 + seeded(i + 3) * 80}%` }} />
          ))}
          <svg className="fx-wave" viewBox="0 0 200 36" preserveAspectRatio="none" style={style}>
            <path d="M0 20 Q25 4 50 20 T100 20 T150 20 T200 20 V36 H0 Z" fill="#7FC4E0" opacity="0.55" />
          </svg>
        </div>
      );
    case 'bigLoss':
      return (
        <div className="fx-layer" aria-hidden="true">
          {Array.from({ length: 14 }, (_, i) => (
            <span key={i} className="fx-drop" style={{ animationDelay: `${delay + i * 50}ms`, left: `${5 + seeded(i + 7) * 90}%`, background: '#FF8A7A' }} />
          ))}
          <svg className="fx-wave" viewBox="0 0 200 36" preserveAspectRatio="none" style={style}>
            <path d="M0 14 Q25 0 50 14 T100 14 T150 14 T200 14 V36 H0 Z" fill="#12384D" opacity="0.7" />
          </svg>
        </div>
      );
    case 'skullKingCapture':
      return (
        <div className="fx-layer" aria-hidden="true">
          <span className="fx-flash" style={style} />
          {Array.from({ length: 16 }, (_, i) => {
            const a = (i / 16) * Math.PI * 2;
            return (
              <span
                key={i}
                className="fx-burst"
                style={{
                  ...style,
                  background: i % 2 ? '#3A3230' : '#E2B84A',
                  width: 14,
                  height: 14,
                  ['--dx' as string]: `${Math.cos(a) * 120}px`,
                  ['--dy' as string]: `${Math.sin(a) * 70}px`,
                }}
              />
            );
          })}
        </div>
      );
    case 'mermaidCapture':
      return (
        <div className="fx-layer" aria-hidden="true">
          {['♪', '♫', '♪', '♬', '♫', '♪'].map((n, i) => (
            <span key={i} className="fx-note" style={{ animationDelay: `${delay + i * 160}ms`, ['--dx' as string]: `${(seeded(i + 11) - 0.5) * 180}px` }}>
              {n}
            </span>
          ))}
          <svg className="fx-wave" viewBox="0 0 200 36" preserveAspectRatio="none" style={style}>
            <path d="M0 20 Q25 4 50 20 T100 20 T150 20 T200 20 V36 H0 Z" fill="#62D394" opacity="0.4" />
          </svg>
        </div>
      );
  }
}


export function Toast({ text, onDone }: { text: string; onDone: () => void }) {
  useEffect(() => {
    const id = window.setTimeout(onDone, 2400);
    return () => window.clearTimeout(id);
  }, [onDone]);
  return (
    <div className="toast" role="status">
      {text}
    </div>
  );
}
