import { describe, it, expect, beforeAll } from 'vitest';

// Note: These tests require the Netlify dev server to be running
// Run with: npm run netlify:dev (in separate terminal)
// Then run tests with: npm test

const API_BASE_URL = 'http://localhost:8888'; // Default Netlify dev server URL
const ADMIN_USER_ID = 'bad83e41-5d35-463d-882f-30633f5301ff';
const INVALID_USER_ID = '00000000-0000-0000-0000-000000000000';

describe('Analytics API', () => {
    describe('GET /api/analytics', () => {
        it('should return 401 when user_id is missing', async () => {
            const response = await fetch(`${API_BASE_URL}/api/analytics`);
            expect(response.status).toBe(401);

            const data = await response.json();
            expect(data.error).toContain('user_id required');
        });

        it('should return 401 for invalid user_id', async () => {
            const response = await fetch(
                `${API_BASE_URL}/api/analytics?user_id=${INVALID_USER_ID}`
            );
            expect(response.status).toBe(401);

            const data = await response.json();
            expect(data.error).toContain('invalid user');
        });

        it('should return analytics data for valid admin user', async () => {
            const response = await fetch(
                `${API_BASE_URL}/api/analytics?user_id=${ADMIN_USER_ID}`
            );
            expect(response.status).toBe(200);

            const data = await response.json();

            // Verify structure
            expect(data).toHaveProperty('daily');
            expect(data).toHaveProperty('weekly');
            expect(data).toHaveProperty('monthly');

            // Verify daily stats structure
            expect(data.daily).toHaveProperty('newUsers');
            expect(data.daily).toHaveProperty('newGames');
            expect(data.daily).toHaveProperty('usersChange');
            expect(data.daily).toHaveProperty('gamesChange');
            expect(data.daily).toHaveProperty('previousUsers');
            expect(data.daily).toHaveProperty('previousGames');

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
        });

        it('should return non-negative values for user and game counts', async () => {
            const response = await fetch(
                `${API_BASE_URL}/api/analytics?user_id=${ADMIN_USER_ID}`
            );
            const data = await response.json();

            // Check daily
            expect(data.daily.newUsers).toBeGreaterThanOrEqual(0);
            expect(data.daily.newGames).toBeGreaterThanOrEqual(0);
            expect(data.daily.previousUsers).toBeGreaterThanOrEqual(0);
            expect(data.daily.previousGames).toBeGreaterThanOrEqual(0);

            // Check weekly
            expect(data.weekly.newUsers).toBeGreaterThanOrEqual(0);
            expect(data.weekly.newGames).toBeGreaterThanOrEqual(0);

            // Check monthly
            expect(data.monthly.newUsers).toBeGreaterThanOrEqual(0);
            expect(data.monthly.newGames).toBeGreaterThanOrEqual(0);
        });

        it('should return percentage changes in valid range', async () => {
            const response = await fetch(
                `${API_BASE_URL}/api/analytics?user_id=${ADMIN_USER_ID}`
            );
            const data = await response.json();

            // Percentage can be any number (positive, negative, or zero)
            // but should be a number
            expect(Number.isFinite(data.daily.usersChange)).toBe(true);
            expect(Number.isFinite(data.daily.gamesChange)).toBe(true);
            expect(Number.isFinite(data.weekly.usersChange)).toBe(true);
            expect(Number.isFinite(data.weekly.gamesChange)).toBe(true);
            expect(Number.isFinite(data.monthly.usersChange)).toBe(true);
            expect(Number.isFinite(data.monthly.gamesChange)).toBe(true);
        });

        it('should handle CORS preflight request', async () => {
            const response = await fetch(`${API_BASE_URL}/api/analytics`, {
                method: 'OPTIONS',
            });
            expect(response.status).toBe(200);
            expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
        });

        it('should reject non-GET methods', async () => {
            const response = await fetch(
                `${API_BASE_URL}/api/analytics?user_id=${ADMIN_USER_ID}`,
                { method: 'POST' }
            );
            expect(response.status).toBe(405);

            const data = await response.json();
            expect(data.error).toContain('Method not allowed');
        });
    });
});
