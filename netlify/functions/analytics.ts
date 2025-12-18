import type { Handler } from '@netlify/functions';
import { db, schema } from '../../src/db';
import { sql, gte, and, eq } from 'drizzle-orm';

// Get date in Melbourne timezone (Australia/Melbourne)
const getMelbourneDate = (): Date => {
    const melbourneTime = new Date().toLocaleString('en-US', { timeZone: 'Australia/Melbourne' });
    return new Date(melbourneTime);
};

// Get start of day in Melbourne time
const getMelbourneStartOfDay = (date: Date): Date => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    return new Date(year, month, day, 0, 0, 0, 0);
};

// Calculate stats for a given period
const getStatsForPeriod = async (startDate: Date, endDate: Date) => {
    // Count new users in period
    const newUsersResult = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM users
        WHERE created_at >= ${startDate.toISOString()}
          AND created_at < ${endDate.toISOString()}
    `);
    const newUsers = Number(newUsersResult.rows[0]?.count || 0);

    // Count new games in period
    const newGamesResult = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM game_results
        WHERE created_at >= ${startDate.toISOString()}
          AND created_at < ${endDate.toISOString()}
    `);
    const newGames = Number(newGamesResult.rows[0]?.count || 0);

    return { newUsers, newGames };
};

// Calculate percentage change
const calculatePercentageChange = (current: number, previous: number): number => {
    if (previous === 0) {
        return current > 0 ? 100 : 0;
    }
    return Math.round(((current - previous) / previous) * 100);
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

    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' }),
        };
    }

    try {
        // Get admin userId from query params
        const adminUserId = event.queryStringParameters?.user_id;

        if (!adminUserId) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ error: 'Unauthorized - user_id required' }),
            };
        }

        // Verify user exists (basic check - you can add more sophisticated admin verification)
        const user = await db.query.users.findFirst({
            where: eq(schema.users.id, adminUserId),
        });

        if (!user) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ error: 'Unauthorized - invalid user' }),
            };
        }

        const now = getMelbourneDate();
        const todayStart = getMelbourneStartOfDay(now);

        // Calculate last 10 days
        const dailyData = [];
        for (let i = 9; i >= 0; i--) {
            const dayStart = new Date(todayStart);
            dayStart.setDate(dayStart.getDate() - i);
            const dayEnd = new Date(dayStart);
            dayEnd.setDate(dayEnd.getDate() + 1);

            const stats = await getStatsForPeriod(dayStart, dayEnd);
            const dateStr = dayStart.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' });

            dailyData.push({
                label: dateStr,
                newUsers: stats.newUsers,
                newGames: stats.newGames,
            });
        }

        // Calculate last 10 weeks (Monday to Sunday)
        const weeklyData = [];
        const todayDayOfWeek = now.getDay();
        const daysFromMonday = todayDayOfWeek === 0 ? 6 : todayDayOfWeek - 1;

        const thisWeekStart = new Date(todayStart);
        thisWeekStart.setDate(thisWeekStart.getDate() - daysFromMonday);

        for (let i = 9; i >= 0; i--) {
            const weekStart = new Date(thisWeekStart);
            weekStart.setDate(weekStart.getDate() - (i * 7));
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 7);

            const stats = await getStatsForPeriod(weekStart, weekEnd);
            const weekLabel = weekStart.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' });

            weeklyData.push({
                label: weekLabel,
                newUsers: stats.newUsers,
                newGames: stats.newGames,
            });
        }

        // Calculate last 10 months
        const monthlyData = [];
        for (let i = 9; i >= 0; i--) {
            const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

            const stats = await getStatsForPeriod(monthStart, monthEnd);
            const monthLabel = monthStart.toLocaleDateString('en-AU', { month: 'short', year: 'numeric' });

            monthlyData.push({
                label: monthLabel,
                newUsers: stats.newUsers,
                newGames: stats.newGames,
            });
        }

        // Calculate current period stats for summary cards
        const todayStats = dailyData[9]; // Last item is today
        const yesterdayStats = dailyData[8];

        const thisWeekStats = weeklyData[9];
        const lastWeekStats = weeklyData[8];

        const thisMonthStats = monthlyData[9];
        const lastMonthStats = monthlyData[8];

        const dailyStats = {
            newUsers: todayStats.newUsers,
            newGames: todayStats.newGames,
            usersChange: calculatePercentageChange(todayStats.newUsers, yesterdayStats.newUsers),
            gamesChange: calculatePercentageChange(todayStats.newGames, yesterdayStats.newGames),
        };

        const weeklyStats = {
            newUsers: thisWeekStats.newUsers,
            newGames: thisWeekStats.newGames,
            usersChange: calculatePercentageChange(thisWeekStats.newUsers, lastWeekStats.newUsers),
            gamesChange: calculatePercentageChange(thisWeekStats.newGames, lastWeekStats.newGames),
        };

        const monthlyStats = {
            newUsers: thisMonthStats.newUsers,
            newGames: thisMonthStats.newGames,
            usersChange: calculatePercentageChange(thisMonthStats.newUsers, lastMonthStats.newUsers),
            gamesChange: calculatePercentageChange(thisMonthStats.newGames, lastMonthStats.newGames),
        };

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                daily: dailyStats,
                weekly: weeklyStats,
                monthly: monthlyStats,
                dailyData,
                weeklyData,
                monthlyData,
            }),
        };
    } catch (error) {
        console.error('Analytics API error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal server error' }),
        };
    }
};
