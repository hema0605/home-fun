/* Anand Vidhya Pre-Nursery · Home-Fun games.
   One small engine for five kinds of game: find, match, pair, sort, collect.
   The game is described by window.GAME, written into each page by build/pg_games.py.
   A parent plays with the child: the phone speaks if it can, and the question is always on the screen too.
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
  function pic(p, outline) {
    if (p.c) { var s = el('span', 'patch'); s.style.background = p.c; return s; }
    var i = el('img'); i.src = outline && p.o ? p.o : p.a; i.alt = ''; i.draggable = false; return i;
  }
  function centre(n) { var r = n.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }

  /* ── sound: small tones made in the browser, no files ── */
  var ac = null;
  var woke = false;
  function unlock() {                 // called inside the tap on "Play": phones allow sound only after a touch
    try {
      if (!ac) { var AC = window.AudioContext || window.webkitAudioContext; if (AC) ac = new AC(); }
      if (ac && ac.state === 'suspended') ac.resume();
    } catch (e) { ac = null; }
    if (!woke && window.speechSynthesis) {      // iPhones: the first words must start inside a touch, so say a silent one now
      woke = true;
      try { var u = new SpeechSynthesisUtterance(' '); u.volume = 0; if (voice) { u.voice = voice; u.lang = voice.lang; } window.speechSynthesis.speak(u); } catch (e) { /* speech is a bonus */ }
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

  /* ── speech: the phone reads the question if it has a voice ──
     The school asked on 15 Nov 2026: a completely female voice in every game, and "use Samantha's voice".
     Samantha is Apple's voice. She is on every iPhone, iPad and Mac, and may be used there; Apple does not allow
     her voice to be recorded into files for other phones. So:
       1. A device that has Samantha speaks with Samantha, in every game.
       2. A device without her speaks with another lady's voice of its own (known by name: a browser does not say
          whether a voice is a woman's or a man's), or with its own English voice when the names tell nothing
          (Android phones: "English United States").
       3. A man's voice never speaks. A device that has only men's voices stays silent: the words are on the screen.
     The voice speaks a little higher and a little slower than usual. */
  var synth = window.speechSynthesis || null, voice = null, voiceKind = '', sayT = null, sayN = 0;
  var LADY = /samantha|veena|isha|heera|neerja|swara|kajal|aditi|raveena|karen|moira|tessa|fiona|serena|kate\b|susan|allison|\bava\b|victoria|zoe|nicky|zira|\baria\b|jenny|sonia|libby|hazel|catherine|michelle|natasha|female|woman|google us english/i;
  var MAN = /rishi|\bravi\b|prabhat|daniel|\balex\b|\bfred\b|\btom\b|oliver|aaron|arthur|gordon|martin|ralph|eddy|\breed\b|rocko|junior|david|\bmark\b|george|james|\bguy\b|ryan|\bmale\b|\bman\b/i;
  var ODD = /bad news|bahh|bells|boing|bubbles|cellos|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox|deranged|hysterical|grandma|grandpa|albert|kathy|\bflo\b|sandy|shelley|eloquence|espeak|compact/i;
  var PLACE = [['en-us', 40], ['en-gb', 32], ['en-in', 30], ['en-au', 24], ['en-ie', 22], ['en-za', 22], ['en', 20]];   // nearest to Samantha first
  function nameOf(v) { return String(v.name || '') + ' ' + String(v.voiceURI || ''); }
  function kindOf(v) { var n = nameOf(v); return ODD.test(n) ? 'odd' : LADY.test(n) ? 'lady' : MAN.test(n) ? 'man' : 'unknown'; }
  function marks(v) {
    var lang = String(v.lang || '').toLowerCase().replace('_', '-'), name = nameOf(v), kind = kindOf(v), m = -1000;
    for (var i = 0; i < PLACE.length; i++) { if (lang.indexOf(PLACE[i][0]) === 0) { m = PLACE[i][1]; break; } }
    if (m < 0 || kind === 'man' || kind === 'odd') return -1000;      // not English, a man's voice or a funny voice: never
    if (/samantha/i.test(name)) m += 300;
    if (kind === 'lady') m += 100;
    if (/natural|enhanced|premium|neural/i.test(name)) m += 6;
    if (v.localService === false) m -= 5;
    return m;
  }
  function choose(list) {
    var best = -999, win = null, english = 0;
    for (var j = 0; j < list.length; j++) {
      if (/^en/i.test(String(list[j].lang || ''))) english++;
      var m = marks(list[j]); if (m > best) { best = m; win = list[j]; }
    }
    // 'none' = the device named no English voice at all; 'men' = it has English voices, but only men's or funny ones
    return { voice: win, kind: win ? kindOf(win) : english ? 'men' : 'none' };
  }
  var listed = false;                     // has the browser given its list of voices yet? (it comes a moment after the page)
  function pickVoice() {
    if (!synth) return;
    var vs = [];
    try { vs = synth.getVoices() || []; } catch (e) { vs = []; }
    listed = vs.length > 0;
    var c = choose(vs);
    voice = c.voice; voiceKind = c.kind;
    showVoice();
  }
  var PHONE = /iphone|ipad|ipod|android/i.test(navigator.userAgent || '');
  function who() { return voice ? voice.name : (synth && !listed && PHONE) ? 'the phone’s own English voice' : 'none'; }
  /* The start screen says in small letters which voice this device uses. A phone that names its voices only by
     language (Android) cannot tell the game whether the voice is a woman's: then the line says how to change it. */
  function showVoice() {
    var line = document.getElementById('voiceline');
    if (!line) {                                   // a page made before this line existed: add it under the start screen
      var panel = startEl && startEl.querySelector ? startEl.querySelector('.panel') : null;
      if (!panel) return;
      line = document.createElement('p'); line.className = 'credit'; line.id = 'voiceline';
      panel.appendChild(line);
    }
    line.textContent = 'Voice on this device: ' + who() + '.' +
      (voiceKind === 'unknown' ? ' If it sounds like a man, choose a woman’s voice in the phone’s Settings (search there for “Text-to-speech”).' : '');
  }
  /* The copy on the school's own Wi-Fi notes on the school computer which voice a device uses, so that a wrong
     voice can be found (the page sets AV_DIAG; the copies on the internet do not have it and tell nothing). */
  var told = false;
  function tell() {
    if (told || !window.AV_DIAG) return;
    told = true;
    try {
      var vs = [], names = [];
      try { vs = synth ? synth.getVoices() || [] : []; } catch (e) { vs = []; }
      for (var i = 0; i < vs.length && names.length < 14; i++) { if (/^en/i.test(String(vs[i].lang || ''))) names.push(vs[i].name + '/' + vs[i].lang); }
      new Image().src = window.AV_DIAG + '?g=' + G.no + '&v=' + encodeURIComponent(who()) + '&k=' + encodeURIComponent(voiceKind) + '&n=' + vs.length +
        '&en=' + encodeURIComponent(names.join(', ').slice(0, 400)) + '&ua=' + encodeURIComponent(String(navigator.userAgent || '').slice(0, 180));
    } catch (e) { /* only a note */ }
  }
  if (synth) { pickVoice(); try { synth.addEventListener('voiceschanged', pickVoice); } catch (e) { /* older browsers */ } } else { showVoice(); }
  var said = [];                          // for the tests: what was said, and by whom
  function speak(text) {
    var how;
    try {
      var u = new SpeechSynthesisUtterance(text);
      if (voice) { u.voice = voice; u.lang = voice.lang; how = voice.name; }
      else if (!listed && PHONE) { u.lang = 'en-US'; how = 'the phone\'s own English voice'; }   // a phone that names no voices: its own English voice (Samantha on an iPhone)
      else { said.push({ text: text, by: 'nobody (' + (voiceKind === 'men' ? 'only men\'s voices here' : 'no voice here') + ')' }); return; }
      u.rate = 0.88; u.pitch = 1.25;      // gentle and a little bright
      synth.speak(u);
      said.push({ text: text, by: how });
    } catch (e) { /* speech is a bonus */ }
  }
  function say(text) {
    if (!synth || !text || document.hidden) return;
    var n = ++sayN, tries = 0;
    clearTimeout(sayT);
    try { synth.cancel(); } catch (e) { return; }
    // The list of voices can come a moment after the page. Wait for it (up to about a second) rather than
    // let the device's first voice speak, which is a man's on an iPhone or a Mac.
    (function go() {
      sayT = setTimeout(function () {
        if (n !== sayN) return;
        if (!listed) pickVoice();
        if (!listed && ++tries < 12) { go(); return; }
        speak(text);
      }, tries ? 100 : 70);
    })();
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
            b.classList.add('yes'); sfx('good'); sparks(b); step(); say(a.yes || 'Yes! ' + cap(p.w) + '.');
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
          fill: function (it) { el('span', 'mini', tray).appendChild(pic(it.p)); say(cap(b.w) + '!'); }
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
        n.appendChild(pic(q));
        cur = { node: n, bin: q.bin, p: q };
        draggable(cur, function () { say(cap(q.w) + '.'); });
        ask(sc.say, cap(q.w) + '. ' + sc.say);
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
          say(G.count ? cap(NUM[n] || String(n)) + '.' : cap(it.p.w) + '.');
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
      roundMiss = function (it) { say('Not the ' + it.p.w + '.'); };
      ask(G.say);
      firstHint(hint);
      armIdle(function () { say(lastSay); hint(); });
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
        rounds.push(placeRound(set.map(function (p) { return { p: p, outline: true, key: p.w, line: cap(p.w) + '.' }; }),
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
    }
  }
  function next() {
    if (ri >= rounds.length) { finish(); return; }
    rounds[ri++](next);
  }
  function begin() { unlock(); build(); ri = 0; show(gameEl); drawDots(); next(); setTimeout(tell, 1800); }
  function finish() { stopIdle(); stopHand(); show(endEl); sfx('win'); say('Well done!'); }
  $('go').addEventListener('click', begin);
  $('replay').addEventListener('click', begin);
  document.addEventListener('contextmenu', function (ev) { ev.preventDefault(); });
  function hush() { sayN++; clearTimeout(sayT); try { if (synth) synth.cancel(); } catch (e) { /* nothing to stop */ } }
  window.addEventListener('pagehide', hush);
  document.addEventListener('visibilitychange', function () {      // the game is silent when its page is not in front
    if (document.hidden) { hush(); clearTimeout(idleT); stopHand(); } else { resetIdle(); }
  });
  window.AVGAME = { begin: begin, state: function () { return { got: got, total: total, round: ri, rounds: rounds.length, ended: endEl.classList.contains('on') }; },
    // for the tests: which voice speaks here, and which one would be chosen from a given list of voices
    voice: function () { return { name: voice ? voice.name : '', lang: voice ? voice.lang : '', kind: voiceKind }; },
    bestOf: function (list) { var c = choose(list); return c.voice ? c.voice.name : c.kind === 'men' ? '(silent: only men\'s voices)' : '(none named)'; },
    said: function () { return said.slice(); } };
})();
