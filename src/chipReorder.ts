'use client';

import {
  useState,
  type DragEvent,
  type KeyboardEvent,
  type MouseEvent,
} from 'react';

/** What one chip needs to know to be dragged among its siblings. */
export interface ChipReorder {
  index: number;
  total: number;
  isDragging: boolean;
  /** Which side of this chip the dragged one would land on, if any. */
  dropSide?: 'before' | 'after';
  start: (index: number) => void;
  over: (index: number) => void;
  end: () => void;
  move: (from: number, to: number) => void;
}

/** Moves one item, leaving the rest in order. */
export const reorder = <T,>(items: T[], from: number, to: number): T[] => {
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
};

/**
 * Drag state for one group of chips.
 *
 * Returns a per-chip accessor rather than props, so the two chip shapes share
 * the gesture without sharing a component — a filter is an expression and a
 * sort is a column plus a direction, and that difference is the point.
 */
export function useChipReorder(
  count: number,
  onReorder: (from: number, to: number) => void,
) {
  const [dragging, setDragging] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);

  const end = () => {
    if (dragging !== null && hover !== null && dragging !== hover) {
      onReorder(dragging, hover);
    }
    setDragging(null);
    setHover(null);
  };

  return (index: number): ChipReorder => ({
    index,
    total: count,
    isDragging: dragging === index,
    // The marker goes on the side the chip would land, which is the far side
    // of whatever it is passing: dragging rightwards it lands after the chip
    // under the cursor, leftwards before it.
    dropSide:
      dragging === null || hover !== index || dragging === index
        ? undefined
        : dragging < index
          ? 'after'
          : 'before',
    start: setDragging,
    over: setHover,
    end,
    move: onReorder,
  });
}

const isEditable = (node: EventTarget | null) =>
  node instanceof HTMLElement &&
  !!node.closest('input:not([readonly]), textarea, [contenteditable="true"]');

/**
 * The DOM props that make a chip draggable among its siblings.
 *
 * The whole chip is the handle rather than a grip beside it: order is the
 * thing being dragged and the chip is what carries it, so there is nothing a
 * grip would say that the chip does not — and a grip costs every chip the
 * width of a control most of them never need. A press that lands in an
 * editable field is left alone, so selecting a filter's value still selects
 * it; a press anywhere else arms the drag. A click that never moves reaches
 * whatever it landed on either way, so the controls inside keep working.
 */
export function useChipDragProps(
  chip: ChipReorder | undefined,
  payload: string,
) {
  // Armed on press rather than always on, so a draggable ancestor never eats
  // a text selection inside the chip.
  const [armed, setArmed] = useState(false);

  if (!chip) return {};

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    // Dragging is a mouse gesture, and order is not a cosmetic detail to
    // leave behind a mouse. Alt keeps the arrows clear of the select, and of
    // the caret in any field the chip holds.
    if (!event.altKey) return;
    const delta =
      event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0;
    if (!delta) return;
    const to = chip.index + delta;
    if (to < 0 || to >= chip.total) return;
    event.preventDefault();
    chip.move(chip.index, to);
  };

  return {
    draggable: armed || undefined,
    'data-draggable': true,
    'data-dragging': chip.isDragging || undefined,
    'data-drop-before': chip.dropSide === 'before' || undefined,
    'data-drop-after': chip.dropSide === 'after' || undefined,
    onMouseDown: (event: MouseEvent) => setArmed(!isEditable(event.target)),
    onDragStart: (event: DragEvent<HTMLDivElement>) => {
      // Firefox starts no drag at all without payload on the transfer.
      event.dataTransfer.setData('text/plain', payload);
      event.dataTransfer.effectAllowed = 'move';
      chip.start(chip.index);
    },
    onDragOver: (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      chip.over(chip.index);
    },
    onDrop: (event: DragEvent<HTMLDivElement>) => event.preventDefault(),
    onDragEnd: chip.end,
    onKeyDown: handleKeyDown,
  };
}
