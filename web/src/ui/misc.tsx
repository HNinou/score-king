import { useRef, useState, type ReactNode } from 'react';
import { exportGames, importGames } from '../game/storage';
import { store, useStore, type Prefs } from '../game/store';
import { t } from '../i18n/t';
import { Confirm, Icon, Toast } from './common';

function Page({ title, onBack, children }: { title: string; onBack: () => void; children: ReactNode }) {
  return (
    <main className="screen">
      <div className="row">
        <button className="icon-btn" type="button" onClick={onBack} aria-label={t('common.back')}>
          <Icon name="back" />
        </button>
        <h1 className="title">{title}</h1>
      </div>
      <div className="stack" style={{ marginTop: 'var(--sp-4)' }}>
        {children}
      </div>
    </main>
  );
}

function Seg<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="field">
      <span style={{ fontWeight: 600 }}>{label}</span>
      <div className="seg" role="group" aria-label={label}>
        {options.map(([v, l]) => (
          <button key={v} type="button" aria-pressed={value === v} onClick={() => onChange(v)}>
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}

export function SettingsScreen({ onBack }: { onBack: () => void }) {
  const { state } = useStore();
  const p = state.prefs;
  const set = (x: Partial<Prefs>) => store.dispatch({ type: 'prefs', prefs: x });
  const [toast, setToast] = useState('');
  const [clear, setClear] = useState(0);
  const file = useRef<HTMLInputElement>(null);

  const doExport = () => {
    const blob = new Blob([exportGames(state.games)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `score-king-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const doImport = async (f: File) => {
    const games = importGames(await f.text());
    if (!games) return setToast(t('settings.importBad'));
    store.dispatch({ type: 'importGames', games });
    setToast(t('settings.importOk', { c: games.length }));
  };

  return (
    <Page title={t('settings.title')} onBack={onBack}>
      <div className="card pad stack">
        <label className="switch">
          <span style={{ fontWeight: 600 }}>{t('settings.sound')}</span>
          <input type="checkbox" checked={p.sound} onChange={(e) => set({ sound: e.target.checked })} />
        </label>
        <label className="field">
          <span>{t('settings.volume')}</span>
          <input type="range" min={0} max={1} step={0.05} value={p.volume} onChange={(e) => set({ volume: Number(e.target.value) })} />
        </label>
        <Seg label={t('settings.voice')} value={p.voice} options={[['witty', t('settings.voice.witty')], ['plain', t('settings.voice.plain')]]} onChange={(v) => set({ voice: v })} />
        <Seg
          label={t('settings.theme')}
          value={p.theme}
          options={[['auto', t('settings.theme.auto')], ['light', t('settings.theme.light')], ['dark', t('settings.theme.dark')]]}
          onChange={(v) => set({ theme: v })}
        />
        <Seg
          label={t('settings.motion')}
          value={p.reducedMotion ? 'reduced' : 'full'}
          options={[['full', t('settings.motion.full')], ['reduced', t('settings.motion.reduced')]]}
          onChange={(v) => set({ reducedMotion: v === 'reduced' })}
        />
        <label className="switch">
          <span style={{ fontWeight: 600 }}>{t('settings.music')}</span>
          <input type="checkbox" checked={p.music} onChange={(e) => set({ music: e.target.checked })} />
        </label>
        <label className="field">
          <span>{t('settings.musicVolume')}</span>
          <input type="range" min={0} max={1} step={0.05} value={p.musicVolume} onChange={(e) => set({ musicVolume: Number(e.target.value) })} />
        </label>
        <label className="switch">
          <span style={{ fontWeight: 600 }}>{t('settings.speech')}</span>
          <input type="checkbox" checked={p.speech} onChange={(e) => set({ speech: e.target.checked })} />
        </label>
        <label className="switch">
          <span style={{ fontWeight: 600 }}>{t('settings.retro')}</span>
          <input type="checkbox" checked={p.retro} onChange={(e) => set({ retro: e.target.checked })} />
        </label>
        <label className="switch">
          <span style={{ fontWeight: 600 }}>{t('settings.wake')}</span>
          <input type="checkbox" checked={p.wakeLock} onChange={(e) => set({ wakeLock: e.target.checked })} />
        </label>
      </div>
      <div className="card pad stack">
        <button className="btn block" type="button" onClick={doExport}>
          {t('settings.export')}
        </button>
        <button className="btn block" type="button" onClick={() => file.current?.click()}>
          {t('settings.import')}
        </button>
        <input
          ref={file}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void doImport(f);
            e.target.value = '';
          }}
        />
        <button className="btn block danger" type="button" onClick={() => setClear(1)}>
          {t('settings.clear')}
        </button>
      </div>
      {clear === 1 && <Confirm text={t('settings.clearConfirm')} onNo={() => setClear(0)} onYes={() => setClear(2)} />}
      {clear === 2 && (
        <Confirm
          text={t('settings.clearConfirm2')}
          onNo={() => setClear(0)}
          onYes={() => {
            store.dispatch({ type: 'clearHistory' });
            setClear(0);
          }}
        />
      )}
      {toast && <Toast text={toast} onDone={() => setToast('')} />}
    </Page>
  );
}

export function RulesScreen({ onBack }: { onBack: () => void }) {
  return (
    <Page title={t('rules.title')} onBack={onBack}>
      <section className="card pad">
        <h2 className="title" style={{ fontSize: 'var(--fs-xl)' }}>
          Barème Skull King
        </h2>
        <ul>
          <li>
            Pari tenu (1 ou plus) : <b>+20 par pli annoncé</b>.
          </li>
          <li>
            Pari manqué : <b>−10 par pli d'écart</b>, sans bonus.
          </li>
          <li>
            Pari zéro tenu : <b>+10 × nombre de cartes</b> de la manche ; manqué : <b>−10 × cartes</b>.
          </li>
        </ul>
        <h3>Bonus (seulement si le pari est tenu)</h3>
        <ul>
          <li>14 de couleur capturé : +10 · 14 noir : +20</li>
          <li>Sirène capturée par un pirate : +20</li>
          <li>Pirate capturé par le Skull King : +30</li>
          <li>Skull King capturé par une sirène : +40 (+50 en édition d'origine)</li>
          <li>Alliance de Butin réussie : +20 pour chacun des deux alliés</li>
        </ul>
      </section>
      <section className="card pad">
        <h2 className="title" style={{ fontSize: 'var(--fs-xl)' }}>
          Barème Rascal
        </h2>
        <p>Chaque manche vaut 10 × cartes, quel que soit le pari.</p>
        <ul>
          <li>Coup direct (pari exact) : tout le potentiel + tous les bonus.</li>
          <li>Coup effleuré (écart de 1) : la moitié du potentiel et des bonus de cartes.</li>
          <li>Raté (écart de 2 ou plus) : rien.</li>
          <li>Boulet : 15 × cartes si exact, sinon rien.</li>
        </ul>
      </section>
      <section className="card pad">
        <h2 className="title" style={{ fontSize: 'var(--fs-xl)' }}>
          Qui bat qui ?
        </h2>
        <p>
          Les fuites perdent toujours. Les couleurs suivent la couleur demandée, l'atout noir les coupe. Les pirates battent les couleurs, le Skull King bat les pirates,
          les sirènes battent le Skull King… mais tombent devant les pirates.
        </p>
      </section>
    </Page>
  );
}

export function AboutScreen({ onBack }: { onBack: () => void }) {
  return (
    <Page title={t('about.title')} onBack={onBack}>
      <div className="card pad stack">
        <p style={{ margin: 0 }}>{t('about.body')}</p>
        <p className="muted" style={{ margin: 0 }}>
          {t('about.credits')}
        </p>
        <p style={{ margin: 0, fontWeight: 600 }}>{t('app.disclaimer')}</p>
      </div>
    </Page>
  );
}
