'use client';

import { Alert, Box, Center } from '@mantine/core';

interface EmptyStateProps {
  dataType: string;
  emptyText?: string;
  height: string;
}

export function EmptyState({ dataType, emptyText, height }: EmptyStateProps) {
  return (
    <Box
      style={{
        height,
        alignContent: 'center',
        width: 'auto',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <Center>
        <Alert title={`No ${dataType} to display`} variant="default">
          {emptyText}
        </Alert>
      </Center>
    </Box>
  );
}
