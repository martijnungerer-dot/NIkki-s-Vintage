import { readFile, readdir, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const files = [];
async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (['.git', 'node_modules', 'work'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full);
    else files.push(full);
  }
}
await walk(root);
for (const file of files) {
  const relative = path.relative(root, file);
  if (file.endsWith('.json')) {
    try { JSON.parse(await readFile(file, 'utf8')); }
    catch { errors.push(`Invalid JSON: ${relative}`); }
  }
  if (!file.endsWith('.md')) continue;
  const content = await readFile(file, 'utf8');
  for (const match of content.matchAll(/\[[^\]]*\]\(([^\s)]+)\)/g)) {
    const target = match[1].split('#')[0];
    if (!target || /^[a-z][a-z0-9+.-]*:/i.test(target)) continue;
    try { await access(path.resolve(path.dirname(file), decodeURIComponent(target))); }
    catch { errors.push(`Broken local link in ${relative}: ${target}`); }
  }
}
const schema = JSON.parse(await readFile(path.join(root, 'airtable/schema.json'), 'utf8'));
const tableNames = schema.tables.map(t => t.name);
if (new Set(tableNames).size !== tableNames.length) errors.push('Duplicate table names');
for (const table of schema.tables) {
  const names = table.fields.map(f => f.name);
  if (new Set(names).size !== names.length) errors.push(`Duplicate field in ${table.name}`);
  if (table.fields[0]?.type !== 'singleLineText') errors.push(`Invalid primary field in ${table.name}`);
}
for (const link of schema.links) {
  if (!tableNames.includes(link.table) || !tableNames.includes(link.targetTable)) {
    errors.push(`Unresolved link ${link.table}.${link.field}`);
  }
}
const example = await readFile(path.join(root, '.env.example'), 'utf8');
for (const line of example.split(/\r?\n/)) {
  if (!line || line.startsWith('#')) continue;
  if (!/^[A-Z_]+=$/.test(line)) errors.push('Example environment must contain empty values only');
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`PASS: ${files.length} project files; JSON, local links, schema relationships and empty example secrets.`);
  console.log('Scope: foundation only; no live app, checkout or runtime credential test.');
}
