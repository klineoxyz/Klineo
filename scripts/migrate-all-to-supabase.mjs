#!/usr/bin/env node
/**
 * Run ALL Supabase migrations + seed.
 * Requires SUPABASE_DB_URL in .env.local or .env
 * Get it: Supabase Dashboard → Project Settings → Database → Connection string (URI)
 */

import dotenv from 'dotenv';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const migrationsDir = join(root, 'supabase', 'migrations');
const seedPath = join(root, 'supabase', 'seed.sql');

dotenv.config({ path: join(root, '.env.local') });
dotenv.config({ path: join(root, '.env') });

async function main() {
  const url = process.env.SUPABASE_DB_URL;
  if (!url || !url.startsWith('postgres')) {
    console.error('Missing SUPABASE_DB_URL in .env.local or .env');
    console.error('Get it: Supabase Dashboard → Project Settings → Database → Connection string (URI)');
    process.exit(1);
  }

  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  if (!files.length) {
    console.error('No migration files in supabase/migrations/');
    process.exit(1);
  }

  const client = new pg.Client({ connectionString: url });
  try {
    await client.connect();
    console.log('Connected to Supabase.\n');

    for (const f of files) {
      const path = join(migrationsDir, f);
      const sql = readFileSync(path, 'utf8');
      console.log('Running', f, '...');
      await client.query(sql);
      console.log('  OK\n');
    }

    if (existsSync(seedPath)) {
      const seed = readFileSync(seedPath, 'utf8');
      console.log('Running seed.sql ...');
      await client.query(seed);
      console.log('  OK\n');
    } else {
      console.log('No supabase/seed.sql — skipping seed.\n');
    }

    console.log('All migrations + seed applied.');
  } catch (e) {
    console.error('Migration failed:', e.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
