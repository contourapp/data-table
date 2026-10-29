'use client';

import { Combobox, UnstyledButton, useCombobox } from '@mantine/core';
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

const OPTIONS: FilterConnector[] = ['and', 'or'];

/**
 * The word joining two filter chips, as a dropdown.
 *
 * A button target rather than a `Select`, so the control is exactly as wide as
 * the word it shows — a text input reserves a field's width whatever is in it,
 * which left the chevron stranded a gap away from `or` and read as two things
 * instead of one. The `combobox`/`option` roles are the same either way.
 *
 * `AND`/`OR` are uppercased in the stylesheet rather than in the markup, so the
 * accessible name stays the ordinary word and the value keeps the lowercase
 * form the search param and the GraphQL filter are written in.
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
  const combobox = useCombobox();

  return (
    <Combobox
      store={combobox}
      position="bottom-start"
      offset={4}
      width="max-content"
      onOptionSubmit={(value) => {
        onChange(parseFilterConnector(value));
        combobox.closeDropdown();
      }}
    >
      <Combobox.Target targetType="button" withExpandedAttribute>
        <UnstyledButton
          aria-label="Join filters with"
          className={classNames.filterConnector}
          onClick={() => combobox.toggleDropdown()}
        >
          {connector}
          <IconChevronDown size={11} stroke={2.5} />
        </UnstyledButton>
      </Combobox.Target>
      <Combobox.Dropdown className={classNames.filterConnectorMenu}>
        <Combobox.Options>
          {OPTIONS.map((option) => (
            <Combobox.Option
              key={option}
              value={option}
              active={option === connector}
            >
              {option}
            </Combobox.Option>
          ))}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}
