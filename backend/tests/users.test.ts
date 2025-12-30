import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../src/db';
import { users } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

// Helper to clean up
const cleanupUser = async (id: string) => {
    await db.delete(users).where(eq(users.id, id));
};

describe('User Management', () => {
    it('should create a new user with default isAdmin=false', async () => {
        const userId = uuidv4();
        const displayName = `TestUser_${userId.substring(0, 8)}`;

        // Simulate creating a user (direct DB insert for test speed, or mimic API)
        // Here we test the DB schema default
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

        await cleanupUser(userId);
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

        await cleanupUser(userId);
    });
});
