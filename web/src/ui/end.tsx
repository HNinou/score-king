import { useEffect, useMemo, useState } from 'react';
import { audio } from '../audio/audio';
import { voice } from '../audio/voice';
import { gameRanking, playerById, type Game } from '../game/model';
import { gameStats, type Stat } from '../game/stats';
import { store, useStore } from '../game/store';
import { quip, t } from '../i18n/t';
import { Avatar, Crown, Icon, RollingNumber, Toast } from './common';

const CONFETTI = ['#E2B84A', '#C8463C', '#7FC4E0', '#62D394', '#F2E4C4', '#C44A8E'];

function ordinal(r: number): string {
  return r === 1 ? '1er' : `${r}e`;
}

/** Grande révélation : de la dernière place jusqu'au vainqueur, avec roulement de tambour. */
function Reveal({ game, onDone }: { game: Game; onDone: () => void }) {
  const witty = useStore().state.prefs.voice === 'witty';
  const ranking = useMemo(() => gameRanking(game), [game]);
  // groupes d'ex aequo, du pire rang au meilleur
  const groups = useMemo(() => {
    const ranks = [...new Set(ranking.map((r) => r.rank))].sort((a, b) => b - a);
    return ranks.map((rank) => ranking.filter((r) => r.rank === rank));
  }, [ranking]);
  const [step, setStep] = useState(0);
  const [shown, setShown] = useState(false);
  const group = groups[step];
  const isWinner = group?.[0]?.rank === 1;

  const [finalQuip] = useState(() => {
    if (!witty) return '';
    const winners = ranking.filter((r) => r.rank === 1).map((r) => playerById(game, r.id)?.name ?? '');
    return winners.length > 1 ? quip(game.id, 'tie', { noms: winners.join(' et ') }) : quip(game.id, 'gameOver', { nom: winners[0] ?? '' });
  });

  useEffect(() => {
    setShown(false);
    if (!group) return;
    audio.play('drumroll', { force: true });
    voice.say(isWinner ? t('end.revealFirst') : t('end.reveal', { r: group[0]?.rank ?? 0 }));
    const id = window.setTimeout(
      () => {
        setShown(true);
        audio.play(isWinner ? 'chest-fanfare' : 'bell-bids', { force: true });
        const names = group.map((r) => playerById(game, r.id)?.name ?? '').join(' et ');
        const pts = group[0]?.score ?? 0;
        window.setTimeout(() => voice.say(`${names} ! ${pts} points.${isWinner && finalQuip ? ` ${finalQuip}` : ''}`), isWinner ? 900 : 300);
      },
      isWinner ? 2200 : 1900,
    );
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const advance = () => {
    if (!shown) return;
    if (step + 1 >= groups.length) onDone();
    else setStep(step + 1);
  };

  return (
    <div className="show" role="dialog" aria-modal="true" aria-label={t('end.title')}>
      <div className="show-rays" />
      <h2 className="show-title">{t('end.title')}</h2>
      <div className="reveal-stage">
        {!shown && group && (
          <p className="suspense" aria-live="polite">
            {isWinner ? t('end.revealFirst') : t('end.reveal', { r: group[0]?.rank ?? 0 })}
          </p>
        )}
        {shown && group && (
          <>
            <div className="spot" />
            <div className="row" style={{ gap: 'var(--sp-5)', flexWrap: 'wrap', justifyContent: 'center' }} aria-live="polite">
              {group.map((r) => {
                const p = playerById(game, r.id);
                if (!p) return null;
                return (
                  <div key={r.id} className="reveal-card">
                    <div className="reveal-rank">{ordinal(r.rank)}</div>
                    <div style={{ position: 'relative', marginTop: isWinner ? 'var(--sp-5)' : 0 }}>
                      {isWinner && (
                        <span className="show-crown" style={{ left: '50%', top: -30 }}>
                          <Crown size={56} />
                        </span>
                      )}
                      <Avatar player={p} size={isWinner ? 160 : 120} />
                    </div>
                    <div className="reveal-name">{p.name}</div>
                    <div className="reveal-score">
                      <RollingNumber to={r.score} duration={1000} /> pts
                    </div>
                  </div>
                );
              })}
            </div>
            {isWinner &&
              Array.from({ length: 60 }, (_, i) => (
                <span
                  key={i}
                  className="confetti"
                  style={{
                    left: `${(i * 37) % 100}%`,
                    background: CONFETTI[i % CONFETTI.length],
                    animationDelay: `${(i % 12) * 120}ms`,
                    ['--dx' as string]: `${((i * 53) % 120) - 60}px`,
                    ['--rot' as string]: `${(i * 97) % 720}deg`,
                  }}
                />
              ))}
          </>
        )}
      </div>
      <p className="show-quip">{shown && isWinner ? finalQuip : ''}</p>
      {shown && (
        <button
          className="btn primary"
          type="button"
          onClick={advance}
        >
          {t('rank.continue')}
        </button>
      )}
    </div>
  );
}

function StatLine({ game, label, stat, unit }: { game: Game; label: string; stat: Stat | null; unit: (s: Stat) => string }) {
  if (!stat) return null;
  const p = playerById(game, stat.playerId);
  if (!p) return null;
  return (
    <div className="row" style={{ padding: 'var(--sp-2) 0', borderBottom: '1px solid var(--line)' }}>
      <Avatar player={p} size={32} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="muted" style={{ fontSize: 'var(--fs-xs)' }}>
          {label}
        </div>
        <div style={{ fontWeight: 700 }}>{p.name}</div>
      </div>
      <div className="num" style={{ fontWeight: 700 }}>
        {unit(stat)}
      </div>
    </div>
  );
}

export function EndScreen({
  game,
  reveal,
  onRevealDone,
  onHome,
  onLedger,
  onRematch,
}: {
  game: Game;
  reveal: boolean;
  onRevealDone: () => void;
  onHome: () => void;
  onLedger: () => void;
  onRematch: () => void;
}) {
  const [replay, setReplay] = useState(false);
  const [toast, setToast] = useState('');
  const ranking = gameRanking(game);
  const stats = useMemo(() => gameStats(game), [game]);
  const podium = [2, 1, 3].map((rank) => ranking.filter((r) => r.rank === rank));
  const heights: Record<number, number> = { 1: 120, 2: 88, 3: 64 };
  const colors: Record<number, string> = { 1: '#E2B84A', 2: '#C9CED6', 3: '#C97F45' };

  const shareText = () => {
    const date = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(game.createdAt));
    const lines = ranking.map((r) => `${ordinal(r.rank)} ${playerById(game, r.id)?.name ?? ''} — ${r.score} pts`);
    return `${t('end.shareText', { date })}\n${lines.join('\n')}`;
  };

  const share = async () => {
    const text = shareText();
    try {
      if (navigator.share) {
        await navigator.share({ text });
        return;
      }
      await navigator.clipboard.writeText(text);
      setToast(t('end.copied'));
    } catch {
      // partage annulé
    }
  };

  const rematch = () => {
    const n = game.players.length;
    store.dispatch({
      type: 'newGame',
      players: game.players,
      settings: { ...game.settings, firstDealerIndex: (game.settings.firstDealerIndex + 1) % n },
    });
    onRematch();
  };

  if (reveal || replay) {
    return (
      <Reveal
        game={game}
        onDone={() => {
          setReplay(false);
          onRevealDone();
        }}
      />
    );
  }

  return (
    <main className="screen">
      <div className="row">
        <button className="icon-btn" type="button" onClick={onHome} aria-label={t('game.home')}>
          <Icon name="back" />
        </button>
        <h1 className="title">{t('end.title')}</h1>
        <span className="spacer" />
        <button className="icon-btn" type="button" onClick={onLedger} aria-label={t('game.ledger')}>
          <Icon name="book" />
        </button>
      </div>

      <div className="podium" style={{ margin: 'var(--sp-6) auto var(--sp-4)' }}>
        {podium.map((grp, k) => {
          const rank = [2, 1, 3][k] ?? 3;
          if (grp.length === 0) return <div key={rank} className="podium-step" />;
          return (
            <div key={rank} className="podium-step">
              <div className="row" style={{ justifyContent: 'center', flexWrap: 'wrap', position: 'relative' }}>
                {grp.map((r) => {
                  const p = playerById(game, r.id);
                  return p ? (
                    <div key={r.id} style={{ textAlign: 'center', position: 'relative' }}>
                      {rank === 1 && (
                        <span style={{ position: 'absolute', left: '50%', top: -22, transform: 'translateX(-50%)' }}>
                          <Crown size={30} />
                        </span>
                      )}
                      <Avatar player={p} size={rank === 1 ? 76 : 60} labelled />
                      <div className="podium-name">{p.name}</div>
                      <div className="num" style={{ fontWeight: 800 }}>
                        {r.score}
                      </div>
                    </div>
                  ) : null;
                })}
              </div>
              <div className="podium-block" style={{ height: heights[rank], background: colors[rank], animationDelay: `${k * 120}ms` }}>
                {rank}
              </div>
            </div>
          );
        })}
      </div>

      <ol className="card" style={{ listStyle: 'none', padding: 'var(--sp-2) var(--sp-4)', margin: 0 }}>
        {ranking.map((r) => {
          const p = playerById(game, r.id);
          if (!p) return null;
          return (
            <li key={r.id} className="row" style={{ padding: 'var(--sp-2) 0', borderBottom: '1px solid var(--line)' }}>
              <span className="num" style={{ width: '2.5ch', fontWeight: 800 }}>
                {r.rank}
              </span>
              <Avatar player={p} size={36} />
              <span style={{ flex: 1, fontWeight: 600 }}>{p.name}</span>
              <span className="num" style={{ fontSize: 'var(--fs-l)', fontWeight: 800 }}>
                {r.score}
              </span>
            </li>
          );
        })}
      </ol>

      <h2 className="title" style={{ fontSize: 'var(--fs-xl)', margin: 'var(--sp-5) 0 var(--sp-2)' }}>
        {t('end.stats')}
      </h2>
      <div className="card pad">
        <StatLine game={game} label={t('end.statBest')} stat={stats.best} unit={(s) => `+${s.value} (M${s.extra ?? ''})`} />
        <StatLine game={game} label={t('end.statWorst')} stat={stats.worst} unit={(s) => `−${Math.abs(s.value)} (M${s.extra ?? ''})`} />
        <StatLine game={game} label={t('end.statZero')} stat={stats.zeroKing} unit={(s) => `${s.value} × 0`} />
        <StatLine game={game} label={t('end.statBounty')} stat={stats.bounty} unit={(s) => `+${s.value}`} />
        <div className="muted" style={{ fontSize: 'var(--fs-xs)', marginTop: 'var(--sp-3)' }}>
          {t('end.statAccuracy')}
        </div>
        <div className="row" style={{ flexWrap: 'wrap', gap: 'var(--sp-3)', marginTop: 'var(--sp-2)' }}>
          {stats.accuracy.map((s) => {
            const p = playerById(game, s.playerId);
            return p ? (
              <span key={s.playerId} className="row num" style={{ gap: 4 }}>
                <Avatar player={p} size={24} /> {s.value} %
              </span>
            ) : null;
          })}
        </div>
      </div>

      <div className="stack" style={{ marginTop: 'var(--sp-5)' }}>
        <button className="btn primary block" type="button" onClick={rematch}>
          {t('end.rematch')}
        </button>
        <div className="row">
          <button className="btn block" type="button" onClick={() => void share()}>
            <Icon name="share" /> {t('end.share')}
          </button>
          <button className="btn block" type="button" onClick={() => setReplay(true)}>
            <Crown size={20} /> {t('rank.title')}
          </button>
        </div>
        <button className="btn ghost block" type="button" onClick={onHome}>
          {t('end.home')}
        </button>
      </div>
      {toast && <Toast text={toast} onDone={() => setToast('')} />}
    </main>
  );
}
