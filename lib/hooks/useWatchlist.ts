import { useCallback, useEffect, useState } from 'react';
import { useSession } from './useSession';
import { listWatchlistCodes, addToWatchlist, removeFromWatchlist } from '../api/watchlist';

/**
 * Hook that exposes the user's watchlist as a Set<amfiCode> and toggle/remove
 * actions with optimistic updates. Single source of truth across screens.
 */
export function useWatchlist() {
  const { accessToken } = useSession();
  const [codes, setCodes] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    if (!accessToken) return;
    try {
      const list = await listWatchlistCodes(accessToken);
      setCodes(new Set(list));
    } catch {
      // ignore — empty set is fine
    } finally {
      setReady(true);
    }
  }, [accessToken]);

  useEffect(() => { load(); }, [load]);

  const toggle = useCallback(async (amfiCode: string) => {
    if (!accessToken || !amfiCode) return;
    const wasWatched = codes.has(amfiCode);
    // Optimistic update
    setCodes((prev) => {
      const next = new Set(prev);
      if (wasWatched) next.delete(amfiCode); else next.add(amfiCode);
      return next;
    });
    try {
      if (wasWatched) await removeFromWatchlist(accessToken, amfiCode);
      else            await addToWatchlist(accessToken, amfiCode);
    } catch (e) {
      // Revert on failure
      setCodes((prev) => {
        const next = new Set(prev);
        if (wasWatched) next.add(amfiCode); else next.delete(amfiCode);
        return next;
      });
      throw e;
    }
  }, [accessToken, codes]);

  return { codes, ready, toggle, reload: load, isWatched: (c?: string | null) => !!c && codes.has(c) };
}
