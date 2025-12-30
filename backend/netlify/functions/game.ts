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

// ... helpers remain the same ...

export const handler: Handler = async (event) => {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        const body = JSON.parse(event.body || '{}');

        // -----------------------------------------------------------------
        // POST: Start Game
        // -----------------------------------------------------------------
        if (event.httpMethod === 'POST') {
            const { user_id, level, week, year, timezone } = body;

            if (!user_id || !level) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Missing required fields: user_id, level' }),
                };
            }

            // Update user's timezone if provided
            if (timezone) {
                let safeTimezone = timezone;
                try {
                    Intl.DateTimeFormat(undefined, { timeZone: safeTimezone });
                } catch (e) {
                    safeTimezone = null; // Ignore invalid timezones
                }

                if (safeTimezone) {
                    await db.update(schema.users)
                        .set({ timezone: safeTimezone })
                        .where(eq(schema.users.id, user_id));
                }
            }

            // Calculate week/year if not provided (Server authoritative fallback)
            let weekNumber = week;
            let yearNumber = year;
            if (!weekNumber || !yearNumber) {
                const current = getISOWeek();
                weekNumber = current.week;
                yearNumber = current.year;
            }

            // Insert new game row
            const [gameResult] = await db.insert(schema.gameResults)
                .values({
                    userId: user_id,
                    level,
                    weekNumber,
                    year: yearNumber,
                    startedAt: new Date(),
                    // All other result fields are null initially
                })
                .returning({ id: schema.gameResults.id });

            return {
                statusCode: 201,
                headers,
                body: JSON.stringify({
                    id: gameResult.id,
                    message: 'Game started'
                }),
            };
        }

        // -----------------------------------------------------------------
        // PUT: End Game (Update Result)
        // -----------------------------------------------------------------
        if (event.httpMethod === 'PUT') {
            // Check for ID in path (legacy-style or REST) or body
            // We'll support body 'id' for simplicity
            const { id, user_id, level, guesses, time, score, won, target_code, timezone } = body;

            if (!id || !user_id || !level || guesses === undefined || time === undefined || score === undefined || won === undefined || !target_code) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Missing required fields for update' }),
                };
            }

            const now = new Date();

            // Update game result
            await db.update(schema.gameResults)
                .set({
                    guesses,
                    timeSeconds: time,
                    score,
                    won,
                    targetCode: target_code,
                    endedAt: now,
                })
                .where(eq(schema.gameResults.id, id));

            // -----------------------------------------------------------------
            // User Stats Logic (Streak, High Score)
            // -----------------------------------------------------------------
            const user = await db.query.users.findFirst({
                where: eq(schema.users.id, user_id),
            });

            if (!user) {
                return { statusCode: 404, headers, body: JSON.stringify({ error: 'User not found' }) };
            }

            const isNewHighScore = score > (user[`${level}HighScore` as keyof typeof user] as number || 0);

            // Streak logic (Timezone Aware)
            // Use provided timezone -> stored timezone -> fallback 'Australia/Melbourne'
            const targetTimezone = timezone || user.timezone || 'Australia/Melbourne';

            // Limit generic check to ensure valid IANA string, otherwise fallback
            let safeTimezone = targetTimezone;
            try {
                Intl.DateTimeFormat(undefined, { timeZone: safeTimezone });
            } catch (e) {
                safeTimezone = 'Australia/Melbourne';
            }

            const getLocalYMD = (date: Date, tz: string) => {
                return date.toLocaleDateString('en-CA', { timeZone: tz }); // Returns YYYY-MM-DD
            };

            const localToday = getLocalYMD(now, safeTimezone);
            const localLastPlayed = user.lastPlayedAt ? getLocalYMD(user.lastPlayedAt, safeTimezone) : null;

            let newStreak = user.streak;

            if (localLastPlayed === localToday) {
                // Already played today in local time, streak maintenance
                newStreak = user.streak;
            } else {
                // Check if yesterday
                // Create dates from YYYY-MM-DD strings to compare purely on calendar days
                const todayDate = new Date(localToday);
                const lastDate = localLastPlayed ? new Date(localLastPlayed) : null;

                const isConsecutive = lastDate && (todayDate.getTime() - lastDate.getTime() === 86400000); // Exactly 1 day diff

                if (isConsecutive || user.lastPlayedAt === null) {
                    newStreak = won ? user.streak + 1 : 0;
                } else {
                    newStreak = won ? 1 : 0; // Streak broken
                }
            }

            const updates: Record<string, unknown> = {
                lastPlayedAt: now,
                streak: newStreak,
                timezone: safeTimezone, // Store the authoritative timezone
            };

            // Increment game count
            if (level === 'easy') updates.easyGameCount = user.easyGameCount + 1;
            if (level === 'medium') updates.mediumGameCount = user.mediumGameCount + 1;
            if (level === 'hard') updates.hardGameCount = user.hardGameCount + 1;
            if (level === 'extreme') updates.extremeGameCount = user.extremeGameCount + 1;

            // Update high score
            if (won && isNewHighScore) {
                if (level === 'easy') updates.easyHighScore = score;
                if (level === 'medium') updates.mediumHighScore = score;
                if (level === 'hard') updates.hardHighScore = score;
                if (level === 'extreme') updates.extremeHighScore = score;
            }

            await db.update(schema.users)
                .set(updates)
                .where(eq(schema.users.id, user_id));



            // I want to rank the score of the player for this game against all games for the same country and level
            const [gamesAtLevel] = await db.select({ count: sql<number>`count(*)` })
                .from(schema.gameResults)
                .where(and(
                    eq(schema.gameResults.targetCode, target_code),
                    eq(schema.gameResults.level, level),
                    eq(schema.gameResults.won, true)
                ));

            // Count how many people have a BETTER score (higher is better in our scoring, so strictly greater than my score)
            // rank = (count of better scores) + 1
            const [betterGames] = await db.select({ count: sql<number>`count(*)` })
                .from(schema.gameResults)
                .where(and(
                    eq(schema.gameResults.targetCode, target_code),
                    eq(schema.gameResults.level, level),
                    eq(schema.gameResults.won, true),
                    sql`${schema.gameResults.score} > ${score}`
                ));

            const totalGamesAtLevel = Number(gamesAtLevel.count);

            const playerRank = Number(betterGames.count) + 1;

            console.log("totalGamesAtLevel", totalGamesAtLevel);
            console.log("playerRank", playerRank);
            let rankMessage = '';
            if (playerRank === 1) {
                rankMessage = 'You are the best player for this country!';
            } else if (playerRank === 2) {
                rankMessage = 'You are the second best player for this country.';
            } else {
                // If there are less than 10 games, create a message based on the player rank
                if (totalGamesAtLevel < 10) {
                    if (playerRank <= 4) {
                        rankMessage = `You are ranked #${playerRank} out of ${totalGamesAtLevel} rounds for this country.`;
                    }
                } else {
                    // We have more than 10 games, calculate percentile
                    const topPercent = Math.ceil((playerRank / totalGamesAtLevel) * 100);
                    if (topPercent <= 50) {
                        rankMessage = `You are in the top ${topPercent}% of players for this country.`;
                    }
                }
            }
            console.log("rankMessage", rankMessage);
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    id,
                    new_high_score: isNewHighScore,
                    streak: newStreak,
                    rankMessage,
                    message: 'Game finished'
                }),
            };
        }

        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' }),
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
