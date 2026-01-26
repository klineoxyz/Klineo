/**
 * Encryption utilities for sensitive data (API keys, secrets)
 * Uses AES-256-GCM for authenticated encryption
 */

import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);
const IV_LENGTH = 12; // 96 bits for GCM
const SALT_LENGTH = 32;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32; // 256 bits

/**
 * Derive encryption key from ENCRYPTION_KEY env var
 * Supports both hex and base64 encoded keys
 */
async function getEncryptionKey(): Promise<Buffer> {
  const envKey = process.env.ENCRYPTION_KEY;
  if (!envKey) {
    throw new Error('ENCRYPTION_KEY environment variable is required');
  }

  // Try to decode as hex first, then base64
  let keyBuffer: Buffer;
  try {
    keyBuffer = Buffer.from(envKey, 'hex');
    if (keyBuffer.length !== KEY_LENGTH) {
      throw new Error('Invalid hex key length');
    }
  } catch {
    try {
      keyBuffer = Buffer.from(envKey, 'base64');
      if (keyBuffer.length !== KEY_LENGTH) {
        throw new Error('Invalid base64 key length');
      }
    } catch {
      // If neither works, derive from string using scrypt
      const salt = Buffer.from(envKey.slice(0, SALT_LENGTH), 'utf8');
      keyBuffer = (await scryptAsync(envKey, salt, KEY_LENGTH)) as Buffer;
    }
  }

  return keyBuffer;
}

/**
 * Encrypt data using AES-256-GCM
 * Returns: base64(IV + encrypted_data + auth_tag)
 */
export async function encrypt(data: string): Promise<string> {
  try {
    const key = await getEncryptionKey();
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv('aes-256-gcm', key, iv);

    let encrypted = cipher.update(data, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    const authTag = cipher.getAuthTag();

    // Combine: IV (12 bytes) + encrypted (variable) + authTag (16 bytes)
    const combined = Buffer.concat([iv, encrypted, authTag]);
    return combined.toString('base64');
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Encryption failed';
    throw new Error(`Encryption error: ${errorMessage}`);
  }
}

/**
 * Decrypt data encrypted with encrypt()
 * Input: base64(IV + encrypted_data + auth_tag)
 */
export async function decrypt(encryptedData: string): Promise<string> {
  try {
    const key = await getEncryptionKey();
    const combined = Buffer.from(encryptedData, 'base64');

    if (combined.length < IV_LENGTH + TAG_LENGTH) {
      throw new Error('Invalid encrypted data format');
    }

    // Extract: IV (12 bytes) + encrypted (variable) + authTag (16 bytes)
    const iv = combined.slice(0, IV_LENGTH);
    const authTag = combined.slice(-TAG_LENGTH);
    const encrypted = combined.slice(IV_LENGTH, -TAG_LENGTH);

    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString('utf8');
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Decryption failed';
    throw new Error(`Decryption error: ${errorMessage}`);
  }
}

/**
 * Mask API key for display (first 2 + last 2 chars)
 * Example: "abc123xyz" -> "ab***yz"
 */
export function maskApiKey(key: string): string {
  if (!key || key.length < 4) {
    return '****';
  }
  if (key.length <= 6) {
    return `${key[0]}${key[1]}***${key[key.length - 1]}`;
  }
  return `${key.slice(0, 2)}***${key.slice(-2)}`;
}
