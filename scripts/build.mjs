// 把 content/ 里的题目和文案合并成网站用的数据文件 docs/data/*.js
// 用法：npm run build
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkProfile } from './check-profiles.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));
const OUT = join(ROOT, 'docs/data');
mkdirSync(OUT, { recursive: true });

const errors = [];

// ---------- 站点配置 ----------
const site = read('content/site.json');

// ---------- 城市测试 ----------
const { cities } = read('content/city/cities.json');
const { questions } = read('content/city/questions.json');
const { order, dims } = read('content/city/dims.json');

const profileDir = join(ROOT, 'content/city/profiles');
const profileFiles = new Set(readdirSync(profileDir).filter((f) => f.endsWith('.json')));

for (const c of cities) {
  if (c.v.length !== order.length) errors.push(`${c.id}: 维度数量应为 ${order.length}`);
  if (!profileFiles.has(`${c.id}.json`)) { errors.push(`${c.id}: 缺少文案 profiles/${c.id}.json`); continue; }
  const p = JSON.parse(readFileSync(join(profileDir, `${c.id}.json`), 'utf8'));
  checkProfile(p, c.id).forEach((e) => errors.push(`${c.id}: ${e}`));
  Object.assign(c, p, { name: c.name });
}

for (const q of questions) {
  if (!order.includes(q.dim)) errors.push(`题目「${q.text}」的维度 ${q.dim} 不存在`);
  if (q.options.length < 2) errors.push(`题目「${q.text}」选项太少`);
}

// 按维度轮流出题，避免同一维度的题扎堆
const byDim = order.map((d) => questions.filter((q) => q.dim === d));
const ordered = [];
for (let i = 0; byDim.some((list) => list[i]); i++) byDim.forEach((list) => list[i] && ordered.push(list[i]));

if (errors.length) {
  console.error('构建失败：\n - ' + errors.join('\n - '));
  process.exit(1);
}

const city = { site, order, dims, cities, questions: ordered };
writeFileSync(join(OUT, 'city.js'), `window.QUIZ_DATA = ${JSON.stringify(city)};\n`);

// 给 html 里引用的 css/js 加上内容指纹 ?v=xxxx，改了内容后手机不会读到旧缓存
const DOCS = join(ROOT, 'docs');
const hash = (file) => createHash('md5').update(readFileSync(join(DOCS, file))).digest('hex').slice(0, 8);
const page = join(DOCS, 'index.html');
writeFileSync(page, readFileSync(page, 'utf8').replace(/((?:src|href)="((?:assets|data)\/[\w.-]+\.(?:js|css)))(?:\?v=\w+)?"/g,
  (_, attr, file) => `${attr}?v=${hash(file)}"`));

console.log(`✓ 构建完成：${ordered.length} 道题，${cities.length} 座城市`);
