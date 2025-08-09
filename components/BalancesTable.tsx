// components/BalancesTable.tsx
'use client';

import React, { useLayoutEffect, useEffect, useRef, useCallback, useMemo, ReactNode } from 'react';
import { Spinner } from '@heroui/spinner';
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from '@heroui/table';
import useSWR from 'swr'; // SWR for fetching all balances
import useSWRInfinite from 'swr/infinite'; // SWR for infinite scroll
import { SWRConfig } from 'swr'; // SWR provider for cache
import { useInView } from 'react-intersection-observer'; // Hook for intersection observer
import { endpointCurrencies, endpointBalances } from "@/config/site";
import type { Currency, Balance, CombinedCurrencyData } from "@/types";


// --- Component Props ---
interface BalancesTableProps {
  debouncedSearchQuery: string; // Prop for debounced search query
  sortBy: string; // <-- ADDED: Prop for sort field
  sortOrder: string; // <-- ADDED: Prop for sort order
}

// --- Tunables ---
const ITEMS_PER_PAGE = 10;
const IO_ROOT_MARGIN = '200px'; // Load when 200px from the bottom
const PREFETCH_AHEAD = 1; // How many pages to request ahead (bump size)
const LRU_MAX_ITEMS = 500; // Limit SWR cache entries
const MAX_PAGES_IN_MEMORY = 20; // Limit pages in SWR state for very long lists

// --- Tiny LRU for SWR cache provider ---
// Minimal LRU map for SWR's provider to prevent unbounded memory growth.
class LRUCache<K, V> {
  private map = new Map<K, V>();
  constructor(private max = 500) {}
  get size() { return this.map.size; }
  get(key: K) {
    const v = this.map.get(key);
    if (v !== undefined) {
      this.map.delete(key);
      this.map.set(key, v);
    }
    return v;
  }
  set(key: K, val: V) {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, val);
    if (this.map.size > this.max) {
      const it = this.map.keys().next();
      if (!it.done) this.map.delete(it.value);
    }
    return this;
  }
  has(key: K) { return this.map.has(key); }
  delete(key: K) { return this.map.delete(key); }
  clear() { this.map.clear(); }
  keys() { return this.map.keys(); }
  values() { return this.map.values(); }
  entries() { return this.map.entries(); }
  [Symbol.iterator]() { return this.map[Symbol.iterator](); }
}

// --- Fetcher ---
// Generic JSON fetcher for SWR. Uses `cache: 'no-store'` to avoid browser cache.
const fetchJSON = async <T,>(url: string): Promise<T> => {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText || 'Unknown Error'}`);
  return res.json();
};
// --- Main BalancesTable component (wrapped in SWRConfig) ---
export default function BalancesTable({ debouncedSearchQuery, sortBy, sortOrder }: BalancesTableProps) { // <-- CHANGED: Accept all props here
  // Local SWR provider using our LRU cache — keeps this self-contained to one file.
  const provider = useMemo(
    () => () => new LRUCache<string, any>(LRU_MAX_ITEMS) as any,
    [],
  );
  return (
    <SWRConfig value={{ fetcher: fetchJSON, provider }}>
      <BalancesTableInner debouncedSearchQuery={debouncedSearchQuery} sortBy={sortBy} sortOrder={sortOrder} /> {/* <-- CHANGED: Pass all props */}
    </SWRConfig>
  );
}

// --- Inner component containing the actual logic ---
function BalancesTableInner({ debouncedSearchQuery, sortBy, sortOrder }: BalancesTableProps) { // <-- CHANGED: Accept all props
  const tableRef = useRef<HTMLDivElement>(null);
  const rowHeightRef = useRef<number>(44); // Measured row height (px)
  const autoBumpDone = useRef(false); // Ensure we auto-load only once

  // 1) Fetch all balances once; SWR caches them for us.
  const {
    data: balances,
    error: balancesError,
    isLoading: balancesLoading,
  } = useSWR<Balance[]>(
    endpointBalances, // SWR will cache this
  );

  // 2) Combiner: merge currencies with balances by currency_id.
  const combineWithBalances = useCallback(
    (currencies: Currency[]): CombinedCurrencyData[] => {
      const all = balances ?? [];
      return currencies.map((c) => {
        // Normalize id types to compare as numbers
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
    [balances], // Dependency: re-create if balances change
  );

  // 3) Infinite currencies using SWR Infinite.
  //    getKey returns `null` to stop fetching when the previous page was truly empty.
  const getKey = useCallback(
    (index: number, prev: Currency[] | null) => {
      // If previous page was empty, stop
      if (prev && prev.length === 0) return null; 
      // Wait until balances are ready (if not, return null, SWR won't fetch)
      if (!balances && !balancesError) return null; 

      const page = index + 1;
      // Construct URL with pagination, SEARCH, and SORTING query parameters
      return `${endpointCurrencies}?page=${page}&limit=${ITEMS_PER_PAGE}${debouncedSearchQuery ? `&search=${debouncedSearchQuery}` : ''}${sortBy ? `&sortBy=${sortBy}&order=${sortOrder}` : ''}`; // <-- CHANGED: Added search and sort parameters
    },
    [balances, balancesError, debouncedSearchQuery, sortBy, sortOrder], // <-- CHANGED: Added sortBy and sortOrder to dependencies
  );

  const {
    data: pages, // Array of arrays: [[page1], [page2], ...]
    size, // Current number of pages being fetched
    setSize, // Function to update number of pages
    isValidating, // True if a fetch is in progress
    error: pagesError, // Error from infinite fetch
    mutate, // Function to manually revalidate/update cache
  } = useSWRInfinite<Currency[]>(getKey, {
    revalidateFirstPage: false, // Don't revalidate first page on mount
    parallel: false, // Fetch pages sequentially to avoid bursts and keep order predictable
  });

  // 4) Derived data: Combine and flatten fetched pages
  const combinedPages: CombinedCurrencyData[][] = useMemo(() => {
    if (!pages) return [];
    return pages.map((p) => combineWithBalances(p ?? []));
  }, [pages, combineWithBalances]);

  // Flatten all combined pages and de-duplicate by currencyId (safety against duplicates from API)
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

  // Detect end-of-list: true if the last fetched page was empty
  const reachedEnd = useMemo(() => {
    if (!pages) return false;
    const last = pages[pages.length - 1];
    return Array.isArray(last) && last.length === 0;
  }, [pages]);

  // Combined loading states for UI
  const isInitialLoading = balancesLoading || (!pages && !pagesError); // Initial load of balances or first page of currencies
  const isFetchingMore = !isInitialLoading && isValidating; // Fetching subsequent pages

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
  //    This proactively loads more pages if the initial content doesn't fill the screen.
  useEffect(() => {
    if (autoBumpDone.current) return;
    if (isInitialLoading || reachedEnd) return;
    const rowH = rowHeightRef.current || 44;
    const desired = Math.ceil((window.innerHeight / rowH) * 1.6); // Aim to fill ~1.6x viewport height
    if (flatData.length < desired) {
      autoBumpDone.current = true;
      setSize((s) => s + Math.max(1, PREFETCH_AHEAD)); // Load at least one, or PREFETCH_AHEAD pages
    }
  }, [flatData.length, isInitialLoading, reachedEnd, setSize]);

  // 7) Sentinel-driven bump: when the sentinel element enters view, load +PREFETCH_AHEAD pages.
  const { ref: inViewRef, inView } = useInView({
    rootMargin: IO_ROOT_MARGIN, // Define how far from the viewport edge the sentinel should trigger
    triggerOnce: false, // Trigger every time it comes into view
  });
  useEffect(() => {
    if (!inView) return; // Only load if sentinel is in view
    if (isInitialLoading || isFetchingMore || reachedEnd) return; // Don't load if already loading or no more data
    setSize((s) => s + Math.max(1, PREFETCH_AHEAD)); // Increment page size
  }, [inView, isInitialLoading, isFetchingMore, reachedEnd, setSize, debouncedSearchQuery, sortBy, sortOrder]); // <-- CHANGED: Added dependencies for sentinel

  // 8) Optional: keep SWR memory in check for very long lists
  useEffect(() => {
    if (!pages) return;
    if (pages.length <= MAX_PAGES_IN_MEMORY) return;
    // Drop the earliest page from cache. This does NOT trigger a refetch.
    mutate((prev) => (prev ? prev.slice(1) : prev), { revalidate: false });
  }, [pages, mutate]);

  // 9) Error handling display
  if (balancesError)
    return (
      <p className="text-red-500 text-center">Error: {String(balancesError)}</p>
    );
  if (pagesError)
    return (
      <p className="text-red-500 text-center">Error: {String(pagesError)}</p>
    );

  // 10) Loading/empty states display
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
    <div className="mt-4" ref={tableRef}>
      {/* Table Component */}
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

      {/* Sentinel observed by useInView. When it becomes visible, we load the next page(s). */}
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