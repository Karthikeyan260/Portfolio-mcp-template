import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Env } from './types/env.js';
import { registerPortfolioTools } from './tools/portfolio.js';
import { registerSkillsTools } from './tools/skills.js';
import { registerExperienceTools } from './tools/experience.js';
import { registerEducationTools } from './tools/education.js';
import { registerProjectTools } from './tools/projects.js';
import { registerCertificationTools } from './tools/certifications.js';
import { registerResumeTools } from './tools/resume.js';
import { registerAiTools } from './tools/ai.js';
import { registerResources } from './resources/index.js';
import { registerPrompts } from './prompts/index.js';

export const SERVER_NAME = 'portfolio-mcp';
export const SERVER_VERSION = '1.0.0';

/** Builds a fresh McpServer with every tool/resource/prompt registered against the given env. */
export function createMcpServer(env: Env): McpServer {
  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });

  registerPortfolioTools(server, env);
  registerSkillsTools(server, env);
  registerExperienceTools(server, env);
  registerEducationTools(server, env);
  registerProjectTools(server, env);
  registerCertificationTools(server, env);
  registerResumeTools(server, env);
  registerAiTools(server, env);

  registerResources(server);
  registerPrompts(server);

  return server;
}
