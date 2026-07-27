"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export const REFRESH_INTERVAL = 30_000;

const MIN_GAP = 5_000;

type AutoRefreshOptions = {
  intervalMs?: number;
  enabled?: boolean;
};

type AutoRefresh = {
  refreshing: boolean;
  refresh: () => void;
};

export function useAutoRefresh(
  load: () => Promise<unknown>,
  { intervalMs = REFRESH_INTERVAL, enabled = true }: AutoRefreshOptions = {},
): AutoRefresh {
  const [refreshing, setRefreshing] = useState(false);
  const loadRef = useRef(load);
  const runningRef = useRef(false);
  const lastRunRef = useRef(0);

  useEffect(() => {
    loadRef.current = load;
  }, [load]);

  const run = useCallback(async (manual: boolean) => {
    if (runningRef.current) return;
    if (!manual && Date.now() - lastRunRef.current < MIN_GAP) return;

    runningRef.current = true;
    if (manual) setRefreshing(true);

    try {
      await loadRef.current();
    } catch {
      return;
    } finally {
      lastRunRef.current = Date.now();
      runningRef.current = false;
      if (manual) setRefreshing(false);
    }
  }, []);

  const refresh = useCallback(() => {
    void run(true);
  }, [run]);

  useEffect(() => {
    if (!enabled) return;

    const tick = () => {
      if (document.visibilityState !== "visible") return;
      if (!navigator.onLine) return;
      void run(false);
    };

    const id = window.setInterval(tick, intervalMs);
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("online", tick);
    window.addEventListener("focus", tick);

    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener("online", tick);
      window.removeEventListener("focus", tick);
    };
  }, [enabled, intervalMs, run]);

  return { refreshing, refresh };
}
