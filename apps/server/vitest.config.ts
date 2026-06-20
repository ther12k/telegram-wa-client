import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    // Allow loading bun built-in modules during tests
    server: {
      deps: {
        inline: ['bun:sqlite', 'node:fs', 'node:path', 'node:crypto'],
      },
    },
  },
})
