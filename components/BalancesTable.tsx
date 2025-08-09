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

export default function BalancesTable() {
  const [data, setData] = useState<CombinedCurrencyData[]>([]);
  const [allBalances, setAllBalances] = useState<Balance[]>([]);
  const [error, setError] = useState<string | null>(null);

  // isLoading — only for the first list load
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  const observerTarget = useRef<HTMLDivElement>(null);

  // 1) Pull all balances (one time)
  useEffect(() => {
    let isMounted = true;

    async function fetchAllBalances() {
      try {
        const res = await fetch(
          `https://653fb0ea9e8bd3be29e10cd4.mockapi.io/api/v1/balances`,
          { cache: 'no-store' }
        );
        if (!res.ok) throw new Error('Failed to fetch all balances');
        const balances: Balance[] = await res.json();
        if (isMounted) setAllBalances(balances);
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error
              ? `Failed to load all balances: ${err.message}`
              : 'An unknown error occurred while fetching all balances'
          );
          setHasMore(false);
        }
      }
    }

    fetchAllBalances();
    return () => { isMounted = false; };
  }, []);

  // 2) We pull currencies in a paginated manner and glue them with balances
  const fetchData = useCallback(
    async (page: number, limit: number) => {
      if (error) return;
      if (allBalances.length === 0) return;

      try {
        if (page > 1) setIsFetchingMore(true);

        const currenciesRes = await fetch(
          `https://653fb0ea9e8bd3be29e10cd4.mockapi.io/api/v1/currencies?page=${page}&limit=${limit}`,
          { cache: 'no-store' }
        );
        if (!currenciesRes.ok) throw new Error('Failed to fetch currencies');

        const currencies: Currency[] = await currenciesRes.json();

        if (currencies.length === 0 && page > 1) {
          setHasMore(false);
          return;
        }

        const combinedData: CombinedCurrencyData[] = currencies.map((currency) => {
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

        if (currencies.length < limit) setHasMore(false);

        setData((prev) => {
          const newItems = combinedData.filter(
            (n) => !prev.some((p) => p.currencyId === n.currencyId)
          );
          return page === 1 ? newItems : [...prev, ...newItems];
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'An unknown error occurred';
        if (msg.includes('404')) {
          setHasMore(false);
          setError(null);
          return;
        }
        setError(msg);
        setHasMore(false);
      } finally {
        if (page === 1) setIsLoading(false);
        setIsFetchingMore(false);
      }
    },
    [allBalances, error]
  );

  // 3) First listing - when balances are ready
  useEffect(() => {
    if (allBalances.length > 0 && currentPage === 1 && isLoading) {
      fetchData(1, ITEMS_PER_PAGE);
    }
  }, [allBalances.length, currentPage, isLoading, fetchData]);

  // 4) Subsequent pages - just by currentPage
  useEffect(() => {
    if (
      allBalances.length > 0 &&
      currentPage > 1 &&
      !isFetchingMore &&
      hasMore
    ) {
      fetchData(currentPage, ITEMS_PER_PAGE);
    }
  }, [currentPage, allBalances.length, hasMore, isFetchingMore, fetchData]);

  // 5) IntersectionObserver for infinite scrolling
  useEffect(() => {
    if (!hasMore || isLoading || isFetchingMore) return;

    const observer = new IntersectionObserver(
      (entries: IntersectionObserverEntry[]) => {
        if (entries[0].isIntersecting && hasMore && !isLoading && !isFetchingMore) {
          setCurrentPage((p) => p + 1);
        }
      },
      { rootMargin: '200px' }
    );

    const el = observerTarget.current;
    if (el) observer.observe(el);
    return () => { if (el) observer.unobserve(el); };
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
    <div className="p-4">
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
