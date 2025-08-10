import type { Currency, Balance, CombinedCurrencyData } from '@/types';

import { notFound } from 'next/navigation';

import { endpointCurrencies, endpointBalances } from '@/config/site';

type PageProps = {
  params: {
    currencyId: string;
  };
};

async function getCurrencyDetails(id: string): Promise<CombinedCurrencyData | null> {
  try {
    const numericId = Number(id);
    const currencyRes = await fetch(`${endpointCurrencies}${numericId}`, { cache: 'no-store' });

    if (!currencyRes.ok) {
      if (currencyRes.status === 404) return null;
      throw new Error(
        `Failed to fetch currency details: ${currencyRes.statusText || 'Unknown Error'}`,
      );
    }
    const currency: Currency = await currencyRes.json();

    // Fetch all balances and find the matching one
    const balancesRes = await fetch(endpointBalances, { cache: 'no-store' });

    if (!balancesRes.ok) throw new Error('Failed to fetch balances for details');
    const allBalances: Balance[] = await balancesRes.json();
    const matchingBalance = allBalances.find(
      (b) => String(b.currency_id) === currency.id && b.amount,
    );

    return {
      currencyId: currency.id,
      symbol: currency.symbol,
      code: currency.code,
      amount: matchingBalance?.amount || null,
      // Add other details if available from currency object
    };
  } catch (error) {
    console.error(`Error fetching details for currency ${id}:`, error);

    return null;
  }
}

// Dynamic Page Component
export default async function CurrencyDetailPage({ params }: PageProps) {
  const { currencyId } = params;

  // Fetch details on the server
  const currencyDetails = await getCurrencyDetails(currencyId);

  if (!currencyDetails) {
    notFound();
  }

  return (
    <div className="flex flex-col justify-center px-4">
      <h1 className="mb-6 text-4xl font-bold text-gray-900 dark:text-gray-100">Currency Details</h1>
      <div className="w-full max-w-md rounded-lg bg-white p-8 text-gray-900 shadow-xl dark:bg-gray-800 dark:text-gray-100">
        <p className="mb-2 text-xl font-semibold">
          <span className="text-gray-600 dark:text-gray-400">Symbol:</span> {currencyDetails.symbol}
        </p>
        <p className="mb-4 text-xl font-semibold">
          <span className="text-gray-600 dark:text-gray-400">Code:</span> {currencyDetails.code}
        </p>
        <div className="mt-4 border-t border-gray-200 pt-4 dark:border-gray-700">
          <p className="text-lg">
            <span className="text-gray-600 dark:text-gray-400">Balance:</span>{' '}
            <span className="font-bold">{currencyDetails.amount || 'N/A'}</span>
          </p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            (This balance is from the global balances list)
          </p>
        </div>
      </div>
    </div>
  );
}
