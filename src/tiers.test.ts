import { describe, expect, it } from 'vitest';
import { effectiveTier, GRADE_SCORES, meanScore, scoreToGrade, type Grade } from './tiers.js';

describe('scoreToGrade', () => {
  const cases: Array<[Grade[], number, Grade]> = [
    [['A', 'B'], 9.5, 'A-'],
    [['A', 'B+'], 10, 'A-'],
    [['A', 'A', 'B'], 10, 'A-'],
    [['S', 'A'], 13, 'A+'],
    [['S', 'S', 'A+'], 14, 'S'],
    [['F', 'D'], -0.5, 'D-'],
    [['C+', 'C'], 5.5, 'C+'],
  ];

  it.each(cases)('%j -> mean %d -> %s', (grades, expectedMean, expectedGrade) => {
    const mean = meanScore(grades);
    expect(mean).toBeCloseTo(expectedMean);
    expect(scoreToGrade(mean)).toBe(expectedGrade);
  });

  it('requires a clear consensus for S (a single S vote is not enough)', () => {
    expect(scoreToGrade(meanScore(['S', 'A']))).not.toBe('S');
  });

  it('requires a clear consensus for F', () => {
    expect(scoreToGrade(-1)).not.toBe('F');
    expect(scoreToGrade(-2)).toBe('F');
  });
});

describe('effectiveTier', () => {
  it('prefers an admin override over everything else', () => {
    expect(effectiveTier({ overrideGrade: 'S', votes: ['F', 'F', 'F'], seedGrade: 'F' })).toBe('S');
  });

  it('uses the vote result once there are at least 3 votes', () => {
    expect(effectiveTier({ overrideGrade: null, votes: ['A', 'A', 'A'], seedGrade: 'F' })).toBe('A');
  });

  it('falls back to the seed tier with fewer than 3 votes', () => {
    expect(effectiveTier({ overrideGrade: null, votes: ['A', 'A'], seedGrade: 'C' })).toBe('C');
  });

  it('falls back to null when there is no override, no votes, and no seed', () => {
    expect(effectiveTier({ overrideGrade: null, votes: [], seedGrade: null })).toBeNull();
  });
});

describe('GRADE_SCORES', () => {
  it('spaces A-D grades one point apart', () => {
    const ordered: Grade[] = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-'];
    for (let i = 1; i < ordered.length; i++) {
      expect(GRADE_SCORES[ordered[i - 1]] - GRADE_SCORES[ordered[i]]).toBe(1);
    }
  });

  it('places S three points above A+, matching the given scale', () => {
    expect(GRADE_SCORES.S).toBe(15);
    expect(GRADE_SCORES.S - GRADE_SCORES['A+']).toBe(3);
  });

  it('places F at -3, four points below D-, matching the given scale', () => {
    expect(GRADE_SCORES.F).toBe(-3);
    expect(GRADE_SCORES['D-'] - GRADE_SCORES.F).toBe(4);
  });
});
