/* 城市匹配测试：答题流程 + 结果页渲染 */
(function () {
  'use strict';
  var D = window.QUIZ_DATA, E = window.QuizEngine;
  var Q = D.questions, N = Q.length, STORE = 'quiz-city-v1';
  var $ = function (id) { return document.getElementById(id); };
  var answers = new Array(N).fill(null), idx = 0, locked = false;

  // 文本转义，防止内容里的特殊字符破坏页面
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function show(view) {
    ['intro', 'quiz', 'loading', 'result'].forEach(function (v) { $('view-' + v).hidden = v !== view; });
    window.scrollTo(0, 0);
  }

  function save(extra) {
    try { localStorage.setItem(STORE, JSON.stringify(Object.assign({ answers: answers, idx: idx }, extra || {}))); } catch (e) {}
  }
  function load() {
    try { var s = JSON.parse(localStorage.getItem(STORE)); return s && Array.isArray(s.answers) && s.answers.length === N ? s : null; } catch (e) { return null; }
  }

  // ---------- 答题 ----------
  function renderQuestion(focus) {
    var q = Q[idx];
    $('q-count').textContent = (idx + 1) + '/' + N;
    $('progress-fill').style.width = (idx / N * 100) + '%';
    var bar = $('progress-fill').parentNode;
    bar.setAttribute('aria-valuemax', N); bar.setAttribute('aria-valuenow', idx);
    $('btn-back').disabled = idx === 0;
    $('q-dim').textContent = D.dims[q.dim].name;
    $('q-text').textContent = q.text;
    $('q-options').innerHTML = q.options.map(function (o, i) {
      return '<li><button type="button" class="option" data-i="' + i + '" aria-pressed="' + (answers[idx] === i) + '">' +
        '<span class="key" aria-hidden="true">' + 'ABCD'[i] + '</span><span>' + esc(o.t) + '</span></button></li>';
    }).join('');
    var card = $('q-card');
    card.classList.remove('slide-in'); void card.offsetWidth; card.classList.add('slide-in');
    if (focus) $('q-text').setAttribute('tabindex', '-1'), $('q-text').focus({ preventScroll: true });
  }

  function choose(i) {
    if (locked) return;
    locked = true;
    answers[idx] = i;
    $('q-options').querySelectorAll('.option').forEach(function (b) { b.setAttribute('aria-pressed', String(+b.dataset.i === i)); });
    save();
    setTimeout(function () {
      locked = false;
      if (idx < N - 1) { idx++; renderQuestion(true); }
      else finish();
    }, 260);
  }

  function finish() {
    $('progress-fill').style.width = '100%';
    show('loading');
    var steps = ['正在分析你的生活偏好…', '正在比对 24 座城市的气质…', '正在生成你的专属报告…'];
    var k = 0;
    var t = setInterval(function () { k++; if (k < steps.length) $('loading-text').textContent = steps[k]; }, 900);
    setTimeout(function () { clearInterval(t); save({ done: true }); renderResult(); }, 2700);
  }

  // ---------- 结果 ----------
  function renderResult() {
    var user = E.userVector(Q, answers, D.order);
    var ranked = E.rank(user, D.cities);
    var best = ranked[0], c = best.city;
    var alts = ranked.slice(1, 3), worst = ranked[ranked.length - 1];
    var mean = E.centroid(D.cities);
    var why = E.reasons(user, c, D.order, 3, mean);
    var view = $('view-result');
    view.style.setProperty('--city', c.color);
    document.querySelector('meta[name="theme-color"]').setAttribute('content', c.color);

    // 性格画像：取你最突出的 3 个维度
    var traits = D.order.map(function (d, i) { return { d: d, v: user[i], dev: Math.abs(user[i] - mean[i]) }; })
      .sort(function (a, b) { return b.dev - a.dev; }).slice(0, 3);
    var traitText = traits.map(function (t) { return D.dims[t.d][E.level(t.v)]; });

    var whyHtml = why.map(function (w, i) {
      var dm = D.dims[w.dim];
      var same = E.level(w.user) === E.level(w.city);
      var tail = same ? '，' + esc(c.name) + '正好' + esc(dm.city[E.level(w.city)]) + '。'
        : '，而' + esc(c.name) + esc(dm.city[E.level(w.city)]) + '，会带给你一些新鲜的体验。';
      return '<li><span class="num">' + (i + 1) + '</span><span><b>' + esc(dm.name) + '：</b>你' + esc(dm.me[E.level(w.user)]) + tail + '</span></li>';
    }).join('');

    var bars = D.order.map(function (d, i) {
      var dm = D.dims[d];
      return '<div><div class="bar-label"><span>' + esc(dm.left) + '</span><b>' + esc(dm.name) + '</b><span>' + esc(dm.right) + '</span></div>' +
        '<div class="bar" role="img" aria-label="' + esc(dm.name) + '：你 ' + Math.round(user[i]) + ' 分，' + esc(c.name) + ' ' + c.v[i] + ' 分">' +
        '<span class="fill" data-w="' + Math.round(user[i]) + '"></span><span class="city-mark" style="left:' + c.v[i] + '%"></span></div></div>';
    }).join('');

    var guide = [['🏠', '住在哪里', c.live], ['🍜', '吃点什么', c.eat], ['🌿', '周末去哪', c.weekend], ['💼', '事业发展', c.work]]
      .map(function (g) { return '<div class="guide-item"><h3><span aria-hidden="true">' + g[0] + '</span>' + g[1] + '</h3><p>' + esc(g[2]) + '</p></div>'; }).join('');

    var altHtml = alts.map(function (a) {
      return '<li class="alt"><span class="dot" style="background:' + a.city.color + '" aria-hidden="true">' + esc(a.city.name.slice(0, 1)) + '</span>' +
        '<div><h3>' + esc(a.city.name) + '<small>匹配度 ' + a.match + '%</small></h3><p>' + esc(a.city.altReason) + '</p></div></li>';
    }).join('');

    view.innerHTML =
      '<div class="r-hero">' +
        '<p class="r-label">你的灵魂城市是</p>' +
        '<h1 class="r-city">' + esc(c.name) + '</h1>' +
        '<span class="r-nick">' + esc(c.nickname) + '</span>' +
        '<p class="r-tagline">' + esc(c.tagline) + '</p>' +
        '<div class="r-match"><b>' + best.match + '%</b><span>契合度</span></div>' +
        '<ul class="r-keywords">' + c.keywords.map(function (k) { return '<li>#' + esc(k) + '</li>'; }).join('') + '</ul>' +
      '</div>' +
      sec('🪞', '你的城市性格画像', '<p>' + esc(c.portrait) + '</p>') +
      sec('✨', '为什么是' + c.name, '<ul class="why-list">' + whyHtml + '</ul>') +
      sec('📊', '你和' + c.name + '的 8 维契合图', '<div class="bars">' + bars + '</div><div class="bar-legend"><span class="l-you">你</span><span class="l-city">' + esc(c.name) + '</span></div>') +
      sec('🔍', '更懂你一点', traitText.map(function (t) { return '<p>' + esc(t) + '</p>'; }).join('')) +
      sec('🗺️', '在' + c.name + '的生活指南', '<div class="guide">' + guide + '</div>') +
      sec('💞', '社交与感情', '<p>' + esc(c.social) + '</p>') +
      sec('⚠️', '你可能会遇到的挑战', '<p>' + esc(c.challenge) + '</p>') +
      sec('🧭', '你的备选城市', '<ul class="alt-list">' + altHtml + '</ul>') +
      sec('🙅', '最不适合你的城市', '<ul class="alt-list"><li class="alt worst"><span class="dot" aria-hidden="true">' + esc(worst.city.name.slice(0, 1)) + '</span>' +
        '<div><h3>' + esc(worst.city.name) + '<small>匹配度 ' + worst.match + '%</small></h3><p>' + esc(worst.city.notFor) + '</p></div></li></ul>') +
      '<div class="section quote"><p>' + esc(c.quote) + '</p></div>' +
      '<div class="actions">' +
        '<button class="btn" type="button" id="btn-share">生成分享图</button>' +
        '<button class="btn btn-ghost" type="button" id="btn-retry">重新测试</button>' +
      '</div>' +
      '<p class="disclaimer">' + esc(D.site.disclaimer) + '</p>';

    show('result');
    fitAll();
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { view.querySelectorAll('.fill').forEach(function (f) { f.style.width = f.dataset.w + '%'; }); });
    });
    $('btn-share').onclick = function () {
      window.ShareCard.open({ city: c, match: best.match, alts: alts, why: why.map(function (w) { return D.dims[w.dim].name; }), site: D.site });
    };
    $('btn-retry').onclick = function () {
      if (!confirm('确定要重新测试吗？当前结果会被清除。')) return;
      answers = new Array(N).fill(null); idx = 0;
      try { localStorage.removeItem(STORE); } catch (e) {}
      document.querySelector('meta[name="theme-color"]').setAttribute('content', '#FBF7F2');
      show('quiz'); renderQuestion(true);
    };
  }

  // 结果页的金句和标语：避免最后一行只剩一两个字
  function fitAll() {
    var v = $('view-result');
    if (v.hidden) return;
    window.FitText(v.querySelector('.quote p'), 0.85);
    window.FitText(v.querySelector('.r-tagline'), 0.85);
    window.FitText(v.querySelector('.disclaimer'), 0.85);
    v.querySelectorAll('.section p:not(.quote p), .why-list li > span:last-child').forEach(window.NoOrphan);
  }

  function sec(ico, title, body) {
    return '<section class="section"><h2><span class="ico" aria-hidden="true">' + ico + '</span>' + esc(title) + '</h2>' + body + '</section>';
  }

  // ---------- 启动 ----------
  $('meta-count').textContent = N;
  var saved = load();
  if (saved && saved.done) { $('btn-last').hidden = false; }
  else if (saved && saved.answers.some(function (a) { return a != null; })) { $('btn-start').textContent = '继续答题'; }

  $('btn-start').onclick = function () {
    var s = load();
    if (s && !s.done) { answers = s.answers; idx = Math.min(s.idx || 0, N - 1); }
    else { answers = new Array(N).fill(null); idx = 0; }
    show('quiz'); renderQuestion(true);
  };
  $('btn-last').onclick = function () { answers = load().answers; renderResult(); };
  var resizeTimer;
  window.addEventListener('resize', function () { clearTimeout(resizeTimer); resizeTimer = setTimeout(fitAll, 120); });
  $('btn-back').onclick = function () { if (idx > 0 && !locked) { idx--; save(); renderQuestion(true); } };
  $('q-options').addEventListener('click', function (e) {
    var b = e.target.closest('.option'); if (b) choose(+b.dataset.i);
  });
  document.addEventListener('keydown', function (e) {
    if ($('view-quiz').hidden) return;
    var k = 'abcd'.indexOf(e.key.toLowerCase());
    if (k < 0) k = '1234'.indexOf(e.key);
    if (k >= 0 && k < Q[idx].options.length) choose(k);
  });
})();
