import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));

// 用和浏览器相同的方式加载引擎
const ctx = { globalThis: {} };
vm.runInNewContext(readFileSync(join(ROOT, 'docs/assets/engine.js'), 'utf8'), ctx);
const E = ctx.globalThis.QuizEngine;

const { cities } = read('content/city/cities.json');
const { questions } = read('content/city/questions.json');
const { order } = read('content/city/dims.json');

// 每道题选离目标分值最近的选项
function answersFor(target) {
  return questions.map((q) => {
    const t = target[order.indexOf(q.dim)];
    let best = 0;
    q.options.forEach((o, i) => { if (Math.abs(o.s - t) < Math.abs(q.options[best].s - t)) best = i; });
    return best;
  });
}

test('题目数量在 20-30 之间，每个维度 3 题', () => {
  assert.ok(questions.length >= 20 && questions.length <= 30);
  for (const d of order) assert.equal(questions.filter((q) => q.dim === d).length, 3, d);
});

test('每座城市都能被测出来（按城市画像作答时排第一）', () => {
  const miss = [];
  for (const c of cities) {
    const top = E.rank(E.userVector(questions, answersFor(c.v), order), cities)[0].city.id;
    if (top !== c.id) miss.push(`${c.id} → ${top}`);
  }
  assert.deepEqual(miss, []);
});

test('随机作答时没有城市垄断结果', () => {
  let seed = 42;
  const rand = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
  const hits = {};
  const N = 5000;
  for (let n = 0; n < N; n++) {
    const ans = questions.map((q) => Math.floor(rand() * q.options.length));
    const id = E.rank(E.userVector(questions, ans, order), cities)[0].city.id;
    hits[id] = (hits[id] || 0) + 1;
  }
  const max = Math.max(...Object.values(hits));
  assert.ok(max / N < 0.15, `某城市占比过高：${JSON.stringify(hits)}`);
  assert.equal(Object.keys(hits).length, cities.length, '有城市从来测不出来');
});

test('匹配度百分比在 30-98 之间，最佳城市不低于 75，且高于备选', () => {
  for (const c of cities) {
    const r = E.rank(E.userVector(questions, answersFor(c.v), order), cities);
    r.forEach((x) => assert.ok(x.match >= 30 && x.match <= 98));
    assert.ok(r[0].match >= 75, `${c.id} 最佳匹配度 ${r[0].match}`);
    assert.ok(r[0].match >= r[1].match, `${c.id} 最佳匹配度低于备选`);
  }
});

test('“为什么是这座城”的理由里，你和城市处在同一档（避免“你偏低，城市偏高”这种自相矛盾的文案）', () => {
  const mean = E.centroid(cities);
  let seed = 7;
  const rand = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
  let bad = 0;
  for (let n = 0; n < 2000; n++) {
    const ans = questions.map((q) => Math.floor(rand() * q.options.length));
    const u = E.userVector(questions, ans, order);
    const top = E.rank(u, cities)[0].city;
    const rs = E.reasons(u, top, order, 3, mean);
    // 只要城市和你有 3 个同档维度，理由就必须全部同档
    const sameCount = order.filter((d, i) => E.level(u[i]) === E.level(top.v[i])).length;
    if (sameCount >= 3 && rs.some((r) => E.level(r.user) !== E.level(r.city))) bad++;
  }
  assert.equal(bad, 0);
});

test('每道题的选项分值都在 0-100 之间', () => {
  for (const q of questions) for (const o of q.options) assert.ok(o.s >= 0 && o.s <= 100, q.text);
});
