// Jetons partagés par les composants (couleurs des joueurs, animations par fait de jeu).
import type { FactKind } from '../game/events';

export const PLAYER_HEX: Record<string, string> = {
  c1: '#C8463C',
  c2: '#B8691E',
  c3: '#2F9150',
  c4: '#1C8C8C',
  c5: '#4277D0',
  c6: '#8A5BD0',
  c7: '#C44A8E',
  c8: '#8C7A1E',
};

export const FACT_ANIM: Record<FactKind, string> = {
  bidMade: 'anim-bob',
  grazed: 'anim-bob',
  zeroBidMade: 'anim-bob',
  bidMissed: 'anim-sink',
  zeroBidMissed: 'anim-sink',
  bigLoss: 'anim-shake',
  skullKingCapture: 'anim-shake',
  mermaidCapture: 'anim-bob',
};
