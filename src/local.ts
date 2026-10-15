#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMcpServer } from './server.js';
import type { Env } from './types/env.js';

const env: Env = {
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GITHUB_TOKEN: process.env.GITHUB_TOKEN,
  SITE_URL: process.env.SITE_URL,
};

async function main(): Promise<void> {
  const server = createMcpServer(env);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('portfolio-mcp: stdio server running');
}

main().catch((error) => {
  console.error('portfolio-mcp: fatal error', error);
  process.exit(1);
});
