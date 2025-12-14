import type { Handler } from '@netlify/functions';
import { db, schema } from '../../src/db';
import { eq, sql, and, gte } from 'drizzle-orm';

// Check if dates are the same calendar day
const isSameDay = (date1: Date, date2: Date): boolean => {
    return date1.getUTCFullYear() === date2.getUTCFullYear() &&
        date1.getUTCMonth() === date2.getUTCMonth() &&
        date1.getUTCDate() === date2.getUTCDate();
};

export const handler: Handler = async (event) => {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        // POST /api/user - Create or get user
        if (event.httpMethod === 'POST') {
            const body = JSON.parse(event.body || '{}');
            const { id, display_name } = body;

            if (!id || !display_name) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'id and display_name required' }),
                };
            }

            // Check if user exists
            const existing = await db.query.users.findFirst({
                where: eq(schema.users.id, id),
            });

            // Check if display name is taken by another user (case-insensitive)
            // SQL: SELECT * FROM users WHERE lower(display_name) = lower(display_name) AND id != id
            const nameTaken = await db.query.users.findFirst({
                where: sql`lower(${schema.users.displayName}) = lower(${display_name}) AND ${schema.users.id} != ${id}`,
            });

            if (nameTaken) {
                return {
                    statusCode: 409,
                    headers,
                    body: JSON.stringify({ error: 'Username already taken' }),
                };
            }

            if (existing) {
                // Update display name if changed
                if (existing.displayName !== display_name) {
                    await db.update(schema.users)
                        .set({ displayName: display_name })
                        .where(eq(schema.users.id, id));
                }
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        ...existing,
                        displayName: display_name,
                    }),
                };
            }

            // Create new user
            const [newUser] = await db.insert(schema.users)
                .values({ id, displayName: display_name })
                .returning();

            return {
                statusCode: 201,
                headers,
                body: JSON.stringify(newUser),
            };
        }

        // GET /api/user/:id - Get user by ID with day scores
        if (event.httpMethod === 'GET') {
            const id = event.path.split('/').pop();

            if (!id) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'User ID required' }),
                };
            }

            const user = await db.query.users.findFirst({
                where: eq(schema.users.id, id),
            });

            if (!user) {
                return {
                    statusCode: 404,
                    headers,
                    body: JSON.stringify({ error: 'User not found' }),
                };
            }

            // Check if user played today
            const now = new Date();
            const playedToday = user.lastPlayedAt ? isSameDay(user.lastPlayedAt, now) : false;

            // Get today's total score (using CURRENT_DATE for database timezone)
            const todayScoreResult = await db.execute(sql`
                SELECT COALESCE(SUM(score), 0) as total
                FROM game_results
                WHERE user_id = ${id}
                  AND won = true
                  AND DATE(created_at) = CURRENT_DATE
            `);
            const todayScore = Number(todayScoreResult.rows[0]?.total || 0);

            // Get best day score (sum of scores grouped by day)
            const bestDayResult = await db.execute(sql`
                SELECT COALESCE(MAX(day_total), 0) as best
                FROM (
                    SELECT DATE(created_at) as game_date, SUM(score) as day_total
                    FROM game_results
                    WHERE user_id = ${id} AND won = true
                    GROUP BY DATE(created_at)
                ) daily_scores
            `);
            const bestDayScore = Number(bestDayResult.rows[0]?.best || 0);

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    ...user,
                    playedToday,
                    todayScore,
                    bestDayScore,
                }),
            };
        }

        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' }),
        };
    } catch (error) {
        console.error('User API error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal server error' }),
        };
    }
};
