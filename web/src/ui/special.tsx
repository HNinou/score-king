// Cartes spéciales de la manche : Kraken, Baleine blanche, Butin, Harry le Géant, Rascal of Roatan.
// Toujours accessibles d'un tap, même si l'option n'a pas été cochée à la création.
import { useState, type ReactNode } from 'react';
import type { LootAlliance } from '../engine/types';
import { optionEnabled, optionUsed, playerById, type Game, type OptionKey, type Player, type Round } from '../game/model';
import { store } from '../game/store';
import { t } from '../i18n/t';
import { Avatar, Icon, NumberGrid } from './common';
import type { RoundSetters } from './round';

type Panel = 'kraken' | 'whiteWhale' | 'loot' | 'harry' | 'roatan';
const OPTION: Record<Panel, OptionKey> = { kraken: 'kraken', whiteWhale: 'whiteWhale', loot: 'loot', harry: 'pirateAbilities', roatan: 'pirateAbilities' };

function PlayerPicker({
  players,
  value,
  onPick,
  label,
  allowNone = false,
}: {
  players: Player[];
  value: string | null;
  onPick: (id: string | null) => void;
  label: string;
  allowNone?: boolean;
}) {
  return (
    <div className="picker" role="group" aria-label={label}>
      {allowNone && (
        <button type="button" className="chip" aria-pressed={value === null} onClick={() => onPick(null)}>
          {t('special.nobody')}
        </button>
      )}
      {players.map((p) => (
        <button key={p.id} type="button" className="chip picker-chip" aria-pressed={value === p.id} onClick={() => onPick(p.id)}>
          <Avatar player={p} size={24} /> {p.name}
        </button>
      ))}
    </div>
  );
}

function Section({ title, onRemove, removable, children }: { title: string; onRemove: () => void; removable: boolean; children: ReactNode }) {
  return (
    <div className="special-section anim-rise">
      <div className="row">
        <strong>{title}</strong>
        <span className="spacer" />
        {removable && (
          <button type="button" className="btn ghost" style={{ minHeight: 32, padding: '0 8px', fontSize: 'var(--fs-s)' }} onClick={onRemove}>
            <Icon name="close" size={16} /> {t('special.off')}
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

export function SpecialCards({ game, round, setters }: { game: Game; round: Round; setters: RoundSetters }) {
  const s = game.settings;
  const harryInit = round.entries.find((e) => e.harryAdjustment !== 0)?.playerId ?? null;
  const roatanInit = round.entries.find((e) => e.rascalWager !== 0)?.playerId ?? null;
  const [open, setOpen] = useState<Set<Panel>>(() => {
    const o = new Set<Panel>();
    if (round.destroyedTricks > 0 && s.expansions.kraken) o.add('kraken');
    if (round.destroyedTricks > 0 && s.expansions.whiteWhale) o.add('whiteWhale');
    if (round.lootAlliances.length > 0) o.add('loot');
    if (harryInit) o.add('harry');
    if (roatanInit) o.add('roatan');
    return o;
  });
  const [harry, setHarry] = useState<string | null>(harryInit);
  const [roatan, setRoatan] = useState<string | null>(roatanInit);

  const toggle = (k: Panel) => {
    const key = OPTION[k];
    if (!optionEnabled(s, key)) store.dispatch({ type: 'setOption', key, value: true });
    const next = new Set(open);
    if (next.has(k)) next.delete(k);
    else next.add(k);
    setOpen(next);
  };

  const close = (k: Panel) => {
    const next = new Set(open);
    next.delete(k);
    setOpen(next);
    if (k === 'kraken' || k === 'whiteWhale') setters.setDestroyed(0);
    if (k === 'loot') setters.setLoot([]);
    if (k === 'harry' && harry) setters.setHarry(harry, 0);
    if (k === 'roatan' && roatan) setters.setWager(roatan, 0);
    const key = OPTION[k];
    const stillOpen = [...next].some((x) => OPTION[x] === key);
    if (!stillOpen && !optionUsed(game, key)) store.dispatch({ type: 'setOption', key, value: false });
  };

  const levi = (s.expansions.kraken ? 1 : 0) + (s.expansions.whiteWhale ? 1 : 0);
  const chips: [Panel, string][] = [
    ['kraken', t('special.kraken')],
    ['whiteWhale', t('special.whiteWhale')],
    ['loot', t('special.loot')],
    ['harry', t('special.harry')],
    ['roatan', t('special.roatan')],
  ];
  const updateLoot = (i: number, patch: Partial<LootAlliance>) =>
    setters.setLoot(round.lootAlliances.map((a, k) => (k === i ? { ...a, ...patch } : a)));
  const entryOf = (id: string | null) => round.entries.find((e) => e.playerId === id);

  return (
    <section className="card pad special" aria-label={t('special.title')}>
      <div className="row" style={{ flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
        <strong style={{ marginRight: 'var(--sp-2)' }}>{t('special.title')}</strong>
        {chips.map(([k, label]) => (
          <button key={k} type="button" className="chip special-chip" aria-pressed={open.has(k)} onClick={() => toggle(k)}>
            {open.has(k) ? <Icon name="check" size={14} /> : <Icon name="plus" size={14} />} {label}
          </button>
        ))}
      </div>
      {open.size === 0 && <p className="muted" style={{ margin: 'var(--sp-2) 0 0', fontSize: 'var(--fs-s)' }}>{t('special.hint')}</p>}

      {(open.has('kraken') || open.has('whiteWhale')) && levi > 0 && (
        <Section title={t('special.destroyed')} removable onRemove={() => { close('kraken'); close('whiteWhale'); }}>
          <NumberGrid max={levi} value={round.destroyedTricks} label={t('special.destroyed')} onPick={(x) => setters.setDestroyed(x)} />
        </Section>
      )}

      {open.has('loot') && (
        <Section title={t('special.loot')} removable onRemove={() => close('loot')}>
          {round.lootAlliances.map((a, i) => (
            <div key={i} className="stack" style={{ gap: 4, padding: 'var(--sp-2) 0', borderBottom: '1px solid var(--line)' }}>
              <div className="row">
                <span className="muted" style={{ fontSize: 'var(--fs-s)' }}>
                  {t('special.lootN', { i: i + 1 })}
                </span>
                <span className="spacer" />
                <button className="icon-btn" type="button" aria-label={t('tricks.lootRemove')} onClick={() => setters.setLoot(round.lootAlliances.filter((_, k) => k !== i))}>
                  <Icon name="trash" />
                </button>
              </div>
              <span style={{ fontSize: 'var(--fs-s)' }}>{t('tricks.lootPlayed')}</span>
              <PlayerPicker players={game.players} value={a.playedBy} label={t('tricks.lootPlayed')} onPick={(id) => id && updateLoot(i, { playedBy: id })} />
              <span style={{ fontSize: 'var(--fs-s)' }}>{t('tricks.lootCaptured')}</span>
              <PlayerPicker
                players={game.players.filter((p) => p.id !== a.playedBy)}
                value={a.capturedBy}
                label={t('tricks.lootCaptured')}
                onPick={(id) => id && updateLoot(i, { capturedBy: id })}
              />
            </div>
          ))}
          {round.lootAlliances.length < 2 && (
            <button
              className="btn"
              type="button"
              onClick={() => {
                const a = game.players[0]?.id ?? '';
                const b = game.players[1]?.id ?? '';
                setters.setLoot([...round.lootAlliances, { playedBy: a, capturedBy: b }]);
              }}
            >
              <Icon name="plus" /> {t('tricks.lootAdd')}
            </button>
          )}
        </Section>
      )}

      {open.has('harry') && (
        <Section title={t('special.harry')} removable onRemove={() => close('harry')}>
          <span style={{ fontSize: 'var(--fs-s)' }}>{t('special.harryWho')}</span>
          <PlayerPicker
            players={game.players}
            value={harry}
            allowNone
            label={t('special.harryWho')}
            onPick={(id) => {
              const old = entryOf(harry);
              if (old && old.playerId !== id) {
                if (id) setters.setHarry(id, old.harryAdjustment);
                setters.setHarry(old.playerId, 0);
              }
              setHarry(id);
            }}
          />
          {harry && (
            <>
              <span style={{ fontSize: 'var(--fs-s)' }}>
                {t('special.harryAdj')} ({playerById(game, harry)?.name}, {t('recap.bid').toLowerCase()} {entryOf(harry)?.bid ?? '–'})
              </span>
              <div className="seg">
                {[-1, 0, 1].map((h) => (
                  <button key={h} type="button" aria-pressed={entryOf(harry)?.harryAdjustment === h} onClick={() => setters.setHarry(harry, h)}>
                    {h > 0 ? '+1' : h < 0 ? '−1' : '0'}
                  </button>
                ))}
              </div>
            </>
          )}
        </Section>
      )}

      {open.has('roatan') && (
        <Section title={t('special.roatan')} removable onRemove={() => close('roatan')}>
          <span style={{ fontSize: 'var(--fs-s)' }}>{t('special.roatanWho')}</span>
          <PlayerPicker
            players={game.players}
            value={roatan}
            allowNone
            label={t('special.roatanWho')}
            onPick={(id) => {
              const old = entryOf(roatan);
              if (old && old.playerId !== id) {
                if (id) setters.setWager(id, old.rascalWager);
                setters.setWager(old.playerId, 0);
              }
              setRoatan(id);
            }}
          />
          {roatan && (
            <>
              <span style={{ fontSize: 'var(--fs-s)' }}>{t('special.roatanBet')}</span>
              <div className="seg">
                {[0, 10, 20].map((w) => (
                  <button key={w} type="button" aria-pressed={entryOf(roatan)?.rascalWager === w} onClick={() => setters.setWager(roatan, w)}>
                    {w}
                  </button>
                ))}
              </div>
            </>
          )}
        </Section>
      )}
    </section>
  );
}
