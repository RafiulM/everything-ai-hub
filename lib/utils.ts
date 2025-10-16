import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Get system API key from environment variables (fallback)
 */
export function getSystemApiKey(provider: string): string | null {
  const systemKeys: Record<string, string> = {
    openai: process.env.OPENAI_API_KEY || '',
    anthropic: process.env.ANTHROPIC_API_KEY || '',
    firecrawl: process.env.FIRECRAWL_API_KEY || '',
    stability: process.env.STABILITY_API_KEY || '',
  };

  return systemKeys[provider] && systemKeys[provider].length > 0 ? systemKeys[provider] : null;
}
