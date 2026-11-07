import { useCallback, useEffect, useState } from 'react';
import { audio } from '../audio/audio';
import { music } from '../audio/music';
import { voice } from '../audio/voice';
import { currentRound, type Game } from '../game/model';
import { currentGame, store, useStore } from '../game/store';
import { t } from '../i18n/t';
import { Confirm, Icon, Modal } from './common';
import { EndScreen } from './end';
import { Home } from './home';
import { Ledger } from './ledger';
import { AboutScreen, RulesScreen, SettingsScreen } from './misc';
import { RecapScreen } from './recap';
import { RoundScreen } from './round';
import { SetupScreen } from './setup';
import { useLightsOut } from './lights';
import { RetroLayer, StormLayer, SwingingLantern } from './retro';
import { LeaderStrip } from './strip';

type View = 'home' | 'setup' | 'game' | 'settings' | 'rules' | 'about';

function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    const acquire = () => {
      if (document.visibilityState !== 'visible') return;
      navigator.wakeLock
        .request('screen')
        .then((l) => {
          if (cancelled) void l.release();
          else lock = l;
        })
        .catch(() => undefined);
    };
    acquire();
    document.addEventListener('visibilitychange', acquire);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', acquire);
      void lock?.release().catch(() => undefined);
    };
  }, [active]);
}

export function App() {
  const { state, canUndo, canRedo, storageOk } = useStore();
  const game = currentGame(state);
  const [view, setView] = useState<View>(game ? 'game' : 'home');
  const [ledger, setLedger] = useState(false);
  const [menu, setMenu] = useState(false);
  const [abandon, setAbandon] = useState(false);
  /** Révélation finale à jouer (partie qui vient de se terminer). */
  const [reveal, setReveal] = useState(false);
  /** Manche dont le bilan est affiché alors que la partie est terminée. */
  const [finalRecap, setFinalRecap] = useState<string | null>(null);
  const { prefs } = state;

  useEffect(() => {
    audio.enabled = prefs.sound;
    audio.setVolume(prefs.volume);
    voice.enabled = prefs.sound && prefs.speech && prefs.voice === 'witty';
    voice.volume = prefs.volume;
    if (!voice.enabled) voice.stop();
    music.enabled = prefs.sound && prefs.music;
    music.volume = prefs.musicVolume;
    music.apply();
  }, [prefs.sound, prefs.volume, prefs.speech, prefs.voice, prefs.music, prefs.musicVolume]);

  useEffect(() => {
    voice.onSpeak = (speaking) => (speaking ? music.duck(Infinity) : music.unduck());
    music.setActive(true);
  }, []);

  // la tension sonore monte au fil de la partie
  const progress = game && view === 'game' ? Math.min(1, game.rounds.length / game.settings.cardsPerRound.length) : 0;
  audio.intensity = progress;
  useEffect(() => music.setMood(progress), [progress]);

  useEffect(() => {
    const root = document.documentElement;
    if (prefs.theme === 'auto') delete root.dataset.theme;
    else root.dataset.theme = prefs.theme;
    if (prefs.reducedMotion) root.dataset.motion = 'reduced';
    else delete root.dataset.motion;
  }, [prefs.theme, prefs.reducedMotion]);

  useEffect(() => {
    const unlock = () => {
      audio.unlock();
      music.unlock();
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  const inGame = view === 'game' && game !== undefined;
  const [lightsOff, setLightsOff] = useState(false);
  const toggleLights = useCallback(() => setLightsOff((x) => !x), []);
  useLightsOut(prefs.retro && lightsOff);
  const barLantern = inGame && (game.status === 'inProgress' || finalRecap === game.id);
  useWakeLock(inGame && game.status === 'inProgress' && prefs.wakeLock);

  const undo = useCallback(() => {
    if (store.undo()) audio.play('rewind');
  }, []);
  const redo = useCallback(() => {
    store.redo();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'z') return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  const goHome = () => {
    store.dispatch({ type: 'closeGame' });
    setView('home');
    setReveal(false);
    setFinalRecap(null);
  };

  const openGame = (g: Game) => {
    store.dispatch({ type: 'openGame', id: g.id });
    setReveal(false);
    setFinalRecap(null);
    setView('game');
  };

  let body;
  if (view === 'setup') {
    body = (
      <SetupScreen
        onBack={() => setView('home')}
        onStart={() => {
          setReveal(false);
          setFinalRecap(null);
          setView('game');
        }}
      />
    );
  } else if (view === 'settings') body = <SettingsScreen onBack={() => setView(game ? 'game' : 'home')} />;
  else if (view === 'rules') body = <RulesScreen onBack={() => setView(game ? 'game' : 'home')} />;
  else if (view === 'about') body = <AboutScreen onBack={() => setView('home')} />;
  else if (inGame) {
    const r = currentRound(game);
    const showFinalRecap = game.status === 'finished' && finalRecap === game.id && r !== undefined;
    let main;
    if (game.status !== 'inProgress' && !showFinalRecap) {
      main = (
        <EndScreen
          game={game}
          reveal={reveal}
          onRevealDone={() => setReveal(false)}
          onHome={goHome}
          onLedger={() => setLedger(true)}
          onRematch={() => {
            setReveal(false);
            setFinalRecap(null);
          }}
        />
      );
    } else if (r && (r.phase === 'done' || showFinalRecap)) {
      main = (
        <RecapScreen
          game={game}
          round={r}
          onFinish={() => {
            setFinalRecap(null);
            setReveal(true);
          }}
        />
      );
    } else if (r) {
      main = (
        <RoundScreen
          game={game}
          round={r}
          onValidated={() => {
            if (game.rounds.length >= game.settings.cardsPerRound.length) setFinalRecap(game.id);
          }}
          onVoided={() => {
            if (game.rounds.length >= game.settings.cardsPerRound.length) setReveal(true);
          }}
        />
      );
    }
    const playing = game.status === 'inProgress' || showFinalRecap;
    body = (
      <>
        {playing && (
          <header className="topbar">
            <div className="topbar-inner">
              <button className="icon-btn" type="button" onClick={goHome} aria-label={t('game.home')}>
                <Icon name="back" />
              </button>
              <div style={{ minWidth: 0 }}>
                <div className="round-label" style={{ whiteSpace: 'nowrap' }}>
                  {t('round.title', { r: '' }).trim()}
                  <span className="round-num num">{(r?.index ?? 0) + 1}</span>
                  <span className="round-sub num">/{game.settings.cardsPerRound.length}</span>
                </div>
              </div>

              <span className="spacer" />
              <button className="icon-btn" type="button" onClick={undo} disabled={!canUndo} aria-label={t('game.undo')} title={t('game.undo')}>
                <Icon name="undo" />
              </button>
              <button className="icon-btn" type="button" onClick={() => setLedger(true)} aria-label={t('game.ledger')} title={t('game.ledger')}>
                <Icon name="book" />
              </button>
              <button
                className="icon-btn"
                type="button"
                onClick={() => store.dispatch({ type: 'prefs', prefs: { sound: !prefs.sound } })}
                aria-label={prefs.sound ? t('game.mute') : t('game.unmute')}
                aria-pressed={!prefs.sound}
                title={prefs.sound ? t('game.mute') : t('game.unmute')}
              >
                <Icon name={prefs.sound ? 'bell' : 'bellOff'} />
              </button>
              <button className="icon-btn" type="button" onClick={() => setMenu(true)} aria-label={t('game.menu')}>
                <Icon name="menu" />
              </button>
            </div>
            <div className="strip-wrap">
              <LeaderStrip game={game} />
              {prefs.retro && <SwingingLantern mode="bar" off={lightsOff} onToggle={toggleLights} />}
            </div>
          </header>
        )}
        {playing && prefs.retro && <StormLayer game={game} />}
        {main}
      </>
    );
  } else {
    body = <Home onNew={() => setView('setup')} onResume={openGame} onOpen={openGame} onNav={(v) => setView(v)} />;
  }

  return (
    <>
      {!storageOk && (
        <div className="banner" role="alert" style={{ background: 'var(--negative)', color: 'var(--bg)', borderRadius: 0 }}>
          {t('settings.storageWarn')}
        </div>
      )}
      {body}
      <RetroLayer enabled={prefs.retro} />
      {prefs.retro && !barLantern && <SwingingLantern mode="page" off={lightsOff} onToggle={toggleLights} />}
      {ledger && game && <Ledger game={game} onClose={() => setLedger(false)} />}
      {menu && game && (
        <Modal onClose={() => setMenu(false)} label={t('game.menu')}>
          <div className="stack">
            <button className="btn block" type="button" disabled={!canRedo} onClick={() => { setMenu(false); redo(); }}>
              <Icon name="redo" /> {t('game.redo')}
            </button>
            <button className="btn block" type="button" onClick={() => { setMenu(false); setView('rules'); }}>
              <Icon name="scroll" /> {t('home.rules')}
            </button>
            <button className="btn block" type="button" onClick={() => { setMenu(false); setView('settings'); }}>
              <Icon name="gear" /> {t('home.settings')}
            </button>
            {game.status === 'inProgress' && (
              <button className="btn block danger" type="button" onClick={() => { setMenu(false); setAbandon(true); }}>
                <Icon name="trash" /> {t('game.abandon')}
              </button>
            )}
            <button className="btn block ghost" type="button" onClick={() => setMenu(false)}>
              {t('common.close')}
            </button>
          </div>
        </Modal>
      )}
      {abandon && (
        <Confirm
          text={t('game.abandonConfirm')}
          onNo={() => setAbandon(false)}
          onYes={() => {
            store.dispatch({ type: 'abandon' });
            setAbandon(false);
            goHome();
          }}
        />
      )}
    </>
  );
}
