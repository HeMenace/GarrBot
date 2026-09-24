// Best (S) to worst (F). Index in this array is a grade's "position" for range filtering.
export const GRADES = [
  'S',
  'A+', 'A', 'A-',
  'B+', 'B', 'B-',
  'C+', 'C', 'C-',
  'D+', 'D', 'D-',
  'F',
] as const;

export type Grade = (typeof GRADES)[number];

export const GRADE_SCORES: Record<Grade, number> = {
  S: 15,
  'A+': 12, A: 11, 'A-': 10,
  'B+': 9, B: 8, 'B-': 7,
  'C+': 6, C: 5, 'C-': 4,
  'D+': 3, D: 2, 'D-': 1,
  F: -3,
};

export const MIN_VOTES_FOR_EFFECTIVE_TIER = 3;

const S_THRESHOLD = 14;
const A_PLUS_THRESHOLD = 12;
const F_THRESHOLD = -2;
const D_MINUS_THRESHOLD = 1;

export function isGrade(value: string): value is Grade {
  return (GRADES as readonly string[]).includes(value);
}

// Nearest grade to a raw mean score, honoring the S/F consensus thresholds and
// rounding exact halves up to the higher (better) grade.
export function scoreToGrade(mean: number): Grade {
  if (mean >= S_THRESHOLD) return 'S';
  if (mean > A_PLUS_THRESHOLD) return 'A+';
  if (mean <= F_THRESHOLD) return 'F';
  if (mean < D_MINUS_THRESHOLD) return 'D-';

  // Among the non-S/F grades, find the one whose score is closest to the mean.
  // Ties round to the higher (better, higher-scoring) grade.
  const candidates = GRADES.filter((g) => g !== 'S' && g !== 'F');
  let best: Grade = candidates[0];
  let bestDistance = Infinity;
  for (const grade of candidates) {
    const distance = Math.abs(GRADE_SCORES[grade] - mean);
    if (distance < bestDistance || (distance === bestDistance && GRADE_SCORES[grade] > GRADE_SCORES[best])) {
      best = grade;
      bestDistance = distance;
    }
  }
  return best;
}

export function meanScore(grades: Grade[]): number {
  return grades.reduce((sum, g) => sum + GRADE_SCORES[g], 0) / grades.length;
}

export function voteResultGrade(grades: Grade[]): Grade | null {
  if (grades.length < MIN_VOTES_FOR_EFFECTIVE_TIER) return null;
  return scoreToGrade(meanScore(grades));
}

export interface EffectiveTierInput {
  overrideGrade: Grade | null;
  votes: Grade[];
  seedGrade: Grade | null;
}

// admin override > vote result (once >= MIN_VOTES_FOR_EFFECTIVE_TIER votes) > seed tier from CSV.
export function effectiveTier({ overrideGrade, votes, seedGrade }: EffectiveTierInput): Grade | null {
  if (overrideGrade) return overrideGrade;
  const voteResult = voteResultGrade(votes);
  if (voteResult) return voteResult;
  return seedGrade;
}
