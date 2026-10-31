/* Celestial — site interactions.
   One passive scroll listener feeds a single rAF loop; reveals use IntersectionObserver
   and run once, so content never resets or flickers when scrolling back. */
(() => {
  'use strict';

  const root = document.documentElement;
  root.classList.add('js');
  window.__celestialReady = true;

  const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
  const smallMQ = matchMedia('(max-width: 900px)');
  const reduce = () => reduceMQ.matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  // Seeded PRNG so the starfield and galaxy look identical on every load.
  const rng = (seed) => () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  /* ---------- Starfield (drawn once, redrawn only on width change) ---------- */
  function initStarfield() {
    const canvas = document.querySelector('.starfield');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let lastW = 0;

    const draw = () => {
      const w = window.innerWidth;
      const h = Math.max(window.innerHeight, screen.height || 0);
      if (Math.abs(w - lastW) < 40 && lastW) return;
      lastW = w;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const rand = rng(7);
      const count = Math.round((w * h) / 2600);
      for (let i = 0; i < count; i++) {
        const r = rand() < 0.92 ? rand() * 0.8 + 0.2 : rand() * 1.1 + 0.9;
        const hue = rand() < 0.2 ? '201,191,247' : rand() < 0.1 ? '103,227,242' : '255,255,255';
        ctx.fillStyle = `rgba(${hue},${(rand() * 0.6 + 0.25).toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(rand() * w, rand() * h, r, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    draw();
    let t;
    window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(draw, 200); });
  }

  /* ---------- Spiral galaxy (procedural, rendered once; CSS rotates it) ---------- */
  function initGalaxy() {
    const canvas = document.querySelector('[data-galaxy] canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const S = canvas.width;
    const c = S / 2;
    const R = S * 0.46;
    const rand = rng(2026);
    const gauss = () => (rand() + rand() + rand() - 1.5) / 1.5;

    ctx.globalCompositeOperation = 'lighter';

    // Soft core glow
    const core = ctx.createRadialGradient(c, c, 0, c, c, R * 0.42);
    core.addColorStop(0, 'rgba(255,240,215,0.95)');
    core.addColorStop(0.18, 'rgba(230,195,150,0.45)');
    core.addColorStop(0.5, 'rgba(118,85,214,0.16)');
    core.addColorStop(1, 'rgba(60,63,168,0)');
    ctx.fillStyle = core;
    ctx.fillRect(0, 0, S, S);

    const arms = 2;
    const twist = 3.4;

    // Nebulous dust clouds along the arms
    for (let i = 0; i < 160; i++) {
      const t = Math.pow(rand(), 0.8);
      const arm = i % arms;
      const a = arm * (Math.PI * 2 / arms) + t * twist + gauss() * 0.25;
      const r = t * R;
      const x = c + Math.cos(a) * r, y = c + Math.sin(a) * r;
      const size = 18 + rand() * 46;
      const g = ctx.createRadialGradient(x, y, 0, x, y, size);
      const col = rand() < 0.55 ? '118,85,214' : rand() < 0.6 ? '60,110,200' : '103,227,242';
      g.addColorStop(0, `rgba(${col},${0.05 + rand() * 0.06})`);
      g.addColorStop(1, `rgba(${col},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(x - size, y - size, size * 2, size * 2);
    }

    // Stars
    const N = 16000;
    for (let i = 0; i < N; i++) {
      const t = Math.pow(rand(), 0.62);
      const r = t * R;
      const arm = i % arms;
      const spread = (0.42 - t * 0.22) * (rand() < 0.15 ? 2.6 : 1);
      const a = arm * (Math.PI * 2 / arms) + t * twist + gauss() * spread;
      const x = c + Math.cos(a) * r + gauss() * 6;
      const y = c + Math.sin(a) * r + gauss() * 6;
      let col;
      if (t < 0.2) col = '255,232,200';
      else if (t < 0.5) col = rand() < 0.5 ? '230,220,255' : '201,191,247';
      else col = rand() < 0.45 ? '150,200,255' : rand() < 0.5 ? '103,227,242' : '190,170,255';
      const alpha = (1 - t * 0.55) * (0.25 + rand() * 0.55);
      const s = rand() < 0.02 ? 2.2 : rand() < 0.2 ? 1.4 : 0.9;
      ctx.fillStyle = `rgba(${col},${alpha.toFixed(3)})`;
      ctx.fillRect(x, y, s, s);
    }

    // A few bright foreground stars with diffraction spikes
    for (let i = 0; i < 14; i++) {
      const t = 0.25 + rand() * 0.7;
      const a = (i % arms) * Math.PI + t * twist + gauss() * 0.3;
      const x = c + Math.cos(a) * t * R, y = c + Math.sin(a) * t * R;
      const g = ctx.createRadialGradient(x, y, 0, x, y, 9);
      g.addColorStop(0, 'rgba(255,255,255,0.95)');
      g.addColorStop(1, 'rgba(160,200,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - 9, y - 9, 18, 18);
    }
  }

  /* ---------- Twinkling stars in the hero (small, fixed count) ---------- */
  function initTwinkles() {
    const host = document.querySelector('[data-twinkles]');
    if (!host || reduce()) return;
    const rand = rng(11);
    const frag = document.createDocumentFragment();
    for (let i = 0; i < 14; i++) {
      const s = document.createElement('span');
      s.className = 'twinkle';
      s.setAttribute('aria-hidden', 'true');
      s.style.left = (rand() * 96 + 2).toFixed(1) + '%';
      s.style.top = (rand() * 80 + 8).toFixed(1) + '%';
      s.style.animationDelay = (-rand() * 5).toFixed(2) + 's';
      s.style.animationDuration = (3.5 + rand() * 4).toFixed(2) + 's';
      frag.appendChild(s);
    }
    host.appendChild(frag);
  }

  /* ---------- Scroll reveals (run once) ---------- */
  function initReveals() {
    document.querySelectorAll('[data-stagger]').forEach((group) => {
      [...group.children].forEach((el, i) => {
        if (!el.style.getPropertyValue('--d')) el.style.setProperty('--d', i % 6);
      });
    });

    const targets = document.querySelectorAll('[data-reveal], [data-inview]');
    if (!('IntersectionObserver' in window) || reduce()) {
      targets.forEach((el) => el.classList.add('is-in'));
      return;
    }
    // Masked variants are fully clipped while hidden, so IntersectionObserver would never
    // report them; watch their parent instead and reveal the children from there.
    const watched = new Map();
    targets.forEach((el) => {
      const clipped = el.dataset.reveal === 'mask' || el.dataset.reveal === 'rise';
      const key = clipped ? el.parentElement : el;
      if (!watched.has(key)) watched.set(key, []);
      watched.get(key).push(el);
    });
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        watched.get(e.target).forEach((el) => {
          el.classList.add('is-in');
          el.dispatchEvent(new CustomEvent('reveal'));
        });
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.01 });
    watched.forEach((_, key) => io.observe(key));
  }

  /* ---------- Header, parallax and progress: one rAF per scroll ---------- */
  function initScrollEffects() {
    const header = document.querySelector('.site-header');
    const galaxy = document.querySelector('[data-galaxy]');
    const rise = document.querySelector('[data-rise]');
    const parallax = [...document.querySelectorAll('[data-parallax]')];
    const visible = new Set();

    if ('IntersectionObserver' in window) {
      const vio = new IntersectionObserver((entries) => {
        entries.forEach((e) => (e.isIntersecting ? visible.add(e.target) : visible.delete(e.target)));
        request();
      }, { rootMargin: '100px 0px' });
      [galaxy, rise, ...parallax].forEach((el) => el && vio.observe(el));
    }

    let ticking = false;
    const update = () => {
      ticking = false;
      const y = window.scrollY;
      const vh = window.innerHeight;
      header && header.classList.toggle('is-scrolled', y > 24);

      if (reduce()) return;
      const lite = smallMQ.matches;

      if (galaxy && visible.has(galaxy)) {
        const p = clamp(y / vh);
        galaxy.style.transform = lite
          ? `translate3d(0, ${(y * 0.2).toFixed(1)}px, 0)`
          : `translate3d(0, ${(y * 0.38).toFixed(1)}px, 0) scale(${(1 + p * 0.22).toFixed(3)})`;
        galaxy.style.setProperty('--gp', p.toFixed(3));
      }

      if (!lite) {
        parallax.forEach((el) => {
          if (!visible.has(el)) return;
          const r = el.getBoundingClientRect();
          const off = r.top + r.height / 2 - vh / 2;
          el.style.transform = `translate3d(0, ${(off * parseFloat(el.dataset.parallax)).toFixed(1)}px, 0)`;
        });
      }

      if (rise && visible.has(rise)) {
        const r = rise.getBoundingClientRect();
        rise.style.setProperty('--rise', clamp((vh - r.top) / r.height).toFixed(3));
      }
    };
    const request = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', request);
    update();
  }

  /* ---------- Journey rail: highlight the section in view ---------- */
  function initJourney() {
    const rail = document.querySelector('.journey');
    if (!rail || !('IntersectionObserver' in window)) return;
    const links = new Map([...rail.querySelectorAll('[data-journey]')].map((a) => [a.dataset.journey, a]));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        links.forEach((a) => a.classList.remove('is-active'));
        const a = links.get(e.target.id);
        a && a.classList.add('is-active');
        rail.classList.toggle('on-light-bg', e.target.dataset.theme === 'light');
      });
    }, { rootMargin: '-50% 0px -50% 0px' });
    document.querySelectorAll('[data-section]').forEach((s) => io.observe(s));
  }

  /* ---------- Star chart: each announcement lights a star ---------- */
  function initStarChart() {
    const chart = document.querySelector('[data-chart]');
    const notices = [...document.querySelectorAll('[data-notice]')];
    if (!chart || !notices.length) return;
    const stars = [...chart.querySelectorAll('.c-star')];
    const lines = [...chart.querySelectorAll('.const-line')];
    let charted = -1;

    const chartTo = (k) => {
      if (k <= charted) return;
      charted = k;
      stars.forEach((s, i) => s.classList.toggle('is-lit', i <= k));
      lines.forEach((l, i) => l.classList.toggle('is-drawn', i < k));
    };

    // Without motion, or on small screens where the chart isn't sticky, show it complete.
    const complete = () => chartTo(stars.length - 1);
    if (reduce() || !('IntersectionObserver' in window)) return complete();
    chart.addEventListener('reveal', () => { if (smallMQ.matches) setTimeout(complete, 500); });

    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const k = +e.target.dataset.notice;
        notices.forEach((n) => n.classList.toggle('is-active', n === e.target));
        chartTo(k);
      });
    }, { rootMargin: '-35% 0px -45% 0px' });
    notices.forEach((n) => io.observe(n));
  }

  /* ---------- Mission map: planets orbit the sun; each planet is a link ----------
     Planets share one rotation (fixed 60° spacing, so labels never collide) and are
     projected onto tilted ellipses. Depth = sin(angle): planets in front of the sun
     grow and sit above it, those behind shrink and pass beneath it. The tilt opens
     up as the section scrolls into view. Orbits pause on hover/focus, via the
     toggle, when off-screen, and never move with reduced motion. */
  function initOrbitMap() {
    const map = document.querySelector('[data-orbit-map]');
    if (!map) return;
    const svg = map.querySelector('.orbit-rings');
    const worlds = [...map.querySelectorAll('.world')];
    const toggle = document.querySelector('[data-orbit-toggle]');
    const gridMQ = matchMedia('(max-width: 760px)');
    const NS = 'http://www.w3.org/2000/svg';
    const step = (Math.PI * 2) / worlds.length;
    const SPEED = 0.045; // rad/s, about 2.3 minutes per revolution

    const rings = worlds.map((w, i) => {
      const e = document.createElementNS(NS, 'ellipse');
      e.setAttribute('class', 'ring draw');
      e.setAttribute('pathLength', '1');
      e.style.setProperty('--d', i);
      svg.appendChild(e);
      return e;
    });

    let W = 0, H = 0, angle = 0.35, tilt = 0.3;
    let visible = false, hover = false, userPaused = false, raf = 0, last = 0;

    const live = () => !gridMQ.matches;
    const moving = () => live() && visible && !hover && !userPaused && !reduce();

    const measure = () => {
      W = map.clientWidth; H = map.clientHeight;
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    };

    const layout = () => {
      const cx = W / 2, cy = H / 2;
      const R = Math.min(W / 2 - 90, H * 1.25);
      worlds.forEach((w, i) => {
        const rx = +w.dataset.r * R, ry = rx * tilt;
        const a = angle + i * step;
        const depth = Math.sin(a);
        const x = cx + Math.cos(a) * rx, y = cy + depth * ry;
        const s = 0.78 + 0.22 * (depth + 1) / 2;
        w.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${s.toFixed(3)})`;
        w.style.zIndex = depth > 0 ? 20 + Math.round(depth * 10) : 1 + Math.round((depth + 1) * 4);
        const ring = rings[i];
        ring.setAttribute('cx', cx); ring.setAttribute('cy', cy);
        ring.setAttribute('rx', rx.toFixed(1)); ring.setAttribute('ry', ry.toFixed(1));
      });
    };

    const scrollTilt = () => {
      if (reduce()) { tilt = 0.3; return; }
      const r = map.getBoundingClientRect();
      const vh = window.innerHeight;
      tilt = 0.12 + 0.2 * clamp((vh - r.top) / (vh * 0.85));
    };

    const frame = (t) => {
      raf = 0;
      if (!live()) return;
      const dt = last ? Math.min((t - last) / 1000, 0.1) : 0;
      last = t;
      if (moving()) angle += dt * SPEED;
      layout();
      if (moving()) raf = requestAnimationFrame(frame);
      else last = 0;
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };

    const setMode = () => {
      const on = live();
      map.classList.toggle('is-live', on);
      if (toggle) toggle.hidden = !on || reduce();
      if (on) { measure(); scrollTilt(); layout(); kick(); }
      else worlds.forEach((w) => { w.style.transform = ''; w.style.zIndex = ''; });
    };

    // Highlight a world and its orbit while hovered or focused; pause the system.
    const activate = (w) => {
      worlds.forEach((x, i) => {
        x.classList.toggle('is-active', x === w);
        rings[i].classList.toggle('is-active', x === w);
      });
      map.classList.toggle('has-active', !!w);
    };
    worlds.forEach((w) => {
      const a = w.querySelector('a');
      a.addEventListener('pointerenter', () => activate(w));
      a.addEventListener('pointerleave', () => activate(null));
      a.addEventListener('focus', () => activate(w));
      a.addEventListener('blur', () => activate(null));
    });
    map.addEventListener('pointerenter', () => { hover = true; });
    map.addEventListener('pointerleave', () => { hover = false; kick(); });
    map.addEventListener('focusin', () => { hover = true; });
    map.addEventListener('focusout', (e) => { if (!map.contains(e.relatedTarget)) { hover = false; kick(); } });

    if (toggle) {
      toggle.addEventListener('click', () => {
        userPaused = !userPaused;
        toggle.setAttribute('aria-pressed', String(userPaused));
        toggle.querySelector('span').textContent = userPaused ? 'Resume orbits' : 'Pause orbits';
        kick();
      });
    }

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => { visible = e.isIntersecting; kick(); }, { rootMargin: '80px 0px' }).observe(map);
    } else visible = true;

    window.addEventListener('scroll', () => { if (visible && live()) { scrollTilt(); kick(); } }, { passive: true });
    let rt;
    window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (live()) measure(); kick(); }, 120); });
    gridMQ.addEventListener('change', setMode);
    reduceMQ.addEventListener('change', setMode);
    setMode();
  }

  /* ---------- Trajectory: the launch path draws with scroll and lights milestones ----------
     Progress only moves forward, so nothing un-draws when scrolling back up. */
  function initTrajectory() {
    const traj = document.querySelector('[data-traj]');
    if (!traj) return;
    const path = traj.querySelector('.traj-path');
    const probe = traj.querySelector('.traj-probe');
    const nodes = [...traj.querySelectorAll('.traj-node')];
    const items = [...traj.querySelectorAll('.milestones > li')];
    if (reduce() || !path || typeof path.getTotalLength !== 'function') return; // static, fully drawn

    // On narrow screens the SVG is hidden; milestones are spaced evenly down a vertical line.
    const listMQ = matchMedia('(max-width: 760px)');
    const listStops = items.map((_, i) => (i + 0.15) / items.length);
    let L = 0, stops = listStops;
    try {
      L = path.getTotalLength();
      // Find where along the path each node's x falls, so nodes sit above their columns.
      stops = nodes.map((n) => {
        const tx = +n.dataset.x;
        let lo = 0, hi = L;
        for (let k = 0; k < 24; k++) {
          const mid = (lo + hi) / 2;
          if (path.getPointAtLength(mid).x < tx) lo = mid; else hi = mid;
        }
        const pt = path.getPointAtLength(lo);
        n.setAttribute('transform', `translate(${pt.x.toFixed(1)} ${pt.y.toFixed(1)})`);
        return lo / L;
      });
    } catch (err) { L = 0; } // path not rendered (some browsers): list mode still works
    const pointAt = (len) => { try { return path.getPointAtLength(len); } catch (err) { return { x: 0, y: 0 }; } };

    path.style.strokeDasharray = L;
    traj.classList.add('is-live');
    let p = -1;
    const set = (np) => {
      if (np <= p) return;
      p = np;
      traj.style.setProperty('--p', p.toFixed(3));
      if (L) {
        path.style.strokeDashoffset = (L * (1 - p)).toFixed(1);
        const pt = pointAt(L * p);
        probe.setAttribute('transform', `translate(${pt.x.toFixed(1)} ${pt.y.toFixed(1)})`);
      }
      const at = listMQ.matches || !L ? listStops : stops;
      items.forEach((li, i) => {
        const on = p >= at[i] - 0.004;
        li.classList.toggle('is-reached', on);
        nodes[i] && nodes[i].classList.toggle('is-reached', on);
      });
    };
    set(0);

    let ticking = false;
    const update = () => {
      ticking = false;
      const r = traj.getBoundingClientRect();
      const vh = window.innerHeight;
      set(clamp((vh * 0.85 - r.top) / (r.height + vh * 0.25)));
    };
    window.addEventListener('scroll', () => { if (!ticking && p < 1) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    update();
  }

  /* ---------- Mobile navigation overlay ---------- */
  function initNav() {
    const navMQ = matchMedia('(max-width: 1080px)');
    const toggle = document.querySelector('.nav-toggle');
    const nav = document.getElementById('site-nav');
    if (!toggle || !nav) return;
    const outside = [document.querySelector('main'), document.querySelector('footer'), document.querySelector('.journey')].filter(Boolean);

    const setOpen = (open) => {
      document.body.classList.toggle('nav-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      outside.forEach((el) => (el.inert = open));
      if (open) nav.querySelector('a').focus();
    };
    toggle.addEventListener('click', () => setOpen(!document.body.classList.contains('nav-open')));
    nav.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && document.body.classList.contains('nav-open')) { setOpen(false); toggle.focus(); }
    });
    navMQ.addEventListener('change', (e) => { if (!e.matches) setOpen(false); });
  }

  /* ---------- Events page: category filter ---------- */
  function initFilters() {
    const bar = document.querySelector('[data-filters]');
    if (!bar) return;
    const cards = [...document.querySelectorAll('[data-cat]')];
    const status = document.querySelector('[data-filter-status]');
    bar.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-filter]');
      if (!btn) return;
      const f = btn.dataset.filter;
      bar.querySelectorAll('[data-filter]').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      let shown = 0;
      cards.forEach((c) => {
        const match = f === 'all' || c.dataset.cat === f;
        c.hidden = !match;
        if (match) { shown++; c.classList.add('is-in'); }
      });
      if (status) status.textContent = `Showing ${shown} ${shown === 1 ? 'event' : 'events'}`;
    });
  }

  /* ---------- Gallery page: lightbox ---------- */
  function initLightbox() {
    const dlg = document.querySelector('[data-lightbox]');
    const items = [...document.querySelectorAll('[data-full]')];
    if (!dlg || !items.length || typeof dlg.showModal !== 'function') return;
    const img = dlg.querySelector('img');
    const cap = dlg.querySelector('[data-caption]');
    let idx = 0;
    const show = (i) => {
      idx = (i + items.length) % items.length;
      const it = items[idx];
      img.src = it.dataset.full;
      img.alt = it.querySelector('img').alt;
      cap.textContent = `${it.dataset.caption} (${idx + 1} of ${items.length})`;
    };
    items.forEach((it, i) => it.addEventListener('click', () => { show(i); dlg.showModal(); }));
    dlg.querySelector('[data-prev]').addEventListener('click', () => show(idx - 1));
    dlg.querySelector('[data-next]').addEventListener('click', () => show(idx + 1));
    dlg.querySelector('[data-close]').addEventListener('click', () => dlg.close());
    dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') show(idx - 1);
      if (e.key === 'ArrowRight') show(idx + 1);
    });
    dlg.addEventListener('close', () => items[idx].focus());
  }

  /* ---------- Contact page: client-side validation (no backend yet) ---------- */
  function initForm() {
    const form = document.querySelector('[data-contact-form]');
    if (!form) return;
    const status = form.querySelector('.form-status');
    const rules = {
      name: (v) => v.trim().length >= 2 || 'Please enter your name.',
      email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) || 'Please enter a valid email address.',
      message: (v) => v.trim().length >= 10 || 'Please write a message of at least 10 characters.',
    };
    const check = (field) => {
      const rule = rules[field.name];
      if (!rule) return true;
      const res = rule(field.value);
      const err = document.getElementById(field.name + '-error');
      field.setAttribute('aria-invalid', String(res !== true));
      if (err) err.textContent = res === true ? '' : res;
      return res === true;
    };
    form.addEventListener('focusout', (e) => { if (e.target.name in rules && e.target.value) check(e.target); });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const fields = [...form.elements].filter((f) => f.name in rules);
      const bad = fields.filter((f) => !check(f));
      if (bad.length) { bad[0].focus(); status.hidden = true; return; }
      status.hidden = false;
      status.textContent = 'Thank you. This demo form is not yet connected to a server, so your message was not sent.';
      form.reset();
      status.focus();
    });
  }

  function initYear() {
    document.querySelectorAll('[data-year]').forEach((el) => (el.textContent = new Date().getFullYear()));
  }

  initStarfield();
  initGalaxy();
  initTwinkles();
  initOrbitMap(); // before reveals: it creates the orbit rings that draw in
  initTrajectory();
  initReveals();
  initScrollEffects();
  initJourney();
  initStarChart();
  initNav();
  initFilters();
  initLightbox();
  initForm();
  initYear();
})();
