import { useState } from 'react';
import { doneRounds, effectiveBid, gameRanking, gameRunning, roundScores, type Game, type Round } from '../game/model';
import { t } from '../i18n/t';
import { Avatar, Confirm, Crown, Icon, Modal } from './common';
import { PLAYER_HEX } from './tokens';
import { RoundEditor } from './round';

function Chart({ game }: { game: Game }) {
  const running = gameRunning(game);
  if (running.length === 0) return null;
  const series = [Object.fromEntries(game.players.map((p) => [p.id, 0])), ...running];
  const all = series.flatMap((s) => Object.values(s));
  const min = Math.min(0, ...all);
  const max = Math.max(10, ...all);
  const W = 640;
  const H = 220;
  const P = { l: 36, r: 40, t: 12, b: 22 };
  const x = (i: number) => P.l + (i * (W - P.l - P.r)) / Math.max(1, series.length - 1);
  const y = (v: number) => P.t + ((max - v) * (H - P.t - P.b)) / (max - min || 1);
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={t('ledger.chart')}>
      <line x1={P.l} x2={W - P.r} y1={y(0)} y2={y(0)} stroke="var(--line)" />
      <text x={P.l - 6} y={y(max) + 4} textAnchor="end">
        {max}
      </text>
      <text x={P.l - 6} y={y(0) + 4} textAnchor="end">
        0
      </text>
      {min < 0 && (
        <text x={P.l - 6} y={y(min) + 4} textAnchor="end">
          {min}
        </text>
      )}
      {series.map((_, i) => (
        <text key={i} x={x(i)} y={H - 6} textAnchor="middle">
          {i}
        </text>
      ))}
      {game.players.map((p) => {
        const pts = series.map((s, i) => `${x(i)},${y(s[p.id] ?? 0)}`).join(' ');
        const last = series[series.length - 1]?.[p.id] ?? 0;
        return (
          <g key={p.id}>
            <polyline points={pts} fill="none" stroke={PLAYER_HEX[p.color]} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
            <foreignObject x={x(series.length - 1) + 4} y={y(last) - 14} width="28" height="28">
              <Avatar player={p} size={28} />
            </foreignObject>
          </g>
        );
      })}
    </svg>
  );
}

export function Ledger({ game, onClose, readOnly = false }: { game: Game; onClose: () => void; readOnly?: boolean }) {
  const rounds = doneRounds(game);
  const running = gameRunning(game);
  const ranking = gameRanking(game);
  const leaderScore = ranking[0]?.score ?? 0;
  const [confirm, setConfirm] = useState<Round | null>(null);
  const [edit, setEdit] = useState<Round | null>(null);

  return (
    <Modal onClose={onClose} label={t('ledger.title')}>
      <div className="row">
        <h2 className="title">{t('ledger.title')}</h2>
        <span className="spacer" />
        <button className="icon-btn" type="button" onClick={onClose} aria-label={t('ledger.close')}>
          <Icon name="close" />
        </button>
      </div>
      <div className="ledger-wrap card" style={{ marginTop: 'var(--sp-3)' }}>
        <table className="ledger">
          <thead>
            <tr>
              <th scope="col">{t('ledger.round')}</th>
              {game.players.map((p) => (
                <th key={p.id} scope="col">
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                    <Avatar player={p} size={28} />
                    <span style={{ fontSize: 'var(--fs-xs)', maxWidth: 64, overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rounds.map((r, k) => {
              const res = roundScores(game, r);
              return (
                <tr key={r.index}>
                  <th scope="row" style={{ fontWeight: 600 }}>
                    {r.index + 1}
                    <span className="muted num" style={{ fontSize: 'var(--fs-xs)', display: 'block' }} title={t('round.cards', { n: r.cardsDealt })}>
                      ×{r.cardsDealt}
                    </span>
                  </th>
                  {r.voided && (
                    <td colSpan={r.entries.length} style={{ textAlign: 'center' }}>
                      <button type="button" disabled={readOnly} onClick={() => setConfirm(r)} className="muted" style={{ textAlign: 'center', fontStyle: 'italic' }}>
                        {t('ledger.voided')}
                      </button>
                    </td>
                  )}
                  {!r.voided && r.entries.map((e) => {
                    const pts = res[e.playerId]?.total ?? 0;
                    return (
                      <td key={e.playerId}>
                        <button type="button" disabled={readOnly} onClick={() => setConfirm(r)} aria-label={`${t('round.title', { r: r.index + 1 })}`}>
                          <span className="cell-bt">
                            {effectiveBid(e) ?? '–'}/{e.tricks ?? '–'}
                          </span>
                          <span className={`cell-pts ${pts > 0 ? 'pos' : pts < 0 ? 'neg' : ''}`}>
                            {pts > 0 ? '+' : pts < 0 ? '−' : ''}
                            {Math.abs(pts)}
                          </span>
                          <span className="cell-cum">{running[k]?.[e.playerId] ?? 0}</span>
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td>{t('ledger.total')}</td>
              {game.players.map((p) => {
                const r = ranking.find((x) => x.id === p.id);
                return (
                  <td key={p.id}>
                    {r?.rank === 1 && <Crown size={18} />} {r?.score ?? 0}
                    {r && r.rank > 1 && (
                      <span className="muted" style={{ display: 'block', fontSize: 'var(--fs-xs)', fontWeight: 500, whiteSpace: 'normal' }}>
                        {t('ledger.gap', { x: leaderScore - r.score })}
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>
      <h3 style={{ margin: 'var(--sp-4) 0 var(--sp-2)' }}>{t('ledger.chart')}</h3>
      <Chart game={game} />
      {confirm && (
        <Confirm
          text={t('ledger.editConfirm', { r: confirm.index + 1 })}
          onNo={() => setConfirm(null)}
          onYes={() => {
            setEdit(confirm);
            setConfirm(null);
          }}
        />
      )}
      {edit && <RoundEditor game={game} round={edit} onClose={() => setEdit(null)} />}
    </Modal>
  );
}
