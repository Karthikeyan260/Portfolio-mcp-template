import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createMcpServer } from '../../src/server.js';
import type { Env } from '../../src/types/env.js';

describe('portfolio-mcp server (in-memory transport)', () => {
  let client: Client;

  beforeEach(async () => {
    const server = createMcpServer({} as Env);
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    client = new Client({ name: 'test-client', version: '1.0.0' });
    await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);
  });

  afterEach(async () => {
    await client.close();
  });

  it('lists all expected tools', async () => {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);
    for (const expected of [
      'get_profile',
      'get_about',
      'get_contact',
      'get_social_links',
      'get_skills',
      'search_skills',
      'get_experience',
      'experience_summary',
      'get_education',
      'get_projects',
      'get_project',
      'search_projects',
      'recommend_projects',
      'latest_projects',
      'get_certifications',
      'search_certifications',
      'get_resume',
      'generate_resume_summary',
      'compare_job',
      'ats_match',
      'interview_questions',
      'recommend_learning',
      'portfolio_summary',
    ]) {
      expect(names).toContain(expected);
    }
  });

  it('calls get_profile and returns the real name', async () => {
    const result = await client.callTool({ name: 'get_profile', arguments: {} });
    expect(result.isError).toBeFalsy();
    const content = (result.content as Array<{ type: string; text: string }>)[0]!;
    expect(content.text).toContain('Your Name');
  });

  it('calls get_project with an unknown id and returns an error result, not a throw', async () => {
    const result = await client.callTool({
      name: 'get_project',
      arguments: { id: 'does-not-exist' },
    });
    expect(result.isError).toBe(true);
  });

  it('calls compare_job without GEMINI_API_KEY and returns a clear AI-unavailable error', async () => {
    const result = await client.callTool({
      name: 'compare_job',
      arguments: {
        jobDescription: 'We are hiring a senior backend engineer with 5+ years of experience.',
      },
    });
    expect(result.isError).toBe(true);
    const content = (result.content as Array<{ type: string; text: string }>)[0]!;
    expect(content.text).toContain('GEMINI_API_KEY');
  });

  it('lists all expected resources', async () => {
    const { resources } = await client.listResources();
    const uris = resources.map((r) => r.uri);
    expect(uris).toEqual(
      expect.arrayContaining([
        'portfolio://resume.md',
        'portfolio://profile.json',
        'portfolio://skills.json',
        'portfolio://experience.json',
        'portfolio://education.json',
        'portfolio://projects.json',
        'portfolio://certifications.json',
        'portfolio://contact.json',
      ]),
    );
  });

  it('lists all expected prompts', async () => {
    const { prompts } = await client.listPrompts();
    const names = prompts.map((p) => p.name);
    expect(names).toEqual(
      expect.arrayContaining([
        'professional_bio',
        'linkedin_summary',
        'resume_summary',
        'interview_introduction',
        'project_explanation',
        'cover_letter',
        'portfolio_overview',
      ]),
    );
  });
});
