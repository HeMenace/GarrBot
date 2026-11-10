export interface WordEntry {
  word: string;
  definition: string | null;
}

// Each line is either "WORD" (legacy, no definition) or "WORD|definition".
export function parseWordsFile(content: string): WordEntry[] {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [word, ...rest] = line.split('|');
      const definition = rest.length > 0 ? rest.join('|').trim() : '';
      return { word: word.trim(), definition: definition || null };
    });
}

export function formatWordLine(entry: WordEntry): string {
  return entry.definition ? `${entry.word}|${entry.definition}` : entry.word;
}
