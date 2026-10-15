import { logger } from './logger.js';

const OVERRIDE_PATTERNS = [
  /ignore (all )?(previous|prior|above) instructions/i,
  /disregard (all )?(previous|prior|above) instructions/i,
  /you are now/i,
  /system prompt/i,
  /act as (?!an? (ats|recruiter|hiring manager))/i,
  /reveal (your |the )?(system prompt|instructions|api key)/i,
];

const SECRET_LOOKING_PATTERN =
  /(sk-[a-zA-Z0-9]{20,}|AIza[0-9A-Za-z_-]{20,}|ghp_[0-9A-Za-z]{20,}|xox[baprs]-[0-9A-Za-z-]{10,})/g;

const MAX_USER_TEXT_LENGTH = 8000;

/**
 * Prepares user-supplied free text (e.g. a pasted job description) for interpolation
 * into an LLM prompt: truncates, flags obvious prompt-injection attempts (logged, not
 * silently trusted), and fences the text so the model treats it as data, not instructions.
 */
export function sanitizeUserText(input: string): string {
  const truncated =
    input.length > MAX_USER_TEXT_LENGTH
      ? `${input.slice(0, MAX_USER_TEXT_LENGTH)}\n[...truncated]`
      : input;

  const suspicious = OVERRIDE_PATTERNS.some((pattern) => pattern.test(truncated));
  if (suspicious) {
    logger.warn('sanitize.suspected_prompt_injection', { length: truncated.length });
  }

  // Neutralize fence-breaking attempts and wrap as clearly delimited data.
  const escaped = truncated.replace(/```/g, '​`​`​`');
  return escaped;
}

export function fenceAsData(label: string, text: string): string {
  return `<${label}>\n${sanitizeUserText(text)}\n</${label}>`;
}

/** Scrubs secret-looking substrings out of any text before it leaves the server. */
export function scrubSecrets(text: string): string {
  return text.replace(SECRET_LOOKING_PATTERN, '[redacted]');
}
