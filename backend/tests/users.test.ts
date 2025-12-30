import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from '../src/db';
import { users } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { setupTestDb } from './test_utils';

describe('User Management (PGLite)', () => {
    let client: any;

    beforeEach(async () => {
        const setup = await setupTestDb();
        client = setup.client;
    });

    afterEach(async () => {
        await client.close();
    });

    it('should create a new user with default isAdmin=false', async () => {
        const userId = uuidv4();
        const displayName = `TestUser_${userId.substring(0, 8)}`;

        await db.insert(users).values({
            id: userId,
            displayName: displayName,
            email: `test_${userId}@example.com`
        });

        const user = await db.query.users.findFirst({
            where: eq(users.id, userId)
        });

        expect(user).toBeDefined();
        expect(user?.isAdmin).toBe(false);
    });

    it('should allow setting isAdmin to true', async () => {
        const userId = uuidv4();
        const displayName = `AdminUser_${userId.substring(0, 8)}`;

        await db.insert(users).values({
            id: userId,
            displayName: displayName,
            isAdmin: true
        });

        const user = await db.query.users.findFirst({
            where: eq(users.id, userId)
        });

        expect(user).toBeDefined();
        expect(user?.isAdmin).toBe(true);
    });
});
