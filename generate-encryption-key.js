// Generate 32-byte encryption key in hex format
// Run with: node generate-encryption-key.js

import crypto from 'crypto';
const key = crypto.randomBytes(32).toString('hex');
console.log('\n🔑 Your ENCRYPTION_KEY:');
console.log(key);
console.log('\nCopy this entire key and add it to backend-skeleton/.env as:');
console.log(`ENCRYPTION_KEY=${key}\n`);
