// Extinction des feux : un halo suit le doigt ou la souris quand la lanterne est éteinte.
import { useEffect } from 'react';

export function useLightsOut(off: boolean): void {
  useEffect(() => {
    const root = document.documentElement;
    if (!off) {
      delete root.dataset.lights;
      return;
    }
    root.dataset.lights = 'off';
    const move = (e: PointerEvent) => {
      root.style.setProperty('--mx', `${e.clientX}px`);
      root.style.setProperty('--my', `${e.clientY}px`);
    };
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerdown', move, { passive: true });
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerdown', move);
      delete root.dataset.lights;
    };
  }, [off]);
}

