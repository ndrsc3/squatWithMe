// Playwright globalSetup: delete the e2e-… users earlier runs left on the dev database
// (their squats, reps and memberships cascade), so every run starts from a clean crew.
// Refuses anything that is, or can't be proven not to be, production — whatever VERCEL_ENV says.
import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'node:fs';
import { isProductionUrl } from '../db/prod-endpoint.mjs';

export default async function cleanDev(): Promise<void> {
    if (process.env.E2E_BASE_URL) return; // pointed elsewhere: not our database to clean
    let url = process.env.DATABASE_URL;
    if (!url) url = readFileSync('.env.local', 'utf8').match(/^DATABASE_URL="?([^"\n]+)"?$/m)?.[1];
    if (!url || isProductionUrl(url)) throw new Error('clean-dev: refusing — DATABASE_URL is missing or production');
    const rows = await neon(url)`delete from users where username like 'e2e-%' returning id`;
    console.log(`clean-dev: removed ${rows.length} e2e users from dev`);
}
