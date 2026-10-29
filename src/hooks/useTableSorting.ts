'use client';

import type { OnChangeFn, SortingState } from '@tanstack/react-table';
import { useCallback, useEffect, useState, useTransition } from 'react';

import type { DataTableColumnDef } from '../DataTable.js';
import { deriveTableFieldMappingFromColumns } from '../filterHelpers.js';
import {
  setSearchParamsFromSorting,
  deriveSortingFromSearchParams,
} from '../tableHelpers.js';

/** Direction of a single `orderBy` entry. */
export type OrderByDirection = 'ASC' | 'DESC';

/**
 * Custom hook for managing sorting state with search params synchronization
 *
 * Automatically manages sorting state and synchronizes it with URL search parameters.
 * When sorting changes, the URL is updated to preserve sorting state across page navigation.
 * Configuration is automatically derived from column definitions.
 *
 * @param searchParams - Search params the page was rendered with
 * @param columns - Column definitions to derive sorting config from
 * @param defaultSort - Default sorting configuration
 */
export function useTableSorting<TData extends object>(
  searchParams: Record<string, string | string[] | undefined> | undefined,
  columns: DataTableColumnDef<TData>[],
  defaultSort?: { id: string; desc: boolean },
) {
  const [sorting, setSortingState] = useState<SortingState>(() => {
    if (searchParams) {
      const sortingFromParams = deriveSortingFromSearchParams(searchParams);
      if (sortingFromParams && sortingFromParams.length > 0) {
        return sortingFromParams;
      }
    }

    return defaultSort ? [defaultSort] : [];
  });
  // The derived `orderBy` commonly feeds a suspense-enabled query's variables;
  // updating it outside a transition re-suspends the page into its fallback.
  const [, startTransition] = useTransition();
  const setSorting = useCallback<OnChangeFn<SortingState>>(
    (updater) => startTransition(() => setSortingState(updater)),
    [startTransition],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlSearchParams = new URLSearchParams(window.location.search);
    setSearchParamsFromSorting(sorting, urlSearchParams);
    window.history.replaceState(null, '', `?${urlSearchParams.toString()}`);
  }, [sorting]);

  const mappingConfig = deriveTableFieldMappingFromColumns(columns);

  const orderBy = sorting.flatMap((sort) => {
    const config = mappingConfig[sort.id];
    if (!config || config.enableSorting === false || !config.field) return [];

    const direction: OrderByDirection = sort.desc ? 'DESC' : 'ASC';

    return [
      {
        [config.field]: direction,
      },
    ];
  });

  return {
    sorting,
    orderBy,
    setSorting,
  };
}
