'use client';

import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Group,
  Menu,
  Text,
  Tooltip,
} from '@mantine/core';
import {
  IconArrowsSort,
  IconFilter,
  IconFilterFilled,
  IconPlus,
  IconX,
} from '@tabler/icons-react';
import type { SortingState } from '@tanstack/react-table';
import { Fragment, useEffect, useRef, useState } from 'react';

import { classNames } from './classNames.js';
import { DEFAULT_MAX_FILTERS, DEFAULT_MAX_SORTS } from './constants.js';
import {
  getColumnId,
  getColumnLabel,
  getFilterableColumns,
  getSortableColumns,
} from './columnHelpers.js';
import type { DataTableColumnDef } from './DataTable.js';
import { FilterConnectorToggle } from './FilterConnectorToggle.js';
import {
  type CustomFilter,
  type CustomFilterOption,
  type FilterConnector,
  type TableFilter,
  createFilterForColumn,
  getColumnType,
  getDefaultOperatorForColumn,
  getColumnField,
  DEFAULT_FILTER_CONNECTOR,
} from './filterHelpers.js';
import { FilterRow } from './FilterRow.js';
import { SortRow, type ColumnSort } from './SortRow.js';

interface TableFiltersProps<TData extends object> {
  columns: DataTableColumnDef<TData>[];
  filters: TableFilter[];
  onFiltersChange: (filters: TableFilter[]) => void;
  customFilters?: CustomFilter[];
  customFilterOptions?: CustomFilterOption[];
  /** Upper bound on simultaneous column filters. */
  maxFilters?: number;
  /**
   * How the filters are joined. Omit `onConnectorChange` and the bar shows no
   * connector; filters are ANDed, as they always were.
   */
  connector?: FilterConnector;
  onConnectorChange?: (connector: FilterConnector) => void;
  /**
   * Sorting state, shown as chips alongside the filters. Pass the same state
   * you give `DataTable`; omitting `onSortingChange` keeps sorting out of the
   * bar entirely.
   */
  sorting?: SortingState;
  onSortingChange?: (sorting: SortingState) => void;
  /** Upper bound on simultaneous sorts. */
  maxSorts?: number;
}

/**
 * Marks which edges of a scrolling group are hiding a chip, for the fade in
 * `styles.css`. Only an edge with something behind it gets one: the group
 * shrink-wraps its chips, so a mask that is always on washes out the last
 * chip's controls even with the whole row to spare.
 */
const markOverflow = (group: HTMLElement) => {
  const max = group.scrollWidth - group.clientWidth;
  group.toggleAttribute('data-overflow-start', group.scrollLeft > 1);
  group.toggleAttribute('data-overflow-end', group.scrollLeft < max - 1);
};

const EMPTY_CUSTOM_FILTERS: CustomFilter[] = [];
const EMPTY_CUSTOM_FILTER_OPTIONS: CustomFilterOption[] = [];
const EMPTY_SORTING: SortingState = [];

export function TableFilters<TData extends object>({
  columns,
  filters,
  onFiltersChange,
  customFilters = EMPTY_CUSTOM_FILTERS,
  customFilterOptions = EMPTY_CUSTOM_FILTER_OPTIONS,
  maxFilters = DEFAULT_MAX_FILTERS,
  connector = DEFAULT_FILTER_CONNECTOR,
  onConnectorChange,
  sorting = EMPTY_SORTING,
  onSortingChange,
  maxSorts = DEFAULT_MAX_SORTS,
}: TableFiltersProps<TData>) {
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);

  const filterableColumns = getFilterableColumns(columns);
  const columnOptions = filterableColumns.map((col) => ({
    value: getColumnId(col) ?? '',
    label: getColumnLabel(col),
    type: getColumnType(col),
  }));

  const sortingEnabled = !!onSortingChange;
  const sortColumnOptions = getSortableColumns(columns).map((col) => ({
    value: getColumnId(col) ?? '',
    label: getColumnLabel(col),
  }));
  // A column already in the sorting state would only duplicate an existing
  // chip, so it drops out of the menu until that chip is removed.
  const unsortedColumnOptions = sortColumnOptions.filter(
    (option) => !sorting.some((sort) => sort.id === option.value),
  );

  const closeMenus = () => {
    setIsFilterMenuOpen(false);
    setIsSortMenuOpen(false);
    setIsAddMenuOpen(false);
  };

  const canAddFilter = filters.length < maxFilters;
  const canAddSort =
    sortingEnabled &&
    sorting.length < maxSorts &&
    unsortedColumnOptions.length > 0;

  const addFilter = (columnId?: string) => {
    if (!canAddFilter) return;

    const column =
      filterableColumns.find((col) => getColumnId(col) === columnId) ||
      filterableColumns[0];

    onFiltersChange([
      ...filters,
      createFilterForColumn(column, columnId || (columnOptions[0]?.value ?? '')),
    ]);
    closeMenus();
  };

  const updateFilter = (id: string, updates: Partial<TableFilter>) => {
    onFiltersChange(
      filters.map((filter) => {
        if (filter.id !== id) return filter;

        const updated = { ...filter, ...updates };

        if (updates.columnId && updates.columnId !== filter.columnId) {
          const column = filterableColumns.find(
            (col) => getColumnId(col) === updates.columnId,
          );
          const columnType = column ? getColumnType(column) : 'text';
          updated.columnType = columnType;
          updated.operator = getDefaultOperatorForColumn(column, columnType);
          updated.value = '';
          updated.field = column ? getColumnField(column) : undefined;
        }

        return updated;
      }),
    );
  };

  const removeFilter = (id: string) => {
    onFiltersChange(filters.filter((filter) => filter.id !== id));
  };

  const addSort = (columnId: string) => {
    if (!canAddSort) return;
    onSortingChange?.([...sorting, { id: columnId, desc: false }]);
    closeMenus();
  };

  const updateSort = (columnId: string, updates: Partial<ColumnSort>) => {
    onSortingChange?.(
      sorting
        // Retargeting a chip at an already-sorted column would sort it twice.
        .filter((sort) => sort.id === columnId || sort.id !== updates.id)
        .map((sort) => (sort.id === columnId ? { ...sort, ...updates } : sort)),
    );
  };

  const removeSort = (columnId: string) => {
    onSortingChange?.(sorting.filter((sort) => sort.id !== columnId));
  };

  const clearAll = () => {
    onFiltersChange([]);
    customFilters.forEach((cf) => cf.onRemove());
    onSortingChange?.([]);
    onConnectorChange?.(DEFAULT_FILTER_CONNECTOR);
  };

  const hasActiveControls =
    filters.length > 0 || customFilters.length > 0 || sorting.length > 0;

  // The bar is one row or two depending on what fits, so `DataTable` cannot
  // assume its height. Publishing the measured height on the shared parent
  // lets the table read it as `--cdt-toolbar-height` — siblings cannot set
  // variables on each other, and a wrapper would change how the two compose.
  useEffect(() => {
    const bar = barRef.current;
    const parent = bar?.parentElement;
    if (!bar || !parent) return;

    const groups = [
      ...bar.querySelectorAll<HTMLElement>(`.${classNames.toolbarGroup}`),
    ];

    const publish = () => {
      parent.style.setProperty('--cdt-toolbar-height', `${bar.offsetHeight}px`);
      // Wrapping changes the bar's height, so this fires exactly when the
      // divider between the groups would be left dangling at a row's edge.
      const wrapped =
        groups.length === 2 && groups[1].offsetTop > groups[0].offsetTop;
      bar
        .querySelector<HTMLElement>(`.${classNames.toolbarRows}`)
        ?.toggleAttribute('data-wrapped', wrapped);
      groups.forEach(markOverflow);
    };
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(bar);
    // A chip can come or go without the bar resizing, which changes only how
    // far the group overflows.
    groups.forEach((group) => observer.observe(group));

    const onScroll = (event: Event) => markOverflow(event.currentTarget as HTMLElement);
    groups.forEach((group) => group.addEventListener('scroll', onScroll));

    return () => {
      observer.disconnect();
      groups.forEach((group) => group.removeEventListener('scroll', onScroll));
      parent.style.removeProperty('--cdt-toolbar-height');
    };
    // Re-subscribes when the bar switches between its empty and active roots,
    // and whenever a group gains or loses a chip.
  }, [
    hasActiveControls,
    filters.length,
    customFilters.length,
    sorting.length,
  ]);

  const filterMenuItems = (
    <>
      {customFilterOptions.map((option) => (
        <Menu.Item
          key={option.id}
          onClick={() => {
            option.onAdd();
            closeMenus();
          }}
        >
          <Text size="xs">{option.label}</Text>
        </Menu.Item>
      ))}
      {canAddFilter &&
        columnOptions.map((option) => (
          <Menu.Item key={option.value} onClick={() => addFilter(option.value)}>
            <Text size="xs">{option.label}</Text>
          </Menu.Item>
        ))}
    </>
  );

  const sortMenuItems = unsortedColumnOptions.map((option) => (
    <Menu.Item key={option.value} onClick={() => addSort(option.value)}>
      <Text size="xs">{option.label}</Text>
    </Menu.Item>
  ));

  if (!hasActiveControls) {
    return (
      <Box ref={barRef} className={classNames.filterBar}>
        <Group gap={4} wrap="nowrap">
          <Menu
            opened={isFilterMenuOpen}
            onChange={setIsFilterMenuOpen}
            position="bottom-start"
            offset={4}
          >
            <Menu.Target>
              <Button
                variant="subtle"
                color="dark"
                size="xs"
                leftSection={<IconFilter size={16} />}
              >
                Filter
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Label>Filter by</Menu.Label>
              {filterMenuItems}
            </Menu.Dropdown>
          </Menu>
          {sortingEnabled && sortColumnOptions.length > 0 && (
            <Menu
              opened={isSortMenuOpen}
              onChange={setIsSortMenuOpen}
              position="bottom-start"
              offset={4}
            >
              <Menu.Target>
                <Button
                  variant="subtle"
                  color="dark"
                  size="xs"
                  leftSection={<IconArrowsSort size={16} />}
                >
                  Sort
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>Sort by</Menu.Label>
                {sortMenuItems}
              </Menu.Dropdown>
            </Menu>
          )}
        </Group>
      </Box>
    );
  }

  const showAddMenu =
    customFilterOptions.length > 0 ||
    (canAddFilter && columnOptions.length > 0) ||
    canAddSort;

  return (
    <Box ref={barRef} className={classNames.filterBar}>
      <Group gap="xs" wrap="nowrap" justify="space-between" align="flex-start">
        <Box className={classNames.toolbarRows}>
          {(customFilters.length > 0 || filters.length > 0) && (
            <Group
              gap="xs"
              wrap="nowrap"
              className={classNames.toolbarGroup}
              data-kind="filter"
              aria-label="Filters"
              role="group"
            >
              <Box className={classNames.toolbarGroupIcon} aria-hidden>
                <IconFilterFilled size={14} />
              </Box>
              {customFilters.map((customFilter) =>
                customFilter.render ? (
                  <Box key={customFilter.id}>{customFilter.render()}</Box>
                ) : (
                  <Badge
                    key={customFilter.id}
                    variant="light"
                    size="lg"
                    pr={3}
                    style={
                      customFilter.onClick ? { cursor: 'pointer' } : undefined
                    }
                    onClick={customFilter.onClick}
                    rightSection={
                      <ActionIcon
                        aria-label="Remove filter"
                        size="xs"
                        variant="subtle"
                        color="gray"
                        onClick={(e) => {
                          e.stopPropagation();
                          customFilter.onRemove();
                        }}
                      >
                        <IconX size={12} />
                      </ActionIcon>
                    }
                  >
                    {customFilter.label}
                  </Badge>
                ),
              )}
              {filters.map((filter, index) => (
                <Fragment key={filter.id}>
                  {index > 0 && onConnectorChange && (
                    <FilterConnectorToggle
                      connector={connector}
                      onChange={onConnectorChange}
                    />
                  )}
                  <FilterRow
                    filter={filter}
                    columnOptions={columnOptions}
                    updateFilter={updateFilter}
                    removeFilter={removeFilter}
                    filterableColumns={filterableColumns}
                  />
                </Fragment>
              ))}
            </Group>
          )}
          {(customFilters.length > 0 || filters.length > 0) &&
            sorting.length > 0 && (
              <Box className={classNames.toolbarDivider} aria-hidden />
            )}
          {sorting.length > 0 && (
            <Group
              gap="xs"
              wrap="nowrap"
              className={classNames.toolbarGroup}
              data-kind="sort"
              aria-label="Sorting"
              role="group"
            >
              <Box className={classNames.toolbarGroupIcon} aria-hidden>
                <IconArrowsSort size={14} />
              </Box>
              {sorting.map((sort) => (
                <SortRow
                  key={sort.id}
                  sort={sort}
                  columnOptions={sortColumnOptions}
                  updateSort={updateSort}
                  removeSort={removeSort}
                />
              ))}
            </Group>
          )}
        </Box>
        <Box className={classNames.toolbarActions}>
          {showAddMenu && (
            <Menu
              opened={isAddMenuOpen}
              onChange={setIsAddMenuOpen}
              position="bottom-end"
              offset={4}
            >
              <Menu.Target>
                <Tooltip label="Add filter or sort">
                  <ActionIcon
                    aria-label="Add filter"
                    variant="subtle"
                    color="gray"
                  >
                    <IconPlus size={16} />
                  </ActionIcon>
                </Tooltip>
              </Menu.Target>
              <Menu.Dropdown>
                {(customFilterOptions.length > 0 ||
                  (canAddFilter && columnOptions.length > 0)) && (
                  <>
                    <Menu.Label>Filter by</Menu.Label>
                    {filterMenuItems}
                  </>
                )}
                {canAddSort && (
                  <>
                    <Menu.Divider />
                    <Menu.Label>Sort by</Menu.Label>
                    {sortMenuItems}
                  </>
                )}
              </Menu.Dropdown>
            </Menu>
          )}
          <Button
            variant="subtle"
            color="gray"
            size="compact-xs"
            onClick={clearAll}
          >
            Clear all
          </Button>
        </Box>
      </Group>
    </Box>
  );
}
