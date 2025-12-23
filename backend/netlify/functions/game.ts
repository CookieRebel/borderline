import type { Handler } from '@netlify/functions';
import { db, schema } from '../../src/db';
import { eq, and, sql } from 'drizzle-orm';

// Get date in Melbourne timezone (Australia/Melbourne)
const getMelbourneDate = (): Date => {
    // Get current time as Melbourne time string
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

// Check if dates are the same calendar day
const isSameDay = (date1: Date, date2: Date): boolean => {
    return date1.getUTCFullYear() === date2.getUTCFullYear() &&
        date1.getUTCMonth() === date2.getUTCMonth() &&
        date1.getUTCDate() === date2.getUTCDate();
};

// Check if lastPlayed was yesterday (consecutive days)
const isYesterday = (lastPlayed: Date | null, now: Date): boolean => {
    if (!lastPlayed) return false;
    const yesterday = new Date(now);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    return isSameDay(lastPlayed, yesterday);
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

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' }),
        };
    }

    try {
        const body = JSON.parse(event.body || '{}');
        const { user_id, level, guesses, time, score, won } = body;

        if (!user_id || !level || guesses === undefined || time === undefined || score === undefined || won === undefined || !body.target_code) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Missing required fields' }),
            };
        }

        const now = new Date();
        const { week: weekNumber, year } = getISOWeek();

        // Get user
        const user = await db.query.users.findFirst({
            where: eq(schema.users.id, user_id),
        });

        if (!user) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ error: 'User not found' }),
            };
        }

        // Insert game result
        const [gameResult] = await db.insert(schema.gameResults)
            .values({
                userId: user_id,
                level,
                guesses,
                timeSeconds: time,
                score,
                won,
                weekNumber,
                year,
                targetCode: body.target_code,
            })
            .returning();

        // Update user stats
        const isNewHighScore = score > (user[`${level}HighScore` as keyof typeof user] as number || 0);

        // Streak logic:
        // - Same day: maintain current streak (don't increment)
        // - Yesterday: increment streak (consecutive day)
        // - First game ever: start at 1
        // - Otherwise: reset to 1 (if won) or 0 (if lost)
        let newStreak = user.streak;
        const playedToday = user.lastPlayedAt ? isSameDay(user.lastPlayedAt, now) : false;
        const playedYesterday = isYesterday(user.lastPlayedAt, now);

        if (playedToday) {
            // Same day - keep streak as is
            newStreak = user.streak;
        } else if (playedYesterday || user.lastPlayedAt === null) {
            // Yesterday or first game - increment if won
            newStreak = won ? user.streak + 1 : 0;
        } else {
            // Broke streak - reset
            newStreak = won ? 1 : 0;
        }

        // Dynamic update based on level
        const updates: Record<string, unknown> = {
            lastPlayedAt: now,
            streak: newStreak,
        };

        // Increment game count
        if (level === 'easy') updates.easyGameCount = user.easyGameCount + 1;
        if (level === 'medium') updates.mediumGameCount = user.mediumGameCount + 1;
        if (level === 'hard') updates.hardGameCount = user.hardGameCount + 1;
        if (level === 'extreme') updates.extremeGameCount = user.extremeGameCount + 1;

        // Update high score if new and game was won
        if (won && isNewHighScore) {
            if (level === 'easy') updates.easyHighScore = score;
            if (level === 'medium') updates.mediumHighScore = score;
            if (level === 'hard') updates.hardHighScore = score;
            if (level === 'extreme') updates.extremeHighScore = score;
        }

        await db.update(schema.users)
            .set(updates)
            .where(eq(schema.users.id, user_id));

        return {
            statusCode: 201,
            headers,
            body: JSON.stringify({
                id: gameResult.id,
                new_high_score: isNewHighScore,
                streak: newStreak,
            }),
        };
    } catch (error) {
        console.error('Game API error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal server error' }),
        };
    }
};
