
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import * as schema from '../src/db/schema';
import { dbHolder } from './setup_vitest';
export { dbHolder };

export const setupTestDb = async () => {
    const client = new PGlite();
    const testDb = drizzle(client, { schema });
    dbHolder.current = testDb;
    await migrate(testDb, { migrationsFolder: './drizzle' });
    return { client, testDb };
};
