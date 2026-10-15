import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Env } from '../types/env.js';
import { education } from '../services/data.js';
import { jsonResult, safeTool } from '../utils/errors.js';

export function registerEducationTools(server: McpServer, _env: Env): void {
  server.registerTool(
    'get_education',
    {
      title: 'Get education',
      description: 'Returns the full education timeline (degrees, institutions, dates).',
      inputSchema: {},
    },
    safeTool('get_education', async () => jsonResult(education)),
  );
}
