import type { Handler } from '@netlify/functions';
import { db, schema } from '../../src/db';
import { eq, and, sql, desc } from 'drizzle-orm';

// Get date in Melbourne timezone (Australia/Melbourne)
const getMelbourneDate = (): Date => {
    const melbourneTime = new Date().toLocaleString('en-US', { timeZone: 'Australia/Melbourne' });
    return new Date(melbourneTime);
};

// Get ISO week number based on Melbourne timezone
const getISOWeek = (): { week: number; year: number } => {
    const melbourne = getMelbourneDate();
    const d = new Date(Date.UTC(melbourne.getFullYear(), melbourne.getMonth(), melbourne.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return { week, year: d.getUTCFullYear() };
};

export const handler: Handler = async (event) => {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' }),
        };
    }

    try {
        const params = event.queryStringParameters || {};
        const level = params.level || 'easy';
        let weekNum = parseInt(params.week || '0', 10);
        let yearNum = parseInt(params.year || '0', 10);

        if (!weekNum || !yearNum) {
            // Get current ISO week based on Melbourne time
            const { week, year } = getISOWeek();
            weekNum = weekNum || week;
            yearNum = yearNum || year;
        }

        // Get top 10 by cumulative score (max 20 games per user per week)
        const leaderboard = await db.execute(sql`
      WITH ranked_games AS (
        SELECT 
          gr.user_id,
          gr.score,
          ROW_NUMBER() OVER (PARTITION BY gr.user_id ORDER BY gr.created_at) as game_num
        FROM game_results gr
        WHERE gr.level = ${level}
          AND gr.week_number = ${weekNum}
          AND gr.year = ${yearNum}
          AND gr.won = true
      ),
      user_scores AS (
        SELECT 
          user_id,
          SUM(score) as total_score,
          COUNT(*) as games_played
        FROM ranked_games
        WHERE game_num <= 20
        GROUP BY user_id
      )
      SELECT 
        us.user_id,
        u.display_name,
        us.total_score,
        us.games_played
      FROM user_scores us
      JOIN users u ON u.id = us.user_id
      ORDER BY us.total_score DESC
      LIMIT 10
    `);

        // Calculate week start date from ISO week number
        const getWeekStartDate = (weekNum: number, yr: number): string => {
            // Find Jan 4 of the year (always in week 1)
            const jan4 = new Date(Date.UTC(yr, 0, 4));
            // Find the Monday of week 1
            const dayOfWeek = jan4.getUTCDay() || 7;
            const monday = new Date(jan4);
            monday.setUTCDate(jan4.getUTCDate() - (dayOfWeek - 1));
            // Add weeks
            monday.setUTCDate(monday.getUTCDate() + (weekNum - 1) * 7);
            // Format as "DD MMM"
            const day = monday.getUTCDate();
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const month = months[monday.getUTCMonth()];
            return `${day} ${month}`;
        };

        const weekStartDate = getWeekStartDate(weekNum, yearNum);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                level,
                week: weekNum,
                year: yearNum,
                weekStartDate,
                leaderboard: leaderboard.rows.map((row, index) => ({
                    rank: index + 1,
                    user_id: row.user_id,
                    display_name: row.display_name,
                    total_score: row.total_score,
                    games_played: row.games_played,
                })),
            }),
        };
    } catch (error) {
        console.error('Leaderboard API error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal server error' }),
        };
    }
};
