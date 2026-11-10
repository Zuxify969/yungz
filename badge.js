/* ID card tergantung — React (UMD, tanpa build/JSX).
   Tali + kartu digambar dari SATU state fisika dalam SATU render,
   dan panjang tali dikunci tiap frame, jadi tali tidak bisa terlepas dari kartu. */
(() => {
  const mount = document.getElementById('badgeRoot');
  if (!mount || !window.React || !window.ReactDOM) return;
  const { createElement: h, useRef, useState, useEffect, Fragment } = React;

  const W = 184, H = 268, HOLE = 20;          // ukuran kartu & posisi lubang (px, sama dengan CSS)
  const N = 7, AY = -56, LR = 170, SEG = LR / N, L = H / 2 - HOLE, G = .9;
  const reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;

  /* ---------- fisika (verlet) ---------- */
  function createSim() {
    const mk = (x, y, w) => ({ x, y, px: x, py: y, w });
    const pts = Array.from({ length: N + 1 }, (_, i) => mk(0, AY + i * SEG, i ? 1 : 0));
    const A = pts[N], B = mk(0, A.y + L, .45);
    const s = { pts, A, B, drag: null, rest: 0, yaw: 0, yawV: 0 };

    const link = (a, b, len) => {
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1e-4, ws = a.w + b.w;
      if (!ws) return;
      const f = (d - len) / d;
      a.x += dx * f * a.w / ws; a.y += dy * f * a.w / ws;
      b.x -= dx * f * b.w / ws; b.y -= dy * f * b.w / ws;
    };

    s.step = (minX, maxX) => {
      for (let i = 1; i <= N; i++) {
        const p = pts[i], vx = (p.x - p.px) * .994, vy = (p.y - p.py) * .994;
        p.px = p.x; p.py = p.y; p.x += vx; p.y += vy + G;
      }
      if (s.drag) {
        let tx = s.drag.tx, ty = s.drag.ty;
        const dx = tx, dy = ty - AY, d = Math.hypot(dx, dy), reach = (LR + L) * .92;
        if (d > reach) { tx = dx / d * reach; ty = AY + dy / d * reach; }
        B.px = B.x; B.py = B.y;
        B.x += (tx - B.x) * .55; B.y += (ty - B.y) * .55;
      } else {
        let vx = (B.x - B.px) * .99, vy = (B.y - B.py) * .99;
        const sp = Math.hypot(vx, vy); if (sp > 40) { vx *= 40 / sp; vy *= 40 / sp; }
        B.px = B.x; B.py = B.y; B.x += vx; B.y += vy + G;
      }
      for (let k = 0; k < 24; k++) {
        for (let i = 0; i < N; i++) link(pts[i], pts[i + 1], SEG);
        link(A, B, L);
      }
      for (const p of [A, B]) {
        if (p.x < minX) { p.x = minX; p.px = p.x; } else if (p.x > maxX) { p.x = maxX; p.px = p.x; }
      }
      // KUNCI PANJANG: tali & kartu selalu persis tersambung, tidak bisa melar / putus
      for (let i = 1; i <= N; i++) {
        const a = pts[i - 1], p = pts[i], dx = p.x - a.x, dy = p.y - a.y, d = Math.hypot(dx, dy) || 1e-4;
        p.x = a.x + dx / d * SEG; p.y = a.y + dy / d * SEG;
      }
      { const dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy) || 1e-4; B.x = A.x + dx / d * L; B.y = A.y + dy / d * L; }

      let e = 0; for (const p of pts) e += Math.abs(p.x - p.px) + Math.abs(p.y - p.py);
      e += Math.abs(B.x - B.px) + Math.abs(B.y - B.py);
      s.rest = e < .03 && Math.abs(s.yaw) < .05 ? s.rest + 1 : 0;
      const target = Math.max(-24, Math.min(24, (B.x - B.px) * 3));
      s.yawV += (target - s.yaw) * .12; s.yawV *= .82; s.yaw += s.yawV;
    };
    s.nudge = v => { B.px = B.x - v; A.px = A.x - v * .4; };
    return s;
  }

  /* ---------- komponen ---------- */
  const f1 = n => n.toFixed(1);

  function Strap({ pts }) {
    const A = pts[N];
    let d = `M${f1(pts[0].x)} ${f1(pts[0].y)}`;
    for (let i = 1; i < N; i++) {
      const p = pts[i], q = pts[i + 1];
      d += `Q${f1(p.x)} ${f1(p.y)} ${f1((p.x + q.x) / 2)} ${f1((p.y + q.y) / 2)}`;
    }
    d += `L${f1(A.x)} ${f1(A.y)}`;
    return h('svg', { className: 'strap', width: 1, height: 1, 'aria-hidden': true },
      h('defs', null,
        h('linearGradient', { id: 'strapG', gradientUnits: 'userSpaceOnUse', x1: 0, y1: -56, x2: 0, y2: 130 },
          h('stop', { offset: 0, stopColor: '#7c5cff' }),
          h('stop', { offset: 1, stopColor: '#00e0ff' }))),
      h('path', { className: 's-edge', d }),
      h('path', { className: 's-body', d }),
      h('path', { className: 's-stripe', d }));
  }

  function Photo() {
    return h('div', { className: 'b-photo' },
      h('span', null, 'Y'),
      h('img', { src: 'profil.jpeg', alt: 'Foto profil Yungz', draggable: false, onError: e => { e.currentTarget.style.display = 'none'; } }));
  }

  function Lanyard() {
    const sim = useRef(null); if (!sim.current) sim.current = createSim();
    const s = sim.current;
    const stageRef = useRef(null), wakeRef = useRef(() => {}), tap = useRef(0);
    const [, setTick] = useState(0);
    const [flipped, setFlipped] = useState(false), [grab, setGrab] = useState(false);
    const [lit, setLit] = useState(false), [hintOff, setHintOff] = useState(false);
    const [gl, setGl] = useState({ x: 30, y: 20 });

    useEffect(() => {
      let raf = 0, running = false, last = 0, acc = 0, timer = 0;
      const frame = t => {
        const st = stageRef.current;
        if (!st || !st.offsetWidth) { running = false; return; }   // halaman lain aktif
        const r = st.getBoundingClientRect(), c = r.left + r.width / 2;
        const minX = -c + W / 2 + 4, maxX = innerWidth - c - W / 2 - 4;
        acc += Math.max(0, Math.min(t - last, 50)); last = t;
        while (acc >= 16.667) { s.step(minX, maxX); acc -= 16.667; }
        setTick(n => n + 1);
        if (s.rest > 60 && !s.drag) { running = false; return; }
        raf = requestAnimationFrame(frame);
      };
      const wake = () => { if (running) return; running = true; last = performance.now(); acc = 0; s.rest = 0; raf = requestAnimationFrame(frame); };
      wakeRef.current = wake;
      const onHash = () => { const home = document.getElementById('home'); if (home && home.classList.contains('active') && !reduce) { s.nudge(5); wake(); } };
      addEventListener('hashchange', onHash);
      if (!reduce) timer = setTimeout(() => { s.nudge(7); wake(); }, 3300);
      return () => { cancelAnimationFrame(raf); clearTimeout(timer); removeEventListener('hashchange', onHash); };
    }, []);

    const world = e => { const r = stageRef.current.getBoundingClientRect(); return { x: e.clientX - r.left - r.width / 2, y: e.clientY - r.top }; };
    const glare = e => {
      const r = e.currentTarget.getBoundingClientRect();
      setGl({ x: Math.round((e.clientX - r.left) / r.width * 100), y: Math.round((e.clientY - r.top) / r.height * 100) });
    };
    const doFlip = () => { setFlipped(f => !f); navigator.vibrate && navigator.vibrate(14); s.nudge(3); wakeRef.current(); };

    const onDown = e => {
      if (e.button > 0) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      const p = world(e);
      s.drag = { ox: s.B.x - p.x, oy: s.B.y - p.y, tx: s.B.x, ty: s.B.y, sx: e.clientX, sy: e.clientY, t: performance.now(), moved: false };
      s.B.w = 0; setGrab(true); setLit(true); glare(e); setHintOff(true); wakeRef.current();
    };
    const onMove = e => {
      glare(e);
      const d = s.drag; if (!d) return;
      const p = world(e);
      d.tx = p.x + d.ox; d.ty = p.y + d.oy;
      if (Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 8) d.moved = true;
    };
    const onUp = e => {
      const d = s.drag; if (!d) return;
      s.drag = null; s.B.w = .45; setGrab(false);
      if (e.type === 'pointerup' && !d.moved && performance.now() - d.t < 350) {
        const r = e.currentTarget.getBoundingClientRect(), px = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
        s.nudge(-px * 9 || 6); s.yawV += -px * 3;
        navigator.vibrate && navigator.vibrate(10);
        const now = performance.now();
        if (now - tap.current < 350) { tap.current = 0; doFlip(); } else tap.current = now;
      }
      wakeRef.current();
    };

    // posisi kartu: satu matriks dari titik A (ujung tali) & arah A→B, pivot = lubang kartu
    const { A, B } = s;
    const th = Math.atan2(-(B.x - A.x), B.y - A.y), c = Math.cos(th), sn = Math.sin(th);
    const ex = A.x - c * W / 2 + sn * HOLE, ey = A.y - sn * W / 2 - c * HOLE;
    const badgeStyle = {
      transform: `matrix(${c.toFixed(5)},${sn.toFixed(5)},${(-sn).toFixed(5)},${c.toFixed(5)},${ex.toFixed(2)},${ey.toFixed(2)})`,
      transformOrigin: '0 0',
      '--sh': (50 + th * 57.3 * 3 + s.yaw * 2).toFixed(1) + '%',
      '--gx': gl.x + '%', '--gy': gl.y + '%'
    };
    const faceFx = [h('span', { className: 'sheen', key: 's' }), h('span', { className: 'glare', key: 'g' })];

    return h(Fragment, null,
      h('div', { className: 'badge-stage', id: 'badgeStage', ref: stageRef },
        h(Strap, { pts: s.pts }),
        h('div', {
          className: 'badge' + (grab ? ' grab' : '') + (lit ? ' lit' : ''), id: 'badge', role: 'button', tabIndex: 0, style: badgeStyle,
          'aria-label': 'ID card Yungz. Tarik untuk mengayun, tekan Enter untuk membalik kartu',
          onPointerDown: onDown, onPointerMove: onMove, onPointerUp: onUp, onPointerCancel: onUp,
          onPointerEnter: e => { if (e.pointerType === 'mouse') setLit(true); },
          onPointerLeave: () => { if (!s.drag) setLit(false); },
          onContextMenu: e => e.preventDefault(),
          onKeyDown: e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); doFlip(); setHintOff(true); } }
        },
          h('div', { className: 'yaw', style: { transform: `rotateY(${s.yaw.toFixed(2)}deg)` } },
            h('div', { className: 'flip', style: { transform: `rotateY(${flipped ? 180 : 0}deg)` } },
              h('div', { className: 'face front' },
                h('span', { className: 'slot' }),
                h(Photo),
                h('div', { className: 'b-name grad' }, 'YUNGZ'),
                h('div', { className: 'b-code sm' }),
                ...faceFx),
              h('div', { className: 'face back' },
                h('span', { className: 'slot' }),
                h('div', { className: 'b-wd grad' }, 'Web Developer'),
                h('div', { className: 'b-code' }),
                ...faceFx.map(x => h(x.type, { className: x.props.className, key: x.key + 'b' }))))),
          h('div', { className: 'clip', 'aria-hidden': true }))),
      h('p', { className: 'badge-hint' + (hintOff ? ' off' : '') }, 'Tarik, ketuk, atau ketuk 2× untuk membalik kartu'));
  }

  ReactDOM.createRoot(mount).render(h(Lanyard));
})();
