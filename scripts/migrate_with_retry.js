
import { spawn } from 'child_process';

const MAX_RETRIES = 3;
const RETRY_DELAY = 5000; // 5 seconds

async function runMigration(attempt = 1) {
    console.log(`Starting database migration (Attempt ${attempt}/${MAX_RETRIES})...`);

    return new Promise((resolve, reject) => {
        const process = spawn('npx', ['drizzle-kit', 'migrate'], {
            stdio: 'inherit',
            shell: true,
            env: { ...global.process.env }
        });

        process.on('close', (code) => {
            if (code === 0) {
                console.log('Migration completed successfully.');
                resolve();
            } else {
                console.error(`Migration failed with exit code ${code}`);
                reject(code);
            }
        });

        process.on('error', (err) => {
            console.error('Failed to start migration process:', err);
            reject(err);
        });
    });
}

async function main() {
    for (let i = 1; i <= MAX_RETRIES; i++) {
        try {
            await runMigration(i);
            process.exit(0);
        } catch (error) {
            if (i < MAX_RETRIES) {
                console.warn(`Migration attempt ${i} failed. Retrying in ${RETRY_DELAY / 1000}s...`);
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
            } else {
                console.error('All migration attempts failed.');
                process.exit(1);
            }
        }
    }
}

main();
