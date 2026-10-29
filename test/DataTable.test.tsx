import {
  functionalUpdate,
  type OnChangeFn,
  type SortingState,
} from '@tanstack/react-table';
import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  DataTable,
  DataTableConfigProvider,
  type DataTableColumnDef,
} from '../src/index.js';
import { renderWithMantine } from './renderWithMantine.js';

interface Row {
  id: string;
  name: string;
}

const columns: DataTableColumnDef<Row>[] = [
  { id: 'name', accessorKey: 'name', header: 'Name', enableSorting: true },
  { id: 'id', accessorKey: 'id', header: 'Id', enableSorting: false },
];

const data: Row[] = [
  { id: '1', name: 'banana' },
  { id: '2', name: 'apple' },
  { id: '3', name: 'cherry' },
];

const renderTable = (
  props: Partial<Parameters<typeof DataTable<Row>>[0]> = {},
  navigate?: (href: string) => void,
) =>
  renderWithMantine(
      <DataTableConfigProvider navigate={navigate}>
        <DataTable dataType="rows" columns={columns} data={data} {...props} />
      </DataTableConfigProvider>,
  );

describe('DataTable sorting', () => {
  it('reports header clicks to a controlled sorter', () => {
    const onSortingChange = vi.fn<OnChangeFn<SortingState>>();
    renderTable({ sorting: [], onSortingChange });

    fireEvent.click(screen.getByText('Name'));

    expect(onSortingChange).toHaveBeenCalledTimes(1);
    // Tanstack hands back an updater; applying it must yield the ascending sort.
    const updater = onSortingChange.mock.calls[0][0];
    const next = functionalUpdate(updater, []);
    expect(next).toEqual([{ id: 'name', desc: false }]);
  });

  it('does not sort on a column that opted out', () => {
    const onSortingChange = vi.fn<OnChangeFn<SortingState>>();
    renderTable({ sorting: [], onSortingChange });

    fireEvent.click(screen.getByText('Id'));

    expect(onSortingChange).not.toHaveBeenCalled();
    expect(
      screen
        .getAllByText(/^(apple|banana|cherry)$/)
        .map((cell) => cell.textContent),
    ).toEqual(['banana', 'apple', 'cherry']);
  });

  it('sorts client-side when uncontrolled', () => {
    renderTable();

    fireEvent.click(screen.getByText('Name'));

    const cells = screen.getAllByText(/^(apple|banana|cherry)$/);
    expect(cells.map((c) => c.textContent)).toEqual([
      'apple',
      'banana',
      'cherry',
    ]);
  });
});

describe('DataTable row navigation', () => {
  it('routes a row click through the configured navigate', () => {
    const navigate = vi.fn();
    renderTable({ baseHref: '/rows' }, navigate);

    fireEvent.click(screen.getByText('banana'));

    expect(navigate).toHaveBeenCalledWith('/rows/1');
  });

  it('leaves rows inert without baseHref or a click handler', () => {
    const navigate = vi.fn();
    renderTable({}, navigate);

    fireEvent.click(screen.getByText('banana'));

    expect(navigate).not.toHaveBeenCalled();
  });
});
