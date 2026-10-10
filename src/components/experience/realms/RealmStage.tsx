"use client";

import { Grid, OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  FogExp2,
  PerspectiveCamera,
  type Points,
} from "three";
import { live } from "../store";
import { ARTIFACTS, type Artifact } from "./artifacts";
import { InterfaceRealm } from "./InterfaceRealm";
import { PipelineRealm } from "./PipelineRealm";
import { SignalRealm } from "./SignalRealm";
import { makeDotTexture } from "./textures";

type Look = {
  sky: string;
  fog: number;
  grid: string;
  camera: [number, number, number];
  /** Camera for narrow portrait screens, where the realm must fit a tall, thin frame. */
  portrait: [number, number, number];
  target: [number, number, number];
};

const LOOKS: Record<Artifact["id"], Look> = {
  pipeline: {
    sky: "#030914",
    fog: 0.035,
    grid: "#1d4ed8",
    camera: [0, 7.5, 14],
    portrait: [20, 12, 10],
    target: [0, 1.2, 0],
  },
  signal: {
    sky: "#05040f",
    fog: 0.04,
    grid: "#0e7490",
    camera: [0, 6.5, 11.5],
    portrait: [0, 10.5, 17.5],
    target: [0, 1.4, 0],
  },
  interface: {
    sky: "#050a0b",
    fog: 0.035,
    grid: "#15803d",
    camera: [8.5, 7.5, 9.5],
    portrait: [11.5, 9.1, 12.8],
    target: [0, 3, 0],
  },
};

function Dust({ color, count }: { color: string; count: number }) {
  const points = useRef<Points>(null);
  const { geometry, texture } = useMemo(() => {
    const pos: number[] = [];
    for (let i = 0; i < count; i++) {
      pos.push((Math.random() - 0.5) * 40, Math.random() * 14, (Math.random() - 0.5) * 40);
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(pos, 3));
    return { geometry: g, texture: makeDotTexture() };
  }, [count]);

  useEffect(
    () => () => {
      geometry.dispose();
      texture.dispose();
    },
    [geometry, texture],
  );

  useFrame(({ clock }) => {
    if (points.current) {
      points.current.rotation.y = clock.elapsedTime * 0.012;
      points.current.position.y = Math.sin(clock.elapsedTime * 0.2) * 0.3;
    }
  });

  return (
    <points ref={points} geometry={geometry}>
      <pointsMaterial
        map={texture}
        color={color}
        size={0.09}
        transparent
        opacity={0.7}
        depthWrite={false}
        blending={AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
}

/** Hosts one realm: its own sky, fog, lights and orbit controls, swapped in for the forest. */
export function RealmStage({ index, lite }: { index: number; lite: boolean }) {
  const artifact = ARTIFACTS[index] ?? ARTIFACTS[0]!;
  const look = LOOKS[artifact.id];
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const portrait = size.width / size.height < 0.8;

  useLayoutEffect(() => {
    const prevBackground = scene.background;
    const prevFog = scene.fog;
    scene.background = new Color(look.sky);
    scene.fog = new FogExp2(look.sky, portrait ? look.fog * 0.6 : look.fog);
    camera.position.set(...(portrait ? look.portrait : look.camera));
    camera.lookAt(...look.target);
    return () => {
      scene.background = prevBackground;
      scene.fog = prevFog;
      live.hoverRealm = false;
    };
  }, [scene, camera, look, portrait]);

  useLayoutEffect(() => {
    if (!(camera instanceof PerspectiveCamera)) return;
    const prevView = camera.view?.enabled ? { ...camera.view } : null;
    const aspect = size.width / size.height;
    camera.fov = aspect < 0.8 ? 64 : 50;
    // On wide screens the controls panel sits on the right, so frame the realm left of centre.
    if (aspect >= 1.2) camera.setViewOffset(size.width, size.height, size.width * 0.12, 0, size.width, size.height);
    camera.updateProjectionMatrix();
    return () => {
      if (prevView) {
        camera.setViewOffset(
          prevView.fullWidth,
          prevView.fullHeight,
          prevView.offsetX,
          prevView.offsetY,
          prevView.width,
          prevView.height,
        );
      } else {
        camera.clearViewOffset();
      }
      camera.updateProjectionMatrix();
    };
  }, [camera, size]);

  return (
    <>
      <ambientLight intensity={0.35} />
      <hemisphereLight args={["#9ec5ff", "#06080c", 0.5]} />
      <directionalLight position={[6, 12, 8]} intensity={1.1} />
      <pointLight position={look.target} color={artifact.accent} intensity={8} distance={18} decay={1.6} />
      <OrbitControls
        target={look.target}
        enablePan={false}
        enableDamping
        dampingFactor={0.07}
        autoRotate
        autoRotateSpeed={0.35}
        minDistance={6}
        maxDistance={portrait ? 34 : 22}
        maxPolarAngle={Math.PI * 0.47}
      />
      <Grid
        position={[0, 0, 0]}
        args={[60, 60]}
        cellSize={0.75}
        cellThickness={0.6}
        cellColor={look.grid}
        sectionSize={3.75}
        sectionThickness={1}
        sectionColor={artifact.accent}
        fadeDistance={34}
        fadeStrength={1.6}
        infiniteGrid
      />
      <Dust color={artifact.accent} count={lite ? 180 : 420} />
      {artifact.id === "pipeline" ? <PipelineRealm lite={lite} accent={artifact.accent} /> : null}
      {artifact.id === "signal" ? <SignalRealm lite={lite} accent={artifact.accent} /> : null}
      {artifact.id === "interface" ? <InterfaceRealm lite={lite} /> : null}
    </>
  );
}
