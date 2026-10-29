import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  TableFilters,
  type DataTableColumnDef,
  type TableFilter,
} from '../src/index.js';
import { renderWithMantine } from './renderWithMantine.js';

interface Row {
  id: string;
}

const columns: DataTableColumnDef<Row>[] = [
  { id: 'name', accessorKey: 'name', header: 'Name' },
  { id: 'status', accessorKey: 'status', header: 'Status' },
  { id: 'amount', accessorKey: 'amount', header: 'Amount' },
];

const filterOn = (columnId: string, value: string): TableFilter => ({
  id: `f-${columnId}`,
  columnId,
  operator: 'contains',
  value,
  columnType: 'text',
  field: columnId,
});

const sorting = [
  { id: 'name', desc: false },
  { id: 'status', desc: true },
  { id: 'amount', desc: false },
];

const filters = [filterOn('name', 'ada'), filterOn('status', 'open')];

const renderBar = (props: Partial<Parameters<typeof TableFilters<Row>>[0]>) =>
  renderWithMantine(
    <TableFilters
      columns={columns}
      filters={[]}
      onFiltersChange={vi.fn()}
      {...props}
    />,
  );

const chipFor = (element: HTMLElement) => {
  const chip = element.closest('.cdt-chip');
  if (!(chip instanceof HTMLElement)) throw new Error('no chip around element');
  return chip;
};

/** The press that arms the drag, then the gesture itself. */
const dragOnto = (from: HTMLElement, to: HTMLElement) => {
  const dataTransfer = { setData: vi.fn(), effectAllowed: '', dropEffect: '' };
  fireEvent.mouseDown(from);
  fireEvent.dragStart(from, { dataTransfer });
  fireEvent.dragOver(to, { dataTransfer });
  fireEvent.dragEnd(from);
};

describe('reordering sort chips', () => {
  const sortChips = () =>
    screen.getAllByRole('combobox', { name: 'Sort column' }).map(chipFor);

  it('drags a sort past the one in front of it', () => {
    const onSortingChange = vi.fn();
    renderBar({ sorting, onSortingChange });

    const chips = sortChips();
    dragOnto(chips[2], chips[0]);

    expect(onSortingChange).toHaveBeenCalledExactlyOnceWith([
      { id: 'amount', desc: false },
      { id: 'name', desc: false },
      { id: 'status', desc: true },
    ]);
  });

  it('drags a sort backwards, leaving the rest in order', () => {
    const onSortingChange = vi.fn();
    renderBar({ sorting, onSortingChange });

    const chips = sortChips();
    dragOnto(chips[0], chips[2]);

    expect(onSortingChange).toHaveBeenCalledExactlyOnceWith([
      { id: 'status', desc: true },
      { id: 'amount', desc: false },
      { id: 'name', desc: false },
    ]);
  });

  it('does nothing when a chip is dropped on itself', () => {
    const onSortingChange = vi.fn();
    renderBar({ sorting, onSortingChange });

    const chips = sortChips();
    dragOnto(chips[1], chips[1]);

    expect(onSortingChange).not.toHaveBeenCalled();
  });

  it('marks the side the dragged chip would land on', () => {
    renderBar({ sorting, onSortingChange: vi.fn() });

    const chips = sortChips();
    const dataTransfer = { setData: vi.fn(), effectAllowed: '', dropEffect: '' };
    fireEvent.mouseDown(chips[0]);
    fireEvent.dragStart(chips[0], { dataTransfer });
    fireEvent.dragOver(chips[2], { dataTransfer });

    expect(chips[0]).toHaveAttribute('data-dragging');
    // Dragging rightwards, so it lands past the chip it is over.
    expect(chips[2]).toHaveAttribute('data-drop-after');
    expect(chips[2]).not.toHaveAttribute('data-drop-before');
  });

  it('moves a sort with the keyboard, for anyone without a mouse', () => {
    const onSortingChange = vi.fn();
    renderBar({ sorting, onSortingChange });

    fireEvent.keyDown(sortChips()[0], { key: 'ArrowRight', altKey: true });

    expect(onSortingChange).toHaveBeenCalledExactlyOnceWith([
      { id: 'status', desc: true },
      { id: 'name', desc: false },
      { id: 'amount', desc: false },
    ]);
  });

  it('will not walk a sort off either end', () => {
    const onSortingChange = vi.fn();
    renderBar({ sorting, onSortingChange });

    const chips = sortChips();
    fireEvent.keyDown(chips[0], { key: 'ArrowLeft', altKey: true });
    fireEvent.keyDown(chips[2], { key: 'ArrowRight', altKey: true });

    expect(onSortingChange).not.toHaveBeenCalled();
  });

  it('leaves a bare arrow key to the control under it', () => {
    const onSortingChange = vi.fn();
    renderBar({ sorting, onSortingChange });

    fireEvent.keyDown(sortChips()[0], { key: 'ArrowRight' });

    expect(onSortingChange).not.toHaveBeenCalled();
  });

  it('does not make a lone sort draggable, having nothing to pass', () => {
    renderBar({ sorting: [sorting[0]], onSortingChange: vi.fn() });

    expect(sortChips()[0]).not.toHaveAttribute('data-draggable');
  });
});

describe('reordering filter chips', () => {
  const filterChips = () =>
    screen.getAllByRole('combobox', { name: 'Filter column' }).map(chipFor);

  it('drags a filter past its neighbour', () => {
    const onFiltersChange = vi.fn();
    renderBar({ filters, onFiltersChange });

    const chips = filterChips();
    dragOnto(chips[1], chips[0]);

    expect(onFiltersChange).toHaveBeenCalledExactlyOnceWith([
      filters[1],
      filters[0],
    ]);
  });

  it('moves a filter with the keyboard', () => {
    const onFiltersChange = vi.fn();
    renderBar({ filters, onFiltersChange });

    fireEvent.keyDown(filterChips()[1], { key: 'ArrowLeft', altKey: true });

    expect(onFiltersChange).toHaveBeenCalledExactlyOnceWith([
      filters[1],
      filters[0],
    ]);
  });

  it('leaves a press inside the value field undraggable, so it can be selected', () => {
    renderBar({ filters, onFiltersChange: vi.fn() });

    const chip = filterChips()[0];
    const value = chip.querySelector('input:not([readonly])');
    expect(value).not.toBeNull();

    fireEvent.mouseDown(value!);
    expect(chip).not.toHaveAttribute('draggable');

    fireEvent.mouseDown(
      screen.getAllByRole('combobox', { name: 'Filter column' })[0],
    );
    expect(chip).toHaveAttribute('draggable', 'true');
  });

  it('does not make a lone filter draggable', () => {
    renderBar({ filters: [filters[0]], onFiltersChange: vi.fn() });

    expect(filterChips()[0]).not.toHaveAttribute('data-draggable');
  });
});
