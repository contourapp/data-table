'use client';

import { Tooltip, UnstyledButton } from '@mantine/core';

import { classNames } from './classNames.js';
import type { FilterConnector } from './filterHelpers.js';

interface FilterConnectorToggleProps {
  connector: FilterConnector;
  onChange: (connector: FilterConnector) => void;
}

/**
 * The word joining two filter chips, and the control that flips it.
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
  const next = connector === 'and' ? 'or' : 'and';

  return (
    <Tooltip
      label={
        connector === 'and'
          ? 'Every filter must match — switch to any'
          : 'Any filter may match — switch to all'
      }
      openDelay={400}
    >
      <UnstyledButton
        aria-label={`Filters are joined with ${connector}. Switch to ${next}.`}
        className={classNames.filterConnector}
        onClick={() => onChange(next)}
      >
        {connector}
      </UnstyledButton>
    </Tooltip>
  );
}
