---
name: portfolio-mcp-setup
description: Set up your own portfolio MCP server from the portfolio-mcp template, fill it with your profile, skills, experience and projects, and deploy it free on Cloudflare Workers so ChatGPT, Claude and other assistants (and recruiters using them) can query your portfolio. Use when a user wants an MCP server for their portfolio, resume, or personal profile.
---

# Portfolio MCP setup

Walk the user through creating their own portfolio MCP server from the template at
https://github.com/Karthikeyan260/Portfolio-mcp-template. It ships 23 tools, 8 resources and 7 prompts, including Gemini-powered job matching, ATS scoring and interview prep.

## Before you start

Ask for, or find in the user's files:

- Their resume (PDF or text) or portfolio site URL. This is the source for every data file.
- A GitHub account, and a Cloudflare account (free tier is enough).
- Optional: a Gemini API key (enables the AI tools) and a GitHub token (live repo stats).

Requires Node.js 22+.

## Steps

1. **Create the repo.** Use "Use this template" on GitHub, or:
   ```bash
   git clone https://github.com/Karthikeyan260/Portfolio-mcp-template my-portfolio-mcp
   cd my-portfolio-mcp && rm -rf .git && git init
   npm install
   ```
2. **Start from the placeholders.** `data/` ships with example entries; `examples/data/` keeps a clean copy.
3. **Fill the data files** from the user's resume. Keep the schema exactly; `src/types/portfolio.ts` is the source of truth.
   - `profile.json`: name, headline, role, company, location, tagline, bio, focusAreas, highlights.
   - `contact.json`: email, resumeUrl, socialLinks. Put a phone number here only if the user wants it public.
   - `skills.json`, `experience.json`, `education.json`, `certifications.json`.
   - `projects.json`: every URL field must be a valid URL. `caseStudyUrl` and `problem` may be `null`.
   - `resume.md`: optional markdown resume.
     Don't invent achievements or numbers. Ask the user when something is missing.
4. **Validate:**
   ```bash
   npm run validate:data
   npm test
   ```
   Fix every `FAIL` line before going on. Update the name check in `tests/integration/server.test.ts` to the user's name.
5. **Personalise:** set `SITE_URL` in `wrangler.jsonc` and `DEFAULT_SITE_URL` in `src/utils/config.ts` to their site, and rename `name` in `wrangler.jsonc` and `package.json` if they want a different worker URL.
6. **Try it locally:**
   ```bash
   npx @modelcontextprotocol/inspector npm run dev:stdio
   ```
   Call `get_profile` and check the output is theirs.
7. **Deploy:**
   ```bash
   npx wrangler login
   npx wrangler secret put GEMINI_API_KEY   # optional
   npx wrangler secret put GITHUB_TOKEN     # optional
   npm run deploy
   ```
   The server is live at `https://<worker-name>.<subdomain>.workers.dev/mcp`. Check `/health`.
8. **Connect and share:**
   - Claude Code: `claude mcp add --transport http portfolio <url>/mcp`
   - ChatGPT: Settings → Connectors → Developer mode → add `<url>/mcp`.
   - Suggest adding the URL to their resume and LinkedIn as "Ask my AI about me".

## Never

- Commit API keys. Secrets go in `wrangler secret put` or the git-ignored `.dev.vars`.
- Publish personal details (phone, address) the user hasn't approved for a public server.
