import { AdditiveBlending, Color, NormalBlending, ShaderMaterial } from "three";

const vertexShader = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

// Faceted frosted ice: flat normals from screen-space derivatives, a Fresnel rim,
// per-facet brightness and an inner glow tinted by whatever is frozen inside.
const fragmentShader = /* glsl */ `
  uniform vec3 uTint;
  uniform float uGlow;
  uniform float uOpacity;
  uniform float uTime;
  varying vec3 vWorld;

  float hash(vec3 p) {
    return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
  }

  void main() {
    vec3 n = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
    vec3 v = normalize(cameraPosition - vWorld);
    float facing = abs(dot(n, v));
    float fres = pow(1.0 - facing, 2.0);
    float facet = hash(floor(n * 9.0));
    float shimmer = 0.5 + 0.5 * sin(uTime * 0.8 + facet * 6.2831);

    vec3 deep = vec3(0.36, 0.47, 0.56);
    vec3 frost = vec3(0.9, 0.96, 1.0);
    vec3 col = mix(deep, frost, clamp(facet * 0.55 + fres * 0.75, 0.0, 1.0));
    col += uTint * uGlow * (0.35 + 0.65 * facing) * (0.7 + 0.3 * shimmer);

    vec3 light = normalize(vec3(0.35, 0.8, 0.45));
    float spec = pow(max(dot(reflect(-v, n), light), 0.0), 28.0);
    col += spec * 0.9;

    float alpha = clamp(0.2 + fres * 0.7 + facet * 0.12 + spec + uGlow * 0.08, 0.0, 1.0) * uOpacity;
    gl_FragColor = vec4(col, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export type IceMaterial = ShaderMaterial & {
  uniforms: {
    uTint: { value: Color };
    uGlow: { value: number };
    uOpacity: { value: number };
    uTime: { value: number };
  };
};

export function createIceMaterial(tint: string, { additive = false } = {}) {
  return new ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uTint: { value: new Color(tint) },
      uGlow: { value: 0.4 },
      uOpacity: { value: 1 },
      uTime: { value: 0 },
    },
    transparent: true,
    depthWrite: false,
    blending: additive ? AdditiveBlending : NormalBlending,
  }) as IceMaterial;
}
