// Diffusion en direct d'une partie vers des appareils spectateurs (pair à pair, WebRTC via PeerJS).
// Uniquement à la demande de l'hôte (« Diffuser la partie ») : le service public PeerJS ne sert qu'à
// mettre les appareils en relation ; la partie elle-même passe directement d'appareil à appareil.
import Peer, { type DataConnection } from 'peerjs';
import type { Game } from '../game/model';
import { isGame } from '../game/storage';

const PREFIX = 'scoreking-v1-';
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export interface LiveMessage {
  v: 1;
  game: Game;
}

export function newRoomCode(): string {
  let s = '';
  for (let i = 0; i < 6; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return s;
}

export function watchUrl(code: string): string {
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}#voir=${code}`;
}

export function codeFromHash(hash: string): string | null {
  const m = /#voir=([A-Z0-9]{6})/i.exec(hash);
  return m?.[1]?.toUpperCase() ?? null;
}

// ------------------------------------------------------------ hôte

export class LiveHost {
  private peer: Peer | null = null;
  private conns = new Set<DataConnection>();
  private last: Game | null = null;
  onChange: (() => void) | null = null;
  status: 'connecting' | 'online' | 'error' = 'connecting';

  readonly code: string;

  constructor(code: string) {
    this.code = code;
    this.open();
  }

  private open(): void {
    const peer = new Peer(PREFIX + this.code);
    this.peer = peer;
    peer.on('open', () => {
      this.status = 'online';
      this.onChange?.();
    });
    peer.on('connection', (c) => {
      c.on('open', () => {
        this.conns.add(c);
        if (this.last) c.send({ v: 1, game: this.last } satisfies LiveMessage);
        this.onChange?.();
      });
      c.on('close', () => {
        this.conns.delete(c);
        this.onChange?.();
      });
      c.on('error', () => {
        this.conns.delete(c);
        this.onChange?.();
      });
    });
    peer.on('disconnected', () => {
      if (!peer.destroyed) peer.reconnect();
    });
    peer.on('error', () => {
      this.status = 'error';
      this.onChange?.();
    });
  }

  get spectators(): number {
    return this.conns.size;
  }

  publish(game: Game): void {
    this.last = game;
    const msg: LiveMessage = { v: 1, game };
    this.conns.forEach((c) => {
      if (c.open) c.send(msg);
    });
  }

  stop(): void {
    this.conns.forEach((c) => c.close());
    this.conns.clear();
    this.peer?.destroy();
    this.peer = null;
  }
}

// ------------------------------------------------------------ spectateur

export type WatchStatus = 'connecting' | 'live' | 'lost' | 'notFound';

export function watch(code: string, onGame: (g: Game) => void, onStatus: (s: WatchStatus) => void): () => void {
  let stopped = false;
  let peer: Peer | null = null;
  let retry = 0;
  const connect = () => {
    if (stopped) return;
    peer?.destroy();
    peer = new Peer();
    onStatus('connecting');
    peer.on('open', () => {
      const conn = peer?.connect(PREFIX + code, { reliable: true });
      conn?.on('open', () => onStatus('live'));
      conn?.on('data', (d) => {
        const m = d as Partial<LiveMessage>;
        if (m && m.v === 1 && isGame(m.game)) onGame(m.game);
      });
      conn?.on('close', () => {
        onStatus('lost');
        retry = window.setTimeout(connect, 3000);
      });
    });
    peer.on('error', (e) => {
      onStatus((e as { type?: string }).type === 'peer-unavailable' ? 'notFound' : 'lost');
      retry = window.setTimeout(connect, 4000);
    });
  };
  connect();
  return () => {
    stopped = true;
    window.clearTimeout(retry);
    peer?.destroy();
  };
}
