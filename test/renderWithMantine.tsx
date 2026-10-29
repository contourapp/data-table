import { MantineProvider } from '@mantine/core';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';

/**
 * Mantine's `env="test"` disables transitions and portals. Without it, a menu
 * or select dropdown opens but its enter transition never settles under jsdom,
 * leaving the content mounted at `display: none` and invisible to role queries.
 */
export function renderWithMantine(ui: ReactElement) {
  return render(<MantineProvider env="test">{ui}</MantineProvider>);
}
