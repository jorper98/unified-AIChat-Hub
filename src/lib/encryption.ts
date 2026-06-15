import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

if (!ENCRYPTION_KEY) {
  throw new Error('CRITICAL: ENCRYPTION_KEY environment variable is not set. Please set it in your .env file.');
}

if (ENCRYPTION_KEY.length !== 32) {
  throw new Error(`CRITICAL: ENCRYPTION_KEY must be exactly 32 characters long. Current length: ${ENCRYPTION_KEY.length}`);
}

// Narrow the type for TypeScript
const keyBuffer = Buffer.from(ENCRYPTION_KEY.slice(0, 32));

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decrypt(encryptedData: string): string {
  const [ivHex, authTagHex, encryptedText] = encryptedData.split(':');
  if (!ivHex || !authTagHex || !encryptedText) {
    throw new Error('Invalid encrypted data format');
  }
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
