import type { Handler } from '@netlify/functions';
import { db } from '../../src/db';
import { sql } from 'drizzle-orm';
import { getUserId } from '../../src/utils/auth';

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
        // GET /api/stats?user_id=xxx&level=easy
        if (event.httpMethod === 'GET') {
            if (event.queryStringParameters?.user_id) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'user_id param is forbidden. Use cookies.' }),
                };
            }

            const userId = getUserId(event);
            const level = event.queryStringParameters?.level;

            if (!userId) {
                return {
                    statusCode: 401,
                    headers,
                    body: JSON.stringify({ error: 'Unauthorized' }),
                };
            }

            if (!level) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'level required' }),
                };
            }

            // Get today's total score for this level
            const todayScoreResult = await db.execute(sql`
                SELECT COALESCE(SUM(score), 0) as total
                FROM game_results
                WHERE user_id = ${userId}
                  AND level = ${level}
                  AND won = true
                  AND DATE(created_at) = CURRENT_DATE
            `);
            const todayScore = Number(todayScoreResult.rows[0]?.total || 0);

            // Get best day score for this level (sum of scores grouped by day)
            const bestDayResult = await db.execute(sql`
                SELECT COALESCE(MAX(day_total), 0) as best
                FROM (
                    SELECT DATE(created_at) as game_date, SUM(score) as day_total
                    FROM game_results
                    WHERE user_id = ${userId}
                      AND level = ${level}
                      AND won = true
                    GROUP BY DATE(created_at)
                ) daily_scores
            `);
            const bestDayScore = Number(bestDayResult.rows[0]?.best || 0);

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ todayScore, bestDayScore }),
            };
        }

        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' }),
        };
    } catch (error) {
        console.error('Stats API error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal server error' }),
        };
    }
};
