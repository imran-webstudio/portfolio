import { Color } from "three";
import type { Blend } from "../store";
import { ATMOSPHERE, type Atmosphere } from "./config";

const SKY = ATMOSPHERE.map((a) => new Color(a.sky));
const fallback = ATMOSPHERE[0]!;

export type AtmosphereSample = Omit<Atmosphere, "sky"> & { sky: Color };

export function sampleAtmosphere(b: Blend, out: AtmosphereSample) {
  const a = ATMOSPHERE[b.from] ?? fallback;
  const z = ATMOSPHERE[b.to] ?? fallback;
  const t = b.t;
  out.sky.copy(SKY[b.from] ?? SKY[0]!).lerp(SKY[b.to] ?? SKY[0]!, t);
  out.fog = a.fog + (z.fog - a.fog) * t;
  out.hemi = a.hemi + (z.hemi - a.hemi) * t;
  out.moon = a.moon + (z.moon - a.moon) * t;
  out.core = a.core + (z.core - a.core) * t;
  out.aurora = a.aurora + (z.aurora - a.aurora) * t;
  return out;
}

export function createAtmosphereSample(): AtmosphereSample {
  return { ...fallback, sky: new Color(fallback.sky) };
}
