import { ExtrudeGeometry } from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";

/** Extrudes a 24×24 Simple Icons path into a ~1 unit wide, camera-readable 3D mark. */
export function buildLogoGeometry(path: string, lite: boolean) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="${path}"/></svg>`;
  const shapes = new SVGLoader().parse(svg).paths.flatMap((p) => SVGLoader.createShapes(p));
  const geometry = new ExtrudeGeometry(shapes, {
    depth: 2.2,
    curveSegments: lite ? 5 : 10,
    bevelEnabled: true,
    bevelThickness: 0.35,
    bevelSize: 0.12,
    bevelSegments: lite ? 1 : 3,
  });
  geometry.center();
  // SVG space is y-down; flipping about X keeps the mark readable from +Z.
  geometry.rotateX(Math.PI);
  geometry.scale(1 / 24, 1 / 24, 1 / 24);
  return geometry;
}
