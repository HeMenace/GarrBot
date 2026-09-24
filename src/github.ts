import type { Env } from './env.js';

const GITHUB_API_BASE = 'https://api.github.com';
const WORDS_PATH = 'data/words.txt';

function base64Encode(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64Decode(b64: string): string {
  const binary = atob(b64.replace(/\s/g, ''));
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

async function githubRequest(env: Env, path: string, options: RequestInit = {}): Promise<Response> {
  const res = await fetch(`${GITHUB_API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'friend-server-bot',
      'X-GitHub-Api-Version': '2022-11-28',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API error ${res.status}: ${text}`);
  }

  return res;
}

export interface WordsFile {
  content: string;
  sha: string;
}

export async function getWordsFile(env: Env): Promise<WordsFile> {
  const res = await githubRequest(env, `/repos/${env.GITHUB_REPO}/contents/${WORDS_PATH}`);
  const data = (await res.json()) as { content: string; sha: string };
  return { content: base64Decode(data.content), sha: data.sha };
}

// Commits straight to main, which triggers the deploy workflow.
export async function updateWordsFile(env: Env, content: string, sha: string, message: string): Promise<void> {
  await githubRequest(env, `/repos/${env.GITHUB_REPO}/contents/${WORDS_PATH}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, content: base64Encode(content), sha, branch: 'main' }),
  });
}
