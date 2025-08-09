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
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchAllBalances() {
      try {
        const balancesRes = await fetch(`https://653fb0ea9e8bd3be29e10cd4.mockapi.io/api/v1/balances`, { cache: 'no-store' });
        if (!balancesRes.ok) throw new Error('Failed to fetch all balances');
        const balances: Balance[] = await balancesRes.json();
        setAllBalances(balances);
        setIsLoading(false);
        //console.log('balances', balances);
      } catch (err) {
        if (err instanceof Error) {
          setError(`Failed to load all balances: ${err.message}`);
        } else {
          setError('An unknown error occurred while fetching all balances');
        }
        setHasMore(false);
      }
    }
    fetchAllBalances();
  }, []);

  const fetchData = useCallback(async (page: number, limit: number) => {
    console.log('fetchData', {page, limit});
    
    if (error || allBalances.length === 0 && page === 1) return;
    console.log('passed');
    if (page === 1) {
      setIsLoading(true);
      setData([]);
    } else {
      setIsFetchingMore(true);
    }
    setError(null);

    try {
      
      const currenciesRes = await fetch(`https://653fb0ea9e8bd3be29e10cd4.mockapi.io/api/v1/currencies?page=${page}&limit=${limit}`, { cache: 'no-store' });
      //console.log('currenciesRes', currenciesRes);
      if (!currenciesRes.ok) throw new Error('Failed to fetch currencies');
      const currencies: Currency[] = await currenciesRes.json();
      /*********************************************************/
      console.log('currencies', {isLoading, page, limit, currencies});

      if (currencies.length === 0 && page > 1) { 
         setHasMore(false);
         return; 
      }

      const combinedData: CombinedCurrencyData[] = currencies.map(currency => {
        const matchingBalance = allBalances.find(b => String(b.currency_id) === currency.id && b.amount);
        return {
          currencyId: currency.id,
          symbol: currency.symbol,
          code: currency.code,
          amount: matchingBalance?.amount || null,
        };
      });

      if (currencies.length < limit) { 
        setHasMore(false);
      }

      setData(prevData => {
        const newData = combinedData.filter(newItem => !prevData.some(existingItem => existingItem.currencyId === newItem.currencyId));
        return [...prevData, ...newData];
      });

    } catch (err) {
      if (err instanceof Error) {
        
        if (err.message.includes('404')) {
          setHasMore(false);
          setError(null);
          return;
        }
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
      setHasMore(false);
    } finally {
      setIsLoading(false);
      setIsFetchingMore(false);
    }
  }, [allBalances, error]);

  useEffect(() => {
    console.log('useEffect', {allBalances, currentPage, data, isLoading});
    if (allBalances.length > 0 && !isLoading) {
      fetchData(currentPage, ITEMS_PER_PAGE);
    }
    
  }, [allBalances, currentPage, data.length, isLoading, fetchData]);

  useEffect(() => {
    if (!hasMore || isLoading || isFetchingMore) return;

    const observer = new IntersectionObserver((entries: IntersectionObserverEntry[]) => {
      if (entries[0].isIntersecting && hasMore && !isLoading && !isFetchingMore) {
        setCurrentPage(prevPage => prevPage + 1);
      }
    }, {
      rootMargin: '200px',
    });

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [hasMore, isLoading, isFetchingMore]);

  const columns = [
    { key: 'symbol', label: 'Currency' },
    { key: 'code', label: 'Code' },
    { key: 'amount', label: 'Balance' },
  ];

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
            <TableRow
              key={item.currencyId}
              
              // onClick={() => router.push(`/currencies/${item.currencyId}`)}
            >
              {(columnKey) => (
                <TableCell>
                  {columnKey === 'amount' ? (item.amount || 'N/A') : item[columnKey as keyof CombinedCurrencyData]}
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
          <p className="text-center text-gray-500 dark:text-gray-400">You've reached the end of the list.</p>
        )}
        {data.length === 0 && !hasMore && !error && !isLoading && (
          <p className="text-center text-gray-500 dark:text-gray-400">No balances found.</p>
        )}
      </div>
    </div>
  );
}