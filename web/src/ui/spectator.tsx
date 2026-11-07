// Tribune des spectateurs : suit en direct la partie diffusée par l'hôte, en lecture seule.
import { useEffect, useMemo, useRef, useState } from 'react';
import { currentRound, dealerOf, effectiveBid, gameRanking, playerById, roundScores, type Game } from '../game/model';
import { useStore } from '../game/store';
import { t } from '../i18n/t';
import { watch, type WatchStatus } from '../sync/live';
import { Avatar, Compass, Crown, Icon, RollingNumber, Signed } from './common';
import { Ledger } from './ledger';

export function SpectatorApp({ code }: { code: string }) {
  const { state } = useStore();
  const [game, setGame] = useState<Game | null>(null);
  const [status, setStatus] = useState<WatchStatus>('connecting');
  const [ledger, setLedger] = useState(false);
  const prevTotals = useRef<Record<string, number>>({});

  useEffect(() => watch(code, setGame, setStatus), [code]);
  useEffect(() => {
    const root = document.documentElement;
    if (state.prefs.theme === 'auto') delete root.dataset.theme;
    else root.dataset.theme = state.prefs.theme;
  }, [state.prefs.theme]);

  const ranking = useMemo(() => (game ? gameRanking(game) : []), [game]);
  useEffect(() => {
    const id = window.setTimeout(() => {
      prevTotals.current = Object.fromEntries(ranking.map((r) => [r.id, r.score]));
    }, 1200);
    return () => window.clearTimeout(id);
  }, [ranking]);

  const leave = () => {
    window.location.hash = '';
    window.location.reload();
  };

  if (!game) {
    return (
      <main className="screen" style={{ textAlign: 'center', paddingTop: '20vh' }}>
        <Compass />
        <h1 className="title">{t('watch.title')}</h1>
        <p className="muted" role="status">
          {status === 'notFound' ? t('watch.notFound', { c: code }) : t('watch.connecting', { c: code })}
        </p>
        <button className="btn ghost" type="button" onClick={leave}>
          {t('watch.leave')}
        </button>
      </main>
    );
  }

  const r = currentRound(game);
  const total = game.settings.cardsPerRound.length;
  const scores = r && r.phase === 'done' ? roundScores(game, r) : {};
  const finished = game.status !== 'inProgress';
  const winners = ranking.filter((x) => x.rank === 1).map((x) => playerById(game, x.id)?.name ?? '');

  return (
    <main className="screen spectator">
      <div className="row" style={{ flexWrap: 'wrap' }}>
        <h1 className="title">{t('watch.title')}</h1>
        <span className={`live-badge ${status}`} role="status">
          <span className={`live-dot ${status === 'live' ? 'online' : 'connecting'}`} />
          {status === 'live' ? t('watch.live') : t('watch.lost')}
        </span>
        <span className="spacer" />
        <button className="btn" type="button" onClick={() => setLedger(true)}>
          <Icon name="book" /> {t('game.ledger')}
        </button>
      </div>

      <section className="card pad watch-round">
        {finished ? (
          <div className="watch-round-main">
            <Crown size={36} /> {t('watch.finished')} — {t('watch.winner', { nom: winners.join(', ') })}
          </div>
        ) : (
          r && (
            <>
              <div className="watch-round-main">
                {t('round.title', { r: r.index + 1 })} <span className="muted num">/ {total}</span> ·{' '}
                <span className="num">{t('round.cards', { n: r.cardsDealt })}</span>
              </div>
              <div className="muted">
                {t(`watch.phase.${r.phase}`)} · {t('round.dealer', { nom: dealerOf(game, r.index)?.name ?? '' })}
                {r.index === total - 1 ? ` · ${t('watch.lastRound')}` : ''}
              </div>
            </>
          )
        )}
      </section>

      <ol className="watch-grid">
        {ranking.map((x) => {
          const p = playerById(game, x.id);
          const e = r?.entries.find((y) => y.playerId === x.id);
          if (!p) return null;
          const delta = scores[x.id]?.total;
          return (
            <li key={x.id} className={`card watch-card ${x.rank === 1 && x.score !== 0 ? 'lead' : ''}`}>
              <span className={`show-medal r${x.rank}`}>{x.rank}</span>
              <Avatar player={p} size={56} />
              <div className="watch-name">{p.name}</div>
              <div className="watch-score num">
                <RollingNumber from={prevTotals.current[x.id] ?? x.score} to={x.score} duration={800} />
              </div>
              {!finished && e && (
                <div className="watch-round-line num">
                  <span>
                    {t('watch.bid')} <b>{effectiveBid(e) ?? t('watch.waiting')}</b>
                  </span>
                  {r && r.phase !== 'bids' && (
                    <span>
                      {t('watch.tricks')} <b>{e.tricks ?? t('watch.waiting')}</b>
                    </span>
                  )}
                  {delta !== undefined && <Signed value={delta} />}
                </div>
              )}
            </li>
          );
        })}
      </ol>
      <p className="muted" style={{ textAlign: 'center', fontSize: 'var(--fs-s)' }}>
        {t('watch.readonly')}
      </p>
      <div style={{ textAlign: 'center' }}>
        <button className="btn ghost" type="button" onClick={leave}>
          {t('watch.leave')}
        </button>
      </div>
      {ledger && <Ledger game={game} readOnly onClose={() => setLedger(false)} />}
    </main>
  );
}
