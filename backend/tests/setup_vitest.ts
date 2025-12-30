
import { vi, beforeAll, afterAll } from 'vitest';
import * as schema from '../src/db/schema';
import type * as DbModule from '../src/db';

// Global DB Holder
export const dbHolder = { current: null as any };

// Global Mock
// This needs to be evaluated before any test imports actual code
vi.mock('../src/db', async (importOriginal) => {
    const actual = await importOriginal<typeof DbModule>();
    return {
        ...actual,
        db: new Proxy({}, {
            get: (_target, prop) => {
                if (!dbHolder.current) throw new Error("DB not initialized in test. Call setupTestDb() in beforeEach.");
                return dbHolder.current[prop as keyof typeof dbHolder.current];
            }
        }),
    };
});
