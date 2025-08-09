'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Spinner } from '@heroui/spinner';
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from '@heroui/table';

interface Currency {
  id: string;
  symbol: string;
  code: string;
}

interface Balance {
  id: string;
  currency_id: number;
  amount: string;
}

interface CombinedCurrencyData {
  currencyId: string;
  symbol: string;
  code: string;
  amount: string | null;
}

const ITEMS_PER_PAGE = 10;
// Prefetch only ONE page ahead to avoid bursts
const PREFETCH_AHEAD = 1;
// Early trigger but not too aggressive
const IO_ROOT_MARGIN = '350px';

// Cache entry includes both rows and an end flag
type PageCache = { rows: CombinedCurrencyData[]; reachedEnd: boolean };

export default function BalancesTable() {
  const [data, setData] = useState<CombinedCurrencyData[]>([]);
  const [allBalances, setAllBalances] = useState<Balance[]>([]);
  const [error, setError] = useState<string | null>(null);

  // isLoading — only for the VERY FIRST page render
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  const tableRef = useRef<HTMLDivElement | null>(null);
  const observerTarget = useRef<HTMLDivElement>(null);

  /**
   * Infra:
   * - cacheRef keeps page -> { rows, reachedEnd }
   * - inFlightRef: single global flag "some fetch is running" (concurrency = 1)
   * - abortsRef stores AbortControllers to cancel obsolete requests on unmount
   * - autoFillOnceRef: allow only ONE "auto-bump" after the first render
   * - measuredRowHeightRef: dynamic row height for viewport-based buffer
   */
  const cacheRef = useRef<Map<number, PageCache>>(new Map());
  const inFlightRef = useRef<boolean>(false);
  const abortsRef = useRef<Map<number, AbortController>>(new Map());
  const autoFillOnceRef = useRef<boolean>(false);
  const measuredRowHeightRef = useRef<number>(44); // fallback default

  // --- util: combine currencies with balances ---
  const combineWithBalances = useCallback(
    (currencies: Currency[]): CombinedCurrencyData[] => {
      return currencies.map((currency) => {
        const b = allBalances.find(
          (x) => String(x.currency_id) === currency.id && x.amount
        );
        return {
          currencyId: currency.id,
          symbol: currency.symbol,
          code: currency.code,
          amount: b?.amount || null,
        };
      });
    },
    [allBalances]
  );

  // 0) Measure approximate row height after first paint for viewport-buffer logic
  useEffect(() => {
    if (!tableRef.current) return;
    const measure = () => {
      const row = tableRef.current!.querySelector('tr');
      if (row) {
        const h = (row as HTMLElement).getBoundingClientRect().height;
        if (h && Number.isFinite(h)) measuredRowHeightRef.current = h;
      }
    };
    measure();
    const id = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(id);
  }, [data.length]);

  // 1) Load all balances once
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(
          `https://653fb0ea9e8bd3be29e10cd4.mockapi.io/api/v1/balances`,
          { cache: 'no-store' }
        );
        if (!res.ok) throw new Error('Failed to fetch all balances');
        const balances: Balance[] = await res.json();
        if (mounted) setAllBalances(balances);
      } catch (err) {
        if (mounted) {
          setError(
            err instanceof Error
              ? `Failed to load all balances: ${err.message}`
              : 'An unknown error occurred while fetching all balances'
          );
          setHasMore(false);
        }
      }
    })();
    return () => {
      mounted = false;
      abortsRef.current.forEach((c) => c.abort());
      abortsRef.current.clear();
      inFlightRef.current = false;
    };
  }, []);

  /**
   * Fetch ONE page and combine.
   * NEVER returns null: if another fetch is running, we wait until it finishes,
   * then serve from cache (if it was the same page) or start our own fetch.
   * End-of-list ONLY when response is empty (0 items) or 404.
   */
  const fetchPage = useCallback(
    async (page: number): Promise<PageCache> => {
      // 1) from cache
      const cached = cacheRef.current.get(page);
      if (cached) return cached;

      // 2) if another request is in-flight, wait until it's done (or page appears in cache)
      while (inFlightRef.current && !cacheRef.current.get(page)) {
        // small wait (keeps code simple and avoids races)
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, 30));
      }
      // maybe the page got cached while we were waiting
      const cachedAfterWait = cacheRef.current.get(page);
      if (cachedAfterWait) return cachedAfterWait;

      // 3) do our own fetch (concurrency = 1)
      const controller = new AbortController();
      abortsRef.current.set(page, controller);
      inFlightRef.current = true;

      try {
        const res = await fetch(
          `https://653fb0ea9e8bd3be29e10cd4.mockapi.io/api/v1/currencies?page=${page}&limit=${ITEMS_PER_PAGE}`,
          { cache: 'no-store', signal: controller.signal }
        );

        if (!res.ok) {
          if (res.status === 404) {
            const payload: PageCache = { rows: [], reachedEnd: true };
            cacheRef.current.set(page, payload);
            return payload;
          }
          throw new Error('Failed to fetch currencies');
        }

        const currencies: Currency[] = await res.json();
        const reachedEnd = currencies.length === 0;
        const combined = combineWithBalances(currencies);
        const payload: PageCache = { rows: combined, reachedEnd };
        cacheRef.current.set(page, payload);
        return payload;
      } finally {
        inFlightRef.current = false;
        abortsRef.current.delete(page);
      }
    },
    [combineWithBalances]
  );

  /**
   * Foreground load for the current page (append or replace for page 1).
   * After render, prefetch ONLY (page+1) in background (warm cache).
   */
  const ensurePageRendered = useCallback(
    async (page: number) => {
      if (error) return;
      if (allBalances.length === 0) return;

      const isFirst = page === 1;
      if (isFirst) setIsLoading(true);
      else setIsFetchingMore(true);

      try {
        const { rows, reachedEnd } = await fetchPage(page);

        setData((prev) => {
          const prepared = rows.filter(
            (n) => !prev.some((p) => p.currencyId === n.currencyId)
          );
          return page === 1 ? prepared : [...prev, ...prepared];
        });

        if (reachedEnd) setHasMore(false);

        // Warm exactly ONE next page
        if (!reachedEnd && PREFETCH_AHEAD === 1) {
          // fire-and-forget warmup (will wait internally if a fetch is running)
          // eslint-disable-next-line no-void
          void fetchPage(page + 1);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'An unknown error occurred';
        if (msg.includes('404')) {
          setHasMore(false);
          setError(null);
        } else {
          setError(msg);
          setHasMore(false);
        }
      } finally {
        if (page === 1) setIsLoading(false);
        setIsFetchingMore(false);
      }
    },
    [allBalances.length, error, fetchPage]
  );

  // 2) First page — start when balances are ready
  useEffect(() => {
    if (allBalances.length > 0 && currentPage === 1 && isLoading) {
      cacheRef.current.clear();
      inFlightRef.current = false;
      ensurePageRendered(1);
    }
  }, [allBalances.length, currentPage, isLoading, ensurePageRendered]);

  /**
   * 3) Subsequent pages — driven by currentPage.
   * Try instant append from cache; if miss — fetch foreground.
   */
  useEffect(() => {
    if (allBalances.length > 0 && currentPage > 1 && hasMore) {
      const cached = cacheRef.current.get(currentPage);
      if (cached) {
        if (cached.reachedEnd) {
          setHasMore(false);
          return;
        }
        setData((prev) => {
          const newItems = cached.rows.filter(
            (n) => !prev.some((p) => p.currencyId === n.currencyId)
          );
        return [...prev, ...newItems];
        });
        // warm next
        // eslint-disable-next-line no-void
        void fetchPage(currentPage + 1);
      } else {
        ensurePageRendered(currentPage);
      }
    }
  }, [currentPage, allBalances.length, hasMore, ensurePageRendered, fetchPage]);

  /**
   * 4) IntersectionObserver — mild early trigger (one page at a time).
   */
  useEffect(() => {
    if (!hasMore || isLoading || isFetchingMore) return;

    const observer = new IntersectionObserver(
      (entries: IntersectionObserverEntry[]) => {
        const e = entries[0];
        if (!e.isIntersecting) return;
        if (!hasMore || isLoading || isFetchingMore) return;
        setCurrentPage((p) => p + 1); // exactly one page
      },
      { rootMargin: IO_ROOT_MARGIN }
    );

    const el = observerTarget.current;
    if (el) observer.observe(el);
    return () => { if (el) observer.unobserve(el); };
  }, [hasMore, isLoading, isFetchingMore]);

  /**
   * 5) ONE auto-bump right after first render if content is too short.
   * Buffer target ≈ 1.6 × viewport height.
   */
  useEffect(() => {
    if (!hasMore || isLoading) return;
    if (autoFillOnceRef.current) return;

    const rowH = measuredRowHeightRef.current || 44;
    const desiredRows = Math.ceil((window.innerHeight / rowH) * 1.6);

    if (data.length < desiredRows) {
      autoFillOnceRef.current = true; // only one extra bump
      setCurrentPage((p) => p + 1);
    }
  }, [data.length, hasMore, isLoading]);

  /**
   * 6) Scroll fallback with rAF throttling.
   */
  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        if (!hasMore || isLoading || isFetchingMore) return;

        const remaining =
          document.documentElement.scrollHeight - window.scrollY - window.innerHeight;
        if (remaining < 600) {
          setCurrentPage((p) => p + 1); // one page
        }
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [hasMore, isLoading, isFetchingMore]);

  const columns = [
    { key: 'symbol', label: 'Currency' },
    { key: 'code', label: 'Code' },
    { key: 'amount', label: 'Balance' },
  ] as const;

  if (error) {
    return <p className="text-red-500 text-center">Error: {error}</p>;
  }

  if (isLoading && data.length === 0) {
    return (
      <div className="flex justify-center items-center h-48">
        <Spinner size="lg" />
        <p className="ml-2 text-gray-700 dark:text-gray-300">Loading initial data...</p>
      </div>
    );
  }

  if (data.length === 0 && !error && !isLoading) {
    return <p className="text-gray-500 text-center">No currency data available.</p>;
  }

  return (
    <div className="px-4" ref={tableRef}>
      <Table aria-label="Available Balances Table">
        <TableHeader>
          {columns.map((column) => (
            <TableColumn key={column.key}>{column.label}</TableColumn>
          ))}
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <TableRow key={item.currencyId}>
              {(columnKey) => (
                <TableCell>
                  {columnKey === 'amount'
                    ? (item.amount || 'N/A')
                    : (item[columnKey as keyof CombinedCurrencyData] as React.ReactNode)}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Sentinel for IO */}
      <div ref={observerTarget} style={{ height: '20px', margin: '20px 0' }}>
        {isFetchingMore && (
          <div className="flex justify-center items-center">
            <Spinner size="sm" />
            <p className="ml-2 text-gray-700 dark:text-gray-300">Loading more...</p>
          </div>
        )}
        {!hasMore && data.length > 0 && !isFetchingMore && (
          <p className="text-center text-gray-500 dark:text-gray-400">
            You've reached the end of the list.
          </p>
        )}
        {data.length === 0 && !hasMore && !error && !isLoading && (
          <p className="text-center text-gray-500 dark:text-gray-400">No balances found.</p>
        )}
      </div>
    </div>
  );
}
