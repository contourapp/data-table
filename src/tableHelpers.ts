import type { SortingState } from '@tanstack/react-table';
import { z } from 'zod';

import {
  DEFAULT_FILTER_CONNECTOR,
  parseFilterConnector,
  tableFilterSchema,
  type FilterConnector,
  type TableFilter,
} from './filterHelpers.js';

const sortingSchema = z.array(z.object({ id: z.string(), desc: z.boolean() }));

const TABLE_FILTERS_KEY = 'tableFilters';
const FILTER_CONNECTOR_KEY = 'tableFiltersConnector';
const SORTING_KEY = 'order_by';

/** Search param keys the filter and sorting hooks read and write. */
export const SEARCH_PARAM_KEYS = {
  filters: TABLE_FILTERS_KEY,
  filterConnector: FILTER_CONNECTOR_KEY,
  sorting: SORTING_KEY,
} as const;

// When totalRowCount is unknown (undefined or 0), assume more rows exist;
// the caller's data-length guard prevents fetching an empty table.
export const hasMoreRows = (
  loadedCount: number,
  totalRowCount?: number,
): boolean => (totalRowCount ? loadedCount < totalRowCount : true);

export const setSearchParamsFromSorting = (
  sorting: SortingState,
  searchParams: URLSearchParams,
): void => {
  if (sorting.length > 0) {
    searchParams.set(SORTING_KEY, JSON.stringify(sorting));
  } else {
    searchParams.delete(SORTING_KEY);
  }
};

export const deriveSortingFromSearchParams = (
  searchParams: URLSearchParams | Record<string, string | string[] | undefined>,
): SortingState | undefined => {
  const orderBy =
    searchParams instanceof URLSearchParams
      ? searchParams.get(SORTING_KEY)
      : searchParams[SORTING_KEY];
  if (!orderBy || Array.isArray(orderBy)) {
    return undefined;
  }

  return sortingSchema.parse(JSON.parse(orderBy));
};

export const setSearchParamsFromTableFilters = (
  tableFilters: TableFilter[],
  searchParams: URLSearchParams,
): void => {
  if (tableFilters.length > 0) {
    searchParams.set(TABLE_FILTERS_KEY, JSON.stringify(tableFilters));
  } else {
    searchParams.delete(TABLE_FILTERS_KEY);
  }
};

export const deriveTableFiltersFromSearchParams = (
  searchParams: Record<string, string | string[] | undefined>,
): TableFilter[] => {
  const params = searchParams[TABLE_FILTERS_KEY];
  if (!params || Array.isArray(params)) {
    return [];
  }
  return tableFilterSchema.array().parse(JSON.parse(params));
};

/**
 * The connector rides in its own param rather than inside `tableFilters`, so
 * links already written against the plain filter array keep working.
 */
export const setSearchParamsFromFilterConnector = (
  connector: FilterConnector,
  searchParams: URLSearchParams,
): void => {
  if (connector === DEFAULT_FILTER_CONNECTOR) {
    searchParams.delete(FILTER_CONNECTOR_KEY);
  } else {
    searchParams.set(FILTER_CONNECTOR_KEY, connector);
  }
};

export const deriveFilterConnectorFromSearchParams = (
  searchParams: Record<string, string | string[] | undefined>,
): FilterConnector => parseFilterConnector(searchParams[FILTER_CONNECTOR_KEY]);
