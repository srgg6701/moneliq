'use client';
import React, { useLayoutEffect, useMemo, useRef, useCallback } from 'react';
import { Spinner } from '@heroui/spinner';
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from '@heroui/table';
import useSWR from 'swr';
import useSWRInfinite from 'swr/infinite';
import { SWRConfig } from 'swr';
import { useInView } from 'react-intersection-observer';

// -------------------- Types --------------------
interface Currency { id: string; symbol: string; code: string; }
interface Balance  { id: string; currency_id: number; amount: string; }
interface CombinedCurrencyData { currencyId: string; symbol: string; code: string; amount: string | null; }

// -------------------- Tunables --------------------
const ITEMS_PER_PAGE = 10;
const IO_ROOT_MARGIN = '350px';
const PREFETCH_AHEAD = 1;
const LRU_MAX_ITEMS = 500;

// -------------------- Tiny LRU for SWR cache provider --------------------
class LRUCache<K, V> {
  private map = new Map<K, V>();
  constructor(private max = 500) {}
  get size() { return this.map.size; }
  get(key: K) {
    const v = this.map.get(key);
    if (v !== undefined) { this.map.delete(key); this.map.set(key, v); }
    return v;
  }
  set(key: K, val: V) {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, val);
    if (this.map.size > this.max) {
      const it = this.map.keys().next();
      if (!it.done) this.map.delete(it.value); // TS-safe: only delete when key exists
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

// -------------------- Fetcher --------------------
const fetchJSON = async <T,>(url: string): Promise<T> => {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
};

// -------------------- Component --------------------
export default function BalancesTable() {
  // local LRU provider (one file)
  const provider = useMemo(() => () => new LRUCache<string, any>(LRU_MAX_ITEMS) as any, []);
  return (
    <SWRConfig value={{ fetcher: fetchJSON, provider }}>
      <BalancesTableInner />
    </SWRConfig>
  );
}

function BalancesTableInner() {
  const tableRef = useRef<HTMLDivElement | null>(null);
  const rowHeightRef = useRef<number>(44);
  const autoBumpDone = useRef(false);

  // 1) balances
  const { data: balances, error: balancesError, isLoading: balancesLoading } =
    useSWR<Balance[]>('https://653fb0ea9e8bd3be29e10cd4.mockapi.io/api/v1/balances');

  // 2) combiner
  const combineWithBalances = useCallback(
    (currencies: Currency[]): CombinedCurrencyData[] => {
      const all = balances ?? [];
      return currencies.map((c) => {
        const b = all.find(x => String(x.currency_id) === c.id && x.amount);
        return { currencyId: c.id, symbol: c.symbol, code: c.code, amount: b?.amount || null };
      });
    },
    [balances]
  );

  // 3) infinite currencies
  const getKey = useCallback((index: number, prev: Currency[] | null) => {
    if (prev && prev.length === 0) return null;                  // end only on empty page
    if (!balances && !balancesError) return null;                // wait until balances ready
    const page = index + 1;
    return `https://653fb0ea9e8bd3be29e10cd4.mockapi.io/api/v1/currencies?page=${page}&limit=${ITEMS_PER_PAGE}`;
  }, [balances, balancesError]);

  const {
    data: pages, size, setSize, isValidating, error: pagesError, mutate,
  } = useSWRInfinite<Currency[]>(getKey, {
    revalidateFirstPage: false,
    parallel: false, // serialized to avoid bursts
  });

  // 4) derived
  const combinedPages: CombinedCurrencyData[][] = useMemo(() => {
    if (!pages) return [];
    return pages.map((p) => combineWithBalances(p ?? []));
  }, [pages, combineWithBalances]);

  const flatData = useMemo(
    () => combinedPages.flat().filter((v, i, arr) => arr.findIndex(x => x.currencyId === v.currencyId) === i),
    [combinedPages]
  );

  const reachedEnd = useMemo(() => {
    if (!pages) return false;
    const last = pages[pages.length - 1];
    return Array.isArray(last) && last.length === 0;
  }, [pages]);

  const isInitialLoading = balancesLoading || (!pages && !pagesError);
  const isFetchingMore = !isInitialLoading && isValidating;

  // 5) measure row height ASAP
  useLayoutEffect(() => {
    if (!tableRef.current) return;
    const row = tableRef.current.querySelector('tr');
    if (row) {
      const h = (row as HTMLElement).getBoundingClientRect().height;
      if (h && Number.isFinite(h)) rowHeightRef.current = h;
    }
  }, [flatData.length]);

  // 6) one-off auto-bump if too short (~1.6× viewport)
  React.useEffect(() => {
    if (autoBumpDone.current) return;
    if (isInitialLoading || reachedEnd) return;
    const rowH = rowHeightRef.current || 44;
    const desired = Math.ceil((window.innerHeight / rowH) * 1.6);
    if (flatData.length < desired) {
      autoBumpDone.current = true;
      setSize(s => s + Math.max(1, PREFETCH_AHEAD)); // use PREFETCH_AHEAD
    }
  }, [flatData.length, isInitialLoading, reachedEnd, setSize]);

  // 7) sentinel-driven bump (+PREFETCH_AHEAD pages)
  const { ref: inViewRef, inView } = useInView({ rootMargin: IO_ROOT_MARGIN, triggerOnce: false });
  React.useEffect(() => {
    if (!inView) return;
    if (isInitialLoading || isFetchingMore || reachedEnd) return;
    setSize(s => s + Math.max(1, PREFETCH_AHEAD));
  }, [inView, isInitialLoading, isFetchingMore, reachedEnd, setSize]);

  // 8) keep SWR memory in check
  React.useEffect(() => {
    const MAX_PAGES_IN_MEMORY = 20;
    if (!pages) return;
    if (pages.length <= MAX_PAGES_IN_MEMORY) return;
    mutate(prev => (prev ? prev.slice(1) : prev), false);
  }, [pages, mutate]);

  // 9) errors
  if (balancesError) return <p className="text-red-500 text-center">Error: {String(balancesError)}</p>;
  if (pagesError)    return <p className="text-red-500 text-center">Error: {String(pagesError)}</p>;

  // 10) loading/empty
  if (isInitialLoading && flatData.length === 0) {
    return (
      <div className="flex justify-center items-center h-48">
        <Spinner size="lg" />
        <p className="ml-2 text-gray-700 dark:text-gray-300">Loading initial data...</p>
      </div>
    );
  }
  if (!isInitialLoading && flatData.length === 0 && reachedEnd) {
    return <p className="text-gray-500 text-center">No currency data available.</p>;
  }

  // 11) render
  const columns = [
    { key: 'symbol', label: 'Currency' },
    { key: 'code',   label: 'Code' },
    { key: 'amount', label: 'Balance' },
  ] as const;

  return (
    <div className="p-4" ref={tableRef}>
      <Table aria-label="Available Balances Table">
        <TableHeader>
          {columns.map((c) => <TableColumn key={c.key}>{c.label}</TableColumn>)}
        </TableHeader>
        <TableBody>
          {flatData.map((item) => (
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

      {/* Sentinel */}
      <div ref={inViewRef} style={{ height: 20, margin: '20px 0' }}>
        {isFetchingMore && (
          <div className="flex justify-center items-center">
            <Spinner size="sm" />
            <p className="ml-2 text-gray-700 dark:text-gray-300">Loading more...</p>
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
