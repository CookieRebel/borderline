import { config } from 'dotenv';
import path from 'path';

// Allow selecting environment file via MIGRATE_ENV (e.g., 'prod' for '.env.prod')
// Default to standard local '.env' if not specified
const envFile = process.env.MIGRATE_ENV ? `../.env.${process.env.MIGRATE_ENV}` : '../.env';
config({ path: path.resolve(process.cwd(), envFile) });
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
    schema: './src/db/schema.ts',
    out: './drizzle',
    dialect: 'postgresql',
    dbCredentials: {
        host: process.env.DB_HOST || '',
        port: 5432,
        user: process.env.DB_USER || '',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || '',
        ssl: false,
    },
});
