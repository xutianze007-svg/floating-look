// A. — Floating Look · single-canvas WebGL2 compositor
// Every element (person, products, ribbons, particles) is a textured quad on ONE canvas.
// Videos are "packed": left half = colour, right half = alpha (grey). They are already
// seamless loops, so the browser's native `loop` is all we need — no reloading, no seeking.

const VS = `#version 300 es
in vec2 aPos;
uniform vec2 uRes;
uniform vec2 uCenter;
uniform vec2 uSize;
uniform float uRot;
uniform float uFlip;
out vec2 vUV;
void main(){
  vec2 p = (aPos - 0.5) * uSize;
  p.x *= uFlip;
  float c = cos(uRot), s = sin(uRot);
  p = vec2(c*p.x - s*p.y, s*p.x + c*p.y) + uCenter;
  gl_Position = vec4(p.x / uRes.x * 2.0 - 1.0, 1.0 - p.y / uRes.y * 2.0, 0.0, 1.0);
  vUV = aPos;
}`;

const FS = `#version 300 es
precision highp float;
uniform sampler2D uTex;
uniform int uMode;        // 0 packed video, 1 premultiplied image, 2 opaque image
uniform float uOpacity;
uniform float uBias;      // mip bias = soft focus
uniform vec4 uEdge;       // soft edge fade (l, r, t, b) in uv
uniform vec4 uSub;        // atlas sub rect
uniform float uLift;      // wash toward paper colour
uniform vec3 uPaper;
in vec2 vUV;
out vec4 o;
void main(){
  vec2 uv = uSub.xy + vUV * uSub.zw;
  vec3 c; float a;
  if (uMode == 0) {
    vec2 cu = vec2(clamp(uv.x, 0.002, 0.998) * 0.5, uv.y);
    c = texture(uTex, cu, uBias).rgb;
    a = texture(uTex, cu + vec2(0.5, 0.0), uBias).r;
    a = clamp((a - 0.03) / 0.95, 0.0, 1.0);
    c *= a;
  } else if (uMode == 1) {
    vec4 t = texture(uTex, uv, uBias); c = t.rgb; a = t.a;
  } else {
    c = texture(uTex, uv, uBias).rgb; a = 1.0;
  }
  float e = smoothstep(0.0, uEdge.x + 1e-5, vUV.x) * smoothstep(0.0, uEdge.y + 1e-5, 1.0 - vUV.x)
          * smoothstep(0.0, uEdge.z + 1e-5, vUV.y) * smoothstep(0.0, uEdge.w + 1e-5, 1.0 - vUV.y);
  float k = e * uOpacity;
  c = mix(c, uPaper * a, uLift);
  o = vec4(c * k, a * k);
}`;

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const ease = {
  inOutCubic: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  inOutQuart: t => t < .5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2,
  outQuint: t => 1 - Math.pow(1 - t, 5),
  outCubic: t => 1 - Math.pow(1 - t, 3),
  outExpo: t => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
};

/** Smoothly animated scalar with retargeting (keeps continuity when interrupted). */
export class Tween {
  constructor(v) { this.v = v; this.from = v; this.to = v; this.t0 = 0; this.d = 1; this.e = ease.inOutCubic; }
  set(to, dur = 900, e = ease.inOutCubic, now = performance.now()) {
    if (dur <= 0) { this.v = this.from = this.to = to; this.d = 0; return; }
    this.from = this.v; this.to = to; this.t0 = now; this.d = dur; this.e = e;
  }
  get done() { return this.v === this.to; }
  step(now) {
    if (this.v === this.to) return this.v;
    const p = this.d ? clamp((now - this.t0) / this.d, 0, 1) : 1;
    this.v = p >= 1 ? this.to : this.from + (this.to - this.from) * this.e(p);
    return this.v;
  }
}

class Texture {
  constructor(gl) { this.gl = gl; this.tex = gl.createTexture(); this.w = 0; this.h = 0; this.ready = false; }
  alloc(w, h) {
    const gl = this.gl;
    if (this.w === w && this.h === h) return;
    gl.deleteTexture(this.tex); this.tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    const levels = Math.floor(Math.log2(Math.max(w, h))) + 1;
    gl.texStorage2D(gl.TEXTURE_2D, levels, gl.RGBA8, w, h);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.w = w; this.h = h;
  }
  upload(src, premultiply) {
    const gl = this.gl;
    const w = src.videoWidth || src.naturalWidth || src.width, h = src.videoHeight || src.naturalHeight || src.height;
    if (!w || !h) return false;
    this.alloc(w, h);
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, !!premultiply);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, src);
    gl.generateMipmap(gl.TEXTURE_2D);
    this.ready = true;
    return true;
  }
}

/** A looping packed-alpha video. Uploads a texture only when the decoder delivers a new frame. */
class VideoSource {
  static h264 = !!document.createElement('video').canPlayType('video/mp4; codecs="avc1.640028"');
  constructor(gl, url, pool, posterUrl, autoplay = true) {
    this.tex = new Texture(gl);
    this.poster = new Texture(gl);
    this.dirty = false; this.playing = false; this.wanted = autoplay;
    const v = this.video = document.createElement('video');
    v.muted = true; v.defaultMuted = true; v.loop = true; v.playsInline = true; v.preload = 'auto';
    v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('webkit-playsinline', '');
    v.crossOrigin = 'anonymous';
    // H.264 everywhere that matters (Safari, Chrome, Edge, Firefox on macOS). A .webm twin is used only if present
    // and the browser cannot decode H.264 (e.g. some Linux Chromium builds).
    if (!VideoSource.h264) url = url.replace(/\.mp4$/, '.webm');
    v.src = url;
    pool.appendChild(v);
    if (posterUrl) {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => { this.poster.upload(img, true); this.posterImg = img; };
      img.src = posterUrl;
    }
    const hasRVFC = 'requestVideoFrameCallback' in HTMLVideoElement.prototype;
    this.hasRVFC = hasRVFC;
    if (hasRVFC) {
      const cb = () => { this.dirty = true; v.requestVideoFrameCallback(cb); };
      v.requestVideoFrameCallback(cb);
    }
    v.addEventListener('playing', () => { this.playing = true; this.dirty = true; });
    v.addEventListener('pause', () => { this.playing = false; });
    v.addEventListener('loadeddata', () => { this.dirty = true; if (this.wanted) this.play(); });
    this.lastTime = -1;
  }
  play() { this.wanted = true; const p = this.video.play(); if (p) p.catch(() => {}); }
  pause() { this.wanted = false; this.video.pause(); }
  get texture() { return this.tex.ready ? this.tex : (this.poster.ready ? this.poster : null); }
  update() {
    const v = this.video;
    if (v.readyState < 2) return;
    if (!this.hasRVFC) { if (v.currentTime !== this.lastTime) { this.dirty = true; this.lastTime = v.currentTime; } }
    if (this.dirty) { this.dirty = false; this.tex.upload(v, false); }
  }
}

export class Scene {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, premultipliedAlpha: true, preserveDrawingBuffer: false, powerPreference: 'high-performance', desynchronized: false });
    if (!gl) throw new Error('WebGL2 unavailable');
    this.gl = gl;
    this.pool = opts.pool || document.body;
    this.paper = opts.paper || [0.972, 0.965, 0.953];
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    const p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    gl.useProgram(p);
    this.u = {};
    for (const n of ['uRes', 'uCenter', 'uSize', 'uRot', 'uFlip', 'uTex', 'uMode', 'uOpacity', 'uBias', 'uEdge', 'uSub', 'uLift', 'uPaper']) this.u[n] = gl.getUniformLocation(p, n);
    const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(p, 'aPos'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.uniform1i(this.u.uTex, 0);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.uniform3fv(this.u.uPaper, this.paper);
    this.layers = [];
    this.sources = new Map();
    this.images = new Map();
    // camera (design coordinates); S = design->css scale
    this.cam = { x: new Tween(768), y: new Tween(512), z: new Tween(1) };
    this.S = 1; this.W = 1; this.H = 1; this.dpr = 1;
    this.origin = { x: 0.5, y: 0.5 };   // css px where the camera centre lands
    this.home = { x: 768, y: 512 };     // design point at rest
    this.mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    this.motion = 1;               // global drift amount (0 when reduced motion)
    this.time = 0; this.last = 0;
  }

  video(url, poster, autoplay = true) {
    if (!this.sources.has(url)) this.sources.set(url, new VideoSource(this.gl, url, this.pool, poster, autoplay));
    return this.sources.get(url);
  }
  image(url, premultiply = true) {
    if (!this.images.has(url)) {
      const t = new Texture(this.gl);
      const img = new Image(); img.decoding = 'async';
      img.onload = () => t.upload(img, premultiply);
      img.src = url;
      t.img = img;
      this.images.set(url, t);
    }
    return this.images.get(url);
  }

  add(layer) {
    const L = Object.assign({
      x: 768, y: 512, w: 100, h: 100, rot: 0, flip: 1, z: 0, depth: 1, opacity: 1, bias: 0, edge: [0, 0, 0, 0], sub: [0, 0, 1, 1],
      drift: null, mode: 0, hover: new Tween(0), dim: new Tween(0), focus: new Tween(0), vis: new Tween(1), intro: null,
      extraScale: 1, lift: 0,
    }, layer);
    this.layers.push(L);
    this.layers.sort((a, b) => a.z - b.z);
    return L;
  }

  resize(cssW, cssH, S) {
    // 1.75× keeps retina crispness while drawing ~25% fewer pixels than 2×
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    this.W = cssW; this.H = cssH; this.S = S; this.dpr = dpr;
    const w = Math.round(cssW * dpr), h = Math.round(cssH * dpr);
    if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }
  }

  /** current camera for a given parallax depth */
  view(depth = 1) {
    const z = 1 + (this.cam.z.v - 1) * depth;
    const cx = this.home.x + (this.cam.x.v - this.home.x) * depth, cy = this.home.y + (this.cam.y.v - this.home.y) * depth;
    return { z, cx, cy };
  }

  /** layer transform at the current time: centre (css px), size (css px), rotation (rad) */
  transform(L, now) {
    const t = this.time;
    let dx = 0, dy = 0, dr = 0, ds = 0;
    const d = L.drift, m = this.motion * (1 - 0.65 * L.focus.v);
    if (d && m > 0) {
      const tau = Math.PI * 2;
      dx = d.ax * (Math.sin(tau * t / d.tx + d.p1) + 0.35 * Math.sin(tau * t / (d.tx * 0.53) + d.p2)) * m;
      dy = d.ay * (Math.sin(tau * t / d.ty + d.p3) + 0.3 * Math.sin(tau * t / (d.ty * 0.61) + d.p4)) * m;
      dr = d.ar * Math.sin(tau * t / d.tr + d.p5) * m;
      ds = (d.as || 0) * Math.sin(tau * t / (d.ts || 9) + d.p6) * m;
    }
    let x = L.x + dx, y = L.y + dy, s = (1 + ds) * L.extraScale * (1 + 0.045 * L.hover.v), op = 1;
    if (L.intro) {
      const p = L.intro.p;
      const e = ease.outQuint(p), eo = ease.outCubic(clamp(p * 1.6, 0, 1));
      x = L.intro.fx + (x - L.intro.fx) * e; y = L.intro.fy + (y - L.intro.fy) * e;
      s *= L.intro.fs + (1 - L.intro.fs) * e; dr += (1 - e) * L.intro.fr; op = eo;
    }
    const v = this.view(L.depth);
    const mx = this.mouse.x * (L.depth - 0.7) * 9 * this.S, my = this.mouse.y * (L.depth - 0.7) * 6 * this.S;
    const k = this.S * v.z;
    return {
      cx: this.origin.x + (x - v.cx) * k + mx,
      cy: this.origin.y + (y - v.cy) * k + my,
      w: L.w * k * s, h: L.h * k * s,
      rot: (L.rot + dr) * Math.PI / 180, op,
    };
  }

  /** map a point in a layer's normalised uv (0..1) to css px */
  point(L, u, v, tr = this.transform(L)) {
    const px = (u - 0.5) * tr.w * L.flip, py = (v - 0.5) * tr.h;
    const c = Math.cos(tr.rot), s = Math.sin(tr.rot);
    return { x: tr.cx + c * px - s * py, y: tr.cy + s * px + c * py };
  }

  /** design point -> css px for a given depth */
  project(x, y, depth = 1) {
    const v = this.view(depth); const k = this.S * v.z;
    return { x: this.origin.x + (x - v.cx) * k, y: this.origin.y + (y - v.cy) * k };
  }

  /** topmost hit-testable layer under a css point (uses a low-res alpha mask) */
  hit(px, py) {
    for (let i = this.layers.length - 1; i >= 0; i--) {
      const L = this.layers[i];
      if (!L.mask || L.vis.v < 0.5 || L.noHit) continue;
      const tr = this.transform(L);
      const c = Math.cos(-tr.rot), s = Math.sin(-tr.rot);
      const lx = c * (px - tr.cx) - s * (py - tr.cy), ly = s * (px - tr.cx) + c * (py - tr.cy);
      let u = lx / tr.w * L.flip + 0.5, v = ly / tr.h + 0.5;
      if (u < 0 || v < 0 || u >= 1 || v >= 1) continue;
      const m = L.mask; const mx = Math.floor(u * m.w), my = Math.floor(v * m.h);
      // dilate a little so thin parts (chains, temples) stay easy to hit
      let hitv = 0;
      for (let oy = -2; oy <= 2; oy++) for (let ox = -2; ox <= 2; ox++) {
        const xx = mx + ox, yy = my + oy;
        if (xx >= 0 && yy >= 0 && xx < m.w && yy < m.h) hitv = Math.max(hitv, m.data[yy * m.w + xx]);
      }
      if (hitv > 60) return L;
    }
    return null;
  }

  frame(now) {
    const dt = this.last ? Math.min(0.05, (now - this.last) / 1000) : 0;
    this.last = now; this.time += dt;
    for (const k of ['x', 'y', 'z']) this.cam[k].step(now);
    const f = 1 - Math.exp(-dt * 3.2);
    this.mouse.x += (this.mouse.tx - this.mouse.x) * f; this.mouse.y += (this.mouse.ty - this.mouse.y) * f;
    for (const s of this.sources.values()) s.update();
    const gl = this.gl;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(this.paper[0], this.paper[1], this.paper[2], 1); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(this.u.uRes, this.W, this.H);
    gl.activeTexture(gl.TEXTURE0);
    for (const L of this.layers) {
      L.hover.step(now); L.dim.step(now); L.focus.step(now); L.vis.step(now);
      if (L.intro) { L.intro.p = clamp((now - L.intro.t0) / L.intro.d, 0, 1); if (L.intro.p >= 1) L.intro = null; }
      const tex = L.src ? L.src.texture : L.tex;
      if (!tex || !tex.ready) continue;
      const tr = this.transform(L, now);
      L._tr = tr;
      const op = L.opacity * tr.op * L.vis.v * (1 - 0.0 * L.dim.v);
      if (op <= 0.003) continue;
      const isPosterFallback = L.src && tex === L.src.poster;
      gl.bindTexture(gl.TEXTURE_2D, tex.tex);
      gl.uniform1i(this.u.uMode, isPosterFallback ? 1 : L.mode);
      gl.uniform2f(this.u.uCenter, tr.cx, tr.cy);
      gl.uniform2f(this.u.uSize, tr.w, tr.h);
      gl.uniform1f(this.u.uRot, tr.rot);
      gl.uniform1f(this.u.uFlip, L.flip);
      gl.uniform1f(this.u.uOpacity, op);
      gl.uniform1f(this.u.uBias, L.bias + 2.2 * L.dim.v);
      gl.uniform4fv(this.u.uEdge, L.edge);
      gl.uniform4fv(this.u.uSub, L.sub);
      gl.uniform1f(this.u.uLift, clamp(L.lift + 0.62 * L.dim.v, 0, 1));
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
  }

  setPlaying(on) { for (const s of this.sources.values()) on ? (s.keepPaused ? null : s.play()) : s.video.pause(); }
}
