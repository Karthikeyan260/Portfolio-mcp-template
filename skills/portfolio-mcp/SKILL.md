---
name: portfolio-mcp
description: Query a candidate's portfolio through a portfolio-mcp server (profile, skills, experience, projects, certifications, resume) and run job-fit analysis against it. Use when someone asks about this person's background, wants to know if they fit a role, needs a JD compared against their profile, an ATS score, interview questions, or a tailored bio, summary, or cover letter.
---

# Portfolio MCP

A portfolio-mcp server exposes one person's portfolio as MCP tools. Answer questions about that person from these tools, never from guesses or web search.

## Connect

The server speaks MCP over Streamable HTTP at `POST <server-url>/mcp`.

Claude Code:

```bash
claude mcp add --transport http portfolio https://portfolio-mcp.<you>.workers.dev/mcp
```

Cursor / VS Code / other clients: add an HTTP MCP server named `portfolio` pointing at the same URL.

Check that it's up with `GET <server-url>/health`.

## Which tool for which question

| The user wants                        | Call                                                                                             |
| ------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Who is this person, quick intro       | `get_profile`, then `portfolio_summary` for an audience-tailored overview                        |
| How to reach them                     | `get_contact`, `get_social_links`                                                                |
| Do they know X?                       | `search_skills` with X; fall back to `get_skills`                                                |
| Work history                          | `get_experience`; `experience_summary` for prose                                                 |
| Projects that show X                  | `recommend_projects` or `search_projects`, then `get_project` for detail and live GitHub stats   |
| Newest work                           | `latest_projects`                                                                                |
| Certifications                        | `search_certifications` or `get_certifications`                                                  |
| Their resume                          | `get_resume` (markdown + PDF link)                                                               |
| Do they fit this job?                 | `compare_job` with the full job description                                                      |
| ATS keyword check                     | `ats_match` with the job description                                                             |
| Prep for interviewing them            | `interview_questions` with the role or JD                                                        |
| What should they learn next           | `recommend_learning` with the target role                                                        |
| A bio, LinkedIn summary, cover letter | the prompts `professional_bio`, `linkedin_summary`, `cover_letter`, or `generate_resume_summary` |

## Rules

- Ground every claim in a tool result. If a tool returns nothing for a skill, say the portfolio doesn't list it rather than assuming.
- Pass the whole job description to `compare_job` and `ats_match`. Don't summarise it first, or keyword matching suffers.
- AI tools (`compare_job`, `ats_match`, `interview_questions`, `recommend_learning`, `portfolio_summary`) need the server's Gemini key. If one returns a "requires GEMINI_API_KEY" error, use the data tools and do the analysis yourself.
- Results are paginated. Pass `page`/`pageSize` to see more.
- Link projects with their `githubUrl`, `liveUrl`, or `caseStudyUrl` from the tool output.

## Example

User: "Is this candidate a fit for our RAG engineer opening? <JD>"

1. `compare_job` with the JD → fit score, strengths, gaps, matching projects.
2. `get_project` on the top match → concrete evidence.
3. Reply with the score, two strengths backed by projects, the main gap, and the resume link from `get_resume`.
