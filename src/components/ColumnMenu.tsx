'use client';

import { ActionIcon, Menu, Text } from '@mantine/core';
import {
  IconArrowDown,
  IconArrowUp,
  IconCheck,
  IconDotsVertical,
  IconFilter,
  IconX,
} from '@tabler/icons-react';
import { Subscribe } from '@tanstack/react-table';
import { useState } from 'react';

import { classNames } from '../classNames.js';
import type { Column } from '../features.js';

interface ColumnMenuProps<TData extends object> {
  column: Column<TData>;
  canSort: boolean;
  /** Omitted when the column cannot be filtered, or the filter cap is reached. */
  onAddFilter?: () => void;
}

/**
 * Per-column control for sorting and filtering, surfaced in the header.
 *
 * Rendered over the right edge of the header cell rather than inside its flow,
 * so adding it costs a column no width; `styles.css` reveals it on hover and
 * keeps it visible while its own menu is open.
 */
export function ColumnMenu<TData extends object>({
  column,
  canSort,
  onAddFilter,
}: ColumnMenuProps<TData>) {
  const [opened, setOpened] = useState(false);

  if (!canSort && !onAddFilter) return null;

  return (
    <Menu
      opened={opened}
      onChange={setOpened}
      position="bottom-end"
      offset={4}
      withinPortal
    >
      <Menu.Target>
        <ActionIcon
          aria-label={`Options for ${column.id}`}
          size="xs"
          variant="subtle"
          color="gray"
          className={classNames.columnMenu}
          data-open={opened || undefined}
          onClick={(event) => event.stopPropagation()}
        >
          <IconDotsVertical size={14} />
        </ActionIcon>
      </Menu.Target>
      {/* The header cell toggles sorting on click, so menu interactions must
          not bubble into it. */}
      <Menu.Dropdown onClick={(event) => event.stopPropagation()}>
        {canSort && (
          <Subscribe
            source={column.table.atoms.sorting}
            selector={(sorting) => sorting.find((sort) => sort.id === column.id)}
          >
            {(sort) => (
              <>
                <Menu.Label>Sort</Menu.Label>
                <Menu.Item
                  leftSection={<IconArrowUp size={14} />}
                  rightSection={
                    sort && !sort.desc ? <IconCheck size={14} /> : null
                  }
                  onClick={() => column.toggleSorting(false)}
                >
                  <Text size="xs">Ascending</Text>
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconArrowDown size={14} />}
                  rightSection={sort?.desc ? <IconCheck size={14} /> : null}
                  onClick={() => column.toggleSorting(true)}
                >
                  <Text size="xs">Descending</Text>
                </Menu.Item>
                {sort && (
                  <Menu.Item
                    leftSection={<IconX size={14} />}
                    onClick={() => column.clearSorting()}
                  >
                    <Text size="xs">Clear sort</Text>
                  </Menu.Item>
                )}
              </>
            )}
          </Subscribe>
        )}
        {canSort && onAddFilter && <Menu.Divider />}
        {onAddFilter && (
          <Menu.Item
            leftSection={<IconFilter size={14} />}
            onClick={onAddFilter}
          >
            <Text size="xs">Add filter</Text>
          </Menu.Item>
        )}
      </Menu.Dropdown>
    </Menu>
  );
}
