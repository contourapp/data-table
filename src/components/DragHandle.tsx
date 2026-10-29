'use client';

import { ActionIcon } from '@mantine/core';
import { IconGripVertical } from '@tabler/icons-react';
import type { DragEvent } from 'react';

interface DragHandleProps {
  rowIndex: number;
  onDragStart: (e: DragEvent<HTMLButtonElement>, index: number) => void;
  onDragOver: (e: DragEvent<HTMLButtonElement>, index: number) => void;
  onDragEnd: () => void;
}

export function DragHandle({
  rowIndex,
  onDragStart,
  onDragOver,
  onDragEnd,
}: DragHandleProps) {
  return (
    <ActionIcon
      aria-label="Drag to reorder"
      size="xs"
      variant="subtle"
      color="gray"
      draggable
      style={{ cursor: 'grab' }}
      onDragStart={(e) => onDragStart(e, rowIndex)}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver(e, rowIndex);
      }}
      onDragEnd={onDragEnd}
      onClick={(e) => e.stopPropagation()}
    >
      <IconGripVertical size={16} />
    </ActionIcon>
  );
}
