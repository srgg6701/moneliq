'use client';

import { useState, useEffect } from 'react';
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from '@heroui/table';

interface Currency {
  id: string;
  name: string;
  symbol: string;
  code: string;
}

interface Balance {
  id: string;
  currencyId: string;
  balance: number;
}

interface CombinedCurrencyData {
  currencyId: string;
  name: string;
  symbol: string;
  code: string;
  balance: number | null;
}

export default function Currencies () {
  const [data, setData] = useState<CombinedCurrencyData[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      
      setError(null);
      try {
        const currenciesRes = await fetch('https://653fb0ea9e8bd3be29e10cd4.mockapi.io/api/v1/currencies');
        if (!currenciesRes.ok) throw new Error('Failed to fetch currencies');
        const currencies: Currency[] = await currenciesRes.json();

        const balancesRes = await fetch('https://653fb0ea9e8bd3be29e10cd4.mockapi.io/api/v1/balances');
        if (!balancesRes.ok) throw new Error('Failed to fetch balances');
        const balances: Balance[] = await balancesRes.json();

        const combinedData: CombinedCurrencyData[] = currencies.map(currency => {
          const matchingBalance = balances.find(b => b.currencyId === currency.id);
          return {
            currencyId: currency.id,
            name: currency.name,
            symbol: currency.symbol,
            code: currency.code,
            balance: matchingBalance ? matchingBalance.balance : null,
          };
        });

        setData(combinedData);

      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('An unknown error occurred');
        }
      }

    }

    fetchData();
  }, []);

  const columns = [
    { key: 'name', label: 'Currency Name' },
    { key: 'symbol', label: 'Symbol' },
    { key: 'code', label: 'Code' },
    { key: 'balance', label: 'Balance' },
  ];

  if (error) {
    return <p className="text-red-500 text-center">Error: {error}</p>;
  }

  // Если данных еще нет, это означает, что они загружаются.
  // В этом случае, Suspense будет ловить компонент выше.
  // Однако, если у нас есть данные, мы их отображаем.
  // Это клиентский компонент, и Suspense не будет работать в нем самом,
  // а только в родительском Server Component, который его импортирует.
  if (data.length === 0 && !error) {
    // В идеале, сюда мы не должны попасть, если Suspense работает корректно.
    // Это запасной вариант или если данные пустые.
    return <p className="text-gray-500 text-center">No data available.</p>;
  }


  return (
    <div className="mt-8">
      <h2>Currency Balances</h2>
      <Table aria-label="Currency Balances Table">
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
                  {columnKey === 'balance' ? (item.balance !== null ? item.balance.toFixed(2) : 'N/A') : item[columnKey as keyof CombinedCurrencyData]}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}