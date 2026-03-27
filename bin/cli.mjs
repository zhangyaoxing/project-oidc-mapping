#!/usr/bin/env node
'use strict';

import { mapOIDC4Projects } from '../src/mapping.js';
import meow from 'meow';
import chalk from 'chalk';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

// Load .env.local and .env files for development
function loadEnvFile() {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const projectRoot = dirname(__dirname);
    
    for (const envFile of ['.env.local', '.env']) {
        try {
            const envPath = join(projectRoot, envFile);
            const content = readFileSync(envPath, 'utf-8');
            
            content.split('\n').forEach(line => {
                // Skip empty lines and comments
                if (!line.trim() || line.trim().startsWith('#')) return;
                
                const [key, ...valueParts] = line.split('=');
                const value = valueParts.join('=').trim();
                
                // Only set if not already set by environment
                if (key.trim() && !process.env[key.trim()]) {
                    process.env[key.trim()] = value;
                }
            });
        } catch {
            // File doesn't exist or is not readable, skip silently
        }
    }
}

async function main() {
    // Load environment variables from .env files
    loadEnvFile();

    const cli = meow(`
	${chalk.bold('Usage')}
	  $ po-mapping <ops manager url>
	${chalk.bold('Examples')}
	  $ po-mapping https://localhost:8080/
`, {
        importMeta: import.meta,
    });

    const isInteractive = process.stdin.isTTY;

    // Get baseUrl from CLI args
    let baseUrl = cli.input[0];
    
    // Only prompt for URL if in interactive mode and no args provided
    if (!baseUrl && isInteractive) {
        const readline = await import('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        const question = (query) => new Promise((resolve) => rl.question(query, resolve));
        baseUrl = await question('Enter Ops Manager URL: ');
        rl.close();
    }

    try {
        new URL(baseUrl);
    } catch {
        console.error('Error: url must be a valid URL.');
        process.exit(1);
    }

    // Check credentials and prompt if missing (only in interactive mode)
    let publicKey = process.env.PUBLIC_KEY;
    let privateKey = process.env.PRIVATE_KEY;

    if ((!publicKey || !privateKey) && isInteractive) {
        const readline = await import('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        const question = (query) => new Promise((resolve) => rl.question(query, resolve));

        if (!publicKey) {
            publicKey = await question('Enter PUBLIC_KEY: ');
        }
        if (!privateKey) {
            privateKey = await question('Enter PRIVATE_KEY: ');
        }
        rl.close();
    }

    // Check if credentials are available
    if (!publicKey || !privateKey) {
        console.error('Error: Missing credentials.');
        console.error('Set PUBLIC_KEY and PRIVATE_KEY environment variables:');
        console.error('  export PUBLIC_KEY="your-public-key"');
        console.error('  export PRIVATE_KEY="your-private-key"');
        process.exit(1);
    }

    process.env.PUBLIC_KEY = publicKey;
    process.env.PRIVATE_KEY = privateKey;

    await mapOIDC4Projects(baseUrl);
}

main().catch(err => {
    console.error(err.message);
    process.exit(1);
});
