import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db, schema } from '../src/db';
import { eq } from 'drizzle-orm';
import { handler } from '../netlify/functions/pick_target';
import { setupTestDb } from './test_utils';

describe('Unique Country Selection Integration Test (PGLite)', () => {
    let testUserId: string;
    const candidates = ['FRA', 'GBR', 'ITA']; // France, UK, Italy
    let client: any;

    // Helper to call the Netlify Function handler
    const callPickTarget = async (userId: string, candidateList: string[]) => {
        const event = {
            httpMethod: 'POST',
            body: JSON.stringify({ user_id: userId, candidates: candidateList }),
        } as any;
        const response = await handler(event, {} as any);
        return JSON.parse(response?.body || '{}');
    };

    beforeEach(async () => {
        const setup = await setupTestDb();
        client = setup.client;

        // Create a temporary test user
        const [user] = await db.insert(schema.users)
            .values({
                displayName: 'Test User Agent',
                email: `test_agent_${Date.now()}@example.com`
            })
            .returning();
        testUserId = user.id;
    });

    afterEach(async () => {
        await client.close();
    });

    it('should pick any country when no history exists (all counts 0)', async () => {
        const result = await callPickTarget(testUserId, candidates);
        expect(candidates).toContain(result.target);
        expect(result.debug.minCount).toBe(0);
        expect(result.debug.poolSize).toBe(3); // All 3 are eligible
    });

    it('should prioritize unplayed countries over played ones', async () => {
        // Seed history: User has played FRA once
        await db.insert(schema.gameResults).values({
            userId: testUserId,
            level: 'easy',
            guesses: 1,
            timeSeconds: 10,
            score: 1000,
            won: true,
            weekNumber: 1,
            year: 2024,
            targetCode: 'FRA'
        });

        // Now FRA has count 1, GBR/ITA have count 0
        const result = await callPickTarget(testUserId, candidates);

        // Should pick GBR or ITA, but NOT FRA
        expect(['GBR', 'ITA']).toContain(result.target);
        expect(result.target).not.toBe('FRA');
        expect(result.debug.minCount).toBe(0);
        expect(result.debug.poolSize).toBe(2);
    });

    it('should prioritize least played countries when multiple rounds exist', async () => {
        // Seed history: FRA=1, GBR=1, ITA=0
        await db.insert(schema.gameResults).values([
            {
                userId: testUserId,
                level: 'easy',
                guesses: 1,
                timeSeconds: 10,
                score: 1000,
                won: true,
                weekNumber: 1,
                year: 2024,
                targetCode: 'FRA'
            },
            {
                userId: testUserId,
                level: 'easy',
                guesses: 1,
                timeSeconds: 10,
                score: 1000,
                won: true,
                weekNumber: 1,
                year: 2024,
                targetCode: 'GBR'
            }
        ]);

        const result = await callPickTarget(testUserId, candidates);

        // Only ITA has 0 plays. MUST pick ITA.
        expect(result.target).toBe('ITA');
        expect(result.debug.minCount).toBe(0);
        expect(result.debug.poolSize).toBe(1);
    });

    it('should cycle back to random when all have been played equally', async () => {
        // Seed history: FRA=1, GBR=1, ITA=1
        await db.insert(schema.gameResults).values([
            {
                userId: testUserId,
                level: 'easy',
                guesses: 1,
                timeSeconds: 10,
                score: 1000,
                won: true,
                weekNumber: 1,
                year: 2024,
                targetCode: 'FRA'
            },
            {
                userId: testUserId,
                level: 'easy',
                guesses: 1,
                timeSeconds: 10,
                score: 1000,
                won: true,
                weekNumber: 1,
                year: 2024,
                targetCode: 'GBR'
            },
            {
                userId: testUserId,
                level: 'easy',
                guesses: 1,
                timeSeconds: 10,
                score: 1000,
                won: true,
                weekNumber: 1,
                year: 2024,
                targetCode: 'ITA'
            }
        ]);

        const result = await callPickTarget(testUserId, candidates);

        // All have count 1. Should pick any of the 3.
        expect(candidates).toContain(result.target);
        expect(result.debug.minCount).toBe(1);
        expect(result.debug.poolSize).toBe(3);
    });
});
