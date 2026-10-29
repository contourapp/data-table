'use client';

import {
  IconArrowDown,
  IconArrowUp,
  IconArrowsSort,
} from '@tabler/icons-react';
import { Subscribe } from '@tanstack/react-table';

import type { Column } from '../features.js';

interface SortIndicatorProps<TData extends object> {
  column: Column<TData>;
}

export function SortIndicator<TData extends object>({
  column,
}: SortIndicatorProps<TData>) {
  // Subscribing to this column's sort entry keeps the indicator re-rendering on
  // sort changes without the surrounding header reading table state.
  return (
    <Subscribe
      source={column.table.atoms.sorting}
      selector={(sorting) => sorting.find((sort) => sort.id === column.id)}
    >
      {(sort) => {
        if (!sort) {
          return (
            <IconArrowsSort size={14} style={{ marginLeft: 4, opacity: 0.4 }} />
          );
        }

        return sort.desc ? (
          <IconArrowDown size={14} style={{ marginLeft: 4 }} />
        ) : (
          <IconArrowUp size={14} style={{ marginLeft: 4 }} />
        );
      }}
    </Subscribe>
  );
}
