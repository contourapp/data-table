'use client';

import { ActionIcon, Tooltip } from '@mantine/core';
import { IconFilter, IconFilterFilled } from '@tabler/icons-react';

import { classNames } from '../classNames.js';

interface ColumnFilterToggleProps {
  columnLabel: string;
  isFiltered: boolean;
  onToggle: () => void;
}

/**
 * Adds a filter for this column, or drops the one it already has.
 *
 * Unfiltered, it stays out of the header's flow and only surfaces on hover, so
 * an unused control costs a column no width. Once the column is filtered it
 * moves into the flow and stays visible — a filtered table is showing a subset
 * of the data, which the header should say outright rather than on hover.
 */
export function ColumnFilterToggle({
  columnLabel,
  isFiltered,
  onToggle,
}: ColumnFilterToggleProps) {
  const label = isFiltered
    ? `Remove filter on ${columnLabel}`
    : `Filter by ${columnLabel}`;

  return (
    <Tooltip label={label} openDelay={400}>
      <ActionIcon
        aria-label={label}
        aria-pressed={isFiltered}
        size="xs"
        variant="subtle"
        color={isFiltered ? undefined : 'gray'}
        className={classNames.columnFilter}
        data-active={isFiltered || undefined}
        onClick={(event) => {
          // The header cell itself toggles sorting.
          event.stopPropagation();
          onToggle();
        }}
      >
        {isFiltered ? <IconFilterFilled size={13} /> : <IconFilter size={13} />}
      </ActionIcon>
    </Tooltip>
  );
}
