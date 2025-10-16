import crypto from "crypto";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "default-dev-key-change-in-production";

// Derive a consistent 32-byte key from the encryption string
function deriveKey(key: string): Buffer {
  return crypto.createHash("sha256").update(key).digest();
}

export function encryptApiKey(plaintext: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    deriveKey(ENCRYPTION_KEY),
    iv
  );

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");

  // Combine IV and encrypted data
  const combined = iv.toString("hex") + ":" + encrypted;
  return combined;
}

export function decryptApiKey(encrypted: string): string {
  const [ivHex, encryptedHex] = encrypted.split(":");
  const iv = Buffer.from(ivHex, "hex");

  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    deriveKey(ENCRYPTION_KEY),
    iv
  );

  let decrypted = decipher.update(encryptedHex, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
