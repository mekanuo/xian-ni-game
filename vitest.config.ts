import { defineConfig } from 'vitest/config';
// Keep sibling development checkouts outside this release's test manifest.
export default defineConfig({ test: { include: ['tests/**/*.test.ts'] } });
