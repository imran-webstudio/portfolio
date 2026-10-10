"use client";

import { Html } from "@react-three/drei";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  CanvasTexture,
  Color,
  DoubleSide,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  SRGBColorSpace,
  type Group,
} from "three";
import { TECH_BY_ID } from "~/lib/tech";
import { ambient } from "../audio";
import { buildLogoGeometry } from "../scene/logoGeometry";
import { live } from "../store";
import { INTERFACE_LAYERS, interfaceStore } from "./realmData";

const W = 6.4;
const H = 4;
const GAP = 1.15;
const BASE_Y = 0.6;
const CW = 1024;
const CH = 640;

const HEADER = [40, 36, 944, 64] as const;
const HERO = [40, 128, 944, 190] as const;
const BUTTON = [80, 250, 180, 44] as const;
const FOOTER = [40, 574, 944, 30] as const;
const CARDS = [0, 1, 2].map((k) => [40 + k * 323, 346, 298, 200] as const);

type Rect = readonly [number, number, number, number];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function drawLayer(index: number, color: string) {
  const canvas = document.createElement("canvas");
  canvas.width = CW;
  canvas.height = CH;
  const ctx = canvas.getContext("2d")!;
  const stroke = (r: Rect, alpha = 0.9, radius = 10) => {
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.roundRect(r[0], r[1], r[2], r[3], radius);
    ctx.stroke();
  };
  const fill = (r: Rect, alpha: number, radius = 10) => {
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.roundRect(r[0], r[1], r[2], r[3], radius);
    ctx.fill();
  };
  const text = (s: string, x: number, y: number, size = 24, alpha = 0.95) => {
    ctx.globalAlpha = alpha;
    ctx.font = `${size}px ui-monospace, Menlo, monospace`;
    ctx.fillText(s, x, y);
  };
  const lines = (x: number, y: number, w: number, count: number, alpha = 0.45) => {
    for (let i = 0; i < count; i++) fill([x, y + i * 22, w * (i === count - 1 ? 0.6 : 1), 8], alpha, 4);
  };

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 3;
  fill([6, 6, CW - 12, CH - 12], 0.05, 22);
  stroke([6, 6, CW - 12, CH - 12], 0.85, 22);

  switch (index) {
    case 0: {
      stroke(HEADER, 0.7);
      stroke(HERO, 0.7);
      CARDS.forEach((c) => stroke(c, 0.7));
      stroke(FOOTER, 0.5);
      lines(70, 160, 420, 3);
      CARDS.forEach((c) => lines(c[0] + 24, c[1] + 110, c[2] - 48, 3, 0.35));
      text("<header>", 60, 78, 22, 0.8);
      text("<main>", 840, 160, 22, 0.8);
      text("<footer>", 60, 596, 20, 0.7);
      break;
    }
    case 1: {
      fill(HEADER, 0.22);
      const g = ctx.createLinearGradient(HERO[0], 0, HERO[0] + HERO[2], 0);
      g.addColorStop(0, color);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      fill(HERO, 0.35);
      ctx.fillStyle = color;
      CARDS.forEach((c) => fill(c, 0.16));
      fill(BUTTON, 0.7, 22);
      text("Aa", 640, 240, 96, 0.9);
      [40, 28, 18, 12].forEach((h, i) => fill([800, 168 + i * 34, 140 - i * 22, h / 2], 0.6, 3));
      ["#4ade80", "#38bdf8", "#e879f9", "#facc15"].forEach((c, i) => {
        ctx.fillStyle = c;
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.arc(80 + i * 46, 596 - 8, 14, 0, Math.PI * 2);
        ctx.fill();
      });
      break;
    }
    case 2: {
      ctx.setLineDash([14, 10]);
      const tag = (r: Rect, label: string) => {
        stroke([r[0] - 6, r[1] - 6, r[2] + 12, r[3] + 12], 0.9, 12);
        text(label, r[0] + 10, r[1] + 32, 24);
      };
      tag(HEADER, "<Header />");
      tag(HERO, "<Hero />");
      CARDS.forEach((c, i) => tag(c, `<Card i={${i}} />`));
      ctx.setLineDash([]);
      stroke(BUTTON, 1, 22);
      text("<Button />", BUTTON[0] + 20, BUTTON[1] + 30, 20);
      break;
    }
    case 3: {
      stroke([720, 128, 260, 70], 0.9);
      text("api.project.list()", 732, 172, 22);
      CARDS.forEach((c) => {
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.moveTo(850, 198);
        ctx.bezierCurveTo(850, 280, c[0] + c[2] / 2, 280, c[0] + c[2] / 2, c[1]);
        ctx.stroke();
        fill([c[0] + c[2] / 2 - 6, c[1] - 6, 12, 12], 1, 6);
      });
      text("type Project = {", 70, 170, 24);
      text("  title: string", 70, 204, 24, 0.8);
      text("  tech: string[]", 70, 238, 24, 0.8);
      text("}", 70, 272, 24);
      CARDS.forEach((c) => text("{ title, tech }", c[0] + 24, c[1] + 120, 20, 0.7));
      break;
    }
    default: {
      const c = CARDS[1]!;
      const glow = ctx.createRadialGradient(c[0] + c[2] / 2, c[1] + c[3] / 2, 10, c[0] + c[2] / 2, c[1] + c[3] / 2, 220);
      glow.addColorStop(0, color);
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      fill([c[0] - 60, c[1] - 60, c[2] + 120, c[3] + 120], 0.35, 30);
      ctx.fillStyle = color;
      stroke(c, 1, 12);
      stroke([BUTTON[0] - 8, BUTTON[1] - 8, BUTTON[2] + 16, BUTTON[3] + 16], 1, 28);
      stroke([BUTTON[0] - 16, BUTTON[1] - 16, BUTTON[2] + 32, BUTTON[3] + 32], 0.4, 34);
      [26, 46, 66].forEach((r, i) => {
        ctx.globalAlpha = 0.7 - i * 0.2;
        ctx.beginPath();
        ctx.arc(c[0] + 210, c[1] + 120, r, 0, Math.PI * 2);
        ctx.stroke();
      });
      ctx.globalAlpha = 1;
      ctx.beginPath();
      const [x, y] = [c[0] + 210, c[1] + 120];
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + 44);
      ctx.lineTo(x + 11, y + 33);
      ctx.lineTo(x + 26, y + 40);
      ctx.lineTo(x + 30, y + 34);
      ctx.lineTo(x + 16, y + 27);
      ctx.lineTo(x + 31, y + 23);
      ctx.closePath();
      ctx.fill();
      text(":hover  :focus-visible  onClick", 60, 600, 22, 0.85);
      break;
    }
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export function InterfaceRealm({ lite }: { lite: boolean }) {
  const gl = useThree((s) => s.gl);
  const layers = useRef<(Group | null)[]>([]);
  const logos = useRef<(Group | null)[]>([]);

  const assets = useMemo(() => {
    const textures = INTERFACE_LAYERS.map((l, i) => drawLayer(i, l.color));
    return {
      plane: new PlaneGeometry(W, H),
      textures,
      mats: textures.map(
        (map) =>
          new MeshBasicMaterial({
            map,
            transparent: true,
            side: DoubleSide,
            depthWrite: false,
            blending: AdditiveBlending,
            toneMapped: false,
          }),
      ),
      logos: INTERFACE_LAYERS.map((l) => buildLogoGeometry(TECH_BY_ID[l.tech].path, lite)),
      logoMats: INTERFACE_LAYERS.map((l) => {
        const c = new Color(TECH_BY_ID[l.tech].color);
        return new MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.8, toneMapped: false });
      }),
    };
  }, [lite]);

  useEffect(() => {
    return () => {
      assets.plane.dispose();
      assets.textures.forEach((t) => t.dispose());
      assets.mats.forEach((m) => m.dispose());
      assets.logos.forEach((g) => g.dispose());
      assets.logoMats.forEach((m) => m.dispose());
    };
  }, [assets]);

  const sim = useMemo(() => ({ explode: 0, focus: INTERFACE_LAYERS.map(() => 0) }), []);

  useFrame(({ clock, camera }, delta) => {
    const dt = Math.min(delta, 0.05);
    const t = clock.elapsedTime;
    const { exploded, active } = interfaceStore.get();
    sim.explode += ((exploded ? 1 : 0) - sim.explode) * (1 - Math.exp(-dt * 2.2));
    const e = sim.explode;
    for (let i = 0; i < INTERFACE_LAYERS.length; i++) {
      sim.focus[i]! += ((active === i ? 1 : 0) - sim.focus[i]!) * (1 - Math.exp(-dt * 6));
      const f = sim.focus[i]!;
      const g = layers.current[i];
      if (g) {
        g.position.y = BASE_Y + i * (0.05 + GAP * e) + Math.sin(t * 0.7 + i * 0.9) * 0.06 * e + f * 0.3;
        g.rotation.y = Math.sin(t * 0.25) * 0.04 * e;
      }
      const dim = active === -1 ? 1 : 0.3 + f * 0.7;
      assets.mats[i]!.opacity = (0.55 + f * 0.45) * dim;
      assets.logoMats[i]!.emissiveIntensity = 0.5 + f * 1.8;
      const logo = logos.current[i];
      if (logo) {
        logo.lookAt(camera.position);
        logo.rotateY(Math.sin(t * 0.5 + i) * 0.3);
        logo.scale.setScalar(0.5 + f * 0.15);
      }
    }
  });

  const onOver = (i: number) => (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    interfaceStore.set({ active: i });
    live.hoverRealm = true;
    gl.domElement.style.cursor = "pointer";
  };
  const onOut = (i: number) => () => {
    if (interfaceStore.get().active === i) interfaceStore.set({ active: -1 });
    live.hoverRealm = false;
    gl.domElement.style.cursor = "";
  };
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.delta > 6) return;
    interfaceStore.set((s) => ({ exploded: !s.exploded }));
    ambient.blip(interfaceStore.get().exploded ? 990 : 660);
  };

  return (
    <group>
      {INTERFACE_LAYERS.map((layer, i) => (
        <group
          key={layer.title}
          ref={(el) => {
            layers.current[i] = el;
          }}
          position={[0, BASE_Y, 0]}
        >
          <mesh
            geometry={assets.plane}
            material={assets.mats[i]}
            rotation={[-Math.PI / 2, 0, 0]}
            renderOrder={i}
            onPointerOver={onOver(i)}
            onPointerOut={onOut(i)}
            onClick={onClick}
          />
          <group
            ref={(el) => {
              logos.current[i] = el;
            }}
            position={[-W / 2 - 0.7, 0.25, H / 2 - 0.4]}
          >
            <mesh geometry={assets.logos[i]} material={assets.logoMats[i]} />
          </group>
          <Html position={[W / 2 + 0.35, 0.05, -H / 2 + 0.3]} zIndexRange={[5, 0]} className="pointer-events-none select-none">
            <div className="realm-tag realm-tag-left" style={{ borderColor: `${layer.color}66` }}>
              <span className="realm-tag-index">{pad(i + 1)}</span>
              <span className="realm-tag-title">{layer.title}</span>
              <span className="realm-tag-detail">{TECH_BY_ID[layer.tech].title}</span>
            </div>
          </Html>
        </group>
      ))}
    </group>
  );
}
