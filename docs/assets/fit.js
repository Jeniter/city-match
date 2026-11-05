/* 防止只有一两个字“掉”到下一行：
   - 只多出一小截：把字号缩小一点，排成一行（最小缩到原字号的 minRatio）
   - 本来就长：保持原字号，把每行调成差不多一样长 */
(function () {
  'use strict';

  // 数一下文字实际排成了几行
  function lineCount(el) {
    var r = document.createRange();
    r.selectNodeContents(el);
    var tops = {};
    Array.prototype.forEach.call(r.getClientRects(), function (b) { if (b.width > 1) tops[Math.round(b.top)] = 1; });
    return Object.keys(tops).length;
  }

  function fitText(el, minRatio) {
    if (!el || !el.offsetWidth) return;
    el.style.fontSize = ''; el.style.maxWidth = '';
    if (lineCount(el) <= 1) return;

    var base = parseFloat(getComputedStyle(el).fontSize);
    var min = base * (minRatio || 0.85);

    // 量一下：不换行时整句有多宽
    el.style.whiteSpace = 'nowrap';
    var need = el.scrollWidth, avail = el.clientWidth;
    el.style.whiteSpace = '';

    // 缩小一点就能排成一行
    var size = Math.floor(base * avail / need * 2) / 2;
    if (size >= min) {
      el.style.fontSize = size + 'px';
      while (lineCount(el) > 1 && size - 0.5 >= min) { size -= 0.5; el.style.fontSize = size + 'px'; }
      if (lineCount(el) === 1) return;
      el.style.fontSize = '';
    }

    // 句子本来就长：限制宽度，让每行一样长，最后一行就不会只剩一两个字
    var n = lineCount(el);
    el.style.maxWidth = Math.ceil(need / n + base) + 'px';
    if (lineCount(el) > n) el.style.maxWidth = '';
  }

  // 长段落：最后一行只剩 1-2 个字（大多是“字+句号”）时，把最后几个字绑在一起不拆开，
  // 浏览器会从上一行带一个字下来，最后一行至少有 3 个字
  function noOrphan(el) {
    if (!el || el.dataset.fit) return;
    var t = el.lastChild;
    if (!t || t.nodeType !== 3 || t.data.length < 12) return;
    var s = t.data, k = 3;
    // 末尾的标点不算字数
    while (k < s.length && /[，。、；：？！”’）》…]/.test(s.charAt(s.length - k))) k++;
    var keep = document.createElement('span');
    keep.style.whiteSpace = 'nowrap';
    keep.textContent = s.slice(-k);
    t.data = s.slice(0, -k);
    el.appendChild(keep);
    el.dataset.fit = '1';
  }

  window.FitText = fitText;
  window.NoOrphan = noOrphan;
})();
