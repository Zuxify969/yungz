(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const toast = m => { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('show'), 2000); };
  $('#yr').textContent = new Date().getFullYear();

  // Loading screen: 5 detik, hanya sekali per sesi (sessionStorage)
  const loader = $('#loader'), root = document.documentElement;
  if (!root.classList.contains('fresh')) {
    document.body.classList.remove('loading'); loader.remove();
  } else {
    const DUR = 5000, CIRC = 339.3, t0 = performance.now();
    const arc = $('#lArc'), pct = $('#lPct'), st = $('#lStatus');
    const msgs = ['Menyiapkan tampilan', 'Memuat aset', 'Merapikan detail', 'Hampir selesai'];
    let loaded = document.readyState === 'complete', ended = false;
    if (!loaded) addEventListener('load', () => { loaded = true; }, { once: true });
    const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    const end = () => {
      if (ended) return; ended = true;
      arc.style.strokeDashoffset = 0; pct.textContent = '100%'; st.textContent = 'Selesai';
      try { sessionStorage.setItem('yz_seen', '1'); } catch (e) {}
      setTimeout(() => {
        loader.classList.add('hide'); document.body.classList.remove('loading');
        setTimeout(() => document.dispatchEvent(new Event('yz:reveal')), 350);   // kartu mulai jatuh
        setTimeout(() => { loader.remove(); root.classList.remove('fresh'); }, 1500);
      }, 250);
    };
    (function frame(now) {
      if (ended) return;
      const t = Math.min((now - t0) / DUR, 1);
      let p = ease(t); if (!loaded) p = Math.min(p, .96);
      arc.style.strokeDashoffset = (CIRC * (1 - p)).toFixed(1);
      pct.textContent = Math.round(p * 100) + '%';
      st.textContent = msgs[Math.min(3, Math.floor(p * 4))];
      if (t >= 1 && loaded) return end();
      requestAnimationFrame(frame);
    })(t0);
    setTimeout(end, 12000);   // pengaman kalau halaman sangat lambat
  }

  // Typewriter
  const roles = ['Web Developer', 'UI Designer', 'Kreator Digital'];
  let ri = 0, ci = 0, del = false;
  (function type() {
    const w = roles[ri];
    $('#typed').innerHTML = '<b>' + w.slice(0, ci) + '</b>';
    if (!del && ci < w.length) { ci++; setTimeout(type, 90); }
    else if (!del) { del = true; setTimeout(type, 1300); }
    else if (ci > 0) { ci--; setTimeout(type, 45); }
    else { del = false; ri = (ri + 1) % roles.length; setTimeout(type, 250); }
  })();

  // Scroll reveal + skill bars
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in'); io.unobserve(e.target);
    const b = $('.bar', e.target); if (b) setTimeout(() => $('i', b).style.width = b.dataset.w + '%', 200);
  }), { threshold: .15 });
  $$('.reveal').forEach((el, i) => { el.style.transitionDelay = (i % 3) * 80 + 'ms'; io.observe(el); });

  // 1 tab navbar = 1 halaman
  const pages = $$('section.page');
  const pageIds = pages.map(p => p.id);
  const navLinks = $$('nav a:not(.logo), .bottom-nav a');
  function showPage() {
    let id = location.hash.slice(1);
    if (!pageIds.includes(id)) id = 'home';
    pages.forEach(p => p.classList.toggle('active', p.id === id));
    navLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + id));
    scrollTo(0, 0);
  }
  addEventListener('hashchange', showPage);
  showPage();

  // ID card tergantung: tali & kartu dengan fisika (verlet). Tali bisa kendur, melipat, lalu menegang.
  // Saat sesi baru: tali + kartu dilempar dari atas layar, jatuh, tertahan, lalu mengayun.
  (() => {
    const stage = $('#badgeStage'); if (!stage) return;
    const badge = $('#badge'), hint = $('#badgeHint'), paths = $$('.strap path', stage);
    const root2 = document.documentElement;
    const W = 184, H = 268, HOLE = 20, L = H / 2 - HOLE, REST_Y = 114;   // titik gantung kartu saat diam
    const reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;
    const mk = (x, y, w) => ({ x, y, px: x, py: y, w });
    let pts = [], A, B, N = 7, AY = -56, LR = 170, SEG = 24, G = .9, layoutTop = -1;
    let drag = null, running = false, last = 0, acc = 0, rest = 0, minX = -1e4, maxX = 1e4, free = false, soft = 0, dropping = false;
    badge.style.transformOrigin = '0 0';
    const absTop = el => { let t = 0; for (; el; el = el.offsetParent) t += el.offsetTop; return t; };

    // tali selalu berasal dari atas layar (ujung atasnya tidak pernah kelihatan), apa pun tinggi layarnya
    function layout(top) {
      layoutTop = top;
      AY = Math.min(-56, -top - 40);
      LR = REST_Y - AY; N = Math.max(7, Math.round(LR / 24)); SEG = LR / N; G = .9 * (LR + L) / 284;
      pts = Array.from({ length: N + 1 }, (_, i) => mk(0, AY + i * SEG, i ? 1 : 0));
      A = pts[N]; B = mk(0, A.y + L, .45); free = false; soft = 0;
    }
    const visible = () => stage.offsetWidth > 0;
    layout(visible() ? absTop(stage) : 28);

    // tali: hanya menarik saat meregang (boleh kendur & melipat). Batang kartu: panjang tetap.
    const link = (a, b, len, k) => {
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
      if (d <= len) return;
      const ws = a.w + b.w; if (!ws) return;
      const f = (d - len) / d * k;
      a.x += dx * f * a.w / ws; a.y += dy * f * a.w / ws; b.x -= dx * f * b.w / ws; b.y -= dy * f * b.w / ws;
    };
    const rod = (a, b, len) => {
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1e-4, ws = a.w + b.w;
      if (!ws) return;
      const f = (d - len) / d;
      a.x += dx * f * a.w / ws; a.y += dy * f * a.w / ws; b.x -= dx * f * b.w / ws; b.y -= dy * f * b.w / ws;
    };
    function step() {
      for (let i = free ? 0 : 1; i <= N; i++) {
        const p = pts[i], vx = (p.x - p.px) * .994, vy = (p.y - p.py) * .994;
        p.px = p.x; p.py = p.y; p.x += vx; p.y += vy + G;
      }
      if (drag) {
        let tx = drag.tx, ty = drag.ty;
        const dx = tx, dy = ty - AY, d = Math.hypot(dx, dy), reach = (LR + L) * .92;
        if (d > reach) { tx = dx / d * reach; ty = AY + dy / d * reach; }
        B.px = B.x; B.py = B.y; B.x += (tx - B.x) * .55; B.y += (ty - B.y) * .55;
      } else {
        let vx = (B.x - B.px) * .99, vy = (B.y - B.py) * .99;
        const sp = Math.hypot(vx, vy); if (sp > 60) { vx *= 60 / sp; vy *= 60 / sp; }
        B.px = B.x; B.py = B.y; B.x += vx; B.y += vy + G;
      }
      const kk = soft > 0 ? .55 : 1;                 // sesaat setelah tertahan: tali sedikit elastis
      for (let it = 0; it < 14; it++) { for (let i = 0; i < N; i++) link(pts[i], pts[i + 1], SEG, kk); rod(A, B, L); }
      for (const p of [A, B]) { if (p.x < minX) { p.x = minX; p.px = p.x; } else if (p.x > maxX) { p.x = maxX; p.px = p.x; } }
      if (free && pts[0].y >= AY) {                  // ujung atas tali tertangkap di gantungan
        const p0 = pts[0]; p0.x = 0; p0.y = AY; p0.px = 0; p0.py = AY; p0.w = 0; free = false; soft = 100;
      }
      if (!free && soft <= 0) {                      // kunci panjang: tali tidak bisa melar / putus
        for (let i = 1; i <= N; i++) {
          const a = pts[i - 1], p = pts[i], dx = p.x - a.x, dy = p.y - a.y, d = Math.hypot(dx, dy);
          if (d > SEG) { p.x = a.x + dx / d * SEG; p.y = a.y + dy / d * SEG; }
        }
      }
      { const dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy) || 1e-4; B.x = A.x + dx / d * L; B.y = A.y + dy / d * L; }
      let e = Math.abs(B.x - B.px) + Math.abs(B.y - B.py);
      for (const p of pts) e += Math.abs(p.x - p.px) + Math.abs(p.y - p.py);
      rest = e < .03 ? rest + 1 : 0;
      if (soft > 0) soft--;
      if (dropping && !free && soft <= 0) { dropping = false; stage.classList.remove('dropping'); }
    }
    const f1 = n => n.toFixed(1);
    function render() {
      const th = Math.atan2(-(B.x - A.x), B.y - A.y), c = Math.cos(th), s = Math.sin(th);
      const ex = A.x - c * W / 2 + s * HOLE, ey = A.y - s * W / 2 - c * HOLE;   // pivot = lubang kartu
      badge.style.transform = `matrix(${c.toFixed(5)},${s.toFixed(5)},${(-s).toFixed(5)},${c.toFixed(5)},${ex.toFixed(2)},${ey.toFixed(2)})`;
      let d = `M${f1(pts[0].x)} ${f1(pts[0].y)}`;
      for (let i = 1; i < N; i++) { const p = pts[i], q = pts[i + 1]; d += `Q${f1(p.x)} ${f1(p.y)} ${f1((p.x + q.x) / 2)} ${f1((p.y + q.y) / 2)}`; }
      d += `L${f1(A.x)} ${f1(A.y)}`;
      for (const p of paths) p.setAttribute('d', d);
    }
    function loop(t) {
      if (!visible() || document.hidden) { running = false; return; }
      const r = stage.getBoundingClientRect(), c = r.left + r.width / 2;
      minX = -c + W / 2 + 4; maxX = innerWidth - c - W / 2 - 4;
      acc += Math.max(0, Math.min(t - last, 50)); last = t;
      while (acc >= 16.667) { step(); acc -= 16.667; }
      render();
      if (rest > 60 && !drag && !free && !dropping) { running = false; return; }
      requestAnimationFrame(loop);
    }
    function wake() {
      if (running) return;
      if (!drag && !free && !dropping && visible() && Math.abs(absTop(stage) - layoutTop) > 4) { layout(absTop(stage)); render(); }
      running = true; last = performance.now(); acc = 0; rest = 0; requestAnimationFrame(loop);
    }
    const nudge = v => { B.px = B.x - v; A.px = A.x - v * .4; wake(); };
    const toWorld = e => { const r = stage.getBoundingClientRect(); return { x: e.clientX - r.left - r.width / 2, y: e.clientY - r.top }; };
    const glare = e => {
      const r = badge.getBoundingClientRect();
      badge.style.setProperty('--gx', ((e.clientX - r.left) / r.width * 100).toFixed(0) + '%');
      badge.style.setProperty('--gy', ((e.clientY - r.top) / r.height * 100).toFixed(0) + '%');
    };

    badge.addEventListener('pointerdown', e => {
      if (e.button > 0 || dropping) return;
      badge.setPointerCapture(e.pointerId);
      const p = toWorld(e);
      drag = { ox: B.x - p.x, oy: B.y - p.y, tx: B.x, ty: B.y, sx: e.clientX, sy: e.clientY, t: performance.now(), moved: false };
      B.w = 0; badge.classList.add('grab', 'lit'); glare(e); hint.classList.add('off'); wake();
    });
    badge.addEventListener('pointermove', e => {
      if (e.pointerType === 'mouse' || drag) glare(e);
      if (!drag) return;
      const p = toWorld(e); drag.tx = p.x + drag.ox; drag.ty = p.y + drag.oy;
      if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 8) drag.moved = true;
    });
    const release = e => {
      if (!drag) return;
      const d = drag; drag = null; B.w = .45; badge.classList.remove('grab', 'lit');
      if (e.type === 'pointerup' && !d.moved && performance.now() - d.t < 350) {
        const r = badge.getBoundingClientRect(), px = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
        nudge(-px * 9 || 6); navigator.vibrate && navigator.vibrate(10);
      }
      wake();
    };
    badge.addEventListener('pointerup', release);
    badge.addEventListener('pointercancel', release);
    badge.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') badge.classList.add('lit'); });
    badge.addEventListener('pointerleave', () => { if (!drag) badge.classList.remove('lit'); });
    badge.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('visibilitychange', () => { if (!document.hidden) wake(); });
    addEventListener('hashchange', () => { if ($('#home').classList.contains('active') && !reduce) nudge(5); });
    let rz = 0;
    addEventListener('resize', () => {
      clearTimeout(rz);
      rz = setTimeout(() => { if (!drag && !free && !dropping && visible()) { layout(absTop(stage)); render(); } }, 200);
    });

    // dilempar dari atas: tali kusut jatuh bebas, ujungnya tertangkap gantungan, kartu tersentak lalu mengayun
    function startDrop() {
      if (!root2.classList.contains('fresh')) return;
      if (reduce || !visible()) { root2.classList.remove('fresh'); return; }
      const top = absTop(stage); layout(top);
      const y0 = -top - 300 - .35 * LR;                       // seluruhnya di atas layar
      for (let i = 0; i <= N; i++) {
        const p = pts[i], x = (i % 2) * .83 * SEG, y = y0 + i * .35 * SEG;
        p.x = x; p.y = y; p.px = x + (i % 2 ? -.7 : .7); p.py = y; p.w = 1;
      }
      A = pts[N]; B.x = A.x + L * Math.sin(.5); B.y = A.y + L * Math.cos(.5); B.px = B.x; B.py = B.y;
      free = true; dropping = true;
      stage.classList.add('dropping'); root2.classList.remove('fresh');
      render(); wake();
    }
    document.addEventListener('yz:reveal', startDrop, { once: true });
    render();
    if (!root2.classList.contains('fresh') && !reduce) setTimeout(() => nudge(4), 500);
  })();

  // Chips toggle
  $$('.chip').forEach(c => c.addEventListener('click', () => c.classList.toggle('on')));

  // Button ripple
  $$('.btn').forEach(b => b.addEventListener('click', e => {
    const r = b.getBoundingClientRect(), s = Math.max(r.width, r.height), el = document.createElement('span');
    el.className = 'ripple';
    el.style.cssText = `width:${s}px;height:${s}px;left:${e.clientX - r.left - s / 2}px;top:${e.clientY - r.top - s / 2}px`;
    b.appendChild(el); setTimeout(() => el.remove(), 600);
  }));

  // Project modal
  const modal = $('#modal'), close = () => modal.classList.remove('open');
  $$('.card').forEach(c => c.addEventListener('click', () => {
    $('#mIco').innerHTML = `<svg class="i"><use href="#i-${c.dataset.ico}"/></svg>`;
    $('#mTitle').textContent = c.dataset.title;
    $('#mDesc').textContent = c.dataset.desc;
    modal.classList.add('open');
  }));
  $('#closeModal').addEventListener('click', close);
  $('#mBtn').addEventListener('click', close);
  modal.addEventListener('click', e => { if (e.target === modal) close(); });
  addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

  // Copy email
  $('#copyMail').addEventListener('click', e => {
    const m = e.currentTarget.dataset.mail;
    (navigator.clipboard ? navigator.clipboard.writeText(m) : Promise.reject()).then(() => toast('Email disalin'), () => toast(m));
  });
})();
