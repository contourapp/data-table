'use client';

import { Box } from '@mantine/core';
import type {
  ColumnFiltersState,
  ColumnVisibilityState,
  ExpandedState,
  OnChangeFn,
  RowSelectionState,
  SortingState,
} from '@tanstack/react-table';
import { flexRender } from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { DragEvent, ReactNode, UIEvent } from 'react';
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';

import { ColumnMenu } from './components/ColumnMenu.js';
import { DragHandle } from './components/DragHandle.js';
import { EmptyState } from './components/EmptyState.js';
import { ExpandButton } from './components/ExpandButton.js';
import { FetchMoreProgress } from './components/LoadingOverlay.js';
import { SelectCheckbox } from './components/SelectCheckbox.js';
import { SortIndicator } from './components/SortIndicator.js';
import { classNames as styles } from './classNames.js';
import { getColumnId, getFilterableColumns } from './columnHelpers.js';
import { useDataTableConfig } from './config.js';
import { DEFAULT_MAX_FILTERS } from './constants.js';
import { createFilterForColumn, type TableFilter } from './filterHelpers.js';
import { DataTableSkeleton } from './DataTableSkeleton.js';
import { useAppTable } from './features.js';
import type { ColumnDef, Row } from './features.js';
import { hasMoreRows } from './tableHelpers.js';

/**
 * A column definition for `DataTable`. Presentation and filtering options live
 * on `meta` (see the `ColumnMeta` augmentation in `./features`); `accessorKey`
 * is widened so callers can read it off any column in the union.
 */
export type DataTableColumnDef<
  TData extends object,
  TValue = unknown,
> = ColumnDef<TData, TValue> & {
  accessorKey?: string;
};

interface DataTableProps<TData extends object> {
  dataType: string;
  columns: DataTableColumnDef<TData>[];
  data?: TData[];
  emptyText?: string;
  isLoading?: boolean;
  height?: string;
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;
  /** Default sorting for client-side sorting */
  initialSorting?: SortingState;
  /** Column filters (server-side) */
  columnFilters?: ColumnFiltersState;
  onColumnFiltersChange?: OnChangeFn<ColumnFiltersState>;
  /** Whether external table filters are rendered above this table (adjusts height) */
  enableTableFilters?: boolean;
  /**
   * Filter state, so each column header can offer "Add filter". Pass the same
   * state you give `TableFilters`; without `onTableFiltersChange` the header
   * menu offers sorting only.
   */
  tableFilters?: TableFilter[];
  onTableFiltersChange?: (filters: TableFilter[]) => void;
  /** Upper bound on simultaneous column filters, matching `TableFilters`. */
  maxFilters?: number;
  /** Row selection */
  enableRowSelection?: boolean | ((row: Row<TData>) => boolean);
  enableMultiRowSelection?: boolean;
  selectedRows?: RowSelectionState;
  onRowSelectionChange?: OnChangeFn<RowSelectionState>;
  selectOnRowClick?: boolean;
  hideCheckboxes?: boolean;
  hideSubRowCheckboxes?: boolean;
  /** Row click / navigation */
  baseHref?: string;
  onRowClick?: (row: Row<TData>) => void;
  /** Row actions column */
  rowActions?: (props: { row: Row<TData> }) => ReactNode;
  rowActionsSize?: number;
  /** Expansion & sub-rows */
  hasSubRows?: boolean;
  defaultExpanded?: ExpandedState;
  renderExpandButton?: (props: { row: Row<TData> }) => ReactNode;
  renderExpandAllButton?: () => ReactNode;
  renderDetailsPanel?: (props: { row: Row<TData> }) => ReactNode;
  /** Grouping */
  grouping?: string[];
  columnVisibility?: ColumnVisibilityState;
  /** Infinite scroll / virtualization */
  totalRowCount?: number;
  onFetchMore?: () => void;
  isFetchingMore?: boolean;
  /** Row ordering (drag) */
  enableRowOrdering?: boolean;
  onRowReorder?: (args: { startIndex: number; endIndex: number }) => void;
  /** Makes rows draggable as a custom drag source (independent of row ordering) */
  onRowDragStart?: (row: Row<TData>, e: DragEvent) => void;
}

const APP_SHELL_HEADER_HEIGHT = 'var(--app-shell-header-height, 0px)';

const EMPTY_DATA: never[] = [];
const EMPTY_GROUPING: string[] = [];
const EMPTY_TABLE_FILTERS: TableFilter[] = [];

const DataTable = <TData extends object>({
  dataType,
  columns,
  data = EMPTY_DATA,
  emptyText,
  isLoading = false,
  height,
  sorting: sortingProps,
  onSortingChange,
  initialSorting,
  columnFilters: columnFiltersProps,
  onColumnFiltersChange,
  enableTableFilters = false,
  tableFilters = EMPTY_TABLE_FILTERS,
  onTableFiltersChange,
  maxFilters = DEFAULT_MAX_FILTERS,
  enableRowSelection = false,
  enableMultiRowSelection = false,
  selectedRows: rowSelection,
  onRowSelectionChange,
  selectOnRowClick = true,
  hideCheckboxes = false,
  hideSubRowCheckboxes = false,
  baseHref,
  onRowClick,
  rowActions,
  rowActionsSize = 50,
  hasSubRows = false,
  defaultExpanded: expanded = true,
  renderExpandButton,
  renderExpandAllButton,
  renderDetailsPanel,
  grouping = EMPTY_GROUPING,
  columnVisibility,
  totalRowCount = 0,
  onFetchMore,
  isFetchingMore = false,
  enableRowOrdering = false,
  onRowReorder,
  onRowDragStart,
}: DataTableProps<TData>) => {
  const { navigate } = useDataTableConfig();
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const [expandedState, setExpandedState] = useState<ExpandedState>(expanded);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const showSelection =
    !hideCheckboxes && (enableRowSelection || !!onRowSelectionChange);
  const enableExpanding = hasSubRows || !!renderDetailsPanel;
  const showActions = !!rowActions;
  const showDrag = enableRowOrdering;

  const filterableColumnIds = new Set(
    getFilterableColumns(columns)
      .map(getColumnId)
      .filter((id): id is string => !!id),
  );

  const addFilterForColumn = (columnId: string) => {
    const column = columns.find((col) => getColumnId(col) === columnId);
    onTableFiltersChange?.([
      ...tableFilters,
      createFilterForColumn(column, columnId),
    ]);
  };

  const gridTemplateParts: string[] = [];
  if (showDrag) gridTemplateParts.push('30px');
  if (enableExpanding) gridTemplateParts.push('30px');
  if (showSelection) gridTemplateParts.push('36px');
  for (const col of columns) {
    const width = col.meta?.width;
    const maxWidth = col.meta?.maxWidth;
    if (width || maxWidth) {
      const min = width ? `${width}px` : '100px';
      const max = maxWidth ? `${maxWidth}px` : '1fr';
      gridTemplateParts.push(`minmax(${min}, ${max})`);
    } else {
      gridTemplateParts.push('minmax(100px, 1fr)');
    }
  }
  if (showActions) gridTemplateParts.push(`${rowActionsSize}px`);
  const gridTemplateColumns = gridTemplateParts.join(' ');

  const fetchMoreOnBottomReached = useCallback(
    (containerRefElement?: HTMLDivElement | null) => {
      if (!containerRefElement || !data || !onFetchMore) return;

      const { scrollHeight, scrollTop, clientHeight } = containerRefElement;
      const mightHaveMoreData = hasMoreRows(data.length, totalRowCount);

      if (
        scrollHeight - scrollTop - clientHeight < 400 &&
        !isFetchingMore &&
        mightHaveMoreData &&
        data.length
      ) {
        onFetchMore();
      }
    },
    [data, onFetchMore, totalRowCount, isFetchingMore],
  );

  useEffect(() => {
    fetchMoreOnBottomReached(tableContainerRef.current);
  }, [fetchMoreOnBottomReached]);

  type TableOptions = Parameters<typeof useAppTable<TData>>[0];
  type MutableTableOptions = {
    -readonly [Key in keyof TableOptions]: TableOptions[Key];
  };
  const tableState: NonNullable<TableOptions['state']> = {
    grouping,
    columnVisibility,
    expanded: expandedState,
  };
  const tableOptions: MutableTableOptions = {
    columns,
    data,
    // Sub-rows default to expanded, so tables that never opted into expansion
    // must bypass the expanded row model rather than flatten sub-rows in.
    manualExpanding: !enableExpanding && grouping.length === 0,
    enableRowSelection: enableRowSelection || !!onRowSelectionChange,
    enableMultiRowSelection,
    enableExpanding,
    getRowCanExpand: renderDetailsPanel ? () => true : undefined,
    enableGrouping: grouping.length > 0,
    manualFiltering: !!columnFiltersProps,
    manualSorting: !!sortingProps,
    state: tableState,
    onExpandedChange: setExpandedState,
  };
  if (initialSorting) tableOptions.initialState = { sorting: initialSorting };
  if (columnFiltersProps) {
    tableState.columnFilters = columnFiltersProps;
    tableOptions.onColumnFiltersChange = onColumnFiltersChange;
  }
  if (sortingProps) {
    tableState.sorting = sortingProps;
    tableOptions.onSortingChange = onSortingChange;
  }
  if (onRowSelectionChange) {
    tableState.rowSelection = rowSelection ?? {};
    tableOptions.onRowSelectionChange = onRowSelectionChange;
  }
  const table = useAppTable(tableOptions);

  const { rows } = table.getRowModel();

  const enableVirtualization = !!onFetchMore;
  // oxlint-disable-next-line react/incompatible-library -- @tanstack/react-virtual is not React Compiler compatible; nothing to change on our side
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 37,
    overscan: 20,
    enabled: enableVirtualization,
  });

  const virtualRows = enableVirtualization
    ? rowVirtualizer.getVirtualItems()
    : null;

  useEffect(() => {
    if (enableVirtualization && rowVirtualizer) {
      try {
        rowVirtualizer.scrollToIndex(0);
      } catch {
        // Ignore if virtualizer not ready
      }
    }
  }, [sortingProps, columnFiltersProps, enableVirtualization, rowVirtualizer]);

  const handleDragStart = (_e: DragEvent<HTMLButtonElement>, index: number) => {
    setDraggingIndex(index);
  };

  const handleDragOver = (_e: DragEvent<HTMLButtonElement>, index: number) => {
    setHoverIndex(index);
  };

  const handleDragEnd = () => {
    if (
      draggingIndex !== null &&
      hoverIndex !== null &&
      draggingIndex !== hoverIndex &&
      onRowReorder
    ) {
      // When sub-rows are expanded, the flat row indices don't match
      // the top-level data indices. Map them back to top-level positions.
      const topLevelFlatIndices: number[] = [];
      for (let i = 0; i < rows.length; i++) {
        if (!rows[i].depth) topLevelFlatIndices.push(i);
      }
      const startTopLevel = topLevelFlatIndices.indexOf(draggingIndex);
      const endTopLevel = topLevelFlatIndices.indexOf(hoverIndex);
      if (startTopLevel >= 0 && endTopLevel >= 0) {
        onRowReorder({ startIndex: startTopLevel, endIndex: endTopLevel });
      }
    }
    setDraggingIndex(null);
    setHoverIndex(null);
  };

  const handleRowClickInternal = (row: Row<TData>, event: React.MouseEvent) => {
    event.stopPropagation();
    if (data.length === 0) return;

    if (baseHref) {
      const original: TData & { id?: string } = row.original;
      navigate(`${baseHref}/${original.id}`);
    } else if (onRowClick) {
      onRowClick(row);
    } else if (selectOnRowClick && onRowSelectionChange) {
      const canSelect =
        enableRowSelection !== true && enableRowSelection !== false
          ? enableRowSelection(row)
          : enableRowSelection;
      if (canSelect) {
        onRowSelectionChange((prev) => {
          if (prev[row.id]) {
            if (!enableMultiRowSelection) return {};
            const { [row.id]: _removed, ...rest } = prev;
            return rest;
          }
          return enableMultiRowSelection
            ? { ...prev, [row.id]: true }
            : { [row.id]: true };
        });
      }
    }
  };

  const isClickable =
    !!(baseHref || onRowClick || onRowSelectionChange) && data.length > 0;

  const containerHeight =
    height ??
    `calc(100dvh - ${APP_SHELL_HEADER_HEIGHT}${enableTableFilters ? ' - 47.5px' : ''})`;

  const renderRow = (row: Row<TData>, rowIndex: number) => {
    const isGrouped = row.getIsGrouped?.();
    const isDragging = showDrag && draggingIndex === rowIndex;
    const isDropTarget =
      showDrag &&
      draggingIndex !== null &&
      hoverIndex === rowIndex &&
      draggingIndex !== rowIndex;

    return (
      <Fragment key={row.id}>
        <Box
          className={styles.bodyRow}
          style={{ gridTemplateColumns }}
          data-clickable={isClickable}
          data-dragging={isDragging || undefined}
          data-drop-above={
            (isDropTarget && hoverIndex < draggingIndex) || undefined
          }
          data-drop-below={
            (isDropTarget && hoverIndex > draggingIndex) || undefined
          }
          draggable={onRowDragStart ? true : undefined}
          onDragStart={
            onRowDragStart ? (e) => onRowDragStart(row, e) : undefined
          }
          onClick={(e) => handleRowClickInternal(row, e)}
          onDragOver={
            showDrag && draggingIndex !== null
              ? (e) => {
                  e.preventDefault();
                  if (!row.depth) setHoverIndex(rowIndex);
                }
              : undefined
          }
        >
          {showDrag && (
            <Box className={styles.systemCell}>
              {!row.depth && (
                <DragHandle
                  rowIndex={rowIndex}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDragEnd={handleDragEnd}
                />
              )}
            </Box>
          )}
          {enableExpanding && (
            <Box className={styles.systemCell}>
              {renderExpandButton ? (
                renderExpandButton({ row })
              ) : (
                <ExpandButton row={row} />
              )}
            </Box>
          )}
          {showSelection && (
            <Box className={styles.systemCell}>
              {!(hideSubRowCheckboxes && row.depth > 0) && (
                <SelectCheckbox
                  row={row}
                  disabled={
                    enableRowSelection !== true && enableRowSelection !== false
                      ? !enableRowSelection(row)
                      : false
                  }
                />
              )}
            </Box>
          )}
          {row.getVisibleCells().map((cell) => {
            const columnDef = cell.column.columnDef;

            const aggregatedCell = columnDef.meta?.aggregatedCell;
            if (isGrouped && aggregatedCell) {
              return (
                <Box key={cell.id} className={styles.bodyCell}>
                  {aggregatedCell({ row, cell })}
                </Box>
              );
            }

            return (
              <Box key={cell.id} className={styles.bodyCell}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </Box>
            );
          })}
          {showActions && (
            <Box className={styles.actionsCell}>{rowActions({ row })}</Box>
          )}
        </Box>
        {renderDetailsPanel && row.getIsExpanded() && (
          <Box className={styles.detailPanel}>
            {renderDetailsPanel({ row })}
          </Box>
        )}
      </Fragment>
    );
  };

  const renderBody = () => {
    if (data.length === 0) {
      if (isLoading) {
        return (
          <DataTableSkeleton
            columns={columns.length}
            bodyTemplateColumns={gridTemplateColumns}
          />
        );
      }
      return (
        <EmptyState
          dataType={dataType}
          emptyText={emptyText}
          height={
            height
              ? `calc(${height} - 84px)`
              : `calc(100dvh - 51px - ${APP_SHELL_HEADER_HEIGHT}${enableTableFilters ? ' - 48px' : ''})`
          }
        />
      );
    }

    if (virtualRows) {
      return (
        <Box
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualRows.map((virtualRow) => {
            const row = rows[virtualRow.index];
            return (
              <Box
                key={row.id}
                ref={rowVirtualizer.measureElement}
                data-index={virtualRow.index}
                className={styles.virtualRow}
                style={{ transform: `translateY(${virtualRow.start}px)` }}
              >
                {renderRow(row, virtualRow.index)}
              </Box>
            );
          })}
        </Box>
      );
    }

    return rows.map((row, index) => renderRow(row, index));
  };

  return (
    <table.AppTable>
      <Box
        ref={tableContainerRef}
        className={styles.container}
        style={{ height: containerHeight }}
        onScroll={(event: UIEvent<HTMLDivElement>) => {
          fetchMoreOnBottomReached(event.currentTarget);
        }}
      >
        {/* Header */}
        <Box className={styles.headerRow} style={{ gridTemplateColumns }}>
          {showDrag && <Box className={styles.systemCell} />}
          {enableExpanding && (
            <Box className={styles.systemCell}>{renderExpandAllButton?.()}</Box>
          )}
          {showSelection && <Box className={styles.systemCell} />}
          {table.getHeaderGroups().map((headerGroup) =>
            headerGroup.headers.map((header) => (
              <Box
                key={header.id}
                className={styles.headerCell}
                data-sortable={header.column.getCanSort()}
                onClick={header.column.getToggleSortingHandler()}
              >
                {header.isPlaceholder
                  ? null
                  : flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
                {header.column.getCanSort() && (
                  <SortIndicator column={header.column} />
                )}
                <ColumnMenu
                  column={header.column}
                  canSort={header.column.getCanSort()}
                  onAddFilter={
                    filterableColumnIds.has(header.column.id) &&
                    onTableFiltersChange &&
                    tableFilters.length < maxFilters
                      ? () => addFilterForColumn(header.column.id)
                      : undefined
                  }
                />
              </Box>
            )),
          )}
          {showActions && <Box className={styles.systemCell} />}
        </Box>
        {renderBody()}
        <FetchMoreProgress visible={isFetchingMore} />
      </Box>
    </table.AppTable>
  );
};

export default DataTable;
