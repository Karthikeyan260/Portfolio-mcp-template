# Use portfolio-mcp for your own portfolio

This repo is a template: fork it, swap in your data, deploy free on Cloudflare Workers, and any MCP client
(ChatGPT, Claude, Cursor, Copilot…) can query your portfolio and run job-fit analysis against it.

## Quick start

```bash
git clone https://github.com/Karthikeyan260/Portfolio-mcp-template my-portfolio-mcp
cd my-portfolio-mcp
npm install

# data/ holds placeholders: edit them (examples/data/ keeps a clean copy)

npm run validate:data   # checks every file against the server's schemas
npm test
npm run deploy          # after `npx wrangler login`
```

## What to edit

| File                                    | What goes in it                                                    |
| --------------------------------------- | ------------------------------------------------------------------ |
| `data/profile.json`                     | Name, headline, role, bio, focus areas, highlights                 |
| `data/contact.json`                     | Email, resume URL, social links (phone only if you want it public) |
| `data/skills.json`                      | Skills grouped by category                                         |
| `data/experience.json`                  | Work history                                                       |
| `data/education.json`                   | Degrees and schools                                                |
| `data/projects.json`                    | Projects with stack, metrics, GitHub and live links                |
| `data/certifications.json`              | Certifications, courses, publications                              |
| `data/resume.md`                        | Optional markdown resume                                           |
| `wrangler.jsonc`, `src/utils/config.ts` | Your `SITE_URL` and worker name                                    |
| `tests/integration/server.test.ts`      | Change the expected name to yours                                  |

Schemas live in `src/types/portfolio.ts`. Optional secrets: `GEMINI_API_KEY` (AI tools) and `GITHUB_TOKEN`
(live repo stats), set with `npx wrangler secret put`.

## Agent skills

`skills/` holds two [SKILL.md](https://www.agensi.io/learn/what-is-skill-md) skills that work in Claude Code,
Cursor, Codex CLI, Gemini CLI, Copilot and other agents:

- `skills/portfolio-mcp`: teaches an agent when and how to use a portfolio-mcp server's tools.
- `skills/portfolio-mcp-setup`: walks an agent through building and deploying your own from this template.

To install one in Claude Code, copy its folder into `~/.claude/skills/` (or `.claude/skills/` in a project).
