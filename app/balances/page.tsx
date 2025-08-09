'use client';

import React, { useState, useEffect } from 'react';
import { Kbd } from '@heroui/kbd';
import { Input } from '@heroui/input';

import BalancesTable from '@/components/BalancesTable';
import { SearchIcon } from '@/components/icons';

export default function Balances() {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  // Debounce effect for search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
  };

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
      placeholder="Search by symbol or code..."
      startContent={
        <SearchIcon className="text-default-400 pointer-events-none flex-shrink-0 text-base" />
      }
      type="search"
      value={searchQuery}
      onValueChange={handleSearchChange}
    />
  );

  return (
    <div className="px-4">
      <div className="mb-4 flex flex-wrap justify-between gap-3 md:mb-0 md:flex-nowrap">
        <h1 className="inline-block text-3xl font-bold">Your Balances</h1>
        <div className="max-w-[20rem]">{searchInput}</div>
      </div>
      <BalancesTable debouncedSearchQuery={debouncedSearchQuery} />
    </div>
  );
}
