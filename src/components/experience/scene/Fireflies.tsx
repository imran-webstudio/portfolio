"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { AdditiveBlending, BufferAttribute, BufferGeometry, ShaderMaterial } from "three";
import { mulberry32 } from "./noise";

const vertex = /* glsl */ `
  attribute float seed;
  uniform float uTime;
  uniform float uPixelRatio;
  varying float vAlpha;
  varying float vSeed;
  void main() {
    vec3 p = position;
    float s = seed * 40.0;
    p.x += sin(uTime * 0.23 + s) * 0.9 + sin(uTime * 0.61 + s * 1.7) * 0.25;
    p.y += sin(uTime * 0.31 + s * 0.7) * 0.45;
    p.z += cos(uTime * 0.19 + s * 1.3) * 0.9;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = (2.0 + seed * 3.5) * uPixelRatio * (12.0 / -mv.z);
    float blink = smoothstep(0.15, 0.9, sin(uTime * (0.7 + seed * 1.3) + s) * 0.5 + 0.5);
    vAlpha = blink * smoothstep(45.0, 6.0, -mv.z) * smoothstep(0.3, 1.5, -mv.z);
    vSeed = seed;
  }
`;

const fragment = /* glsl */ `
  varying float vAlpha;
  varying float vSeed;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float core = smoothstep(0.5, 0.0, d);
    vec3 green = vec3(0.45, 1.0, 0.62);
    vec3 warm = vec3(0.85, 1.0, 0.55);
    gl_FragColor = vec4(mix(green, warm, vSeed) * core * vAlpha, core * vAlpha);
  }
`;

export function Fireflies({ lite }: { lite: boolean }) {
  const dpr = useThree((s) => s.viewport.dpr);

  const { geometry, material } = useMemo(() => {
    const count = lite ? 110 : 280;
    const rnd = mulberry32(73);
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const onPath = i % 4 === 0;
      if (onPath) {
        positions[i * 3] = (rnd() - 0.5) * 9;
        positions[i * 3 + 1] = 1 + rnd() * 5;
        positions[i * 3 + 2] = -2 - rnd() * 38;
      } else {
        const a = rnd() * Math.PI * 2;
        const r = 1.5 + Math.sqrt(rnd()) * 12;
        positions[i * 3] = Math.cos(a) * r;
        positions[i * 3 + 1] = 0.4 + rnd() * (i % 3 === 0 ? 13 : 4.5);
        positions[i * 3 + 2] = Math.sin(a) * r;
      }
      seeds[i] = rnd();
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(positions, 3));
    geometry.setAttribute("seed", new BufferAttribute(seeds, 1));
    const material = new ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      uniforms: { uTime: { value: 0 }, uPixelRatio: { value: 1 } },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    return { geometry, material };
  }, [lite]);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useFrame(({ clock }) => {
    material.uniforms.uTime!.value = clock.elapsedTime;
    material.uniforms.uPixelRatio!.value = dpr;
  });

  return <points geometry={geometry} material={material} frustumCulled={false} />;
}
