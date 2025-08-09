'use client';

import { useState, useEffect } from 'react';
import { Kbd } from '@heroui/kbd';
import { Input } from '@heroui/input';
// <-- CHANGED: Import Select and SelectItem from @heroui/select
import { Select, SelectItem } from '@heroui/select';

import BalancesTable from '@/components/BalancesTable';
import { SearchIcon } from '@/components/icons';

// --- Компонент страницы Balances ---
export default function Balances() {
  // State for search functionality
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  // State for sorting functionality <-- ADDED: useState for sortBy and sortOrder
  const [sortBy, setSortBy] = useState('symbol'); // Default sort by 'symbol'
  const [sortOrder, setSortOrder] = useState('asc'); // Default sort order 'asc'

  // Debounce effect for search query (runs after 500ms of no input)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500); // 500ms delay

    return () => {
      clearTimeout(handler); // Clear timeout if search query changes before delay
    };
  }, [searchQuery]); // Effect depends on the raw search query

  // Handler for search input changes
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
  };

  // Data for "Sort By" Select component
  const sortOptions = [
    { key: 'symbol', label: 'Currency' },
    { key: 'code', label: 'Code' },
  ];

  // Data for "Order" Select component
  const orderOptions = [
    { key: 'asc', label: 'ASC' },
    { key: 'desc', label: 'DESC' },
  ];

  // Render search input component
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
      {/* Container for title, search, and sort controls */}
      <div className="mb-4 flex flex-col justify-between gap-3 md:mb-0 md:flex-row md:items-end">
        <h1 className="inline-block text-3xl font-bold">Your Balances</h1>
        <div className="flex w-full max-w-[40rem] gap-3 md:w-auto">
          <div className="flex-grow">{searchInput}</div>
        </div>
        <div className="flex gap-4">
          {/* Select component for "Sort By" field */}
          <Select
            className="min-w-[120px]"
            label="Sort By"
            placeholder="Select field"
            selectedKeys={[sortBy]} // HeroUI Select expects selectedKeys as array
            onSelectionChange={(keys) => {
              // HeroUI onSelectionChange provides Set<string | number>
              const selectedKey = Array.from(keys)[0] as string;

              if (selectedKey) setSortBy(selectedKey);
            }}
          >
            {/* Render items from sortOptions array */}
            {sortOptions.map((option) => (
              <SelectItem key={option.key}>{option.label}</SelectItem>
            ))}
          </Select>

          {/* Select component for "Order" (ASC/DESC) */}
          <Select
            className="min-w-[100px]"
            label="Order"
            placeholder="Select order"
            selectedKeys={[sortOrder]}
            onSelectionChange={(keys) => {
              const selectedKey = Array.from(keys)[0] as string;

              if (selectedKey) setSortOrder(selectedKey);
            }}
          >
            {/* Render items from orderOptions array */}
            {orderOptions.map((option) => (
              <SelectItem key={option.key}>{option.label}</SelectItem>
            ))}
          </Select>
        </div>
      </div>

      {/* BalancesTable component receives search and sort props */}
      <BalancesTable
        debouncedSearchQuery={debouncedSearchQuery}
        sortBy={sortBy}
        sortOrder={sortOrder}
      />
    </div>
  );
}
