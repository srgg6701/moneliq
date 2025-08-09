"use client";
import { useEffect, useLayoutEffect, useMemo, useRef, useCallback } from "react";
import type { Currency, Balance, CombinedCurrencyData } from "@/types";
import type { ReactNode } from "react";
import { endpointCurrencies, endpointBalances } from "@/config/site";

import { Spinner } from "@heroui/spinner";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from "@heroui/table";
import useSWR from "swr";
import useSWRInfinite from "swr/infinite";
import { SWRConfig } from "swr";
import { useInView } from "react-intersection-observer";

// -------------------- Tunables --------------------
// Page size for the currencies API
const ITEMS_PER_PAGE = 10;
// Early trigger for infinite scroll (not too aggressive)
const IO_ROOT_MARGIN = "350px";
// How many pages to request ahead (bump size). Keep 1 for smoothness.
const PREFETCH_AHEAD = 1;
// Limit number of SWR cache entries (keys). Protects memory usage.
const LRU_MAX_ITEMS = 500;
// Limit how many pages we keep in SWR state for very long lists.
const MAX_PAGES_IN_MEMORY = 20;

// -------------------- Tiny LRU for SWR cache provider --------------------
/**
 * Minimal LRU map for SWR's provider to prevent unbounded memory growth.
 * - Keeps recency by re-inserting on get()
 * - Evicts the least-recent item when capacity is exceeded
 */
class LRUCache<K, V> {
  private map = new Map<K, V>();
  constructor(private max = 500) {}
  get size() {
    return this.map.size;
  }
  get(key: K) {
    const v = this.map.get(key);
    if (v !== undefined) {
      this.map.delete(key);
      this.map.set(key, v);
    } // bump recency
    return v;
  }
  set(key: K, val: V) {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, val);
    if (this.map.size > this.max) {
      // Evict the oldest (first) key safely
      const it = this.map.keys().next();
      if (!it.done) this.map.delete(it.value);
    }
    return this;
  }
  has(key: K) {
    return this.map.has(key);
  }
  delete(key: K) {
    return this.map.delete(key);
  }
  clear() {
    this.map.clear();
  }
  keys() {
    return this.map.keys();
  }
  values() {
    return this.map.values();
  }
  entries() {
    return this.map.entries();
  }
  [Symbol.iterator]() {
    return this.map[Symbol.iterator]();
  }
}

// -------------------- Fetcher --------------------
/**
 * Generic JSON fetcher for SWR. Uses `cache: 'no-store'` to avoid the
 * browser HTTP cache interfering with SWR's cache.
 */
const fetchJSON = async <T,>(url: string): Promise<T> => {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
};

// -------------------- Component --------------------
export default function BalancesTable() {
  // Local SWR provider using our LRU cache — keeps this self-contained to one file.
  const provider = useMemo(
    () => () => new LRUCache<string, any>(LRU_MAX_ITEMS) as any,
    [],
  );
  return (
    <SWRConfig value={{ fetcher: fetchJSON, provider }}>
      <BalancesTableInner />
    </SWRConfig>
  );
}

function BalancesTableInner() {
  const tableRef = useRef<HTMLDivElement | null>(null);
  const rowHeightRef = useRef<number>(44); // measured row height (px)
  const autoBumpDone = useRef(false); // ensure we auto-load only once

  // 1) Fetch balances once; SWR caches them for us.
  const {
    data: balances,
    error: balancesError,
    isLoading: balancesLoading,
  } = useSWR<Balance[]>(
    endpointBalances,
  );

  // 2) Combiner: merge currencies with balances by currency_id.
  const combineWithBalances = useCallback(
    (currencies: Currency[]): CombinedCurrencyData[] => {
      const all = balances ?? [];
      return currencies.map((c) => {
        // Normalize id types once to compare as numbers
        const idNum = Number(c.id);
        const b = all.find((x) => x.currency_id === idNum && x.amount);
        return {
          currencyId: c.id,
          symbol: c.symbol,
          code: c.code,
          amount: b?.amount || null,
        };
      });
    },
    [balances],
  );

  // 3) Infinite currencies using SWR Infinite.
  //    getKey returns `null` to stop when the previous page was truly empty.
  const getKey = useCallback(
    (index: number, prev: Currency[] | null) => {
      if (prev && prev.length === 0) return null; // true end-of-list (empty page)
      if (!balances && !balancesError) return null; // wait until balances are ready
      const page = index + 1;
      return `${endpointCurrencies}?page=${page}&limit=${ITEMS_PER_PAGE}`;
    },
    [balances, balancesError],
  );

  const {
    data: pages,
    size,
    setSize,
    isValidating,
    error: pagesError,
    mutate,
  } = useSWRInfinite<Currency[]>(getKey, {
    revalidateFirstPage: false,
    parallel: false, // serialize network to avoid bursts and keep order predictable
  });

  // 4) Derived data
  const combinedPages: CombinedCurrencyData[][] = useMemo(() => {
    if (!pages) return [];
    return pages.map((p) => combineWithBalances(p ?? []));
  }, [pages, combineWithBalances]);

  // Flatten and de-duplicate by currencyId (safety against duplicates)
  const flatData = useMemo(
    () =>
      combinedPages
        .flat()
        .filter(
          (v, i, arr) =>
            arr.findIndex((x) => x.currencyId === v.currencyId) === i,
        ),
    [combinedPages],
  );

  // Detect end-of-list: last page is [] (SWR will also stop requesting)
  const reachedEnd = useMemo(() => {
    if (!pages) return false;
    const last = pages[pages.length - 1];
    return Array.isArray(last) && last.length === 0;
  }, [pages]);

  const isInitialLoading = balancesLoading || (!pages && !pagesError);
  const isFetchingMore = !isInitialLoading && isValidating;

  // 5) Measure row height ASAP (before paint) to compute an initial buffer target cleanly.
  useLayoutEffect(() => {
    if (!tableRef.current) return;
    const row = tableRef.current.querySelector("tr");
    if (row) {
      const h = (row as HTMLElement).getBoundingClientRect().height;
      if (h && Number.isFinite(h)) rowHeightRef.current = h;
    }
  }, [flatData.length]);

  // 6) One-off auto-bump after first render if content is shorter than ~1.6× viewport.
  //    Uses PREFETCH_AHEAD to decide how many pages to add in one go.
  useEffect(() => {
    if (autoBumpDone.current) return;
    if (isInitialLoading || reachedEnd) return;
    const rowH = rowHeightRef.current || 44;
    const desired = Math.ceil((window.innerHeight / rowH) * 1.6);
    if (flatData.length < desired) {
      autoBumpDone.current = true;
      setSize((s) => s + Math.max(1, PREFETCH_AHEAD));
    }
  }, [flatData.length, isInitialLoading, reachedEnd, setSize]);

  // 7) Sentinel-driven bump: when sentinel enters view, load +PREFETCH_AHEAD pages.
  const { ref: inViewRef, inView } = useInView({
    rootMargin: IO_ROOT_MARGIN,
    triggerOnce: false,
  });
  useEffect(() => {
    if (!inView) return;
    if (isInitialLoading || isFetchingMore || reachedEnd) return;
    setSize((s) => s + Math.max(1, PREFETCH_AHEAD));
  }, [inView, isInitialLoading, isFetchingMore, reachedEnd, setSize]);

  // 8) Optional: keep SWR memory in check for very long lists
  useEffect(() => {
    if (!pages) return;
    if (pages.length <= MAX_PAGES_IN_MEMORY) return;
    // Drop the earliest page. This does NOT trigger a refetch.
    mutate((prev) => (prev ? prev.slice(1) : prev), false);
  }, [pages, mutate]);

  // 9) Errors
  if (balancesError)
    return (
      <p className="text-red-500 text-center">Error: {String(balancesError)}</p>
    );
  if (pagesError)
    return (
      <p className="text-red-500 text-center">Error: {String(pagesError)}</p>
    );

  // 10) Loading/empty states
  if (isInitialLoading && flatData.length === 0) {
    return (
      <div className="flex justify-center items-center h-48">
        <Spinner size="lg" />
        <p className="ml-2 text-gray-700 dark:text-gray-300">
          Loading initial data...
        </p>
      </div>
    );
  }
  if (!isInitialLoading && flatData.length === 0 && reachedEnd) {
    return (
      <p className="text-gray-500 text-center">No currency data available.</p>
    );
  }

  // 11) Render the table + sentinel
  const columns = [
    { key: "symbol", label: "Currency" },
    { key: "code", label: "Code" },
    { key: "amount", label: "Balance" },
  ] as const;

  return (
    <div className="pх-4" ref={tableRef}>
      <Table aria-label="Available Balances Table">
        <TableHeader>
          {columns.map((c) => (
            <TableColumn key={c.key}>{c.label}</TableColumn>
          ))}
        </TableHeader>
        <TableBody>
          {flatData.map((item) => (
            <TableRow key={item.currencyId}>
              {(columnKey) => (
                <TableCell>
                  {columnKey === "amount"
                    ? item.amount || "N/A"
                    : (item[
                        columnKey as keyof CombinedCurrencyData
                      ] as ReactNode)}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Sentinel observed by useInView.
         When it becomes visible, we load the next page(s). */}
      <div ref={inViewRef} style={{ height: 20, margin: "20px 0" }}>
        {isFetchingMore && (
          <div className="flex justify-center items-center">
            <Spinner size="sm" />
            <p className="ml-2 text-gray-700 dark:text-gray-300">
              Loading more...
            </p>
          </div>
        )}
        {reachedEnd && flatData.length > 0 && !isFetchingMore && (
          <p className="text-center text-gray-500 dark:text-gray-400">
            You've reached the end of the list.
          </p>
        )}
      </div>
    </div>
  );
}
