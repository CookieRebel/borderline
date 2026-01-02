import { PGlite } from '@electric-sql/pglite';
import { v4 as uuidv4 } from 'uuid';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { handler } from '../netlify/functions/game';
import * as schema from '../src/db/schema';
import { dbHolder, setupTestDb } from './test_utils';
// Note: dbHolder is imported from test_utils (which re-exports from setup), 
// but we just need dbHolder for seeding if we want, or we can use the returned testDb.
// Let's use dbHolder.current for consistency with seeding helper.

describe('Game Ranking Logic (PGLite)', () => {
    let client: PGlite;

    beforeEach(async () => {
        const setup = await setupTestDb();
        client = setup.client;
    });

    afterEach(async () => {
        await client.close();
    });

    // Helper to create a user and game result
    const seedGame = async (score: number, level: string = 'medium', targetCode: string = 'FRA', userId?: string) => {
        const uid = userId || uuidv4();
        // Create user
        await dbHolder.current.insert(schema.users).values({
            id: uid,
            displayName: `User_${uid.slice(0, 5)}`,
            email: `${uid}@example.com`
        });

        // Create game result
        await dbHolder.current.insert(schema.gameResults).values({
            userId: uid,
            level,
            score,
            won: true, // Only winning games count for rank
            guesses: 5,
            timeSeconds: 60,
            weekNumber: 1,
            year: 2024,
            targetCode
        });
        return uid;
    };

    it('should return "best player" message when rank is 1 (only player)', async () => {
        const userId = uuidv4();
        await seedGame(2000, 'medium', 'FRA', userId); // Score 2000

        // Call the handler to "finish" this game (which effectively just updates it, 
        // but our logic in game.ts actually does an UPDATE.
        // Wait, the handler UPDATES an existing game row.
        // So we need to insert the game row first, then call handler.
        // My seedGame inserts a completed game.
        // The handler logic is: Update attributes -> Calculate Stats.
        // So I should insert a "started" or "completed" game and then call handler with same ID.

        // Let's refine seedGame to return the game ID.
        // Actually, for simplicity, I will just call the ranking logic?
        // No, I want to test the HANDLER e2e logic.

        // Re-setup:
        // 1. Insert User.
        // 2. Insert Game (started or finished).
        // 3. Call Handler (PUT) with new score/won status.

        // Let's manually do it in the test to be clear.
        const uid = uuidv4();
        await dbHolder.current.insert(schema.users).values({ id: uid, displayName: 'Hero', email: 'h@h.com' });

        // Insert a game that is currently being played (or finished, doesn't matter, handler updates it)
        const [game] = await dbHolder.current.insert(schema.gameResults).values({
            userId: uid, level: 'medium', weekNumber: 1, year: 2024, targetCode: 'FRA'
        }).returning();

        // Call handler
        const event = {
            httpMethod: 'PUT',
            body: JSON.stringify({
                id: game.id,
                // user_id removed
                level: 'medium',
                guesses: 1,
                time: 10,
                score: 5000, // Amazing score
                won: true,
                target_code: 'FRA'
            }),
            headers: { cookie: `borderline_user_id=${uid}` }
        } as any;

        const res = await handler(event, {} as any, () => { });
        const body = JSON.parse(res?.body || '{}');

        console.log("Response:", body);
        expect(res?.statusCode).toBe(200);
        expect(body.rankMessage).toBe('You have the best score for this country with a score of 5000.');
    });

    it('should return "second best" message when rank is 2', async () => {
        // 1. Seed a better player
        await seedGame(5000, 'medium', 'FRA'); // Score 5000

        // 2. Setup current player
        const uid = uuidv4();
        await dbHolder.current.insert(schema.users).values({ id: uid, displayName: 'Player2', email: 'p2@p.com' });
        const [game] = await dbHolder.current.insert(schema.gameResults).values({
            userId: uid, level: 'medium', weekNumber: 1, year: 2024, targetCode: 'FRA'
        }).returning();

        // 3. Handler (Score 4000)
        const event = {
            httpMethod: 'PUT',
            body: JSON.stringify({
                id: game.id,
                // user_id removed
                level: 'medium',
                guesses: 2,
                time: 20,
                score: 4000, // Less than 5000
                won: true,
                target_code: 'FRA'
            }),
            headers: { cookie: `borderline_user_id=${uid}` }
        } as any;

        const res = await handler(event, {} as any, () => { });
        const body = JSON.parse(res?.body || '{}');
        expect(body.rankMessage).toBe('You have the second best score for this country with a score of 4000.');
    });

    it('should return specific rank for small pool (<10 games)', async () => {
        // Seed 3 better players
        await seedGame(5000, 'medium', 'FRA');
        await seedGame(4900, 'medium', 'FRA');
        await seedGame(4800, 'medium', 'FRA');

        // Current player will be 4th
        const uid = uuidv4();
        await dbHolder.current.insert(schema.users).values({ id: uid, displayName: 'Player4', email: 'p4@p.com' });
        const [game] = await dbHolder.current.insert(schema.gameResults).values({
            userId: uid, level: 'medium', weekNumber: 1, year: 2024, targetCode: 'FRA'
        }).returning();

        const event = {
            httpMethod: 'PUT',
            body: JSON.stringify({
                id: game.id, gameId: game.id, level: 'medium', guesses: 5, time: 50, score: 3000, won: true, target_code: 'FRA'
            }),
            headers: { cookie: `borderline_user_id=${uid}` }
        } as any;

        const res = await handler(event, {} as any, () => { });
        const body = JSON.parse(res?.body || '{}');

        // Total games = 3 existing + 1 current = 4
        // Rank = 4 (because 3 are better)
        // Message check
        expect(body.rankMessage).toBe('You are ranked #4 out of 4 rounds for this country.');
    });

    it('should return percentile for large pool (>10 games)', async () => {
        // Seed 14 better players
        for (let i = 0; i < 14; i++) {
            await seedGame(5000, 'medium', 'FRA', uuidv4());
        }

        // Total will be 15
        // Rank will be 15.
        // Top % = ceil(15/15 * 100) = 100%. "Top 100%". 
        // Logic says only show if <= 50%. So NO message should appear.

        const uid = uuidv4();
        await dbHolder.current.insert(schema.users).values({ id: uid, displayName: 'BadPlayer', email: 'bad@p.com' });
        const [game] = await dbHolder.current.insert(schema.gameResults).values({
            userId: uid, level: 'medium', weekNumber: 1, year: 2024, targetCode: 'FRA'
        }).returning();

        const event = {
            httpMethod: 'PUT',
            body: JSON.stringify({
                id: game.id, level: 'medium', guesses: 10, time: 999, score: 100, won: true, target_code: 'FRA'
            }),
            headers: { cookie: `borderline_user_id=${uid}` }
        } as any;

        let res = await handler(event, {} as any, () => { });
        expect(JSON.parse(res?.body || '{}').rankMessage).toBe(''); // Empty because > 50%

        // NOW: Test a GOOD percentile.
        // Reset DB or just use a new country 'DEU'.
        // Seed 20 players with score 100 (Bad scores)
        // Seed 1 player (me) with score 5000 (Best).
        // Total = 21. Rank 1.

        const uidGood = uuidv4();
        await dbHolder.current.insert(schema.users).values({ id: uidGood, displayName: 'GoodPlayer', email: 'good@p.com' });
        // Seed 20 bad games
        for (let i = 0; i < 20; i++) {
            await seedGame(100, 'medium', 'DEU');
        }

        // My game
        const [gameGood] = await dbHolder.current.insert(schema.gameResults).values({
            userId: uidGood, level: 'medium', weekNumber: 1, year: 2024, targetCode: 'DEU'
        }).returning();

        const eventGood = {
            httpMethod: 'PUT',
            body: JSON.stringify({
                id: gameGood.id, level: 'medium', guesses: 1, time: 10, score: 5000, won: true, target_code: 'DEU'
            }),
            headers: { cookie: `borderline_user_id=${uidGood}` }
        } as any;

        res = await handler(eventGood, {} as any, () => { });
        const bodyGood = JSON.parse(res?.body || '{}');

        // Rank 1 out of 21.
        // Percentile = ceil(1/21 * 100) = 5%.
        // Expect: "You have the best score  for this country!" (Because Rank 1 logic overrides percentile logic!)
        // Oh right, logic says if (playerRank === 1) ... else ...
        expect(bodyGood.rankMessage).toBe('You have the best score for this country with a score of 5000.');

        // Let's test Rank 3 out of 20 (Top 15%).
        // Seed 2 better players.
        // Seed 17 worse players.
        // Me.
        // Total 20. Rank 3.
        const uid3 = uuidv4();
        await dbHolder.current.insert(schema.users).values({ id: uid3, displayName: 'Player3', email: 'p3@p.com' });

        await seedGame(6000, 'medium', 'USA'); // #1
        await seedGame(5900, 'medium', 'USA'); // #2
        for (let i = 0; i < 17; i++) await seedGame(100, 'medium', 'USA'); // Worse

        const [game3] = await dbHolder.current.insert(schema.gameResults).values({
            userId: uid3, level: 'medium', weekNumber: 1, year: 2024, targetCode: 'USA'
        }).returning();

        const event3 = {
            httpMethod: 'PUT',
            body: JSON.stringify({
                id: game3.id, level: 'medium', guesses: 2, time: 20, score: 5800, won: true, target_code: 'USA'
            }),
            headers: { cookie: `borderline_user_id=${uid3}` }
        } as any; // Rank 3

        res = await handler(event3, {} as any, () => { });
        const body3 = JSON.parse(res?.body || '{}');

        // Total 2 + 17 + 1 = 20.
        // Rank 3.
        // Percentile = ceil(3/20 * 100) = 15%.
        // Message: "You are in the top 15% of players for this country."
        expect(body3.rankMessage).toBe('You are in the top 15% of players for this country.');
    });
});
