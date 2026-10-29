'use client';

import { Select } from '@mantine/core';
import { IconChevronDown } from '@tabler/icons-react';

import { classNames } from './classNames.js';
import {
  parseFilterConnector,
  type FilterConnector,
} from './filterHelpers.js';

interface FilterConnectorToggleProps {
  connector: FilterConnector;
  onChange: (connector: FilterConnector) => void;
}

const OPTIONS: { value: FilterConnector; label: string }[] = [
  { value: 'and', label: 'and' },
  { value: 'or', label: 'or' },
];

/**
 * The word joining two filter chips, as a dropdown.
 *
 * One connector governs the whole bar rather than each gap independently:
 * mixing them would silently depend on precedence the row cannot show. Groups
 * are the answer to genuinely mixed logic, and they need more room than a
 * single row of chips has.
 */
export function FilterConnectorToggle({
  connector,
  onChange,
}: FilterConnectorToggleProps) {
  return (
    <Select
      size="xs"
      variant="unstyled"
      aria-label="Join filters with"
      className={classNames.filterConnector}
      data={OPTIONS}
      value={connector}
      onChange={(value) => value && onChange(parseFilterConnector(value))}
      allowDeselect={false}
      rightSection={<IconChevronDown size={12} />}
      rightSectionWidth={18}
      comboboxProps={{ offset: 4, width: 'max-content' }}
    />
  );
}
