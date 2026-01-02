import type { Handler } from '@netlify/functions';
import { db, schema } from '../../src/db';
import { eq } from 'drizzle-orm';
import { getUserId, setUserIdCookie } from '../../src/utils/auth';

// Reusing generic name generator for bootstrapping if needed

export const handler: Handler = async (event) => {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
    };

    try {
        const cookieUserId = getUserId(event);

        // GET /api/me - Return current user (or bootstrap)
        if (event.httpMethod === 'GET') {
            if (cookieUserId) {
                const user = await db.query.users.findFirst({
                    where: eq(schema.users.id, cookieUserId),
                });

                if (user) {
                    return {
                        statusCode: 200,
                        headers,
                        body: JSON.stringify(user),
                    };
                }
            }

            return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
        }

        // PATCH /api/me - Update profile
        if (event.httpMethod === 'PATCH') {
            if (!cookieUserId) {
                return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
            }

            const body = JSON.parse(event.body || '{}');
            const { displayName, timezone, id, score } = body;

            // Reject restricted fields
            if (id || score !== undefined) {
                return { statusCode: 403, headers, body: JSON.stringify({ error: 'Cannot update restricted fields' }) };
            }

            const updates: any = {};
            if (displayName) updates.displayName = displayName;
            if (timezone) updates.timezone = timezone;

            if (Object.keys(updates).length === 0) {
                return { statusCode: 400, headers, body: JSON.stringify({ error: 'No valid fields to update' }) };
            }

            await db.update(schema.users)
                .set(updates)
                .where(eq(schema.users.id, cookieUserId));

            // Fetch updated user
            const updatedUser = await db.query.users.findFirst({
                where: eq(schema.users.id, cookieUserId),
            });

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(updatedUser),
            };
        }

        return { statusCode: 405, headers, body: 'Method Not Allowed' };

    } catch (error) {
        console.error('/api/me error:', error);
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal server error' }) };
    }
};
