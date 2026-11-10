(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const toast = m => { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('show'), 2000); };
  $('#yr').textContent = new Date().getFullYear();

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

  // Foto profil: berputar saat diklik
  const pf = $('#profile');
  pf.addEventListener('click', () => { pf.classList.remove('spin'); void pf.offsetWidth; pf.classList.add('spin'); });

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
