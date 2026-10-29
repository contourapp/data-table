import type { SortingState } from '@tanstack/react-table';
import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  TableFilters,
  type DataTableColumnDef,
  type TableFilter,
} from '../src/index.js';
import { renderWithMantine } from './renderWithMantine.js';

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
  props: Partial<Parameters<typeof TableFilters<Employee>>[0]> = {},
) =>
  renderWithMantine(
      <TableFilters
        columns={columns}
        filters={filters}
        onFiltersChange={onFiltersChange}
        {...props}
      />,
  );

// Mantine's menus and selects open on click, but userEvent's full pointer
// sequence trips their click-outside handling under jsdom.
const openMenu = async (name: string) => {
  fireEvent.click(screen.getByRole('button', { name }));
  await screen.findAllByRole('menuitem');
};

const clickMenuItem = (label: string) => {
  const item = screen
    .getAllByRole('menuitem')
    .find((candidate) => candidate.textContent === label);
  if (!item) throw new Error(`no menu item labelled ${label}`);
  fireEvent.click(item);
};

describe('TableFilters', () => {
  it('stamps the column’s configured field onto a new filter', async () => {
    const onFiltersChange = vi.fn<(next: TableFilter[]) => void>();
    renderFilters([], onFiltersChange);

    await openMenu('Filter');
    clickMenuItem('Name');

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

    await openMenu('Filter');
    clickMenuItem('Status');

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

describe('TableFilters sorting', () => {
  const renderWithSorting = (
    sorting: SortingState,
    onSortingChange: (next: SortingState) => void,
    filters: TableFilter[] = [],
  ) => renderFilters(filters, vi.fn(), { sorting, onSortingChange });

  it('offers a Sort button beside Filter when sorting is wired up', async () => {
    const onSortingChange = vi.fn<(next: SortingState) => void>();
    renderWithSorting([], onSortingChange);

    await openMenu('Sort');
    clickMenuItem('Name');

    expect(onSortingChange).toHaveBeenCalledWith([
      { id: 'dimension_value_name', desc: false },
    ]);
  });

  it('hides the Sort button when no sorting handler is given', () => {
    renderFilters([], vi.fn());

    expect(screen.getByRole('button', { name: 'Filter' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sort' })).toBeNull();
  });

  it('flips direction from the sort chip’s arrow', () => {
    const onSortingChange = vi.fn<(next: SortingState) => void>();
    renderWithSorting([{ id: 'status', desc: false }], onSortingChange);

    fireEvent.click(
      screen.getByRole('button', { name: /Sort direction: ascending/ }),
    );

    expect(onSortingChange).toHaveBeenCalledWith([{ id: 'status', desc: true }]);
  });

  it('keeps filters and sorts in separate labelled groups', () => {
    renderWithSorting(
      [{ id: 'status', desc: false }],
      vi.fn(),
      [
        {
          id: 'f-1',
          columnId: 'dimension_value_name',
          operator: 'contains',
          value: 'a',
          columnType: 'text',
          field: 'name',
        },
      ],
    );

    const filters = screen.getByRole('group', { name: 'Filters' });
    const sorts = screen.getByRole('group', { name: 'Sorting' });
    expect(filters).toContainElement(
      screen.getByRole('combobox', { name: 'Filter column' }),
    );
    expect(sorts).toContainElement(
      screen.getByRole('combobox', { name: 'Sort column' }),
    );
    expect(document.querySelectorAll('.cdt-toolbar-divider')).toHaveLength(1);
  });

  it('shows no divider with only one kind of chip', () => {
    renderWithSorting([{ id: 'status', desc: false }], vi.fn());

    expect(screen.queryByRole('group', { name: 'Filters' })).toBeNull();
    expect(document.querySelectorAll('.cdt-toolbar-divider')).toHaveLength(0);
  });

  it('retargets a chip at another column without duplicating an existing sort', async () => {
    const onSortingChange = vi.fn<(next: SortingState) => void>();
    renderWithSorting(
      [
        { id: 'status', desc: false },
        { id: 'dimension_value_name', desc: true },
      ],
      onSortingChange,
    );

    fireEvent.click(screen.getAllByRole('combobox', { name: 'Sort column' })[0]);
    fireEvent.click(await screen.findByRole('option', { name: 'Name' }));

    expect(onSortingChange).toHaveBeenCalledWith([
      { id: 'dimension_value_name', desc: false },
    ]);
  });

  it('drops a sort when its chip is cleared', () => {
    const onSortingChange = vi.fn<(next: SortingState) => void>();
    renderWithSorting(
      [
        { id: 'status', desc: false },
        { id: 'dimension_value_name', desc: true },
      ],
      onSortingChange,
    );

    fireEvent.click(screen.getAllByRole('button', { name: 'Clear sort' })[0]);

    expect(onSortingChange).toHaveBeenCalledWith([
      { id: 'dimension_value_name', desc: true },
    ]);
  });

  it('never offers a column that is already sorted', async () => {
    renderWithSorting([{ id: 'status', desc: false }], vi.fn());

    await openMenu('Add filter');

    // Name is offered under both headings; Status only under "Filter by",
    // because it already holds a sort chip.
    expect(
      screen.getAllByRole('menuitem').map((item) => item.textContent),
    ).toEqual(['Name', 'Status', 'Name']);
  });

  it('clears sorting alongside filters', () => {
    const onSortingChange = vi.fn<(next: SortingState) => void>();
    renderWithSorting([{ id: 'status', desc: false }], onSortingChange);

    fireEvent.click(screen.getByRole('button', { name: 'Clear all' }));

    expect(onSortingChange).toHaveBeenCalledWith([]);
  });
});
