'use client';

import { Checkbox } from '@mantine/core';
import { Subscribe } from '@tanstack/react-table';

import type { Row } from '../features.js';

interface SelectCheckboxProps<TData extends object> {
  row: Row<TData>;
  disabled?: boolean;
}

export function SelectCheckbox<TData extends object>({
  row,
  disabled = false,
}: SelectCheckboxProps<TData>) {
  // Subscribing to just this row's selection keeps the checkbox re-rendering on
  // selection changes without the surrounding row reading table state.
  return (
    <Subscribe
      source={row.table.atoms.rowSelection}
      selector={(selection) => selection[row.id]}
    >
      {(selected) => (
        <Checkbox
          size="xs"
          checked={selected}
          disabled={disabled}
          onChange={row.getToggleSelectedHandler()}
          onClick={(e) => e.stopPropagation()}
        />
      )}
    </Subscribe>
  );
}
