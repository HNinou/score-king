import { useEffect, useMemo, useRef, useState } from 'react';
import { audio } from '../audio/audio';
import { voice } from '../audio/voice';
import { FACT_QUIP, FACT_SOUND, factVars, headline, newLeader, roundFacts, roundScenes, spotlight, type PlayerFact } from '../game/events';
import { gameRanking, gameTotals, isLastRound, playerById, type Game, type Round } from '../game/model';
import { store, useStore } from '../game/store';
import { quip, t } from '../i18n/t';
import { Avatar, Crown, FactFx, Icon, RollingNumber, Seal, Signed } from './common';
import { RoundEditor } from './round';
import { Cinema } from './scenes';
import { FACT_ANIM } from './tokens';

const STAGGER = 380;

function factLabel(f: PlayerFact): string {
  if (f.diff === 0) return t('tricks.made');
  return t('tricks.missedBy', { x: f.diff });
}

function PlayerResult({ game, fact, i, before, first }: { game: Game; fact: PlayerFact; i: number; before: number; first: boolean }) {
  const p = playerById(game, fact.playerId);
  const delay = 500 + i * STAGGER;
  const [fx, setFx] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setFx(true), delay);
    return () => window.clearTimeout(id);
  }, [delay]);
  if (!p) return null;
  const r = fact.result;
  const moved = first ? 0 : fact.rankBefore - fact.rankAfter;
  return (
    <li className="card prow anim-rise" style={{ animationDelay: `${delay - 200}ms`, overflow: 'visible' }}>
      <div style={{ position: 'relative' }} className={fx ? FACT_ANIM[fact.kind] : ''}>
        <Avatar player={p} size={56} />
        {fx && <FactFx kind={fact.kind} />}
      </div>
      <div style={{ minWidth: 0 }}>
        <div className="name">{p.name}</div>
        <div className="meta num">
          <span className={fact.diff === 0 ? 'pos' : 'neg'}>
            <Icon name={fact.diff === 0 ? 'check' : 'cross'} size={14} /> {factLabel(fact)}
          </span>
          {' · '}
          {t('recap.bid')} <Signed value={r.bidPoints} />
          {r.bonusPoints !== 0 && (
            <>
              {' · '}
              {t('recap.bonus')} <Signed value={r.bonusPoints} />
            </>
          )}
          {r.wagerPoints !== 0 && (
            <>
              {' · '}
              {t('recap.wager')} <Signed value={r.wagerPoints} />
            </>
          )}
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 'var(--fs-xl)', fontWeight: 800 }}>
          <Signed value={r.total} />
        </div>
        <div className="num" style={{ fontWeight: 700 }}>
          <RollingNumber from={before} to={before + r.total} delay={delay} />
          {moved !== 0 && (
            <span className={moved > 0 ? 'pos' : 'neg'} style={{ marginLeft: 6, fontSize: 'var(--fs-s)' }} aria-label={moved > 0 ? t('recap.rankUp', { x: moved }) : t('recap.rankDown', { x: -moved })}>
              {moved > 0 ? '▲' : '▼'}
              {Math.abs(moved)}
            </span>
          )}
        </div>
      </div>
    </li>
  );
}

export function RecapScreen({ game, round, onFinish }: { game: Game; round: Round; onFinish: () => void }) {
  const witty = useStore().state.prefs.voice === 'witty';
  const facts = useMemo(() => roundFacts(game, round), [game, round]);
  const top = useMemo(() => headline(facts), [facts]);
  const leader = useMemo(() => newLeader(game, round), [game, round]);
  const before = gameTotals(game, round.index);
  const [show, setShow] = useState(false);
  const [edit, setEdit] = useState(false);
  const finished = game.status === 'finished';
  const reel = useMemo(() => roundScenes(game, round), [game, round]);
  const prefs = useStore().state.prefs;
  const [cinema, setCinema] = useState(
    () => reel.scenes.length > 0 && !prefs.reducedMotion && !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  const quipText = useMemo(() => {
    if (!witty || !top) return '';
    const key = FACT_QUIP[top.kind];
    const p = playerById(game, top.playerId);
    if (!key || !p) return '';
    return quip(game.id, key, factVars(game, top));
    // une réplique par bilan affiché
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round.index, witty]);

  useEffect(() => {
    if (cinema) return;
    audio.play('seal-stamp', { force: true });
    const timers = [
      window.setTimeout(() => top && audio.play(FACT_SOUND[top.kind], { force: true }), 700),
      window.setTimeout(() => voice.say(quipText), 1300),
    ];
    return () => timers.forEach((x) => window.clearTimeout(x));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round.index, cinema]);

  if (cinema) return <Cinema game={game} reel={reel} onDone={() => setCinema(false)} />;

  return (
    <main className="screen">
      <div style={{ textAlign: 'center' }}>
        <Seal text={`${round.index + 1}`} />
        <h1 className="title">{t('recap.title')}</h1>
        {quipText && (
          <p className="quip anim-rise" style={{ animationDelay: '400ms' }} aria-live="polite">
            {quipText}
          </p>
        )}
      </div>
      <ol className="stack" style={{ listStyle: 'none', padding: 0, marginTop: 'var(--sp-4)' }}>
        {facts.map((f, i) => (
          <PlayerResult key={f.playerId} game={game} fact={f} i={i} before={before[f.playerId] ?? 0} first={round.index === 0} />
        ))}
      </ol>
      <div className="footer-bar">
        <div className="stack" style={{ gap: 'var(--sp-2)' }}>
          <button className="btn primary block" type="button" onClick={() => setShow(true)}>
            {finished ? t('recap.finish') : t('recap.next')}
          </button>
          <button className="btn ghost block" type="button" onClick={() => setEdit(true)}>
            {t('recap.edit')}
          </button>
        </div>
      </div>
      {show && (
        <RankingShow
          game={game}
          round={round}
          leader={leader}
          exclude={top?.playerId}
          finished={finished}
          onDone={() => {
            setShow(false);
            if (finished) onFinish();
            else {
              store.dispatch({ type: 'nextRound' });
              window.scrollTo({ top: 0 });
            }
          }}
        />
      )}
      {edit && <RoundEditor game={game} round={round} onClose={() => setEdit(false)} />}
    </main>
  );
}

// ------------------------------------------------------------ annonce du classement (façon jeu de plateau)
const ROW_H = 76;

function RankingShow({
  game,
  round,
  leader,
  exclude,
  finished,
  onDone,
}: {
  game: Game;
  round: Round;
  leader: string | null;
  exclude: string | undefined;
  finished: boolean;
  onDone: () => void;
}) {
  const witty = useStore().state.prefs.voice === 'witty';
  const prev = gameRanking(game, round.index);
  const next = gameRanking(game, round.index + 1);
  const prevTotals = gameTotals(game, round.index);
  const [stage, setStage] = useState(0);
  const [medals, setMedals] = useState(0);

  useEffect(() => {
    const timers: number[] = [];
    const at = (ms: number, f: () => void) => timers.push(window.setTimeout(f, ms));
    at(650, () => {
      setStage(1);
      audio.play('whoosh', { force: true });
    });
    next.forEach((_, k) =>
      at(1500 + k * 220, () => {
        setMedals(k + 1);
        audio.play('tap-wood');
      }),
    );
    at(1500 + next.length * 220 + 100, () => {
      setStage(2);
      voice.say([leaderTextRef.current, remarkRef.current, lastTextRef.current].filter(Boolean).join(' … '));
      audio.play(leader ? 'new-captain' : 'coins', { force: true });
    });
    return () => timers.forEach((x) => window.clearTimeout(x));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [leaderText] = useState(() => {
    const p = leader ? playerById(game, leader) : undefined;
    return witty && p ? quip(game.id, 'newLeader', { nom: p.name }) : '';
  });
  const [remark] = useState(() => {
    if (!witty) return null;
    const sp = spotlight(game, round, exclude);
    if (!sp) return null;
    return { playerId: sp.playerId, text: quip(game.id, sp.key, sp.vars) };
  });
  const [lastText] = useState(() => {
    const upcoming = game.rounds.length === game.settings.cardsPerRound.length - 1;
    return witty && upcoming && !finished && !isLastRound(game, round) ? quip(game.id, 'lastRound', {}) : '';
  });
  const target = remark ? playerById(game, remark.playerId) : undefined;
  const leaderTextRef = useRef(leaderText);
  const remarkRef = useRef(remark?.text ?? '');
  const lastTextRef = useRef(lastText);

  const order = stage === 0 ? prev : next;
  const posOf = (id: string) => order.findIndex((x) => x.id === id);
  const revealFrom = next.length - medals; // les médailles apparaissent du bas vers le haut

  return (
    <div className="show" role="dialog" aria-modal="true" aria-label={t('rank.title')}>
      <div className="show-rays" />
      <h2 className="show-title">{t('rank.title')}</h2>
      <p className="show-sub">{t('rank.subtitle', { r: round.index + 1 })}</p>
      <div className="show-list" style={{ height: next.length * ROW_H }}>
        {next.map((entry) => {
          const p = playerById(game, entry.id);
          if (!p) return null;
          const pos = posOf(entry.id);
          const idxNew = next.findIndex((x) => x.id === entry.id);
          const shown = idxNew >= revealFrom;
          const before = prev.find((x) => x.id === entry.id)?.rank ?? entry.rank;
          const moved = round.index === 0 ? 0 : before - entry.rank;
          const lead = stage === 2 && entry.rank === 1;
          return (
            <div key={entry.id} className={`show-row ${lead ? 'lead' : ''} ${stage === 2 && remark?.playerId === entry.id ? 'targeted' : ''}`} style={{ transform: `translateY(${pos * ROW_H}px)` }}>
              <div className={`show-medal r${entry.rank} ${shown ? '' : 'hidden'}`} key={shown ? 'on' : 'off'}>
                {entry.rank}
              </div>
              <Avatar player={p} size={48} />
              {lead && (
                <span className="show-crown">
                  <Crown size={34} />
                </span>
              )}
              <span className="show-name">{p.name}</span>
              <span className="show-score">
                {stage === 0 ? prevTotals[entry.id] ?? 0 : <RollingNumber from={prevTotals[entry.id] ?? 0} to={entry.score} duration={700} />}
              </span>
              <span className={`show-delta ${moved > 0 ? 'up' : moved < 0 ? 'down' : ''}`}>
                {stage > 0 && moved !== 0 ? `${moved > 0 ? '▲' : '▼'}${Math.abs(moved)}` : ''}
              </span>
            </div>
          );
        })}
      </div>
      <div className="show-quip" aria-live="polite">
        {stage === 2 && (
          <>
            {leaderText && <p className="show-leader">{leaderText}</p>}
            {remark && target && (
              <div className="bubble">
                <Avatar player={target} size={40} />
                <p>{remark.text}</p>
              </div>
            )}
            {lastText && <p className="show-leader">{lastText}</p>}
          </>
        )}
      </div>
      <button
        className="btn primary"
        type="button"
        onClick={onDone}
      >
        {stage === 2 ? t('rank.continue') : t('rank.skip')}
      </button>
    </div>
  );
}
