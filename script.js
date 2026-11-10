(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const toast = m => { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('show'), 2000); };
  $('#yr').textContent = new Date().getFullYear();

  // Loading screen
  const loader = $('#loader'), t0 = performance.now();
  const hideLoader = () => setTimeout(() => {
    loader.classList.add('hide'); document.body.classList.remove('loading');
    setTimeout(() => loader.remove(), 600);
  }, Math.max(0, 3000 - (performance.now() - t0)));
  document.readyState === 'complete' ? hideLoader() : addEventListener('load', hideLoader, { once: true });

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

  // ID card tergantung: tali + kartu dengan fisika (verlet). Tarik, ketuk, ketuk 2x = balik
  (() => {
    const stage = $('#badgeStage'); if (!stage) return;
    const badge = $('#badge'), yawEl = $('#badgeYaw'), flipEl = $('#badgeFlip'), hint = $('#badgeHint');
    const paths = $$('.strap path', stage);
    const cs = getComputedStyle(badge);
    const W = parseFloat(cs.getPropertyValue('--w')) || 184;
    const H = parseFloat(cs.getPropertyValue('--h')) || 268;
    const HOLE = parseFloat(cs.getPropertyValue('--hole')) || 20;
    const N = 7, AY = -56, LR = 170, SEG = LR / N, L = H / 2 - HOLE, G = .9;
    const reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;
    const mk = (x, y, w) => ({ x, y, px: x, py: y, w });
    const pts = Array.from({ length: N + 1 }, (_, i) => mk(0, AY + i * SEG, i ? 1 : 0));
    const A = pts[N], B = mk(0, A.y + L, .45);
    let drag = null, running = false, last = 0, acc = 0, rest = 0;
    let yaw = 0, yawV = 0, flipped = false, lastTap = 0, minX = -1e4, maxX = 1e4;

    function link(a, b, len) {
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1e-4, ws = a.w + b.w;
      if (!ws) return;
      const f = (d - len) / d;
      a.x += dx * f * a.w / ws; a.y += dy * f * a.w / ws;
      b.x -= dx * f * b.w / ws; b.y -= dy * f * b.w / ws;
    }
    function step() {
      for (let i = 1; i <= N; i++) {
        const p = pts[i], vx = (p.x - p.px) * .994, vy = (p.y - p.py) * .994;
        p.px = p.x; p.py = p.y; p.x += vx; p.y += vy + G;
      }
      if (drag) {
        let tx = drag.tx, ty = drag.ty;
        const dx = tx, dy = ty - AY, d = Math.hypot(dx, dy), reach = (LR + L) * .92;
        if (d > reach) { tx = dx / d * reach; ty = AY + dy / d * reach; }
        B.px = B.x; B.py = B.y;
        B.x += (tx - B.x) * .55; B.y += (ty - B.y) * .55;
      } else {
        let vx = (B.x - B.px) * .99, vy = (B.y - B.py) * .99;
        const s = Math.hypot(vx, vy); if (s > 40) { vx *= 40 / s; vy *= 40 / s; }
        B.px = B.x; B.py = B.y; B.x += vx; B.y += vy + G;
      }
      for (let k = 0; k < 24; k++) {
        for (let i = 0; i < N; i++) link(pts[i], pts[i + 1], SEG);
        link(A, B, L);
      }
      for (const p of [A, B]) {
        if (p.x < minX) { p.x = minX; p.px = p.x; } else if (p.x > maxX) { p.x = maxX; p.px = p.x; }
      }
      // kunci panjang tali & kartu secara pasti (anti putus / melar)
      for (let i = 1; i <= N; i++) {
        const a = pts[i - 1], p = pts[i], dx = p.x - a.x, dy = p.y - a.y, d = Math.hypot(dx, dy) || 1e-4;
        p.x = a.x + dx / d * SEG; p.y = a.y + dy / d * SEG;
      }
      { const dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy) || 1e-4; B.x = A.x + dx / d * L; B.y = A.y + dy / d * L; }
      let e = 0; for (const p of pts) e += Math.abs(p.x - p.px) + Math.abs(p.y - p.py);
      e += Math.abs(B.x - B.px) + Math.abs(B.y - B.py);
      rest = e < .03 && Math.abs(yaw) < .05 ? rest + 1 : 0;
      // goyangan 3D (yaw) mengikuti kecepatan, pegas
      const target = Math.max(-24, Math.min(24, (B.x - B.px) * 3));
      yawV += (target - yaw) * .12; yawV *= .82; yaw += yawV;
    }
    function render() {
      const th = Math.atan2(-(B.x - A.x), B.y - A.y);
      badge.style.transform = `translate(${A.x.toFixed(2)}px,${A.y.toFixed(2)}px) rotate(${th.toFixed(4)}rad) translate(${-W / 2}px,${-HOLE}px)`;
      yawEl.style.transform = `rotateY(${yaw.toFixed(2)}deg)`;
      badge.style.setProperty('--sh', (50 + th * 57.3 * 3 + yaw * 2).toFixed(1) + '%');
      let d = `M${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
      for (let i = 1; i < N; i++) {
        const p = pts[i], q = pts[i + 1];
        d += `Q${p.x.toFixed(1)} ${p.y.toFixed(1)} ${((p.x + q.x) / 2).toFixed(1)} ${((p.y + q.y) / 2).toFixed(1)}`;
      }
      d += `L${A.x.toFixed(1)} ${A.y.toFixed(1)}`;
      paths.forEach(p => p.setAttribute('d', d));
    }
    function loop(t) {
      if (!stage.offsetWidth) { running = false; return; }   // halaman lain aktif
      const r = stage.getBoundingClientRect(), c = r.left + r.width / 2;
      minX = -c + W / 2 + 4; maxX = innerWidth - c - W / 2 - 4;
      acc += Math.max(0, Math.min(t - last, 50)); last = t;
      while (acc >= 16.667) { step(); acc -= 16.667; }
      render();
      if (rest > 60 && !drag) { running = false; return; }
      requestAnimationFrame(loop);
    }
    function wake() { if (running) return; running = true; last = performance.now(); acc = 0; rest = 0; requestAnimationFrame(loop); }
    function nudge(v) { B.px = B.x - v; A.px = A.x - v * .4; wake(); }
    function doFlip() {
      flipped = !flipped; flipEl.style.transform = `rotateY(${flipped ? 180 : 0}deg)`;
      navigator.vibrate && navigator.vibrate(14); nudge(3);
    }
    const toWorld = e => { const r = stage.getBoundingClientRect(); return { x: e.clientX - r.left - r.width / 2, y: e.clientY - r.top }; };
    const glare = e => {
      const r = badge.getBoundingClientRect();
      badge.style.setProperty('--gx', ((e.clientX - r.left) / r.width * 100).toFixed(0) + '%');
      badge.style.setProperty('--gy', ((e.clientY - r.top) / r.height * 100).toFixed(0) + '%');
    };

    badge.addEventListener('pointerdown', e => {
      if (e.button > 0) return;
      badge.setPointerCapture(e.pointerId);
      const p = toWorld(e);
      drag = { ox: B.x - p.x, oy: B.y - p.y, tx: B.x, ty: B.y, sx: e.clientX, sy: e.clientY, t: performance.now(), moved: false };
      B.w = 0; badge.classList.add('grab', 'lit'); glare(e);
      hint.classList.add('off'); wake();
    });
    badge.addEventListener('pointermove', e => {
      glare(e);
      if (!drag) return;
      const p = toWorld(e);
      drag.tx = p.x + drag.ox; drag.ty = p.y + drag.oy;
      if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 8) drag.moved = true;
    });
    const release = e => {
      if (!drag) return;
      const d = drag; drag = null; B.w = .45; badge.classList.remove('grab');
      if (e.type === 'pointerup' && !d.moved && performance.now() - d.t < 350) {
        // ketukan = colek kartu, arah ayunan tergantung titik sentuh
        const r = badge.getBoundingClientRect(), px = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
        nudge(-px * 9 || 6); yawV += -px * 3;
        navigator.vibrate && navigator.vibrate(10);
        const now = performance.now();
        if (now - lastTap < 350) { lastTap = 0; doFlip(); } else lastTap = now;
      }
      wake();
    };
    badge.addEventListener('pointerup', release);
    badge.addEventListener('pointercancel', release);
    badge.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') badge.classList.add('lit'); });
    badge.addEventListener('pointerleave', () => { if (!drag) badge.classList.remove('lit'); });
    badge.addEventListener('lostpointercapture', () => { if (!drag) badge.classList.remove('lit'); });
    badge.addEventListener('contextmenu', e => e.preventDefault());
    badge.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); doFlip(); hint.classList.add('off'); }
    });

    // ayunan kecil saat kembali ke Beranda & setelah loading selesai
    addEventListener('hashchange', () => { if ($('#home').classList.contains('active') && !reduce) nudge(5); });
    render();
    if (!reduce) setTimeout(() => nudge(7), 3300);
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
