// ============================================================
//  ここだけ編集すればOK
// ============================================================
const CONFIG = {
  // Discord 招待リンク（無期限のものを推奨）
  discordInvite: "https://discord.gg/k6h8BWQcwc",

  // 物理演算で落ちてくるタグ
  pit: [
    ["CANNIBALISM", "人〇食", "red"], ["BUTT SPARKLER", "ケツ穴線香花火", ""], ["NAKED GUITAR", "全〇ギター", "paper"],
    ["HONEY TRAP", "美人局", ""], ["SCAM", "詐○", "red"], ["STREET RACING", "珍走", "blue"],
    ["PUBLIC INDECENCY", "公然わいせつ", ""], ["WORKPLACE RAID", "職場凸", "paper"],
    ["SAY IT.", "", ""], ["DO IT.", "有言実行", "red"],
  ],
};
// ============================================================

// Choreography is a pure function of progress (scroll p, or intro t).
// The rAF loop only supplies the clock; nothing animates on its own timers.

const Q = new URLSearchParams(location.search);
const DEBUG_Y = Q.has("y") ? parseFloat(Q.get("y")) : null; // ?y=2.5 → scroll to 2.5 viewports, frozen
const FREEZE_T = Q.has("t") ? parseFloat(Q.get("t")) : null; // ?t=0.8 → freeze intro at 0.8s
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
const FINE = matchMedia("(hover: hover)").matches;

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const ramp = (p, a, b) => clamp((p - a) / (b - a));
const outExpo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
const outCubic = (t) => 1 - Math.pow(1 - t, 3);
const inOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const outBack = (t) => { const c = 1.6; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
function mulberry32(a) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const hash = (n) => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

// ---------- static content ----------
$$("[data-discord]").forEach((a) => { a.href = CONFIG.discordInvite; a.target = "_blank"; a.rel = "noopener"; });
$("[data-year]").textContent = new Date().getFullYear();
$("[data-copy]").addEventListener("click", async (e) => {
  const b = e.currentTarget.querySelector("b");
  try { await navigator.clipboard.writeText(CONFIG.discordInvite); b.textContent = "COPIED"; }
  catch { b.textContent = "COPY FAILED"; }
});

// ---------- pointer ----------
const pointer = { x: innerWidth * 0.68, y: innerHeight * 0.45, moved: false };
addEventListener("pointermove", (e) => { pointer.x = e.clientX; pointer.y = e.clientY; pointer.moved = true; }, { passive: true });

// ---------- WebGL halftone stage ----------
const GL = (() => {
  const canvas = $("#gl");
  const gl = canvas.getContext("webgl", { antialias: false, premultipliedAlpha: false });
  if (!gl) { document.documentElement.classList.add("no-gl"); return null; }
  const vs = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }`;
  const fs = `
precision highp float;
uniform sampler2D uTex;
uniform vec2 uRes, uMouse;
uniform float uCell, uDev, uImgAspect, uLens, uDpr, uTime;
const float PI = 3.14159265;
vec2 cover(vec2 fc){
  vec2 uv = fc / uRes; uv.y = 1. - uv.y;
  float sa = uRes.x / uRes.y;
  vec2 s = sa > uImgAspect ? vec2(1., uImgAspect / sa) : vec2(sa / uImgAspect, 1.);
  vec2 c = vec2(.5, sa > uImgAspect ? .42 : .5);
  return clamp((uv - .5) * s + c, 0., 1.);
}
float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main(){
  vec2 fc = gl_FragCoord.xy;
  float aa = uDpr;
  vec2 dm = fc - uMouse; float dist = length(dm); float lr = uLens * uDpr;
  float k = lr > 1. ? smoothstep(lr, 0., dist) : 0.;
  vec2 fd = fc - dm * k * .32;

  // halftone, 15deg screen
  float cell = uCell * uDpr;
  mat2 R = mat2(.9659, .2588, -.2588, .9659);
  mat2 Ri = mat2(.9659, -.2588, .2588, .9659);
  vec2 rp = R * fd;
  vec2 g = (floor(rp / cell) + .5) * cell;
  vec3 sc = texture2D(uTex, cover(Ri * g)).rgb;
  float L = dot(sc, vec3(.299, .587, .114));
  float r = cell * .58 * sqrt(L);
  float dotm = 1. - smoothstep(r - aa, r, length(rp - g));
  float sat = max(sc.r, max(sc.g, sc.b)) - min(sc.r, min(sc.g, sc.b));
  vec3 ink = vec3(.043, .043, .047), paper = vec3(.949, .945, .925);
  vec3 dc = mix(paper * .9, min(sc * 1.3, 1.), smoothstep(.42, .75, sat));
  vec3 col = mix(ink, dc, dotm);

  // aperture: hexagonal iris opening from the centre
  vec3 photo = texture2D(uTex, cover(fd)).rgb;
  vec2 q = fc - uRes * .5;
  float rad = uDev * length(uRes) * .62;
  float seg = 2. * PI / 6.;
  float ang = atan(q.y, q.x) + uDev * 1.8;
  float hx = cos(PI / 6.) / cos(mod(ang, seg) - PI / 6.);
  float ir = uDev > .001 ? 1. - smoothstep(rad * hx - aa * 1.5, rad * hx, length(q)) : 0.;
  col = mix(col, photo, ir);

  // loupe: true colour with chromatic split
  float on = step(1., lr) * (1. - ir);
  float lm = (1. - smoothstep(lr - aa * 1.5, lr, dist)) * on;
  vec2 off = vec2(3. * uDpr, 0.);
  vec3 lc = vec3(texture2D(uTex, cover(fd + off)).r, photo.g, texture2D(uTex, cover(fd - off)).b);
  col = mix(col, lc, lm);
  float ring = (1. - smoothstep(0., 1.5 * aa, abs(dist - lr))) * on;
  float tick = (1. - smoothstep(0., aa, min(abs(dm.x), abs(dm.y)))) * step(lr, dist) * step(dist, lr + 14. * uDpr) * on;
  col = mix(col, paper, max(ring, tick) * .9);

  col += (hash(fc + fract(uTime) * 91.) - .5) * .04;
  gl_FragColor = vec4(col, 1.);
}`;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const prog = gl.createProgram();
  try { gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs)); }
  catch (e) { console.error(e); document.documentElement.classList.add("no-gl"); return null; }
  gl.linkProgram(prog); gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "p");
  gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = {}; ["uTex", "uRes", "uMouse", "uCell", "uDev", "uImgAspect", "uLens", "uDpr", "uTime"].forEach((n) => (U[n] = gl.getUniformLocation(prog, n)));

  let aspect = 1, loaded = false, dpr = 1;
  const img = new Image();
  const ready = new Promise((res) => {
    img.onload = () => {
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      aspect = img.width / img.height; loaded = true; res();
    };
    img.onerror = () => { document.documentElement.classList.add("no-gl"); res(); };
  });
  img.src = "assets/collage.webp";

  const resize = () => {
    dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(canvas.clientWidth * dpr);
    canvas.height = Math.round(canvas.clientHeight * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
  };
  resize(); addEventListener("resize", resize);

  return {
    ready,
    draw({ cell, dev, lens, mx, my, time }) {
      if (!loaded) return;
      gl.uniform1i(U.uTex, 0);
      gl.uniform2f(U.uRes, canvas.width, canvas.height);
      gl.uniform2f(U.uMouse, mx * dpr, canvas.height - my * dpr);
      gl.uniform1f(U.uCell, cell);
      gl.uniform1f(U.uDev, dev);
      gl.uniform1f(U.uImgAspect, aspect);
      gl.uniform1f(U.uLens, lens);
      gl.uniform1f(U.uDpr, dpr);
      gl.uniform1f(U.uTime, time);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
  };
})();

// ---------- scenes: each renders from its own progress p ∈ [0,1] ----------
const heroWords = $$(".hero-h1 .w");
const lens = { x: pointer.x, y: pointer.y };
const exif = Object.fromEntries($$("[data-exif]").map((el) => [el.dataset.exif, el]));
let lastLabel = "";

const scenes = {
  stage(p, el, now, intro) {
    const pin = el.firstElementChild;
    const out = ramp(p, 0.03, 0.18);
    const copy = $(".hero-copy", pin);
    copy.style.opacity = 1 - out;
    copy.style.transform = `translate3d(0, ${-out * 80}px, 0)`;
    $(".stage-shade", pin).style.opacity = 1 - ramp(p, 0.2, 0.5);

    // intro: words rise, staggered
    heroWords.forEach((w, i) => {
      const k = outExpo(ramp(intro, 0.15 + i * 0.09, 1.05 + i * 0.09));
      w.style.transform = `translate3d(0, ${(1 - k) * 110}%, 0) skewX(${(1 - k) * -8}deg)`;
    });
    $(".kicker", pin).style.opacity = ramp(intro, 0.05, 0.6);
    $(".hero-foot", pin).style.opacity = ramp(intro, 0.9, 1.6);

    const dev = inOut(ramp(p, 0.26, 0.66));
    const d = $(".develop", pin);
    d.style.opacity = ramp(p, 0.18, 0.26) * (1 - ramp(p, 0.62, 0.68));
    d.querySelector("[data-pct]").textContent = String(Math.round(dev * 100)).padStart(3, "0") + "%";

    const w = outExpo(ramp(p, 0.7, 0.84));
    $(".watermark", pin).style.transform = `translate3d(0, ${(1 - w) * 100}%, 0)`;
    const e = outCubic(ramp(p, 0.72, 0.94));
    exif.mm.textContent = Math.round(230 * e);
    exif.f.textContent = (1 + 1.67 * e).toFixed(2);
    exif.ss.textContent = Math.round(lerp(8000, 50, e));
    exif.iso.textContent = Math.round(lerp(100, 889, e));

    const label = p < 0.22 ? "01 — THE LEGEND IS BACK" : p < 0.68 ? "01 — DEVELOPING" : "01 — DEVELOPED";
    if (label !== lastLabel) { $("[data-label]", pin).textContent = label; lastLabel = label; }
    $("[data-label]", pin).style.opacity = 1 - ramp(p, 0.7, 0.75);

    if (GL) {
      // the loupe wanders on its own until the pointer takes over
      const tx = pointer.moved ? pointer.x : innerWidth * (0.68 + 0.08 * Math.sin(now * 0.0006));
      const ty = pointer.moved ? pointer.y : innerHeight * (0.42 + 0.1 * Math.sin(now * 0.00083));
      lens.x += (tx - lens.x) * 0.14; lens.y += (ty - lens.y) * 0.14;
      const lensR = Math.min(innerWidth, innerHeight) * 0.17 * outExpo(ramp(intro, 0.6, 1.8)) * (1 - ramp(p, 0.14, 0.3));
      GL.draw({
        cell: lerp(11, 4.5, inOut(ramp(p, 0.06, 0.34))),
        dev,
        lens: lensR,
        mx: lens.x, my: lens.y,
        time: Math.floor(now / 42) * 0.042,
      });
    }
  },

  call(p, el) {
    const a = $(".row-a", el), b = $(".row-b", el);
    a.style.transform = `translate3d(${lerp(4, -52, p)}%, 0, 0)`;
    b.style.transform = `translate3d(${lerp(-52, 4, p)}%, 0, 0)`;
    const lensEl = $(".call-lens", el);
    const k = outBack(ramp(p, 0.15, 0.4));
    lensEl.style.transform = `scale(${k}) rotate(${p * 540}deg)`;
    $(".call-cap", el).style.opacity = ramp(p, 0.3, 0.45);
  },

  rule(p, el) {
    const pre = $(".rule-pre", el);
    pre.style.opacity = ramp(p, 0.02, 0.12) * (1 - ramp(p, 0.75, 0.85));

    const slam = ramp(p, 0.62, 0.74);
    const amp = REDUCED ? 0 : (1 - slam) * (slam > 0 ? 16 : 0);
    const step = Math.floor(p * 240);
    const word = $(".rule-word", el);
    word.style.transform = `translate3d(${(hash(step) - 0.5) * amp}px, ${(hash(step + 99) - 0.5) * amp}px, 0)`;
    const sh = outExpo(slam);
    $$("span", word).forEach((s, i) => {
      const k = outExpo(ramp(p, 0.12 + i * 0.1, 0.32 + i * 0.1));
      s.style.opacity = k;
      s.style.transform = `translate3d(${(1 - k) * (i % 2 ? 40 : -40)}%, 0, 0) skewX(${(1 - k) * -14}deg)`;
      s.style.filter = k < 1 ? `blur(${(1 - k) * 14}px)` : "none";
      s.style.textShadow = i > 1 ? `${sh * 0.045}em ${sh * 0.045}em 0 var(--red)` : "none";
    });
    $(".rule-en", el).style.opacity = ramp(p, 0.72, 0.82);
  },

  welcome(p, el) {
    const items = $$(".wl li", el);
    items.forEach((li, i) => {
      const k = outExpo(ramp(p, 0.05 + i * 0.13, 0.25 + i * 0.13));
      li.classList.toggle("on", k > 0.5);
      li.style.transform = `translate3d(${(1 - k) * 12}vw, 0, 0)`;
    });
    $(".wl-tail", el).style.opacity = ramp(p, 0.75, 0.85);
  },

  code(p, el) {
    $$(".code-list li", el).forEach((li, i) => {
      const k = outExpo(ramp(p, 0.06 + i * 0.13, 0.22 + i * 0.13));
      li.style.opacity = lerp(0.14, 1, k);
      li.style.transform = `translate3d(${(1 - k) * 36}px, 0, 0)`;
    });
  },

  join(p, el) {
    $$(".join-title .w", el).forEach((w, i) => {
      const k = outExpo(ramp(p, 0.04 + i * 0.08, 0.3 + i * 0.08));
      w.style.transform = `translate3d(0, ${(1 - k) * 105}%, 0)`;
    });
    const s = ramp(p, 0.3, 0.42);
    const stamp = $(".stamp", el);
    stamp.style.opacity = s > 0 ? 1 : 0;
    stamp.style.transform = `scale(${lerp(3.2, 1, outBack(s))}) rotate(${lerp(-24, -7, outCubic(s))}deg)`;
    $(".join-actions", el).style.opacity = ramp(p, 0.26, 0.38);
  },
};

const sceneEls = $$("[data-scene]");
function progressOf(el) {
  const r = el.getBoundingClientRect();
  const span = r.height - innerHeight;
  return { p: span > 0 ? clamp(-r.top / span) : clamp(1 - r.top / innerHeight), visible: r.bottom > 0 && r.top < innerHeight };
}

// ---------- physics pit (Matter.js) ----------
const Pit = (() => {
  const host = $("#pit");
  if (!window.Matter || !host) return null;
  const { Engine, Bodies, Body, Composite, Constraint } = Matter;
  const engine = Engine.create({ gravity: { y: 1.1 } });
  const rnd = mulberry32(20260908);
  let items = [], walls = [], started = false, drag = null;

  const build = () => {
    const W = host.clientWidth, H = host.clientHeight, t = 200;
    Composite.remove(engine.world, walls);
    walls = [
      Bodies.rectangle(W / 2, H + t / 2, W * 3, t, { isStatic: true }),
      Bodies.rectangle(-t / 2, H / 2 - 1500, t, H + 3000, { isStatic: true }),
      Bodies.rectangle(W + t / 2, H / 2 - 1500, t, H + 3000, { isStatic: true }),
    ];
    Composite.add(engine.world, walls);
  };

  const start = () => {
    if (started) return; started = true;
    build();
    const W = host.clientWidth;
    CONFIG.pit.forEach(([text, sub, tone], i) => {
      const el = document.createElement("span");
      el.className = "pill" + (tone ? " " + tone : "");
      el.textContent = text;
      if (sub) { const sm = document.createElement("small"); sm.textContent = sub; el.append(sm); }
      host.append(el);
      const w = el.offsetWidth, h = el.offsetHeight;
      const x = clamp(w / 2 + rnd() * (W - w), w / 2, W - w / 2);
      const body = Bodies.rectangle(x, -120 - i * 110, w, h, { chamfer: { radius: h / 2 - 1 }, restitution: 0.35, friction: 0.25, frictionAir: 0.012 });
      Body.setAngle(body, (rnd() - 0.5) * 0.8);
      Composite.add(engine.world, body);
      items.push({ el, body, w, h });
      el.addEventListener("pointerdown", (e) => grab(e, body, el));
    });
  };

  const local = (e) => { const r = host.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  function grab(e, body, el) {
    e.preventDefault();
    el.setPointerCapture(e.pointerId);
    el.classList.add("grab");
    const pt = local(e);
    const c = Constraint.create({
      pointA: pt, bodyB: body,
      pointB: Matter.Vector.rotate({ x: pt.x - body.position.x, y: pt.y - body.position.y }, -body.angle),
      stiffness: 0.18, damping: 0.08, length: 0,
    });
    Composite.add(engine.world, c);
    drag = { c, el };
    const move = (ev) => { const q = local(ev); c.pointA.x = q.x; c.pointA.y = q.y; };
    const up = () => {
      Composite.remove(engine.world, c); el.classList.remove("grab"); drag = null;
      el.removeEventListener("pointermove", move); el.removeEventListener("pointerup", up); el.removeEventListener("pointercancel", up);
    };
    el.addEventListener("pointermove", move); el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up);
  }

  addEventListener("resize", () => started && build());
  new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && start()), { threshold: 0.2 }).observe(host);

  let acc = 0, last = 0;
  return {
    start,
    settle(n) { start(); for (let i = 0; i < n; i++) Engine.update(engine, 1000 / 60); },
    step(now) {
      if (!started) return;
      const dt = last ? Math.min(now - last, 100) : 16.67; last = now; acc += dt;
      // the cursor shoves pills it passes over
      const r = host.getBoundingClientRect();
      const px = pointer.x - r.left, py = pointer.y - r.top;
      while (acc >= 1000 / 60) {
        if (!drag && FINE) items.forEach(({ body }) => {
          const dx = body.position.x - px, dy = body.position.y - py, d2 = dx * dx + dy * dy;
          if (d2 < 120 * 120 && d2 > 1) { const f = 0.0016 * body.mass * (1 - Math.sqrt(d2) / 120); Body.applyForce(body, body.position, { x: (dx / Math.sqrt(d2)) * f, y: (dy / Math.sqrt(d2)) * f - f * 0.6 }); }
        });
        Engine.update(engine, 1000 / 60); acc -= 1000 / 60;
      }
      this.paint();
    },
    paint() {
      items.forEach(({ el, body, w, h }) => {
        el.style.transform = `translate3d(${body.position.x - w / 2}px, ${body.position.y - h / 2}px, 0) rotate(${body.angle}rad)`;
      });
    },
  };
})();

// ---------- cursor + magnets ----------
const cursorEl = $(".cursor"), cur = { x: pointer.x, y: pointer.y, s: 1 };
const magnets = $$(".magnet").map((el) => ({ el, x: 0, y: 0 }));
const joinPin = $(".join .pin");
function interact() {
  if (!pointer.moved) return;
  cursorEl.classList.add("on");
  cur.x += (pointer.x - cur.x) * 0.25; cur.y += (pointer.y - cur.y) * 0.25;
  const hot = document.elementFromPoint(pointer.x, pointer.y)?.closest("a, button, .pill");
  cur.s += ((hot ? 3.4 : 1) - cur.s) * 0.2;
  cursorEl.style.transform = `translate3d(${cur.x}px, ${cur.y}px, 0)`;
  cursorEl.firstElementChild.style.setProperty("--s", cur.s.toFixed(3));
  magnets.forEach((m) => {
    const r = m.el.getBoundingClientRect();
    const cx = r.left + r.width / 2 - m.x, cy = r.top + r.height / 2 - m.y;
    const dx = pointer.x - cx, dy = pointer.y - cy, near = Math.hypot(dx, dy) < Math.max(r.width, r.height) * 0.9;
    m.x += ((near ? dx * 0.28 : 0) - m.x) * 0.18; m.y += ((near ? dy * 0.28 : 0) - m.y) * 0.18;
    m.el.style.transform = `translate3d(${m.x}px, ${m.y}px, 0)`;
  });
  const jr = joinPin.getBoundingClientRect();
  joinPin.style.setProperty("--mx", `${((pointer.x - jr.left) / jr.width) * 100}%`);
  joinPin.style.setProperty("--my", `${((pointer.y - jr.top) / jr.height) * 100}%`);
}

// ---------- main loop ----------
let lenis = null;
if (DEBUG_Y === null && !REDUCED && window.Lenis) {
  lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
  $$('a[href^="#"]').forEach((a) => a.addEventListener("click", (e) => {
    const id = a.getAttribute("href");
    if (id.length > 1 && $(id)) { e.preventDefault(); lenis.scrollTo($(id), { offset: id === "#join" ? $(id).offsetHeight - innerHeight * 1.2 : 0 }); }
  }));
}

let introStart = null;
function frame(now) {
  lenis?.raf(now);
  if (introStart === null) introStart = now;
  const intro = FREEZE_T !== null ? FREEZE_T : REDUCED || DEBUG_Y !== null ? 9 : (now - introStart) / 1000;
  sceneEls.forEach((el) => {
    const { p, visible } = progressOf(el);
    if (visible || el.dataset.scene === "stage") scenes[el.dataset.scene](p, el, now, intro);
  });
  Pit?.step(now);
  if (FINE) interact();
  if (DEBUG_Y === null) requestAnimationFrame(frame);
}

Promise.all([document.fonts.ready, GL ? GL.ready : Promise.resolve()]).then(() => {
  if (DEBUG_Y !== null) {
    // ?y=2.5 (viewports) or ?s=rule&y=0.5 (progress inside a scene / section)
    const target = Q.has("s") ? $(`[data-scene="${Q.get("s")}"], .${Q.get("s")}`) : null;
    scrollTo(0, target ? target.offsetTop + DEBUG_Y * Math.max(target.offsetHeight - innerHeight, 0) : DEBUG_Y * innerHeight);
    const pr = $("#pit").getBoundingClientRect();
    if (pr.top < innerHeight && pr.bottom > 0) { Pit?.settle(260); Pit?.paint(); }
    const t = performance.now(); frame(t); frame(t); // run twice so the loupe's easing lands
  } else {
    requestAnimationFrame(frame);
  }
  window.__ready = true;
});
