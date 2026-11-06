import { useEffect, useRef, useState } from 'react';
import { audio } from '../audio/audio';
import { voice } from '../audio/voice';
import { EMPTY_BONUS, rawBonus } from '../engine/engine';
import type { Bonus, Cannon, ErrorCode, LootAlliance } from '../engine/types';
import {
  dealerOf,
  effectiveBid,
  entryDiff,
  isLastRound,
  leadOf,
  playerById,
  roundValidation,
  rulesOf,
  type Entry,
  type Game,
  type Round,
} from '../game/model';
import { store, useStore } from '../game/store';
import { errorText, quip, t } from '../i18n/t';
import { Avatar, Confirm, Icon, Modal, NumberGrid, Toast } from './common';
import { SpecialCards } from './special';

export interface RoundSetters {
  setBid: (pid: string, v: number) => void;
  setTricks: (pid: string, v: number) => void;
  setBonus: (pid: string, b: Bonus) => void;
  setHarry: (pid: string, v: number) => void;
  setWager: (pid: string, v: number) => void;
  setCannon: (pid: string, v: Cannon) => void;
  setDestroyed: (v: number) => void;
  setLoot: (a: LootAlliance[]) => void;
}

const liveSetters: RoundSetters = {
  setBid: (player, value) => store.dispatch({ type: 'setBid', player, value }),
  setTricks: (player, value) => store.dispatch({ type: 'setTricks', player, value }),
  setBonus: (player, bonus) => store.dispatch({ type: 'setBonus', player, bonus }),
  setHarry: (player, value) => store.dispatch({ type: 'setHarry', player, value }),
  setWager: (player, value) => store.dispatch({ type: 'setWager', player, value }),
  setCannon: (player, value) => store.dispatch({ type: 'setCannon', player, value }),
  setDestroyed: (value) => store.dispatch({ type: 'setDestroyed', value }),
  setLoot: (alliances) => store.dispatch({ type: 'setLoot', alliances }),
};

/** Joueur actif = premier sans valeur, à partir de l'entame. */
function firstMissing(g: Game, r: Round, field: 'bid' | 'tricks'): number {
  const n = r.entries.length;
  const start = (g.settings.firstDealerIndex + r.index + 1) % n;
  for (let k = 0; k < n; k++) {
    const i = (start + k) % n;
    if (r.entries[i]?.[field] === null) return i;
  }
  return -1;
}

function useDigitKeys(onDigit: (d: number) => void, onEnter: () => void, onMove: (d: number) => void): void {
  const ref = useRef({ onDigit, onEnter, onMove });
  ref.current = { onDigit, onEnter, onMove };
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || e.metaKey || e.ctrlKey || e.altKey) return;
      if (document.querySelector('[role="dialog"]')) return;
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        ref.current.onDigit(Number(e.key));
      } else if (e.key === 'Enter' && (e.target as HTMLElement | null)?.tagName !== 'BUTTON') {
        ref.current.onEnter();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        ref.current.onMove(1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        ref.current.onMove(-1);
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);
}

function RoundHeader({ game, round, onIncident }: { game: Game; round: Round; onIncident?: () => void }) {
  return (
    <div className="row muted" style={{ flexWrap: 'wrap', fontSize: 'var(--fs-s)', gap: 'var(--sp-3)', margin: 'var(--sp-2) 0 var(--sp-3)' }}>
      {onIncident && (
        <button type="button" className="chip" style={{ order: 9, marginLeft: 'auto' }} onClick={onIncident}>
          {t('incident.open')}
        </button>
      )}
      <strong style={{ color: 'var(--ink)', fontSize: 'var(--fs-l)' }} className="num">
        {t('round.cards', { n: round.cardsDealt })}
      </strong>
      <span>{t('round.dealer', { nom: dealerOf(game, round.index)?.name ?? '' })}</span>
      <span>{t('round.lead', { nom: leadOf(game, round.index)?.name ?? '' })}</span>
    </div>
  );
}

// ------------------------------------------------------------ donne et rituel « Yo-ho-ho »

/** Début de manche : qui distribue, combien de cartes (l'info dont la table a besoin en premier). */
function DealCard({ game, round, onYoho }: { game: Game; round: Round; onYoho: () => void }) {
  const dealer = dealerOf(game, round.index);
  const lead = leadOf(game, round.index);
  if (!dealer) return null;
  return (
    <section className="card deal anim-rise" aria-label={t('deal.who', { nom: dealer.name })}>
      <div className="deal-row">
        <Avatar player={dealer} size={56} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="deal-who">{t('deal.who', { nom: dealer.name })}</div>
          <div className="deal-n">
            <span className="num">{round.cardsDealt}</span> {t('deal.cards')}
          </div>
        </div>
        <div className="card-fan" aria-hidden="true">
          {Array.from({ length: Math.min(5, round.cardsDealt) }, (_, k) => (
            <span key={k} style={{ ['--k' as string]: k - (Math.min(5, round.cardsDealt) - 1) / 2 }} />
          ))}
        </div>
      </div>
      <p className="muted" style={{ margin: 'var(--sp-2) 0' }}>
        {lead && t('deal.lead', { nom: lead.name })}. {t('deal.hint')}
      </p>
      <button className="btn primary block" type="button" onClick={onYoho}>
        {t('deal.yoho')}
      </button>
    </section>
  );
}

/** Compte à rebours pour révéler les paris tous ensemble, comme à la table. */
function YohoOverlay({ onDone }: { onDone: () => void }) {
  const [k, setK] = useState(0);
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    audio.play('yoho', { force: true });
    const ts = [window.setTimeout(() => setK(1), 550), window.setTimeout(() => setK(2), 1100), window.setTimeout(() => done.current(), 1900)];
    return () => ts.forEach((x) => window.clearTimeout(x));
  }, []);
  return (
    <div className="yoho" role="alert">
      <span key={k} className={`yoho-word w${k}`}>
        {t(`yoho.${k + 1}`)}
      </span>
    </div>
  );
}

// ------------------------------------------------------------ paris
function BidsPhase({ game, round, onIncident }: { game: Game; round: Round; onIncident: () => void }) {
  const [active, setActive] = useState(() => Math.max(0, firstMissing(game, round, 'bid')));
  const [pass, setPass] = useState(false);
  const [yoho, setYoho] = useState(false);
  const rowRefs = useRef<(HTMLLIElement | null)[]>([]);
  const n = round.cardsDealt;
  const missing = round.entries.filter((e) => e.bid === null).length;
  const total = round.entries.reduce((s, e) => s + (e.bid ?? 0), 0);
  const cannon = game.settings.scoring === 'rascal' && game.settings.cannonEnabled;
  const witty = useStore().state.prefs.voice === 'witty';
  const quipKey = total > n ? 'bidsOver' : total < n ? 'bidsUnder' : 'bidsEven';
  const [quipText, setQuipText] = useState('');
  const [lastQuip] = useState(() => (isLastRound(game, round) && witty ? quip(game.id, 'lastRound', {}) : ''));

  useEffect(() => {
    if (missing === 0 && witty) {
      const q = quip(game.id, quipKey, { total, n });
      setQuipText(q);
      voice.say(q);
    } else setQuipText('');
  }, [missing, quipKey, total, n, witty, game.id]);

  const pick = (i: number, v: number) => {
    const e = round.entries[i];
    if (!e) return;
    liveSetters.setBid(e.playerId, v);
    audio.play('tap-wood');
    // passage automatique au suivant sans pari
    const after = round.entries.map((x, k) => (k === i ? { ...x, bid: v } : x));
    const nn = after.length;
    let next = -1;
    for (let k = 1; k <= nn; k++) {
      const j = (i + k) % nn;
      if (after[j]?.bid === null) {
        next = j;
        break;
      }
    }
    if (next >= 0) {
      setActive(next);
      rowRefs.current[next]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const go = () => {
    if (missing > 0) return;
    audio.play('bell-bids');
    store.dispatch({ type: 'toTricks' });
    window.scrollTo({ top: 0 });
  };

  useDigitKeys(
    (d) => d <= n && pick(active, d),
    go,
    (d) => setActive((a) => (a + d + round.entries.length) % round.entries.length),
  );

  if (pass) {
    return <PassAround game={game} round={round} onExit={() => setPass(false)} onPick={pick} />;
  }
  const fresh = round.entries.every((x) => x.bid === null);

  return (
    <main className="screen">
      <div className="row">
        <h1 className="title">{t('bids.title')}</h1>
        <span className="spacer" />
        <button className="btn ghost" type="button" onClick={() => setPass(true)}>
          <Icon name="people" /> {t('bids.passMode')}
        </button>
      </div>
      <RoundHeader game={game} round={round} onIncident={onIncident} />
      {lastQuip && <p className="quip">{lastQuip}</p>}
      {fresh && <DealCard game={game} round={round} onYoho={() => setYoho(true)} />}
      {yoho && <YohoOverlay onDone={() => setYoho(false)} />}
      <ol className="stack" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {round.entries.map((e, i) => {
          const p = playerById(game, e.playerId);
          if (!p) return null;
          const isDealer = dealerOf(game, round.index)?.id === p.id;
          return (
            <li
              key={e.playerId}
              ref={(el) => {
                rowRefs.current[i] = el;
              }}
              className={`card prow compact ${i === active ? 'active' : ''}`}
              onFocus={() => setActive(i)}
              onPointerDown={() => setActive(i)}
            >
              <div className="pline">
                <Avatar player={p} size={32} />
                <span className="name">
                  <span>{p.name}</span>
                </span>
                {isDealer && <span className="dealer-badge">{t('setup.dealerBadge')}</span>}
                <span className="value" aria-live="polite">
                  {e.bid ?? '–'}
                </span>
              </div>
              <NumberGrid max={n} value={e.bid} label={t('bids.bidOf', { nom: p.name })} onPick={(v) => pick(i, v)} />
              {cannon && e.bid !== null && (
                <div className="full seg">
                  {(['grapeshot', 'cannonball'] as const).map((c) => (
                    <button key={c} type="button" aria-pressed={e.cannon === c} onClick={() => liveSetters.setCannon(p.id, c)}>
                      <Icon name={c === 'cannonball' ? 'fist' : 'hand'} size={20} /> {t(`cannon.${c}`)}
                    </button>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ol>
      <div className="footer-bar">
        <div>
          <div className="footer-hint" aria-live="polite">
            <span className="num">{t('bids.total', { total, n })}</span>
            {quipText && <span> — {quipText}</span>}
          </div>
          <button className="btn primary block" type="button" disabled={missing > 0} onClick={go}>
            {missing > 0 ? t('bids.missing', { c: missing }) : t('bids.go')}
          </button>
        </div>
      </div>
    </main>
  );
}

/** Tour de table : un joueur à la fois, gros chiffres, paris précédents masqués. */
function PassAround({ game, round, onExit, onPick }: { game: Game; round: Round; onExit: () => void; onPick: (i: number, v: number) => void }) {
  const idx = firstMissing(game, round, 'bid');
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(false);
  }, [idx]);
  useEffect(() => {
    if (idx < 0) onExit();
  }, [idx, onExit]);
  const e = round.entries[idx];
  const p = e ? playerById(game, e.playerId) : undefined;
  if (!e || !p) return null;
  return (
    <main className="screen" style={{ textAlign: 'center' }}>
      <button className="btn ghost" type="button" onClick={onExit}>
        <Icon name="close" /> {t('bids.passExit')}
      </button>
      <div className="anim-rise" key={p.id} style={{ marginTop: 'var(--sp-5)' }}>
        <p className="muted">{t('bids.passHint')}</p>
        <div style={{ display: 'grid', placeItems: 'center' }}>
          <Avatar player={p} size={140} />
        </div>
        <h1 className="title hero">{p.name}</h1>
        <RoundHeader game={game} round={round} />
        {!ready ? (
          <button className="btn primary block" type="button" onClick={() => setReady(true)}>
            {t('bids.passReady')}
          </button>
        ) : (
          <NumberGrid max={round.cardsDealt} value={null} label={t('bids.bidOf', { nom: p.name })} onPick={(v) => onPick(idx, v)} />
        )}
      </div>
    </main>
  );
}

// ------------------------------------------------------------ plis
function BonusModal({
  game,
  entry,
  onSave,
  onClose,
}: {
  game: Game;
  entry: Entry;
  onSave: (b: Bonus) => void;
  onClose: () => void;
}) {
  const p = playerById(game, entry.playerId);
  const b = entry.bonus;
  const rules = rulesOf(game.settings);
  const set = (patch: Partial<Bonus>) => {
    onSave({ ...b, ...patch });
    audio.play('tap-wood');
  };
  const counter = (label: string, value: number, max: number, each: number, key: 'standard14' | 'piratesBySkullKing' | 'mermaidsByPirate') => (
    <div className="counter">
      <div>
        <div style={{ fontWeight: 600 }}>{label}</div>
        <div className="muted" style={{ fontSize: 'var(--fs-xs)' }}>
          {t('bonus.each', { v: each })}
        </div>
      </div>
      <div className="stepper">
        <button type="button" onClick={() => set({ [key]: Math.max(0, value - 1) })} disabled={value <= 0} aria-label={`${label} −1`}>
          −
        </button>
        <output aria-live="polite">{value}</output>
        <button type="button" onClick={() => set({ [key]: Math.min(max, value + 1) })} disabled={value >= max} aria-label={`${label} +1`}>
          +
        </button>
      </div>
    </div>
  );
  const toggle = (label: string, value: boolean, pts: number, key: 'black14' | 'skullKingByMermaid') => (
    <div className="counter">
      <div>
        <div style={{ fontWeight: 600 }}>{label}</div>
        <div className="muted" style={{ fontSize: 'var(--fs-xs)' }}>
          +{pts}
        </div>
      </div>
      <input
        type="checkbox"
        aria-label={label}
        style={{ width: 28, height: 28, accentColor: 'var(--action)' }}
        checked={value}
        onChange={(e) => set({ [key]: e.target.checked })}
      />
    </div>
  );
  return (
    <Modal onClose={onClose} label={t('bonus.title', { nom: p?.name ?? '' })}>
      <div className="row">
        {p && <Avatar player={p} size={44} />}
        <h2 className="title" style={{ fontSize: 'var(--fs-xl)' }}>
          {t('bonus.title', { nom: p?.name ?? '' })}
        </h2>
        <span className="spacer" />
        <span className="bonus-badge num" style={{ fontSize: 'var(--fs-xl)' }}>
          +{rawBonus(b, rules)}
        </span>
      </div>
      {counter(t('bonus.standard14'), b.standard14, 3, 10, 'standard14')}
      {toggle(t('bonus.black14'), b.black14, 20, 'black14')}
      {counter(t('bonus.piratesBySK'), b.piratesBySkullKing, 6, 30, 'piratesBySkullKing')}
      {toggle(t('bonus.skByMermaid'), b.skullKingByMermaid, rules.skullKingByMermaidBonus, 'skullKingByMermaid')}
      {rules.mermaidByPirateBonusEnabled && counter(t('bonus.mermaidsByPirate'), b.mermaidsByPirate, 2, 20, 'mermaidsByPirate')}
      <button className="btn primary block" type="button" style={{ marginTop: 'var(--sp-4)' }} onClick={onClose}>
        {t('bonus.done')}
      </button>
    </Modal>
  );
}

export function TricksPanel({
  game,
  round,
  setters,
  editBids = false,
}: {
  game: Game;
  round: Round;
  setters: RoundSetters;
  editBids?: boolean;
}) {
  const [bonusFor, setBonusFor] = useState<string | null>(null);
  const [active, setActive] = useState(() => Math.max(0, firstMissing(game, round, 'tricks')));
  const witty = useStore().state.prefs.voice === 'witty';
  const n = round.cardsDealt;
  const v = roundValidation(game, round);
  const complete = round.entries.every((e) => e.tricks !== null);
  const rules = rulesOf(game.settings);
  const twoPlayers = game.players.length === 2;
  const assigned = round.entries.reduce((s, e) => s + (e.tricks ?? 0), 0);
  const remaining = n - round.destroyedTricks - assigned;
  const msg = (code: ErrorCode, pid?: string) =>
    errorText(code, witty, { n, nom: (pid && playerById(game, pid)?.name) || '', x: Math.abs(v.tricksDelta) });

  const pick = (i: number, val: number) => {
    const e = round.entries[i];
    if (!e) return;
    setters.setTricks(e.playerId, val);
    audio.play('tap-wood');
    const after = round.entries.map((x, k) => (k === i ? { ...x, tricks: val } : x));
    for (let k = 1; k <= after.length; k++) {
      const j = (i + k) % after.length;
      if (after[j]?.tricks === null) {
        setActive(j);
        break;
      }
    }
  };

  useDigitKeys(
    (d) => d <= n && pick(active, d),
    () => undefined,
    (d) => setActive((a) => (a + d + round.entries.length) % round.entries.length),
  );

  let counterText: string;
  let counterOk = false;
  if (remaining > 0 && twoPlayers && complete) counterText = t('tricks.ghost', { x: remaining });
  else if (remaining > 0) counterText = t('tricks.remaining', { x: remaining });
  else if (remaining < 0) counterText = t('tricks.extra', { x: -remaining });
  else {
    counterText = t('tricks.allSet');
    counterOk = true;
  }
  const sumError = complete && v.codes.includes('TRICKS_SUM_MISMATCH');
  const globalCodes = v.codes.filter((c) => !v.players[c] && c !== 'TRICKS_SUM_MISMATCH');
  const bonusEntry = round.entries.find((e) => e.playerId === bonusFor);

  return (
    <>
      <div
        className="card banner num"
        role="status"
        aria-live="polite"
        style={{ marginBottom: 'var(--sp-3)', color: sumError ? 'var(--negative)' : counterOk || (twoPlayers && remaining > 0 && complete) ? 'var(--positive)' : 'var(--ink)' }}
      >
        <Icon name={counterOk ? 'check' : sumError ? 'cross' : 'coin'} size={20} />{' '}
        {sumError ? errorText(v.tricksDelta > 0 ? 'TRICKS_SUM_MISMATCH_MISSING' : 'TRICKS_SUM_MISMATCH', witty, { x: Math.abs(v.tricksDelta) }) : counterText}
      </div>

      <ol className="stack" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {round.entries.map((e, i) => {
          const p = playerById(game, e.playerId);
          if (!p) return null;
          const diff = entryDiff(e);
          const bonusPts = rawBonus(e.bonus, rules);
          const errs = (Object.keys(v.players) as ErrorCode[]).filter((c) => v.players[c]?.includes(p.id));
          return (
            <li key={p.id} className={`card prow compact ${i === active ? 'active' : ''}`} onPointerDown={() => setActive(i)} onFocus={() => setActive(i)}>
              <div className="pline">
                <Avatar player={p} size={32} />
                <span className="name">
                  <span>{p.name}</span>
                </span>
                <span className="bid-pill num">
                  {t('recap.bid')} {effectiveBid(e) ?? '–'}
                  {e.harryAdjustment !== 0 && ` (${e.bid ?? 0}${e.harryAdjustment > 0 ? '+' : '−'}${Math.abs(e.harryAdjustment)})`}
                </span>
                <span className="value" aria-live="polite">
                  {e.tricks ?? '–'}
                </span>
              </div>
              {editBids && (
                <>
                  <span className="muted" style={{ fontSize: 'var(--fs-xs)' }}>
                    {t('bids.bidOf', { nom: p.name })}
                  </span>
                  <NumberGrid max={n} value={e.bid} label={t('bids.bidOf', { nom: p.name })} onPick={(x) => setters.setBid(p.id, x)} />
                  <span className="muted" style={{ fontSize: 'var(--fs-xs)' }}>
                    {t('tricks.tricksOf', { nom: p.name })}
                  </span>
                </>
              )}
              <NumberGrid max={n} value={e.tricks} label={t('tricks.tricksOf', { nom: p.name })} onPick={(x) => pick(i, x)} />
              <div className="pline sub">
                {diff !== null ? (
                  <span key={`${diff}`} className={`status ${diff === 0 ? 'pos' : 'neg'}`}>
                    <Icon name={diff === 0 ? 'check' : 'cross'} size={16} />
                    {diff === 0 ? t('tricks.made') : t('tricks.missedBy', { x: diff })}
                  </span>
                ) : (
                  <span />
                )}
                <span className="spacer" />
                {bonusPts > 0 && <span className="bonus-badge num anim-pop">+{bonusPts}</span>}
                <button className="chip" type="button" disabled={!e.tricks} onClick={() => setBonusFor(p.id)}>
                  + {t('tricks.bonus')}
                </button>
              {game.settings.scoring === 'rascal' && game.settings.cannonEnabled && (
                  <span className="muted" style={{ fontSize: 'var(--fs-s)' }}>
                    <Icon name={e.cannon === 'cannonball' ? 'fist' : 'hand'} size={16} /> {t(`cannon.${e.cannon}`)}
                  </span>
                )}
              </div>
              {errs.length > 0 && (
                <div className="full stack" style={{ gap: 4 }}>
                  {errs.map((c) => (
                    <p key={c} className="err" role="alert" style={{ margin: 0 }}>
                      <Icon name="cross" size={16} /> {msg(c, p.id)}
                    </p>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <div style={{ marginTop: 'var(--sp-3)' }}>
        <SpecialCards game={game} round={round} setters={setters} />
      </div>

      {globalCodes.length > 0 && (
        <div className="stack" style={{ marginTop: 'var(--sp-3)' }}>
          {globalCodes.map((c) => (
            <p key={c} className="err" role="alert">
              <Icon name="cross" size={16} /> {msg(c)}
            </p>
          ))}
        </div>
      )}

      {bonusEntry && (
        <BonusModal
          game={game}
          entry={bonusEntry}
          onSave={(b) => setters.setBonus(bonusEntry.playerId, b)}
          onClose={() => setBonusFor(null)}
        />
      )}
    </>
  );
}

function TricksPhase({ game, round, onValidated, onIncident }: { game: Game; round: Round; onValidated: () => void; onIncident: () => void }) {
  const v = roundValidation(game, round);
  const missing = round.entries.filter((e) => e.tricks === null).length;
  const ok = missing === 0 && v.codes.length === 0;
  const validate = () => {
    if (!ok) {
      audio.play('parrot-squawk');
      return;
    }
    onValidated();
    store.dispatch({ type: 'validateRound' });
    window.scrollTo({ top: 0 });
  };
  return (
    <main className="screen">
      <div className="row">
        <h1 className="title">{t('tricks.title')}</h1>
        <span className="spacer" />
        <button className="btn ghost" type="button" onClick={() => store.dispatch({ type: 'toBids' })}>
          {t('bids.edit')}
        </button>
      </div>
      <RoundHeader game={game} round={round} onIncident={onIncident} />
      <TricksPanel game={game} round={round} setters={liveSetters} />
      <div className="footer-bar">
        <div>
          <div className="footer-hint" aria-live="polite">
            {missing > 0 ? t('tricks.missing', { c: missing }) : v.codes.length > 0 ? t('tricks.fixErrors') : ''}
          </div>
          <button className="btn primary block" type="button" aria-disabled={!ok} style={ok ? undefined : { opacity: 0.5 }} onClick={validate}>
            {t('tricks.validate')}
          </button>
        </div>
      </div>
    </main>
  );
}

function IncidentModal({ round, onClose, onVoided }: { round: Round; onClose: () => void; onVoided: () => void }) {
  const [confirm, setConfirm] = useState(false);
  if (confirm) {
    return (
      <Confirm
        text={t('incident.voidConfirm', { r: round.index + 1 })}
        onNo={() => setConfirm(false)}
        onYes={() => {
          store.dispatch({ type: 'voidRound' });
          audio.play('splash', { force: true });
          onVoided();
          onClose();
        }}
      />
    );
  }
  return (
    <Modal onClose={onClose} label={t('incident.title')}>
      <h2 className="title" style={{ fontSize: 'var(--fs-xl)', marginTop: 0 }}>
        {t('incident.title')}
      </h2>
      <div className="stack">
        <div className="card pad stack" style={{ gap: 'var(--sp-2)' }}>
          <p style={{ margin: 0 }}>{t('incident.redealHint')}</p>
          <button
            className="btn block"
            type="button"
            onClick={() => {
              store.dispatch({ type: 'redealRound' });
              audio.play('rewind', { force: true });
              onClose();
            }}
          >
            <Icon name="undo" /> {t('incident.redeal')}
          </button>
        </div>
        <div className="card pad stack" style={{ gap: 'var(--sp-2)' }}>
          <p style={{ margin: 0 }}>{t('incident.voidHint')}</p>
          <button className="btn block danger" type="button" onClick={() => setConfirm(true)}>
            <Icon name="cross" /> {t('incident.void')}
          </button>
        </div>
        <button className="btn ghost block" type="button" onClick={onClose}>
          {t('common.close')}
        </button>
      </div>
    </Modal>
  );
}

export function RoundScreen({ game, round, onValidated, onVoided }: { game: Game; round: Round; onValidated: () => void; onVoided: () => void }) {
  const [incident, setIncident] = useState(false);
  const [toast, setToast] = useState('');
  const open = () => setIncident(true);
  return (
    <>
      {round.phase === 'bids' ? (
        <BidsPhase key={round.index} game={game} round={round} onIncident={open} />
      ) : (
        <TricksPhase key={round.index} game={game} round={round} onValidated={onValidated} onIncident={open} />
      )}
      {incident && (
        <IncidentModal
          round={round}
          onClose={() => setIncident(false)}
          onVoided={() => {
            setToast(t('incident.voided'));
            onVoided();
          }}
        />
      )}
      {toast && <Toast text={toast} onDone={() => setToast('')} />}
    </>
  );
}

/** Édition d'une manche passée (copie locale, enregistrée d'un bloc). */
export function RoundEditor({ game, round, onClose }: { game: Game; round: Round; onClose: () => void }) {
  const [draft, setDraft] = useState<Round>(round);
  const patch = (pid: string, f: (e: Entry) => Entry) => setDraft((r) => ({ ...r, entries: r.entries.map((e) => (e.playerId === pid ? f(e) : e)) }));
  const setters: RoundSetters = {
    setBid: (pid, v) => patch(pid, (e) => ({ ...e, bid: v })),
    setTricks: (pid, v) => patch(pid, (e) => ({ ...e, tricks: v, bonus: v === 0 ? { ...EMPTY_BONUS } : e.bonus })),
    setBonus: (pid, b) => patch(pid, (e) => ({ ...e, bonus: b })),
    setHarry: (pid, v) => patch(pid, (e) => ({ ...e, harryAdjustment: v })),
    setWager: (pid, v) => patch(pid, (e) => ({ ...e, rascalWager: v })),
    setCannon: (pid, v) => patch(pid, (e) => ({ ...e, cannon: v })),
    setDestroyed: (v) => setDraft((r) => ({ ...r, destroyedTricks: v })),
    setLoot: (a) => setDraft((r) => ({ ...r, lootAlliances: a })),
  };
  const v = roundValidation(game, draft);
  const ok = draft.voided === true || (v.codes.length === 0 && draft.entries.every((e) => e.bid !== null && e.tricks !== null));
  return (
    <Modal onClose={onClose} label={t('round.title', { r: round.index + 1 })}>
      <h2 className="title">{t('round.title', { r: round.index + 1 })}</h2>
      <RoundHeader game={game} round={draft} />
      {draft.voided ? (
        <p className="banner card">{t('ledger.voided')}</p>
      ) : (
        <TricksPanel game={game} round={draft} setters={setters} editBids />
      )}
      <button className="btn ghost block" type="button" style={{ marginTop: 'var(--sp-3)' }} onClick={() => setDraft((r) => ({ ...r, voided: !r.voided }))}>
        {draft.voided ? t('editor.unvoid') : t('editor.void')}
      </button>
      <div className="row" style={{ marginTop: 'var(--sp-4)', position: 'sticky', bottom: 0 }}>
        <button className="btn block" type="button" onClick={onClose}>
          {t('common.cancel')}
        </button>
        <button
          className="btn primary block"
          type="button"
          disabled={!ok}
          onClick={() => {
            store.dispatch({ type: 'replaceRound', round: draft });
            audio.play('seal-stamp');
            onClose();
          }}
        >
          {t('common.confirm')}
        </button>
      </div>
    </Modal>
  );
}
