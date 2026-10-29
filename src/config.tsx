'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';

export interface DataTableConfig {
  /**
   * Navigates to a row's detail page when a `DataTable` with `baseHref` is
   * clicked. Wire this to your router so navigation stays client-side — in
   * Next.js, `useRouter().push`. The default triggers a full page load.
   */
  navigate: (href: string) => void;
}

const defaultNavigate = (href: string) => {
  if (typeof window !== 'undefined') window.location.assign(href);
};

const DataTableConfigContext = createContext<DataTableConfig>({
  navigate: defaultNavigate,
});

export interface DataTableConfigProviderProps extends Partial<DataTableConfig> {
  children: ReactNode;
}

/**
 * Supplies host-application wiring to every `DataTable` beneath it. Optional:
 * without it, tables fall back to full page navigation.
 */
export function DataTableConfigProvider({
  navigate = defaultNavigate,
  children,
}: DataTableConfigProviderProps) {
  const config = useMemo<DataTableConfig>(() => ({ navigate }), [navigate]);

  return (
    <DataTableConfigContext value={config}>{children}</DataTableConfigContext>
  );
}

export function useDataTableConfig(): DataTableConfig {
  return useContext(DataTableConfigContext);
}
