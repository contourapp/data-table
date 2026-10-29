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
import { IconClearAll, IconFilter, IconPlus, IconX } from '@tabler/icons-react';
import { useState } from 'react';
import { z } from 'zod';

import { classNames } from './classNames.js';
import type { DataTableColumnDef } from './DataTable.js';
import {
  type CustomFilter,
  type CustomFilterOption,
  type TableFilter,
  generateFilterId,
  getColumnField,
  getColumnType,
  getDefaultOperatorForColumn,
} from './filterHelpers.js';
import { FilterRow } from './FilterRow.js';

interface TableFiltersProps<TData extends object> {
  columns: DataTableColumnDef<TData>[];
  filters: TableFilter[];
  onFiltersChange: (filters: TableFilter[]) => void;
  customFilters?: CustomFilter[];
  customFilterOptions?: CustomFilterOption[];
  /** Upper bound on simultaneous column filters. */
  maxFilters?: number;
}

const DEFAULT_MAX_FILTERS = 3;

const EMPTY_CUSTOM_FILTERS: CustomFilter[] = [];
const EMPTY_CUSTOM_FILTER_OPTIONS: CustomFilterOption[] = [];

export function TableFilters<TData extends object>({
  columns,
  filters,
  onFiltersChange,
  customFilters = EMPTY_CUSTOM_FILTERS,
  customFilterOptions = EMPTY_CUSTOM_FILTER_OPTIONS,
  maxFilters = DEFAULT_MAX_FILTERS,
}: TableFiltersProps<TData>) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const filterableColumns = columns.filter(
    (col) => col.enableColumnFilter !== false && col.accessorKey,
  );

  const columnOptions = filterableColumns.map((col) => ({
    value: col.id || String(col.accessorKey),
    label: z.string().safeParse(col.header).data || String(col.accessorKey),
    type: getColumnType(col),
  }));

  const addFilter = (columnId?: string) => {
    if (filters.length >= maxFilters) {
      return;
    }

    const column =
      filterableColumns.find(
        (col) => (col.id || col.accessorKey) === columnId,
      ) || filterableColumns[0];
    const columnType = column ? getColumnType(column) : 'text';

    const newFilter: TableFilter = {
      id: generateFilterId(),
      columnId: columnId || (columnOptions[0]?.value ?? ''),
      operator: getDefaultOperatorForColumn(column, columnType),
      value: '',
      columnType,
      field: column ? getColumnField(column) : undefined,
    };
    onFiltersChange([...filters, newFilter]);
    setIsMenuOpen(false);
  };

  const updateFilter = (id: string, updates: Partial<TableFilter>) => {
    onFiltersChange(
      filters.map((filter) => {
        if (filter.id !== id) return filter;

        const updated = { ...filter, ...updates };

        if (updates.columnId && updates.columnId !== filter.columnId) {
          const column = filterableColumns.find(
            (col) => (col.id || col.accessorKey) === updates.columnId,
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

  const clearAllFilters = () => {
    onFiltersChange([]);
    customFilters.forEach((cf) => cf.onRemove());
  };

  const hasActiveFilters = filters.length > 0 || customFilters.length > 0;

  return (
    <Box className={classNames.filterBar}>
      {!hasActiveFilters ? (
        <Menu
          opened={isMenuOpen}
          onChange={setIsMenuOpen}
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
            {customFilterOptions.map((option) => (
              <Menu.Item
                key={option.id}
                onClick={() => {
                  option.onAdd();
                  setIsMenuOpen(false);
                }}
              >
                <Text size="xs">{option.label}</Text>
              </Menu.Item>
            ))}
            {customFilterOptions.length > 0 && columnOptions.length > 0 && (
              <Menu.Divider />
            )}
            {columnOptions.map((option) => (
              <Menu.Item
                key={option.value}
                onClick={() => addFilter(option.value)}
              >
                <Text size="xs">{option.label}</Text>
              </Menu.Item>
            ))}
          </Menu.Dropdown>
        </Menu>
      ) : (
        <Group gap="xs" wrap="nowrap" justify="space-between">
          <Group
            gap="xs"
            wrap="nowrap"
            style={{
              flex: 1,
              minWidth: 0,
              overflowX: 'auto',
              overflowY: 'hidden',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
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
            {filters.map((filter) => (
              <FilterRow
                key={filter.id}
                filter={filter}
                columnOptions={columnOptions}
                updateFilter={updateFilter}
                removeFilter={removeFilter}
                filterableColumns={filterableColumns}
              />
            ))}
          </Group>
          <ActionIcon.Group style={{ flexShrink: 0 }}>
            {(filters.length < maxFilters || customFilterOptions.length > 0) && (
              <Menu position="bottom-end" offset={4}>
                <Menu.Target>
                  <Tooltip label="Add filter">
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
                  <Menu.Label>Filter by</Menu.Label>
                  {customFilterOptions.map((option) => (
                    <Menu.Item key={option.id} onClick={option.onAdd}>
                      <Text size="xs">{option.label}</Text>
                    </Menu.Item>
                  ))}
                  {customFilterOptions.length > 0 &&
                    filters.length < maxFilters &&
                    columnOptions.length > 0 && <Menu.Divider />}
                  {filters.length < maxFilters &&
                    columnOptions.map((option) => (
                      <Menu.Item
                        key={option.value}
                        onClick={() => addFilter(option.value)}
                      >
                        <Text size="xs">{option.label}</Text>
                      </Menu.Item>
                    ))}
                </Menu.Dropdown>
              </Menu>
            )}
            <Tooltip label="Clear all">
              <ActionIcon
                aria-label="Clear all"
                variant="subtle"
                color="gray"
                onClick={clearAllFilters}
              >
                <IconClearAll size={16} />
              </ActionIcon>
            </Tooltip>
          </ActionIcon.Group>
        </Group>
      )}
    </Box>
  );
}
