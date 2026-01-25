#!/usr/bin/env node
/**
 * Bundle all supabase/migrations/*.sql + seed.sql into one file.
 * Output: supabase/migrations-all-bundled.sql
 * Run in Supabase Dashboard → SQL Editor to apply everything.
 */

import { readFileSync, readdirSync, existsSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const migrationsDir = join(root, 'supabase', 'migrations');
const seedPath = join(root, 'supabase', 'seed.sql');
const outPath = join(root, 'supabase', 'migrations-all-bundled.sql');

const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort();

const parts = [
  '-- KLINEO: All migrations + seed (bundled)',
  '-- Run in Supabase Dashboard → SQL Editor → New query → Paste → Run',
  '--',
  '',
];

for (const f of files) {
  const path = join(migrationsDir, f);
  parts.push(`-- === ${f} ===`);
  parts.push(readFileSync(path, 'utf8'));
  parts.push('');
}

if (existsSync(seedPath)) {
  parts.push('-- === seed.sql ===');
  parts.push(readFileSync(seedPath, 'utf8'));
}

writeFileSync(outPath, parts.join('\n'), 'utf8');
console.log('Wrote supabase/migrations-all-bundled.sql');
