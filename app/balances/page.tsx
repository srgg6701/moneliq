import { Kbd } from '@heroui/kbd';
import { Input } from '@heroui/input';

import BalancesTable from '@/components/BalancesTable';
import { SearchIcon } from '@/components/icons';

export default function Balances() {
  const searchInput = (
    <Input
      aria-label="Search"
      classNames={{
        inputWrapper: 'bg-default-100',
        input: 'text-sm',
      }}
      endContent={
        <Kbd className="hidden lg:inline-block" keys={['command']}>
          K
        </Kbd>
      }
      labelPlacement="outside"
      placeholder="Search..."
      startContent={
        <SearchIcon className="text-default-400 pointer-events-none flex-shrink-0 text-base" />
      }
      type="search"
    />
  );

  return (
    <div className="p-4">
      <div className="mb-4 flex flex-wrap justify-between gap-3 md:mb-0 md:flex-nowrap">
        <h1 className="inline-block">Balances</h1>
        <div className="max-w-[20rem]">{searchInput}</div>
      </div>
      <BalancesTable />
    </div>
  );
}
