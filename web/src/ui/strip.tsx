import { gameRanking, playerById, type Game } from '../game/model';
import { t } from '../i18n/t';
import { Avatar, Crown } from './common';

/** Classement compact, visible sans défiler sur tous les écrans de jeu. */
export function LeaderStrip({ game }: { game: Game }) {
  const rank = gameRanking(game);
  const started = rank.some((r) => r.score !== 0);
  return (
    <div className="leader-strip" aria-label={t('rank.title')}>
      {rank.map((r) => {
        const p = playerById(game, r.id);
        if (!p) return null;
        return (
          <div key={r.id} className={`leader-chip ${started && r.rank === 1 ? 'first' : ''}`}>
            <Avatar player={p} size={28} />
            {started && r.rank === 1 && <Crown size={16} />}
            <span>{p.name}</span>
            <b className="num">{r.score}</b>
          </div>
        );
      })}
    </div>
  );
}
