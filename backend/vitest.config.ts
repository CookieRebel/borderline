import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    // Load environment variables (including those without VITE_ prefix)
    const env = loadEnv(mode, process.cwd() + '/../', '');

    return {
        test: {
            globals: true,
            environment: 'node',
            include: ['tests/**/*.test.ts'],
            // Timeout for each test (30 seconds to allow for API calls)
            testTimeout: 30000,
            // Inject env vars into process.env
            env: env,
            setupFiles: ['./tests/setup_vitest.ts'],
        },
    };
});
