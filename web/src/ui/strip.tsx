import { gameRanking, playerById, type Game } from '../game/model';
import { t } from '../i18n/t';
import { Avatar, Crown } from './common';

/** Classement compact, visible sans défiler sur tous les écrans de jeu. */
export function LeaderStrip({ game }: { game: Game }) {
  const rank = gameRanking(game);
  const started = rank.some((r) => r.score !== 0);
  const left = game.settings.cardsPerRound.length - game.rounds.filter((r) => r.phase === 'done').length;
  const a = rank[0]?.score ?? 0;
  const b = rank[1]?.score ?? 0;
  const tense = started && left <= 2 && a - b <= 30;
  return (
    <div
      className={`leader-strip ${tense ? 'tense' : ''}`}
      aria-label={t('rank.title')}
      style={{ ['--cols' as string]: rank.length <= 3 ? rank.length : rank.length <= 6 ? 3 : 4 }}
    >
      {rank.map((r) => {
        const p = playerById(game, r.id);
        if (!p) return null;
        return (
          <div key={r.id} className={`leader-chip ${started && r.rank === 1 ? 'first' : ''}`}>
            <Avatar player={p} size={24} />
            {started && r.rank === 1 && <Crown size={14} />}
            <span className="chip-name">{p.name}</span>
            <b className="num">{r.score}</b>
          </div>
        );
      })}
    </div>
  );
}
