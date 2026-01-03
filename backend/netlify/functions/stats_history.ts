import type { Handler } from '@netlify/functions';
import { db, schema } from '../../src/db';
import { eq, and, gte } from 'drizzle-orm';
import { getUserId } from '../../src/utils/auth';

// Helper to get Year/Month/Day relative to a Timezone
function getLocalDayParts(date: Date, timeZone: string) {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
    }).formatToParts(date);

    const p: any = {};
    parts.forEach(({ type, value }) => { p[type] = parseInt(value, 10); });

    return { year: p.year, month: p.month, day: p.day };
}

export const handler: Handler = async (event) => {
    const headers = {
        'Content-Type': 'application/json',
    };

    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, headers, body: 'Method Not Allowed' };
    }

    try {
        const userId = getUserId(event);
        if (!userId) {
            return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
        }

        // 1. Get User Preference (Timezone)
        const user = await db.query.users.findFirst({
            where: eq(schema.users.id, userId),
            columns: { timezone: true }
        });

        const timeZone = user?.timezone || 'Australia/Melbourne';

        // 2. Fetch last 16 days of data (buffer for 14 days)
        const now = new Date();
        const pastDate = new Date(now.getTime() - (16 * 24 * 60 * 60 * 1000));

        const results = await db.select({
            score: schema.gameResults.score,
            level: schema.gameResults.level,
            startedAt: schema.gameResults.startedAt
        })
            .from(schema.gameResults)
            .where(and(
                eq(schema.gameResults.userId, userId),
                gte(schema.gameResults.startedAt, pastDate),
            ));

        // 3. Aggregate in Memory (Bucket by Local Date)
        const buckets: Record<string, Record<string, { totalScore: number, count: number, dateKey: string }>> = {};

        results.forEach(r => {
            if (!r.startedAt || r.score === null) return;
            const { year, month, day } = getLocalDayParts(r.startedAt, timeZone);
            // Key format: YYYY-MM-DD
            const key = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

            if (!buckets[r.level]) buckets[r.level] = {};
            if (!buckets[r.level][key]) {
                buckets[r.level][key] = { totalScore: 0, count: 0, dateKey: key };
            }

            buckets[r.level][key].totalScore += r.score;
            buckets[r.level][key].count += 1;
        });

        // 4. Format Output - Backfilling Last 14 Days
        const last14Days: { dateKey: string, label: string }[] = [];

        for (let i = 13; i >= 0; i--) {
            const d = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
            const { year, month, day } = getLocalDayParts(d, timeZone);
            const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

            // Format label: "Jan 1" or "Mon" - let's do "D MMM" (e.g. 3 Jan)
            // We can use Intl for label formatting too
            const label = new Intl.DateTimeFormat('en-US', {
                timeZone,
                month: 'short',
                day: 'numeric'
            }).format(d); // e.g., "Jan 3"

            last14Days.push({ dateKey, label });
        }

        const levels = ['easy', 'medium', 'hard', 'extreme'];
        const responseData: any = {};

        levels.forEach(level => {
            const levelBuckets = buckets[level] || {};

            responseData[level] = last14Days.map(dayInfo => {
                const b = levelBuckets[dayInfo.dateKey];

                if (b) {
                    return {
                        date: dayInfo.dateKey,
                        avgScore: Math.round(b.totalScore / b.count),
                        gamesPlayed: b.count,
                        label: dayInfo.label
                    };
                } else {
                    return {
                        date: dayInfo.dateKey,
                        avgScore: 0,
                        gamesPlayed: 0,
                        label: dayInfo.label
                    };
                }
            });
        });

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(responseData)
        };

    } catch (error) {
        console.error('Stats History Error:', error);
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal Server Error' }) };
    }
};
