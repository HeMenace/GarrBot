import { describe, expect, it } from 'vitest';
import { gradeInRange, parseTierFilter } from './tier-filter.js';
import { GRADES } from './tiers.js';

describe('parseTierFilter', () => {
  it('parses a bare letter as its full family', () => {
    const range = parseTierFilter('C');
    expect(range).not.toBeNull();
    expect(gradeInRange('C+', range!)).toBe(true);
    expect(gradeInRange('C', range!)).toBe(true);
    expect(gradeInRange('C-', range!)).toBe(true);
    expect(gradeInRange('B+', range!)).toBe(false);
    expect(gradeInRange('D+', range!)).toBe(false);
  });

  it('parses an exact grade as itself only', () => {
    const range = parseTierFilter('C+');
    expect(gradeInRange('C+', range!)).toBe(true);
    expect(gradeInRange('C', range!)).toBe(false);
  });

  it('parses a letter range regardless of order', () => {
    const forward = parseTierFilter('S-B');
    const backward = parseTierFilter('B-S');
    expect(forward).toEqual(backward);
    expect(gradeInRange('S', forward!)).toBe(true);
    expect(gradeInRange('A+', forward!)).toBe(true);
    expect(gradeInRange('B-', forward!)).toBe(true);
    expect(gradeInRange('C+', forward!)).toBe(false);
  });

  it('parses a grade range using "to" as an exact boundary, not a letter-family expansion', () => {
    const range = parseTierFilter('A- to B+');
    expect(gradeInRange('A-', range!)).toBe(true);
    expect(gradeInRange('B+', range!)).toBe(true);
    expect(gradeInRange('A', range!)).toBe(false);
    expect(gradeInRange('B', range!)).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(parseTierFilter('c+')).toEqual(parseTierFilter('C+'));
    expect(parseTierFilter('s-b')).toEqual(parseTierFilter('S-B'));
  });

  it('returns null for unparseable input', () => {
    expect(parseTierFilter('nonsense')).toBeNull();
    expect(parseTierFilter('')).toBeNull();
    expect(parseTierFilter('Z')).toBeNull();
  });

  it('covers the full scale end to end', () => {
    const range = parseTierFilter('S-F');
    for (const grade of GRADES) {
      expect(gradeInRange(grade, range!)).toBe(true);
    }
  });
});
