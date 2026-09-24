import { GRADES, isGrade, type Grade } from './tiers.js';

const LETTER_GROUPS: Record<string, Grade[]> = { S: ['S'], F: ['F'] };
for (const letter of ['A', 'B', 'C', 'D']) {
  LETTER_GROUPS[letter] = [`${letter}+`, letter, `${letter}-`] as Grade[];
}

export interface TierRange {
  minIndex: number;
  maxIndex: number;
}

function indexOf(grade: Grade): number {
  return GRADES.indexOf(grade);
}

// Resolves one range endpoint (a bare letter like "B", or an exact grade like "B+")
// to the [minIndex, maxIndex] span of scale positions it covers.
function resolveToken(token: string): TierRange | null {
  const upper = token.trim().toUpperCase();

  // A bare single letter (e.g. "C") means the whole family (C+/C/C-), even though
  // "C" alone is also technically a valid exact Grade — the family reading wins.
  if (upper.length === 1) {
    const group = LETTER_GROUPS[upper];
    if (group) {
      const indices = group.map(indexOf);
      return { minIndex: Math.min(...indices), maxIndex: Math.max(...indices) };
    }
  }

  if (isGrade(upper)) {
    const idx = indexOf(upper);
    return { minIndex: idx, maxIndex: idx };
  }

  return null;
}

function combine(a: TierRange, b: TierRange): TierRange {
  return { minIndex: Math.min(a.minIndex, b.minIndex), maxIndex: Math.max(a.maxIndex, b.maxIndex) };
}

// Accepts: a single letter ("C" -> C+/C/C-), an exact grade ("C+"), a letter
// range ("S-B" or "B-S"), or a grade range using "to" ("A- to B+"). Order of
// range endpoints never matters. Returns null if the input can't be parsed.
export function parseTierFilter(input: string): TierRange | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const singleToken = resolveToken(trimmed);
  if (singleToken) return singleToken;

  const toMatch = trimmed.split(/\s+to\s+/i);
  if (toMatch.length === 2) {
    const [a, b] = toMatch.map(resolveToken);
    if (a && b) return combine(a, b);
    return null;
  }

  const hyphenParts = trimmed
    .split('-')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  if (hyphenParts.length === 2) {
    const [a, b] = hyphenParts.map(resolveToken);
    if (a && b) return combine(a, b);
  }

  return null;
}

export function gradeInRange(grade: Grade, range: TierRange): boolean {
  const idx = indexOf(grade);
  return idx >= range.minIndex && idx <= range.maxIndex;
}

// Suggestions surfaced by the /tracks `tier` option's autocomplete.
export const TIER_FILTER_EXAMPLES = ['S', 'A', 'B', 'C', 'D', 'F', 'S-B', 'B-D', 'A- to B+', 'C+ to D-'];
