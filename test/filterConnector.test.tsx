import { act, fireEvent, renderHook, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  TableFilters,
  deriveFilterConnectorFromSearchParams,
  setSearchParamsFromFilterConnector,
  useTableFilters,
  type DataTableColumnDef,
  type TableFilter,
} from '../src/index.js';
import { renderWithMantine } from './renderWithMantine.js';

interface Row {
  id: string;
}

const columns: DataTableColumnDef<Row>[] = [
  { id: 'name', accessorKey: 'name', header: 'Name' },
  { id: 'status', accessorKey: 'status', header: 'Status' },
];

const filterOn = (columnId: string, value: string): TableFilter => ({
  id: `f-${columnId}`,
  columnId,
  operator: 'contains',
  value,
  columnType: 'text',
  field: columnId,
});

const twoFilters = [filterOn('name', 'ada'), filterOn('status', 'open')];

describe('filter connector in the toolbar', () => {
  const renderBar = (
    filters: TableFilter[],
    props: Partial<Parameters<typeof TableFilters<Row>>[0]> = {},
  ) =>
    renderWithMantine(
      <TableFilters
        columns={columns}
        filters={filters}
        onFiltersChange={vi.fn()}
        {...props}
      />,
    );

  const connectors = () =>
    screen.queryAllByRole('button', { name: /Filters are joined with/ });

  it('joins two filters with a connector', () => {
    renderBar(twoFilters, { connector: 'and', onConnectorChange: vi.fn() });

    expect(connectors()).toHaveLength(1);
    expect(connectors()[0]).toHaveTextContent('and');
  });

  it('shows one fewer connector than filters', () => {
    renderBar([...twoFilters, filterOn('other', 'x')], {
      connector: 'and',
      onConnectorChange: vi.fn(),
    });

    expect(connectors()).toHaveLength(2);
  });

  it('shows no connector for a single filter, which joins nothing', () => {
    renderBar([filterOn('name', 'ada')], {
      connector: 'and',
      onConnectorChange: vi.fn(),
    });

    expect(connectors()).toHaveLength(0);
  });

  it('stays hidden when the host does not handle connector changes', () => {
    renderBar(twoFilters);

    expect(connectors()).toHaveLength(0);
  });

  it('flips the whole bar from one connector, not just that gap', () => {
    const onConnectorChange = vi.fn();
    renderBar([...twoFilters, filterOn('other', 'x')], {
      connector: 'and',
      onConnectorChange,
    });

    fireEvent.click(connectors()[1]);

    expect(onConnectorChange).toHaveBeenCalledExactlyOnceWith('or');
  });

  it('flips back to and', () => {
    const onConnectorChange = vi.fn();
    renderBar(twoFilters, { connector: 'or', onConnectorChange });

    fireEvent.click(connectors()[0]);

    expect(onConnectorChange).toHaveBeenCalledWith('and');
  });

  it('resets the connector when everything is cleared', () => {
    const onConnectorChange = vi.fn();
    renderBar(twoFilters, { connector: 'or', onConnectorChange });

    fireEvent.click(screen.getByRole('button', { name: 'Clear all' }));

    expect(onConnectorChange).toHaveBeenCalledWith('and');
  });
});

describe('connector search param', () => {
  it('omits the default rather than writing it out', () => {
    const params = new URLSearchParams();
    setSearchParamsFromFilterConnector('and', params);

    expect(params.has('tableFiltersConnector')).toBe(false);
  });

  it('round-trips or', () => {
    const params = new URLSearchParams();
    setSearchParamsFromFilterConnector('or', params);

    expect(
      deriveFilterConnectorFromSearchParams({
        tableFiltersConnector: params.get('tableFiltersConnector') ?? undefined,
      }),
    ).toBe('or');
  });

  it('clears a stale or when switching back', () => {
    const params = new URLSearchParams();
    setSearchParamsFromFilterConnector('or', params);
    setSearchParamsFromFilterConnector('and', params);

    expect(params.has('tableFiltersConnector')).toBe(false);
  });

  it('falls back to and on a value it does not recognise', () => {
    expect(
      deriveFilterConnectorFromSearchParams({ tableFiltersConnector: 'xor' }),
    ).toBe('and');
  });
});

describe('useTableFilters connector', () => {
  const searchParams = {
    tableFilters: JSON.stringify(twoFilters),
  };

  it('ands filters by default', () => {
    const { result } = renderHook(() => useTableFilters(searchParams));

    expect(result.current.filter).toEqual({
      and: [
        { name: { ilike: 'ada' }, and: undefined, or: undefined },
        { status: { ilike: 'open' }, and: undefined, or: undefined },
      ],
    });
  });

  it('wraps the user’s filters in or when asked', () => {
    const { result } = renderHook(() => useTableFilters(searchParams));

    act(() => result.current.setFilterConnector('or'));

    expect(result.current.filter).toEqual({
      and: [
        {
          or: [
            { name: { ilike: 'ada' }, and: undefined, or: undefined },
            { status: { ilike: 'open' }, and: undefined, or: undefined },
          ],
        },
      ],
    });
  });

  it('keeps base filters ANDed, so or widens nothing it should not', () => {
    const baseFilters = [{ organizationId: { eq: 'org-1' } }];
    const { result } = renderHook(() =>
      useTableFilters(searchParams, baseFilters),
    );

    act(() => result.current.setFilterConnector('or'));

    const filter = result.current.filter;
    expect(filter?.and[0]).toEqual({ organizationId: { eq: 'org-1' } });
    expect(filter?.and).toHaveLength(2);
    expect(filter?.and[1]).toHaveProperty('or');
  });

  it('leaves a lone filter unwrapped, where or means nothing', () => {
    const { result } = renderHook(() =>
      useTableFilters({ tableFilters: JSON.stringify([filterOn('name', 'ada')]) }),
    );

    act(() => result.current.setFilterConnector('or'));

    expect(result.current.filter).toEqual({
      and: [{ name: { ilike: 'ada' }, and: undefined, or: undefined }],
    });
  });

  it('reads the connector off the url', () => {
    const { result } = renderHook(() =>
      useTableFilters({ ...searchParams, tableFiltersConnector: 'or' }),
    );

    expect(result.current.filterConnector).toBe('or');
    expect(result.current.filter?.and[0]).toHaveProperty('or');
  });
});
