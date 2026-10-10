"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CylinderGeometry,
  DoubleSide,
  ShaderMaterial,
} from "three";
import { blendAt, live } from "../store";
import { createAtmosphereSample, sampleAtmosphere } from "./sampleAtmosphere";
import { mulberry32 } from "./noise";

const starVertex = /* glsl */ `
  attribute float seed;
  uniform float uTime;
  varying float vTwinkle;
  void main() {
    vTwinkle = 0.55 + 0.45 * sin(uTime * (0.6 + seed * 2.0) + seed * 40.0);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = 1.0 + seed * 2.2;
  }
`;

const starFragment = /* glsl */ `
  varying float vTwinkle;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d) * vTwinkle;
    gl_FragColor = vec4(vec3(0.85, 0.93, 1.0), a);
  }
`;

const auroraVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/** Layered curtains: a bright green band with folded rays, fading to magenta at the top edge. */
const auroraFragment = /* glsl */ `
  uniform float uTime;
  uniform float uOpacity;
  varying vec2 vUv;

  float curtain(float x, float y, float offset, float speed, float width) {
    float wave = sin(x * 7.0 + uTime * 0.11 * speed + offset) * 0.55
      + sin(x * 15.0 - uTime * 0.17 * speed + offset * 2.0) * 0.3
      + sin(x * 31.0 + uTime * 0.05 + offset * 3.0) * 0.15;
    float base = 0.18 + wave * 0.07 + offset * 0.04;
    float rise = smoothstep(base - 0.03, base + 0.02, y) * exp(-max(0.0, y - base) * width);
    float rays = 0.45 + 0.55 * pow(0.5 + 0.5 * sin(x * 260.0 + wave * 9.0 + uTime * 0.4 + offset * 5.0), 2.0);
    return rise * rays;
  }

  void main() {
    float x = vUv.x;
    float y = vUv.y;
    float a1 = curtain(x, y, 0.0, 1.0, 3.2);
    float a2 = curtain(x + 0.13, y, 1.7, -0.8, 4.5) * 0.7;
    float a3 = curtain(x - 0.27, y, 3.1, 0.6, 2.4) * 0.45;
    float a = a1 + a2 + a3;
    float h = clamp((y - 0.22) * 1.9, 0.0, 1.0);
    vec3 green = vec3(0.29, 0.98, 0.58);
    vec3 teal = vec3(0.2, 0.85, 0.75);
    vec3 magenta = vec3(0.91, 0.47, 0.98);
    vec3 col = mix(mix(green, teal, a2 / max(a, 0.001) * 0.6), magenta, h * h);
    float edges = smoothstep(0.0, 0.08, x) * smoothstep(1.0, 0.92, x);
    float fadeTop = smoothstep(1.0, 0.6, y);
    float alpha = a * edges * fadeTop * uOpacity;
    gl_FragColor = vec4(col * alpha, alpha);
  }
`;

const AURORA_ARC = 3.9;

export function NightSky({ lite }: { lite: boolean }) {
  const sample = useMemo(createAtmosphereSample, []);

  const stars = useMemo(() => {
    const count = lite ? 900 : 2200;
    const rnd = mulberry32(11);
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const theta = rnd() * Math.PI * 2;
      const phi = Math.acos(rnd() * 0.92);
      const r = 160;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi);
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      seeds[i] = rnd();
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(positions, 3));
    geometry.setAttribute("seed", new BufferAttribute(seeds, 1));
    const material = new ShaderMaterial({
      vertexShader: starVertex,
      fragmentShader: starFragment,
      uniforms: { uTime: { value: 0 } },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      fog: false,
    });
    return { geometry, material };
  }, [lite]);

  const aurora = useMemo(() => {
    const geometry = new CylinderGeometry(135, 135, 80, 96, 1, true, Math.PI - AURORA_ARC / 2, AURORA_ARC);
    const material = new ShaderMaterial({
      vertexShader: auroraVertex,
      fragmentShader: auroraFragment,
      uniforms: { uTime: { value: 0 }, uOpacity: { value: 1 } },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      side: DoubleSide,
      fog: false,
    });
    return { geometry, material };
  }, []);

  useEffect(
    () => () => {
      stars.geometry.dispose();
      stars.material.dispose();
    },
    [stars],
  );
  useEffect(
    () => () => {
      aurora.geometry.dispose();
      aurora.material.dispose();
    },
    [aurora],
  );

  useFrame(({ clock }) => {
    const atm = sampleAtmosphere(blendAt(live.chapter), sample);
    const t = clock.elapsedTime;
    stars.material.uniforms.uTime!.value = t;
    aurora.material.uniforms.uTime!.value = t;
    aurora.material.uniforms.uOpacity!.value = atm.aurora;
  });

  return (
    <group>
      <points geometry={stars.geometry} material={stars.material} frustumCulled={false} />
      <mesh geometry={aurora.geometry} material={aurora.material} position={[0, 36, -10]} frustumCulled={false} />
    </group>
  );
}
