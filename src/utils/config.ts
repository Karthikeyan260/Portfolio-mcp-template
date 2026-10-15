import type { Env } from '../types/env.js';

export const DEFAULT_SITE_URL = 'https://your-portfolio.example.com/';

export function getSiteUrl(env: Env): string {
  return env.SITE_URL ?? DEFAULT_SITE_URL;
}

export function hasGeminiKey(env: Env): boolean {
  return Boolean(env.GEMINI_API_KEY && env.GEMINI_API_KEY.length > 0);
}

export function hasGitHubToken(env: Env): boolean {
  return Boolean(env.GITHUB_TOKEN && env.GITHUB_TOKEN.length > 0);
}
