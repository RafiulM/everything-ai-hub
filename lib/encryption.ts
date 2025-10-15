import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';

export function encryptApiKey(apiKey: string): string {
    return CryptoJS.AES.encrypt(apiKey, ENCRYPTION_KEY).toString();
}

export function decryptApiKey(encryptedKey: string): string {
    const bytes = CryptoJS.AES.decrypt(encryptedKey, ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
}

export function validateApiKeyFormat(apiKey: string, provider: string): boolean {
    const patterns: Record<string, RegExp> = {
        openai: /^sk-[A-Za-z0-9]{48}$/,
        anthropic: /^sk-ant-api03-[A-Za-z0-9_-]{95}$/,
        google: /^[A-Za-z0-9_-]{39}$/,
        cohere: /^[A-Za-z0-9]{40}$/,
        mistral: /^[A-Za-z0-9_-]{32}$/,
        firecrawl: /^fc-[A-Za-z0-9]{32}$/
    };
    
    return patterns[provider]?.test(apiKey) || true;
}