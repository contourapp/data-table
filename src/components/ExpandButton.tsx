'use client';

import { ActionIcon } from '@mantine/core';
import { IconChevronDown, IconChevronRight } from '@tabler/icons-react';
import { Subscribe } from '@tanstack/react-table';

import type { Row } from '../features.js';

interface ExpandButtonProps<TData extends object> {
  row: Row<TData>;
  size?: string;
  color?: string;
}

export function ExpandButton<TData extends object>({
  row,
  size = 'xs',
  color = 'gray',
}: ExpandButtonProps<TData>) {
  if (!row.getCanExpand()) {
    return null;
  }

  // Subscribing to this row's expanded flag keeps the chevron re-rendering on
  // expansion changes without the surrounding row reading table state.
  return (
    <Subscribe
      source={row.table.atoms.expanded}
      selector={(expanded) => expanded === true || expanded[row.id]}
    >
      {(isExpanded) => (
        <ActionIcon
          aria-label="Toggle row"
          size={size}
          variant="subtle"
          color={color}
          onClick={(e) => {
            e.stopPropagation();
            row.toggleExpanded();
          }}
        >
          {isExpanded ? (
            <IconChevronDown size={16} />
          ) : (
            <IconChevronRight size={16} />
          )}
        </ActionIcon>
      )}
    </Subscribe>
  );
}
