# @contourapp/data-table

A virtualized, filterable data table for React, built on [Mantine](https://mantine.dev) v9 and [TanStack Table](https://tanstack.com/table) v9.

Extracted from Contour, where it backs ~50 admin and reporting tables.

- **One `<DataTable>`** covering sorting, row selection, expansion and sub-rows, grouping, row ordering by drag, row actions, detail panels, infinite scroll with virtualization, empty states and loading skeletons.
- **A toolbar** (`<TableFilters>`) holding both filter and sort chips, built from your column defs, producing a typed GraphQL-shaped filter object and a TanStack `SortingState`.
- **Headers that show their own state** — an arrow on sorted columns, a funnel on filtered ones, and a one-click toggle to filter a column, all costing nothing while unused.
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
        sorting={sorting}
        onSortingChange={setSorting}
      />
      <DataTable
        dataType="invoices"
        columns={columns}
        data={data?.invoices}
        isLoading={loading}
        enableTableFilters
        sorting={sorting}
        onSortingChange={setSorting}
        tableFilters={tableFilters}
        onTableFiltersChange={setTableFilters}
        baseHref="/invoices"
        totalRowCount={data?.totalCount}
        onFetchMore={fetchMore}
      />
    </>
  );
}
```

## Filtering and sorting

Both live in the same toolbar, as removable chips. Pass the same state to
`TableFilters` and `DataTable` and the two stay in step.

- **`TableFilters`** renders a `Filter` and a `Sort` button when nothing is
  applied, and chips plus an add/clear group once something is. Each chip is a
  column, an operator or direction, and a value. Caps default to three of each
  (`maxFilters`, `maxSorts`); omit `onSortingChange` to keep sorting out of the
  bar entirely.
- **Headers** carry the same two states, and nothing else. Clicking a header
  sorts it, as it always has. A funnel button on the right adds a filter for
  that column, or removes the one it has.

Each state is quiet until it means something:

| Column is           | Header shows                                              |
| ------------------- | --------------------------------------------------------- |
| sortable, unsorted  | nothing; a faint `⇅` on hover                              |
| sorted              | `↑` or `↓` in the accent colour, beside the label          |
| sorted, among many  | the same arrow with its position, so `↑1` leads `↓2`       |
| filterable          | nothing; a faint outline funnel on hover, which adds a filter |
| filtered            | a filled funnel in the accent colour, which removes it     |

The sort slot is reserved on every sortable column, so sorting one never shifts
its label, and the funnel only enters the header's flow once the column is
actually filtered — an unused control costs a column no width.

Sorting and filtering are different operations — one reorders rows, the other
hides them — so they never share a glyph. The toolbar chips lead with the same
two glyphs their headers use, which is what tells a filter chip from a sort
chip at a glance.

Sorts apply in chip order, so in `Status ascending, Amount descending` the
amount breaks ties within a status. Clicking a header **replaces** the sort,
matching what clicking a header has always done; adding from the toolbar
**appends** one, which is where multi-column sorts get composed.

Filtering addresses a column by its accessor key, so accessor-function columns
are offered for sorting but not filtering.

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
| `--cdt-active-color`        | `--mantine-primary-color-filled` | Sorted and filtered header indicators. |
| `--tr-hover-bg`             | `--mantine-color-gray-0` | Row hover background.              |
| `--app-shell-header-height` | `0px`                | Subtracted from the default full-height table. |

Class names are stable and exported as `classNames` for targeting table internals from your own stylesheet. Mark an element inside a cell with `data-hover-action` to have it fade in only on row hover.

The stylesheet is plain, globally-scoped CSS rather than a CSS module. That mirrors what Mantine itself publishes — a single prebuilt `styles.css` with static class names — so consumers need no CSS-module support, and it keeps the build to `tsc` alone. The tradeoff is that `cdt-*` lives in the global namespace; the prefix is the only thing keeping it out of your way.

## Filter output

`useTableFilters` returns a `filter` shaped for a GraphQL filter input — `{ and: [{ field: { op: value } }] }` — using operators `eq`, `ne`, `gt`, `gte`, `lt`, `lte`, `ilike`, `notIlike` and `null`. Pass your schema's generated filter type as the hook's type parameter to have it checked:

```ts
const { filter } = useTableFilters<InvoiceFilter>(searchParams);
```

Filters with no value chosen yet are dropped rather than sent, so a half-configured filter never narrows a query. If your backend speaks a different dialect, read `tableFilters` directly and translate it yourself.

**Every filter is ANDed.** `useTableFilters` emits a single `and` array and the
toolbar offers no `or`; the emitted objects carry empty `and`/`or` slots only to
satisfy a recursive GraphQL filter input. Note that `baseFilters` must stay
ANDed whatever the user picks — they usually scope a query to an organization or
a tenant, and folding them into an `or` would widen it rather than narrow it:

```ts
// if OR is ever added, this is the shape, not `{ or: [...everything] }`
{ and: [...baseFilters, { or: userFilters }] }
```

## Development

```sh
yarn install
yarn test     # vitest
yarn tsc      # type-check
yarn build    # tsc -> dist/, plus styles.css
```

`example/` is a plain Vite app — no Next.js — that links the package from
source. It is the quickest way to see a change:

```sh
cd example && yarn install && yarn dev
```

Tests render through `test/renderWithMantine.tsx`, which sets Mantine's
`env="test"`. Without it, dropdowns mount but their enter transition never
settles under jsdom, so menu items stay invisible to role queries.

## License

[MIT](./LICENSE) © Contour
