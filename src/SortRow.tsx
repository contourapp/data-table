'use client';

import { ActionIcon, Box, Group, Select } from '@mantine/core';
import { IconArrowsSort, IconX } from '@tabler/icons-react';
import type { SortingState } from '@tanstack/react-table';

import { classNames } from './classNames.js';

export type ColumnSort = SortingState[number];

const DIRECTION_OPTIONS = [
  { value: 'asc', label: 'ascending' },
  { value: 'desc', label: 'descending' },
];

interface SortRowProps {
  sort: ColumnSort;
  columnOptions: { value: string; label: string }[];
  updateSort: (columnId: string, updates: Partial<ColumnSort>) => void;
  removeSort: (columnId: string) => void;
}

/**
 * One sort chip in the table toolbar: the column, its direction, and a control
 * to drop it. Laid out to match `FilterRow` so the two read as one row of
 * controls.
 */
export function SortRow({
  sort,
  columnOptions,
  updateSort,
  removeSort,
}: SortRowProps) {
  return (
    <Group
      gap={0}
      wrap="nowrap"
      style={{
        border: '1px solid var(--mantine-color-gray-4)',
        borderRadius: 'var(--mantine-radius-sm)',
      }}
    >
      <Box className={classNames.chipIcon} aria-hidden>
        <IconArrowsSort size={13} />
      </Box>
      <Select
        size="xs"
        aria-label="Sort column"
        data={columnOptions}
        value={sort.id}
        onChange={(value) => value && updateSort(sort.id, { id: value })}
        styles={{
          input: {
            minWidth: '80px',
            maxWidth: '100px',
            fontWeight: 500,
            border: 'none',
            borderRight: '1px solid var(--mantine-color-gray-3)',
            borderRadius: 0,
          },
        }}
        comboboxProps={{ offset: 4, width: 'max-content' }}
        rightSection={null}
      />
      <Select
        size="xs"
        aria-label="Sort direction"
        data={DIRECTION_OPTIONS}
        value={sort.desc ? 'desc' : 'asc'}
        onChange={(value) =>
          value && updateSort(sort.id, { desc: value === 'desc' })
        }
        styles={{
          input: {
            minWidth: '90px',
            maxWidth: '110px',
            border: 'none',
            borderRight: '1px solid var(--mantine-color-gray-3)',
            borderRadius: 0,
          },
        }}
        comboboxProps={{ offset: 4, width: 'max-content' }}
        rightSection={null}
      />
      <ActionIcon
        aria-label="Clear sort"
        size="sm"
        variant="subtle"
        color="gray"
        h="30px"
        onClick={() => removeSort(sort.id)}
        style={{ borderRadius: 0 }}
      >
        <IconX size={14} />
      </ActionIcon>
    </Group>
  );
}
