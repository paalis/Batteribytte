(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const K = RM ? 0.35 : 1;
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (a) => a[(Math.random() * a.length) | 0];
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const world = $('#world');
  const camera = $('#camera');

  /* ================================================================
     Artwork: cans with condensation, ice, bubbles, pull tabs
     ================================================================ */

  function rng(seed) {
    return () => {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Geometry of the photo (assets/battery-fresh.webp) inside a 200×400 can box
  const PHOTO = { x: 23.6, w: 152.8 };
  const BARS = [{ x: 49.6, y: 169.6, w: 37.4, h: 21.2 }, { x: 49.6, y: 196.7, w: 37.4, h: 13.6 }];
  const BODY = [27, 10, 173, 382];

  const CAN_KINDS = {
    a:     { box: '0 0 200 400', drops: 170, area: BODY, seed: 1 },
    b:     { box: '0 0 200 400', drops: 170, area: BODY, seed: 2 },
    pack:  { box: '0 0 200 400', drops: 190, area: BODY, seed: 3 },
    side:  { box: '0 0 200 400', drops: 40,  area: BODY, seed: 4 },
    pour:  { box: '0 0 200 400', drops: 230, area: BODY, seed: 5 },
    splash: { box: '0 0 200 400', drops: 210, area: BODY, seed: 7 },
    macro: { box: '33 70 126 180', drops: 280, area: [33, 70, 159, 250], seed: 6, big: true },
  };

  function dropsMarkup(k) {
    const r = rng(k.seed);
    const [x0, y0, x1, y1] = k.area;
    let s = '';
    for (let i = 0; i < k.drops; i++) {
      const cx = x0 + r() * (x1 - x0), cy = y0 + r() * (y1 - y0);
      const rad = (k.big ? 0.3 : 0.4) + Math.pow(r(), 3.2) * (k.big ? 3.4 : 2.8);
      const rx = rad * (0.85 + r() * 0.2), ry = rad * (1 + r() * 0.25);
      const run = rad > 1.5 && r() < 0.16;
      const style = run ? ` class="run" style="--t:${(5 + r() * 6).toFixed(1)}s;--d:${(-r() * 8).toFixed(1)}s;--dy:${(60 + r() * 140) | 0}px"` : '';
      // Wet trail left by a drop that has already run
      if (rad > 1.2 && r() < 0.22) {
        s += `<rect x="${(cx - rx * 0.55).toFixed(1)}" y="${(cy - 18 - r() * 40).toFixed(1)}" width="${(rx * 1.1).toFixed(2)}" height="${(18 + r() * 40).toFixed(0)}" rx="${(rx * 0.5).toFixed(2)}" fill="#fff" fill-opacity=".07"/>`;
      }
      s += `<g${style}>` +
        `<ellipse cx="${(cx + rad * 0.12).toFixed(1)}" cy="${(cy + rad * 0.2).toFixed(1)}" rx="${rx.toFixed(2)}" ry="${ry.toFixed(2)}" fill="#2a0600" fill-opacity=".22"/>` +
        `<ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${rx.toFixed(2)}" ry="${ry.toFixed(2)}" fill="url(#c-drop)"/>` +
        `<ellipse cx="${(cx - rx * 0.34).toFixed(1)}" cy="${(cy - ry * 0.4).toFixed(1)}" rx="${(rx * 0.26).toFixed(2)}" ry="${(ry * 0.2).toFixed(2)}" fill="#fff" fill-opacity=".95"/>` +
        (rad > 1 ? `<path d="M${(cx - rx * 0.5).toFixed(1)} ${(cy + ry * 0.45).toFixed(1)} Q${cx.toFixed(1)} ${(cy + ry * 0.85).toFixed(1)} ${(cx + rx * 0.5).toFixed(1)} ${(cy + ry * 0.45).toFixed(1)}" fill="none" stroke="#fff3d6" stroke-opacity=".55" stroke-width="${(rad * 0.16).toFixed(2)}" stroke-linecap="round"/>` : '') +
        `</g>`;
    }
    return s;
  }

  function canSVG(kind) {
    const k = CAN_KINDS[kind];
    const [mx0, my0, mx1, my1] = k.area;
    const meter = BARS.map((b, i) =>
      `<rect class="cover" x="${b.x + b.w}" y="${b.y}" width="0" height="${b.h}" fill="url(#c-bar${i + 1})"/>` +
      `<rect class="lvl" x="${b.x}" y="${b.y}" width="0" height="${b.h}" fill="#ff2d55"/>` +
      `<rect class="outline" x="${b.x + 0.8}" y="${b.y + 0.8}" width="${b.w - 1.6}" height="${b.h - 1.6}" fill="none" stroke="#141216" stroke-width="1.6" opacity="0"/>`).join('');
    return `<svg viewBox="${k.box}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <image href="assets/battery-fresh.webp" x="${PHOTO.x}" y="0" width="${PHOTO.w}" height="400" preserveAspectRatio="none"/>
      <g class="meter">${meter}</g>
      <g mask="url(#c-body)">
        <rect x="20" y="0" width="160" height="400" fill="url(#c-light)"/>
        <rect x="${mx0}" y="${my0}" width="${mx1 - mx0}" height="${my1 - my0}" filter="url(#c-mist)" opacity="${k.big ? 0.16 : 0.24}"/>
        ${dropsMarkup(k)}
      </g>
      <circle class="mouth" cx="100" cy="3" r="1" fill="none"/>
    </svg>`;
  }

  $$('[data-can]').forEach((el) => { el.innerHTML = canSVG(el.dataset.can); });

  // Photographic ice cubes: rendered once on a canvas (cloudy core, fractures, trapped bubbles,
  // frosted surface, refracting edges) and reused everywhere through <symbol>/<use>.
  const ICE_N = 8, ICE_C = [];
  (function iceSymbols() {
    const IW = 260, IH = 240;
    let out = '';
    for (let n = 0; n < ICE_N; n++) {
      const r = rng(500 + n), c = document.createElement('canvas');
      c.width = IW; c.height = IH;
      const g = c.getContext('2d');
      const J = (v) => v + (r() - 0.5) * 10;                        // a melted, uneven edge

      // A cube seen from slightly above: front, top and side face (mirrored on odd variants)
      const side = n % 2 ? -1 : 1, dx = (26 + r() * 22) * side, dy = -(28 + r() * 18);
      const fw = 150 + r() * 30, fh = 130 + r() * 30;
      const x0 = IW / 2 - fw / 2 - dx / 2, y0 = IH / 2 - fh / 2 - dy / 2;
      const FTL = [J(x0), J(y0)], FTR = [J(x0 + fw), J(y0)], FBR = [J(x0 + fw), J(y0 + fh)], FBL = [J(x0), J(y0 + fh)];
      const BTL = [J(x0 + dx), J(y0 + dy)], BTR = [J(x0 + fw + dx), J(y0 + dy)], BBR = [J(x0 + fw + dx), J(y0 + fh + dy)], BBL = [J(x0 + dx), J(y0 + fh + dy)];
      const sil = side > 0 ? [FTL, BTL, BTR, BBR, FBR, FBL] : [BTL, BTR, FTR, FBR, FBL, BBL];
      const top = [FTL, BTL, BTR, FTR], front = [FTL, FTR, FBR, FBL];
      const sideF = side > 0 ? [FTR, BTR, BBR, FBR] : [FTL, BTL, BBL, FBL];

      // closed path with rounded, melted corners
      const poly = (pts, rad) => {
        g.beginPath();
        for (let i = 0; i < pts.length; i++) {
          const p0 = pts[(i + pts.length - 1) % pts.length], p1 = pts[i], p2 = pts[(i + 1) % pts.length];
          const a = [p1[0] + (p0[0] - p1[0]) * 0.5, p1[1] + (p0[1] - p1[1]) * 0.5];
          const l0 = Math.hypot(p0[0] - p1[0], p0[1] - p1[1]), l2 = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
          const k0 = Math.min(rad / l0, 0.45), k2 = Math.min(rad / l2, 0.45);
          const s0 = [p1[0] + (p0[0] - p1[0]) * k0, p1[1] + (p0[1] - p1[1]) * k0], s2 = [p1[0] + (p2[0] - p1[0]) * k2, p1[1] + (p2[1] - p1[1]) * k2];
          if (i === 0) g.moveTo(a[0], a[1]);
          g.lineTo(s0[0], s0[1]);
          g.quadraticCurveTo(p1[0], p1[1], s2[0], s2[1]);
        }
        g.closePath();
      };
      const R = 22 + r() * 14;

      g.save();
      poly(sil, R); g.clip();

      // faces: lit from above, the far side picks up the red set
      poly(top, R * 0.7);
      let gr = g.createLinearGradient(BTL[0], BTL[1], FTR[0], FTR[1]);
      gr.addColorStop(0, 'rgba(255,255,255,.38)'); gr.addColorStop(1, 'rgba(255,240,244,.18)');
      g.fillStyle = gr; g.fill();
      poly(front, R * 0.7);
      gr = g.createLinearGradient(0, FTL[1], 0, FBL[1]);
      gr.addColorStop(0, 'rgba(255,250,252,.16)'); gr.addColorStop(0.6, 'rgba(255,200,212,.08)'); gr.addColorStop(1, 'rgba(255,120,145,.2)');
      g.fillStyle = gr; g.fill();
      poly(sideF, R * 0.7);
      gr = g.createLinearGradient(sideF[0][0], 0, sideF[1][0], 0);
      gr.addColorStop(0, 'rgba(255,90,120,.18)'); gr.addColorStop(1, 'rgba(70,0,20,.28)');
      g.fillStyle = gr; g.fill();

      // what you see through ice: the set behind, broken up into soft light and dark patches
      g.filter = 'blur(7px)';
      for (let i = 0; i < 26; i++) {
        const light = r() < 0.55;
        g.fillStyle = light ? `rgba(255,255,255,${(0.08 + r() * 0.22).toFixed(2)})` : `rgba(60,0,16,${(0.08 + r() * 0.22).toFixed(2)})`;
        g.beginPath();
        g.ellipse(x0 + r() * (fw + Math.abs(dx)), y0 + dy + r() * (fh - dy), 6 + r() * 26, 4 + r() * 16, r() * 3, 0, Math.PI * 2);
        g.fill();
      }
      // cloudy core with feathered air trails, like freezer ice
      const cx0 = x0 + fw * (0.42 + r() * 0.16) + dx * 0.3, cy0 = y0 + fh * (0.45 + r() * 0.12) + dy * 0.3;
      g.filter = 'blur(12px)';
      g.fillStyle = `rgba(255,255,255,${(0.35 + r() * 0.25).toFixed(2)})`;
      g.beginPath(); g.ellipse(cx0, cy0, fw * (0.14 + r() * 0.08), fh * (0.12 + r() * 0.08), r() * 3, 0, Math.PI * 2); g.fill();
      // air trails run mostly one way (the direction the water froze), soft and uneven
      g.filter = 'blur(2.6px)';
      const dir = -Math.PI / 2 + (r() - 0.5) * 0.9;
      for (let i = 0; i < 26; i++) {
        const a = dir + (r() - 0.5) * 0.7 + (r() < 0.5 ? Math.PI : 0), l0 = r() * 10, l1 = l0 + 8 + r() * 30;
        const ox = (r() - 0.5) * fw * 0.18, oy = (r() - 0.5) * fh * 0.14;
        g.strokeStyle = `rgba(255,255,255,${(0.05 + r() * 0.14).toFixed(2)})`;
        g.lineWidth = 1 + r() * 3;
        g.beginPath();
        g.moveTo(cx0 + ox + Math.cos(a) * l0, cy0 + oy + Math.sin(a) * l0);
        g.quadraticCurveTo(cx0 + ox + Math.cos(a + 0.2) * l1 * 0.6, cy0 + oy + Math.sin(a + 0.2) * l1 * 0.6, cx0 + ox + Math.cos(a) * l1, cy0 + oy + Math.sin(a) * l1);
        g.stroke();
      }
      g.filter = 'none';
      for (let i = 0; i < 9; i++) {
        const a = r() * Math.PI * 2, d = r() * fw * 0.3, rad = 0.5 + Math.pow(r(), 2) * 1.6;
        const bx = cx0 + Math.cos(a) * d, by = cy0 + Math.sin(a) * d * 0.8;
        g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 0.6;
        g.beginPath(); g.arc(bx, by, rad, 0, Math.PI * 2); g.stroke();
      }

      // edges: soft refracting bevels that brighten and fade along their length (no outline)
      const bevel = (p, q, w, a0, a1, color = '255,255,255') => {
        gr = g.createLinearGradient(p[0], p[1], q[0], q[1]);
        gr.addColorStop(0, `rgba(${color},${a0})`); gr.addColorStop(0.5, `rgba(${color},${Math.max(a0, a1) * (0.7 + r() * 0.5)})`); gr.addColorStop(1, `rgba(${color},${a1})`);
        g.strokeStyle = gr; g.lineWidth = w; g.lineCap = 'round';
        g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(q[0], q[1]); g.stroke();
      };
      g.filter = 'blur(3.5px)';
      bevel(FTL, FTR, 9, 0.75, 0.35); bevel(FTL, BTL, 8, 0.6, 0.25); bevel(BTL, BTR, 7, 0.2, 0.45);
      bevel(FTL, FBL, 7, 0.45, 0.1); bevel(FTR, FBR, 6, 0.35, 0.15);
      g.filter = 'blur(1.6px)';
      bevel([FTL[0] + 8, FTL[1] + 10], [FTR[0] - 8, FTR[1] + 10], 2.5, 0.05, 0.35, '70,0,20');
      bevel([FBL[0] + 6, FBL[1] - 8], [FBR[0] - 6, FBR[1] - 8], 4, 0.4, 0.15, '70,0,20');
      bevel(FTR, FBR, 2.5, 0.1, 0.35, '70,0,20');
      // a darker rim where the outer surface turns away from the light
      g.filter = 'blur(6px)';
      g.strokeStyle = 'rgba(60,0,16,.22)'; g.lineWidth = 14; poly(sil, R); g.stroke();
      // total internal reflection: darker bands just inside the front face edges
      g.filter = 'blur(5px)';
      g.strokeStyle = 'rgba(50,0,14,.2)'; g.lineWidth = 10;
      g.beginPath(); g.moveTo(FBL[0] + 14, FTL[1] + 22); g.lineTo(FBL[0] + 14, FBL[1] - 16); g.lineTo(FBR[0] - 18, FBR[1] - 14); g.stroke();
      g.filter = 'none';

      // fine frost on the top face
      g.save(); poly(top, R * 0.7); g.clip();
      for (let i = 0; i < 700; i++) {
        g.fillStyle = `rgba(255,255,255,${(0.04 + r() * 0.12).toFixed(2)})`;
        g.fillRect(x0 + r() * (fw + Math.abs(dx)) - Math.max(0, -dx), y0 + dy + r() * -dy, 1 + r(), 1 + r());
      }
      g.restore();

      // speculars: one sharp, irregular glint on the top edge and a thin wet streak
      g.globalCompositeOperation = 'lighter';
      const hx = FTL[0] + (FTR[0] - FTL[0]) * (0.18 + r() * 0.2), hy = FTL[1] + (FTR[1] - FTL[1]) * 0.3 + 3;
      g.filter = 'blur(.6px)';
      g.fillStyle = 'rgba(255,255,255,.95)';
      g.beginPath(); g.moveTo(hx - 16, hy + 2); g.quadraticCurveTo(hx, hy - 5, hx + 22, hy); g.quadraticCurveTo(hx + 4, hy + 4, hx - 16, hy + 2); g.fill();
      // a soft wet sheen down the lit edge
      g.filter = 'blur(4px)';
      gr = g.createLinearGradient(0, FTL[1], 0, FBL[1]);
      gr.addColorStop(0, 'rgba(255,255,255,.35)'); gr.addColorStop(0.5, 'rgba(255,255,255,.12)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.strokeStyle = gr; g.lineWidth = 6;
      g.beginPath(); g.moveTo(FTL[0] + 16, FTL[1] + 14); g.lineTo(FBL[0] + 16, FBL[1] - 24); g.stroke();
      g.filter = 'none';
      g.restore();

      ICE_C.push(c);
      out += `<symbol id="iceS${n}" viewBox="0 0 ${IW} ${IH}" preserveAspectRatio="none"><image href="${c.toDataURL('image/png')}" width="${IW}" height="${IH}"/></symbol>`;
    }
    $('svg.defs defs').insertAdjacentHTML('beforeend', out);
  })();

  function cube(x, y, w, h, rot, r) {
    return `<g transform="translate(${x.toFixed(0)} ${y.toFixed(0)}) rotate(${rot.toFixed(0)})">` +
      `<g class="cube" style="--jx:${((r() - 0.5) * 30).toFixed(0)}px;--jr:${((r() - 0.5) * 40).toFixed(0)}deg;--d:${(r() * 0.15).toFixed(2)}s">` +
      `<use href="#iceS${(r() * ICE_N) | 0}" x="${(-w / 2).toFixed(1)}" y="${(-h / 2).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}"/>` +
      `</g></g>`;
  }

  function iceMarkup(front) {
    const r = rng(front ? 11 : 12);
    let s = '';
    const n = front ? 11 : 9;
    for (let i = 0; i < n; i++) {
      const x = 30 + (i + r() * 0.8) * (640 / n), y = front ? 95 + r() * 55 : 60 + r() * 40;
      const w = (front ? 64 : 56) + r() * 34;
      s += cube(x, y, w, w * (0.75 + r() * 0.35), (r() - 0.5) * 70, r);
    }
    return s;
  }
  $('[data-ice="back"]').innerHTML = iceMarkup(false);
  $('[data-ice="front"]').innerHTML = iceMarkup(true);

  // Crushed-ice mound the splash-shot can lands in (higher towards the middle)
  function pileMarkup(front) {
    const r = rng(front ? 41 : 42);
    // a glowing bed of crushed ice so the mound reads as one solid heap
    let s = front
      ? `<path d="M-60 400 L-60 210 Q120 140 300 120 Q500 60 700 120 Q880 140 1060 210 L1060 400 Z" fill="url(#pile-bed)"/>`
      : `<path d="M-60 400 L-60 190 Q160 90 500 50 Q840 90 1060 190 L1060 400 Z" fill="url(#pile-bed)" opacity=".8"/>`;
    const rows = front ? [[150, 30], [215, 32], [285, 30], [350, 26]] : [[70, 22], [130, 26]];
    rows.forEach(([y0, n], ri) => {
      for (let i = 0; i < n; i++) {
        const x = -40 + (i + r() * 0.9) * (1080 / n), dx = (x - 500) / 540;
        const y = y0 + dx * dx * (front ? 70 : 90) - (front ? 0 : 0) + (r() - 0.5) * 30;
        const w = (front ? 66 : 54) + r() * 46 - ri * 4;
        s += cube(x, y, w, w * (0.72 + r() * 0.4), (r() - 0.5) * 90, r);
      }
    });
    // a sparkle of tiny crushed chips on top
    for (let i = 0; i < (front ? 60 : 30); i++) {
      const x = r() * 1000, dx = (x - 500) / 540, y = (front ? 130 : 55) + dx * dx * 70 + r() * 40, sz = 2 + r() * 6;
      s += `<rect x="${x.toFixed(0)}" y="${y.toFixed(0)}" width="${sz.toFixed(1)}" height="${(sz * 0.8).toFixed(1)}" rx="1.5" fill="#fff" fill-opacity=".85" transform="rotate(${(r() * 90) | 0} ${x.toFixed(0)} ${y.toFixed(0)})"/>`;
    }
    return s;
  }
  $('[data-pile="back"]').innerHTML = pileMarkup(false);
  $('[data-pile="front"]').innerHTML = pileMarkup(true);

  (function bucketDrops() {
    const r = rng(21);
    let s = '';
    for (let i = 0; i < 70; i++) {
      const x = 70 + r() * 560, y = 90 + r() * 420, rad = 0.8 + Math.pow(r(), 3) * 4;
      s += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${rad.toFixed(1)}" fill="#fff" fill-opacity=".12" stroke="#fff" stroke-opacity=".18"/>` +
        `<circle cx="${(x - rad * 0.3).toFixed(1)}" cy="${(y - rad * 0.35).toFixed(1)}" r="${(rad * 0.3).toFixed(1)}" fill="#fff" fill-opacity=".7"/>`;
    }
    $('.bucketDrops').innerHTML = s;
  })();

  /* Photographic glass of energy drink, painted once on a canvas: deep amber liquid that is darker at
     the walls and bottom with light shining through, ice cubes partly under the surface, thousands of
     tiny bubbles clinging to the inside, a fizzy surface line (no foam), a thick refracting base and
     cold condensation on the outside. Coordinates match the SVG viewBox (-20 -120 400 840). */
  function paintGlass() {
    const Z = 2, VW = 400, VH = 840, c = document.createElement('canvas');
    c.width = VW * Z; c.height = VH * Z;
    const g = c.getContext('2d'), r = rng(91);
    g.setTransform(Z, 0, 0, Z, 20 * Z, 120 * Z);
    const TOP = 0, BOT = 700, BASE = 640, LIQ = 62;               // rim, outer bottom, inner bottom, liquid line
    const xl = (y) => 8 + (y / 700) * 40, xr = (y) => 352 - (y / 700) * 40;   // outer walls
    const WT = 7;                                                    // wall thickness
    const inner = (y0, y1) => { g.beginPath(); g.moveTo(xl(y0) + WT, y0); g.lineTo(xr(y0) - WT, y0); g.lineTo(xr(y1) - WT, y1); g.lineTo(xl(y1) + WT, y1); g.closePath(); };
    const outer = () => { g.beginPath(); g.moveTo(xl(TOP), TOP); g.lineTo(xr(TOP), TOP); g.lineTo(xr(BOT), BOT); g.lineTo(xl(BOT), BOT); g.closePath(); };

    // the empty glass above the drink: barely there
    g.save(); inner(TOP, LIQ); g.clip();
    let gr = g.createLinearGradient(0, TOP, 0, LIQ);
    gr.addColorStop(0, 'rgba(255,255,255,.05)'); gr.addColorStop(1, 'rgba(255,255,255,.1)');
    g.fillStyle = gr; g.fillRect(0, TOP, 360, LIQ);
    g.restore();

    // the drink
    g.save(); inner(LIQ, BASE); g.clip();
    gr = g.createLinearGradient(0, LIQ, 0, BASE);
    gr.addColorStop(0, '#f8bf48'); gr.addColorStop(0.3, '#ec961c'); gr.addColorStop(0.72, '#b4560a'); gr.addColorStop(1, '#5e2003');
    g.fillStyle = gr; g.fillRect(0, LIQ, 360, BASE - LIQ);
    gr = g.createLinearGradient(xl(300) + WT, 0, xr(300) - WT, 0);
    gr.addColorStop(0, 'rgba(60,14,0,.75)'); gr.addColorStop(0.18, 'rgba(70,18,0,.08)'); gr.addColorStop(0.32, 'rgba(70,18,0,0)');
    gr.addColorStop(0.7, 'rgba(70,18,0,0)'); gr.addColorStop(0.86, 'rgba(70,18,0,.18)'); gr.addColorStop(1, 'rgba(50,8,0,.8)');
    g.fillStyle = gr; g.fillRect(0, LIQ, 360, BASE - LIQ);
    g.globalCompositeOperation = 'screen';
    gr = g.createRadialGradient(175, 400, 10, 175, 400, 230);
    gr.addColorStop(0, 'rgba(255,222,130,.7)'); gr.addColorStop(1, 'rgba(255,214,120,0)');
    g.fillStyle = gr; g.fillRect(0, LIQ, 360, BASE - LIQ);
    gr = g.createRadialGradient(180, 625, 4, 180, 625, 120);
    gr.addColorStop(0, 'rgba(255,230,150,.7)'); gr.addColorStop(1, 'rgba(255,230,150,0)');
    g.fillStyle = gr; g.fillRect(0, 520, 360, BASE - 520);

    // ice under the surface: brighter, amber-tinted, softened by the liquid
    const cubes = [[118, 120, 150, 128, -16], [242, 150, 140, 120, 22], [180, 300, 150, 126, 6], [128, 455, 120, 100, -28]];
    g.filter = 'blur(1.2px)';
    cubes.forEach(([x, y, w, h, a], i) => {
      g.save(); g.translate(x, y); g.rotate(a * Math.PI / 180);
      // ice in a drink reads brighter than the liquid around it: draw it twice, once lightening
      g.globalAlpha = 1 - i * 0.15;
      g.drawImage(ICE_C[(i * 3) % ICE_C.length], -w / 2, -h / 2, w, h);
      g.globalCompositeOperation = 'soft-light';
      g.drawImage(ICE_C[(i * 3) % ICE_C.length], -w / 2, -h / 2, w, h);
      g.globalCompositeOperation = 'screen';
      g.restore();
    });
    g.filter = 'none';
    g.globalCompositeOperation = 'source-over';

    // bubbles: dense on the walls and the ice, sparse in the middle, denser near the top
    const bubble = (x, y, rad) => {
      g.strokeStyle = `rgba(110,40,0,${(0.35 + r() * 0.3).toFixed(2)})`; g.lineWidth = Math.max(0.35, rad * 0.35);
      g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.stroke();
      g.fillStyle = `rgba(255,248,220,${(0.55 + r() * 0.4).toFixed(2)})`;
      g.beginPath(); g.arc(x - rad * 0.35, y - rad * 0.35, rad * 0.38, 0, Math.PI * 2); g.fill();
    };
    for (let i = 0; i < 2600; i++) {
      const y = LIQ + 8 + Math.pow(r(), 1.25) * (BASE - LIQ - 14);
      const edge = r() < 0.6, w0 = xl(y) + WT, w1 = xr(y) - WT;
      const x = edge ? (r() < 0.5 ? w0 + Math.pow(r(), 2) * 70 : w1 - Math.pow(r(), 2) * 70) : w0 + r() * (w1 - w0);
      bubble(x, y, 0.5 + Math.pow(r(), 3.5) * 3.2);
    }
    cubes.forEach(([x, y, w, h]) => {
      for (let i = 0; i < 70; i++) bubble(x + (r() - 0.5) * w * 0.9, y + (r() - 0.5) * h * 0.9, 0.5 + Math.pow(r(), 3) * 2.2);
    });
    g.restore();

    // a cube breaking the surface, clear above the drink
    g.save(); inner(TOP + 2, LIQ + 1); g.clip();
    g.translate(205, LIQ - 6); g.rotate(-0.12);
    g.drawImage(ICE_C[5], -78, -60, 156, 128);
    g.restore();

    // fizzy surface: a thin bright meniscus with a band of tiny bubbles (no foam)
    g.save(); inner(LIQ - 8, LIQ + 22); g.clip();
    for (let i = 0; i < 900; i++) {
      const x = xl(LIQ) + WT + r() * (xr(LIQ) - xl(LIQ) - WT * 2), y = LIQ - 2 + Math.pow(r(), 2) * 16;
      g.fillStyle = `rgba(255,250,232,${(0.25 + r() * 0.6).toFixed(2)})`;
      g.beginPath(); g.arc(x, y, 0.4 + Math.pow(r(), 3) * 1.8, 0, Math.PI * 2); g.fill();
    }
    g.restore();
    g.strokeStyle = 'rgba(255,246,220,.85)'; g.lineWidth = 1.6;
    g.beginPath(); g.moveTo(xl(LIQ) + WT, LIQ); g.quadraticCurveTo(180, LIQ + 3, xr(LIQ) - WT, LIQ); g.stroke();

    // thick base: the drink seen through solid glass, with caustics
    g.save(); g.beginPath(); g.moveTo(xl(BASE), BASE); g.lineTo(xr(BASE), BASE); g.lineTo(xr(BOT), BOT); g.lineTo(xl(BOT), BOT); g.closePath(); g.clip();
    gr = g.createLinearGradient(0, BASE, 0, BOT);
    gr.addColorStop(0, 'rgba(214,120,30,.85)'); gr.addColorStop(0.5, 'rgba(255,205,120,.6)'); gr.addColorStop(1, 'rgba(140,60,14,.7)');
    g.fillStyle = gr; g.fillRect(0, BASE, 360, BOT - BASE);
    g.globalCompositeOperation = 'screen';
    for (let i = 0; i < 9; i++) {
      const x = 70 + r() * 220;
      gr = g.createLinearGradient(x - 6, 0, x + 6, 0);
      gr.addColorStop(0, 'rgba(255,240,200,0)'); gr.addColorStop(0.5, `rgba(255,240,200,${(0.2 + r() * 0.4).toFixed(2)})`); gr.addColorStop(1, 'rgba(255,240,200,0)');
      g.fillStyle = gr; g.fillRect(x - 6, BASE, 12, BOT - BASE);
    }
    g.globalCompositeOperation = 'source-over';
    g.restore();
    g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(xl(BASE) + 4, BASE); g.quadraticCurveTo(180, BASE + 8, xr(BASE) - 4, BASE); g.stroke();

    // the glass itself: walls that catch light, dark refracting edges, rim
    g.save(); outer(); g.clip();
    const wall = (x0, x1, side) => {
      gr = g.createLinearGradient(x0, 0, x1, 0);
      if (side < 0) { gr.addColorStop(0, 'rgba(20,0,5,.55)'); gr.addColorStop(0.35, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,.05)'); }
      else { gr.addColorStop(0, 'rgba(255,255,255,.05)'); gr.addColorStop(0.6, 'rgba(255,90,120,.45)'); gr.addColorStop(1, 'rgba(20,0,5,.6)'); }
      return gr;
    };
    for (let y = 0; y < BOT; y += 4) {
      g.fillStyle = wall(xl(y), xl(y) + WT + 2, -1); g.fillRect(xl(y), y, WT + 2, 4.5);
      g.fillStyle = wall(xr(y) - WT - 2, xr(y), 1); g.fillRect(xr(y) - WT - 2, y, WT + 2, 4.5);
    }
    // long vertical highlights (studio strip lights)
    const strip = (fx, w, a) => {
      g.beginPath();
      g.moveTo(xl(TOP) + (xr(TOP) - xl(TOP)) * fx, TOP + 4); g.lineTo(xl(TOP) + (xr(TOP) - xl(TOP)) * fx + w, TOP + 4);
      g.lineTo(xl(BOT - 70) + (xr(BOT - 70) - xl(BOT - 70)) * fx + w, BOT - 70); g.lineTo(xl(BOT - 70) + (xr(BOT - 70) - xl(BOT - 70)) * fx, BOT - 70);
      g.closePath();
      gr = g.createLinearGradient(0, TOP, 0, BOT);
      gr.addColorStop(0, `rgba(255,255,255,${a})`); gr.addColorStop(0.5, `rgba(255,255,255,${a * 0.55})`); gr.addColorStop(1, `rgba(255,255,255,${a * 0.2})`);
      g.fillStyle = gr; g.fill();
    };
    strip(0.07, 7, 0.55); strip(0.13, 2, 0.4); strip(0.88, 4, 0.22);
    // condensation on the cold part (below the drink line)
    for (let i = 0; i < 260; i++) {
      const y = LIQ + 20 + r() * (BOT - LIQ - 40), x = xl(y) + r() * (xr(y) - xl(y)), rad = 0.5 + Math.pow(r(), 3) * 3.2;
      g.fillStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.ellipse(x, y, rad, rad * 1.15, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = 'rgba(60,10,0,.3)'; g.lineWidth = Math.max(0.3, rad * 0.25);
      g.beginPath(); g.arc(x, y + rad * 0.2, rad, 0.2 * Math.PI, 0.8 * Math.PI); g.stroke();
      g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.arc(x - rad * 0.35, y - rad * 0.4, rad * 0.3, 0, Math.PI * 2); g.fill();
    }
    g.restore();
    g.strokeStyle = 'rgba(255,255,255,.28)'; g.lineWidth = 1.2; outer(); g.stroke();
    // rim: a thin bright ellipse with a darker inner lip
    g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 2;
    g.beginPath(); g.ellipse(180, TOP + 2, 172, 5, 0, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = 'rgba(40,10,10,.25)'; g.lineWidth = 1;
    g.beginPath(); g.ellipse(180, TOP + 4, 166, 4, 0, 0, Math.PI); g.stroke();
    // bottom edge catches the light
    g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(xl(BOT), BOT); g.quadraticCurveTo(180, BOT + 10, xr(BOT), BOT); g.stroke();
    return c.toDataURL('image/png');
  }

  (function glassBits() {
    const r = rng(31);
    let b = '';
    // a few bubbles still rising, small and faint over the painted glass
    for (let i = 0; i < 60; i++) {
      const lane = 70 + ((i % 8) / 7) * 220 + (r() - 0.5) * 14;
      b += `<circle class="bub" cx="${lane.toFixed(0)}" cy="${(140 + r() * 490).toFixed(0)}" r="${(0.6 + Math.pow(r(), 2.5) * 1.8).toFixed(1)}" fill="none" stroke="#fff3d0" stroke-opacity=".75" stroke-width=".7" style="--t:${(2.4 + r() * 2.5).toFixed(1)}s;--d:${(-r() * 5).toFixed(1)}s;--dx:${((r() - 0.5) * 8).toFixed(0)}px"/>`;
    }
    $('#glass').innerHTML =
      `<image href="${paintGlass()}" x="-20" y="-120" width="400" height="840"/>` +
      `<clipPath id="g-liquid"><polygon points="15,66 345,66 315,636 45,636"/></clipPath>` +
      `<g clip-path="url(#g-liquid)">${b}</g>`;

    // wet tabletop: flat puddles that catch the light, scattered droplets, a few ice cubes
    let w = '';
    for (let i = 0; i < 70; i++) {
      const x = r() * 1000, y = 20 + Math.pow(r(), 1.5) * 240, rx = 2 + Math.pow(r(), 3) * 26, ry = rx * (0.25 + r() * 0.15);
      w += `<ellipse cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" fill="#ff8aa0" fill-opacity=".08" stroke="#fff" stroke-opacity=".35" stroke-width="1"/>` +
        `<ellipse cx="${(x - rx * 0.3).toFixed(0)}" cy="${(y - ry * 0.3).toFixed(0)}" rx="${(rx * 0.3).toFixed(1)}" ry="${(ry * 0.25).toFixed(1)}" fill="#fff" fill-opacity=".7"/>`;
    }
    $('.wet').innerHTML = w;
    $('.tableIce').innerHTML = cube(90, 150, 110, 92, -24, r) + cube(905, 170, 120, 100, 18, r) + cube(520, 230, 90, 76, 40, r);

    const tabs = [[120, 70, -20], [330, 120, 35], [640, 60, 160], [820, 130, -60]];
    $('.tabs').innerHTML = tabs.map(([x, y, a]) =>
      `<g transform="translate(${x} ${y}) rotate(${a}) scale(2.2)">` +
      `<rect x="-14" y="-8" width="28" height="16" rx="8" fill="url(#c-silver)" stroke="#3a3d42"/>` +
      `<rect x="-4" y="-4" width="12" height="8" rx="4" fill="#0b0b0d"/>` +
      `<circle cx="-8" cy="0" r="2" fill="#3a3d42"/></g>`).join('');
  })();

  (function grain() {
    const c = document.createElement('canvas');
    c.width = c.height = 160;
    const g = c.getContext('2d'), img = g.createImageData(160, 160);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() * 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    $('#grain').style.backgroundImage = `url(${c.toDataURL()})`;
  })();

  /* ================================================================
     Layout: scale the 1000×1600 world to the viewport
     ================================================================ */

  const cv = $('#fx'), cx = cv.getContext('2d');
  let W = 0, H = 0, S = 1, DPR = 1;

  function layout() {
    W = innerWidth; H = innerHeight;
    S = Math.min(W / 800, H / 1500);
    world.style.transform = `translate(${(W - 1000 * S) / 2}px, ${(H - 1600 * S) / 2}px) scale(${S})`;
    DPR = Math.min(devicePixelRatio || 1, 2);
    cv.width = W * DPR; cv.height = H * DPR;
    cx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  // Out-of-focus lights behind the set, like shooting on a long lens
  function drawBokeh() {
    const c = $('#bokeh'), g = c.getContext('2d'), d = Math.min(devicePixelRatio || 1, 2);
    const bw = innerWidth * 1.08, bh = innerHeight * 1.08;
    c.width = bw * d; c.height = bh * d;
    g.setTransform(d, 0, 0, d, 0, 0);
    const r = rng(77), cols = ['255,96,80', '255,176,80', '255,58,96', '255,226,196', '255,130,60'];
    const unit = Math.max(bw, bh) / 1200;
    for (let i = 0; i < 52; i++) {
      const x = r() * bw, y = Math.pow(r(), 1.3) * bh * 0.9, rad = (12 + Math.pow(r(), 2.2) * 95) * unit;
      const col = cols[(r() * cols.length) | 0], a = 0.05 + r() * 0.2;
      g.filter = `blur(${(rad * (0.04 + r() * 0.12)).toFixed(1)}px)`;
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, `rgba(${col},${(a * 0.6).toFixed(3)})`);
      gr.addColorStop(0.82, `rgba(${col},${a.toFixed(3)})`);
      gr.addColorStop(0.94, `rgba(${col},${(a * 1.3).toFixed(3)})`);
      gr.addColorStop(1, `rgba(${col},0)`);
      g.fillStyle = gr;
      g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fill();
    }
    g.filter = 'none';
  }
  addEventListener('resize', () => { layout(); drawBokeh(); });
  layout();
  drawBokeh();

  /* ================================================================
     Audio: unlock, synthesized music bed and sound effects
     ================================================================ */

  let AC = null, master = null, noiseBuf = null, soundOn = true;

  function ac() {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    if (!AC) {
      try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
      AC = new Ctx();
      const comp = AC.createDynamicsCompressor();
      master = AC.createGain();
      master.gain.value = soundOn ? 0.7 : 0;
      master.connect(comp).connect(AC.destination);
      noiseBuf = AC.createBuffer(1, AC.sampleRate * 2, AC.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (AC.state !== 'running') {
      AC.resume().catch(() => {});
      const src = AC.createBufferSource();
      src.buffer = AC.createBuffer(1, 1, 22050);
      src.connect(AC.destination);
      src.start(0);
    }
    return AC;
  }

  function canPlay() {
    if (!soundOn || !AC || AC.state === 'closed') return false;
    if (AC.state !== 'running') AC.resume().catch(() => {});
    return true;
  }

  ['pointerdown', 'touchend', 'click', 'keydown'].forEach((ev) =>
    addEventListener(ev, () => { if (soundOn && (!AC || AC.state !== 'running')) ac(); }, { capture: true, passive: true })
  );

  const soundBtn = $('#sound');
  soundBtn.addEventListener('click', () => {
    soundOn = !soundOn;
    soundBtn.textContent = soundOn ? '🔊 Lyd: PÅ' : '🔇 Lyd: AV';
    soundBtn.setAttribute('aria-pressed', String(soundOn));
    if (soundOn) ac();
    if (master) master.gain.setTargetAtTime(soundOn ? 0.7 : 0, AC.currentTime, 0.05);
  });

  function env(g, t, a, peak, d) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }

  function noise(t, dur, filterType, freq, q, peak, attack, out = master) {
    const src = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
    src.buffer = noiseBuf;
    f.type = filterType; f.frequency.value = freq; if (q) f.Q.value = q;
    env(g, t, attack, peak, dur);
    src.connect(f).connect(g).connect(out);
    src.start(t, Math.random() * 1.5, attack + dur + 0.05);
    return f;
  }

  function tone(t, type, f0, f1, dur, peak, attack = 0.005, out = master) {
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    env(g, t, attack, peak, dur);
    o.connect(g).connect(out);
    o.start(t); o.stop(t + attack + dur + 0.05);
    return o;
  }

  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

  /* --- music bed: Am – F – C – G at 104 bpm --- */
  const Music = { section: 'off', step: 0, next: 0, timer: 0, bus: null, lp: null };
  const SIX = 60 / 104 / 4;
  const CHORDS = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]];

  function musicStart() {
    if (!AC || Music.timer) return;
    Music.bus = AC.createGain();
    Music.bus.gain.value = 0.5;
    Music.lp = AC.createBiquadFilter();
    Music.lp.type = 'lowpass';
    Music.lp.frequency.value = 2500;
    Music.bus.connect(Music.lp).connect(master);
    Music.next = AC.currentTime + 0.08;
    Music.step = 0;
    Music.timer = setInterval(musicTick, 25);
  }

  function musicSet(sec) {
    Music.section = sec;
    if (!Music.lp) return;
    const t = AC.currentTime, f = Music.lp.frequency;
    const target = sec === 'sad' ? 520 : sec === 'intro' ? 2500 : sec === 'build' ? 7000 : 18000;
    f.cancelScheduledValues(t);
    f.setValueAtTime(f.value, t);
    f.exponentialRampToValueAtTime(target, t + (sec === 'sad' ? 2.5 : 0.6));
  }

  function musicTick() {
    if (!AC) return;
    if (Music.next < AC.currentTime) Music.next = AC.currentTime + 0.02;
    while (Music.next < AC.currentTime + 0.15) {
      musicStep(Music.step, Music.next);
      Music.next += SIX;
      Music.step++;
    }
  }

  function musicStep(st, t) {
    const sec = Music.section;
    if (sec === 'off' || !soundOn) return;
    const s = st % 16, bar = Math.floor(st / 16), ch = CHORDS[bar % 4], out = Music.bus;
    if (s === 0) pad(t, ch, sec === 'sad' ? 0.05 : 0.07);
    if (sec === 'sad') { if (s === 0 || s === 10) pluck(t, ch[bar % 3] + 12, 0.05); return; }
    if (sec === 'intro') {
      if (s === 0 || s === 10) kick(t, 0.5);
      if (s % 4 === 2) noise(t, 0.04, 'highpass', 8000, 0, 0.03, 0.002, out);
      return;
    }
    if (s % 4 === 0) kick(t, 0.75);
    if (sec === 'drop') {
      if (s === 4 || s === 12) noise(t, 0.16, 'bandpass', 1600, 0.8, 0.35, 0.002, out);
      if (s % 2 === 1) noise(t, 0.035, 'highpass', 8000, 0, 0.06, 0.002, out);
      if (s % 4 === 2) noise(t, 0.18, 'highpass', 7000, 0, 0.08, 0.002, out);
      if (s % 2 === 0) bass(t, ch[0] - 24, 0.22);
      if (s === 14 || s === 7) pluck(t, ch[(s >> 2) % 3] + 12, 0.06);
    } else {
      if (s % 4 === 2) noise(t, 0.04, 'highpass', 8000, 0, 0.06, 0.002, out);
      if (s === 0 || s === 6 || s === 10) bass(t, ch[0] - 24, 0.18);
      if (s === 12) noise(t, 0.14, 'bandpass', 1600, 0.8, 0.18, 0.002, out);
    }
  }

  function kick(t, v) { tone(t, 'sine', 150, 42, 0.32, v, 0.003, Music.bus); }

  function bass(t, m, v) {
    const o = AC.createOscillator(), f = AC.createBiquadFilter(), g = AC.createGain();
    o.type = 'sawtooth'; o.frequency.value = mtof(m);
    f.type = 'lowpass'; f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(180, t + 0.2);
    env(g, t, 0.005, v, 0.22);
    o.connect(f).connect(g).connect(Music.bus);
    o.start(t); o.stop(t + 0.3);
  }

  function pluck(t, m, v) { tone(t, 'triangle', mtof(m), mtof(m), 0.6, v, 0.004, Music.bus); }

  function pad(t, notes, v) {
    const len = 16 * SIX;
    const f = AC.createBiquadFilter(), g = AC.createGain();
    f.type = 'lowpass'; f.frequency.value = 1300;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.5);
    g.gain.setValueAtTime(v, t + len - 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len + 0.4);
    f.connect(g).connect(Music.bus);
    notes.forEach((m) => [-7, 7].forEach((det) => {
      const o = AC.createOscillator();
      o.type = 'sawtooth'; o.frequency.value = mtof(m); o.detune.value = det;
      o.connect(f); o.start(t); o.stop(t + len + 0.5);
    }));
  }

  /* --- sound effects --- */
  const sfx = {
    whoosh() {
      if (!canPlay()) return;
      const t = AC.currentTime, f = noise(t, 0.55, 'bandpass', 400, 1.2, 0.35, 0.18);
      f.frequency.setValueAtTime(350, t);
      f.frequency.exponentialRampToValueAtTime(2600, t + 0.3);
      f.frequency.exponentialRampToValueAtTime(500, t + 0.7);
    },
    ice() {
      if (!canPlay()) return;
      const t = AC.currentTime;
      for (let i = 0; i < 9; i++) {
        const ti = t + i * rand(0.025, 0.07);
        noise(ti, 0.03, 'bandpass', rand(2500, 6000), 4, 0.25, 0.001);
        tone(ti, 'sine', rand(2800, 5200), rand(2600, 5000), 0.09, 0.05);
      }
    },
    psst() {
      if (!canPlay()) return;
      const t = AC.currentTime;
      tone(t, 'square', 1400, 900, 0.03, 0.12);
      const f = noise(t + 0.02, 0.7, 'highpass', 6000, 0, 0.45, 0.01);
      f.frequency.exponentialRampToValueAtTime(2500, t + 0.7);
    },
    glug(ms) {
      if (!canPlay()) return;
      const t = AC.currentTime;
      for (let i = 0; i * 0.15 < ms / 1000; i++) {
        const ti = t + i * 0.15 + rand(-0.02, 0.02);
        tone(ti, 'sine', rand(150, 210), rand(90, 120), 0.1, 0.22, 0.01);
        noise(ti, 0.12, 'lowpass', 700, 0, 0.18, 0.01);
      }
      noise(t, ms / 1000, 'bandpass', 1800, 0.6, 0.08, 0.2);
    },
    fizz(ms) {
      if (!canPlay()) return;
      noise(AC.currentTime, ms / 1000, 'highpass', 5000, 0, 0.3, 0.03);
    },
    boom() {
      if (!canPlay()) return;
      const t = AC.currentTime;
      tone(t, 'sine', 140, 28, 1.1, 1, 0.01);
      const f = noise(t, 1.3, 'lowpass', 4000, 0, 0.6, 0.005);
      f.frequency.exponentialRampToValueAtTime(200, t + 1.2);
    },
    hit() {
      if (!canPlay()) return;
      const t = AC.currentTime;
      tone(t, 'sine', 110, 35, 0.6, 0.7, 0.005);
      noise(t, 0.5, 'lowpass', 2500, 0, 0.3, 0.003);
    },
    splash() {
      if (!canPlay()) return;
      const t = AC.currentTime;
      tone(t, 'sine', 120, 45, 0.35, 0.6, 0.003);
      const f = noise(t, 0.9, 'bandpass', 2400, 0.7, 0.55, 0.004);
      f.frequency.exponentialRampToValueAtTime(700, t + 0.8);
      noise(t + 0.05, 1.1, 'highpass', 5000, 0, 0.18, 0.05);
      for (let i = 0; i < 10; i++) tone(t + 0.15 + i * rand(0.04, 0.09), 'sine', rand(900, 2200), rand(700, 1600), 0.05, 0.05);
    },
    thud() {
      if (!canPlay()) return;
      const t = AC.currentTime;
      tone(t, 'sine', 95, 40, 0.3, 0.6);
      tone(t + 0.02, 'triangle', 900, 700, 0.25, 0.08);
      noise(t, 0.15, 'lowpass', 400, 0, 0.3, 0.003);
    },
    powerDown() {
      if (!canPlay()) return;
      const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain(), f = AC.createBiquadFilter();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(420, t);
      o.frequency.exponentialRampToValueAtTime(35, t + 2.2);
      f.type = 'lowpass'; f.frequency.setValueAtTime(2200, t); f.frequency.exponentialRampToValueAtTime(140, t + 2.2);
      g.gain.setValueAtTime(0.18, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
      o.connect(f).connect(g).connect(master);
      o.start(t); o.stop(t + 2.5);
    },
    blip(freq, v = 0.06) {
      if (!canPlay()) return;
      tone(AC.currentTime, 'square', freq, freq, 0.07, v, 0.003);
    },
  };

  /* ================================================================
     Liquid: drops, pour streams, splash crowns, cold vapour
     ================================================================ */

  const L = [];

  // Pre-rendered droplets: see-through amber body, dark refractive rim, bright lower crescent, sharp specular
  function sprite(core, edge, rim, foam = false) {
    const n = 64, r = n / 2, c = document.createElement('canvas');
    c.width = c.height = n;
    const g = c.getContext('2d');
    const body = g.createRadialGradient(r * 0.82, r * 0.78, r * 0.05, r, r, r);
    body.addColorStop(0, core);
    body.addColorStop(0.62, edge);
    body.addColorStop(0.88, rim);
    body.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = body;
    g.beginPath(); g.arc(r, r, r * 0.98, 0, Math.PI * 2); g.fill();
    if (!foam) {
      g.strokeStyle = 'rgba(255,240,200,.75)';
      g.lineWidth = n * 0.06;
      g.lineCap = 'round';
      g.beginPath(); g.arc(r, r, r * 0.74, Math.PI * 0.2, Math.PI * 0.8); g.stroke();
      const ca = g.createRadialGradient(r * 1.1, r * 1.38, 0, r * 1.1, r * 1.38, r * 0.5);
      ca.addColorStop(0, 'rgba(255,250,215,.7)');
      ca.addColorStop(1, 'rgba(255,250,215,0)');
      g.fillStyle = ca;
      g.beginPath(); g.arc(r, r, r * 0.9, 0, Math.PI * 2); g.fill();
    }
    g.fillStyle = 'rgba(255,255,255,.97)';
    g.beginPath(); g.ellipse(r * 0.66, r * 0.56, r * 0.2, r * 0.12, -0.6, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,255,255,.6)';
    g.beginPath(); g.arc(r * 1.32, r * 1.18, r * 0.06, 0, Math.PI * 2); g.fill();
    return c;
  }
  function mistSprite() {
    const c = document.createElement('canvas'); c.width = c.height = 32;
    const g = c.getContext('2d'), gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    gr.addColorStop(0, 'rgba(255,236,190,.9)'); gr.addColorStop(0.5, 'rgba(255,190,110,.45)'); gr.addColorStop(1, 'rgba(255,170,90,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
    return c;
  }
  const DRINK = [
    sprite('rgba(255,236,170,.55)', 'rgba(246,152,48,.8)', 'rgba(120,38,10,.92)'),
    sprite('rgba(255,224,150,.55)', 'rgba(238,124,50,.82)', 'rgba(116,30,16,.92)'),
    sprite('rgba(255,244,190,.5)', 'rgba(250,172,62,.78)', 'rgba(130,52,14,.9)'),
  ];
  // Clear water drop: almost invisible body, bright rim, dark refraction at the bottom, sharp specular
  function waterSprite() {
    const n = 64, r = n / 2, c = document.createElement('canvas');
    c.width = c.height = n;
    const g = c.getContext('2d');
    const body = g.createRadialGradient(r * 0.85, r * 0.8, r * 0.1, r, r, r);
    body.addColorStop(0, 'rgba(255,255,255,.12)');
    body.addColorStop(0.55, 'rgba(240,246,255,.22)');
    body.addColorStop(0.82, 'rgba(255,255,255,.8)');
    body.addColorStop(0.93, 'rgba(70,10,20,.55)');
    body.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = body;
    g.beginPath(); g.arc(r, r, r * 0.98, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = n * 0.05; g.lineCap = 'round';
    g.beginPath(); g.arc(r, r, r * 0.72, Math.PI * 0.15, Math.PI * 0.85); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.98)';
    g.beginPath(); g.ellipse(r * 0.66, r * 0.56, r * 0.2, r * 0.12, -0.6, 0, Math.PI * 2); g.fill();
    return c;
  }
  // Cold smoke: thin curling wisps, like the vapour off an ice-cold bottle
  function wispSprite(seed) {
    const r = rng(seed), w = 180, h = 360, c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    g.filter = 'blur(9px)';
    const ph = r() * 6, tw = 3 + r() * 2.5;
    for (let i = 0; i < 90; i++) {
      const t = i / 90, y = h * (0.94 - t * 0.88);
      const x = w / 2 + Math.sin(t * tw + ph) * w * 0.2 * (0.25 + t) + (r() - 0.5) * 5;
      const rad = (12 + t * 30) * (0.7 + r() * 0.6), a = 0.05 * (1 - t * 0.6);
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, `rgba(255,255,255,${a.toFixed(3)})`);
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr;
      g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fill();
    }
    g.filter = 'none';
    return c;
  }
  const WATER = waterSprite();
  const WISPS = [wispSprite(1), wispSprite(2), wispSprite(3), wispSprite(4), wispSprite(5)];
  const MIST = mistSprite();
  let lastFrame = 0;
  let pourCans = [];          // cans currently pouring into the bucket
  let streamOn = false;       // diagonal pour close-up

  // kind: 'drop' (energy drink), 'water' (clear splash water), 'mist' (fine spray that fades)
  function drop(x, y, vx, vy, r, kind = 'drop') {
    if (L.length > 1800) return;
    const img = kind === 'drop' ? pick(DRINK) : kind === 'water' ? WATER : MIST;
    const g = kind === 'mist' ? 0.25 : 1;
    const decay = kind === 'mist' ? 0.025 : 0;
    L.push({ x, y, vx, vy, r, fade: kind === 'mist', img, g, decay, life: 1 });
  }

  function centerOf(el) {
    const b = el.getBoundingClientRect();
    return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
  }

  function axis(canEl) {
    const m = centerOf($('.mouth', canEl)), c = centerOf(canEl);
    const dx = m.x - c.x, dy = m.y - c.y, len = Math.hypot(dx, dy) || 1;
    return { m, ux: dx / len, uy: dy / len };
  }

  function updateDrops(k) {
    const G = 0.9 * S;
    const rimR = current && current.id === 'sBucket' ? $('#rimMark').getBoundingClientRect() : null;
    for (let i = L.length - 1; i >= 0; i--) {
      const d = L[i];
      d.vy += d.g * G * k;
      if (d.g < 0.05) { d.vx *= 0.95; d.vy *= 0.95; }
      d.x += d.vx * k; d.y += d.vy * k;
      d.life -= d.decay * k;
      if (rimR && d.g > 0.5 && d.vy > 0 && d.y > rimR.top && d.x > rimR.left && d.x < rimR.right) {
        if (!d.fade && Math.random() < 0.25) {
          for (let j = 0; j < 2; j++) drop(d.x, rimR.top - 2, rand(-2, 2) * S * 2, -rand(2, 6) * S * 2, rand(1.2, 3) * S);
        }
        L.splice(i, 1);
        continue;
      }
      if (d.y > H + 40 || d.life <= 0 || d.x < -80 || d.x > W + 80) { L.splice(i, 1); continue; }
      if (rimR && d.fade && d.y > rimR.top + 6 && d.x > rimR.left && d.x < rimR.right) { L.splice(i, 1); continue; }
      const sp = Math.hypot(d.vx, d.vy) || 0.001;
      const len = d.r * 2 * (1 + Math.min(sp / (9 * S + 0.1), 1.6)), wid = d.r * 2 * (1 - Math.min(sp / (40 * S + 0.1), 0.25));
      const c = d.vx / sp, sn = d.vy / sp;
      cx.globalAlpha = d.fade ? Math.max(Math.min(d.life * 1.5, 1), 0) : d.img === WATER ? 0.95 : 0.8;
      cx.setTransform(DPR * c * len, DPR * sn * len, -DPR * sn * wid, DPR * c * wid, DPR * d.x, DPR * d.y);
      cx.drawImage(d.img, -0.5, -0.5, 1, 1);
    }
    cx.setTransform(DPR, 0, 0, DPR, 0, 0);
    cx.globalAlpha = 1;
  }

  // A pour stream as a glossy tube: overlapping droplet sprites along a ballistic path
  function streamPath(m, ux, uy, v0, stopY, now, seed) {
    const g = 0.9 * S, pts = [];
    for (let t = 0; t < 90; t += 0.5) {
      const amp = Math.min(t, 22) * 0.1 * S;
      const wob = Math.sin(t * 0.18 - now * 0.008 + seed) * amp + Math.sin(t * 0.6 - now * 0.02 + seed) * 0.5 * S;
      const x = m.x + ux * v0 * t - uy * wob, y = m.y + uy * v0 * t + 0.5 * g * t * t + ux * wob;
      pts.push([x, y]);
      if (y > stopY || y > H + 60 || x < -80 || x > W + 80) break;
    }
    return pts;
  }

  /* The stream is a flowing texture, not drawn lines. A long "photo" of a pour is painted once:
     amber body that is dark where the edges refract, a soft golden core, long uneven streaks of light
     and shade, a broken specular highlight and fizz bubbles. It is mapped segment by segment along
     the stream's path and scrolled at the speed of the liquid, so everything in it flows downstream. */
  const sl = document.createElement('canvas'), sx = sl.getContext('2d');
  const TU = 1024, TV = 128;
  const STREAM_TEX = (function streamTexture() {
    const r = rng(73), c = document.createElement('canvas');
    c.width = TU * 2; c.height = TV;
    const g = c.getContext('2d');
    const t = document.createElement('canvas'); t.width = TU; t.height = TV;
    const q = t.getContext('2d');
    let gr = q.createLinearGradient(0, 0, 0, TV);
    [[0, 'rgb(84,20,2)'], [0.06, 'rgb(170,70,14)'], [0.18, 'rgb(230,128,34)'], [0.34, 'rgb(250,168,58)'],
     [0.5, 'rgb(255,192,86)'], [0.66, 'rgb(250,170,62)'], [0.82, 'rgb(226,120,30)'], [0.94, 'rgb(160,60,12)'], [1, 'rgb(76,18,2)']]
      .forEach(([o, col]) => gr.addColorStop(o, col));
    q.fillStyle = gr; q.fillRect(0, 0, TU, TV);
    // everything below is drawn twice (x and x - TU) so the texture tiles seamlessly along the flow
    const both = (fn) => { fn(0); fn(-TU); fn(TU); };
    const streak = (x, y, len, h, col, blur) => both((o) => {
      q.filter = `blur(${blur}px)`; q.fillStyle = col;
      q.beginPath(); q.ellipse(x + o, y, len / 2, h / 2, 0, 0, Math.PI * 2); q.fill();
    });
    // long streaks of light and shade, like the twisting surface of a real pour
    for (let i = 0; i < 140; i++) {
      const light = r() < 0.6, y = TV * (0.1 + r() * 0.8);
      streak(r() * TU, y, 80 + r() * 420, 1 + r() * 6,
        light ? `rgba(255,236,190,${(0.08 + r() * 0.2).toFixed(2)})` : `rgba(110,34,0,${(0.05 + r() * 0.13).toFixed(2)})`, 1.5 + r() * 3);
    }
    // broad soft sheen on the lit side and a faint bounce on the far side
    streak(TU / 2, TV * 0.3, TU * 3, TV * 0.22, 'rgba(255,246,220,.22)', 10);
    streak(TU / 2, TV * 0.5, TU * 3, TV * 0.3, 'rgba(255,214,120,.25)', 12);
    streak(TU / 2, TV * 0.76, TU * 3, TV * 0.08, 'rgba(255,230,180,.1)', 6);
    // the specular highlight: bright, sharp, broken up where the surface twists
    for (let x = 0; x < TU;) {
      const len = 30 + r() * 220, y = TV * (0.235 + (r() - 0.5) * 0.04);
      streak(x + len / 2, y, len, 3 + r() * 3, `rgba(255,255,255,${(0.75 + r() * 0.25).toFixed(2)})`, 0.7);
      streak(x + len / 2, y + 3, len * 0.8, 6, 'rgba(255,250,235,.18)', 3);
      x += len + 4 + r() * 50;
    }
    for (let x = 0; x < TU;) {
      const len = 20 + r() * 120;
      streak(x + len / 2, TV * 0.8, len, 1.4, `rgba(255,240,210,${(0.2 + r() * 0.3).toFixed(2)})`, 0.8);
      x += len + 30 + r() * 140;
    }
    q.filter = 'none';
    // fizz carried in the drink
    for (let i = 0; i < 340; i++) {
      const x = r() * TU, y = TV * (0.14 + r() * 0.72), rad = 0.5 + Math.pow(r(), 3) * 2.4;
      both((o) => {
        q.strokeStyle = 'rgba(110,40,0,.45)'; q.lineWidth = 0.5;
        q.beginPath(); q.arc(x + o, y, rad, 0, Math.PI * 2); q.stroke();
        q.fillStyle = 'rgba(255,248,222,.85)';
        q.beginPath(); q.arc(x + o - rad * 0.3, y - rad * 0.3, rad * 0.45, 0, Math.PI * 2); q.fill();
      });
    }
    g.drawImage(t, 0, 0); g.drawImage(t, TU, 0);
    return c;
  })();

  function drawTube(pts, w, now, seed = 0, k = 1, flow = 1) {
    const n = pts.length;
    if (n < 2) return;
    if (sl.width !== cv.width || sl.height !== cv.height) { sl.width = cv.width; sl.height = cv.height; }
    sx.setTransform(1, 0, 0, 1, 0, 0);
    sx.clearRect(0, 0, sl.width, sl.height);

    // edges: thickness swells and thins slowly as it travels down
    const Lp = [], Rp = [];
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(i - 1, 0)], b = pts[Math.min(i + 1, n - 1)];
      let tx = b[0] - a[0], ty = b[1] - a[1];
      const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
      const t = i * 0.5, neck = Math.min(1, 0.74 + t * 0.06);
      const ww = w * neck * (1 + t * 0.004) * (0.93 + 0.05 * Math.sin(t * 0.45 - now * 0.012 + seed) + 0.025 * Math.sin(t * 1.3 - now * 0.021 + seed * 3));
      Lp.push([pts[i][0] - ty * ww / 2, pts[i][1] + tx * ww / 2]);
      Rp.push([pts[i][0] + ty * ww / 2, pts[i][1] - tx * ww / 2]);
    }

    // map the texture onto the stream, one quad per segment, scrolling with the flow
    const pxPerTex = w / TV;                           // screen px per texture px
    let u = ((seed * 977 - now * flow * S / pxPerTex) % TU + TU) % TU;   // start offset; features flow downstream
    for (let i = 0; i < n - 1; i++) {
      const p0 = pts[i], p1 = pts[i + 1];
      const segLen = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
      if (segLen < 0.01) continue;
      const du = segLen / pxPerTex;
      const ax = (Lp[i + 1][0] + Rp[i + 1][0]) / 2 - (Lp[i][0] + Rp[i][0]) / 2;
      const ay = (Lp[i + 1][1] + Rp[i + 1][1]) / 2 - (Lp[i][1] + Rp[i][1]) / 2;
      const bx = Rp[i][0] - Lp[i][0], by = Rp[i][1] - Lp[i][1];
      sx.setTransform(DPR * ax, DPR * ay, DPR * bx, DPR * by, DPR * Lp[i][0], DPR * Lp[i][1]);
      // each slice runs on a little past its end with the continuing texture, so the next slice
      // covers the anti-aliased seam instead of leaving a hairline gap
      sx.drawImage(STREAM_TEX, u, 0, du * 1.6, TV, 0, 0, 1.6, 1);
      u += du; if (u >= TU) u -= TU;
    }
    sx.setTransform(1, 0, 0, 1, 0, 0);

    // composite a touch see-through, softened like a lens would
    cx.save();
    cx.setTransform(1, 0, 0, 1, 0, 0);
    cx.globalAlpha = 0.9;
    cx.filter = `blur(${Math.max(0.4, w * 0.006).toFixed(2)}px)`;
    cx.drawImage(sl, 0, 0);
    cx.restore();
  }

  // Where a stream lands: a crown of drink and water droplets plus fine mist
  function splashAt(x, y, k, power) {
    for (let j = 0; j < 4 * K * k; j++) {
      const a = -Math.PI / 2 + rand(-1.1, 1.1), sp = rand(2, 7) * S * 2 * power;
      drop(x + rand(-8, 8) * S, y - 2, Math.cos(a) * sp, Math.sin(a) * sp, rand(1.4, 4.5) * S, Math.random() < 0.35 ? 'water' : 'drop');
    }
    for (let j = 0; j < 3 * K * k; j++) drop(x + rand(-12, 12) * S, y - 4, rand(-2, 2) * S, -rand(1, 5) * S, rand(1.5, 3) * S, 'mist');
  }

  /* --- High-speed-photography splash: a curtain of droplets thrown up on both sides,
         fine spray and a few heavy drops. Played in slow motion (see slowmo). --- */
  // Real splashes are mostly fine droplets with a few big ones
  const dsz = (min, max) => (min + Math.pow(Math.random(), 3) * (max - min)) * S * 2;

  function crown(x, y, cw, big = 1, drink = 0) {
    const n = 260 * K;
    for (const side of [-1, 1]) {
      for (let j = 0; j < n; j++) {
        const t = j / n, a = -Math.PI / 2 + side * (0.3 + t * 0.95 + rand(-0.05, 0.05));
        const sp = (15 - t * 6) * S * 2 * big * rand(0.88, 1.06);
        drop(x + side * cw * (0.32 + t * 0.22) + rand(-4, 4) * S, y + rand(-4, 4) * S,
          Math.cos(a) * sp, Math.sin(a) * sp, dsz(1, 5) * big, Math.random() < drink ? 'drop' : 'water');
      }
    }
    for (let j = 0; j < 260 * K; j++) {
      const a = -Math.PI / 2 + rand(-1.35, 1.35), sp = rand(4, 22) * S * 2 * big;
      drop(x + rand(-cw, cw) * 0.5, y, Math.cos(a) * sp, Math.sin(a) * sp, dsz(0.6, 2.4), Math.random() < drink ? 'drop' : 'water');
    }
    for (let j = 0; j < 10 * K; j++) {
      const a = -Math.PI / 2 + rand(-1, 1), sp = rand(6, 14) * S * 2 * big;
      drop(x + rand(-cw, cw) * 0.4, y, Math.cos(a) * sp, Math.sin(a) * sp, rand(4, 7) * S * 2 * big, Math.random() < drink ? 'drop' : 'water');
    }
  }

  // Drink and water flung around the can, like a product splash shot
  function swirlAround(el) {
    const b = el.getBoundingClientRect(), ox = b.left + b.width / 2, oy = b.top + b.height * 0.55;
    for (let j = 0; j < 380 * K; j++) {
      const a = rand(0, Math.PI * 2), rx = b.width * rand(0.55, 1.1), ry = b.height * rand(0.18, 0.4);
      const x = ox + Math.cos(a) * rx, y = oy + Math.sin(a) * ry;
      const sp = rand(5, 13) * S * 2;
      drop(x, y, -Math.sin(a) * sp * 1.4, Math.cos(a) * sp * 0.4 - rand(6, 14) * S * 2, dsz(0.7, 5.5), Math.random() < 0.3 ? 'drop' : 'water');
    }
  }

  // Global time scale for liquid: < 1 = slow motion
  let slowmo = 1, slowT0 = 0, slowHold = 0, slowRamp = 0, slowMin = 1;
  function setSlowmo(min, hold, ramp) { slowMin = min; slowT0 = performance.now(); slowHold = hold; slowRamp = ramp; }
  function slowNow(now) {
    const t = now - slowT0;
    if (t < slowHold) return slowMin;
    if (t < slowHold + slowRamp) return slowMin + (1 - slowMin) * ((t - slowHold) / slowRamp);
    return 1;
  }

  /* --- Cold smoke curling off ice and the chilled can (Heineken / MAC style) --- */
  const VAP = [];
  function vapourFrom(x0, x1, y, rate, k, a = 1, scale = 1, decay = 0.0045) {
    for (let i = 0; i < rate * K * k; i++) {
      if (VAP.length > 90) return;
      VAP.push({ img: pick(WISPS), x: rand(x0, x1), y, vx: rand(-0.25, 0.25) * S, vy: -rand(0.25, 0.7) * S,
        s: rand(0.6, 1.15) * S * 2 * scale, gs: 0.0016 * S * 2 * scale, rot: rand(-0.35, 0.35), vr: rand(-0.0025, 0.0025),
        life: 1, a: rand(0.55, 1) * a, decay });
    }
  }
  function drawVapour(k) {
    cx.globalCompositeOperation = 'screen';
    for (let i = VAP.length - 1; i >= 0; i--) {
      const v = VAP[i];
      v.x += v.vx * k; v.y += v.vy * k; v.s += v.gs * k; v.rot += v.vr * k; v.life -= v.decay * k;
      if (v.life <= 0) { VAP.splice(i, 1); continue; }
      const w = v.img.width * v.s, h = v.img.height * v.s;
      cx.globalAlpha = Math.sin(v.life * Math.PI) * v.a;
      cx.setTransform(DPR * Math.cos(v.rot), DPR * Math.sin(v.rot), -DPR * Math.sin(v.rot), DPR * Math.cos(v.rot), DPR * v.x, DPR * v.y);
      cx.drawImage(v.img, -w / 2, -h, w, h);
    }
    cx.setTransform(DPR, 0, 0, DPR, 0, 0);
    cx.globalAlpha = 1;
    cx.globalCompositeOperation = 'source-over';
  }

  function sceneVapour(k) {
    if (!current || document.body.classList.contains('dim')) return;
    const id = current.id;
    if (id === 'sBucket') {
      const r = $('#rimMark').getBoundingClientRect();
      vapourFrom(r.left + r.width * 0.1, r.right - r.width * 0.1, r.top + 6 * S, 0.06, k, 0.7);
    } else if (id === 'sSplash') {
      const b = $('#splashCan').getBoundingClientRect();
      vapourFrom(b.left - b.width * 0.8, b.right + b.width * 0.8, b.bottom - b.height * 0.08, 0.1, k, 0.8, 1.3);
    } else if (id === 'sPack') {
      const { m } = axis(packCan), g = $('#glass').getBoundingClientRect();
      vapourFrom(m.x - 24 * S, m.x + 24 * S, m.y + 4 * S, 0.03, k, 0.5, 0.4, 0.011);
      vapourFrom(g.left + g.width * 0.25, g.right - g.width * 0.25, g.top + 4 * S, 0.02, k, 0.4, 0.4, 0.011);
    }
  }

  function drawPours(now, k) {
    const rim = $('#rimMark').getBoundingClientRect();
    pourCans.forEach((canEl, i) => {
      const { m, ux, uy } = axis(canEl);
      const pts = streamPath(m, ux, uy, 3.2 * S, rim.top, now, i * 2.1);
      drawTube(pts, 30 * S, now, i * 2.1, k, 0.45);
      const end = pts[pts.length - 1];
      splashAt(end[0], rim.top, k, 1);
    });
  }

  function drawStream(now) {
    const { m, ux, uy } = axis($('#sPour .pourCan'));
    const pts = streamPath(m, ux, uy, 17 * S, H + 80, now, 0);
    const w = 104 * S;
    drawTube(pts, w, now, 7, 1, 1);
    // a few drops peel off the edges of the stream
    for (let i = 0; i < 2 * K; i++) {
      const p = pts[(rand(0.2, 1) * (pts.length - 1)) | 0];
      drop(p[0] + rand(-w, w) * 0.45, p[1], ux * 17 * S * rand(0.6, 1.05), uy * 10 * S + rand(-2, 2) * S, rand(2, 6) * S);
    }
  }

  function frame(now) {
    const k = lastFrame ? Math.min((now - lastFrame) / 16.7, 4) : 1;
    lastFrame = now;
    slowmo = slowNow(now);
    const kl = k * slowmo;
    cx.clearRect(0, 0, W, H);
    sceneVapour(k);
    drawVapour(k);
    if (streamOn) drawStream(now);
    if (pourCans.length) drawPours(now, kl);
    updateDrops(kl);
    syncReflections();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  /* ================================================================
     Direction helpers: poses, cuts, camera, titles, panels
     ================================================================ */

  const canA = $('#canA'), canB = $('#canB'), packCan = $('#packCan');
  const splashCan = $('#splashCan');
  const HOME = new Map([[canA, { x: 0, y: 0, r: -7 }], [canB, { x: 0, y: 0, r: 5 }], [packCan, { x: 0, y: 0, r: 0 }], [splashCan, { x: 0, y: 0, r: -3 }]]);

  // Mirror images on the wet tabletop (Bloom-style). The can's reflection follows its pose every frame.
  const reflCan = document.createElement('div');
  reflCan.className = 'reflect rCan';
  reflCan.innerHTML = canSVG('pack');
  packCan.before(reflCan);
  const reflGlass = $('#glass').cloneNode(true);
  reflGlass.removeAttribute('id');
  reflGlass.classList.add('reflect', 'rGlass');
  $('#glass').before(reflGlass);

  function syncReflections() {
    if (!current || current.id !== 'sPack') return;
    const t = getComputedStyle(packCan).transform;
    reflCan.style.transform = 'scaleY(-1)' + (t && t !== 'none' ? ' ' + t : '');
  }
  const tf = (p) => `translate(${p.x}px, ${p.y}px) rotate(${p.r}deg)`;

  function setPose(el, p) {
    el.getAnimations().forEach((a) => a.cancel());
    el.style.transform = tf(p);
  }

  function moveTo(el, frames, ms, easing = 'cubic-bezier(.45,0,.2,1)') {
    const list = (Array.isArray(frames) ? frames : [frames]);
    const kf = [{ transform: el.style.transform || 'none' }, ...list.map((p) => ({ transform: tf(p), offset: p.o }))];
    const a = el.animate(kf, { duration: RM ? ms * 0.6 : ms, easing, fill: 'forwards' });
    return a.finished.then(() => { el.style.transform = tf(list[list.length - 1]); a.cancel(); }).catch(() => {});
  }

  let current = null, camAnim = null;

  function cut(id, dur = 420) {
    const next = $('#' + id), prev = current;
    sfx.whoosh();
    if (prev && prev !== next) {
      prev.animate([{ opacity: 1 }, { opacity: 0 }], { duration: dur, easing: 'ease-in-out' })
        .finished.then(() => prev.classList.remove('on')).catch(() => {});
    }
    next.classList.add('on');
    next.animate([{ opacity: 0 }, { opacity: 1 }], { duration: dur, easing: 'ease-in-out' });
    current = next;
  }

  function cam(from, to, ms, easing = 'ease-in-out') {
    if (camAnim) camAnim.cancel();
    camAnim = camera.animate([{ transform: from }, { transform: to }], { duration: RM ? 1 : ms, easing, fill: 'forwards' });
    return camAnim;
  }

  const t1 = $('#titles .t1'), t2 = $('#titles .t2');
  function title(el) { el.classList.remove('out'); el.classList.remove('in'); void el.offsetWidth; el.classList.add('in'); }
  function hideTitles() { [t1, t2].forEach((el) => { if (el.classList.contains('in')) el.classList.add('out'); }); }
  function clearTitles() { [t1, t2].forEach((el) => el.classList.remove('in', 'out')); }

  function show(id) { $$('.panel').forEach((p) => p.classList.toggle('show', p.id === id)); }

  // The can's "=" bars are the battery meter: paint over them as it drains, red when nearly empty
  function setLevel(el, v) {
    const f = Math.max(0, Math.min(v, 100)) / 100;
    $$('.cover', el).forEach((r, i) => { const b = BARS[i]; r.setAttribute('x', b.x + b.w * f); r.setAttribute('width', b.w * (1 - f)); });
    $$('.lvl', el).forEach((r, i) => r.setAttribute('width', v < 20 ? BARS[i].w * f : 0));
    $$('.outline', el).forEach((r) => r.setAttribute('opacity', f < 0.99 ? 1 : 0));
    el.classList.toggle('low', v < 20);
  }

  function tweenLevel(el, from, to, ms, tick) {
    const t0 = performance.now();
    let last = -1;
    return new Promise((res) => {
      (function step(now) {
        const k = Math.min((now - t0) / ms, 1), v = from + (to - from) * (1 - Math.pow(1 - k, 3));
        setLevel(el, v);
        if (tick && Math.floor(v / 10) !== last) { last = Math.floor(v / 10); tick(v); }
        if (k < 1) requestAnimationFrame(step); else res();
      })(t0);
    });
  }

  /* ================================================================
     The film
     ================================================================ */

  let busy = false;
  const iceFront = $('.ice.front'), iceBack = $('.ice.back');

  function resetAll() {
    document.body.classList.remove('dim', 'party');
    $$('.scene').forEach((s) => { s.classList.remove('on'); s.getAnimations().forEach((a) => a.cancel()); });
    current = null;
    HOME.forEach((p, el) => setPose(el, p));
    [canA, canB, packCan, reflCan].forEach((el) => setLevel(el, 100));
    iceFront.classList.remove('jostle'); iceBack.classList.remove('jostle');
    if (camAnim) camAnim.cancel();
    camera.style.transform = '';
    clearTitles();
    show(null);
    L.length = 0; VAP.length = 0;
    pourCans = []; streamOn = false; slowT0 = 0; slowHold = 0; slowRamp = 0;
    $$('.icePile').forEach((el) => el.classList.remove('jostle'));
    ['#againBtn', '#retryBtn'].forEach((b) => $(b).classList.remove('ready'));
  }

  function jostle() {
    [iceFront, iceBack].forEach((el) => { el.classList.remove('jostle'); void el.getBoundingClientRect(); el.classList.add('jostle'); });
    sfx.ice();
  }

  async function film() {
    busy = true;
    resetAll();
    musicSet('intro');

    // 1 · Hero: ice bucket, slow push-in
    cut('sBucket', 700);
    cam('scale(1)', 'scale(1.07) translateY(1%)', 3200);
    await sleep(2300);

    // Lift both cans out of the ice
    musicSet('build');
    jostle();
    await Promise.all([
      moveTo(canA, { x: -10, y: -380, r: -4 }, 1200, 'cubic-bezier(.45,0,.25,1)'),
      moveTo(canB, { x: 10, y: -400, r: 3 }, 1300, 'cubic-bezier(.45,0,.25,1)'),
    ]);
    for (const el of [canA, canB]) {
      const b = el.getBoundingClientRect();
      for (let i = 0; i < 6; i++) drop(b.left + b.width * rand(0.3, 0.7), b.bottom - 10, rand(-1, 1) * S, rand(0, 2) * S, rand(1.5, 3) * S);
    }

    // Flip them upside down and pour back into the bucket
    sfx.whoosh();
    cam('scale(1.07) translateY(1%)', 'scale(1.12) translateY(4%)', 2600);
    await Promise.all([
      moveTo(canA, { x: -50, y: -520, r: 152 }, 1100),
      moveTo(canB, { x: 60, y: -560, r: -146 }, 1150),
    ]);
    sfx.psst();
    pourCans = [canA, canB];
    sfx.glug(2100);
    await sleep(2100);
    pourCans = [];
    await sleep(250);

    // 2 · Macro: condensation on the label
    L.length = 0;
    cut('sMacro');
    const macro = $('.macroCan');
    macro.animate([{ transform: 'rotate(16deg) scale(1.05) translateY(4%)' }, { transform: 'rotate(11deg) scale(1.2) translateY(-5%)' }],
      { duration: 3600, easing: 'ease-in-out', fill: 'forwards' });
    if (camAnim) camAnim.cancel();
    await sleep(500);
    title(t1);
    await sleep(2700);

    // 3 · Diagonal pour close-up
    cut('sPour');
    $('.pourCan').animate([{ transform: 'rotate(118deg) translate(0, 0)' }, { transform: 'rotate(127deg) translate(-2%, -3%)' }],
      { duration: 3000, easing: 'ease-out', fill: 'forwards' });
    sfx.psst();
    streamOn = true;
    sfx.glug(2600);
    await sleep(2800);
    streamOn = false;

    // 4 · The can slams into crushed ice: splash crown, cold vapour, title
    hideTitles();
    cut('sSplash', 400);
    setPose(splashCan, { x: 0, y: -1500, r: -8 });
    cam('scale(1.04)', 'scale(1.1)', 3600, 'linear');
    await sleep(120);
    await moveTo(splashCan, { x: 0, y: 0, r: -3 }, 560, 'cubic-bezier(.5,0,1,.5)');
    {
      const b = splashCan.getBoundingClientRect();
      setSlowmo(0.22, 1500, 1500);
      crown(b.left + b.width / 2, b.bottom - b.height * 0.14, b.width, 1.1);
      const pile = $('.icePile.front');
      pile.classList.remove('jostle'); void pile.getBoundingClientRect(); pile.classList.add('jostle');
    }
    sfx.splash(); sfx.ice();
    musicSet('drop');
    sfx.hit();
    clearTitles();
    title(t2);
    moveTo(splashCan, { x: 0, y: 8, r: -3 }, 1600, 'cubic-bezier(.2,.7,.3,1)');
    await sleep(2600);
    clearTitles();

    // 5 · Packshot + question
    L.length = 0; VAP.length = 0;
    musicSet('build');
    cut('sPack', 600);
    cam('scale(1.06) translateY(1%)', 'scale(1)', 3000, 'cubic-bezier(.3,.6,.3,1)');
    await sleep(1000);
    resetChoices();
    show('question');
    busy = false;
  }

  function resetChoices() {
    $('#cbYes').checked = $('#cbNo').checked = false;
    $('#choices').classList.remove('locked');
    $$('.choice').forEach((c) => c.classList.remove('picked'));
  }

  async function onYes() {
    await sleep(350);
    show(null);
    musicSet('drop');
    document.body.classList.add('party');
    cam('scale(1)', 'scale(1.07) translateY(1.5%)', 4200, 'ease-in-out');
    await moveTo(packCan, { x: 0, y: -110, r: -3 }, 1000, 'cubic-bezier(.4,0,.2,1)');
    await moveTo(packCan, { x: 0, y: 0, r: 0 }, 360, 'cubic-bezier(.6,0,1,.6)');
    const b = packCan.getBoundingClientRect();
    setSlowmo(0.25, 1700, 1600);
    crown(b.left + b.width / 2, b.bottom - b.height * 0.01, b.width, 0.85, 0.3);
    swirlAround(packCan);
    sfx.splash();
    sfx.psst();
    sfx.fizz(3000);
    await sleep(700);
    show('yes');
    await sleep(1600);
    $('#againBtn').classList.add('ready');
    $('#againBtn').focus({ preventScroll: true });
  }

  async function onNo() {
    await sleep(350);
    show(null);
    musicSet('sad');
    sfx.powerDown();
    document.body.classList.add('dim');
    tweenLevel(reflCan, 100, 6, 1800);
    await tweenLevel(packCan, 100, 6, 1800);
    await moveTo(packCan, [{ x: 0, y: 0, r: -6, o: 0.25 }, { x: 0, y: 0, r: 5, o: 0.5 }, { x: 70, y: -112, r: -90 }], 1500, 'cubic-bezier(.6,0,.9,.6)');
    sfx.thud();
    await moveTo(packCan, [{ x: 66, y: -120, r: -88, o: 0.4 }, { x: 68, y: -112, r: -90 }], 500, 'ease-out');
    show('no');
    const out = $('#noTitle');
    out.textContent = '';
    for (const ch of 'Lavt batteri…') { out.textContent += ch; sfx.blip(180, 0.03); await sleep(110); }
    await sleep(500);
    $('#retryBtn').classList.add('ready');
    $('#retryBtn').focus({ preventScroll: true });
  }

  async function retry() {
    if (busy) return;
    busy = true;
    $('#retryBtn').classList.remove('ready');
    show(null);
    document.body.classList.remove('dim');
    musicSet('build');
    await moveTo(packCan, [{ x: -10, y: -40, r: -20, o: 0.6 }, { x: 0, y: 0, r: 0 }], 1000, 'cubic-bezier(.3,.7,.3,1)');
    sfx.thud();
    tweenLevel(reflCan, 6, 100, 1100);
    await tweenLevel(packCan, 6, 100, 1100, (v) => sfx.blip(300 + v * 6, 0.05));
    resetChoices();
    show('question');
    busy = false;
  }

  function choose(input, other, handler) {
    input.addEventListener('change', () => {
      if (busy || !input.checked) return;
      busy = true;
      other.checked = false;
      $('#choices').classList.add('locked');
      input.closest('.choice').classList.add('picked');
      sfx.blip(input.value === 'ja' ? 1200 : 300, 0.12);
      handler().finally(() => { busy = false; });
    });
  }
  choose($('#cbYes'), $('#cbNo'), onYes);
  choose($('#cbNo'), $('#cbYes'), onNo);
  $('#retryBtn').addEventListener('click', retry);
  $('#againBtn').addEventListener('click', () => { if (!busy) film(); });

  const fontsReady = document.fonts && document.fonts.ready ? Promise.race([document.fonts.ready, sleep(1500)]) : Promise.resolve();
  const gate = $('#gate');
  $('#startBtn').addEventListener('click', () => {
    ac();
    musicStart();
    gate.classList.add('gone');
    gate.addEventListener('transitionend', () => gate.remove(), { once: true });
    fontsReady.then(film);
  }, { once: true });
  $('#startBtn').focus({ preventScroll: true });
})();
