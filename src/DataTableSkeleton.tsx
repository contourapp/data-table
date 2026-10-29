'use client';

import { Box, Skeleton } from '@mantine/core';

import { classNames as styles } from './classNames.js';

interface DataTableSkeletonProps {
  /** Number of columns to render */
  columns?: number;
  /** Number of skeleton rows */
  rows?: number;
  /** Rows only, aligned to the host table's grid — for rendering inside a
   * DataTable that already shows its own header. */
  bodyTemplateColumns?: string;
}

/**
 * Standalone loading skeleton that mimics a DataTable.
 * Use as a Suspense fallback so the table area shows a skeleton
 * while data is being fetched.
 */
export function DataTableSkeleton({
  columns = 4,
  rows = 10,
  bodyTemplateColumns,
}: DataTableSkeletonProps) {
  const gridTemplateColumns =
    bodyTemplateColumns ??
    Array.from({ length: columns })
      .map(() => '1fr')
      .join(' ');

  if (bodyTemplateColumns) {
    return (
      <>
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <Box
            // eslint-disable-next-line react/no-array-index-key
            key={`skeleton-row-${rowIndex}`}
            className={styles.bodyRow}
            style={{ gridTemplateColumns }}
          >
            {Array.from({ length: columns }).map((__, colIndex) => (
              <Box
                // eslint-disable-next-line react/no-array-index-key
                key={`skeleton-cell-${rowIndex}-${colIndex}`}
                className={styles.bodyCell}
              >
                <Skeleton
                  height={16}
                  radius="sm"
                  width={`${50 + (((rowIndex + colIndex) * 37 + 13) % 40)}%`}
                />
              </Box>
            ))}
          </Box>
        ))}
      </>
    );
  }

  return (
    <Box className={styles.container}>
      {/* Header skeleton */}
      <Box className={styles.headerRow} style={{ gridTemplateColumns }}>
        {Array.from({ length: columns }).map((_, i) => (
          // eslint-disable-next-line react/no-array-index-key
          <Box key={`skeleton-header-${i}`} className={styles.headerCell}>
            <Skeleton
              height={14}
              radius="sm"
              width={`${60 + ((i * 17) % 30)}%`}
            />
          </Box>
        ))}
      </Box>
      {/* Row skeletons */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <Box
          // eslint-disable-next-line react/no-array-index-key
          key={`skeleton-row-${rowIndex}`}
          className={styles.bodyRow}
          style={{ gridTemplateColumns }}
        >
          {Array.from({ length: columns }).map((__, colIndex) => (
            <Box
              // eslint-disable-next-line react/no-array-index-key
              key={`skeleton-cell-${rowIndex}-${colIndex}`}
              className={styles.bodyCell}
            >
              <Skeleton
                height={16}
                radius="sm"
                width={`${50 + (((rowIndex + colIndex) * 37 + 13) % 40)}%`}
              />
            </Box>
          ))}
        </Box>
      ))}
    </Box>
  );
}
