'use client';

import { ActionIcon, Group, Select, Tooltip } from '@mantine/core';
import { IconArrowDown, IconArrowUp, IconX } from '@tabler/icons-react';
import type { SortingState } from '@tanstack/react-table';

import { classNames } from './classNames.js';

export type ColumnSort = SortingState[number];

interface SortRowProps {
  sort: ColumnSort;
  columnOptions: { value: string; label: string }[];
  updateSort: (columnId: string, updates: Partial<ColumnSort>) => void;
  removeSort: (columnId: string) => void;
}

/**
 * One sort chip in the toolbar: the column, an arrow that flips its direction,
 * and a control to drop it.
 *
 * Deliberately a different shape from `FilterRow`. A filter is an expression —
 * column, operator, value — while a sort is a column and a direction, and the
 * arrow here is the same glyph the column's header shows, so the two read as
 * one state.
 */
export function SortRow({
  sort,
  columnOptions,
  updateSort,
  removeSort,
}: SortRowProps) {
  const columnLabel =
    columnOptions.find((option) => option.value === sort.id)?.label ?? sort.id;
  const direction = sort.desc ? 'descending' : 'ascending';
  const flipped = sort.desc ? 'ascending' : 'descending';

  return (
    <Group gap={0} wrap="nowrap" className={classNames.chip}>
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
            borderRight: '1px solid var(--mantine-color-gray-2)',
            borderRadius: 0,
          },
        }}
        comboboxProps={{ offset: 4, width: 'max-content' }}
        rightSection={null}
      />
      <Tooltip label={`${columnLabel} ${direction} — switch to ${flipped}`} openDelay={400}>
        <ActionIcon
          aria-label={`Sort direction: ${direction}. Switch to ${flipped}.`}
          size="sm"
          variant="subtle"
          color="gray"
          h="30px"
          onClick={() => updateSort(sort.id, { desc: !sort.desc })}
          style={{
            borderRadius: 0,
            borderRight: '1px solid var(--mantine-color-gray-2)',
          }}
        >
          {sort.desc ? <IconArrowDown size={14} /> : <IconArrowUp size={14} />}
        </ActionIcon>
      </Tooltip>
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
