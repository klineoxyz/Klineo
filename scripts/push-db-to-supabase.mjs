#!/usr/bin/env node
/**
 * Push supabase-sync-all.sql to Supabase from Cursor/terminal.
 * Requires SUPABASE_DB_URL in .env.local or .env
 * Get it: Supabase Dashboard → Project Settings → Database → Connection string (URI)
 */

import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

dotenv.config({ path: join(root, '.env.local') });
dotenv.config({ path: join(root, '.env') });

async function main() {
  const url = process.env.SUPABASE_DB_URL;
  if (!url || !url.startsWith('postgres')) {
    console.error('Missing SUPABASE_DB_URL in .env.local or .env');
    console.error('Get it: Supabase Dashboard → Project Settings → Database → Connection string (URI)');
    process.exit(1);
  }

  const sqlPath = join(root, 'supabase-sync-all.sql');
  let sql;
  try {
    sql = readFileSync(sqlPath, 'utf8');
  } catch (e) {
    console.error('Could not read supabase-sync-all.sql:', e.message);
    process.exit(1);
  }

  const client = new pg.Client({ connectionString: url });
  try {
    await client.connect();
    await client.query(sql);
    console.log('Pushed supabase-sync-all.sql to Supabase successfully.');
  } catch (e) {
    console.error('Push failed:', e.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
