import { currentRound, gameRanking, playerById, type Game } from '../game/model';
import { useStore } from '../game/store';
import { t } from '../i18n/t';
import { Avatar, Compass, Crown, Icon } from './common';
import { Badges, ShipParade, SwingingLantern, Ticker, VisitCounter } from './retro';

function winnerNames(g: Game): string {
  return gameRanking(g)
    .filter((r) => r.rank === 1)
    .map((r) => playerById(g, r.id)?.name ?? '')
    .join(', ');
}

export function Home({
  onNew,
  onResume,
  onOpen,
  onNav,
}: {
  onNew: () => void;
  onResume: (g: Game) => void;
  onOpen: (g: Game) => void;
  onNav: (v: 'rules' | 'settings' | 'about') => void;
}) {
  const { state } = useStore();
  const live = state.games.find((g) => g.status === 'inProgress');
  const history = state.games.filter((g) => g.status !== 'inProgress').slice().reverse();
  const fmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  return (
    <main className="screen home">
      {state.prefs.retro && <SwingingLantern />}
      {state.prefs.retro && <Ticker />}
      <div style={{ textAlign: 'center', padding: 'var(--sp-6) 0 var(--sp-4)' }}>
        <Compass />
        <h1 className="title hero">{t('app.name')}</h1>
        <p className="subtitle">{t('app.tagline')}</p>
      </div>

      <div className="stack">
        {live && (
          <button type="button" className="card pad anim-rise" style={{ textAlign: 'left', border: '1px solid var(--gold)' }} onClick={() => onResume(live)}>
            <div className="row">
              <div className="avatar-stack">
                {live.players.map((p) => (
                  <Avatar key={p.id} player={p} size={40} />
                ))}
              </div>
              <span className="spacer" />
              <Icon name="next" />
            </div>
            <div style={{ fontFamily: 'var(--font-title)', fontSize: 'var(--fs-xl)', marginTop: 'var(--sp-2)' }}>{t('home.resume')}</div>
            <div className="muted">
              {t('home.resumeRound', { r: (currentRound(live)?.index ?? 0) + 1, t: live.settings.cardsPerRound.length })}
              {gameRanking(live).some((r) => r.score !== 0) && ` · ${t('home.leader', { nom: winnerNames(live) })}`}
            </div>
          </button>
        )}
        <button className="btn primary block" type="button" onClick={onNew}>
          {t('home.new')}
        </button>
      </div>

      <div className="rule" />
      <h2 className="title" style={{ fontSize: 'var(--fs-xl)' }}>
        {t('home.history')}
      </h2>
      {history.length === 0 ? (
        <p className="quip">{t('home.historyEmpty')}</p>
      ) : (
        <ul className="stack" style={{ listStyle: 'none', padding: 0 }}>
          {history.map((g) => (
            <li key={g.id}>
              <button type="button" className="card pad row" style={{ width: '100%', textAlign: 'left' }} onClick={() => onOpen(g)}>
                <div className="avatar-stack">
                  {g.players.slice(0, 5).map((p) => (
                    <Avatar key={p.id} player={p} size={32} />
                  ))}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {g.status === 'finished' && <Crown size={16} />} {g.status === 'finished' ? t('home.winner', { nom: winnerNames(g) }) : t('home.abandoned')}
                  </div>
                  <div className="muted" style={{ fontSize: 'var(--fs-s)' }}>
                    {fmt.format(new Date(g.createdAt))} · {g.players.map((p) => p.name).join(', ')}
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="rule" />
      <nav className="row" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
        <button className="btn ghost" type="button" onClick={() => onNav('rules')}>
          <Icon name="scroll" /> {t('home.rules')}
        </button>
        <button className="btn ghost" type="button" onClick={() => onNav('settings')}>
          <Icon name="gear" /> {t('home.settings')}
        </button>
        <button className="btn ghost" type="button" onClick={() => onNav('about')}>
          <Icon name="info" /> {t('home.about')}
        </button>
      </nav>
      {state.prefs.retro && (
        <>
          <VisitCounter value={state.games.filter((g) => g.status === 'finished').length} />
          <Badges />
          <ShipParade />
        </>
      )}
      <p className="muted" style={{ textAlign: 'center', fontSize: 'var(--fs-xs)', marginTop: 'var(--sp-4)' }}>
        {t('app.disclaimer')}
      </p>
    </main>
  );
}
