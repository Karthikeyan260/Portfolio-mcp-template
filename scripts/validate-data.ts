/**
 * Validates every file in a data folder against the Zod schemas the server uses.
 * Usage: npm run validate:data            (checks ./data)
 *        npm run validate:data -- examples/data
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import {
  ProfileSchema,
  ContactSchema,
  SkillCategorySchema,
  ExperienceSchema,
  EducationSchema,
  ProjectSchema,
  CertificationSchema,
} from '../src/types/portfolio';

const dir = process.argv[2] ?? 'data';
const files: Record<string, z.ZodTypeAny> = {
  'profile.json': ProfileSchema,
  'contact.json': ContactSchema,
  'skills.json': z.array(SkillCategorySchema),
  'experience.json': z.array(ExperienceSchema),
  'education.json': z.array(EducationSchema),
  'projects.json': z.array(ProjectSchema),
  'certifications.json': z.array(CertificationSchema),
};

let failed = false;
for (const [file, schema] of Object.entries(files)) {
  const path = join(dir, file);
  try {
    const result = schema.safeParse(JSON.parse(readFileSync(path, 'utf8')));
    if (result.success) {
      process.stdout.write(`ok    ${path}\n`);
    } else {
      failed = true;
      console.error(`FAIL  ${path}`);
      for (const issue of result.error.issues) {
        console.error(`      ${issue.path.join('.') || '(root)'}: ${issue.message}`);
      }
    }
  } catch (err) {
    failed = true;
    console.error(`FAIL  ${path}: ${(err as Error).message}`);
  }
}
process.exit(failed ? 1 : 0);
