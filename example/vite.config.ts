import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: {
    // The package is linked from the parent directory, which carries its own
    // dev copies of every peer dependency. Without deduping, the app and the
    // library each get their own React and Mantine context and nothing works.
    dedupe: [
      'react',
      'react-dom',
      '@mantine/core',
      '@mantine/dates',
      '@mantine/hooks',
      '@tanstack/react-table',
      '@tanstack/react-virtual',
    ],
  },
});
