/**
 * Class names applied by the table, mirroring `styles.css`.
 *
 * Exported so hosts can target table internals from their own stylesheets
 * without depending on hashed CSS-module names.
 */
export const classNames = {
  container: 'cdt-container',
  headerRow: 'cdt-header-row',
  headerCell: 'cdt-header-cell',
  bodyRow: 'cdt-body-row',
  bodyCell: 'cdt-body-cell',
  detailPanel: 'cdt-detail-panel',
  systemCell: 'cdt-system-cell',
  actionsCell: 'cdt-actions-cell',
  virtualRow: 'cdt-virtual-row',
  filterBar: 'cdt-filter-bar',
  filterBarScroll: 'cdt-filter-bar-scroll',
  columnMenu: 'cdt-column-menu',
} as const;
