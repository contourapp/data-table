import {
  columnFilteringFeature,
  columnGroupingFeature,
  columnVisibilityFeature,
  createExpandedRowModel,
  createGroupedRowModel,
  createSortedRowModel,
  createTableHook,
  rowExpandingFeature,
  rowSelectionFeature,
  rowSortingFeature,
  tableFeatures,
} from '@tanstack/react-table';
import type {
  CellData,
  RowData,
  Cell as TableCell,
  Column as TableColumn,
  ColumnDef as TableColumnDef,
  TableFeatures,
  Row as TableRow,
} from '@tanstack/react-table';
import type { ReactNode } from 'react';

import type { ColumnType, FilterOperator } from './filterHelpers.js';

/**
 * Presentation and filtering options `DataTable` reads off each column.
 *
 * These live on `meta` because they are not TanStack options. Declaration
 * merging is used rather than the `columnMeta` feature slot because the slot is
 * a single non-generic type, which cannot express `aggregatedCell`'s dependence
 * on the row type.
 */
declare module '@tanstack/table-core' {
  interface ColumnMeta<
    in out TFeatures extends TableFeatures,
    in out TData extends RowData,
    TValue extends CellData = CellData,
  > {
    /** Lower bound of the column's grid track, in px. Defaults to 100. */
    width?: number;
    /** Upper bound of the column's grid track, in px. Defaults to 1fr. */
    maxWidth?: number;
    /**
     * Backend field this column filters and sorts on. Set it when the column id
     * does not match the field name; otherwise it is inferred from the id.
     */
    field?: string;
    /** Filter type for columns that do not set `filterVariant`. */
    type?: ColumnType;
    filterVariant?:
      | 'text'
      | 'select'
      | 'multi-select'
      | 'date'
      | 'date-range'
      | 'range'
      | 'checkbox';
    filterSelectProps?: {
      data?: (string | { value: string; label: string })[];
    };
    /**
     * Restricts which operators this column offers. Use when the type's full
     * set does not suit the data - a NOT NULL column, for instance, has no
     * meaningful "is empty".
     */
    filterOperators?: FilterOperator[];
    /** Renders this column's cell on grouped rows in place of `cell`. */
    aggregatedCell?: (props: {
      row: TableRow<TFeatures, TData>;
      cell: TableCell<TFeatures, TData, TValue>;
    }) => ReactNode;
  }
}

/**
 * The feature set every `DataTable` instance is built from. Registering only
 * these keeps unused table features out of the bundle; an API missing at
 * runtime means its feature is not listed here.
 *
 * Filtering is registered without a filtered row model because filtered tables
 * are expected to run `manualFiltering` against a server.
 */
const dataTableFeatures = tableFeatures({
  columnFilteringFeature,
  columnGroupingFeature,
  columnVisibilityFeature,
  rowExpandingFeature,
  rowSelectionFeature,
  rowSortingFeature,
  expandedRowModel: createExpandedRowModel(),
  groupedRowModel: createGroupedRowModel(),
  sortedRowModel: createSortedRowModel(),
});

type DataTableFeatures = typeof dataTableFeatures;

/**
 * Binds the feature set and the row-identity conventions every table shares, so
 * `DataTable` supplies only what varies per table. Must stay at module scope:
 * rebuilding the factory per render would give the hook and its component
 * registries a new identity each time.
 *
 * Rows are keyed by a nested `node.id` where one exists — the shape a Relay
 * edge unwraps to — falling back to a bare `id` and finally to the index for
 * synthetic rows.
 */
const dataTableHook = createTableHook({
  features: dataTableFeatures,
  enableSubRowSelection: false,
  enableSorting: true,
  getSubRows: (originalRow: { subRows?: unknown[] }) => originalRow.subRows,
  getRowId: (original: { node?: { id?: string }; id?: string }, index) =>
    original.node?.id ?? original.id ?? String(index),
});

export const { createAppColumnHelper, useAppTable, useTableContext } =
  dataTableHook;

/**
 * TanStack Table threads the registered feature set through every entity type.
 * These aliases bind that generic to `dataTableFeatures` once so call sites
 * keep writing `Row<TData>` and stay decoupled from which features the shared
 * `DataTable` registers.
 */
export type Row<TData extends object> = TableRow<DataTableFeatures, TData>;

export type Cell<TData extends object, TValue = unknown> = TableCell<
  DataTableFeatures,
  TData,
  TValue
>;

export type Column<TData extends object, TValue = unknown> = TableColumn<
  DataTableFeatures,
  TData,
  TValue
>;

export type ColumnDef<TData extends object, TValue = unknown> = TableColumnDef<
  DataTableFeatures,
  TData,
  TValue
>;
