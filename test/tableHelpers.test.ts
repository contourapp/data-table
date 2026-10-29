import { describe, expect, it } from 'vitest';

import {
  deriveSortingFromSearchParams,
  deriveTableFiltersFromSearchParams,
  hasMoreRows,
  setSearchParamsFromSorting,
  setSearchParamsFromTableFilters,
} from '../src/index.js';
import type { TableFilter } from '../src/index.js';

describe('hasMoreRows', () => {
  it('reports more rows when fewer than total are loaded', () => {
    expect(hasMoreRows(20, 100)).toBe(true);
  });

  it('reports more rows when exactly one row remains', () => {
    expect(hasMoreRows(20, 21)).toBe(true);
  });

  it('reports no more rows once all are loaded', () => {
    expect(hasMoreRows(21, 21)).toBe(false);
  });

  it('assumes more rows when total is unknown', () => {
    expect(hasMoreRows(20, undefined)).toBe(true);
    expect(hasMoreRows(20, 0)).toBe(true);
  });
});

describe('filter search param round trip', () => {
  const filters: TableFilter[] = [
    {
      id: 'f-1',
      columnId: 'dimension_value_name',
      operator: 'contains',
      value: 'Ada',
      columnType: 'text',
      field: 'name',
    },
  ];

  it('preserves the resolved field across a serialize/parse cycle', () => {
    const params = new URLSearchParams();
    setSearchParamsFromTableFilters(filters, params);

    expect(
      deriveTableFiltersFromSearchParams({
        tableFilters: params.get('tableFilters') ?? undefined,
      }),
    ).toEqual(filters);
  });

  it('drops the param once the last filter is removed', () => {
    const params = new URLSearchParams();
    setSearchParamsFromTableFilters(filters, params);
    setSearchParamsFromTableFilters([], params);

    expect(params.has('tableFilters')).toBe(false);
  });
});

describe('sorting search param round trip', () => {
  it('reads back what it wrote', () => {
    const params = new URLSearchParams();
    setSearchParamsFromSorting([{ id: 'name', desc: true }], params);

    expect(deriveSortingFromSearchParams(params)).toEqual([
      { id: 'name', desc: true },
    ]);
  });

  it('returns undefined when the param is absent', () => {
    expect(deriveSortingFromSearchParams(new URLSearchParams())).toBeUndefined();
  });
});
