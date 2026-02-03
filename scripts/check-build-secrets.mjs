#!/usr/bin/env node
/**
 * Check built frontend assets for forbidden strings (secrets).
 * Run after build. Exit 1 if any forbidden pattern is found.
 */
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, '..', 'dist');
const FORBIDDEN = [
  { pattern: /RUNNER_CRON_SECRET|SUPABASE_SERVICE_ROLE_KEY/gi, name: 'Secrets env var names (never in frontend)' },
  { pattern: /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\./g, name: 'JWT token in bundle' },
];

function scanFile(filePath) {
  const content = readFileSync(filePath, 'utf8');
  const issues = [];
  for (const { pattern, name } of FORBIDDEN) {
    const matches = content.match(pattern);
    if (matches) {
      issues.push({ file: filePath, name, matches: matches.slice(0, 2) });
    }
  }
  return issues;
}

function walk(dir, ext = '.js') {
  const files = [];
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, name.name);
    if (name.isDirectory()) {
      files.push(...walk(full, ext));
    } else if (name.name.endsWith(ext) || name.name.endsWith('.html')) {
      files.push(full);
    }
  }
  return files;
}

let total = 0;
const allIssues = [];
for (const f of walk(distDir)) {
  const issues = scanFile(f);
  total += issues.length;
  allIssues.push(...issues.map(i => ({ ...i, file: f.replace(distDir, 'dist') })));
}

if (total > 0) {
  console.error('ERROR: Found forbidden strings in build output:');
  allIssues.forEach(({ file, name, matches }) => {
    console.error(`  ${file}: ${name} (e.g. ${JSON.stringify(matches)})`);
  });
  process.exit(1);
}
console.log('check:secrets OK — no forbidden strings in dist/');
