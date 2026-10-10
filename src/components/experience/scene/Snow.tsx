"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo } from "react";
import { AdditiveBlending, BufferAttribute, BufferGeometry, ShaderMaterial } from "three";
import { mulberry32 } from "./noise";

const HEIGHT = 26;

const vertex = /* glsl */ `
  attribute float seed;
  uniform float uTime;
  uniform float uPixelRatio;
  varying float vAlpha;
  void main() {
    vec3 p = position;
    p.y = mod(p.y - uTime * (0.35 + seed * 0.55), ${HEIGHT.toFixed(1)}) - 1.0;
    p.x += sin(uTime * 0.4 + seed * 30.0) * 0.5;
    p.z += cos(uTime * 0.3 + seed * 20.0) * 0.3;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = (1.5 + seed * 3.0) * uPixelRatio * (14.0 / -mv.z);
    vAlpha = smoothstep(60.0, 8.0, -mv.z) * smoothstep(0.2, 2.0, -mv.z);
  }
`;

const fragment = /* glsl */ `
  uniform float uOpacity;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d) * vAlpha * uOpacity;
    gl_FragColor = vec4(vec3(0.85, 0.92, 1.0), a);
  }
`;

export function Snow({ lite }: { lite: boolean }) {
  const dpr = useThree((s) => s.viewport.dpr);

  const { geometry, material } = useMemo(() => {
    const count = lite ? 400 : 1300;
    const rnd = mulberry32(42);
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (rnd() - 0.5) * 60;
      positions[i * 3 + 1] = rnd() * HEIGHT;
      positions[i * 3 + 2] = 24 - rnd() * 70;
      seeds[i] = rnd();
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(positions, 3));
    geometry.setAttribute("seed", new BufferAttribute(seeds, 1));
    const material = new ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      uniforms: { uTime: { value: 0 }, uPixelRatio: { value: 1 }, uOpacity: { value: 0.45 } },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    return { geometry, material };
  }, [lite]);

  useFrame(({ clock }) => {
    material.uniforms.uTime!.value = clock.elapsedTime;
    material.uniforms.uPixelRatio!.value = dpr;
  });

  return <points geometry={geometry} material={material} frustumCulled={false} />;
}
