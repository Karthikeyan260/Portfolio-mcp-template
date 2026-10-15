import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  buildResumeMarkdown,
  certifications,
  contact,
  education,
  experience,
  profile,
  projects,
  skills,
} from '../services/data.js';

interface ResourceDef {
  name: string;
  uri: string;
  title: string;
  description: string;
  mimeType: 'application/json' | 'text/markdown';
  getContent: () => string;
}

const RESOURCES: ResourceDef[] = [
  {
    name: 'resume',
    uri: 'portfolio://resume.md',
    title: 'Resume (Markdown)',
    description: 'Full resume rendered as markdown from the structured portfolio data.',
    mimeType: 'text/markdown',
    getContent: () => buildResumeMarkdown(),
  },
  {
    name: 'profile',
    uri: 'portfolio://profile.json',
    title: 'Profile',
    description: 'Name, role, company, location, tagline, bio, and focus areas.',
    mimeType: 'application/json',
    getContent: () => JSON.stringify(profile, null, 2),
  },
  {
    name: 'skills',
    uri: 'portfolio://skills.json',
    title: 'Skills',
    description: 'Skills grouped by category.',
    mimeType: 'application/json',
    getContent: () => JSON.stringify(skills, null, 2),
  },
  {
    name: 'experience',
    uri: 'portfolio://experience.json',
    title: 'Experience',
    description: 'Work experience timeline.',
    mimeType: 'application/json',
    getContent: () => JSON.stringify(experience, null, 2),
  },
  {
    name: 'education',
    uri: 'portfolio://education.json',
    title: 'Education',
    description: 'Education timeline.',
    mimeType: 'application/json',
    getContent: () => JSON.stringify(education, null, 2),
  },
  {
    name: 'projects',
    uri: 'portfolio://projects.json',
    title: 'Projects',
    description: 'All projects with mission, stack, metrics, and links.',
    mimeType: 'application/json',
    getContent: () => JSON.stringify(projects, null, 2),
  },
  {
    name: 'certifications',
    uri: 'portfolio://certifications.json',
    title: 'Certifications',
    description: 'Certifications, courses, badges, publications, and achievements.',
    mimeType: 'application/json',
    getContent: () => JSON.stringify(certifications, null, 2),
  },
  {
    name: 'contact',
    uri: 'portfolio://contact.json',
    title: 'Contact',
    description: 'Email, phone, location, resume URL, and social links.',
    mimeType: 'application/json',
    getContent: () => JSON.stringify(contact, null, 2),
  },
];

export function registerResources(server: McpServer): void {
  for (const resource of RESOURCES) {
    server.registerResource(
      resource.name,
      resource.uri,
      { title: resource.title, description: resource.description, mimeType: resource.mimeType },
      async (uri: URL) => ({
        contents: [{ uri: uri.href, mimeType: resource.mimeType, text: resource.getContent() }],
      }),
    );
  }
}
