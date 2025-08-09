import { Suspense } from 'react';
import { Spinner } from '@heroui/spinner';

import CurrenciesTable from '@/components/CurrenciesTable';

export default function CurrenciesPage() {
  return (
    <div className="p-4">
      <h1>Currencies</h1>
      <Suspense
        fallback={
          <div className="mx-auto flex w-fit items-center justify-center bg-white p-4">
            <Spinner size="lg" />
            <p className="ml-2 text-gray-700 dark:text-gray-300">Loading currencies...</p>
          </div>
        }
      >
        <CurrenciesTable />
      </Suspense>
    </div>
  );
}
