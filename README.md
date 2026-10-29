# @contourapp/data-table

A virtualized, filterable data table for React, built on [Mantine](https://mantine.dev) v9 and [TanStack Table](https://tanstack.com/table) v9.

Extracted from Contour, where it backs ~50 admin and reporting tables.

- **One `<DataTable>`** covering sorting, row selection, expansion and sub-rows, grouping, row ordering by drag, row actions, detail panels, infinite scroll with virtualization, empty states and loading skeletons.
- **A filter bar** (`<TableFilters>`) that reads filterable columns straight off your column defs and produces a typed, GraphQL-shaped filter object.
- **URL-synchronized state** — `useTableFilters` and `useTableSorting` keep filters and sorting in the query string, so a filtered table survives a reload or a shared link.
- **CSS-grid layout**, not `<table>`, so column tracks, sticky headers and virtual rows stay consistent.

## Install

```sh
yarn add @contourapp/data-table
```

Peer dependencies you supply: `react`, `react-dom`, `@mantine/core`, `@mantine/dates`, `@mantine/hooks`, `@tabler/icons-react`, `@tanstack/react-table`, `@tanstack/react-virtual`, `dayjs`, `zod`.

Import the stylesheet once, after Mantine's:

```ts
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@contourapp/data-table/styles.css';
```

## Usage

```tsx
import {
  DataTable,
  TableFilters,
  createAppColumnHelper,
  useTableFilters,
  useTableSorting,
  type DataTableColumnDef,
} from '@contourapp/data-table';

interface Invoice {
  id: string;
  number: string;
  amount: number;
  dueAt: string;
}

const columnHelper = createAppColumnHelper<Invoice>();

const columns: DataTableColumnDef<Invoice>[] = columnHelper.columns([
  columnHelper.accessor('number', {
    header: 'Invoice',
    meta: { width: 160 },
  }),
  columnHelper.accessor('amount', {
    header: 'Amount',
    meta: { width: 120, filterVariant: 'range' },
  }),
  columnHelper.accessor('dueAt', {
    header: 'Due',
    meta: { filterVariant: 'date-range' },
  }),
]);

export function InvoicesTable({ searchParams }: { searchParams: Record<string, string> }) {
  const { tableFilters, setTableFilters, filter } = useTableFilters(searchParams);
  const { sorting, orderBy, setSorting } = useTableSorting(searchParams, columns);
  const { data, fetchMore, loading } = useInvoices({ filter, orderBy });

  return (
    <>
      <TableFilters
        columns={columns}
        filters={tableFilters}
        onFiltersChange={setTableFilters}
      />
      <DataTable
        dataType="invoices"
        columns={columns}
        data={data?.invoices}
        isLoading={loading}
        enableTableFilters
        sorting={sorting}
        onSortingChange={setSorting}
        baseHref="/invoices"
        totalRowCount={data?.totalCount}
        onFetchMore={fetchMore}
      />
    </>
  );
}
```

## Column metadata

Presentation and filtering options live on each column's `meta`, which the package augments on TanStack's `ColumnMeta`:

| Key                 | Purpose                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------ |
| `width`             | Lower bound of the column's grid track, in px (default 100).                                |
| `maxWidth`          | Upper bound of the grid track, in px (default `1fr`).                                       |
| `field`             | Backend field this column filters and sorts on, when it differs from the column id.         |
| `type`              | Filter type for columns that do not set `filterVariant`.                                    |
| `filterVariant`     | `text`, `select`, `multi-select`, `date`, `date-range`, `range` or `checkbox`.               |
| `filterSelectProps` | Options for a `select` filter.                                                              |
| `filterOperators`   | Narrows the operators the filter bar offers for this column.                                |
| `aggregatedCell`    | Renders this column's cell on grouped rows in place of `cell`.                               |

### Field names

Filters and sorting target a backend field derived from the column id: a plain id is used as-is, a dotted id collapses to its last segment, and a dotted id ending in `id` folds into its parent (`counterparty.id` becomes `counterpartyId`). When a column id does not follow that convention, set `meta.field` and the filter bar will carry it through — including into the URL, so a shared link filters the right column.

## Router integration

`baseHref` navigates when a row is clicked. By default that is a full page load; wrap your app in `DataTableConfigProvider` to route it through your router instead. In Next.js:

```tsx
'use client';

import { DataTableConfigProvider } from '@contourapp/data-table';
import { useRouter } from 'next/navigation';

export function DataTableProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  return (
    <DataTableConfigProvider navigate={router.push}>
      {children}
    </DataTableConfigProvider>
  );
}
```

## Theming

Colours and spacing come from Mantine CSS variables, so the table inherits the host theme. Three variables are table-specific:

| Variable                    | Default              | Effect                                 |
| --------------------------- | -------------------- | -------------------------------------- |
| `--table-border-color`      | `--mantine-color-gray-3` | Header and row borders.            |
| `--tr-hover-bg`             | `--mantine-color-gray-0` | Row hover background.              |
| `--app-shell-header-height` | `0px`                | Subtracted from the default full-height table. |

Class names are stable and exported as `classNames` for targeting table internals from your own stylesheet. Mark an element inside a cell with `data-hover-action` to have it fade in only on row hover.

## Filter output

`useTableFilters` returns a `filter` shaped for a GraphQL filter input — `{ and: [{ field: { op: value } }] }` — using operators `eq`, `ne`, `gt`, `gte`, `lt`, `lte`, `ilike`, `notIlike` and `null`. Pass your schema's generated filter type as the hook's type parameter to have it checked:

```ts
const { filter } = useTableFilters<InvoiceFilter>(searchParams);
```

Filters with no value chosen yet are dropped rather than sent, so a half-configured filter never narrows a query. If your backend speaks a different dialect, read `tableFilters` directly and translate it yourself.

## Development

```sh
yarn install
yarn test     # vitest
yarn tsc      # type-check
yarn build    # tsc -> dist/, plus styles.css
```

## License

Unlicensed / proprietary. Internal to Contour unless stated otherwise.
