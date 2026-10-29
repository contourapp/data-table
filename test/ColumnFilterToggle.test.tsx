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
];

const data: Invoice[] = [{ id: '1', number: 'INV-1', amount: 10 }];

const renderTable = (
  props: Partial<Parameters<typeof DataTable<Invoice>>[0]> = {},
) =>
  renderWithMantine(
    <DataTable dataType="invoices" columns={columns} data={data} {...props} />,
  );

const numberFilter: TableFilter = {
  id: 'f-1',
  columnId: 'number',
  operator: 'contains',
  value: 'INV',
  columnType: 'text',
  field: 'number',
};

describe('column filter toggle', () => {
  it('adds a filter for its column', () => {
    const onTableFiltersChange = vi.fn<(next: TableFilter[]) => void>();
    renderTable({ tableFilters: [], onTableFiltersChange });

    fireEvent.click(screen.getByRole('button', { name: 'Filter by Invoice' }));

    expect(onTableFiltersChange.mock.calls[0][0]).toHaveLength(1);
    expect(onTableFiltersChange.mock.calls[0][0][0]).toMatchObject({
      columnId: 'number',
      field: 'number',
      operator: 'contains',
      value: '',
    });
  });

  it('drops the column’s filter when it already has one', () => {
    const onTableFiltersChange = vi.fn<(next: TableFilter[]) => void>();
    renderTable({ tableFilters: [numberFilter], onTableFiltersChange });

    fireEvent.click(
      screen.getByRole('button', { name: 'Remove filter on Invoice' }),
    );

    expect(onTableFiltersChange).toHaveBeenCalledWith([]);
  });

  it('reports filtered state to assistive tech', () => {
    renderTable({ tableFilters: [numberFilter], onTableFiltersChange: vi.fn() });

    expect(
      screen.getByRole('button', { name: 'Remove filter on Invoice' }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('leaves other columns’ filters alone', () => {
    const onTableFiltersChange = vi.fn<(next: TableFilter[]) => void>();
    const other: TableFilter = { ...numberFilter, id: 'f-2', columnId: 'other' };
    renderTable({
      tableFilters: [numberFilter, other],
      onTableFiltersChange,
    });

    fireEvent.click(
      screen.getByRole('button', { name: 'Remove filter on Invoice' }),
    );

    expect(onTableFiltersChange).toHaveBeenCalledWith([other]);
  });

  it('does not toggle sorting when clicked', () => {
    const onSortingChange = vi.fn();
    renderTable({
      sorting: [],
      onSortingChange,
      tableFilters: [],
      onTableFiltersChange: vi.fn(),
    });

    fireEvent.click(screen.getByRole('button', { name: 'Filter by Invoice' }));

    expect(onSortingChange).not.toHaveBeenCalled();
  });

  it('is absent without filter state wired up', () => {
    renderTable();

    expect(screen.queryByRole('button', { name: /Filter by/ })).toBeNull();
  });

  it('is absent on a column that opted out of filtering', () => {
    renderTable({ tableFilters: [], onTableFiltersChange: vi.fn() });

    expect(screen.queryByRole('button', { name: 'Filter by Amount' })).toBeNull();
  });

  it('is absent on an unfiltered column once the cap is reached', () => {
    renderTable({
      tableFilters: [{ ...numberFilter, columnId: 'other' }],
      onTableFiltersChange: vi.fn(),
      maxFilters: 1,
    });

    expect(screen.queryByRole('button', { name: 'Filter by Invoice' })).toBeNull();
  });

  it('still offers removal on a filtered column at the cap', () => {
    renderTable({
      tableFilters: [numberFilter],
      onTableFiltersChange: vi.fn(),
      maxFilters: 1,
    });

    expect(
      screen.getByRole('button', { name: 'Remove filter on Invoice' }),
    ).toBeInTheDocument();
  });
});
