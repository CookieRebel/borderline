import type { Handler } from '@netlify/functions';
import { supabase } from '../../src/utils/supabase';
import { db, schema } from '../../src/db';
import { eq } from 'drizzle-orm';
import { getUserId } from '../../src/utils/auth';

export const handler: Handler = async (event) => {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: 'Method Not Allowed' };
    }

    try {
        // 1. Verify Session via Cookie (Borderline Identity)
        const userId = getUserId(event);
        if (!userId) {
            return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized: No session cookie' }) };
        }

        // 2. Verify Supabase Token (Auth Header)
        const authHeader = event.headers.authorization || event.headers.Authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized: No access token' }) };
        }

        const token = authHeader.split(' ')[1];
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user || !user.email) {
            console.error('Supabase token verification failed:', authError);
            return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized: Invalid token' }) };
        }

        // 3. Sync Email to Database
        // We trust the email from Supabase (it's verified or at least authenticated)
        await db.update(schema.users)
            .set({ email: user.email })
            .where(eq(schema.users.id, userId));

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Account synced successfully',
                email: user.email
            })
        };

    } catch (error) {
        console.error('Account sync error:', error);
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal Server Error' }) };
    }
};
