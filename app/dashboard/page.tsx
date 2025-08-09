import type { Currency, Balance, CombinedCurrencyData } from '@/types';

import { cookies } from 'next/headers';
import { Link } from '@heroui/link';

import { endpointCurrencies, endpointBalances } from '@/config/site';

async function getTopBalancesForDashboard(): Promise<CombinedCurrencyData[]> {
  try {
    const currenciesRes = await fetch(endpointCurrencies, { cache: 'no-store' });

    if (!currenciesRes.ok) throw new Error('Failed to fetch currencies');
    const currencies: Currency[] = await currenciesRes.json();

    const balancesRes = await fetch(endpointBalances, {
      cache: 'no-store',
    });

    if (!balancesRes.ok) throw new Error('Failed to fetch balances');
    const balances: Balance[] = await balancesRes.json();

    const combinedData: CombinedCurrencyData[] = currencies.map((currency) => {
      const matchingBalance = balances.find(
        (b) => String(b.currency_id) === currency.id && b.amount,
      );

      return {
        currencyId: currency.id,
        symbol: currency.symbol,
        code: currency.code,
        amount: matchingBalance?.amount || null,
      };
    });

    const topBalances = combinedData
      .filter((item) => item.amount && parseFloat(item.amount) > 0)
      .sort((a, b) => (parseFloat(b.amount || '0') || 0) - (parseFloat(a.amount || '0') || 0))
      .slice(0, 3);

    return topBalances;
  } catch (err) {
    console.error('Error fetching top balances for dashboard:', err);

    return [];
  }
}

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const userType = cookieStore.get('userType')?.value || 'Unknown';

  const topBalances = await getTopBalancesForDashboard();

  return (
    <div className="p-4">
      <h1>Dashboard</h1>
      <p className="mb-8 text-lg text-gray-700 dark:text-gray-300">
        Welcome, You are logged in as a <span className="font-semibold capitalize">{userType}</span>
        .
      </p>

      {topBalances.length > 0 ? (
        <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-md dark:bg-gray-800">
          <h2 className="mb-4 text-2xl font-semibold text-gray-900 dark:text-gray-100">
            Your Top Balances
          </h2>
          <ul className="space-y-2">
            {topBalances.map((item) => (
              <li
                key={item.currencyId}
                className="flex items-center justify-between text-gray-700 dark:text-gray-300"
              >
                <span className="font-medium">
                  {item.symbol} ({item.code})
                </span>
                <span className="font-bold">{item.amount || 'N/A'}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            Navigate to the <Link href="/balances">Balances</Link> section for your full currency
            list.
          </p>
        </div>
      ) : (
        <div className="w-full max-w-lg rounded-lg bg-white p-6 text-center shadow-md dark:bg-gray-800">
          <p className="text-gray-500 dark:text-gray-400">No significant balances to display.</p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Go to the Balances section to see all currencies.
          </p>
        </div>
      )}
    </div>
  );
}
