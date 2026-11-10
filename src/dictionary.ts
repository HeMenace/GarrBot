interface DictionaryEntry {
  meanings?: Array<{
    partOfSpeech?: string;
    definitions?: Array<{ definition?: string }>;
  }>;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const MAX_RETRIES = 3;

// Free, keyless dictionary API. Returns null on genuine not-found (404) or any
// failure — a missing definition should never block adding or rendering a
// word. Retries with backoff on 429 (Cloudflare rate-limiting bursts) and 5xx
// (the upstream API is occasionally flaky) so a transient error doesn't get
// mistaken for "this word isn't in the dictionary".
export async function fetchDefinition(word: string): Promise<string | null> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word.toLowerCase())}`);

      if (res.status === 429 || res.status >= 500) {
        if (attempt === MAX_RETRIES) return null;
        await sleep(1000 * (attempt + 1));
        continue;
      }

      if (!res.ok) return null;

      const entries = (await res.json()) as DictionaryEntry[];
      const meaning = entries[0]?.meanings?.[0];
      const definition = meaning?.definitions?.[0]?.definition;
      if (!definition) return null;

      return meaning?.partOfSpeech ? `(${meaning.partOfSpeech}) ${definition}` : definition;
    } catch {
      return null;
    }
  }
  return null;
}
