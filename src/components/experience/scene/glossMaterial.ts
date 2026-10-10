import { ShaderMaterial } from "three";

const vertexShader = /* glsl */ `
  varying vec3 vColor;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vColor = color;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vView = -mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`;

// Glossy brand plastic like the logo artwork: soft key light from the top left, a tight
// specular highlight, and a lilac rim, independent of the scene's night lighting.
const fragmentShader = /* glsl */ `
  uniform float uGlow;
  uniform float uOpacity;
  varying vec3 vColor;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vec3 n = normalize(vNormal);
    vec3 v = normalize(vView);
    vec3 l = normalize(vec3(-0.45, 0.75, 0.6));
    float diffuse = 0.42 + 0.58 * max(dot(n, l), 0.0);
    vec3 h = normalize(l + v);
    float nh = max(dot(n, h), 0.0);
    float spec = pow(nh, 48.0) * 0.85 + pow(nh, 8.0) * 0.12;
    float fres = pow(1.0 - max(dot(n, v), 0.0), 2.5);
    vec3 col = vColor * diffuse * (0.55 + uGlow) + spec + fres * vec3(0.78, 0.7, 1.0) * 0.55;
    gl_FragColor = vec4(col, uOpacity);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export type GlossMaterial = ShaderMaterial & {
  uniforms: { uGlow: { value: number }; uOpacity: { value: number } };
};

export function createGlossMaterial() {
  return new ShaderMaterial({
    vertexShader,
    fragmentShader,
    vertexColors: true,
    uniforms: { uGlow: { value: 0.6 }, uOpacity: { value: 1 } },
  }) as GlossMaterial;
}
