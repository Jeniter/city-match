/* 用 canvas 画一张竖版分享海报，用户长按即可保存到相册 */
(function () {
  'use strict';
  var W = 1080, H = 1440;
  var SANS = '-apple-system, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", sans-serif';
  var SERIF = '"Songti SC", "STSong", "Noto Serif SC", "SimSun", serif';

  function mix(hex, other, t) {
    var a = parseInt(hex.slice(1), 16), b = parseInt(other.slice(1), 16);
    var r = Math.round(((a >> 16) & 255) * (1 - t) + ((b >> 16) & 255) * t);
    var g = Math.round(((a >> 8) & 255) * (1 - t) + ((b >> 8) & 255) * t);
    var bl = Math.round((a & 255) * (1 - t) + (b & 255) * t);
    return 'rgb(' + r + ',' + g + ',' + bl + ')';
  }

  // 不能出现在行首的标点
  var NO_START = '，。、；：？！”’）》」…';

  // 中文按字换行：放得下就一行；放不下就尽量平均分成两行，且标点不放在行首
  function wrap(ctx, text, maxW) {
    var chars = Array.from(text);
    if (ctx.measureText(text).width <= maxW) return [text];
    var half = ctx.measureText(text).width / 2, best = -1, bestGap = Infinity;
    for (var i = 1; i < chars.length; i++) {
      if (NO_START.indexOf(chars[i]) >= 0) continue;
      var a = chars.slice(0, i).join(''), b = chars.slice(i).join('');
      if (ctx.measureText(a).width > maxW || ctx.measureText(b).width > maxW) continue;
      var gap = Math.abs(ctx.measureText(a).width - half);
      if (gap < bestGap) { bestGap = gap; best = i; }
    }
    if (best < 0) best = Math.ceil(chars.length / 2);
    return [chars.slice(0, best).join(''), chars.slice(best).join('')];
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  function draw(o) {
    var c = o.city, cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    var ctx = cv.getContext('2d');
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';

    // 背景
    var g = ctx.createLinearGradient(0, 0, W * .6, H);
    g.addColorStop(0, c.color); g.addColorStop(1, mix(c.color, '#1D1B26', .5));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,.07)';
    ctx.beginPath(); ctx.arc(W - 80, 120, 300, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(60, H - 360, 220, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.globalAlpha = .85; ctx.font = '500 38px ' + SANS;
    ctx.fillText('我 的 灵 魂 城 市 是', W / 2, 190);
    ctx.globalAlpha = 1;

    ctx.font = '700 ' + (c.name.length > 2 ? 190 : 230) + 'px ' + SERIF;
    ctx.fillText(c.name, W / 2, 430);

    // 称号胶囊
    ctx.font = '500 40px ' + SANS;
    var nw = ctx.measureText(c.nickname).width + 72;
    ctx.fillStyle = 'rgba(255,255,255,.2)'; roundRect(ctx, (W - nw) / 2, 480, nw, 76, 38); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillText(c.nickname, W / 2, 532);

    ctx.font = '400 38px ' + SANS; ctx.globalAlpha = .95;
    ctx.fillText(c.tagline, W / 2, 630);
    ctx.globalAlpha = 1;

    // 契合度
    ctx.font = '800 120px ' + SANS;
    ctx.fillText(o.match + '%', W / 2, 790);
    ctx.font = '400 34px ' + SANS; ctx.globalAlpha = .85;
    ctx.fillText('契 合 度', W / 2, 846);
    ctx.globalAlpha = 1;

    // 关键词
    ctx.font = '500 36px ' + SANS;
    var tags = c.keywords.map(function (k) { return '#' + k; });
    var tw = tags.map(function (t) { return ctx.measureText(t).width + 56; });
    var total = tw.reduce(function (a, b) { return a + b; }, 0) + 24 * (tags.length - 1);
    var x = (W - total) / 2;
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2;
    tags.forEach(function (t, i) {
      roundRect(ctx, x, 900, tw[i], 70, 35); ctx.stroke();
      ctx.fillText(t, x + tw[i] / 2, 948); x += tw[i] + 24;
    });

    // 白色信息卡
    var cy = 1030, ch = 270;
    ctx.fillStyle = 'rgba(255,255,255,.96)'; roundRect(ctx, 80, cy, W - 160, ch, 36); ctx.fill();
    ctx.fillStyle = '#2B2A33'; ctx.font = '400 36px ' + SERIF;
    var ql = wrap(ctx, '“' + c.quote + '”', W - 260).slice(0, 2);
    var qy = cy + (ql.length === 1 ? 100 : 72); // 一行时垂直居中
    ql.forEach(function (l, i) { ctx.fillText(l, W / 2, qy + i * 56); });
    ctx.fillStyle = 'rgba(43,42,51,.08)'; ctx.fillRect(160, cy + ch - 104, W - 320, 2);
    ctx.fillStyle = '#6E6A78'; ctx.font = '400 30px ' + SANS;
    ctx.fillText('备选城市：' + o.alts.map(function (a) { return a.city.name + ' ' + a.match + '%'; }).join('  ·  '), W / 2, cy + ch - 56);

    // 底部引流：填了小红书号（content/site.json 里的 handle）就显示两行，没填只显示一行
    ctx.fillStyle = '#fff'; ctx.globalAlpha = .9; ctx.font = '500 34px ' + SANS;
    if (o.site.handle) {
      ctx.fillText('你的灵魂城市是哪座？', W / 2, H - 82);
      ctx.globalAlpha = .7; ctx.font = '400 28px ' + SANS;
      ctx.fillText('小红书搜索 ' + o.site.handle + ' 来测一测', W / 2, H - 36);
    } else {
      ctx.fillText('你的灵魂城市是哪座？', W / 2, H - 60);
    }
    ctx.globalAlpha = 1;
    return cv;
  }

  function open(o) {
    var url;
    try { url = draw(o).toDataURL('image/png'); } catch (e) { alert('生成图片失败，可以直接截图保存哦'); return; }
    var m = document.createElement('div');
    m.style.setProperty('--accent', o.city.color);
    m.className = 'modal'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-label', '分享图');
    m.innerHTML = '<img alt="我的灵魂城市是' + o.city.name + '，契合度 ' + o.match + '%" src="' + url + '">' +
      '<p>长按图片保存到相册，发小红书时记得带上图哦</p>' +
      '<a class="btn" download="我的灵魂城市-' + o.city.name + '.png" href="' + url + '">保存图片</a>' +
      '<button class="btn btn-ghost" type="button" style="color:#fff;border-color:rgba(255,255,255,.4)">关闭</button>';
    var prev = document.activeElement;
    function close() { m.remove(); document.removeEventListener('keydown', onKey); if (prev) prev.focus(); }
    function onKey(e) { if (e.key === 'Escape') close(); }
    m.querySelector('button').onclick = close;
    m.addEventListener('click', function (e) { if (e.target === m) close(); });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(m);
    m.querySelector('button').focus();
  }

  window.ShareCard = { open: open, draw: draw };
})();
