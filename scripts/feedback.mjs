#!/usr/bin/env node
/**
 * Shared bug / feature intake. Items live in feedback/items/*.md (screenshots in
 * feedback/assets/<id>/) so people, Claude and Codex all read and update the same files via git.
 * See docs/FEEDBACK_INTAKE.md. Plain Node, zero dependencies: node scripts/feedback.mjs <command> [options]
 * (also `npm run feedback -- <command>`; no npm install needed).
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, extname, join, resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const ITEMS = join(ROOT, 'feedback', 'items');
const ASSETS = join(ROOT, 'feedback', 'assets');
const STATUSES = ['open', 'in-progress', 'fixed', 'verified', 'wontfix'];
/** Statuses that still need work or a re-check. `fixed` = code done, not yet independently verified. */
const UNFINISHED = ['open', 'in-progress', 'fixed'];

const parse = (file) => {
  const raw = readFileSync(file, 'utf8');
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  const meta = {};
  for (const line of (m ? m[1] : '').split('\n')) {
    const i = line.indexOf(':');
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return { file, meta, body: m ? m[2] : raw };
};

const write = (item) => {
  const head = Object.entries(item.meta).map(([k, v]) => `${k}: ${v}`).join('\n');
  writeFileSync(item.file, `---\n${head}\n---\n${item.body.startsWith('\n') ? '' : '\n'}${item.body}`);
};

const all = () =>
  existsSync(ITEMS)
    ? readdirSync(ITEMS).filter((f) => f.endsWith('.md')).sort().map((f) => parse(join(ITEMS, f)))
    : [];

const find = (id) => {
  const hit = all().find((i) => i.meta.id === id || basename(i.file).startsWith(id));
  if (!hit) throw new Error(`No feedback item "${id}". Run: npm run feedback -- list --all`);
  return hit;
};

/** `--key value` and repeatable `--key a --key b`; bare words are positionals. */
const args = (argv) => {
  const flags = {};
  const pos = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) (flags[key] ||= []).push('true');
      else { (flags[key] ||= []).push(next); i++; }
    } else pos.push(argv[i]);
  }
  return { flags, pos };
};

const today = () => new Date().toISOString().slice(0, 10);
const slug = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
const rel = (p) => p.replace(`${ROOT}/`, '');

const readStdin = async () => {
  if (process.stdin.isTTY) return '';
  let s = '';
  for await (const chunk of process.stdin) s += chunk;
  return s.trim();
};

const commands = {
  async new({ flags }) {
    const title = flags.title?.[0];
    if (!title) throw new Error('--title is required');
    const type = flags.type?.[0] || 'bug';
    if (!['bug', 'feature'].includes(type)) throw new Error('--type must be bug or feature');
    // Date + random suffix instead of a counter, so two people filing at once never collide.
    const id = `FB-${today().replace(/-/g, '')}-${randomBytes(2).toString('hex')}`;
    mkdirSync(ITEMS, { recursive: true });
    const shots = [];
    for (const src of flags.screenshot || []) {
      if (!existsSync(src)) throw new Error(`Screenshot not found: ${src}`);
      const dir = join(ASSETS, id);
      mkdirSync(dir, { recursive: true });
      const name = `${shots.length + 1}${extname(src).toLowerCase() || '.png'}`;
      copyFileSync(src, join(dir, name));
      shots.push(`feedback/assets/${id}/${name}`);
    }
    // Message context: pasted chat text / Thea transcript, from --context, --context-file, or stdin.
    let context = flags.context?.[0] || '';
    if (flags['context-file']?.[0]) context = readFileSync(flags['context-file'][0], 'utf8').trim();
    if (!context) context = await readStdin();
    const meta = {
      id, type, status: 'open', title,
      reporter: flags.reporter?.[0] || 'unknown',
      created: today(),
      area: flags.area?.[0] || '',
      platform: flags.platform?.[0] || '',
      assignee: '', fix: '', verified_by: '',
    };
    const body = [
      '', '## What happened', flags.description?.[0] || '(describe the problem or the idea)',
      '', '## Expected / desired', flags.expected?.[0] || '(what should happen instead)',
      '', '## Message context', context ? '```text\n' + context + '\n```' : '(none attached)',
      '', '## Screenshots', shots.length ? shots.map((s) => `![](../../${s})`).join('\n') : '(none attached)',
      '', '## Notes / fix log', '',
    ].join('\n');
    const file = join(ITEMS, `${id}-${slug(title)}.md`);
    write({ file, meta, body });
    console.log(`Created ${id}\n  ${rel(file)}\nCommit and push it so everyone (and the agents) can see it.`);
  },

  list({ flags }) {
    const wanted = flags.status?.[0];
    const rows = all().filter((i) => (flags.all ? true : wanted ? i.meta.status === wanted : UNFINISHED.includes(i.meta.status)));
    if (!rows.length) return console.log('No matching items.');
    for (const i of rows) {
      console.log(`${i.meta.id}  [${i.meta.status}]  ${i.meta.type}  ${i.meta.title}${i.meta.assignee ? `  (@${i.meta.assignee})` : ''}\n    ${rel(i.file)}`);
    }
  },

  show({ pos }) {
    console.log(readFileSync(find(pos[0]).file, 'utf8'));
  },

  claim({ pos, flags }) {
    const item = find(pos[0]);
    item.meta.status = 'in-progress';
    item.meta.assignee = flags.by?.[0] || 'unknown';
    write(item);
    console.log(`${item.meta.id} -> in-progress (@${item.meta.assignee})`);
  },

  /** Code is done. Needs a note and, ideally, the commit; a different pass then verifies it. */
  resolve({ pos, flags }) {
    const item = find(pos[0]);
    item.meta.status = 'fixed';
    item.meta.fix = flags.commit?.[0] || item.meta.fix;
    if (flags.note?.[0]) item.body = item.body.trimEnd() + `\n- ${today()} fixed: ${flags.note[0]}\n`;
    write(item);
    console.log(`${item.meta.id} -> fixed (awaiting verification)`);
  },

  /** Independently re-checked in the running app / tests. */
  verify({ pos, flags }) {
    const item = find(pos[0]);
    if (!flags.by?.[0]) throw new Error('--by <claude|codex|name> is required: say who re-checked it');
    item.meta.status = 'verified';
    item.meta.verified_by = flags.by[0];
    if (flags.note?.[0]) item.body = item.body.trimEnd() + `\n- ${today()} verified by ${flags.by[0]}: ${flags.note[0]}\n`;
    write(item);
    console.log(`${item.meta.id} -> verified`);
  },

  reopen({ pos, flags }) {
    const item = find(pos[0]);
    item.meta.status = 'open';
    item.meta.verified_by = '';
    if (flags.note?.[0]) item.body = item.body.trimEnd() + `\n- ${today()} reopened: ${flags.note[0]}\n`;
    write(item);
    console.log(`${item.meta.id} -> open`);
  },

  wontfix({ pos, flags }) {
    const item = find(pos[0]);
    if (!flags.note?.[0]) throw new Error('--note "why" is required');
    item.meta.status = 'wontfix';
    item.body = item.body.trimEnd() + `\n- ${today()} wontfix: ${flags.note[0]}\n`;
    write(item);
    console.log(`${item.meta.id} -> wontfix`);
  },

  /** The completion gate: exit 1 while anything is open, in progress, or fixed-but-unverified. */
  check() {
    const items = all();
    const bad = items.filter((i) => !['verified', 'wontfix'].includes(i.meta.status));
    const malformed = items.filter((i) => !STATUSES.includes(i.meta.status));
    if (malformed.length) console.log('Items with an invalid status:', malformed.map((i) => i.meta.id).join(', '));
    if (!bad.length) return console.log(`OK: all ${items.length} feedback item(s) are verified or wontfix.`);
    console.log(`NOT DONE: ${bad.length} of ${items.length} item(s) still need work:`);
    for (const i of bad) {
      const need = i.meta.status === 'fixed' ? 'needs verification' : i.meta.status === 'in-progress' ? 'in progress' : 'open';
      console.log(`  ${i.meta.id}  [${need}]  ${i.meta.title}  -> ${rel(i.file)}`);
    }
    process.exitCode = 1;
  },
};

const [cmd, ...rest] = process.argv.slice(2);
const run = commands[cmd];
if (!run) {
  console.log('Commands: new | list | show <id> | claim <id> --by <who> | resolve <id> --note ".." [--commit sha] | verify <id> --by <who> | reopen <id> | wontfix <id> --note ".." | check');
  process.exit(cmd ? 1 : 0);
}
Promise.resolve(run(args(rest))).catch((e) => { console.error(`Error: ${e.message}`); process.exit(1); });
