import { z } from 'zod';
import { logger, serializeError } from './logger.js';
import { recordToolCall } from '../services/metrics.js';

export class PortfolioError extends Error {
  constructor(
    message: string,
    public readonly code: string = 'PORTFOLIO_ERROR',
  ) {
    super(message);
    this.name = 'PortfolioError';
  }
}

export class AiUnavailableError extends PortfolioError {
  constructor(feature: string) {
    super(
      `"${feature}" requires GEMINI_API_KEY to be configured on the server. Ask the server operator to set it (see .env.example / wrangler secret put GEMINI_API_KEY).`,
      'AI_UNAVAILABLE',
    );
    this.name = 'AiUnavailableError';
  }
}

export class NotFoundError extends PortfolioError {
  constructor(entity: string, id: string) {
    super(`${entity} "${id}" was not found.`, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export interface ToolTextResult {
  [key: string]: unknown;
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

export function textResult(text: string): ToolTextResult {
  return { content: [{ type: 'text', text }] };
}

export function jsonResult(data: unknown): ToolTextResult {
  return textResult(JSON.stringify(data, null, 2));
}

/**
 * Wraps a tool handler so Zod validation failures and thrown errors become a
 * well-formed MCP tool error result instead of an uncaught exception.
 */
export function safeTool<Args extends unknown[]>(
  toolName: string,
  handler: (...args: Args) => Promise<ToolTextResult>,
): (...args: Args) => Promise<ToolTextResult> {
  return async (...args: Args) => {
    const startedAt = Date.now();
    try {
      const result = await handler(...args);
      const durationMs = Date.now() - startedAt;
      logger.info('tool.call', { tool: toolName, durationMs });
      recordToolCall(toolName, durationMs, Boolean(result.isError));
      return result;
    } catch (error) {
      const durationMs = Date.now() - startedAt;
      logger.error('tool.error', { tool: toolName, durationMs, error: serializeError(error) });
      recordToolCall(toolName, durationMs, true);

      if (error instanceof z.ZodError) {
        return {
          ...textResult(
            `Invalid input for "${toolName}": ${error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`,
          ),
          isError: true,
        };
      }
      if (error instanceof PortfolioError) {
        return { ...textResult(error.message), isError: true };
      }
      return {
        ...textResult(`Unexpected error in "${toolName}". This has been logged; please try again.`),
        isError: true,
      };
    }
  };
}
