import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { Env } from '../types/env.js';
import { skills } from '../services/data.js';
import { search } from '../services/search.js';
import { jsonResult, safeTool } from '../utils/errors.js';

export function registerSkillsTools(server: McpServer, env: Env): void {
  server.registerTool(
    'get_skills',
    {
      title: 'Get skills',
      description: 'Returns skills grouped by category. Optionally filter to a single category.',
      inputSchema: {
        category: z
          .string()
          .optional()
          .describe(
            'Filter to one category (e.g. "Agentic AI & LLMs"). Omit to get all categories.',
          ),
      },
    },
    safeTool('get_skills', async ({ category }: { category?: string }) => {
      if (!category) return jsonResult(skills);
      const normalized = category.toLowerCase();
      const matched = skills.filter((s) => s.category.toLowerCase().includes(normalized));
      return jsonResult(matched);
    }),
  );

  server.registerTool(
    'search_skills',
    {
      title: 'Search skills',
      description:
        'Searches all skills across categories by keyword (e.g. "vector database", "python").',
      inputSchema: {
        query: z.string().min(1).describe('Search text.'),
      },
    },
    safeTool('search_skills', async ({ query }: { query: string }) => {
      const flat = skills.flatMap((category) =>
        category.skills.map((skill) => ({ category: category.category, skill })),
      );
      const results = await search(env, query, flat, (item) => `${item.skill} ${item.category}`);
      return jsonResult(results.map((r) => ({ ...r.item, score: Number(r.score.toFixed(3)) })));
    }),
  );
}
