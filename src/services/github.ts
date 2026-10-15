import type { Env } from '../types/env.js';
import { hasGitHubToken } from '../utils/config.js';
import { logger, serializeError } from '../utils/logger.js';
import { TtlCache } from './cache.js';

const GITHUB_REST_BASE = 'https://api.github.com';
const GITHUB_GRAPHQL_URL = 'https://api.github.com/graphql';
const REPO_METADATA_TTL_MS = 10 * 60 * 1000;
const PINNED_AND_CONTRIB_TTL_MS = 60 * 60 * 1000;

const repoMetadataCache = new TtlCache<RepoMetadata | null>(REPO_METADATA_TTL_MS);
const pinnedReposCache = new TtlCache<PinnedRepo[] | null>(PINNED_AND_CONTRIB_TTL_MS);
const contributionCache = new TtlCache<ContributionSummary | null>(PINNED_AND_CONTRIB_TTL_MS);

export interface RepoMetadata {
  fullName: string;
  description: string | null;
  stars: number;
  forks: number;
  openIssues: number;
  primaryLanguage: string | null;
  languages: string[];
  lastPushedAt: string | null;
  url: string;
}

export interface PinnedRepo {
  name: string;
  description: string | null;
  url: string;
  stars: number;
  forks: number;
  primaryLanguage: string | null;
}

export interface ContributionSummary {
  totalContributions: number;
  fromDate: string;
  toDate: string;
}

function restHeaders(env: Env): HeadersInit {
  const headers: Record<string, string> = {
    accept: 'application/vnd.github+json',
    'user-agent': 'portfolio-mcp',
  };
  if (hasGitHubToken(env)) headers.authorization = `Bearer ${env.GITHUB_TOKEN}`;
  return headers;
}

/** Parses `owner/repo` out of a github.com URL, or null if it isn't one. */
export function parseGitHubRepo(url: string): { owner: string; repo: string } | null {
  const match = /github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/i.exec(url);
  if (!match) return null;
  return { owner: match[1]!, repo: match[2]! };
}

export async function getRepoMetadata(
  env: Env,
  owner: string,
  repo: string,
): Promise<RepoMetadata | null> {
  return repoMetadataCache.getOrCompute(`${owner}/${repo}`, async () => {
    try {
      const [repoRes, langRes] = await Promise.all([
        fetch(`${GITHUB_REST_BASE}/repos/${owner}/${repo}`, { headers: restHeaders(env) }),
        fetch(`${GITHUB_REST_BASE}/repos/${owner}/${repo}/languages`, {
          headers: restHeaders(env),
        }),
      ]);
      if (!repoRes.ok) return null;

      const repoData = (await repoRes.json()) as {
        full_name: string;
        description: string | null;
        stargazers_count: number;
        forks_count: number;
        open_issues_count: number;
        language: string | null;
        pushed_at: string | null;
        html_url: string;
      };
      const languages = langRes.ok
        ? Object.keys((await langRes.json()) as Record<string, number>)
        : [];

      return {
        fullName: repoData.full_name,
        description: repoData.description,
        stars: repoData.stargazers_count,
        forks: repoData.forks_count,
        openIssues: repoData.open_issues_count,
        primaryLanguage: repoData.language,
        languages,
        lastPushedAt: repoData.pushed_at,
        url: repoData.html_url,
      };
    } catch (error) {
      logger.warn('github.repo_metadata_failed', { owner, repo, error: serializeError(error) });
      return null;
    }
  });
}

async function graphql<T>(
  env: Env,
  query: string,
  variables: Record<string, unknown>,
): Promise<T | null> {
  if (!hasGitHubToken(env)) return null;
  try {
    const response = await fetch(GITHUB_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${env.GITHUB_TOKEN}`,
        'user-agent': 'portfolio-mcp',
      },
      body: JSON.stringify({ query, variables }),
    });
    if (!response.ok) return null;
    const json = (await response.json()) as { data?: T; errors?: unknown[] };
    if (json.errors?.length) {
      logger.warn('github.graphql_errors', { errors: json.errors });
      return null;
    }
    return json.data ?? null;
  } catch (error) {
    logger.warn('github.graphql_failed', { error: serializeError(error) });
    return null;
  }
}

const PINNED_REPOS_QUERY = `
  query ($login: String!) {
    user(login: $login) {
      pinnedItems(first: 6, types: [REPOSITORY]) {
        nodes {
          ... on Repository {
            name
            description
            url
            stargazerCount
            forkCount
            primaryLanguage { name }
          }
        }
      }
    }
  }
`;

export async function getPinnedRepos(env: Env, username: string): Promise<PinnedRepo[] | null> {
  return pinnedReposCache.getOrCompute(username, async () => {
    const data = await graphql<{
      user: {
        pinnedItems: {
          nodes: Array<{
            name: string;
            description: string | null;
            url: string;
            stargazerCount: number;
            forkCount: number;
            primaryLanguage: { name: string } | null;
          }>;
        };
      } | null;
    }>(env, PINNED_REPOS_QUERY, { login: username });

    if (!data?.user) return null;
    return data.user.pinnedItems.nodes.map((node) => ({
      name: node.name,
      description: node.description,
      url: node.url,
      stars: node.stargazerCount,
      forks: node.forkCount,
      primaryLanguage: node.primaryLanguage?.name ?? null,
    }));
  });
}

const CONTRIBUTIONS_QUERY = `
  query ($login: String!) {
    user(login: $login) {
      contributionsCollection {
        contributionCalendar {
          totalContributions
        }
        startedAt
        endedAt
      }
    }
  }
`;

export async function getContributionSummary(
  env: Env,
  username: string,
): Promise<ContributionSummary | null> {
  return contributionCache.getOrCompute(username, async () => {
    const data = await graphql<{
      user: {
        contributionsCollection: {
          contributionCalendar: { totalContributions: number };
          startedAt: string;
          endedAt: string;
        };
      } | null;
    }>(env, CONTRIBUTIONS_QUERY, { login: username });

    if (!data?.user) return null;
    const { contributionCalendar, startedAt, endedAt } = data.user.contributionsCollection;
    return {
      totalContributions: contributionCalendar.totalContributions,
      fromDate: startedAt,
      toDate: endedAt,
    };
  });
}
