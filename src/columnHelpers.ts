import { z } from 'zod';

import type { DataTableColumnDef } from './DataTable.js';

/** The id a column is addressed by in filter and sorting state. */
export function getColumnId<TData extends object>(
  column: DataTableColumnDef<TData>,
): string | undefined {
  return column.id || column.accessorKey;
}

/** A column's header text, when the header is a plain string. */
export function getColumnLabel<TData extends object>(
  column: DataTableColumnDef<TData>,
): string {
  return (
    z.string().safeParse(column.header).data ?? String(getColumnId(column) ?? '')
  );
}

/** Display columns hold no value, so they can be neither sorted nor filtered. */
function isAccessorColumn<TData extends object>(
  column: DataTableColumnDef<TData>,
): boolean {
  return Boolean(column.accessorKey) || 'accessorFn' in column;
}

/**
 * Columns the filter bar offers. Filtering addresses a column by its accessor
 * key, so accessor-function columns are excluded.
 */
export function getFilterableColumns<TData extends object>(
  columns: DataTableColumnDef<TData>[],
): DataTableColumnDef<TData>[] {
  return columns.filter(
    (column) => column.enableColumnFilter !== false && column.accessorKey,
  );
}

/**
 * Columns the sort bar offers. Unlike filtering this accepts accessor-function
 * columns, which TanStack sorts by id.
 */
export function getSortableColumns<TData extends object>(
  columns: DataTableColumnDef<TData>[],
): DataTableColumnDef<TData>[] {
  return columns.filter(
    (column) =>
      column.enableSorting !== false &&
      isAccessorColumn(column) &&
      getColumnId(column),
  );
}
