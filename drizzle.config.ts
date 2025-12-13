import { defineConfig } from 'drizzle-kit';

export default defineConfig({
    schema: './src/db/schema.ts',
    out: './drizzle',
    dialect: 'postgresql',
    dbCredentials: {
        host: process.env.DB_HOST || 'enjoy-software.com',
        port: 5432,
        user: process.env.DB_USER || 'borderline',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'borderline_prod',
        ssl: false,
    },
});
