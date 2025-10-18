import CryptoJS from 'crypto-js';

// In production, this should be stored in environment variables
// and rotated regularly
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';

/**
 * Encrypts sensitive data using AES encryption
 */
export function encrypt(data: string): string {
  const encrypted = CryptoJS.AES.encrypt(data, ENCRYPTION_KEY).toString();
  return encrypted;
}

/**
 * Decrypts sensitive data using AES decryption
 */
export function decrypt(encryptedData: string): string {
  const decrypted = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
  return decrypted.toString(CryptoJS.enc.Utf8);
}

/**
 * Validates if a decrypted value is valid
 */
export function isValidDecryptedValue(value: string): boolean {
  return value && value.length > 0 && value !== 'Error';
}
