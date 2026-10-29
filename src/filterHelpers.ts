import dayjs from 'dayjs';
import type { ReactNode } from 'react';
import { z } from 'zod';

import type { DataTableColumnDef } from './DataTable.js';

type TableFieldMappingConfig = Record<string, TableFieldConfig>;

interface TableFieldConfig {
  field?: string;
  type?: 'string' | 'number' | 'date' | 'boolean' | 'uuid';
  enableSorting?: boolean;
  enableFilter?: boolean;
}

const columnTypeSchema = z.enum([
  'text',
  'number',
  'date',
  'date-range',
  'boolean',
  'select',
]);
const filterOperatorSchema = z.enum([
  'equals',
  'notEquals',
  'contains',
  'notContains',
  'isEmpty',
  'isNotEmpty',
  'greaterThan',
  'greaterThanOrEqual',
  'lessThan',
  'lessThanOrEqual',
  'dateBefore',
  'dateAfter',
  'dateEquals',
  'dateRange',
]);
export const tableFilterSchema = z.object({
  id: z.string(),
  columnId: z.string(),
  operator: filterOperatorSchema,
  value: z.string(),
  columnType: columnTypeSchema.optional(),
  /**
   * Backend field this filter targets. Written from the column's `meta.field`
   * when the filter is created, so a column id that differs from the field name
   * survives being serialized into a URL.
   */
  field: z.string().optional(),
});
const filterConnectorSchema = z.enum(['and', 'or']);

/** How the toolbar's filters are joined together. */
export type FilterConnector = z.infer<typeof filterConnectorSchema>;

export const DEFAULT_FILTER_CONNECTOR: FilterConnector = 'and';

export const parseFilterConnector = (value: unknown): FilterConnector =>
  filterConnectorSchema.safeParse(value).data ?? DEFAULT_FILTER_CONNECTOR;

export type ColumnType = z.infer<typeof columnTypeSchema>;
export type FilterOperator = z.infer<typeof filterOperatorSchema>;
export type TableFilter = z.infer<typeof tableFilterSchema>;

export interface CustomFilter {
  id: string;
  label: string;
  onRemove: () => void;
  onClick?: () => void;
  render?: () => ReactNode;
}

export interface CustomFilterOption {
  id: string;
  label: string;
  onAdd: () => void;
}

const TEXT_OPERATORS = [
  { value: 'contains', label: 'contains' },
  { value: 'notContains', label: 'does not contain' },
  { value: 'isEmpty', label: 'is empty' },
  { value: 'isNotEmpty', label: 'is not empty' },
] satisfies { value: FilterOperator; label: string }[];

const NUMBER_OPERATORS = [
  { value: 'equals', label: '=' },
  { value: 'notEquals', label: '≠' },
  { value: 'greaterThan', label: '>' },
  { value: 'greaterThanOrEqual', label: '≥' },
  { value: 'lessThan', label: '<' },
  { value: 'lessThanOrEqual', label: '≤' },
  { value: 'isEmpty', label: 'is empty' },
  { value: 'isNotEmpty', label: 'is not empty' },
] satisfies { value: FilterOperator; label: string }[];

const DATE_OPERATORS = [
  { value: 'dateBefore', label: 'before' },
  { value: 'dateAfter', label: 'after' },
] satisfies { value: FilterOperator; label: string }[];

const DATE_RANGE_OPERATORS = [
  { value: 'dateRange', label: 'between' },
] satisfies { value: FilterOperator; label: string }[];

const BOOLEAN_OPERATORS = [{ value: 'equals', label: 'is' }] satisfies {
  value: FilterOperator;
  label: string;
}[];

const SELECT_OPERATORS = [
  { value: 'equals', label: 'is' },
  { value: 'notEquals', label: 'is not' },
] satisfies { value: FilterOperator; label: string }[];

/**
 * Builds a blank filter for a column, resolving the type, default operator and
 * backend field from the column def. Shared by the filter bar and the column
 * menu so a filter added from either place is identical.
 */
export function createFilterForColumn<TData extends object>(
  column: DataTableColumnDef<TData> | undefined,
  columnId: string,
): TableFilter {
  const columnType = column ? getColumnType(column) : 'text';

  return {
    id: generateFilterId(),
    columnId,
    operator: getDefaultOperatorForColumn(column, columnType),
    value: '',
    columnType,
    field: column ? getColumnField(column) : undefined,
  };
}

export function generateFilterId(): string {
  return `filter-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function parseDateRangeValue(
  value: string,
): [string | null, string | null] {
  const [start, end] = value.split('|');
  return [start || null, end || null];
}

export function formatDateRangeValue(
  start: string | null,
  end: string | null,
): string {
  return `${start ?? ''}|${end ?? ''}`;
}

export function getColumnType<TData extends object>(
  column: DataTableColumnDef<TData>,
): ColumnType {
  const filterVariant = column.meta?.filterVariant;
  if (filterVariant === 'date-range') {
    return 'date-range';
  }
  if (filterVariant === 'date') {
    return 'date';
  }
  if (filterVariant === 'range') {
    return 'number';
  }
  if (filterVariant === 'checkbox') {
    return 'boolean';
  }
  if (filterVariant === 'select') {
    return 'select';
  }

  if (column.meta?.type) {
    return column.meta.type;
  }

  return 'text';
}

export function getDefaultOperatorForType(type: ColumnType): FilterOperator {
  if (type === 'date-range') return 'dateRange';
  if (type === 'date') return 'dateBefore';
  if (type === 'text') return 'contains';
  return 'equals';
}

/** The type's default operator, unless the column has narrowed it away. */
export function getDefaultOperatorForColumn<TData extends object>(
  column: DataTableColumnDef<TData> | undefined,
  type: ColumnType,
): FilterOperator {
  const fallback = getDefaultOperatorForType(type);
  const allowed = column?.meta?.filterOperators;
  if (!allowed || allowed.includes(fallback)) return fallback;
  return allowed[0] ?? fallback;
}

export function getOperatorsForColumn<TData extends object>(
  column: DataTableColumnDef<TData> | undefined,
  type: ColumnType,
) {
  const operators = getOperatorsForType(type);
  const allowed = column?.meta?.filterOperators;
  if (!allowed) return operators;
  const narrowed = operators.filter((operator) =>
    allowed.includes(operator.value),
  );
  return narrowed.length > 0 ? narrowed : operators;
}

export function getOperatorsForType(type: ColumnType) {
  switch (type) {
    case 'number':
      return NUMBER_OPERATORS;
    case 'date':
      return DATE_OPERATORS;
    case 'date-range':
      return DATE_RANGE_OPERATORS;
    case 'boolean':
      return BOOLEAN_OPERATORS;
    case 'select':
      return SELECT_OPERATORS;
    case 'text':
    default:
      return TEXT_OPERATORS;
  }
}

type GraphQLFilterOperation =
  | 'like'
  | 'notLike'
  | 'ilike'
  | 'notIlike'
  | 'eq'
  | 'ne'
  | 'gt'
  | 'lt'
  | 'gte'
  | 'lte'
  | 'in'
  | 'notIn'
  | 'null';

const OPERATOR_MAP: Record<FilterOperator, GraphQLFilterOperation> = {
  contains: 'ilike',
  notContains: 'notIlike',
  equals: 'eq',
  notEquals: 'ne',
  greaterThan: 'gt',
  lessThan: 'lt',
  greaterThanOrEqual: 'gte',
  lessThanOrEqual: 'lte',
  isEmpty: 'null',
  isNotEmpty: 'null',
  dateBefore: 'lt',
  dateAfter: 'gt',
  dateEquals: 'eq',
  dateRange: 'gte',
};

/**
 * Derives the backend field name from a column id. Dotted ids collapse to their
 * last segment, except a trailing `id`, which folds into the parent as
 * `<parent>Id` (`counterparty.id` becomes `counterpartyId`).
 *
 * Columns whose id does not follow that convention should set `meta.field`.
 */
export function inferFieldName(columnId: string): string {
  if (columnId.includes('.')) {
    const parts = columnId.split('.');
    const lastPart = parts[parts.length - 1];

    if (lastPart === 'id') {
      const prefix = parts[parts.length - 2];
      return `${prefix}Id`;
    }

    return lastPart;
  }

  return columnId;
}

/** The field a column filters and sorts on. */
export function getColumnField<TData extends object>(
  column: DataTableColumnDef<TData>,
): string | undefined {
  const columnId = column.id || column.accessorKey;
  if (!columnId) return undefined;
  return column.meta?.field ?? inferFieldName(column.accessorKey ?? columnId);
}

function transformValue(value: string, columnType?: ColumnType) {
  switch (columnType) {
    case 'date':
      return dayjs(value);
    case 'number':
      return Number.parseFloat(value);
    case 'boolean':
      return value === 'true';
    case undefined:
    case 'date-range':
    case 'select':
    case 'text':
    default:
      return value;
  }
}

/** `isEmpty`/`isNotEmpty` are the only operators that stand on their own. */
function operatorNeedsValue(operator: FilterOperator): boolean {
  return operator !== 'isEmpty' && operator !== 'isNotEmpty';
}

export type TableGraphQLFilter = Record<
  string,
  Partial<Record<GraphQLFilterOperation, ReturnType<typeof transformValue>>>
>;

/** Callers must pair T with columns belonging to that GraphQL filter input. */
export function convertTableFiltersToGraphQL<T = TableGraphQLFilter>(
  tableFilters: TableFilter[],
): T[] {
  return tableFilters.flatMap((filter) => {
    // A newly added filter, or one whose column just changed, starts with no
    // value. Sending it would narrow the query on a choice the user has not
    // made yet - `eq: ''` matches nothing, and an empty boolean reads as false.
    if (operatorNeedsValue(filter.operator) && filter.value === '') {
      return [];
    }

    const field = filter.field ?? inferFieldName(filter.columnId);

    if (filter.operator === 'dateRange') {
      const [start, end] = parseDateRangeValue(filter.value);
      const entries: T[] = [];
      if (start) {
        // SAFETY: The caller supplies columns from T; date columns support the gte operator.
        entries.push({ [field]: { gte: dayjs(start) } } as T);
      }
      if (end) {
        // SAFETY: The caller supplies columns from T; date columns support the lte operator.
        entries.push({ [field]: { lte: dayjs(end).endOf('day') } } as T);
      }
      return entries;
    }

    const operation = OPERATOR_MAP[filter.operator];

    let value: ReturnType<typeof transformValue> | boolean;
    if (filter.operator === 'isEmpty') value = true;
    else if (filter.operator === 'isNotEmpty') value = false;
    else value = transformValue(filter.value, filter.columnType);

    return [
      // SAFETY: The caller pairs T with its column definitions; OPERATOR_MAP emits the matching GraphQL operator.
      {
        [field]: { [operation]: value },
        and: undefined,
        or: undefined,
      } as T,
    ];
  });
}

export function deriveTableFieldMappingFromColumns<TData extends object>(
  columns: DataTableColumnDef<TData>[],
) {
  const config: TableFieldMappingConfig = {};

  columns.forEach((column) => {
    const columnId = column.id || column.accessorKey;
    if (!columnId) return;

    const field = getColumnField(column);

    const columnType = getColumnType(column);
    const typeMap: Record<ColumnType, TableFieldConfig['type']> = {
      number: 'number',
      date: 'date',
      'date-range': 'date',
      boolean: 'boolean',
      text: 'string',
      select: 'string',
    };
    let fieldType = typeMap[columnType];

    if (columnId.toLowerCase().includes('id') && fieldType === 'string') {
      fieldType = 'uuid';
    }

    config[columnId] = {
      field,
      type: fieldType,
      enableSorting: column.enableSorting !== false,
      enableFilter:
        column.enableColumnFilter !== false && columnType !== 'select',
    };
  });

  return config;
}
