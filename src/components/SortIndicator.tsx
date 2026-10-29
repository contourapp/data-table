'use client';

import { IconArrowDown, IconArrowUp, IconArrowsSort } from '@tabler/icons-react';
import { Subscribe } from '@tanstack/react-table';

import { classNames } from '../classNames.js';
import type { Column } from '../features.js';

interface SortIndicatorProps<TData extends object> {
  column: Column<TData>;
}

/**
 * Sort state for one column.
 *
 * The slot is always present on a sortable column so applying a sort never
 * shifts the header text; `styles.css` keeps it invisible until the header is
 * hovered, and solid once the column is actually sorted. Under a multi-column
 * sort each arrow carries its position, since otherwise two sorted columns look
 * identical and the order driving the rows is invisible.
 */
export function SortIndicator<TData extends object>({
  column,
}: SortIndicatorProps<TData>) {
  // Subscribing to sorting keeps the indicator re-rendering on sort changes
  // without the surrounding header reading table state.
  return (
    <Subscribe
      source={column.table.atoms.sorting}
      selector={(sorting) => sorting}
    >
      {(sorting) => {
        const index = sorting.findIndex((sort) => sort.id === column.id);
        const sort = index === -1 ? undefined : sorting[index];

        return (
          <span
            className={classNames.sortIndicator}
            data-active={sort ? true : undefined}
            aria-hidden
          >
            {!sort && <IconArrowsSort size={13} />}
            {sort?.desc === false && <IconArrowUp size={13} />}
            {sort?.desc === true && <IconArrowDown size={13} />}
            {sort && sorting.length > 1 && (
              <span className={classNames.sortPosition}>{index + 1}</span>
            )}
          </span>
        );
      }}
    </Subscribe>
  );
}
