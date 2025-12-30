import type { Handler } from '@netlify/functions';
import { db, schema } from '../../src/db';
import { eq, inArray, count, and } from 'drizzle-orm';

export const handler: Handler = async (event) => {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    try {
        const { user_id, candidates } = JSON.parse(event.body || '{}');

        if (!user_id || !candidates || !Array.isArray(candidates) || candidates.length === 0) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing user_id or candidates' }) };
        }

        // 1. Get play counts for all candidate countries for this user
        // Query returns: { targetCode: 'FRA', count: 5 }
        const playCounts = await db
            .select({
                targetCode: schema.gameResults.targetCode,
                playCount: count()
            })
            .from(schema.gameResults)
            .where(
                and(
                    eq(schema.gameResults.userId, user_id),
                    inArray(schema.gameResults.targetCode, candidates)
                )
            )
            .groupBy(schema.gameResults.targetCode);


        // Map to efficient lookup: { 'FRA': 5, 'USA': 2 }
        const countMap = new Map<string, number>();
        playCounts.forEach(r => {
            if (r.targetCode) countMap.set(r.targetCode, r.playCount);
        });

        // 2. Identify counts for ALL candidates (including 0s)
        const candidatesWithCounts = candidates.map(code => ({
            code,
            count: countMap.get(code) || 0
        }));

        // 3. Find Minimum Frequency
        let minCount = Infinity;
        candidatesWithCounts.forEach(c => {
            if (c.count < minCount) minCount = c.count;
        });

        // 4. Filter candidates that match minCount
        const eligibleCandidates = candidatesWithCounts
            .filter(c => c.count === minCount)
            .map(c => c.code);

        // 5. Pick Random from Eligible
        const randomIndex = Math.floor(Math.random() * eligibleCandidates.length);
        const selectedTarget = eligibleCandidates[randomIndex];

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                target: selectedTarget,
                debug: {
                    minCount,
                    poolSize: eligibleCandidates.length,
                    totalCandidates: candidates.length
                }
            })
        };

    } catch (error) {
        console.error('Pick Target Error:', error);
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal server error' }) };
    }
};
