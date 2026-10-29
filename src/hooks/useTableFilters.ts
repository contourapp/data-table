'use client';

import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react';

import {
  DEFAULT_FILTER_CONNECTOR,
  type FilterConnector,
  type TableFilter,
  type TableGraphQLFilter,
  convertTableFiltersToGraphQL,
} from '../filterHelpers.js';
import {
  setSearchParamsFromFilterConnector,
  setSearchParamsFromTableFilters,
  deriveFilterConnectorFromSearchParams,
  deriveTableFiltersFromSearchParams,
} from '../tableHelpers.js';

/**
 * Custom hook for managing table filters with search params synchronization
 *
 * Automatically manages table filter state and synchronizes it with URL search parameters.
 * When table filters change, the URL is updated to preserve filter state across page navigation.
 *
 * @param searchParams - Search params the page was rendered with
 * @param baseFilters - Always-included base filters that will be combined with table filters
 */
export function useTableFilters<T = TableGraphQLFilter>(
  searchParams: Record<string, string | string[] | undefined> | undefined,
  baseFilters?: T[],
) {
  const [tableFilters, setTableFiltersState] = useState<TableFilter[]>(
    searchParams ? deriveTableFiltersFromSearchParams(searchParams) : [],
  );
  const [filterConnector, setFilterConnectorState] = useState<FilterConnector>(
    searchParams
      ? deriveFilterConnectorFromSearchParams(searchParams)
      : DEFAULT_FILTER_CONNECTOR,
  );
  // The derived `filter` commonly feeds a suspense-enabled query's variables;
  // updating it outside a transition re-suspends the page into its fallback.
  const [, startTransition] = useTransition();
  const setTableFilters = useCallback<Dispatch<SetStateAction<TableFilter[]>>>(
    (action) => startTransition(() => setTableFiltersState(action)),
    [startTransition],
  );
  const setFilterConnector = useCallback(
    (connector: FilterConnector) =>
      startTransition(() => setFilterConnectorState(connector)),
    [startTransition],
  );

  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (typeof window === 'undefined') return;
    const urlSearchParams = new URLSearchParams(window.location.search);
    setSearchParamsFromTableFilters(tableFilters, urlSearchParams);
    setSearchParamsFromFilterConnector(filterConnector, urlSearchParams);
    window.history.replaceState(null, '', `?${urlSearchParams.toString()}`);
  }, [tableFilters, filterConnector]);

  // Memoized so the returned `filter` keeps a stable identity across renders.
  // Callers pass it straight into query variables; a fresh object every render
  // makes a suspense query re-suspend in a loop (notably when an always-on
  // base filter means `filter` is never undefined).
  const filter = useMemo(() => {
    const graphQLFilters = convertTableFiltersToGraphQL<T>(tableFilters);
    // `or` wraps only the user's own filters. Base filters scope the query —
    // to an organization, a tenant — so folding them into the same `or` would
    // widen the result instead of narrowing it. They stay ANDed regardless of
    // what the user picks. One filter needs no wrapper either way.
    const userFilters =
      filterConnector === 'or' && graphQLFilters.length > 1
        ? // SAFETY: `or` is part of the recursive filter input the caller pairs T with.
          [{ or: graphQLFilters } as T]
        : graphQLFilters;
    const allFilters = baseFilters
      ? [...baseFilters, ...userFilters]
      : userFilters;
    return allFilters.length > 0 ? { and: allFilters } : undefined;
  }, [tableFilters, filterConnector, baseFilters]);

  return {
    tableFilters,
    setTableFilters,
    filterConnector,
    setFilterConnector,
    filter,
  };
}
