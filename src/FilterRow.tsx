import {
  ActionIcon,
  Group,
  NumberInput,
  Select,
  TextInput,
  type TextInputProps,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { IconX } from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';

import type { DataTableColumnDef } from './DataTable.js';
import {
  type ColumnType,
  type FilterOperator,
  type TableFilter,
  formatDateRangeValue,
  getOperatorsForColumn,
  parseDateRangeValue,
} from './filterHelpers.js';

const DEBOUNCE_MS = 300;

function DebouncedTextInput({
  value: externalValue,
  onDebouncedChange,
  ...props
}: Omit<TextInputProps, 'onChange'> & {
  onDebouncedChange: (value: string) => void;
}) {
  const [localValue, setLocalValue] = useState(String(externalValue ?? ''));
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  const [prevExternal, setPrevExternal] = useState(externalValue);
  if (prevExternal !== externalValue) {
    setPrevExternal(externalValue);
    setLocalValue(String(externalValue ?? ''));
  }

  // Cancelling the pending debounce is a side effect, so it stays out of
  // render: a new external value supersedes whatever the user had queued.
  useEffect(() => {
    clearTimeout(timeoutRef.current);
    // oxlint-disable-next-line react/exhaustive-effect-dependencies -- externalValue is the trigger, not something the body reads
  }, [externalValue]);

  useEffect(() => {
    return () => clearTimeout(timeoutRef.current);
  }, []);

  return (
    <TextInput
      {...props}
      value={localValue}
      onChange={(e) => {
        const val = e.currentTarget.value;
        setLocalValue(val);
        clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          onDebouncedChange(val);
        }, DEBOUNCE_MS);
      }}
    />
  );
}

interface FilterRowProps<TData extends object> {
  filter: TableFilter;
  filterableColumns: DataTableColumnDef<TData>[];
  columnOptions: {
    value: string;
    label: string;
    type: ColumnType;
  }[];
  updateFilter: (id: string, updates: Partial<TableFilter>) => void;
  removeFilter: (id: string) => void;
}

const needsValue = (operator: FilterOperator) => {
  return !['isEmpty', 'isNotEmpty'].includes(operator);
};

export function FilterRow<TData extends object>({
  filter,
  columnOptions,
  filterableColumns,
  updateFilter,
  removeFilter,
}: FilterRowProps<TData>) {
  const columnType = filter.columnType || 'text';
  const filterColumn = filterableColumns.find(
    (col) => (col.id || col.accessorKey) === filter.columnId,
  );
  const operators = getOperatorsForColumn(filterColumn, columnType);

  const renderValueInput = (f: TableFilter) => {
    const { columnType: colType, operator, value } = f;

    if (!needsValue(operator)) {
      return null;
    }

    const commonProps = {
      size: 'xs' as const,
      styles: {
        input: {
          minWidth: '100px',
          maxWidth: '120px',
          border: 'none',
          borderRight: '1px solid var(--mantine-color-gray-3)',
          borderRadius: 0,
        },
      },
    };

    if (colType === 'date-range') {
      const [startStr, endStr] = parseDateRangeValue(value);
      return (
        <DatePickerInput
          size="xs"
          type="range"
          placeholder="Select dates"
          value={[startStr ?? null, endStr ?? null]}
          onChange={(dates) => {
            const [start, end] = dates;
            updateFilter(f.id, {
              value: formatDateRangeValue(
                start ? new Date(start).toISOString() : null,
                end ? new Date(end).toISOString() : null,
              ),
            });
          }}
          valueFormat="MMM DD, YYYY"
          styles={{
            input: {
              minWidth: '220px',
              maxWidth: '260px',
              border: 'none',
              borderRight: '1px solid var(--mantine-color-gray-3)',
              borderRadius: 0,
            },
          }}
        />
      );
    }

    if (colType === 'date') {
      return (
        <DatePickerInput
          {...commonProps}
          placeholder="Select date"
          value={value ? new Date(value) : null}
          onChange={(date) =>
            updateFilter(f.id, {
              value: date ? new Date(date).toISOString() : '',
            })
          }
          valueFormat="MMM DD, YYYY"
        />
      );
    }

    if (colType === 'number') {
      return (
        <NumberInput
          {...commonProps}
          placeholder="Value"
          value={value ? Number.parseFloat(value) : undefined}
          onChange={(val) =>
            updateFilter(f.id, { value: val?.toString() || '' })
          }
        />
      );
    }

    if (colType === 'boolean') {
      return (
        <Select
          {...commonProps}
          data={[
            { value: 'true', label: 'True' },
            { value: 'false', label: 'False' },
          ]}
          value={value}
          onChange={(val) => val && updateFilter(f.id, { value: val })}
          comboboxProps={{ offset: 4, width: 'max-content' }}
        />
      );
    }

    if (colType === 'select') {
      const column = filterableColumns.find(
        (col) => (col.id || col.accessorKey) === f.columnId,
      );
      const selectProps = column?.meta?.filterSelectProps;

      return (
        <Select
          {...commonProps}
          data={selectProps?.data ?? []}
          value={value}
          onChange={(val) => val && updateFilter(f.id, { value: val })}
          placeholder="Select..."
          comboboxProps={{ offset: 4, width: 'max-content' }}
        />
      );
    }

    return (
      <DebouncedTextInput
        {...commonProps}
        placeholder="Value"
        value={value}
        onDebouncedChange={(val) => updateFilter(f.id, { value: val })}
      />
    );
  };

  return (
    <Group
      gap={0}
      wrap="nowrap"
      style={{
        border: '1px solid var(--mantine-color-gray-4)',
        borderRadius: 'var(--mantine-radius-sm)',
      }}
    >
      <Select
        size="xs"
        data={columnOptions}
        value={filter.columnId}
        onChange={(value) =>
          value && updateFilter(filter.id, { columnId: value })
        }
        styles={{
          input: {
            minWidth: '80px',
            maxWidth: '100px',
            fontWeight: 500,
            border: 'none',
            borderRight: '1px solid var(--mantine-color-gray-3)',
            borderRadius:
              'var(--mantine-radius-sm) 0 0 var(--mantine-radius-sm)',
          },
        }}
        comboboxProps={{ offset: 4, width: 'max-content' }}
        rightSection={null}
      />
      {columnType !== 'date-range' && (
        <Select
          size="xs"
          data={operators}
          value={filter.operator}
          onChange={(value) =>
            value &&
            updateFilter(filter.id, {
              operator: value,
            })
          }
          styles={{
            input: {
              minWidth: '70px',
              maxWidth: '100px',
              border: 'none',
              borderRight: '1px solid var(--mantine-color-gray-3)',
              borderRadius: 0,
            },
          }}
          comboboxProps={{ offset: 4, width: 'max-content' }}
          rightSection={null}
        />
      )}
      {renderValueInput(filter)}
      <ActionIcon
        aria-label="Clear filter"
        size="sm"
        variant="subtle"
        color="gray"
        h="30px"
        onClick={() => removeFilter(filter.id)}
        style={{
          borderRadius: 0,
        }}
      >
        <IconX size={14} />
      </ActionIcon>
    </Group>
  );
}
