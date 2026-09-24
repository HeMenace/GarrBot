import type { Env } from '../env.js';
import { GRADES, GRADE_SCORES, isGrade, MIN_VOTES_FOR_EFFECTIVE_TIER, scoreToGrade, type Grade } from '../tiers.js';

export interface TrackTierRow {
  id: string;
  name: string;
  cup: string;
  seedTier: Grade | null;
  overrideGrade: Grade | null;
  voteCount: number;
  avgScore: number | null;
  effectiveGrade: Grade | null;
}

// Lets SQLite do the averaging without duplicating the grade->score table by hand.
function scoreCaseSql(column: string): string {
  const whens = GRADES.map((g) => `WHEN '${g}' THEN ${GRADE_SCORES[g]}`).join(' ');
  return `CASE ${column} ${whens} END`;
}

interface EffectiveTierInputs {
  seedTier: Grade | null;
  overrideGrade: Grade | null;
  voteCount: number;
  avgScore: number | null;
}

function computeEffectiveGrade({ seedTier, overrideGrade, voteCount, avgScore }: EffectiveTierInputs): Grade | null {
  if (overrideGrade) return overrideGrade;
  if (voteCount >= MIN_VOTES_FOR_EFFECTIVE_TIER && avgScore != null) return scoreToGrade(avgScore);
  return seedTier;
}

interface RawRow {
  id: string;
  name: string;
  cup: string;
  seedTier: string | null;
  overrideGrade: string | null;
  voteCount: number;
  avgScore: number | null;
}

function toTrackTierRow(raw: RawRow): TrackTierRow {
  const seedTier = raw.seedTier && isGrade(raw.seedTier) ? raw.seedTier : null;
  const overrideGrade = raw.overrideGrade && isGrade(raw.overrideGrade) ? raw.overrideGrade : null;
  const inputs: EffectiveTierInputs = { seedTier, overrideGrade, voteCount: raw.voteCount, avgScore: raw.avgScore };
  return {
    id: raw.id,
    name: raw.name,
    cup: raw.cup,
    seedTier,
    overrideGrade,
    voteCount: raw.voteCount,
    avgScore: raw.avgScore,
    effectiveGrade: computeEffectiveGrade(inputs),
  };
}

const BASE_QUERY = `
  SELECT
    t.id as id,
    t.name as name,
    t.cup as cup,
    t.seed_tier as seedTier,
    o.grade as overrideGrade,
    COUNT(v.grade) as voteCount,
    AVG(${scoreCaseSql('v.grade')}) as avgScore
  FROM tracks t
  LEFT JOIN tier_votes v ON v.track_id = t.id
  LEFT JOIN tier_overrides o ON o.track_id = t.id
`;

export async function getAllTrackTierRows(env: Env): Promise<TrackTierRow[]> {
  const { results } = await env.DB.prepare(`${BASE_QUERY} GROUP BY t.id`).all<RawRow>();
  return results.map(toTrackTierRow);
}

export async function getTrackTierRow(env: Env, trackId: string): Promise<TrackTierRow | null> {
  const row = await env.DB.prepare(`${BASE_QUERY} WHERE t.id = ? GROUP BY t.id`).bind(trackId).first<RawRow>();
  return row ? toTrackTierRow(row) : null;
}

export async function upsertVote(env: Env, trackId: string, userId: string, grade: Grade): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO tier_votes (track_id, user_id, grade, updated_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(track_id, user_id) DO UPDATE SET grade = excluded.grade, updated_at = excluded.updated_at`,
  )
    .bind(trackId, userId, grade, new Date().toISOString())
    .run();
}

export async function setOverride(env: Env, trackId: string, grade: Grade, setBy: string): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO tier_overrides (track_id, grade, set_by, updated_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(track_id) DO UPDATE SET grade = excluded.grade, set_by = excluded.set_by, updated_at = excluded.updated_at`,
  )
    .bind(trackId, grade, setBy, new Date().toISOString())
    .run();
}

export async function clearOverride(env: Env, trackId: string): Promise<void> {
  await env.DB.prepare('DELETE FROM tier_overrides WHERE track_id = ?').bind(trackId).run();
}
