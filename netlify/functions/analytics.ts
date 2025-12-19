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

        // Get total statistics
        const totalUsersResult = await db.execute(sql`
            SELECT COUNT(*) as count
            FROM users
        `);
        const totalUsers = Number(totalUsersResult.rows[0]?.count || 0);

        const totalGamesResult = await db.execute(sql`
            SELECT COUNT(*) as count
            FROM game_results
        `);
        const totalGames = Number(totalGamesResult.rows[0]?.count || 0);

        // Get games by difficulty
        const gamesByDifficultyResult = await db.execute(sql`
            SELECT level, COUNT(*) as count
            FROM game_results
            GROUP BY level
        `);

        const gamesByDifficulty = {
            easy: 0,
            medium: 0,
            hard: 0,
            extreme: 0,
        };

        gamesByDifficultyResult.rows.forEach((row: any) => {
            const level = row.level as 'easy' | 'medium' | 'hard' | 'extreme';
            gamesByDifficulty[level] = Number(row.count || 0);
        });

        // Calculate average streak
        const avgStreakResult = await db.execute(sql`
            SELECT AVG(streak) as avg_streak
            FROM users
            WHERE streak > 0
        `);
        const averageStreak = Math.round(Number(avgStreakResult.rows[0]?.avg_streak || 0) * 10) / 10; // Round to 1 decimal

        // Calculate 1-day retention
        // For all users, check if they played the day after their first game
        const oneDayRetentionResult = await db.execute(sql`
            WITH user_first_game AS (
                SELECT 
                    u.id as user_id,
                    DATE(u.created_at) as first_day,
                    DATE(u.created_at) + INTERVAL '1 day' as next_day
                FROM users u
            ),
            user_played_next_day AS (
                SELECT DISTINCT
                    ufg.user_id,
                    CASE 
                        WHEN EXISTS (
                            SELECT 1 
                            FROM game_results gr 
                            WHERE gr.user_id = ufg.user_id 
                            AND DATE(gr.created_at) = ufg.next_day
                        ) THEN 1
                        ELSE 0
                    END as played_next_day
                FROM user_first_game ufg
            )
            SELECT 
                COUNT(*) FILTER (WHERE played_next_day = 1) as retained,
                COUNT(*) as total
            FROM user_played_next_day
        `);

        const oneDayRetained = Number(oneDayRetentionResult.rows[0]?.retained || 0);
        const oneDayTotal = Number(oneDayRetentionResult.rows[0]?.total || 0);
        const oneDayRetention = oneDayTotal > 0 ? Math.round((oneDayRetained / oneDayTotal) * 100) : 0;

        // Calculate 7-day retention
        const sevenDayRetentionResult = await db.execute(sql`
            WITH user_first_game AS (
                SELECT 
                    u.id as user_id,
                    DATE(u.created_at) as first_day,
                    DATE(u.created_at) + INTERVAL '7 days' as day_seven
                FROM users u
                WHERE u.created_at <= NOW() - INTERVAL '7 days'
            ),
            user_played_day_seven AS (
                SELECT DISTINCT
                    ufg.user_id,
                    CASE 
                        WHEN EXISTS (
                            SELECT 1 
                            FROM game_results gr 
                            WHERE gr.user_id = ufg.user_id 
                            AND DATE(gr.created_at) = ufg.day_seven
                        ) THEN 1
                        ELSE 0
                    END as played_day_seven
                FROM user_first_game ufg
            )
            SELECT 
                COUNT(*) FILTER (WHERE played_day_seven = 1) as retained,
                COUNT(*) as total
            FROM user_played_day_seven
        `);

        const sevenDayRetained = Number(sevenDayRetentionResult.rows[0]?.retained || 0);
        const sevenDayTotal = Number(sevenDayRetentionResult.rows[0]?.total || 0);
        const sevenDayRetention = sevenDayTotal > 0 ? Math.round((sevenDayRetained / sevenDayTotal) * 100) : 0;

        // Calculate average guesses
        const avgGuessesResult = await db.execute(sql`
            SELECT AVG(guesses) as avg_guesses
            FROM game_results
        `);
        const averageGuesses = Math.round(Number(avgGuessesResult.rows[0]?.avg_guesses || 0) * 10) / 10;

        // Calculate average guesses by difficulty
        const avgGuessesByDifficultyResult = await db.execute(sql`
            SELECT level, AVG(guesses) as avg_guesses
            FROM game_results
            GROUP BY level
        `);

        const averageGuessesByDifficulty = {
            easy: 0,
            medium: 0,
            hard: 0,
            extreme: 0,
        };

        avgGuessesByDifficultyResult.rows.forEach((row: any) => {
            const level = row.level as 'easy' | 'medium' | 'hard' | 'extreme';
            averageGuessesByDifficulty[level] = Math.round(Number(row.avg_guesses || 0) * 10) / 10;
        });

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
                totals: {
                    totalUsers,
                    totalGames,
                    gamesByDifficulty,
                },
                retention: {
                    averageStreak,
                    oneDayRetention,
                    sevenDayRetention,
                },
                averageGuesses: {
                    overall: averageGuesses,
                    byDifficulty: averageGuessesByDifficulty,
                },
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
