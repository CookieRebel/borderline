import { Handler } from '@netlify/functions';
import { supabase } from '../../src/utils/supabase';
import { getUserId, setUserIdCookie } from '../../src/utils/auth';
import { db, schema } from '../../src/db';
import { eq } from 'drizzle-orm';

export const handler: Handler = async (event) => {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

    // 1. Get Token
    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return { statusCode: 401, body: JSON.stringify({ error: 'Missing Bearer Token' }) };
    }
    const token = authHeader.split(' ')[1];

    // 2. Validate Token
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
        console.error('Supabase Token Error:', error);
        return { statusCode: 401, body: JSON.stringify({ error: 'Invalid Token' }) };
    }

    // 3. Get Cookie User
    const cookieUserId = getUserId(event);
    if (!cookieUserId) {
        return { statusCode: 400, body: JSON.stringify({ error: 'No Session Cookie' }) };
    }

    try {
        // 4. Check if Account Already Linked (Scenario A: Merge/Canonical)
        // Does this Supabase User ID already exist in our DB?
        const [existingAccount] = await db.select().from(schema.users).where(eq(schema.users.supabaseUserId, user.id));

        if (existingAccount) {
            // "Account Wins" strategy:
            // If the Supabase account is already linked to a row, that row becomes the active user.
            // We switch the cookie to point to this canonical row.
            // (Note: We are NOT merging stats from the anonymous session in this v1. The anonymous history is orphaned.)
            const cookieHeader: string = setUserIdCookie(existingAccount.id) || '';

            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json'
                },
                multiValueHeaders: {
                    'Set-Cookie': [cookieHeader]
                },
                body: JSON.stringify(existingAccount)
            };
        }

        // 5. Link Current Account (Scenario B: Link)
        // No existing link, so we attach the Supabase ID to the *current* anonymous session row.
        const [updatedUser] = await db.update(schema.users)
            .set({
                supabaseUserId: user.id,
                email: user.email,
                isRegistered: true
            })
            .where(eq(schema.users.id, cookieUserId))
            .returning();

        if (!updatedUser) {
            // Should be rare: cookie existed but row deleted?
            return { statusCode: 404, body: JSON.stringify({ error: 'User Row Not Found' }) };
        }

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedUser)
        };

    } catch (err: any) {
        console.error('Account Link Error:', err);
        return { statusCode: 500, body: JSON.stringify({ error: 'Internal Server Error' }) };
    }
};
