import readline from 'readline';
import { spawn } from 'child_process';

const command = process.argv.slice(2);

if (command.length === 0) {
    console.error('Usage: node confirm_prod_action.js <command> [args...]');
    process.exit(1);
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('\x1b[33m%s\x1b[0m', '⚠  WARNING: You are about to perform a sensitive operation on PRODUCTION.');
rl.question('You are deploying to PROD. Please respond with "DEPLOY" to confirm.\n> ', (answer) => {
    rl.close();
    if (answer.trim() === 'DEPLOY') {
        console.log('\x1b[32m%s\x1b[0m', 'Confirmed. Executing...');

        const child = spawn(command[0], command.slice(1), {
            stdio: 'inherit',
            shell: true
        });

        child.on('close', (code) => {
            process.exit(code);
        });
    } else {
        console.log('\x1b[31m%s\x1b[0m', 'Operation cancelled.');
        process.exit(1);
    }
});
