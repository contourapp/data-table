import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import {
  TableFilters,
  type DataTableColumnDef,
  type TableFilter,
} from '../src/index.js';

interface Employee {
  id: string;
  name: string;
}

const columns: DataTableColumnDef<Employee>[] = [
  {
    id: 'dimension_value_name',
    accessorKey: 'dimension_value_name',
    header: 'Name',
    meta: { field: 'name' },
  },
  { id: 'status', accessorKey: 'status', header: 'Status' },
];

const renderFilters = (
  filters: TableFilter[],
  onFiltersChange: (next: TableFilter[]) => void,
  props: { maxFilters?: number } = {},
) =>
  render(
    <MantineProvider>
      <TableFilters
        columns={columns}
        filters={filters}
        onFiltersChange={onFiltersChange}
        {...props}
      />
    </MantineProvider>,
  );

describe('TableFilters', () => {
  it('stamps the column’s configured field onto a new filter', async () => {
    const onFiltersChange = vi.fn<(next: TableFilter[]) => void>();
    renderFilters([], onFiltersChange);

    await userEvent.click(screen.getByRole('button', { name: 'Filter' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Name' }));

    expect(onFiltersChange).toHaveBeenCalledTimes(1);
    expect(onFiltersChange.mock.calls[0][0][0]).toMatchObject({
      columnId: 'dimension_value_name',
      field: 'name',
      operator: 'contains',
      value: '',
    });
  });

  it('infers the field when the column does not configure one', async () => {
    const onFiltersChange = vi.fn<(next: TableFilter[]) => void>();
    renderFilters([], onFiltersChange);

    await userEvent.click(screen.getByRole('button', { name: 'Filter' }));
    await userEvent.click(
      await screen.findByRole('menuitem', { name: 'Status' }),
    );

    expect(onFiltersChange.mock.calls[0][0][0]).toMatchObject({
      columnId: 'status',
      field: 'status',
    });
  });

  it('stops offering columns once maxFilters is reached', () => {
    const existing: TableFilter[] = [
      {
        id: 'f-1',
        columnId: 'status',
        operator: 'contains',
        value: 'active',
        columnType: 'text',
        field: 'status',
      },
    ];
    renderFilters(existing, vi.fn(), { maxFilters: 1 });

    expect(screen.queryByLabelText('Add filter')).not.toBeInTheDocument();
  });
});
