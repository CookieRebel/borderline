import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { handler as leaderboardHandler } from '../netlify/functions/leaderboard';
import * as schema from '../src/db/schema';
import { handler as gameHandler } from '../netlify/functions/game';
import { db } from '../src/db';
import { sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { setupTestDb } from './test_utils';

describe('Debug Flag Feature (PGLite)', () => {
    let client: any;

    // Test data
    const testUserId = uuidv4();
    const testUsername = 'FlagTester';
    const testTimezone = 'Australia/Sydney';
    const testWeek = 50;
    const testYear = 2025;

    beforeEach(async () => {
        const setup = await setupTestDb();
        client = setup.client;
    });

    afterEach(async () => {
        await client.close();
    });

    it('should flow end-to-end: Create User -> Play Game -> Check Leaderboard', async () => {
        // 1. Create User
        await db.insert(schema.users).values({
            id: testUserId,
            displayName: testUsername,
            timezone: testTimezone
        });

        // Verify User in DB
        // db is the proxy, accessing current testDb
        const userDb = await db.execute(sql`SELECT * FROM users WHERE id = ${testUserId}`);
        console.log('User in DB:', userDb.rows[0]);
        expect(userDb.rows[0]).toBeDefined();
        // @ts-ignore
        expect(userDb.rows[0].timezone).toBe(testTimezone);

        // 2. Play Game (Start)
        const startRes = await gameHandler({
            httpMethod: 'POST',
            body: JSON.stringify({
                level: 'easy',
                timezone: testTimezone,
                week: testWeek,
                year: testYear
            }),
            headers: { cookie: `borderline_user_id=${testUserId}` }
        } as any, {} as any);
        expect(startRes?.statusCode).toBe(201);
        const gameId = JSON.parse(startRes?.body || '{}').id;

        // 2b. Finish Game (PUT) to record score
        const finishRes = await gameHandler({
            httpMethod: 'PUT',
            body: JSON.stringify({
                id: gameId,
                level: 'easy',
                score: 5000,
                won: true,
                guesses: 1,
                time: 10,
                target_code: 'AU',
                timezone: testTimezone
            }),
            headers: { cookie: `borderline_user_id=${testUserId}` }
        } as any, {} as any);
        expect(finishRes?.statusCode).toBe(200);

        // Verify Game in DB
        const gameDb = await db.execute(sql`SELECT * FROM game_results WHERE user_id = ${testUserId}`);
        console.log('Game in DB:', gameDb.rows);
        expect(gameDb.rows.length).toBeGreaterThan(0);
        // @ts-ignore
        expect(gameDb.rows[0].score).toBe(5000);

        // 3. Check Leaderboard
        const lbRes = await leaderboardHandler({
            httpMethod: 'GET',
            queryStringParameters: {
                level: 'easy',
                week: testWeek.toString(),
                year: testYear.toString()
            },
            headers: { cookie: `borderline_user_id=${testUserId}` }
        } as any, {} as any);

        console.log('Leaderboard Res:', lbRes?.statusCode);
        const lbBody = JSON.parse(lbRes?.body || '{}');
        const userEntry = lbBody.leaderboard.find((e: any) => e.userId === testUserId);

        console.log('User Entry in Leaderboard:', userEntry);

        expect(userEntry).toBeDefined();
        expect(userEntry.timezone).toBe(testTimezone);
    });

    it('should reject request with user_id in query params (Security)', async () => {
        const res = await leaderboardHandler({
            httpMethod: 'GET',
            queryStringParameters: {
                level: 'easy',
                user_id: 'some-id'
            },
            headers: {}
        } as any, {} as any);

        expect(res?.statusCode).toBe(400);
        const body = JSON.parse(res?.body || '{}');
        expect(body.error).toMatch(/forbidden/i);
    });
});
