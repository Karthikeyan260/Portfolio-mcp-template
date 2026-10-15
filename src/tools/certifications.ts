import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { Env } from '../types/env.js';
import { certifications } from '../services/data.js';
import { search } from '../services/search.js';
import { jsonResult, safeTool } from '../utils/errors.js';
import { paginate } from '../utils/pagination.js';
import type { Certification } from '../types/portfolio.js';

function certSearchText(cert: Certification): string {
  return [cert.title, cert.issuer ?? '', cert.group, cert.note ?? ''].join(' ');
}

export function registerCertificationTools(server: McpServer, env: Env): void {
  server.registerTool(
    'get_certifications',
    {
      title: 'Get certifications',
      description:
        'Returns certifications, courses, badges, publications, and achievements (45 total), optionally filtered by group and paginated.',
      inputSchema: {
        group: z
          .enum([
            'Certifications',
            'Courses & Workshops',
            'Badges & Recognition',
            'Publications',
            'Achievements',
          ])
          .optional()
          .describe('Filter to a single group.'),
        page: z.number().int().min(1).optional(),
        pageSize: z.number().int().min(1).max(100).optional(),
      },
    },
    safeTool(
      'get_certifications',
      async ({ group, page, pageSize }: { group?: string; page?: number; pageSize?: number }) => {
        const filtered = group ? certifications.filter((c) => c.group === group) : certifications;
        return jsonResult(paginate(filtered, { page, pageSize }));
      },
    ),
  );

  server.registerTool(
    'search_certifications',
    {
      title: 'Search certifications',
      description:
        'Searches certifications/courses/badges/publications/achievements by keyword or issuer.',
      inputSchema: {
        query: z
          .string()
          .min(1)
          .describe('Search text, e.g. "Anthropic", "prompt engineering", "AWS".'),
      },
    },
    safeTool('search_certifications', async ({ query }: { query: string }) => {
      const results = await search(env, query, certifications, certSearchText);
      return jsonResult(results.map((r) => ({ ...r.item, score: Number(r.score.toFixed(3)) })));
    }),
  );
}
