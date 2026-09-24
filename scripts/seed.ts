import { execFileSync } from 'node:child_process';
import { readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { GRADES, type Grade } from '../src/tiers.js';

const isRemote = process.argv.includes('--remote');
const csvPath = 'data/track-tiers.csv';
const expectedHeader = 'track_id,track_name,cup,grade';

const raw = readFileSync(csvPath, 'utf-8');
const lines = raw.split(/\r?\n/).filter((line) => line.length > 0);
const [header, ...rows] = lines;

if (header?.trim() !== expectedHeader) {
  console.error(`Unexpected CSV header in ${csvPath}. Expected "${expectedHeader}", got "${header}"`);
  process.exit(1);
}

const VALID_GRADES = new Set<string>(GRADES);
const errors: string[] = [];
const records: { id: string; name: string; cup: string; grade: Grade | null }[] = [];

rows.forEach((line, index) => {
  const rowNumber = index + 2; // +1 for the header line, +1 to make it 1-indexed
  const parts = line.split(',');
  if (parts.length < 3) {
    errors.push(`Row ${rowNumber}: expected at least 3 columns, got "${line}"`);
    return;
  }
  const [id, name, cup, gradeRaw = ''] = parts;
  const grade = gradeRaw.trim();
  if (grade !== '' && !VALID_GRADES.has(grade)) {
    errors.push(`Row ${rowNumber} (${id}): invalid grade "${grade}" — must be one of ${[...VALID_GRADES].join(', ')}, or blank`);
    return;
  }
  records.push({ id: id.trim(), name: name.trim(), cup: cup.trim(), grade: grade === '' ? null : (grade as Grade) });
});

if (errors.length > 0) {
  console.error(`Found ${errors.length} invalid row(s) in ${csvPath}:`);
  for (const err of errors) console.error('  ' + err);
  process.exit(1);
}

const unratedCount = records.filter((r) => r.grade === null).length;
console.log(`Parsed ${records.length} tracks from ${csvPath} (${unratedCount} unrated).`);

function sqlEscape(value: string): string {
  return value.replace(/'/g, "''");
}

const statements = records.map((r) => {
  const seedTier = r.grade ? `'${sqlEscape(r.grade)}'` : 'NULL';
  return `INSERT INTO tracks (id, name, cup, seed_tier) VALUES ('${sqlEscape(r.id)}', '${sqlEscape(r.name)}', '${sqlEscape(r.cup)}', ${seedTier}) ON CONFLICT(id) DO UPDATE SET name = excluded.name, cup = excluded.cup, seed_tier = excluded.seed_tier;`;
});

const sqlPath = 'data/.seed-tracks.sql';
writeFileSync(sqlPath, statements.join('\n'));

try {
  const args = ['wrangler', 'd1', 'execute', 'DB', isRemote ? '--remote' : '--local', '--file', sqlPath];
  console.log(`Running: npx ${args.join(' ')}`);
  execFileSync('npx', args, { stdio: 'inherit' });
} finally {
  unlinkSync(sqlPath);
}

console.log(`Seeded ${records.length} tracks into ${isRemote ? 'REMOTE' : 'local'} D1.`);
