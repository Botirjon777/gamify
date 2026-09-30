"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Infinite scroll: starts with the server-rendered first page, loads the next page when the returned
 * `sentinelRef` element comes within ~600px of the viewport. Stops when a page comes back short.
 */
export function useInfinite<T>(initial: T[], pageSize: number, loadPage: (loaded: T[]) => Promise<T[]>) {
  const [items, setItems] = useState(initial);
  const [done, setDone] = useState(initial.length < pageSize);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const busy = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (busy.current || done) return;
    busy.current = true;
    setLoading(true);
    setError(false);
    try {
      const next = await loadPage(items);
      setItems((prev) => [...prev, ...next]);
      if (next.length < pageSize) setDone(true);
    } catch {
      setError(true);
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }, [done, items, loadPage, pageSize]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || done) return;
    const io = new IntersectionObserver(([entry]) => entry.isIntersecting && void loadMore(), { rootMargin: "600px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [done, loadMore]);

  return { items, done, loading, error, sentinelRef, retry: loadMore };
}
