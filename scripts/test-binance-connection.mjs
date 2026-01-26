#!/usr/bin/env node

/**
 * Test script for Binance connection encryption/decryption and API calls
 * 
 * Usage:
 *   node scripts/test-binance-connection.mjs
 * 
 * Requires:
 *   - ENCRYPTION_KEY in environment or .env
 *   - Valid Binance API keys (testnet or production)
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from backend-skeleton
dotenv.config({ path: join(__dirname, '../backend-skeleton/.env') });

async function testEncryption() {
  console.log('\n🔐 Testing Encryption...\n');
  
  try {
    // Dynamic import (ESM)
    const cryptoModule = await import('../backend-skeleton/src/lib/crypto.ts');
    const { encrypt, decrypt, maskApiKey } = cryptoModule;
    
    const testData = 'test-api-key-secret-12345';
    console.log('Original:', testData);
    
    const encrypted = await encrypt(testData);
    console.log('Encrypted:', encrypted.substring(0, 50) + '...');
    
    const decrypted = await decrypt(encrypted);
    console.log('Decrypted:', decrypted);
    
    if (decrypted === testData) {
      console.log('✅ Encryption test PASSED\n');
    } else {
      console.log('❌ Encryption test FAILED\n');
      process.exit(1);
    }
    
    // Test masking
    const masked = maskApiKey('abc123xyz789');
    console.log('Masked key:', masked);
    console.log('✅ Masking test PASSED\n');
    
  } catch (err) {
    console.error('❌ Encryption test FAILED:', err.message);
    if (err.message.includes('ENCRYPTION_KEY')) {
      console.error('\n💡 Set ENCRYPTION_KEY in backend-skeleton/.env');
      console.error('   Generate: openssl rand -hex 32\n');
    }
    process.exit(1);
  }
}

async function testBinanceSigning() {
  console.log('🔑 Testing Binance API Signing...\n');
  
  try {
    const binanceModule = await import('../backend-skeleton/src/lib/binance.ts');
    const { testConnection } = binanceModule;
    
    // Check for test credentials
    const apiKey = process.env.BINANCE_TEST_API_KEY;
    const apiSecret = process.env.BINANCE_TEST_API_SECRET;
    const environment = process.env.BINANCE_TEST_ENV || 'testnet';
    
    if (!apiKey || !apiSecret) {
      console.log('⚠️  Skipping Binance API test (no credentials)');
      console.log('   Set BINANCE_TEST_API_KEY and BINANCE_TEST_API_SECRET in .env\n');
      return;
    }
    
    console.log(`Testing ${environment} connection...`);
    const result = await testConnection({
      apiKey,
      apiSecret,
      environment: environment === 'production' ? 'production' : 'testnet',
    });
    
    if (result.ok) {
      console.log(`✅ Connection test PASSED (${result.latencyMs}ms)\n`);
    } else {
      console.log(`❌ Connection test FAILED: ${result.error}\n`);
      process.exit(1);
    }
    
  } catch (err) {
    console.error('❌ Binance test FAILED:', err.message);
    console.error('\n💡 Make sure you have valid Binance API keys\n');
    process.exit(1);
  }
}

async function main() {
  console.log('🧪 Binance Integration Test Suite\n');
  console.log('=' .repeat(50));
  
  await testEncryption();
  await testBinanceSigning();
  
  console.log('=' .repeat(50));
  console.log('\n✅ All tests passed!\n');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
