import dayjs from 'dayjs';
import { describe, expect, it } from 'vitest';

import type { DataTableColumnDef, TableFilter } from '../src/index.js';
import {
  convertTableFiltersToGraphQL,
  generateFilterId,
  getColumnField,
  getDefaultOperatorForColumn,
  getDefaultOperatorForType,
  getOperatorsForColumn,
  getOperatorsForType,
  inferFieldName,
} from '../src/index.js';

describe('getOperatorsForType', () => {
  it('returns 4 operators for text', () => {
    const ops = getOperatorsForType('text');
    expect(ops).toHaveLength(4);
    expect(ops.map((o) => o.value)).toEqual([
      'contains',
      'notContains',
      'isEmpty',
      'isNotEmpty',
    ]);
  });

  it('returns 8 operators for number', () => {
    const ops = getOperatorsForType('number');
    expect(ops).toHaveLength(8);
    const operatorValues = ops.map((o) => o.value);
    expect(operatorValues).toContain('equals');
    expect(operatorValues).toContain('greaterThan');
    expect(operatorValues).toContain('isEmpty');
  });

  it('returns 2 operators for date', () => {
    const ops = getOperatorsForType('date');
    expect(ops).toHaveLength(2);
    expect(ops.map((o) => o.value)).toEqual(['dateBefore', 'dateAfter']);
  });

  it('returns 1 operator for boolean', () => {
    const ops = getOperatorsForType('boolean');
    expect(ops).toHaveLength(1);
    expect(ops[0].value).toBe('equals');
  });

  it('returns 2 operators for select', () => {
    const ops = getOperatorsForType('select');
    expect(ops).toHaveLength(2);
    expect(ops.map((o) => o.value)).toEqual(['equals', 'notEquals']);
  });
});

describe('getDefaultOperatorForType', () => {
  it('returns "contains" for text', () => {
    expect(getDefaultOperatorForType('text')).toBe('contains');
  });

  it('returns "equals" for number', () => {
    expect(getDefaultOperatorForType('number')).toBe('equals');
  });

  it('returns "dateBefore" for date', () => {
    expect(getDefaultOperatorForType('date')).toBe('dateBefore');
  });

  it('returns "equals" for boolean', () => {
    expect(getDefaultOperatorForType('boolean')).toBe('equals');
  });

  it('returns "equals" for select', () => {
    expect(getDefaultOperatorForType('select')).toBe('equals');
  });
});

describe('generateFilterId', () => {
  it('generates a string starting with "filter-"', () => {
    const id = generateFilterId();
    expect(id).toMatch(/^filter-/);
  });

  it('generates unique IDs', () => {
    const ids = new Set(Array.from({ length: 50 }, () => generateFilterId()));
    expect(ids.size).toBe(50);
  });
});

function makeFilter(overrides: Partial<TableFilter>): TableFilter {
  return {
    id: 'f-1',
    columnId: 'name',
    operator: 'contains',
    value: 'test',
    columnType: 'text',
    ...overrides,
  };
}

describe('convertTableFiltersToGraphQL', () => {
  describe('text operators', () => {
    it('maps contains to ilike', () => {
      const result = convertTableFiltersToGraphQL([
        makeFilter({ operator: 'contains', value: 'hello' }),
      ]);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({ name: { ilike: 'hello' } }),
      );
    });

    it('maps notContains to notIlike', () => {
      const result = convertTableFiltersToGraphQL([
        makeFilter({ operator: 'notContains', value: 'hello' }),
      ]);
      expect(result[0]).toEqual(
        expect.objectContaining({ name: { notIlike: 'hello' } }),
      );
    });
  });

  describe('equality operators', () => {
    it('maps equals to eq', () => {
      const result = convertTableFiltersToGraphQL([
        makeFilter({ operator: 'equals', value: 'exact' }),
      ]);
      expect(result[0]).toEqual(
        expect.objectContaining({ name: { eq: 'exact' } }),
      );
    });

    it('maps notEquals to ne', () => {
      const result = convertTableFiltersToGraphQL([
        makeFilter({ operator: 'notEquals', value: 'excluded' }),
      ]);
      expect(result[0]).toEqual(
        expect.objectContaining({ name: { ne: 'excluded' } }),
      );
    });
  });

  describe('numeric operators', () => {
    it('maps greaterThan to gt with number transform', () => {
      const result = convertTableFiltersToGraphQL([
        makeFilter({
          columnId: 'amount',
          operator: 'greaterThan',
          value: '100',
          columnType: 'number',
        }),
      ]);
      expect(result[0]).toEqual(
        expect.objectContaining({ amount: { gt: 100 } }),
      );
    });

    it('maps lessThan to lt', () => {
      const result = convertTableFiltersToGraphQL([
        makeFilter({
          columnId: 'amount',
          operator: 'lessThan',
          value: '50',
          columnType: 'number',
        }),
      ]);
      expect(result[0]).toEqual(
        expect.objectContaining({ amount: { lt: 50 } }),
      );
    });

    it('maps greaterThanOrEqual to gte', () => {
      const result = convertTableFiltersToGraphQL([
        makeFilter({
          columnId: 'amount',
          operator: 'greaterThanOrEqual',
          value: '100',
          columnType: 'number',
        }),
      ]);
      expect(result[0]).toEqual(
        expect.objectContaining({ amount: { gte: 100 } }),
      );
    });

    it('maps lessThanOrEqual to lte', () => {
      const result = convertTableFiltersToGraphQL([
        makeFilter({
          columnId: 'amount',
          operator: 'lessThanOrEqual',
          value: '100',
          columnType: 'number',
        }),
      ]);
      expect(result[0]).toEqual(
        expect.objectContaining({ amount: { lte: 100 } }),
      );
    });
  });

  describe('null operators', () => {
    it('maps isEmpty to null: true', () => {
      const result = convertTableFiltersToGraphQL([
        makeFilter({ operator: 'isEmpty', value: '' }),
      ]);
      expect(result[0]).toEqual(
        expect.objectContaining({ name: { null: true } }),
      );
    });

    it('maps isNotEmpty to null: false', () => {
      const result = convertTableFiltersToGraphQL([
        makeFilter({ operator: 'isNotEmpty', value: '' }),
      ]);
      expect(result[0]).toEqual(
        expect.objectContaining({ name: { null: false } }),
      );
    });
  });

  describe('date operators', () => {
    it('maps dateBefore to lt with dayjs value', () => {
      const result = convertTableFiltersToGraphQL([
        makeFilter({
          columnId: 'createdAt',
          operator: 'dateBefore',
          value: '2024-03-15',
          columnType: 'date',
        }),
      ]);
      const filterObj = result[0];
      expect(filterObj.createdAt).toBeDefined();
      expect(filterObj.createdAt.lt).toBeDefined();
      expect(dayjs.isDayjs(filterObj.createdAt.lt)).toBe(true);
    });

    it('maps dateAfter to gt', () => {
      const result = convertTableFiltersToGraphQL([
        makeFilter({
          columnId: 'createdAt',
          operator: 'dateAfter',
          value: '2024-03-15',
          columnType: 'date',
        }),
      ]);
      const filterObj = result[0];
      expect(filterObj.createdAt.gt).toBeDefined();
    });
  });

  describe('boolean transform', () => {
    it('converts "true" string to boolean true', () => {
      const result = convertTableFiltersToGraphQL([
        makeFilter({
          columnId: 'active',
          operator: 'equals',
          value: 'true',
          columnType: 'boolean',
        }),
      ]);
      expect(result[0]).toEqual(
        expect.objectContaining({ active: { eq: true } }),
      );
    });

    it('converts "false" string to boolean false', () => {
      const result = convertTableFiltersToGraphQL([
        makeFilter({
          columnId: 'active',
          operator: 'equals',
          value: 'false',
          columnType: 'boolean',
        }),
      ]);
      expect(result[0]).toEqual(
        expect.objectContaining({ active: { eq: false } }),
      );
    });
  });

  describe('field resolution', () => {
    it('sends the filter to its explicit field when one is set', () => {
      const result = convertTableFiltersToGraphQL([
        makeFilter({
          columnId: 'dimension_value_name',
          field: 'name',
          operator: 'equals',
          value: 'Ada',
        }),
      ]);
      expect(result[0]).toEqual(
        expect.objectContaining({ name: { eq: 'Ada' } }),
      );
    });

    it('infers a dot-notation id ending in "id" as "<parent>Id"', () => {
      const result = convertTableFiltersToGraphQL([
        makeFilter({
          columnId: 'packageTemplate.id',
          operator: 'equals',
          value: 'tmpl-1',
        }),
      ]);
      expect(result[0]).toEqual(
        expect.objectContaining({ packageTemplateId: { eq: 'tmpl-1' } }),
      );
    });

    it('infers a dot-notation id as its last segment', () => {
      const result = convertTableFiltersToGraphQL([
        makeFilter({
          columnId: 'counterparty.name',
          operator: 'contains',
          value: 'acme',
        }),
      ]);
      expect(result[0]).toEqual(
        expect.objectContaining({ name: { ilike: 'acme' } }),
      );
    });
  });

  describe('multiple filters', () => {
    it('converts multiple filters to array of GraphQL objects', () => {
      const result = convertTableFiltersToGraphQL([
        makeFilter({
          columnId: 'name',
          operator: 'contains',
          value: 'test',
        }),
        makeFilter({
          columnId: 'amount',
          operator: 'greaterThan',
          value: '100',
          columnType: 'number',
        }),
      ]);
      expect(result).toHaveLength(2);
    });
  });
});

describe('filters with no value chosen yet', () => {
  it('skips a text filter whose value is still empty', () => {
    expect(
      convertTableFiltersToGraphQL([
        { id: '1', columnId: 'slug', operator: 'contains', value: '' },
      ]),
    ).toEqual([]);
  });

  it('skips a boolean filter before a value is picked, rather than sending false', () => {
    expect(
      convertTableFiltersToGraphQL([
        {
          id: '1',
          columnId: 'active',
          operator: 'equals',
          value: '',
          columnType: 'boolean',
        },
      ]),
    ).toEqual([]);
  });

  it('skips a select filter before a value is picked, rather than sending an empty string', () => {
    expect(
      convertTableFiltersToGraphQL([
        {
          id: '1',
          columnId: 'listenerType',
          operator: 'equals',
          value: '',
          columnType: 'select',
        },
      ]),
    ).toEqual([]);
  });

  it('still sends isEmpty, which needs no value', () => {
    expect(
      convertTableFiltersToGraphQL([
        { id: '1', columnId: 'name', operator: 'isEmpty', value: '' },
      ]),
    ).toEqual([{ name: { null: true }, and: undefined, or: undefined }]);
  });

  it('keeps a boolean filter once false is explicitly chosen', () => {
    expect(
      convertTableFiltersToGraphQL([
        {
          id: '1',
          columnId: 'active',
          operator: 'equals',
          value: 'false',
          columnType: 'boolean',
        },
      ]),
    ).toEqual([{ active: { eq: false }, and: undefined, or: undefined }]);
  });
});

describe('getOperatorsForColumn', () => {
  it('returns the type default when the column narrows nothing', () => {
    expect(getOperatorsForColumn(undefined, 'text')).toEqual(
      getOperatorsForType('text'),
    );
  });

  it('narrows to the column allowlist', () => {
    const column = {
      meta: { filterOperators: ['contains', 'notContains'] },
    } as Parameters<typeof getOperatorsForColumn>[0];
    expect(getOperatorsForColumn(column, 'text').map((o) => o.value)).toEqual([
      'contains',
      'notContains',
    ]);
  });
});

describe('getDefaultOperatorForColumn', () => {
  it('keeps the type default when it is allowed', () => {
    const column = {
      meta: { filterOperators: ['contains', 'notContains'] },
    } as Parameters<typeof getDefaultOperatorForColumn>[0];
    expect(getDefaultOperatorForColumn(column, 'text')).toBe('contains');
  });

  it('falls back to the first allowed operator when the default is excluded', () => {
    const column = {
      meta: { filterOperators: ['notContains'] },
    } as Parameters<typeof getDefaultOperatorForColumn>[0];
    expect(getDefaultOperatorForColumn(column, 'text')).toBe('notContains');
  });
});

describe('inferFieldName', () => {
  it('leaves a plain id untouched', () => {
    expect(inferFieldName('createdAt')).toBe('createdAt');
  });

  it('folds a trailing "id" segment into its parent', () => {
    expect(inferFieldName('counterparty.id')).toBe('counterpartyId');
  });

  it('takes the last segment of any other dotted id', () => {
    expect(inferFieldName('counterparty.account.name')).toBe('name');
  });
});

describe('getColumnField', () => {
  const column = <T extends object>(def: DataTableColumnDef<T>) => def;

  it('prefers an explicit meta.field', () => {
    expect(
      getColumnField(
        column({ id: 'dimension_value_name', meta: { field: 'name' } }),
      ),
    ).toBe('name');
  });

  it('falls back to inference from the accessor key', () => {
    expect(getColumnField(column({ accessorKey: 'counterparty.id' }))).toBe(
      'counterpartyId',
    );
  });

  it('returns undefined for a column with no id at all', () => {
    expect(getColumnField(column({ header: 'Actions' }))).toBeUndefined();
  });
});
