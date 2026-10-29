import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@contourapp/data-table/styles.css';

import { Badge, MantineProvider, Stack, Text, Title } from '@mantine/core';
import {
  DataTable,
  DataTableConfigProvider,
  TableFilters,
  type DataTableColumnDef,
  type FilterConnector,
  type TableFilter,
} from '@contourapp/data-table';
import type { SortingState } from '@tanstack/react-table';
import { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';

interface Invoice {
  id: string;
  number: string;
  counterparty: string;
  owner: string;
  terms: string;
  amount: number;
  status: string;
  dueAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  paid: 'teal',
  open: 'blue',
  overdue: 'red',
};

const columns: DataTableColumnDef<Invoice>[] = [
  { id: 'number', accessorKey: 'number', header: 'Invoice', meta: { width: 120 } },
  { id: 'counterparty', accessorKey: 'counterparty', header: 'Counterparty' },
  { id: 'owner', accessorKey: 'owner', header: 'Owner', meta: { width: 150 } },
  { id: 'terms', accessorKey: 'terms', header: 'Terms', meta: { width: 110 } },
  {
    id: 'amount',
    accessorKey: 'amount',
    header: 'Amount',
    meta: { width: 130, filterVariant: 'range' },
    cell: ({ row }) => `$${row.original.amount.toLocaleString()}`,
  },
  {
    id: 'status',
    accessorKey: 'status',
    header: 'Status',
    meta: {
      width: 130,
      filterVariant: 'select',
      filterSelectProps: { data: ['paid', 'open', 'overdue'] },
    },
    cell: ({ row }) => (
      <Badge variant="light" color={STATUS_COLORS[row.original.status]} size="sm">
        {row.original.status}
      </Badge>
    ),
  },
  {
    id: 'dueAt',
    accessorKey: 'dueAt',
    header: 'Due',
    meta: { width: 140, filterVariant: 'date-range' },
  },
];

const data: Invoice[] = [
  { id: '1', number: 'INV-1042', counterparty: 'Blue Bottle Roasters', owner: 'A. Okonkwo', terms: 'Net 30', amount: 12450, status: 'open', dueAt: '2026-11-14' },
  { id: '2', number: 'INV-1043', counterparty: 'Mission Produce', owner: 'R. Delgado', terms: 'Net 15', amount: 3280, status: 'paid', dueAt: '2026-11-02' },
  { id: '3', number: 'INV-1044', counterparty: 'Golden Gate Linens', owner: 'A. Okonkwo', terms: 'Due on receipt', amount: 890, status: 'overdue', dueAt: '2026-10-18' },
  { id: '4', number: 'INV-1045', counterparty: 'Ferry Building Dairy', owner: 'S. Lindqvist', terms: 'Net 30', amount: 7625, status: 'paid', dueAt: '2026-12-01' },
  { id: '5', number: 'INV-1046', counterparty: 'Presidio Paper Co', owner: 'R. Delgado', terms: 'Net 45', amount: 1540, status: 'open', dueAt: '2026-11-27' },
  { id: '6', number: 'INV-1047', counterparty: 'Ocean Beach Seafood', owner: 'S. Lindqvist', terms: 'Net 30', amount: 22310, status: 'open', dueAt: '2026-11-09' },
  { id: '7', number: 'INV-1048', counterparty: 'Dolores Bakehouse', owner: 'A. Okonkwo', terms: 'Net 15', amount: 4705, status: 'overdue', dueAt: '2026-10-25' },
];

/**
 * The library hands back a GraphQL-shaped filter for a server to run. This demo
 * has no server, so it reads `tableFilters` directly instead.
 */
const matches = (invoice: Invoice, filter: TableFilter) => {
  const value = String(invoice[filter.columnId as keyof Invoice] ?? '');
  if (filter.value === '') return true;

  switch (filter.operator) {
    case 'contains':
      return value.toLowerCase().includes(filter.value.toLowerCase());
    case 'notContains':
      return !value.toLowerCase().includes(filter.value.toLowerCase());
    case 'equals':
      return value === filter.value;
    case 'notEquals':
      return value !== filter.value;
    case 'greaterThan':
      return Number(value) > Number(filter.value);
    case 'lessThan':
      return Number(value) < Number(filter.value);
    default:
      return true;
  }
};

function App() {
  const [filters, setFilters] = useState<TableFilter[]>([]);
  const [connector, setConnector] = useState<FilterConnector>('and');
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'status', desc: false },
  ]);
  const [navigated, setNavigated] = useState<string | null>(null);

  const rows = useMemo(() => {
    const filtered = data.filter((invoice) =>
      connector === 'and'
        ? filters.every((filter) => matches(invoice, filter))
        : filters.some((filter) => matches(invoice, filter)),
    );

    return [...filtered].sort((a, b) => {
      for (const sort of sorting) {
        const left = a[sort.id as keyof Invoice];
        const right = b[sort.id as keyof Invoice];
        if (left === right) continue;
        const order = left < right ? -1 : 1;
        return sort.desc ? -order : order;
      }
      return 0;
    });
  }, [filters, connector, sorting]);

  return (
    <MantineProvider>
      <DataTableConfigProvider navigate={setNavigated}>
        <Stack gap={0} p="md">
          <Title order={4}>@contourapp/data-table</Title>
          <Text size="sm" c="dimmed" mb="sm">
            {rows.length} of {data.length} invoices
            {navigated ? ` · navigate(${navigated})` : ''}
          </Text>
          <TableFilters
            columns={columns}
            filters={filters}
            onFiltersChange={setFilters}
            connector={connector}
            onConnectorChange={setConnector}
            sorting={sorting}
            onSortingChange={setSorting}
          />
          <DataTable
            dataType="invoices"
            columns={columns}
            data={rows}
            enableTableFilters
            baseHref="/invoices"
            height="340px"
            sorting={sorting}
            onSortingChange={setSorting}
            tableFilters={filters}
            onTableFiltersChange={setFilters}
          />
        </Stack>
      </DataTableConfigProvider>
    </MantineProvider>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
