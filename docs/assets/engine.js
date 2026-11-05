/* 计分引擎：根据答案算出用户在各维度上的分值，再和每座城市比距离。
   浏览器里挂在 window.QuizEngine，测试里通过 vm 加载。 */
(function (root) {
  'use strict';

  // 用户在每个维度上的分值 = 该维度所有题目所选选项的平均分
  function userVector(questions, answers, order) {
    var sum = {}, cnt = {};
    order.forEach(function (d) { sum[d] = 0; cnt[d] = 0; });
    questions.forEach(function (q, i) {
      var a = answers[i];
      if (a == null || !q.options[a]) return;
      sum[q.dim] += q.options[a].s;
      cnt[q.dim] += 1;
    });
    return order.map(function (d) { return cnt[d] ? sum[d] / cnt[d] : 50; });
  }

  // 均方根距离，范围 0-100
  function distance(u, v) {
    var s = 0;
    for (var i = 0; i < u.length; i++) s += (u[i] - v[i]) * (u[i] - v[i]);
    return Math.sqrt(s / u.length);
  }

  // 所有城市在各维度上的平均值，作为“普通人”的基准
  function centroid(cities) {
    var n = cities[0].v.length, m = [];
    for (var i = 0; i < n; i++) m.push(cities.reduce(function (s, c) { return s + c.v[i]; }, 0) / cities.length);
    return m;
  }

  // 以平均值为中心的余弦相似度：比较“你和普通人哪里不一样”与“这座城和普通城市哪里不一样”的方向是否一致。
  // 只用距离的话，各维度都偏中间的城市会被大量命中，所以以相似度为主，距离只用来拉开差距。
  function similarity(u, v, mean) {
    var ab = 0, aa = 0, bb = 0;
    for (var i = 0; i < u.length; i++) {
      var a = u[i] - mean[i], b = v[i] - mean[i];
      ab += a * b; aa += a * a; bb += b * b;
    }
    return aa && bb ? ab / Math.sqrt(aa * bb) : 0;
  }

  // 相似度（-1 到 1）换算成好理解的匹配度百分比
  function matchPercent(sim) {
    return Math.max(30, Math.min(98, Math.round(62 + sim * 38)));
  }

  // 按匹配度从高到低排序
  function rank(user, cities) {
    var mean = centroid(cities);
    return cities
      .map(function (c) {
        var sim = similarity(user, c.v, mean), dist = distance(user, c.v);
        return { city: c, sim: sim, dist: dist, score: sim - 0.3 * dist / 100, match: matchPercent(sim) };
      })
      .sort(function (a, b) { return b.score - a.score || (a.city.id < b.city.id ? -1 : 1); });
  }

  function level(x) { return x < 35 ? 'low' : x > 65 ? 'high' : 'mid'; }

  // 找出用户和城市最契合的 k 个维度，作为“为什么是这座城”的理由。
  // 优先选“你和这座城都与众不同、而且方向一致”的维度，其次选分值最接近的。
  function reasons(user, city, order, k, mean) {
    return order
      .map(function (d, i) {
        var a = user[i] - mean[i], b = city.v[i] - mean[i], gap = Math.abs(user[i] - city.v[i]);
        // 你和城市落在同一档（都偏低/都居中/都偏高）时，文案才说得通，优先选这些维度
        var same = level(user[i]) === level(city.v[i]) ? 100000 : 0;
        return { dim: d, user: user[i], city: city.v[i], gap: gap, fit: same + a * b - gap * gap * 0.15 };
      })
      .sort(function (x, y) { return y.fit - x.fit; })
      .slice(0, k || 3);
  }

  var api = { userVector: userVector, distance: distance, centroid: centroid, similarity: similarity, matchPercent: matchPercent, rank: rank, level: level, reasons: reasons };
  root.QuizEngine = api;
})(typeof window !== 'undefined' ? window : globalThis);
