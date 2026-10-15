import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { Env } from '../types/env.js';
import { projects } from '../services/data.js';
import { getRepoMetadata, parseGitHubRepo } from '../services/github.js';
import { search } from '../services/search.js';
import { jsonResult, safeTool } from '../utils/errors.js';
import { NotFoundError } from '../utils/errors.js';
import { paginate } from '../utils/pagination.js';
import type { Project } from '../types/portfolio.js';

function projectSearchText(project: Project): string {
  return [
    project.name,
    project.mission,
    project.type,
    project.cluster,
    project.stack.join(' '),
    project.problem ?? '',
  ].join(' ');
}

export function registerProjectTools(server: McpServer, env: Env): void {
  server.registerTool(
    'get_projects',
    {
      title: 'Get projects',
      description: 'Returns projects with optional filtering, sorting, and pagination.',
      inputSchema: {
        cluster: z
          .string()
          .optional()
          .describe('Filter by cluster, e.g. "LLM & Agents", "Vision & NLP".'),
        status: z.string().optional().describe('Filter by status, e.g. "LIVE".'),
        featured: z
          .boolean()
          .optional()
          .describe('If true, only return featured/flagship projects.'),
        sortBy: z.enum(['year', 'name']).optional().default('year').describe('Field to sort by.'),
        sortOrder: z.enum(['asc', 'desc']).optional().default('desc').describe('Sort direction.'),
        page: z.number().int().min(1).optional(),
        pageSize: z.number().int().min(1).max(100).optional(),
      },
    },
    safeTool(
      'get_projects',
      async ({
        cluster,
        status,
        featured,
        sortBy = 'year',
        sortOrder = 'desc',
        page,
        pageSize,
      }: {
        cluster?: string;
        status?: string;
        featured?: boolean;
        sortBy?: 'year' | 'name';
        sortOrder?: 'asc' | 'desc';
        page?: number;
        pageSize?: number;
      }) => {
        let filtered = [...projects];
        if (cluster)
          filtered = filtered.filter((p) =>
            p.cluster.toLowerCase().includes(cluster.toLowerCase()),
          );
        if (status)
          filtered = filtered.filter((p) => p.status.toLowerCase() === status.toLowerCase());
        if (featured !== undefined) filtered = filtered.filter((p) => p.featured === featured);

        filtered.sort((a, b) => {
          const direction = sortOrder === 'asc' ? 1 : -1;
          if (sortBy === 'name') return a.name.localeCompare(b.name) * direction;
          return (a.year - b.year) * direction;
        });

        return jsonResult(paginate(filtered, { page, pageSize }));
      },
    ),
  );

  server.registerTool(
    'get_project',
    {
      title: 'Get project',
      description:
        'Returns full detail for one project by id (see get_projects for ids), optionally enriched with live GitHub repo metadata.',
      inputSchema: {
        id: z.string().min(1).describe('Project id, e.g. "ai-consulting".'),
        includeLiveMetadata: z
          .boolean()
          .optional()
          .default(false)
          .describe('If true, fetch live GitHub stars/forks/languages/last-push for this project.'),
      },
    },
    safeTool(
      'get_project',
      async ({
        id,
        includeLiveMetadata = false,
      }: {
        id: string;
        includeLiveMetadata?: boolean;
      }) => {
        const project = projects.find((p) => p.id === id);
        if (!project) throw new NotFoundError('Project', id);

        if (!includeLiveMetadata) return jsonResult(project);

        const parsed = parseGitHubRepo(project.githubUrl);
        const liveMetadata = parsed ? await getRepoMetadata(env, parsed.owner, parsed.repo) : null;
        return jsonResult({ ...project, liveMetadata });
      },
    ),
  );

  server.registerTool(
    'search_projects',
    {
      title: 'Search projects',
      description:
        'Full-text/semantic search across all projects by name, mission, stack, and cluster.',
      inputSchema: {
        query: z
          .string()
          .min(1)
          .describe('Search text, e.g. "RAG entity resolution" or "game AI".'),
      },
    },
    safeTool('search_projects', async ({ query }: { query: string }) => {
      const results = await search(env, query, projects, projectSearchText);
      return jsonResult(results.map((r) => ({ ...r.item, score: Number(r.score.toFixed(3)) })));
    }),
  );

  server.registerTool(
    'recommend_projects',
    {
      title: 'Recommend projects',
      description:
        'Recommends the most relevant projects for a given query or list of target skills — useful for "which projects best fit this job/skill set".',
      inputSchema: {
        query: z
          .string()
          .optional()
          .describe('Free-text context, e.g. a job description or role title.'),
        skills: z
          .array(z.string())
          .optional()
          .describe('Specific skills to match projects against.'),
        limit: z.number().int().min(1).max(20).optional().default(5),
      },
    },
    safeTool(
      'recommend_projects',
      async ({
        query,
        skills,
        limit = 5,
      }: {
        query?: string;
        skills?: string[];
        limit?: number;
      }) => {
        const combinedQuery = [query, ...(skills ?? [])].filter(Boolean).join(' ');
        if (!combinedQuery.trim()) {
          throw new Error('Provide at least a "query" or a non-empty "skills" list.');
        }
        const results = await search(env, combinedQuery, projects, projectSearchText);
        return jsonResult(
          results.slice(0, limit).map((r) => ({ ...r.item, score: Number(r.score.toFixed(3)) })),
        );
      },
    ),
  );

  server.registerTool(
    'latest_projects',
    {
      title: 'Latest projects',
      description: 'Returns the most recent projects, newest first.',
      inputSchema: {
        limit: z.number().int().min(1).max(50).optional().default(5),
      },
    },
    safeTool('latest_projects', async ({ limit = 5 }: { limit?: number }) => {
      const sorted = [...projects].sort(
        (a, b) => b.year - a.year || Number(b.featured) - Number(a.featured),
      );
      return jsonResult(sorted.slice(0, limit));
    }),
  );
}
