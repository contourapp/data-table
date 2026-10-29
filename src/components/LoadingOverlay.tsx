'use client';

import { Progress } from '@mantine/core';

interface FetchMoreProgressProps {
  visible: boolean;
}

export function FetchMoreProgress({ visible }: FetchMoreProgressProps) {
  if (!visible) return null;

  return (
    <Progress
      size="xs"
      value={100}
      animated
      style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}
    />
  );
}
