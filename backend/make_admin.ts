
import { db } from './src/db/index.js';
import { users } from './src/db/schema.js';
import { eq } from 'drizzle-orm';

const ADMIN_ID = 'bad83e41-5d35-463d-882f-30633f5301ff';

async function main() {
    console.log(`Making user ${ADMIN_ID} an admin...`);

    // Check if user exists first
    const existing = await db.query.users.findFirst({
        where: eq(users.id, ADMIN_ID)
    });

    if (!existing) {
        console.log('User does not exist, creating...');
        await db.insert(users).values({
            id: ADMIN_ID,
            displayName: 'Admin User',
            email: 'admin@example.com',
            isAdmin: true
        });
    } else {
        console.log('User exists, updating...');
        await db.update(users)
            .set({ isAdmin: true })
            .where(eq(users.id, ADMIN_ID));
    }

    console.log('Done.');
    process.exit(0);
}

main().catch(console.error);
