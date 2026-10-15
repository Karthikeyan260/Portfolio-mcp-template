import profileJson from '../../data/profile.json';
import contactJson from '../../data/contact.json';
import skillsJson from '../../data/skills.json';
import experienceJson from '../../data/experience.json';
import educationJson from '../../data/education.json';
import projectsJson from '../../data/projects.json';
import certificationsJson from '../../data/certifications.json';

import {
  CertificationSchema,
  ContactSchema,
  EducationSchema,
  ExperienceSchema,
  ProfileSchema,
  ProjectSchema,
  SkillCategorySchema,
  type Certification,
  type Contact,
  type Education,
  type Experience,
  type Profile,
  type Project,
  type SkillCategory,
} from '../types/portfolio.js';
import { z } from 'zod';

// Validated once at module load so a malformed data file fails fast at startup,
// not deep inside a tool call.
export const profile: Profile = ProfileSchema.parse(profileJson);
export const contact: Contact = ContactSchema.parse(contactJson);
export const skills: SkillCategory[] = z.array(SkillCategorySchema).parse(skillsJson);
export const experience: Experience[] = z.array(ExperienceSchema).parse(experienceJson);
export const education: Education[] = z.array(EducationSchema).parse(educationJson);
export const projects: Project[] = z.array(ProjectSchema).parse(projectsJson);
export const certifications: Certification[] = z
  .array(CertificationSchema)
  .parse(certificationsJson);

/** Renders the resume as markdown from the structured data — single source of truth. */
export function buildResumeMarkdown(): string {
  const expLines = experience
    .map((e) => {
      const dates = `${e.startDate}${e.current ? ' – Present' : e.endDate ? ` – ${e.endDate}` : ''}`;
      return `**${e.title}** — ${e.company}${e.companyDescription ? ` (${e.companyDescription})` : ''}, ${e.location}\n_${dates}_\n${e.description}\n_${e.tags.join(' · ')}_`;
    })
    .join('\n\n');

  const eduLines = education
    .map((e) => {
      const dates = e.startDate ? `${e.startDate}–${e.endDate}` : e.endDate;
      return `- **${e.degree}** — ${e.institution}, ${dates}.${e.details ? ` ${e.details}` : ''}`;
    })
    .join('\n');

  const skillLines = skills.map((s) => `- **${s.category}**: ${s.skills.join(', ')}`).join('\n');

  const featuredProjects = projects
    .filter((p) => p.featured)
    .map((p) => `- **${p.name}** — ${p.mission} ${p.liveUrl}`)
    .join('\n');

  const publications = certifications
    .filter((c) => c.group === 'Publications')
    .map((c) => `- "${c.title}"${c.issuer ? ` — ${c.issuer}` : ''}`)
    .join('\n');

  return `# ${profile.name}

${profile.headline} · ${profile.currentRole} @ ${profile.currentCompany} · ${profile.location}

Email: ${contact.email} · Phone: ${contact.phone}
${contact.socialLinks.map((s) => `${s.platform}: ${s.url}`).join(' · ')}
Portfolio: ${profile.siteUrl}

## Summary

${profile.bio}

## Experience

${expLines}

## Education

${eduLines}

## Skills

${skillLines}

## Selected Projects

${featuredProjects}

## Publications

${publications}

---
_Full PDF resume: ${contact.resumeUrl}_
`;
}
