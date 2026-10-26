/*
 * macbook-scroll.js — plain JavaScript port of the React "MacbookScroll" component (motion + tailwind).
 *
 *   <div class="mbs-outer">                      ← MacbookScrollDemo wrapper (w-full overflow-hidden)
 *     <div class="mbs" data-mbs>                 ← MacbookScroll root (min-h-[200vh], perspective 800px)
 *       <div class="mbs-lidwrap">                ← <Lid>
 *         <div class="mbs-lidback">…</div>       ← the closed lid face (rotateX -25deg, origin bottom)
 *         <div class="mbs-lid" data-mbs-lid>…    ← the screen: scaleX / scaleY / rotateX / translateY on scroll
 *       <div class="mbs-base">                   ← base: speaker grids, keypad (built below), trackpad
 *
 * Scroll values are the original useTransform ranges, driven by scrollYProgress for
 * offset ["start start", "end start"] (0 when the root's top reaches the top of the window, 1 when its bottom does):
 *   scaleX      [0, 0.3] → [1 (original 1.2), mobile ? 1 : 1.5]
 *   scaleY      [0, 0.3] → [0.6, mobile ? 1 : 1.5]
 *   translateY  [0, 1]   → [0, 1500]   (changed: after p = 0.3 the screen follows the page until p = 0.5, see update())
 *   rotateX     [0.1, 0.12, 0.3] → [-28, -28, 0]
 *   title       translateY [0, 0.3] → [0, 100], opacity [0, 0.2] → [1, 0]   (only if a [data-mbs-title] exists)
 * The screen shows our product video instead of the image.
 */
(function () {
  'use strict';
  var root = document.querySelector('[data-mbs]');
  if (!root) return;
  var lid = root.querySelector('[data-mbs-lid]');
  var keypad = root.querySelector('[data-mbs-keys]');
  var title = root.querySelector('[data-mbs-title]');
  if (!lid) return;

  // ---- tiny stroke icons (24x24, 6px on screen) standing in for the Tabler icons ------------------
  var P = {
    brightnessDown: '<circle cx="12" cy="12" r="3"/><path d="M12 5v.01M17 7v.01M19 12v.01M17 17v.01M12 19v.01M7 17v.01M5 12v.01M7 7v.01"/>',
    brightnessUp: '<circle cx="12" cy="12" r="3"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"/>',
    table: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 10h18M10 3v18"/>',
    search: '<circle cx="10" cy="10" r="7"/><path d="m21 21-6-6"/>',
    microphone: '<rect x="9" y="2" width="6" height="11" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M8 21h8M12 17v4"/>',
    moon: '<path d="M12 3a9 9 0 1 0 9 9 7.5 7.5 0 0 1-9-9z"/>',
    prev: '<path d="M20 5v14l-12-7zM4 5v14"/>',
    skip: '<path d="M4 5v14l12-7zM20 5v14"/>',
    next: '<path d="M4 5v14l12-7zM20 5v14"/>',
    vol3: '<path d="M6 15H4a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1h2l3.5-4.5a.8.8 0 0 1 1.5.5v14a.8.8 0 0 1-1.5.5L6 15M16 10l4 4m0-4-4 4"/>',
    vol2: '<path d="M6 15H4a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1h2l3.5-4.5a.8.8 0 0 1 1.5.5v14a.8.8 0 0 1-1.5.5L6 15M15 8a5 5 0 0 1 0 8"/>',
    vol1: '<path d="M6 15H4a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1h2l3.5-4.5a.8.8 0 0 1 1.5.5v14a.8.8 0 0 1-1.5.5L6 15M15 8a5 5 0 0 1 0 8M17.7 5a9 9 0 0 1 0 14"/>',
    world: '<circle cx="12" cy="12" r="9"/><path d="M3.6 9h16.8M3.6 15h16.8M11.5 3a17 17 0 0 0 0 18M12.5 3a17 17 0 0 1 0 18"/>',
    chevronUp: '<path d="m6 15 6-6 6 6"/>',
    command: '<path d="M7 9a2 2 0 1 1 2-2v10a2 2 0 1 1-2-2h10a2 2 0 1 1-2 2V7a2 2 0 1 1 2 2z"/>'
  };
  function icon(name) {
    return '<svg class="mbs-i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + P[name] + '</svg>';
  }
  function optionKey() {
    return '<svg class="mbs-i" viewBox="0 0 32 32" fill="none" aria-hidden="true"><rect stroke="currentColor" stroke-width="2" x="18" y="5" width="10" height="2"/><polygon stroke="currentColor" stroke-width="2" points="10.6,5 4,5 4,7 9.4,7 18.4,27 28,27 28,25 19.6,25"/></svg>';
  }
  function caret(dir) {
    var d = { up: 'M12 7l6 8H6z', down: 'M12 17l-6-8h12z', left: 'M7 12l8-6v12z', right: 'M17 12l-8-6v12z' }[dir];
    return '<svg class="mbs-i" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="' + d + '"/></svg>';
  }

  // ---- keyboard (KBtn = backlit outer ring + dark key + 5px legend) ---------------------------------
  function kbtn(html, cls, childCls) {
    return '<div class="mbs-k"><div class="mbs-kc' + (cls ? ' ' + cls : '') + '"><div class="mbs-kt' + (childCls ? ' ' + childCls : '') + '">' + (html || '') + '</div></div></div>';
  }
  function row(keys) { return '<div class="mbs-row">' + keys.join('') + '</div>'; }
  function two(a, b, mt) { return '<span class="b">' + a + '</span><span class="b' + (mt ? ' mt' : '') + '">' + b + '</span>'; }
  function one(a) { return '<span class="b">' + a + '</span>'; }
  function fkey(ic, label) { return icon(ic) + '<span class="il mt">' + label + '</span>'; }
  function split(top, bottom, topCls) {   // the bottom row: legend top-right / label bottom-left
    return '<div class="mbs-split ' + (topCls || 'r') + '">' + top + '</div><div class="mbs-split l">' + bottom + '</div>';
  }

  function build() {
    if (!keypad) return;
    var h = '';
    h += row([
      kbtn('esc', 'w10 es', 'is'),
      kbtn(fkey('brightnessDown', 'F1')), kbtn(fkey('brightnessUp', 'F2')), kbtn(fkey('table', 'F3')), kbtn(fkey('search', 'F4')),
      kbtn(fkey('microphone', 'F5')), kbtn(fkey('moon', 'F6')), kbtn(fkey('prev', 'F7')), kbtn(fkey('skip', 'F8')),
      kbtn(fkey('next', 'F8')), kbtn(fkey('vol3', 'F10')), kbtn(fkey('vol2', 'F11')), kbtn(fkey('vol1', 'F12')),
      kbtn('<div class="mbs-power"><div></div></div>')
    ]);
    h += row([
      kbtn(two('~', '`', true)), kbtn(two('!', '1')), kbtn(two('@', '2')), kbtn(two('#', '3')), kbtn(two('$', '4')), kbtn(two('%', '5')),
      kbtn(two('^', '6')), kbtn(two('&amp;', '7')), kbtn(two('*', '8')), kbtn(two('(', '9')), kbtn(two(')', '0')), kbtn(two('&mdash;', '_')),
      kbtn(two('+', ' = ')), kbtn('delete', 'w10 ee', 'ie')
    ]);
    h += row([
      kbtn('tab', 'w10 es', 'is'),
      kbtn(one('Q')), kbtn(one('W')), kbtn(one('E')), kbtn(one('R')), kbtn(one('T')), kbtn(one('Y')), kbtn(one('U')), kbtn(one('I')), kbtn(one('O')), kbtn(one('P')),
      kbtn(two('{', '[')), kbtn(two('}', ']')), kbtn(two('|', '\\'))
    ]);
    h += row([
      kbtn('caps lock', 'w28 es', 'is'),
      kbtn(one('A')), kbtn(one('S')), kbtn(one('D')), kbtn(one('F')), kbtn(one('G')), kbtn(one('H')), kbtn(one('J')), kbtn(one('K')), kbtn(one('L')),
      kbtn(two(':', ';')), kbtn(two('&quot;', '\'')), kbtn('return', 'w285 ee', 'ie')
    ]);
    h += row([
      kbtn('shift', 'w365 es', 'is'),
      kbtn(one('Z')), kbtn(one('X')), kbtn(one('C')), kbtn(one('V')), kbtn(one('B')), kbtn(one('N')), kbtn(one('M')),
      kbtn(two('&lt;', ',')), kbtn(two('&gt;', '.')), kbtn(two('?', '/')), kbtn('shift', 'w365 ee', 'ie')
    ]);
    h += row([
      kbtn(split('<span class="b">fn</span>', icon('world'), 'r'), '', 'jb'),
      kbtn(split(icon('chevronUp'), '<span class="b">control</span>', 'r'), '', 'jb'),
      kbtn(split(optionKey(), '<span class="b">option</span>', 'r'), '', 'jb'),
      kbtn(split(icon('command'), '<span class="b">command</span>', 'r'), 'w8', 'jb'),
      kbtn('', 'w82'),
      kbtn(split(icon('command'), '<span class="b">command</span>', 'l'), 'w8', 'jb'),
      kbtn(split(optionKey(), '<span class="b">option</span>', 'l'), '', 'jb'),
      '<div class="mbs-arrows">' + kbtn(caret('up'), 'h3 w6') + '<div class="mbs-arrows-row">' + kbtn(caret('left'), 'h3 w6') + kbtn(caret('down'), 'h3 w6') + kbtn(caret('right'), 'h3 w6') + '</div></div>'
    ]);
    keypad.innerHTML = h;
  }
  build();

  // ---- scroll progress (motion's useScroll with offset ["start start", "end start"]) ----------------
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  // useTransform(progress, input[], output[]): piecewise linear, clamped to the ends
  function tx(p, inp, out) {
    if (p <= inp[0]) return out[0];
    for (var i = 1; i < inp.length; i++) {
      if (p <= inp[i]) return out[i - 1] + (out[i] - out[i - 1]) * ((p - inp[i - 1]) / (inp[i] - inp[i - 1]));
    }
    return out[out.length - 1];
  }

  var isMobile = window.innerWidth < 768;
  var docTop = 0, height = 1;
  function measure() {
    isMobile = window.innerWidth < 768;
    var y = 0, el = root;                       // layout position (unaffected by the CSS scale on the root)
    while (el) { y += el.offsetTop; el = el.offsetParent; }
    docTop = y; height = root.offsetHeight || 1;
  }

  var raf = 0, visible = true;
  function update() {
    raf = 0;
    if (window.innerWidth <= 820) { lid.style.transform = ''; return; }   // phones: a plain video, no laptop animation (see styles.css)
    var p = reduce ? 0.3 : clamp((window.pageYOffset - docTop) / height, 0, 1);
    // size of the open screen on the page: a bit bigger than the original 1.5, as far as the window allows
    var S = root.offsetWidth ? root.getBoundingClientRect().width / root.offsetWidth : 1;   // the CSS scale on the root
    var FULL = isMobile ? 1 : Math.max(1.5, Math.min(1.75, (window.innerWidth * 0.92) / (512 * S), (window.innerHeight - 200) / (240.8 * S)));
    var sx = tx(p, [0, 0.3], [1.1, FULL]);   // original starts at 1.2; 1.1 keeps the screen inside the laptop frame
    var sy = tx(p, [0, 0.3], [0.535, FULL]);
    // original: translateY [0, 1] -> [0, 1500]. Here the screen follows the page for a while once it is open (p 0.3 -> 0.5)
    // so the whole video can be looked at before it scrolls away and the next section arrives.
    var A = 0.3, B = 0.5;
    var ty = p <= A ? 1500 * p : 1500 * A + (Math.min(p, B) - A) * height / S;
    // ...and, only once the screen is fully open (so it sits on the laptop's display while it opens, as in the original),
    // it glides up so the held screen is centred in the window
    var padTop = parseFloat(window.getComputedStyle(root).paddingTop) || 0;
    var lidH = lid.offsetHeight * FULL * S;                                                  // its fully grown height on screen
    var wanted = Math.max(96, (window.innerHeight - lidH) / 2 - 10);                        // top edge of the held screen
    var natural = -A * height + S * (padTop + 1500 * A);                                    // where the original would hold it
    ty += ((wanted - natural) / S) * clamp((p - A) / 0.08, 0, 1);
    ty += 7 * (1 - Math.min(1, p / A));      // at rest the screen sits a touch lower, so the laptop's top bezel shows
    if (reduce) ty = 0;
    var rot = tx(p, [0.1, 0.12, 0.3], [-28, -28, 0]);
    lid.style.transform = 'translateY(' + ty.toFixed(1) + 'px) scaleX(' + sx.toFixed(4) + ') scaleY(' + sy.toFixed(4) + ') rotateX(' + rot.toFixed(2) + 'deg)';
    if (title) {
      title.style.transform = 'translateY(' + tx(p, [0, 0.3], [0, 100]).toFixed(1) + 'px)';
      title.style.opacity = tx(p, [0, 0.2], [1, 0]).toFixed(3);
    }
  }
  function schedule() { if (!raf && visible) raf = requestAnimationFrame(update); }
  function remeasure() { measure(); schedule(); }

  measure();
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', remeasure);
  window.addEventListener('load', remeasure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(remeasure);
  if ('ResizeObserver' in window) new ResizeObserver(remeasure).observe(document.body);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { visible = en.some(function (e) { return e.isIntersecting; }); if (visible) schedule(); }, { rootMargin: '300px 0px' }).observe(root);
  }
  schedule();
})();
