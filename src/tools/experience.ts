import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { Env } from '../types/env.js';
import { experience } from '../services/data.js';
import { generateText } from '../services/gemini.js';
import { hasGeminiKey } from '../utils/config.js';
import { jsonResult, safeTool, textResult } from '../utils/errors.js';

function templatedSummary(): string {
  const current = experience.find((e) => e.current) ?? experience[0]!;
  const years = experience.length;
  return `${current.title} at ${current.company}, with ${years} roles spanning ${experience
    .map((e) => e.company)
    .join(
      ', ',
    )}. Focus areas: ${Array.from(new Set(experience.flatMap((e) => e.tags))).join(', ')}.`;
}

export function registerExperienceTools(server: McpServer, env: Env): void {
  server.registerTool(
    'get_experience',
    {
      title: 'Get experience',
      description: 'Returns the full work experience timeline.',
      inputSchema: {},
    },
    safeTool('get_experience', async () => jsonResult(experience)),
  );

  server.registerTool(
    'experience_summary',
    {
      title: 'Experience summary',
      description:
        'Returns a short natural-language summary of the work experience. Uses Gemini for a polished summary when GEMINI_API_KEY is configured, otherwise a templated one.',
      inputSchema: {
        targetRole: z
          .string()
          .optional()
          .describe('Optionally tailor the summary toward this target role.'),
      },
    },
    safeTool('experience_summary', async ({ targetRole }: { targetRole?: string }) => {
      if (!hasGeminiKey(env)) return textResult(templatedSummary());

      const roleContext = targetRole ? ` Tailor it toward a "${targetRole}" role.` : '';
      const prompt = `Summarize this work experience in 3-4 sentences, professional tone, third person.${roleContext}\n\n${JSON.stringify(experience, null, 2)}`;
      const summary = await generateText(env, 'experience_summary', prompt);
      return textResult(summary);
    }),
  );
}
