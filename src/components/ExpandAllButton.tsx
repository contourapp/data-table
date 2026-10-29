'use client';

import { ActionIcon } from '@mantine/core';
import { IconChevronDown, IconChevronRight } from '@tabler/icons-react';
import { Subscribe } from '@tanstack/react-table';

import { useTableContext } from '../features.js';

interface ExpandAllButtonProps {
  size?: string;
  color?: string;
}

/**
 * Expand/collapse-all control for a `DataTable` header. Reads the table from
 * context, so it only works when rendered inside a `DataTable`.
 */
export function ExpandAllButton({
  size = 'xs',
  color = 'gray',
}: ExpandAllButtonProps) {
  const table = useTableContext();

  return (
    <Subscribe source={table.atoms.expanded} selector={(expanded) => expanded}>
      {() => {
        const isAllExpanded = table.getIsAllRowsExpanded();
        const ChevronIcon = isAllExpanded ? IconChevronDown : IconChevronRight;
        return (
          <ActionIcon
            aria-label="Expand all rows"
            size={size}
            variant="subtle"
            color={color}
            onClick={(e) => {
              e.stopPropagation();
              table.toggleAllRowsExpanded(!isAllExpanded);
            }}
          >
            <ChevronIcon size={16} />
          </ActionIcon>
        );
      }}
    </Subscribe>
  );
}
