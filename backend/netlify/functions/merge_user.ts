import { Handler } from '@netlify/functions';
import { db } from '../../src/db';
import { users, gameResults } from '../../src/db/schema';
import { eq, sql } from 'drizzle-orm';

export const handler: Handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { anonymousId, clerkId } = JSON.parse(event.body || '{}');

        if (!anonymousId || !clerkId) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields' }) };
        }

        console.log(`Merge request: Anon ${anonymousId} -> Clerk ${clerkId}`);

        // 1. Check if a user with this Clerk ID already exists
        const existingClerkUser = await db.select().from(users).where(eq(users.clerkId, clerkId)).limit(1);

        if (existingClerkUser.length === 0) {
            // Case A: New Social User (Link)
            // No user in our DB has this clerkId yet.
            // Just link the anonymous user to this clerkId.

            // First check if the anonymous user exists
            const anonUser = await db.select().from(users).where(eq(users.id, anonymousId)).limit(1);
            if (anonUser.length === 0) {
                // Should not happen if app logic is correct, but maybe they cleared storage?
                // Create a new user? Or error? Let's error for now.
                return { statusCode: 404, body: JSON.stringify({ error: 'Anonymous user not found' }) };
            }

            await db.update(users)
                .set({ clerkId: clerkId })
                .where(eq(users.id, anonymousId));

            console.log(`Linked new Clerk ID to Anon user ${anonymousId}`);
            return {
                statusCode: 200,
                body: JSON.stringify({ userId: anonymousId, merged: false })
            };

        } else {
            // Case B: Existing Social User (Merge)
            // The user played before on another device (User Y).
            // We need to move User X's (Anon) history to User Y.
            const targetUser = existingClerkUser[0];
            const targetUserId = targetUser.id;

            if (targetUserId === anonymousId) {
                // Already linked, nothing to do
                return { statusCode: 200, body: JSON.stringify({ userId: targetUserId, merged: false }) };
            }

            console.log(`Switching Anon ${anonymousId} to existing Target ${targetUserId} (Orphaning local data)`);

            // Case B: Existing Social User (Load Cloud Save)
            // USER REQUEST: "Any game history in compute 2 will be orphaned"
            // We do NOT merge the anonymous history. We simply switch the user to the existing account.
            // The anonymous user and their history remain in the DB (orphaned) or could be deleted.
            // For safety, we leave them for now.

            /* 
            // PREVIOUS MERGE LOGIC (Commented out per request)
            // 1. Move Game Results
            await db.update(gameResults)
                .set({ userId: targetUserId })
                .where(eq(gameResults.userId, anonymousId));

            // 3. Delete the anonymous user shell
            await db.delete(users).where(eq(users.id, anonymousId));
            */

            return {
                statusCode: 200,
                body: JSON.stringify({ userId: targetUserId, merged: true })
            };
        }

    } catch (error) {
        console.error('Merge error:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Internal Server Error' }) };
    }
};
