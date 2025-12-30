import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db, schema } from '../src/db';
import { eq } from 'drizzle-orm';
import { handler as analyticsHandler } from '../netlify/functions/analytics';
import { setupTestDb } from './test_utils';

const ADMIN_USER_ID = 'bad83e41-5d35-463d-882f-30633f5301ff';
const INVALID_USER_ID = '00000000-0000-0000-0000-000000000000';

describe('Analytics API (PGLite)', () => {
    let client: any;

    beforeEach(async () => {
        const setup = await setupTestDb();
        client = setup.client;

        // Seed Admin User
        await db.insert(schema.users).values({
            id: ADMIN_USER_ID,
            displayName: 'Admin User',
            email: 'admin@example.com',
            isAdmin: true
        });
    });

    afterEach(async () => {
        await client.close();
    });

    const callAnalytics = async (params: any, method: string = 'GET') => {
        const event = {
            httpMethod: method,
            queryStringParameters: params,
        } as any;
        const response = await analyticsHandler(event, {} as any);
        const body = JSON.parse(response?.body || '{}');
        return {
            status: response?.statusCode || 200,
            data: body,
            headers: response?.headers
        };
    };

    describe('GET /api/analytics', () => {
        it('should return 401 when user_id is missing', async () => {
            const { status, data } = await callAnalytics({});
            expect(status).toBe(401);
            expect(data.error).toContain('user_id required');
        });

        it('should return 401 for invalid user_id', async () => {
            const { status, data } = await callAnalytics({ user_id: INVALID_USER_ID });
            // Handler typically returns 401 if user not found or not admin?
            // Existing test expected 401.
            expect(status).toBe(401);
            expect(data.error).toContain('invalid user');
        });

        it('should return analytics data for valid admin user', async () => {
            const { status, data } = await callAnalytics({ user_id: ADMIN_USER_ID });
            expect(status).toBe(200);

            // Verify summary stats structure
            expect(data).toHaveProperty('daily');
            expect(data).toHaveProperty('weekly');
            expect(data).toHaveProperty('monthly');

            // Verify daily stats structure
            expect(data.daily).toHaveProperty('newUsers');
            expect(data.daily).toHaveProperty('newGames');
            expect(data.daily).toHaveProperty('usersChange');
            expect(data.daily).toHaveProperty('gamesChange');

            // Verify data types
            expect(typeof data.daily.newUsers).toBe('number');
            expect(typeof data.daily.newGames).toBe('number');
            expect(typeof data.daily.usersChange).toBe('number');
            expect(typeof data.daily.gamesChange).toBe('number');

            // Verify weekly stats structure
            expect(data.weekly).toHaveProperty('newUsers');
            expect(data.weekly).toHaveProperty('newGames');
            expect(data.weekly).toHaveProperty('usersChange');
            expect(data.weekly).toHaveProperty('gamesChange');

            // Verify monthly stats structure
            expect(data.monthly).toHaveProperty('newUsers');
            expect(data.monthly).toHaveProperty('newGames');
            expect(data.monthly).toHaveProperty('usersChange');
            expect(data.monthly).toHaveProperty('gamesChange');

            // Verify historical data arrays
            expect(data).toHaveProperty('dailyData');
            expect(data).toHaveProperty('weeklyData');
            expect(data).toHaveProperty('monthlyData');
            expect(Array.isArray(data.dailyData)).toBe(true);
            expect(Array.isArray(data.weeklyData)).toBe(true);
            expect(Array.isArray(data.monthlyData)).toBe(true);
            expect(data.dailyData.length).toBe(10);
            expect(data.weeklyData.length).toBe(10);
            expect(data.monthlyData.length).toBe(10);

            // Verify historical data structure
            data.dailyData.forEach((item: any) => {
                expect(item).toHaveProperty('label');
                expect(item).toHaveProperty('newUsers');
                expect(item).toHaveProperty('newGames');
                expect(item).toHaveProperty('returningUsers');
                expect(item).toHaveProperty('returningGames');
                expect(item).toHaveProperty('unfinishedGames');
                expect(item).toHaveProperty('unfinishedPercentage');
                expect(typeof item.unfinishedPercentage).toBe('number');
            });

            // Verify totals structure
            expect(data).toHaveProperty('totals');
            expect(data.totals).toHaveProperty('totalUsers');
            expect(data.totals).toHaveProperty('totalGames');
            expect(data.totals).toHaveProperty('gamesByDifficulty');
            expect(data.totals.gamesByDifficulty).toHaveProperty('easy');
            expect(data.totals.gamesByDifficulty).toHaveProperty('medium');
            expect(data.totals.gamesByDifficulty).toHaveProperty('hard');
            expect(data.totals.gamesByDifficulty).toHaveProperty('extreme');

            // Verify retention metrics structure
            expect(data).toHaveProperty('retention');
            expect(data.retention).toHaveProperty('averageStreak');
            expect(data.retention).toHaveProperty('oneDayRetention');
            expect(data.retention).toHaveProperty('sevenDayRetention');

            // Verify average guesses structure
            expect(data).toHaveProperty('averageGuesses');
            expect(data.averageGuesses).toHaveProperty('overall');
            expect(data.averageGuesses).toHaveProperty('byDifficulty');
            expect(data.averageGuesses.byDifficulty).toHaveProperty('easy');
            expect(data.averageGuesses.byDifficulty).toHaveProperty('medium');
            expect(data.averageGuesses.byDifficulty).toHaveProperty('hard');
            expect(data.averageGuesses.byDifficulty).toHaveProperty('extreme');

            // Verify hourly active users
            expect(data).toHaveProperty('hourlyActiveUsers');
            expect(Array.isArray(data.hourlyActiveUsers)).toBe(true);
            if (data.hourlyActiveUsers.length > 0) {
                expect(data.hourlyActiveUsers[0]).toHaveProperty('hour');
                expect(data.hourlyActiveUsers[0]).toHaveProperty('newUsers');
                expect(data.hourlyActiveUsers[0]).toHaveProperty('returningUsers');
            }

            // Verify today's status (live metrics)
            expect(data).toHaveProperty('todayStatus');
            expect(data.todayStatus).toHaveProperty('gamesLost');
            expect(data.todayStatus).toHaveProperty('gamesLostPercentage');
            expect(data.todayStatus).toHaveProperty('unfinishedGames');
            expect(data.todayStatus).toHaveProperty('unfinishedPercentage');
        });

        it('should return non-negative values for all metrics', async () => {
            const { data } = await callAnalytics({ user_id: ADMIN_USER_ID });

            expect(data.daily.newUsers).toBeGreaterThanOrEqual(0);
            expect(data.daily.newGames).toBeGreaterThanOrEqual(0);
            expect(data.weekly.newUsers).toBeGreaterThanOrEqual(0);
            expect(data.weekly.newGames).toBeGreaterThanOrEqual(0);
            expect(data.monthly.newUsers).toBeGreaterThanOrEqual(0);
            expect(data.monthly.newGames).toBeGreaterThanOrEqual(0);

            expect(data.totals.totalUsers).toBeGreaterThanOrEqual(0);
            expect(data.totals.totalGames).toBeGreaterThanOrEqual(0);
            expect(data.totals.gamesByDifficulty.easy).toBeGreaterThanOrEqual(0);
            expect(data.totals.gamesByDifficulty.medium).toBeGreaterThanOrEqual(0);
            expect(data.totals.gamesByDifficulty.hard).toBeGreaterThanOrEqual(0);
            expect(data.totals.gamesByDifficulty.extreme).toBeGreaterThanOrEqual(0);

            expect(data.retention.averageStreak).toBeGreaterThanOrEqual(0);
            expect(data.retention.oneDayRetention).toBeGreaterThanOrEqual(0);
            expect(data.retention.oneDayRetention).toBeLessThanOrEqual(100);
            expect(data.retention.sevenDayRetention).toBeGreaterThanOrEqual(0);
            expect(data.retention.sevenDayRetention).toBeLessThanOrEqual(100);

            expect(data.averageGuesses.overall).toBeGreaterThanOrEqual(0);
            expect(data.averageGuesses.byDifficulty.easy).toBeGreaterThanOrEqual(0);
            expect(data.averageGuesses.byDifficulty.medium).toBeGreaterThanOrEqual(0);
            expect(data.averageGuesses.byDifficulty.hard).toBeGreaterThanOrEqual(0);
            expect(data.averageGuesses.byDifficulty.extreme).toBeGreaterThanOrEqual(0);
        });

        it('should return percentage changes in valid range', async () => {
            const { data } = await callAnalytics({ user_id: ADMIN_USER_ID });

            expect(Number.isFinite(data.daily.usersChange)).toBe(true);
            expect(Number.isFinite(data.daily.gamesChange)).toBe(true);
            expect(Number.isFinite(data.weekly.usersChange)).toBe(true);
            expect(Number.isFinite(data.weekly.gamesChange)).toBe(true);
            expect(Number.isFinite(data.monthly.usersChange)).toBe(true);
            expect(Number.isFinite(data.monthly.gamesChange)).toBe(true);
        });

        it('should handle CORS preflight request', async () => {
            const event = {
                httpMethod: 'OPTIONS',
            } as any;
            const response = await analyticsHandler(event, {} as any);
            expect(response?.statusCode).toBe(200);
            expect(response?.headers?.['Access-Control-Allow-Origin']).toBe('*');
        });

        it('should reject non-GET methods', async () => {
            const { status } = await callAnalytics({ user_id: ADMIN_USER_ID }, 'POST');
            // Handler should return 405
            expect(status).toBe(405);
        });
    });
});
