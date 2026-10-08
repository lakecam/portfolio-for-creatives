// Cloud Atlas (React Bits Pro), ported to plain three.js so it works without React.
// Billowing clouds you can push around with the cursor.
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";

const STILL_TIME = 12;

const passVertex = `
varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;

uniform vec2 uTexel;

void main() {
  vUv = uv;
  vL = uv - vec2(uTexel.x, 0.0);
  vR = uv + vec2(uTexel.x, 0.0);
  vT = uv + vec2(0.0, uTexel.y);
  vB = uv - vec2(0.0, uTexel.y);
  gl_Position = vec4(position.xy * 2.0, 0.0, 1.0);
}
`;

const pushFragment = `
precision highp float;

varying vec2 vUv;

uniform sampler2D uField;
uniform vec2 uFrom;
uniform vec2 uTo;
uniform vec2 uPush;
uniform float uRadius;
uniform float uAspect;

void main() {
  vec2 a = uFrom * vec2(uAspect, 1.0);
  vec2 b = uTo * vec2(uAspect, 1.0);
  vec2 p = vUv * vec2(uAspect, 1.0);
  vec2 ab = b - a;
  float h = clamp(dot(p - a, ab) / max(dot(ab, ab), 1e-6), 0.0, 1.0);
  vec2 d = p - (a + ab * h);
  float g = exp(-dot(d, d) / max(uRadius * uRadius, 1e-6));
  vec2 field = texture2D(uField, vUv).xy + uPush * g;
  float size = length(field);
  field *= min(1.0, 0.24 / max(size, 1e-5));
  gl_FragColor = vec4(field, 0.0, 1.0);
}
`;

const settleFragment = `
precision highp float;

varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;

uniform sampler2D uField;
uniform float uKeep;

void main() {
  vec2 center = texture2D(uField, vUv).xy;
  vec2 around = (
    texture2D(uField, vL).xy +
    texture2D(uField, vR).xy +
    texture2D(uField, vT).xy +
    texture2D(uField, vB).xy
  ) * 0.25;
  gl_FragColor = vec4(mix(center, around, 0.4) * uKeep, 0.0, 1.0);
}
`;

const vertexShader = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy * 2.0, 0.0, 1.0);
}
`;

const fragmentShader = `
precision highp float;

#define PI 3.14159265359
#define TAU 6.28318530718

varying vec2 vUv;

uniform vec2 uResolution;
uniform float uTime;
uniform float uFlow;
uniform float uWind;
uniform vec3 uSky;
uniform vec3 uLight;
uniform vec3 uShade;
uniform float uTransparent;
uniform float uTop;
uniform float uCeiling;
uniform float uFadeStart;
uniform float uCoverage;
uniform float uDensity;
uniform float uScale;
uniform float uRise;
uniform float uDip;
uniform float uOpacity;
uniform float uSeed;
uniform sampler2D uWake;
uniform float uWakeStrength;

const mat2 SPIN_A = mat2(0.80, 0.60, -0.60, 0.80);
const mat2 SPIN_B = mat2(1.60, 1.20, -1.20, 1.60);

vec2 hash22(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  q += dot(q, q.yzx + 33.33);
  return fract((q.xx + q.yz) * q.zy) * 2.0 - 1.0;
}

mat2 rotation(float a) {
  float c = cos(a);
  float s = sin(a);
  return mat2(c, s, -s, c);
}

float cellular(vec2 x, float phase) {
  vec2 cell = floor(x);
  vec2 f = fract(x);
  float inverse = 0.0;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 g = vec2(float(i), float(j));
      vec2 site = 0.5 + 0.5 * sin(phase + TAU * hash22(cell + g));
      vec2 r = g + site - f;
      float d2 = dot(r, r);
      float d4 = d2 * d2;
      float d8 = d4 * d4;
      inverse += 1.0 / (d8 * d8);
    }
  }
  return 1.0 - pow(inverse, -0.125);
}

float lobe(vec2 cell, vec2 offset, vec2 f, mat2 turn) {
  float sgn = 1.0 - 2.0 * mod(offset.x + offset.y, 2.0);
  return sgn * dot(hash22(cell + offset), turn * (f - offset));
}

float curl(vec2 p, float angle) {
  vec2 cell = floor(p);
  vec2 f = fract(p);
  vec2 w = f * f * (3.0 - 2.0 * f);
  mat2 turn = rotation(angle + PI * (1.0 - mod(cell.x + cell.y, 2.0)));
  float n = mix(
    mix(lobe(cell, vec2(0.0, 0.0), f, turn), lobe(cell, vec2(1.0, 0.0), f, turn), w.x),
    mix(lobe(cell, vec2(0.0, 1.0), f, turn), lobe(cell, vec2(1.0, 1.0), f, turn), w.x),
    w.y
  );
  return 0.5 + n;
}

float puffs(vec2 p, float t) {
  float sum = 0.5 * cellular(p, t * 0.1);
  p = SPIN_A * p * 2.02;
  sum += 0.25 * cellular(p, t * 0.2);
  p = SPIN_A * p * 2.03;
  sum += 0.125 * cellular(p, t * 0.5);
  return (sum + 0.0625) / 0.9375;
}

float billows(vec2 p, float t) {
  float sum = 0.5 * curl(p, t * 0.1);
  p = SPIN_B * p;
  sum += 0.25 * curl(p, t * 0.4);
  p = SPIN_B * p;
  sum += 0.125 * curl(p, t * 0.7);
  p = SPIN_B * p;
  sum += 0.0625 * curl(p, t * 0.3);
  p = SPIN_B * p;
  sum += 0.0325 * curl(p, t * 0.3);
  return sum * 1.2;
}

float swirl(vec2 p, float t) {
  float sum = 0.5 * curl(p, t * 0.1);
  p = SPIN_B * p;
  sum += 0.25 * curl(p, t * 0.4);
  return sum * 1.2;
}

void main() {
  vec2 px = vUv * uResolution;
  vec2 wake = texture2D(uWake, vUv).xy * uWakeStrength;
  px -= wake * uResolution.y;
  if (uTop > 0.5) px.y = uResolution.y - px.y;
  float h = px.y / uResolution.y;
  float t = uTime;
  float unit = max(uResolution.x, uResolution.y);

  float sx = (px.x + uWind * unit / uScale) / uResolution.y + uSeed * 3.1;
  float ridge = curl(vec2(sx * 0.6 + t * 0.01, 4.7), 0.0);
  ridge = 0.7 * ridge + 0.3 * curl(vec2(sx * 1.5 - t * 0.006, 8.3), 0.0);
  ridge = 0.5 + (ridge - 0.5) * 2.0;
  float tower = smoothstep(0.4, 0.85, ridge);
  float lift = mix(-uDip, uRise, tower);

  vec3 cloud = uLight;
  float amount = 0.0;
  if (h <= uCeiling + lift) {
    float churn = uFlow * 0.5;
    float drift = t * 0.15;
    vec2 uv = vec2(px.x, -px.y) / unit;
    uv += swirl(uv * uScale + vec2(0.0, churn * 0.5), churn) * 0.025;
    vec2 q = uv * uScale + vec2(uWind + uSeed * 17.3, drift + uSeed * 9.1);
    float shape = puffs(q, churn * 10.0);
    float detail = billows(q, churn * 10.0);

    float band = uCoverage * clamp(1.0 - h + lift * 0.9, 0.0, 1.0);
    shape = smoothstep(0.0, 1.0, shape) * band + uDensity;
    detail = smoothstep(0.0, 1.0, detail) * band + uDensity;
    float density = shape * detail;
    density *= smoothstep(0.0, 1.0, density);

    cloud = mix(uLight, uShade, smoothstep(0.5, 0.99, density));
    float cover = smoothstep(0.2, 0.5, density);
    float fade = 1.0 - smoothstep(uFadeStart + lift, uCeiling + lift, h);
    float part = clamp(length(wake) * 2.6, 0.0, 0.5);
    amount = cover * fade * uOpacity * (1.0 - part);
  }

  if (uTransparent > 0.5) {
    gl_FragColor = vec4(cloud * amount, amount);
  } else {
    gl_FragColor = vec4(mix(uSky, cloud, amount), 1.0);
  }
}
`;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const isTransparent = (value) => {
  const normalized = value.trim().toLowerCase();
  if (normalized === "transparent") return true;
  if (/^#[0-9a-f]{8}$/.test(normalized)) return normalized.endsWith("00");
  if (/^#[0-9a-f]{4}$/.test(normalized)) return normalized.endsWith("0");
  return /^(?:rgba?|hsla?)\(.*[,/]\s*(0|0?\.0+|0%)\s*\)$/.test(normalized);
};

const scratch = new THREE.Color();

const readSrgb = (target, value, fallback) => {
  const trimmed = value.trim();
  try {
    scratch.set(/^#[0-9a-f]{8}$/i.test(trimmed) ? trimmed.slice(0, 7) : trimmed);
  } catch {
    scratch.set(fallback);
  }
  const rgb = { r: 0, g: 0, b: 0 };
  scratch.getRGB(rgb, THREE.SRGBColorSpace);
  return target.set(rgb.r, rgb.g, rgb.b);
};

const createTarget = (width, height) =>
  new THREE.WebGLRenderTarget(width, height, {
    type: THREE.HalfFloatType,
    format: THREE.RGBAFormat,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: false,
    stencilBuffer: false,
    wrapS: THREE.ClampToEdgeWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
  });

const createWake = (width, height) => {
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const texel = new THREE.Vector2(1 / width, 1 / height);
  const push = new THREE.ShaderMaterial({
    vertexShader: passVertex,
    fragmentShader: pushFragment,
    uniforms: {
      uTexel: { value: texel },
      uField: { value: null },
      uFrom: { value: new THREE.Vector2() },
      uTo: { value: new THREE.Vector2() },
      uPush: { value: new THREE.Vector2() },
      uRadius: { value: 0.1 },
      uAspect: { value: 1 },
    },
    depthTest: false,
    depthWrite: false,
  });
  const settle = new THREE.ShaderMaterial({
    vertexShader: passVertex,
    fragmentShader: settleFragment,
    uniforms: {
      uTexel: { value: texel },
      uField: { value: null },
      uKeep: { value: 0.98 },
    },
    depthTest: false,
    depthWrite: false,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), push);
  quad.frustumCulled = false;
  scene.add(quad);
  return {
    scene,
    camera,
    quad,
    push,
    settle,
    field: { read: createTarget(width, height), write: createTarget(width, height) },
    width,
    height,
  };
};

const disposeWake = (wake) => {
  wake.field.read.dispose();
  wake.field.write.dispose();
  wake.push.dispose();
  wake.settle.dispose();
  wake.quad.geometry.dispose();
};

const DEFAULTS = {
  colors: ["#6D5BC0", "#3A2E7A"],
  backgroundColor: "#0a0a0a",
  anchor: "bottom",
  height: 0.9,
  coverage: 0.45,
  density: 0.55,
  scale: 1,
  towers: 1,
  opacity: 0.7,
  wind: 0,
  billow: 1,
  speed: 1,
  resolution: 0.36,
  interactive: true,
  cursorStrength: 1,
  cursorRadius: 0.16,
  seed: 0,
  paused: false,
};

// Draws clouds into `canvas`; `root` is the element that listens for the pointer.
// Returns a cleanup function.
export function createCloudAtlas(canvas, root, options = {}) {
  const s = { ...DEFAULTS, ...options };
  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  let reduced = motionQuery.matches;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    alpha: true,
    premultipliedAlpha: true,
    powerPreference: "high-performance",
  });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(clamp(s.resolution, 0.1, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const uniforms = {
    uResolution: { value: new THREE.Vector2(1, 1) },
    uTime: { value: STILL_TIME },
    uFlow: { value: STILL_TIME },
    uWind: { value: 0 },
    uSky: { value: new THREE.Vector3() },
    uLight: { value: new THREE.Vector3() },
    uShade: { value: new THREE.Vector3() },
    uTransparent: { value: 0 },
    uTop: { value: 0 },
    uCeiling: { value: 0.9 },
    uFadeStart: { value: 0.5 },
    uCoverage: { value: 0.45 },
    uDensity: { value: 0.55 },
    uScale: { value: 8 },
    uRise: { value: 0.5 },
    uDip: { value: 0.1 },
    uOpacity: { value: 0.9 },
    uSeed: { value: 0 },
    uWake: { value: null },
    uWakeStrength: { value: 1 },
  };
  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    depthTest: false,
    depthWrite: false,
    transparent: true,
    premultipliedAlpha: true,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
  mesh.frustumCulled = false;
  scene.add(mesh);

  const [light, shade] = s.colors;
  readSrgb(uniforms.uLight.value, light ?? DEFAULTS.colors[0], DEFAULTS.colors[0]);
  readSrgb(uniforms.uShade.value, shade ?? light ?? DEFAULTS.colors[1], DEFAULTS.colors[1]);
  const transparent = isTransparent(s.backgroundColor);
  readSrgb(uniforms.uSky.value, transparent ? "#000000" : s.backgroundColor, "#000000");
  uniforms.uTransparent.value = transparent ? 1 : 0;

  const size = { width: 1, height: 1 };
  let wake = null;
  const pointer = { x: 0.5, y: 0.5, inside: false, moved: 0 };
  const motion = {
    time: STILL_TIME,
    flow: STILL_TIME,
    drift: 0,
    lastX: 0.5,
    lastY: 0.5,
    hasLast: false,
    lastMoved: 0,
    energy: 0,
  };

  const resize = () => {
    size.width = Math.max(1, canvas.clientWidth);
    size.height = Math.max(1, canvas.clientHeight);
    renderer.setSize(size.width, size.height, false);
    const aspect = size.width / size.height;
    const fieldHeight = 72;
    const fieldWidth = Math.max(16, Math.round(fieldHeight * aspect));
    if (!wake || wake.width !== fieldWidth || wake.height !== fieldHeight) {
      if (wake) disposeWake(wake);
      wake = createWake(fieldWidth, fieldHeight);
    }
    invalidate();
  };

  const update = (dt) => {
    const aspect = size.width / size.height;
    const animate = !s.paused && !reduced && s.speed > 0;
    const step = animate ? dt * clamp(s.speed, 0, 4) : 0;
    motion.time += step;
    motion.flow += step * clamp(s.billow, 0, 4);
    motion.drift += step * clamp(s.wind, -4, 4) * 0.12;

    const previous = renderer.getRenderTarget();
    const run = (pass) => {
      wake.quad.material = pass;
      renderer.setRenderTarget(wake.field.write);
      renderer.render(wake.scene, wake.camera);
      const next = wake.field.read;
      wake.field.read = wake.field.write;
      wake.field.write = next;
    };

    let moving = false;
    if (s.interactive && !reduced && pointer.inside && pointer.moved !== motion.lastMoved) {
      motion.lastMoved = pointer.moved;
      if (!motion.hasLast) {
        motion.lastX = pointer.x;
        motion.lastY = pointer.y;
        motion.hasLast = true;
      }
      const dx = pointer.x - motion.lastX;
      const dy = pointer.y - motion.lastY;
      if (Math.hypot(dx * aspect, dy) > 0.0005) {
        const push = wake.push.uniforms;
        const gain = 1.3 * clamp(s.cursorStrength, 0, 3);
        push.uField.value = wake.field.read.texture;
        push.uAspect.value = aspect;
        push.uRadius.value = clamp(s.cursorRadius, 0.02, 1);
        push.uFrom.value.set(motion.lastX, motion.lastY);
        push.uTo.value.set(pointer.x, pointer.y);
        push.uPush.value.set(clamp(dx * aspect, -0.2, 0.2) * gain, clamp(dy, -0.2, 0.2) * gain);
        run(wake.push);
        motion.energy = 1;
        moving = true;
      }
      motion.lastX = pointer.x;
      motion.lastY = pointer.y;
    }
    if (!pointer.inside) motion.hasLast = false;

    if (motion.energy > 0.002) {
      wake.settle.uniforms.uField.value = wake.field.read.texture;
      wake.settle.uniforms.uKeep.value = Math.exp(-dt / 0.9);
      run(wake.settle);
      motion.energy *= Math.exp(-dt / 0.9);
    }
    renderer.setRenderTarget(previous);

    const pr = renderer.getPixelRatio();
    uniforms.uWake.value = wake.field.read.texture;
    uniforms.uResolution.value.set(size.width * pr, size.height * pr);
    uniforms.uTime.value = motion.time;
    uniforms.uFlow.value = motion.flow;
    uniforms.uWind.value = motion.drift;
    uniforms.uTop.value = s.anchor === "top" ? 1 : 0;
    const ceiling = clamp(s.height, 0.05, 1.5);
    uniforms.uCeiling.value = ceiling;
    uniforms.uFadeStart.value = ceiling * 0.555;
    uniforms.uCoverage.value = clamp(s.coverage, 0, 2);
    uniforms.uDensity.value = clamp(s.density, 0, 1.5);
    uniforms.uScale.value = 8 / clamp(s.scale, 0.2, 5);
    uniforms.uRise.value = 0.5 * clamp(s.towers, 0, 3);
    uniforms.uDip.value = 0.1 * clamp(s.towers, 0, 3);
    uniforms.uOpacity.value = clamp(s.opacity, 0, 1);
    uniforms.uSeed.value = s.seed;
    uniforms.uWakeStrength.value = s.interactive ? 1 : 0;

    renderer.render(scene, camera);
    return { animate, settling: moving || motion.energy > 0.002 };
  };

  // Animate while visible; otherwise only redraw on pointer input/resize.
  let visible = true;
  let frameId = null;
  let last = 0;

  const frame = (now) => {
    frameId = null;
    const dt = last ? clamp((now - last) / 1000, 0, 0.05) : 0;
    last = now;
    const { animate, settling } = update(dt);
    if ((visible && animate) || settling) {
      frameId = requestAnimationFrame(frame);
    } else {
      last = 0;
    }
  };

  function invalidate() {
    if (frameId === null) frameId = requestAnimationFrame(frame);
  }

  const visibility = new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting;
      if (visible) invalidate();
    },
    { rootMargin: "80px" }
  );
  visibility.observe(root);

  const sizing = new ResizeObserver(resize);
  sizing.observe(canvas);

  const move = (event) => {
    const box = root.getBoundingClientRect();
    const canvasBox = canvas.getBoundingClientRect();
    pointer.x = (event.clientX - canvasBox.left) / Math.max(canvasBox.width, 1);
    pointer.y = 1 - (event.clientY - canvasBox.top) / Math.max(canvasBox.height, 1);
    pointer.inside = event.clientY >= box.top && event.clientY <= box.bottom;
    pointer.moved += 1;
    invalidate();
  };
  const leave = (event) => {
    if (event.type === "pointerup" && event.pointerType === "mouse") return;
    pointer.inside = false;
    invalidate();
  };
  const onMotionChange = () => {
    reduced = motionQuery.matches;
    invalidate();
  };

  root.addEventListener("pointermove", move, { passive: true });
  root.addEventListener("pointerdown", move, { passive: true });
  root.addEventListener("pointerleave", leave, { passive: true });
  root.addEventListener("pointercancel", leave, { passive: true });
  root.addEventListener("pointerup", leave, { passive: true });
  motionQuery.addEventListener("change", onMotionChange);

  resize();

  return () => {
    if (frameId !== null) cancelAnimationFrame(frameId);
    visibility.disconnect();
    sizing.disconnect();
    root.removeEventListener("pointermove", move);
    root.removeEventListener("pointerdown", move);
    root.removeEventListener("pointerleave", leave);
    root.removeEventListener("pointercancel", leave);
    root.removeEventListener("pointerup", leave);
    motionQuery.removeEventListener("change", onMotionChange);
    if (wake) disposeWake(wake);
    material.dispose();
    mesh.geometry.dispose();
    renderer.dispose();
  };
}

// Footer clouds
const footer = document.querySelector(".site-footer");
const footerCanvas = document.querySelector(".footer-clouds");

if (footer && footerCanvas) {
  const start = () => {
    try {
      createCloudAtlas(footerCanvas, footer, {
        colors: ["#FFFFFF", "#E7F1FB"],
        backgroundColor: "transparent",
        anchor: "bottom",
        height: 0.72,
        coverage: 0.5,
        opacity: 0.95,
        wind: 0.35,
      });
    } catch {
      // no WebGL, just keep the gradient
      footerCanvas.remove();
    }
  };

  const watcher = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        watcher.disconnect();
        start();
      }
    },
    { rootMargin: "600px 0px" }
  );
  watcher.observe(footer);
}
