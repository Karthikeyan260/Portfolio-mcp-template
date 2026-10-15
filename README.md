# portfolio-mcp-template

A production-ready [Model Context Protocol](https://modelcontextprotocol.io) server exposing
your portfolio — profile, skills, experience, education,
projects, certifications, and resume — as MCP tools, resources, and prompts, so ChatGPT, Claude, and any
other MCP-compatible client can query it directly instead of browsing the website.

It also ships Gemini-powered AI tools for job matching: compare a job description against the profile,
estimate an ATS score, generate interview questions, get a learning plan, and draft tailored summaries.

Built with the official [`@modelcontextprotocol/sdk`](https://github.com/modelcontextprotocol/typescript-sdk),
TypeScript, and Zod, deployed on Cloudflare Workers.

> **Start here:** see [TEMPLATE.md](TEMPLATE.md) to fork this, fill in `data/`, and deploy. Built by
> [Karthikeyan K](https://karthikeyan.vercel.app/). Agent skills for using and setting it up are in
> [`skills/`](skills/).

## Architecture

```
                          ┌─────────────────────────┐
                          │   MCP Client            │
                          │ (ChatGPT / Claude /      │
                          │  MCP Inspector)          │
                          └───────────┬─────────────┘
                                      │ JSON-RPC over
                                      │ Streamable HTTP (POST /mcp)
                                      ▼
        ┌───────────────────────────────────────────────────────┐
        │                Cloudflare Worker (src/index.ts)        │
        │  routes: POST /mcp · GET /health · /version · /metrics │
        └───────────────────────┬─────────────────────────────────┘
                                 │ per-request
                                 ▼
        ┌───────────────────────────────────────────────────────┐
        │      StatelessHttpTransport (src/transport/)           │
        │  one JSON-RPC message in → one response out            │
        └───────────────────────┬─────────────────────────────────┘
                                 ▼
        ┌───────────────────────────────────────────────────────┐
        │            McpServer (src/server.ts)                   │
        │  ┌───────────┐ ┌────────────┐ ┌──────────────────┐    │
        │  │  tools/   │ │ resources/ │ │     prompts/      │    │
        │  │ 23 tools  │ │ 8 resources│ │    7 prompts       │    │
        │  └─────┬─────┘ └─────┬──────┘ └─────────┬──────────┘    │
        │        └─────────────┴──────────────────┘               │
        │                      ▼                                  │
        │  ┌───────────────────────────────────────────────────┐  │
        │  │                  services/                        │  │
        │  │  data.ts (JSON → Zod) · gemini.ts · github.ts ·    │  │
        │  │  search.ts (keyword + optional embeddings) ·       │  │
        │  │  cache.ts (in-memory TTL) · metrics.ts             │  │
        │  └───────────────────────────────────────────────────┘  │
        └───────────────────────────────────────────────────────┘
                    ▲                              ▲
                    │                              │
         Gemini API (generateContent,      GitHub REST + GraphQL
         embedContent) — optional,         (repo metadata always;
         GEMINI_API_KEY                    pinned repos / contributions
                                            need GITHUB_TOKEN)
```

For local development, `src/local.ts` connects the same `McpServer` (from `src/server.ts`) over stdio
instead of HTTP — no Worker or network required.

## Folder structure

```
portfolio-mcp/
  src/
    index.ts                    # Cloudflare Worker fetch entry (HTTP routes)
    local.ts                    # stdio entry point for local MCP clients
    server.ts                   # createMcpServer(env) — registers everything
    transport/
      statelessHttpTransport.ts # MCP Transport adapter for one-shot HTTP
    tools/                      # one module per domain, one per tool group
      portfolio.ts  skills.ts  experience.ts  education.ts
      projects.ts   certifications.ts  resume.ts  ai.ts
    resources/index.ts          # 8 resources reading from data/*.json
    prompts/index.ts            # 7 reusable prompt templates
    services/
      data.ts        # loads + Zod-validates data/*.json, builds resume markdown
      gemini.ts       # Gemini REST client (generate, embed)
      github.ts       # GitHub REST + GraphQL client (repo/pinned/contributions)
      search.ts       # keyword scoring + optional embedding blend
      cache.ts        # in-memory TTL cache
      metrics.ts       # per-isolate tool call counters
    utils/
      logger.ts  errors.ts  sanitize.ts  pagination.ts  config.ts
    types/
      env.ts  portfolio.ts       # Zod schemas + inferred types
  data/                          # the actual portfolio content (placeholders: replace with your own)
    profile.json  contact.json  skills.json  experience.json
    education.json  projects.json  certifications.json  resume.md
  examples/data/                 # placeholder data for people using this as a template
  skills/                        # SKILL.md agent skills (portfolio-mcp, portfolio-mcp-setup)
  scripts/validate-data.ts       # npm run validate:data
  TEMPLATE.md                    # how to make your own
  tests/
    services/  utils/  integration/
  .github/workflows/deploy.yml
  wrangler.jsonc  package.json  tsconfig.json  eslint.config.js  .prettierrc
```

## Installation

Requires Node.js 22+.

```bash
npm install
cp .env.example .env          # for reference; wrangler dev uses .dev.vars instead (see below)
```

## Development

### Local stdio (Claude Desktop, MCP Inspector)

```bash
npm run dev:stdio
```

This runs `src/local.ts` directly with `tsx`, connecting the server over stdio. Point the
[MCP Inspector](https://github.com/modelcontextprotocol/inspector) at it:

```bash
npx @modelcontextprotocol/inspector npm run dev:stdio
```

To use it from Claude Desktop, add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "portfolio": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/portfolio-mcp/src/local.ts"],
      "env": {
        "GEMINI_API_KEY": "your-key-here",
        "GITHUB_TOKEN": "optional-token-here"
      }
    }
  }
}
```

### Local Worker (Cloudflare Workers runtime)

```bash
# put local secrets in .dev.vars (git-ignored), one KEY=value per line:
echo "GEMINI_API_KEY=your-key-here" >> .dev.vars

npm run dev
```

Then test the HTTP endpoint directly:

```bash
curl http://localhost:8787/health

curl -X POST http://localhost:8787/mcp \
  -H "content-type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'

curl -X POST http://localhost:8787/mcp \
  -H "content-type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"get_profile","arguments":{}}}'
```

### Other commands

```bash
npm run typecheck   # tsc --noEmit
npm run lint         # eslint .
npm run lint:fix
npm run format       # prettier --write .
npm test             # vitest run
npm run test:watch
npm run validate:data  # check data/*.json against the schemas
```

## Deployment (Cloudflare Workers)

1. Authenticate wrangler once locally: `npx wrangler login`.
2. Set secrets (never in `wrangler.jsonc`):
   ```bash
   npx wrangler secret put GEMINI_API_KEY
   npx wrangler secret put GITHUB_TOKEN   # optional
   ```
3. Deploy:
   ```bash
   npm run deploy:dry-run   # sanity check the build first
   npm run deploy
   ```

### GitHub Actions (CI/CD)

`.github/workflows/deploy.yml` runs lint/typecheck/test on every push and PR to `main`, and deploys to
Cloudflare Workers on push to `main`. Add these repository secrets first:

- `CLOUDFLARE_API_TOKEN` — a token with Workers Scripts:Edit permission
- `CLOUDFLARE_ACCOUNT_ID` — your Cloudflare account ID

## Environment variables

| Variable         | Required | Purpose                                                                                                                                                                                                                                                                        |
| ---------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `GEMINI_API_KEY` | No       | Enables all AI tools (`compare_job`, `ats_match`, `interview_questions`, `recommend_learning`, `portfolio_summary`, `experience_summary`, `generate_resume_summary`) and semantic search. Without it, AI tools return a clear MCP error and search falls back to keyword-only. |
| `GITHUB_TOKEN`   | No       | Enables pinned repos + contribution calendar (GraphQL), and raises the REST rate limit for live repo metadata on `get_project`. No scopes beyond public read access needed.                                                                                                    |
| `SITE_URL`       | No       | Defaults to `https://your-portfolio.example.com/`. Used in `/version` and a couple of generated links.                                                                                                                                                                         |

## Tools

| Tool                      | Description                                                                     |
| ------------------------- | ------------------------------------------------------------------------------- |
| `get_profile`             | Full profile: name, role, company, location, tagline, bio, focus areas          |
| `get_about`               | About-me narrative                                                              |
| `get_contact`             | Email, phone, location                                                          |
| `get_social_links`        | GitHub, LinkedIn, Instagram, X, Hugging Face, Linktree                          |
| `get_skills`              | Skills grouped by category, optional category filter                            |
| `search_skills`           | Keyword/semantic search across all skills                                       |
| `get_experience`          | Full work experience timeline                                                   |
| `experience_summary`      | Natural-language summary of experience (AI or templated)                        |
| `get_education`           | Education timeline                                                              |
| `get_projects`            | Projects with filter (cluster/status/featured), sort, pagination                |
| `get_project`             | One project by id, optionally enriched with live GitHub metadata                |
| `search_projects`         | Keyword/semantic search across projects                                         |
| `recommend_projects`      | Best-matching projects for a query or skill list                                |
| `latest_projects`         | Most recent projects                                                            |
| `get_certifications`      | 45 certifications/courses/badges/publications/achievements, filter + pagination |
| `search_certifications`   | Keyword/semantic search across certifications                                   |
| `get_resume`              | Resume as markdown + PDF link                                                   |
| `generate_resume_summary` | AI-tailored resume summary paragraph                                            |
| `compare_job`             | Fit score, strengths, gaps, best-matching projects vs. a job description        |
| `ats_match`               | ATS keyword-match score, matched/missing keywords, suggestions                  |
| `interview_questions`     | Likely interview questions grounded in real projects/experience                 |
| `recommend_learning`      | Skills to learn + certifications to pursue                                      |
| `portfolio_summary`       | Natural-language portfolio overview tailored to an audience                     |

All AI tools (`compare_job`, `ats_match`, `interview_questions`, `recommend_learning`, `portfolio_summary`,
plus the AI paths of `experience_summary`/`generate_resume_summary`) require `GEMINI_API_KEY`. Every tool
validates input with Zod and returns a proper MCP error result (never an uncaught exception) on bad input,
missing config, or unexpected failures.

## Resources

`portfolio://resume.md` · `portfolio://profile.json` · `portfolio://skills.json` ·
`portfolio://experience.json` · `portfolio://education.json` · `portfolio://projects.json` ·
`portfolio://certifications.json` · `portfolio://contact.json`

## Prompts

`professional_bio` · `linkedin_summary` · `resume_summary` · `interview_introduction` ·
`project_explanation` · `cover_letter` · `portfolio_overview`

## Connecting from ChatGPT

1. Deploy the Worker (see above) so you have a public URL, e.g. `https://portfolio-mcp.<you>.workers.dev`.
2. In ChatGPT, open **Settings → Connectors → Advanced → Developer mode** (requires a ChatGPT plan that
   supports custom connectors) and add a new connector pointing at:
   ```
   https://portfolio-mcp.<you>.workers.dev/mcp
   ```
3. Enable the connector in a chat and ask things like "What are their featured projects?" or
   "Compare this job description against this profile: ...".

## Example tool responses

`get_profile`:

```json
{
  "name": "Your Name",
  "headline": "AI Engineer",
  "currentRole": "Associate Data Analyst",
  "currentCompany": "Zinnov",
  "tagline": "Building intelligent systems that act — not just answer."
}
```

`ats_match` (with `GEMINI_API_KEY` set):

```json
{
  "atsScore": 78,
  "matchedKeywords": ["LangChain", "RAG", "Python", "Vector Databases"],
  "missingKeywords": ["Kubernetes", "Terraform"],
  "suggestions": ["Add measurable infra/deployment experience if applicable."]
}
```

## Adding a new tool

1. Add (or extend) a module under `src/tools/`, exporting a `register*Tools(server, env)` function.
2. Call `server.registerTool(name, { title, description, inputSchema }, safeTool(name, handler))` —
   `inputSchema` is a Zod raw shape (object of Zod validators, not `z.object(...)`), and `safeTool` (from
   `src/utils/errors.ts`) converts thrown errors/Zod failures into proper MCP error results automatically.
3. Register the module in `src/server.ts`'s `createMcpServer`.
4. Add a test under `tests/` (unit test the underlying logic, or extend
   `tests/integration/server.test.ts` for a full round-trip check).

## Adding a new resource

Add an entry to the `RESOURCES` array in `src/resources/index.ts` with a unique `name`/`uri`, a
`getContent()` function, and register it — `registerResources` handles the rest.

## Troubleshooting

- **AI tools return "requires GEMINI_API_KEY"**: expected without a key configured — set it via
  `.dev.vars` (local) or `wrangler secret put GEMINI_API_KEY` (deployed).
- **`get_project`'s `liveMetadata` is always `null`**: GitHub REST is unauthenticated by default and
  rate-limited; set `GITHUB_TOKEN` to raise the limit. Pinned repos / contribution summary specifically
  require `GITHUB_TOKEN` (GraphQL) — expected to be `null` without it.
- **CORS errors from a browser-based MCP client**: `src/index.ts` already sends permissive CORS headers
  on every response including `OPTIONS`; check the client is hitting `/mcp` with `POST`, not `GET`.
- **`/metrics` counters reset unexpectedly**: they're per-isolate, in-memory only — a Cloudflare Workers
  cold start resets them. This is a documented limitation, not a bug.
- **`wrangler dev` can't find secrets**: local secrets go in a git-ignored `.dev.vars` file
  (`KEY=value` per line), not `.env` — `.env` is only for the stdio dev entry (`npm run dev:stdio`).

## License

MIT
