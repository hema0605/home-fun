/* Anand Vidhya · Home-Fun games and thinking games.
   One small engine for nine kinds of game: find, match, pair, sort, collect, same, odd one out, what comes next, order.
   The game is described by window.GAME, written into each page by build/pg_games.py.
   An adult plays with the child: the game speaks with its own recorded lady's voice, and the question is always
   on the screen too.
   Nothing is wrong for long: a wrong choice wiggles and goes back, and after a pause the game shows what to do. */
(function () {
  'use strict';
  var G = window.GAME;
  function $(id) { return document.getElementById(id); }
  var startEl = $('start'), gameEl = $('game'), endEl = $('end'), play = $('play'), promptEl = $('prompt'), dotsEl = $('dots');
  var NUM = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];

  function el(tag, cls, parent) { var n = document.createElement(tag); if (cls) n.className = cls; if (parent) parent.appendChild(n); return n; }
  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  /* A picture: a drawing from a file, a patch of colour, or a shape drawn here (the thinking games use shapes).
     p.z makes a smaller copy of the same picture (size games); p.n draws the shape several times (counting);
     p.h draws only its outline; p.r turns it. */
  var SHAPES = {
    circle: '<circle cx="50" cy="50" r="43"/>',
    square: '<rect x="9" y="9" width="82" height="82" rx="7"/>',
    triangle: '<polygon points="50,9 93,88 7,88"/>',
    rectangle: '<rect x="5" y="25" width="90" height="50" rx="6"/>',
    star: '<polygon points="50,5 61,36 95,36 68,56 78,89 50,69 22,89 32,56 5,36 39,36"/>',
    heart: '<path d="M50 88 C20 66 6 48 6 31 C6 17 17 8 29 8 C38 8 46 13 50 21 C54 13 62 8 71 8 C83 8 94 17 94 31 C94 48 80 66 50 88 Z"/>',
    diamond: '<polygon points="50,5 90,50 50,95 10,50"/>',
    oval: '<ellipse cx="50" cy="50" rx="45" ry="29"/>',
    pentagon: '<polygon points="50,6 94,38 77,90 23,90 6,38"/>',
    hexagon: '<polygon points="27,10 73,10 96,50 73,90 27,90 4,50"/>',
    arrow: '<polygon points="50,6 90,50 66,50 66,94 34,94 34,50 10,50"/>',
    moon: '<path d="M68 8 A44 44 0 1 0 68 92 A34 34 0 1 1 68 8 Z"/>'
  };
  function shapeSvg(p) {
    var n = p.n || 1, cols = n > 4 ? 3 : n > 1 ? 2 : 1, rows = Math.ceil(n / cols), parts = '';
    var cell = 100 / Math.max(cols, rows), k = cell / 100 * (n > 1 ? 0.84 : 1);
    for (var i = 0; i < n; i++) {
      var cx = (i % cols + 0.5) * cell + (100 - cols * cell) / 2, cy = (Math.floor(i / cols) + 0.5) * cell + (100 - rows * cell) / 2;
      parts += '<g transform="translate(' + cx + ' ' + cy + ') scale(' + k + ') rotate(' + (p.r || 0) + ') translate(-50 -50)">' + (SHAPES[p.s] || SHAPES.circle) + '</g>';
    }
    var paint = p.h ? 'fill="#fff" stroke="' + p.f + '" stroke-width="9" stroke-linejoin="round"' : 'fill="' + p.f + '"';
    return '<svg class="shape" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" ' + paint + '>' + parts + '</svg>';
  }
  function pic(p, outline) {
    var n;
    if (p.s) { n = el('span', 'shapebox'); n.innerHTML = shapeSvg(p); }
    else if (p.c) { n = el('span', 'patch'); n.style.background = p.c; }
    else { n = el('img'); n.src = outline && p.o ? p.o : p.a; n.alt = ''; n.draggable = false; }
    if (p.z) { var box = el('span', 'zbox'); box.appendChild(n); n.style.transform = 'scale(' + p.z + ')'; return box; }
    return n;
  }
  function centre(n) { var r = n.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }

  /* ── sound: small tones made in the browser ── */
  var ac = null;
  function unlock() {                 // called inside the tap on "Play": phones allow sound only after a touch
    try {
      if (!ac) { var AC = window.AudioContext || window.webkitAudioContext; if (AC) ac = new AC(); }
      if (ac && ac.state === 'suspended') ac.resume();
    } catch (e) { ac = null; }
    if (FILE || !ac || !HAS_P) {      // the simple player is used: wake it inside the touch too, without a sound
      try {
        if (!tag) tag = new Audio();
        for (var t in CLIPS) { if (Object.prototype.hasOwnProperty.call(CLIPS, t)) { tag.muted = true; tag.src = 'voice/' + CLIPS[t] + '.mp3'; break; } }
        var pr = tag.play();
        if (pr && pr.then) pr.then(function () { tag.pause(); tag.muted = false; }, function () { tag.muted = false; });
      } catch (e) { /* sound is a bonus */ }
    }
  }
  function tone(f, at, dur, vol, type) {
    var o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(vol || 0.2, at + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g); g.connect(ac.destination); o.start(at); o.stop(at + dur + 0.05);
  }
  function sfx(name) {
    if (!ac) return;
    try {
      var t = ac.currentTime + 0.01;
      if (name === 'good') { tone(660, t, 0.16); tone(990, t + 0.13, 0.28); }
      else if (name === 'bad') { tone(233, t, 0.22, 0.1, 'triangle'); }
      else if (name === 'tap') { tone(520, t, 0.07, 0.08); }
      else if (name === 'win') { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, t + i * 0.14, 0.32); }); }
    } catch (e) { /* sound is a bonus */ }
  }

  /* Every sentence a game can say is made by L, so that lines() can list them all: each one has a recording. */
  var L = {
    yes: function (a, p) { return a.yes || 'Yes! ' + cap(p.w) + '.'; },
    ok: function () { return 'Yes!'; },
    name: function (p) { return cap(p.w) + '.'; },
    bin: function (b) { return cap(b.w) + '!'; },
    sortAsk: function (q, sc) { return cap(q.w) + '. ' + sc.say; },
    count: function (n) { return cap(NUM[n] || String(n)) + '.'; },
    miss: function (p) { return 'Not the ' + p.w + '.'; },
    done: function () { return 'Well done!'; }
  };
  function lines() {
    var out = [], add = function (t) { if (t && out.indexOf(t) < 0) out.push(t); };
    if (G.mech === 'find') G.asks.forEach(function (a) { add(a.say); add(L.yes(a, { w: a.answer })); });
    else if (G.mech === 'match') { add(G.say); G.sets.forEach(function (set) { set.forEach(function (p) { add(L.name(p)); }); }); }
    else if (G.mech === 'pair') { add(G.say); G.pairs.forEach(function (x) { add(x.line); }); }
    else if (G.mech === 'sort') G.screens.forEach(function (sc) {
      if (sc.plain) { add(sc.say); add(L.ok()); return; }
      sc.bins.forEach(function (b) { add(L.bin(b)); });
      sc.items.forEach(function (q) { add(L.name(q)); add(L.sortAsk(q, sc)); });
    });
    else if (G.mech === 'collect') { add(G.say); G.good.forEach(function (p, i) { add(G.count ? L.count(i + 1) : L.name(p)); }); G.bad.forEach(function (p) { add(L.miss(p)); }); }
    else if (G.rounds) G.rounds.forEach(function (r) { add(r.say || G.say); add(r.yes || L.ok()); });
    add(L.done());
    return out;
  }

  /* ── the voice: the game's own recorded lady's voice ──
     Every sentence a game can say has a recording that comes with the game: voice/<key>.mp3. The game never uses
     the voices of the phone or the computer. A page cannot be sure of them: on 15 Nov 2026 the school's own Mac
     went on speaking in a man's voice although the page had chosen a lady's voice, and an Android phone does not
     even let a page choose. (The recordings are made on the school's Mac with the open voice "Kokoro".) */
  var CLIPS = G.voice || {}, bytes = {}, sounds = {}, playing = null, tag = null, sayT = null, sayN = 0;
  var HAS_P = typeof Promise !== 'undefined', FILE = location.protocol === 'file:';
  function getBytes(key) {                // the file of one sentence, fetched once
    if (!bytes[key]) {
      bytes[key] = new Promise(function (ok, no) {
        var x = new XMLHttpRequest();
        x.open('GET', 'voice/' + key + '.mp3');
        x.responseType = 'arraybuffer';
        x.onload = function () { if (x.status === 200 && x.response) ok(x.response); else no(new Error('no file')); };
        x.onerror = function () { no(new Error('no file')); };
        x.send();
      });
      bytes[key].then(null, function () { /* asked for again when it is needed */ });
    }
    return bytes[key];
  }
  function getSound(key) {                // … and made ready to play; needs the sound system that the tap on Play wakes
    if (!sounds[key]) {
      sounds[key] = getBytes(key).then(function (b) {
        return new Promise(function (ok, no) { ac.decodeAudioData(b.slice(0), ok, no); });
      });
      sounds[key].then(null, function () { delete sounds[key]; delete bytes[key]; });
    }
    return sounds[key];
  }
  function stopClip() {
    if (playing) { try { playing.stop(); } catch (e) { /* it had ended */ } playing = null; }
    if (tag) { try { tag.pause(); } catch (e) { /* nothing was playing */ } }
  }
  function fetchClips() {                 // quietly, while the start screen is shown
    if (!HAS_P || FILE) return;
    for (var t in CLIPS) { if (Object.prototype.hasOwnProperty.call(CLIPS, t)) getBytes(CLIPS[t]); }
  }
  var said = [];                          // for the tests: what was said, and how
  function playTag(key, text) {           // the simple player: for a page opened as a file, or when the other way fails
    try {
      if (!tag) tag = new Audio();
      tag.muted = false;
      tag.src = 'voice/' + key + '.mp3';
      var pr = tag.play();
      if (pr && pr.then) pr.then(null, function () { /* the device did not allow it: the words are on the screen */ });
      said.push({ text: text, by: 'the game\'s own voice' });
    } catch (e) { said.push({ text: text, by: 'nobody (the recording could not be played)' }); }
  }
  function say(text) {
    if (!text || document.hidden) return;
    var n = ++sayN;
    clearTimeout(sayT);
    stopClip();
    sayT = setTimeout(function () {
      if (n !== sayN) return;
      var key = CLIPS[text];
      if (!key) { said.push({ text: text, by: 'nobody (no recording)' }); return; }
      if (ac && HAS_P && !FILE) {
        getSound(key).then(function (buf) {
          if (n !== sayN || document.hidden) return;
          stopClip();
          var src = ac.createBufferSource();
          src.buffer = buf; src.connect(ac.destination); src.start(0);
          playing = src;
          said.push({ text: text, by: 'the game\'s own voice' });
        }, function () { if (n === sayN) playTag(key, text); });
      } else playTag(key, text);
    }, 70);
  }
  /* The copy on the school's own Wi-Fi notes on the school computer which device played (the page sets AV_DIAG;
     the copies on the internet do not have it and tell nothing). It helped to find the man's voice. */
  var told = false;
  function tell() {
    if (told || !window.AV_DIAG) return;
    told = true;
    try {
      new Image().src = window.AV_DIAG + '?g=' + encodeURIComponent(String(G.no)) + '&v=' + encodeURIComponent('the game’s own recorded voice') +
        '&k=' + (ac && HAS_P && !FILE ? 'webaudio' : 'tag') + '&n=0&en=&ua=' + encodeURIComponent(String(navigator.userAgent || '').slice(0, 180));
    } catch (e) { /* only a note */ }
  }
  var lastSay = '';
  function ask(text, spoken) { promptEl.textContent = text; lastSay = spoken || text; say(lastSay); }
  $('again').addEventListener('click', function () { unlock(); say(lastSay); });

  /* ── progress dots ── */
  var total = 0, got = 0;
  function drawDots() { dotsEl.innerHTML = ''; for (var i = 0; i < total; i++) el('i', i < got ? 'on' : '', dotsEl); }
  function step() { got++; drawDots(); }

  /* ── little stars that fly out of a right answer ── */
  function sparks(node) {
    var r = node.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    for (var i = 0; i < 7; i++) {
      var s = el('img', 'spark', document.body), a = (Math.PI * 2 * i) / 7 + Math.random() * 0.5, d = r.width * (0.55 + Math.random() * 0.35);
      s.src = G.star; s.alt = '';
      s.style.left = cx + 'px'; s.style.top = cy + 'px';
      s.style.setProperty('--dx', Math.cos(a) * d + 'px'); s.style.setProperty('--dy', Math.sin(a) * d + 'px');
      setTimeout((function (x) { return function () { if (x.parentNode) x.parentNode.removeChild(x); }; })(s), 820);
    }
  }

  /* ── a hand that shows the move once, and again after a long pause ── */
  var hand = null, handT = [];
  function stopHand() {
    handT.forEach(clearTimeout); handT = [];
    if (hand && hand.parentNode) hand.parentNode.removeChild(hand);
    hand = null;
  }
  function showHand(from, to) {
    stopHand();
    hand = el('img', 'hand', document.body); hand.src = G.hand; hand.alt = '';
    var h = hand;
    function at(n) { var c = centre(n); h.style.transform = 'translate(' + (c[0] - 32) + 'px,' + (c[1] - 6) + 'px)'; }
    function loop(delay) {
      handT.push(setTimeout(function () { h.style.transition = 'none'; at(from); h.style.opacity = '1'; }, delay));
      handT.push(setTimeout(function () { h.style.transition = ''; at(to); }, delay + 450));
      handT.push(setTimeout(function () { h.style.opacity = '0'; }, delay + 1750));
    }
    loop(0); loop(2300);
    handT.push(setTimeout(stopHand, 4500));
  }

  /* ── when nobody touches the screen for a while ── */
  var idleT = null, nudges = 0, nudgeFn = null;
  function resetIdle() {
    clearTimeout(idleT);
    if (!nudgeFn) return;
    idleT = setTimeout(function () { if (nudgeFn && nudges++ < 3) { nudgeFn(); resetIdle(); } }, 9000);
  }
  function armIdle(fn) { nudgeFn = fn; nudges = 0; resetIdle(); }
  function stopIdle() { clearTimeout(idleT); nudgeFn = null; }
  gameEl.addEventListener('pointerdown', function () { stopHand(); resetIdle(); }, true);

  /* ── dragging (with tapping as a second way) ── */
  var targets = [], picked = null, roundStep = null, roundMiss = null, firstDrag = true;
  function setPos(n, x, y) { n._x = x; n._y = y; n.style.transform = 'translate(' + x + 'px,' + y + 'px)'; }
  function goHome(n, shake) {
    n.classList.add('back'); setPos(n, 0, 0);
    setTimeout(function () { n.classList.remove('back'); }, 320);
    if (shake) { n.classList.add('shake'); setTimeout(function () { n.classList.remove('shake'); }, 460); }
  }
  function flyTo(n, t, cb) {
    var a = centre(n), b = centre(t);
    n.classList.add('fly'); setPos(n, (n._x || 0) + b[0] - a[0], (n._y || 0) + b[1] - a[1]);
    setTimeout(function () { n.classList.remove('fly'); cb(); }, 300);
  }
  function hit(n) {
    var c = centre(n), best = null, bd = 1e9;
    targets.forEach(function (t) {
      if (t.full) return;
      var q = t.node.getBoundingClientRect(), mx = q.width * 0.2, my = q.height * 0.2;
      if (c[0] > q.left - mx && c[0] < q.right + mx && c[1] > q.top - my && c[1] < q.bottom + my) {
        var dx = c[0] - (q.left + q.width / 2), dy = c[1] - (q.top + q.height / 2), d = dx * dx + dy * dy;
        if (d < bd) { bd = d; best = t; }
      }
    });
    return best;
  }
  function pick(item) {
    if (picked) picked.node.classList.remove('picked');
    picked = item;
    if (item) { item.node.classList.add('picked'); sfx('tap'); }
  }
  function attempt(item, t) {
    if (item.done || t.full) { if (!item.done) goHome(item.node, false); return; }
    if (t.accepts(item)) {
      item.done = true;
      if (t.single) t.full = true;
      if (picked === item) pick(null);
      flyTo(item.node, t.node, function () {
        item.node.classList.add('gone');
        t.fill(item); sfx('good'); sparks(t.node); step();
        if (roundStep) roundStep(item, t);
      });
    } else {
      sfx('bad'); goHome(item.node, true);
      t.node.classList.add('nope'); setTimeout(function () { t.node.classList.remove('nope'); }, 460);
      if (roundMiss) roundMiss(item, t);
    }
  }
  function draggable(item, onTap) {
    var n = item.node, pid = null, sx = 0, sy = 0, bx = 0, by = 0, moved = false;
    n.addEventListener('pointerdown', function (ev) {
      if (pid !== null || item.done || ev.button) return;
      pid = ev.pointerId; sx = ev.clientX; sy = ev.clientY; bx = n._x || 0; by = n._y || 0; moved = false;
      try { n.setPointerCapture(pid); } catch (e) { /* not every browser */ }
      n.classList.remove('back'); n.classList.add('dragging');
      ev.preventDefault();
    });
    n.addEventListener('pointermove', function (ev) {
      if (ev.pointerId !== pid) return;
      var dx = ev.clientX - sx, dy = ev.clientY - sy;
      if (!moved && dx * dx + dy * dy > 144) moved = true;
      if (moved) setPos(n, bx + dx, by + dy);
    });
    function up(ev) {
      if (ev.pointerId !== pid) return;
      pid = null; n.classList.remove('dragging');
      if (item.done) return;
      if (!moved) { onTap(item); return; }
      var t = hit(n);
      if (t) attempt(item, t); else goHome(n, false);
    }
    n.addEventListener('pointerup', up);
    n.addEventListener('pointercancel', up);
  }
  function clearPlay(cls) {
    stopHand(); stopIdle();
    play.innerHTML = ''; play.className = cls;
    targets = []; picked = null; roundStep = null; roundMiss = null;
  }
  function firstHint(fn) { if (firstDrag) { firstDrag = false; setTimeout(fn, 1000); } }

  /* ── find: the phone asks, the child taps one of three pictures ── */
  function findRound(a) {
    return function (done) {
      clearPlay('find');
      var answer = G.pool.filter(function (p) { return p.w === a.answer; })[0];
      var others = shuffle(G.pool.filter(function (p) { return p.w !== a.answer; })).slice(0, 2);
      var row = el('div', 'row', play), locked = false, right = null;
      shuffle([answer].concat(others)).forEach(function (p) {
        var b = el('button', 'tile', row), last = 0;
        b.type = 'button'; b.setAttribute('aria-label', p.w); b.appendChild(pic(p));
        if (p === answer) right = b;
        function choose() {
          var now = Date.now();
          if (now - last < 450) return;
          last = now;
          if (locked || b.classList.contains('off')) return;
          if (p === answer) {
            locked = true; stopIdle();
            b.classList.add('yes'); sfx('good'); sparks(b); step(); say(L.yes(a, p));
            setTimeout(done, 1600);
          } else {
            sfx('bad'); b.classList.add('no');
            setTimeout(function () { b.classList.remove('no'); b.classList.add('off'); }, 430);
            say(a.say);
          }
        }
        b.addEventListener('pointerdown', choose);
        b.addEventListener('click', choose);
      });
      ask(a.say);
      armIdle(function () { say(a.say); right.classList.add('hint'); setTimeout(function () { right.classList.remove('hint'); }, 1350); });
    };
  }

  /* ── match and pair: drag each picture on to its place ── */
  function placeRound(slots, things, text) {
    return function (done) {
      clearPlay('place');
      var top = el('div', 'row', play), bottom = el('div', 'row', play), left = things.length, items = [];
      shuffle(slots).forEach(function (s) {
        var n = el('div', 'slot' + (s.outline ? '' : ' solid'), top);
        n.appendChild(pic(s.p, s.outline));
        var t = {
          node: n, single: true, full: false,
          accepts: function (it) { return it.key === s.key; },
          fill: function (it) {
            n.classList.add('full');
            if (s.outline) { n.innerHTML = ''; n.appendChild(pic(s.p)); } else { el('span', 'badge', n).appendChild(pic(it.p)); }
            say(s.line);
          }
        };
        targets.push(t);
        n.addEventListener('pointerdown', function () { if (picked) attempt(picked, t); });
      });
      shuffle(things).forEach(function (th) {
        var n = el('div', 'drag', bottom);
        n.appendChild(pic(th.p));
        var item = { node: n, key: th.key, p: th.p };
        items.push(item);
        draggable(item, function (x) { pick(picked === x ? null : x); });
      });
      function hint() {
        var it = items.filter(function (x) { return !x.done; })[0];
        var t = it && targets.filter(function (x) { return !x.full && x.accepts(it); })[0];
        if (it && t) showHand(it.node, t.node);
      }
      roundStep = function () { if (--left === 0) { stopIdle(); setTimeout(done, 1700); } };
      ask(text);
      firstHint(hint);
      armIdle(function () { say(lastSay); hint(); });
    };
  }

  /* ── sort: one picture at a time goes into the left or the right box ── */
  function sortRound(sc) {
    return function (done) {
      clearPlay('sort');
      var top = el('div', 'row', play), stage = el('div', 'row', play), queue = shuffle(sc.items), cur = null;
      sc.bins.forEach(function (b, i) {
        var n = el('div', 'bin', top);
        n.appendChild(pic(b));
        var tray = el('div', 'tray', n);
        var t = {
          node: n,
          accepts: function (it) { return it.bin === i; },
          fill: function (it) { el('span', 'mini', tray).appendChild(pic(it.p)); say(sc.plain ? L.ok() : L.bin(b)); }
        };
        targets.push(t);
        n.addEventListener('pointerdown', function () { if (cur && !cur.done) attempt(cur, t); });
      });
      function hint() { if (cur && !cur.done) showHand(cur.node, targets[cur.bin].node); }
      function nextItem() {
        var q = queue.shift();
        if (!q) { stopIdle(); setTimeout(done, 500); return; }
        stage.innerHTML = '';
        var n = el('div', 'drag solo', stage);
        n.setAttribute('data-bin', q.bin);
        n.appendChild(pic(q));
        cur = { node: n, bin: q.bin, p: q };
        draggable(cur, function () { if (!sc.plain) say(L.name(q)); });
        ask(sc.say, sc.plain ? sc.say : L.sortAsk(q, sc));
        firstHint(hint);
        armIdle(function () { say(lastSay); hint(); });
      }
      roundStep = function () { stopIdle(); setTimeout(nextItem, 1200); };
      nextItem();
    };
  }

  /* ── collect: the right things go into one big bag, plate or basket; the others stay out ── */
  function collectRound() {
    return function (done) {
      clearPlay('collect');
      var tn = el('div', 'target', play);
      tn.appendChild(pic(G.target));
      var tray = el('div', 'tray', tn), row = el('div', 'row items', play), left = G.good.length, n = 0, items = [];
      var t = {
        node: tn,
        accepts: function (it) { return it.good; },
        fill: function (it) {
          el('span', 'mini', tray).appendChild(pic(it.p)); n++;
          say(G.count ? L.count(n) : L.name(it.p));
        }
      };
      targets.push(t);
      shuffle(G.good.map(function (p) { return { p: p, good: true }; }).concat(G.bad.map(function (p) { return { p: p, good: false }; })))
        .forEach(function (it) {
          it.node = el('div', 'drag', row);
          it.node.appendChild(pic(it.p));
          items.push(it);
          draggable(it, function (x) { attempt(x, t); });
        });
      function hint() { var it = items.filter(function (x) { return x.good && !x.done; })[0]; if (it) showHand(it.node, tn); }
      roundStep = function () { if (--left === 0) { stopIdle(); setTimeout(done, 1700); } };
      roundMiss = function (it) { say(L.miss(it.p)); };
      ask(G.say);
      firstHint(hint);
      armIdle(function () { say(lastSay); hint(); });
    };
  }

  /* ── same, odd one out, what comes next: tap one of the pictures ──
     A round can have a board on top: the picture to find again, or a row or grid with one place left open. */
  function chooseRound(r) {
    return function (done) {
      clearPlay('pick' + (r.top ? ' withtop' : ''));
      if (r.top) {
        var board = el('div', 'board', play);
        board.style.setProperty('--cols', r.cols || r.top.length);
        r.top.forEach(function (p) { var c = el('div', 'cell' + (p ? '' : ' q'), board); if (p) c.appendChild(pic(p)); else c.textContent = '?'; });
      }
      var row = el('div', 'row', play), locked = false, right = null;
      shuffle(r.choices.map(function (p, i) { return { p: p, i: i }; })).forEach(function (ch) {
        var b = el('button', 'tile', row), last = 0;
        b.type = 'button'; b.setAttribute('data-i', ch.i); b.appendChild(pic(ch.p));
        if (ch.i === r.answer) right = b;
        function choose() {
          var now = Date.now();
          if (now - last < 450) return;
          last = now;
          if (locked || b.classList.contains('off')) return;
          if (ch.i === r.answer) {
            locked = true; stopIdle();
            b.classList.add('yes'); sfx('good'); sparks(b); step(); say(r.yes || L.ok());
            var q = play.querySelector('.cell.q');
            if (q) { q.textContent = ''; q.className = 'cell filled'; q.appendChild(pic(ch.p)); }
            setTimeout(done, 1600);
          } else {
            sfx('bad'); b.classList.add('no');
            setTimeout(function () { b.classList.remove('no'); b.classList.add('off'); }, 430);
          }
        }
        b.addEventListener('pointerdown', choose);
        b.addEventListener('click', choose);
      });
      ask(r.say || G.say);
      armIdle(function () { say(lastSay); right.classList.add('hint'); setTimeout(function () { right.classList.remove('hint'); }, 1350); });
    };
  }

  /* ── order: tap the pictures one after the other, as the game says (the smallest first …) ── */
  function orderRound(r) {
    return function (done) {
      clearPlay('order');
      var top = el('div', 'row slots', play), row = el('div', 'row', play), nextI = 0, tiles = [];
      r.items.forEach(function () { el('div', 'slot', top); });
      shuffle(r.items.map(function (p, i) { return { p: p, i: i }; })).forEach(function (it) {
        var b = el('button', 'tile', row), last = 0;
        b.type = 'button'; b.setAttribute('data-i', it.i); b.appendChild(pic(it.p));
        tiles[it.i] = b;
        function choose() {
          var now = Date.now();
          if (now - last < 450) return;
          last = now;
          if (b.classList.contains('gone')) return;
          if (it.i === nextI) {
            var slot = top.children[nextI];
            slot.classList.add('full'); slot.appendChild(pic(it.p));
            b.classList.add('gone'); sfx('tap'); nextI++;
            resetIdle();
            if (nextI === r.items.length) { stopIdle(); sfx('good'); sparks(top); step(); say(r.yes || L.ok()); setTimeout(done, 1700); }
          } else { sfx('bad'); b.classList.add('no'); setTimeout(function () { b.classList.remove('no'); }, 430); }
        }
        b.addEventListener('pointerdown', choose);
        b.addEventListener('click', choose);
      });
      ask(r.say || G.say);
      armIdle(function () { say(lastSay); var t = tiles[nextI]; if (t) { t.classList.add('hint'); setTimeout(function () { t.classList.remove('hint'); }, 1350); } });
    };
  }

  /* ── the flow: start → rounds → well done ── */
  var rounds = [], ri = 0;
  function show(s) { [startEl, gameEl, endEl].forEach(function (x) { x.classList.toggle('on', x === s); }); }
  function build() {
    rounds = []; got = 0; total = 0; firstDrag = true;
    if (G.mech === 'find') {
      var asks = G.ordered ? G.asks : shuffle(G.asks);
      total = asks.length;
      asks.forEach(function (a) { rounds.push(findRound(a)); });
    } else if (G.mech === 'match') {
      G.sets.forEach(function (set) {
        total += set.length;
        rounds.push(placeRound(set.map(function (p) { return { p: p, outline: true, key: p.w, line: L.name(p) }; }),
                               set.map(function (p) { return { p: p, key: p.w }; }), G.say));
      });
    } else if (G.mech === 'pair') {
      total = G.pairs.length;
      rounds.push(placeRound(G.pairs.map(function (x) { return { p: x.left, key: x.right.w, line: x.line }; }),
                             G.pairs.map(function (x) { return { p: x.right, key: x.right.w }; }), G.say));
    } else if (G.mech === 'sort') {
      G.screens.forEach(function (sc) { total += sc.items.length; rounds.push(sortRound(sc)); });
    } else if (G.mech === 'collect') {
      total = G.good.length;
      rounds.push(collectRound());
    } else if (G.mech === 'order') {
      total = G.rounds.length;
      G.rounds.forEach(function (r) { rounds.push(orderRound(r)); });
    } else if (G.rounds) {                  // same, odd, next
      total = G.rounds.length;
      G.rounds.forEach(function (r) { rounds.push(chooseRound(r)); });
    }
  }
  function next() {
    if (ri >= rounds.length) { finish(); return; }
    rounds[ri++](next);
  }
  function begin() { unlock(); build(); ri = 0; show(gameEl); drawDots(); next(); setTimeout(tell, 1800); }
  function finish() { stopIdle(); stopHand(); show(endEl); sfx('win'); say(L.done()); }
  $('go').addEventListener('click', begin);
  $('replay').addEventListener('click', begin);
  document.addEventListener('contextmenu', function (ev) { ev.preventDefault(); });
  function hush() { sayN++; clearTimeout(sayT); stopClip(); }
  window.addEventListener('pagehide', hush);
  document.addEventListener('visibilitychange', function () {      // the game is silent when its page is not in front
    if (document.hidden) { hush(); clearTimeout(idleT); stopHand(); } else { resetIdle(); }
  });
  window.AVGAME = { begin: begin, state: function () { return { got: got, total: total, round: ri, rounds: rounds.length, ended: endEl.classList.contains('on') }; },
    // for the tests: what was said and how, every sentence the game can say, and the recordings it has
    said: function () { return said.slice(); }, lines: lines, clips: function () { return CLIPS; } };
  setTimeout(fetchClips, 600);
})();
