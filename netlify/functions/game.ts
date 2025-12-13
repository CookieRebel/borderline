import type { Handler } from '@netlify/functions';
import { db, schema } from '../../src/db';
import { eq, and, sql } from 'drizzle-orm';

// Get ISO week number
const getISOWeek = (date: Date): number => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

// Check if dates are consecutive days
const isConsecutiveDay = (lastPlayed: Date | null, now: Date): boolean => {
    if (!lastPlayed) return true; // First game
    const diffMs = now.getTime() - lastPlayed.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return diffDays <= 1 && diffDays > 0;
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

        if (!user_id || !level || guesses === undefined || time === undefined || score === undefined || won === undefined) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Missing required fields' }),
            };
        }

        const now = new Date();
        const weekNumber = getISOWeek(now);
        const year = now.getFullYear();

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
            })
            .returning();

        // Update user stats
        const gameCountField = `${level}_game_count` as const;
        const highScoreField = `${level}_high_score` as const;

        const isNewHighScore = score > (user as Record<string, number>)[`${level}HighScore`];
        const isConsecutive = isConsecutiveDay(user.lastPlayedAt, now);
        const newStreak = won && isConsecutive ? user.streak + 1 : (won ? 1 : 0);

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

        // Update high score if new
        if (isNewHighScore) {
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
