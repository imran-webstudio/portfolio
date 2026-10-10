function hash(x: number, y: number) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return s - Math.floor(s);
}

function smooth(t: number) {
  return t * t * (3 - 2 * t);
}

export function valueNoise(x: number, y: number) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const a = hash(xi, yi);
  const b = hash(xi + 1, yi);
  const c = hash(xi, yi + 1);
  const d = hash(xi + 1, yi + 1);
  const u = smooth(xf);
  const v = smooth(yf);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

export function fbm(x: number, y: number, octaves = 5) {
  let sum = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < octaves; i++) {
    sum += amp * valueNoise(x * freq, y * freq);
    freq *= 2.03;
    amp *= 0.5;
  }
  return sum;
}

/** Deterministic PRNG so layouts are identical between renders. */
export function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function smoothstep(e0: number, e1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

/**
 * Snowfield height. Flat around the dome and along the projects tunnel corridor
 * (x≈0, z<0), rising into ridged mountains further out.
 */
export function terrainHeight(x: number, z: number) {
  const r = Math.hypot(x, z);
  const base = fbm(x * 0.06 + 3.1, z * 0.06 - 1.7, 5);
  const ridge = 1 - Math.abs(fbm(x * 0.025 + 9.2, z * 0.025 + 4.4, 4) * 2 - 1);
  const ripples = fbm(x * 0.35, z * 0.35, 3) * 0.25;

  const domeMask = smoothstep(8, 24, r);
  const inCorridor = smoothstep(2, -2, z) * smoothstep(-44, -34, z);
  const corridorMask = 1 + (smoothstep(6, 16, Math.abs(x)) - 1) * inCorridor;
  const inValley = smoothstep(-2, 4, z) * smoothstep(52, 40, z);
  const valleyMask = 1 + (smoothstep(9, 24, Math.abs(x)) - 1) * inValley;
  const mask = Math.min(domeMask, corridorMask, valleyMask);
  const mountains = (base * 6 + ridge * ridge * 18) * mask;

  return mountains + ripples - 0.15;
}
