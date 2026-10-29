'use client';

import { Tooltip, UnstyledButton } from '@mantine/core';
import { IconArrowsExchange } from '@tabler/icons-react';

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
 *
 * Styled as a bordered pill with a swap glyph, not a bare word — a bare word
 * gave no sign it could be changed.
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
          ? 'Rows must match every filter. Click to match any.'
          : 'Rows may match any filter. Click to match every one.'
      }
      openDelay={300}
    >
      <UnstyledButton
        aria-label={`Filters are joined with ${connector}. Switch to ${next}.`}
        className={classNames.filterConnector}
        onClick={() => onChange(next)}
      >
        {connector}
        <IconArrowsExchange size={12} aria-hidden />
      </UnstyledButton>
    </Tooltip>
  );
}
