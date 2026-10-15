import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { Env } from '../types/env.js';
import { buildResumeMarkdown, contact } from '../services/data.js';
import { generateText } from '../services/gemini.js';
import { hasGeminiKey } from '../utils/config.js';
import { jsonResult, safeTool, textResult } from '../utils/errors.js';

export function registerResumeTools(server: McpServer, env: Env): void {
  server.registerTool(
    'get_resume',
    {
      title: 'Get resume',
      description: 'Returns the resume as markdown text plus a link to the downloadable PDF.',
      inputSchema: {},
    },
    safeTool('get_resume', async () =>
      jsonResult({ markdown: buildResumeMarkdown(), pdfUrl: contact.resumeUrl }),
    ),
  );

  server.registerTool(
    'generate_resume_summary',
    {
      title: 'Generate resume summary',
      description:
        'Generates a tailored professional summary paragraph from the resume, optionally targeted at a role or job description. Requires GEMINI_API_KEY.',
      inputSchema: {
        targetRole: z
          .string()
          .optional()
          .describe('Target role/title to tailor the summary toward.'),
        jobDescription: z
          .string()
          .optional()
          .describe('Optional job description text to tailor against.'),
      },
    },
    safeTool(
      'generate_resume_summary',
      async ({ targetRole, jobDescription }: { targetRole?: string; jobDescription?: string }) => {
        if (!hasGeminiKey(env)) {
          return textResult(
            'AI-generated resume summaries require GEMINI_API_KEY. Returning the static resume summary section instead:\n\n' +
              buildResumeMarkdown().split('## Experience')[0]!.split('## Summary')[1]!.trim(),
          );
        }
        const context = [
          targetRole ? `Target role: ${targetRole}` : '',
          jobDescription ? `Job description:\n${jobDescription}` : '',
        ]
          .filter(Boolean)
          .join('\n\n');
        const prompt = `Write a tailored 3-4 sentence professional resume summary paragraph based on this resume.${
          context ? `\n\n${context}` : ''
        }\n\nResume:\n${buildResumeMarkdown()}`;
        const summary = await generateText(env, 'generate_resume_summary', prompt);
        return textResult(summary);
      },
    ),
  );
}
