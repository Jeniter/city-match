// 校验城市结果文案：字段齐全、字数在范围内。
// 用法：node scripts/check-profiles.mjs [id ...]   （不传 id 则检查全部）
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'content/city/profiles');

// 字段 -> [最少字数, 最多字数]
export const RULES = {
  name: [2, 4],
  nickname: [2, 6],
  tagline: [10, 18],
  portrait: [180, 260],
  live: [100, 150],
  eat: [100, 150],
  weekend: [100, 150],
  work: [100, 150],
  social: [120, 180],
  challenge: [100, 150],
  notFor: [50, 80],
  altReason: [30, 50],
  quote: [12, 30],
};

const len = (s) => [...s].length;

export function checkProfile(p, id) {
  const errs = [];
  if (p.id !== id) errs.push(`id 应为 ${id}，实际为 ${p.id}`);
  for (const [k, [min, max]] of Object.entries(RULES)) {
    if (typeof p[k] !== 'string' || !p[k].trim()) { errs.push(`缺少字段 ${k}`); continue; }
    const n = len(p[k]);
    if (n < min || n > max) errs.push(`${k} 字数 ${n}，要求 ${min}-${max}`);
  }
  if (!Array.isArray(p.keywords) || p.keywords.length !== 3) errs.push('keywords 必须是 3 个');
  else p.keywords.forEach((w) => { if (len(w) < 2 || len(w) > 4) errs.push(`关键词「${w}」应为 2-4 字`); });
  return errs;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const ids = process.argv.slice(2).length
    ? process.argv.slice(2)
    : readdirSync(DIR).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5));
  let bad = 0;
  for (const id of ids) {
    const file = join(DIR, `${id}.json`);
    if (!existsSync(file)) { console.log(`✗ ${id}: 文件不存在`); bad++; continue; }
    let p;
    try { p = JSON.parse(readFileSync(file, 'utf8')); }
    catch (e) { console.log(`✗ ${id}: JSON 格式错误 ${e.message}`); bad++; continue; }
    const errs = checkProfile(p, id);
    if (errs.length) { bad++; console.log(`✗ ${id}:\n   - ${errs.join('\n   - ')}`); }
    else console.log(`✓ ${id}`);
  }
  process.exit(bad ? 1 : 0);
}
