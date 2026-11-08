import { useEffect, useMemo, useRef, useState } from 'react';
import { audio } from '../audio/audio';
import { MAX_CUSTOM_ROUNDS, MAX_PLAYERS, MIN_PLAYERS, PRESETS } from '../engine/engine';
import type { PresetKey } from '../engine/types';
import { capFor, defaultSettings, PLAYER_COLORS, scheduleFor, uid, type Player, type Settings } from '../game/model';
import { store, useStore } from '../game/store';
import { pirateLine, quip, t } from '../i18n/t';
import { PIRATE_VOICES, PIRATES } from './pirates';
import { voice } from '../audio/voice';
import { Avatar, Icon, Modal } from './common';
import { PLAYER_HEX } from './tokens';

const PRESET_KEYS: PresetKey[] = ['standard', 'evenKeeled', 'skipToTheBrawl', 'swiftAndSalty', 'broadsideBarrage', 'whirlpool', 'pastYourBedtime', 'custom'];
const norm = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase();

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="switch">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

export function SetupScreen({ onBack, onStart }: { onBack: () => void; onStart: () => void }) {
  const { state } = useStore();
  const [players, setPlayers] = useState<Player[]>([]);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [settings, setSettings] = useState<Settings>(() => ({ ...(state.lastSettings ?? defaultSettings()), firstDealerIndex: 0 }));
  const [customText, setCustomText] = useState(() =>
    state.lastSettings?.preset === 'custom' ? state.lastSettings.cardsPerRound.join(', ') : '3, 3, 3',
  );
  const [editing, setEditing] = useState<string | null>(null);
  const [spin, setSpin] = useState<number | null>(null);
  const [drawn, setDrawn] = useState<{ id: string; line: string } | null>(null);
  const spinTimer = useRef(0);
  useEffect(() => () => window.clearTimeout(spinTimer.current), []);

  const custom = useMemo(
    () =>
      customText
        .split(/[,;\s]+/)
        .map((x) => parseInt(x, 10))
        .filter((x) => Number.isFinite(x) && x >= 1)
        .slice(0, MAX_CUSTOM_ROUNDS),
    [customText],
  );
  const pc = Math.max(players.length, MIN_PLAYERS);
  const schedule = scheduleFor(settings, pc, custom);
  const cap = capFor(settings, pc);
  const planned = settings.preset === 'custom' ? custom : [...PRESETS[settings.preset]];
  const capped = planned.some((c) => c > cap);

  const suggestions = state.recentNames.filter((n) => !players.some((p) => norm(p.name) === norm(n))).slice(0, 12);

  const cancelDraw = () => {
    window.clearTimeout(spinTimer.current);
    setSpin(null);
    setDrawn(null);
  };

  // Le premier joueur est celui qui suit le donneur : on tire le joueur, l'ordre de table ne bouge pas.
  const draw = () => {
    const n = players.length;
    const winner = Math.floor(Math.random() * n);
    const land = () => {
      const p = players[winner];
      if (!p) return;
      const line = quip('setup', 'drawFirst', { nom: p.name });
      setSpin(null);
      setSettings((s) => ({ ...s, firstDealerIndex: (winner - 1 + n) % n }));
      setDrawn({ id: p.id, line });
      audio.play('bell-bids');
      voice.say(line);
    };
    setDrawn(null);
    const reduced = state.prefs.reducedMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return land();
    const steps = (n <= 3 ? 4 : 2) * n + winner;
    const tick = (k: number) => {
      setSpin(k % n);
      audio.play('tap-wood');
      if (k >= steps) {
        spinTimer.current = window.setTimeout(land, 320);
        return;
      }
      spinTimer.current = window.setTimeout(() => tick(k + 1), 60 + 170 * (k / steps) ** 2);
    };
    tick(0);
  };

  const add = (raw: string) => {
    const nm = raw.trim().replace(/\s+/g, ' ').slice(0, 20);
    if (!nm) return setError(t('setup.errEmpty'));
    if (players.some((p) => norm(p.name) === norm(nm))) return setError(t('setup.errDup'));
    if (players.length >= MAX_PLAYERS) return setError(t('setup.errFull'));
    const usedA = new Set(players.map((p) => p.emblem));
    const usedC = new Set(players.map((p) => p.color));
    const free = PIRATES.filter((x) => !usedA.has(x.id));
    const emblem = (free[Math.floor(Math.random() * free.length)] ?? PIRATES[0])?.id ?? 'redbeard';
    const color = PLAYER_COLORS.find((c) => !usedC.has(c)) ?? 'c1';
    cancelDraw();
    setPlayers([...players, { id: uid(), name: nm, emblem, color }]);
    introduce(emblem);
    setName('');
    setError('');
    audio.play('tap-wood');
  };

  const introduce = (pirate: string) => {
    const v = PIRATE_VOICES[pirate];
    if (v) voice.sayAs(pirateLine(pirate), v);
  };

  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= players.length) return;
    const next = players.slice();
    const a = next[i];
    const b = next[j];
    if (!a || !b) return;
    cancelDraw();
    next[i] = b;
    next[j] = a;
    setPlayers(next);
    const dealer = settings.firstDealerIndex;
    setSettings({ ...settings, firstDealerIndex: dealer === i ? j : dealer === j ? i : dealer });
  };

  const remove = (i: number) => {
    cancelDraw();
    setPlayers(players.filter((_, k) => k !== i));
    const dealer = settings.firstDealerIndex;
    setSettings({ ...settings, firstDealerIndex: dealer > i ? dealer - 1 : dealer === i ? 0 : dealer });
  };

  const start = () => {
    const final: Settings = { ...settings, cardsPerRound: schedule };
    store.dispatch({ type: 'newGame', players, settings: final });
    audio.play('bell-bids');
    onStart();
  };

  const editingPlayer = players.find((p) => p.id === editing);
  const firstDealer = players[settings.firstDealerIndex];
  const firstLead = players[(settings.firstDealerIndex + 1) % players.length];
  const canStart = players.length >= MIN_PLAYERS && schedule.length > 0;
  const summary =
    t('setup.summary', {
      s: t(`setup.scoring.${settings.scoring}`),
      p: t(`preset.${settings.preset}`),
      r: schedule.length,
    }) + (settings.bonusAlwaysCounts ? ` · ${t('setup.bonusAlwaysShort')}` : '');

  return (
    <main className="screen">
      <div className="row">
        <button className="icon-btn" type="button" onClick={onBack} aria-label={t('common.back')}>
          <Icon name="back" />
        </button>
        <h1 className="title">{t('setup.title')}</h1>
      </div>

      <form
        className="row"
        style={{ marginTop: 'var(--sp-4)' }}
        onSubmit={(e) => {
          e.preventDefault();
          add(name);
        }}
      >
        <label className="sr-only" htmlFor="pname">
          {t('setup.namePlaceholder')}
        </label>
        <input
          id="pname"
          className="input"
          style={{ flex: 1 }}
          value={name}
          maxLength={20}
          placeholder={t('setup.namePlaceholder')}
          autoComplete="off"
          onChange={(e) => setName(e.target.value)}
        />
        <button className="btn" type="submit" disabled={players.length >= MAX_PLAYERS}>
          <Icon name="plus" /> {t('setup.add')}
        </button>
      </form>
      {error && (
        <p className="err" role="alert">
          {error}
        </p>
      )}

      {suggestions.length > 0 && (
        <div style={{ marginTop: 'var(--sp-3)' }}>
          <div className="muted" style={{ fontSize: 'var(--fs-s)', marginBottom: 'var(--sp-2)' }}>
            {t('setup.suggestions')}
          </div>
          <div className="row" style={{ flexWrap: 'wrap' }}>
            {suggestions.map((n) => (
              <button key={n} className="chip" type="button" onClick={() => add(n)}>
                + {n}
              </button>
            ))}
          </div>
        </div>
      )}

      <h2 className="title" style={{ fontSize: 'var(--fs-l)', margin: 'var(--sp-5) 0 var(--sp-2)' }}>
        {t('setup.players', { c: players.length })}
      </h2>
      <ol className="stack" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {players.map((p, i) => (
          <li key={p.id} className={`card anim-rise ${spin === i ? 'draw-spin' : ''} ${drawn?.id === p.id ? 'draw-win' : ''}`} style={{ padding: 'var(--sp-2) var(--sp-3)' }}>
            <div className="row">
              <button type="button" className="icon-btn" style={{ width: 52, height: 52 }} onClick={() => setEditing(p.id)} aria-label={t('setup.changeAvatar', { nom: p.name })}>
                <Avatar player={p} size={48} />
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 'var(--fs-l)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                <button
                  type="button"
                  className="chip"
                  style={{ minHeight: 28, marginTop: 2 }}
                  aria-pressed={settings.firstDealerIndex === i}
                  onClick={() => setSettings({ ...settings, firstDealerIndex: i })}
                  aria-label={`${t('setup.dealer')} : ${p.name}`}
                >
                  {settings.firstDealerIndex === i ? `✓ ${t('setup.dealer')}` : t('setup.dealerBadge')}
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <button type="button" className="icon-btn" style={{ height: 32 }} onClick={() => move(i, -1)} disabled={i === 0} aria-label={t('setup.moveUp', { nom: p.name })}>
                  <Icon name="up" />
                </button>
                <button type="button" className="icon-btn" style={{ height: 32 }} onClick={() => move(i, 1)} disabled={i === players.length - 1} aria-label={t('setup.moveDown', { nom: p.name })}>
                  <Icon name="down" />
                </button>
              </div>
              <button type="button" className="icon-btn" onClick={() => remove(i)} aria-label={t('setup.remove', { nom: p.name })}>
                <Icon name="close" />
              </button>
            </div>
          </li>
        ))}
      </ol>

      {players.length >= MIN_PLAYERS && (
        <div className="stack" style={{ marginTop: 'var(--sp-3)' }}>
          <button className="btn block" type="button" disabled={spin !== null} onClick={draw}>
            <Icon name="dice" /> {spin !== null ? t('setup.drawing') : t('setup.draw')}
          </button>
          <p className="draw-result" role="status">
            {spin === null && firstLead && firstDealer && <strong>{t('setup.leadLine', { lead: firstLead.name, dealer: firstDealer.name })}</strong>}
            {spin === null && drawn && <span className="muted"> — {drawn.line}</span>}
          </p>
        </div>
      )}

      <details className="card pad" style={{ marginTop: 'var(--sp-5)' }}>
        <summary style={{ cursor: 'pointer', minHeight: 'var(--tap)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <strong>{t('setup.options')}</strong>
          <span className="muted" style={{ fontSize: 'var(--fs-s)' }}>
            {summary}
          </span>
        </summary>
        <div className="stack" style={{ marginTop: 'var(--sp-3)' }}>
          <div className="field">
            <span>{t('setup.scoring')}</span>
            <div className="seg">
              {(['skullKing', 'rascal'] as const).map((s) => (
                <button key={s} type="button" aria-pressed={settings.scoring === s} onClick={() => setSettings({ ...settings, scoring: s })}>
                  {t(`setup.scoring.${s}`)}
                </button>
              ))}
            </div>
          </div>
          {settings.scoring === 'rascal' && <Toggle label={t('setup.cannon')} checked={settings.cannonEnabled} onChange={(v) => setSettings({ ...settings, cannonEnabled: v })} />}
          <label className="field">
            <span>{t('setup.schedule')}</span>
            <select className="input" value={settings.preset} onChange={(e) => setSettings({ ...settings, preset: e.target.value as PresetKey })}>
              {PRESET_KEYS.map((k) => (
                <option key={k} value={k}>
                  {t(`preset.${k}`)}
                  {k !== 'custom' ? ` — ${PRESETS[k].join(', ')}` : ''}
                </option>
              ))}
            </select>
          </label>
          {settings.preset === 'custom' && (
            <label className="field">
              <span>{t('setup.custom')}</span>
              <input className="input" value={customText} onChange={(e) => setCustomText(e.target.value)} inputMode="numeric" />
            </label>
          )}
          <p className="muted num" style={{ margin: 0, fontSize: 'var(--fs-s)' }}>
            {schedule.join(' · ')}
            {capped ? ` — ${t('setup.capNote', { p: pc, m: cap })}` : ''}
          </p>
          <strong>{t('setup.expansions')}</strong>
          <Toggle label={t('setup.loot')} checked={settings.expansions.loot} onChange={(v) => setSettings({ ...settings, expansions: { ...settings.expansions, loot: v } })} />
          <Toggle label={t('setup.kraken')} checked={settings.expansions.kraken} onChange={(v) => setSettings({ ...settings, expansions: { ...settings.expansions, kraken: v } })} />
          <Toggle
            label={t('setup.whiteWhale')}
            checked={settings.expansions.whiteWhale}
            onChange={(v) => setSettings({ ...settings, expansions: { ...settings.expansions, whiteWhale: v } })}
          />
          <Toggle label={t('setup.abilities')} checked={settings.pirateAbilities} onChange={(v) => setSettings({ ...settings, pirateAbilities: v })} />
          <Toggle label={t('setup.original')} checked={settings.originalEdition} onChange={(v) => setSettings({ ...settings, originalEdition: v })} />
          <strong>{t('setup.houseRules')}</strong>
          <Toggle
            label={t('setup.bonusAlways')}
            checked={settings.bonusAlwaysCounts === true}
            onChange={(v) => setSettings({ ...settings, bonusAlwaysCounts: v })}
          />
        </div>
      </details>

      <div className="footer-bar">
        <div>
          <div className="footer-hint">{canStart ? '' : t('setup.needPlayers')}</div>
          <button className="btn primary block" type="button" disabled={!canStart} onClick={start}>
            {t('setup.start')}
          </button>
        </div>
      </div>

      {editingPlayer && (
        <Modal onClose={() => setEditing(null)} label={t('setup.chooseAvatar')}>
          <h2 className="title" style={{ fontSize: 'var(--fs-xl)', marginTop: 0 }}>
            {editingPlayer.name}
          </h2>
          <div className="avatar-pick">
            {PIRATES.map((x) => (
              <button
                key={x.id}
                type="button"
                aria-pressed={editingPlayer.emblem === x.id}
                onClick={() => {
                  setPlayers(players.map((p) => (p.id === editingPlayer.id ? { ...p, emblem: x.id } : p)));
                  introduce(x.id);
                }}
              >
                <Avatar player={{ ...editingPlayer, emblem: x.id }} size={64} />
                <span>{x.name}</span>
              </button>
            ))}
          </div>
          <p style={{ margin: 'var(--sp-4) 0 var(--sp-2)', fontWeight: 600 }}>{t('setup.chooseColor')}</p>
          <div className="swatches">
            {PLAYER_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className="swatch"
                style={{ background: PLAYER_HEX[c] }}
                aria-pressed={editingPlayer.color === c}
                aria-label={c}
                onClick={() => setPlayers(players.map((p) => (p.id === editingPlayer.id ? { ...p, color: c } : p)))}
              >
                {editingPlayer.color === c && <Icon name="check" />}
              </button>
            ))}
          </div>
          <button className="btn block" type="button" style={{ marginTop: 'var(--sp-4)' }} onClick={() => setEditing(null)}>
            {t('common.close')}
          </button>
        </Modal>
      )}
    </main>
  );
}
