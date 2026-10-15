import { z } from 'zod';

export const FocusAreaSchema = z.object({
  title: z.string(),
  description: z.string(),
});

export const ProfileSchema = z.object({
  name: z.string(),
  headline: z.string(),
  currentRole: z.string(),
  currentCompany: z.string(),
  location: z.string(),
  tagline: z.string(),
  siteUrl: z.string().url(),
  bio: z.string(),
  focusAreas: z.array(FocusAreaSchema),
  highlights: z.array(z.string()),
});
export type Profile = z.infer<typeof ProfileSchema>;

export const SocialLinkSchema = z.object({
  platform: z.string(),
  url: z.string().url(),
  handle: z.string().optional(),
});
export type SocialLink = z.infer<typeof SocialLinkSchema>;

export const ContactSchema = z.object({
  email: z.string().email(),
  phone: z.string(),
  location: z.string(),
  resumeUrl: z.string().url(),
  socialLinks: z.array(SocialLinkSchema),
});
export type Contact = z.infer<typeof ContactSchema>;

export const SkillCategorySchema = z.object({
  category: z.string(),
  skills: z.array(z.string()),
});
export type SkillCategory = z.infer<typeof SkillCategorySchema>;

export const ExperienceSchema = z.object({
  id: z.string(),
  title: z.string(),
  company: z.string(),
  companyDescription: z.string().nullable(),
  location: z.string(),
  startDate: z.string(),
  endDate: z.string().nullable(),
  current: z.boolean(),
  description: z.string(),
  tags: z.array(z.string()),
});
export type Experience = z.infer<typeof ExperienceSchema>;

export const EducationSchema = z.object({
  id: z.string(),
  institution: z.string(),
  degree: z.string(),
  startDate: z.string().nullable(),
  endDate: z.string(),
  details: z.string().nullable(),
});
export type Education = z.infer<typeof EducationSchema>;

export const ProjectMetricSchema = z.object({
  label: z.string(),
  value: z.string(),
});

export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  cluster: z.string(),
  type: z.string(),
  year: z.number(),
  status: z.string(),
  featured: z.boolean(),
  mission: z.string(),
  problem: z.string().nullable(),
  howItWorks: z.array(z.string()),
  pipeline: z.array(z.string()),
  achievement: z.string().nullable(),
  metrics: z.array(ProjectMetricSchema),
  stack: z.array(z.string()),
  githubUrl: z.string().url(),
  liveUrl: z.string().url(),
  caseStudyUrl: z.string().url().nullable(),
});
export type Project = z.infer<typeof ProjectSchema>;

export const CertificationSchema = z.object({
  group: z.string(),
  title: z.string(),
  issuer: z.string().nullable().optional(),
  verifyUrl: z.string().url().nullable().optional(),
  date: z.string().optional(),
  note: z.string().optional(),
});
export type Certification = z.infer<typeof CertificationSchema>;
