'use client';
import { useEffect, useState } from 'react';

/**
 * Screen Wake Lock po celou dobu tréninku (B8). iOS zámek uvolní při odchodu z appky,
 * proto se při návratu (visibilitychange) žádá znovu. Vrací, zda displej právě drží.
 */
export function useWakeLock(active: boolean): boolean {
  const [held, setHeld] = useState(false);
  useEffect(() => {
    if (!active || typeof navigator === 'undefined' || !('wakeLock' in navigator)) { setHeld(false); return; }
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    const request = async () => {
      if (document.visibilityState !== 'visible' || cancelled) return;
      try {
        lock = await navigator.wakeLock.request('screen');
        setHeld(true);
        lock.addEventListener('release', () => setHeld(false));
      } catch {
        setHeld(false);
      }
    };
    const onVis = () => { if (document.visibilityState === 'visible' && (!lock || lock.released)) void request(); };
    void request();
    document.addEventListener('visibilitychange', onVis);
    // Pojistka: některé verze Safari zámek tiše pustí
    const iv = setInterval(onVis, 15000);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVis);
      clearInterval(iv);
      void lock?.release().catch(() => {});
    };
  }, [active]);
  return held;
}
