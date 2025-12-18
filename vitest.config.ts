import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['tests/**/*.test.ts'],
        // Timeout for each test (30 seconds to allow for API calls)
        testTimeout: 30000,
    },
});
