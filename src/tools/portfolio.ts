import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Env } from '../types/env.js';
import { contact, profile } from '../services/data.js';
import { jsonResult, safeTool } from '../utils/errors.js';

export function registerPortfolioTools(server: McpServer, _env: Env): void {
  server.registerTool(
    'get_profile',
    {
      title: 'Get profile',
      description:
        'Returns the full profile: name, role, company, location, tagline, bio, and focus areas.',
      inputSchema: {},
    },
    safeTool('get_profile', async () => jsonResult(profile)),
  );

  server.registerTool(
    'get_about',
    {
      title: 'Get about',
      description: 'Returns the "About Me" narrative — bio, tagline, and areas of focus.',
      inputSchema: {},
    },
    safeTool('get_about', async () =>
      jsonResult({
        name: profile.name,
        tagline: profile.tagline,
        bio: profile.bio,
        focusAreas: profile.focusAreas,
        highlights: profile.highlights,
      }),
    ),
  );

  server.registerTool(
    'get_contact',
    {
      title: 'Get contact',
      description: 'Returns contact details: email, phone, and location.',
      inputSchema: {},
    },
    safeTool('get_contact', async () =>
      jsonResult({ email: contact.email, phone: contact.phone, location: contact.location }),
    ),
  );

  server.registerTool(
    'get_social_links',
    {
      title: 'Get social links',
      description:
        'Returns social/professional profile links (GitHub, LinkedIn, Instagram, X, Hugging Face, Linktree).',
      inputSchema: {},
    },
    safeTool('get_social_links', async () => jsonResult(contact.socialLinks)),
  );
}
