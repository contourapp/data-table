import {
  functionalUpdate,
  type OnChangeFn,
  type SortingState,
} from '@tanstack/react-table';
import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  DataTable,
  type DataTableColumnDef,
  type TableFilter,
} from '../src/index.js';
import { renderWithMantine } from './renderWithMantine.js';

interface Invoice {
  id: string;
  number: string;
  amount: number;
}

const columns: DataTableColumnDef<Invoice>[] = [
  { id: 'number', accessorKey: 'number', header: 'Invoice' },
  {
    id: 'amount',
    accessorKey: 'amount',
    header: 'Amount',
    enableColumnFilter: false,
  },
  { id: 'actions', header: 'Actions', enableSorting: false },
];

const data: Invoice[] = [{ id: '1', number: 'INV-1', amount: 10 }];

const renderTable = (
  props: Partial<Parameters<typeof DataTable<Invoice>>[0]> = {},
) =>
  renderWithMantine(
      <DataTable dataType="invoices" columns={columns} data={data} {...props} />,
  );

const openColumnMenu = async (columnId: string) => {
  fireEvent.click(screen.getByRole('button', { name: `Options for ${columnId}` }));
  await screen.findAllByRole('menuitem');
};

const clickMenuItem = (label: string) => {
  const item = screen
    .getAllByRole('menuitem')
    .find((candidate) => candidate.textContent === label);
  if (!item) throw new Error(`no menu item labelled ${label}`);
  fireEvent.click(item);
};

describe('column header menu', () => {
  it('sorts ascending from the header menu', async () => {
    const onSortingChange = vi.fn<OnChangeFn<SortingState>>();
    renderTable({ sorting: [], onSortingChange });

    await openColumnMenu('number');
    clickMenuItem('Ascending');

    expect(functionalUpdate(onSortingChange.mock.calls[0][0], [])).toEqual([
      { id: 'number', desc: false },
    ]);
  });

  it('sorts descending from the header menu', async () => {
    const onSortingChange = vi.fn<OnChangeFn<SortingState>>();
    renderTable({ sorting: [], onSortingChange });

    await openColumnMenu('number');
    clickMenuItem('Descending');

    expect(functionalUpdate(onSortingChange.mock.calls[0][0], [])).toEqual([
      { id: 'number', desc: true },
    ]);
  });

  it('offers to clear only a sort that is applied', async () => {
    const onSortingChange = vi.fn<OnChangeFn<SortingState>>();
    const { unmount } = renderTable({ sorting: [], onSortingChange });

    await openColumnMenu('number');
    expect(
      screen.queryAllByRole('menuitem').map((item) => item.textContent),
    ).not.toContain('Clear sort');
    unmount();

    renderTable({ sorting: [{ id: 'number', desc: false }], onSortingChange });
    await openColumnMenu('number');
    clickMenuItem('Clear sort');

    expect(
      functionalUpdate(onSortingChange.mock.calls.at(-1)![0], [
        { id: 'number', desc: false },
      ]),
    ).toEqual([]);
  });

  it('adds a filter for its column when filter state is wired up', async () => {
    const onTableFiltersChange = vi.fn<(next: TableFilter[]) => void>();
    renderTable({ tableFilters: [], onTableFiltersChange });

    await openColumnMenu('number');
    clickMenuItem('Add filter');

    expect(onTableFiltersChange.mock.calls[0][0][0]).toMatchObject({
      columnId: 'number',
      field: 'number',
      operator: 'contains',
      value: '',
    });
  });

  it('omits the filter action without filter state', async () => {
    renderTable();

    await openColumnMenu('number');

    expect(
      screen.getAllByRole('menuitem').map((item) => item.textContent),
    ).toEqual(['Ascending', 'Descending']);
  });

  it('omits the filter action on a column that opted out of filtering', async () => {
    renderTable({ tableFilters: [], onTableFiltersChange: vi.fn() });

    await openColumnMenu('amount');

    expect(
      screen.getAllByRole('menuitem').map((item) => item.textContent),
    ).toEqual(['Ascending', 'Descending']);
  });

  it('omits the filter action once the filter cap is reached', async () => {
    const existing: TableFilter[] = [
      { id: 'f-1', columnId: 'number', operator: 'contains', value: 'x' },
    ];
    renderTable({
      tableFilters: existing,
      onTableFiltersChange: vi.fn(),
      maxFilters: 1,
    });

    await openColumnMenu('number');

    expect(
      screen.getAllByRole('menuitem').map((item) => item.textContent),
    ).toEqual(['Ascending', 'Descending']);
  });

  it('renders no menu on a column that can neither sort nor filter', () => {
    renderTable();

    expect(screen.queryByRole('button', { name: 'Options for actions' })).toBeNull();
  });
});
