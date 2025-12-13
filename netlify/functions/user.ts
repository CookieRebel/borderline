import type { Handler } from '@netlify/functions';
import { db, schema } from '../../src/db';
import { eq } from 'drizzle-orm';

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
        // POST /api/user - Create or get user
        if (event.httpMethod === 'POST') {
            const body = JSON.parse(event.body || '{}');
            const { id, display_name } = body;

            if (!id || !display_name) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'id and display_name required' }),
                };
            }

            // Check if user exists
            const existing = await db.query.users.findFirst({
                where: eq(schema.users.id, id),
            });

            if (existing) {
                // Update display name if changed
                if (existing.displayName !== display_name) {
                    await db.update(schema.users)
                        .set({ displayName: display_name })
                        .where(eq(schema.users.id, id));
                }
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        ...existing,
                        displayName: display_name,
                    }),
                };
            }

            // Create new user
            const [newUser] = await db.insert(schema.users)
                .values({ id, displayName: display_name })
                .returning();

            return {
                statusCode: 201,
                headers,
                body: JSON.stringify(newUser),
            };
        }

        // GET /api/user/:id - Get user by ID
        if (event.httpMethod === 'GET') {
            const id = event.path.split('/').pop();

            if (!id) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'User ID required' }),
                };
            }

            const user = await db.query.users.findFirst({
                where: eq(schema.users.id, id),
            });

            if (!user) {
                return {
                    statusCode: 404,
                    headers,
                    body: JSON.stringify({ error: 'User not found' }),
                };
            }

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(user),
            };
        }

        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' }),
        };
    } catch (error) {
        console.error('User API error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal server error' }),
        };
    }
};
