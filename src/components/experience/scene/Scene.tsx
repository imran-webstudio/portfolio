"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Bloom, EffectComposer, Noise, Vignette } from "@react-three/postprocessing";
import { useRef } from "react";
import { ACESFilmicToneMapping } from "three";
import type { TechId } from "~/lib/tech";
import { RealmStage } from "../realms/RealmStage";
import { selectTech, useRealm } from "../store";
import { Artifacts } from "./Artifacts";
import { Atmosphere } from "./Atmosphere";
import { CameraRig } from "./CameraRig";
import { Fireflies } from "./Fireflies";
import { Guide } from "./Guide";
import { Keeper } from "./Keeper";
import { Logos } from "./Logos";
import { NightSky } from "./NightSky";
import { ProjectShards } from "./ProjectShards";
import { Snow } from "./Snow";
import { Terrain } from "./Terrain";
import { Trees } from "./Trees";

function ReadySignal({ onReady }: { onReady: () => void }) {
  const frames = useRef(0);
  const done = useRef(false);
  useFrame(() => {
    if (done.current) return;
    frames.current += 1;
    if (frames.current > 3) {
      done.current = true;
      onReady();
    }
  });
  return null;
}

export default function Scene({
  lite,
  projectTech,
  onReady,
}: {
  lite: boolean;
  projectTech: TechId[][];
  onReady: () => void;
}) {
  const realm = useRealm();
  // The forest stays mounted (just hidden) while a realm is open, so returning is instant.
  const inRealm = realm.phase === "inside" || realm.phase === "exit";

  return (
    <div className="fixed inset-0" aria-hidden>
      <Canvas
        dpr={lite ? [1, 1.25] : [1, 1.75]}
        shadows={!lite}
        camera={{ fov: 45, near: 0.1, far: 400, position: [0, 1.9, 10] }}
        gl={{ antialias: lite, powerPreference: "high-performance", toneMapping: ACESFilmicToneMapping }}
        onPointerMissed={() => selectTech(null)}
      >
        <group visible={!inRealm}>
          <Atmosphere lite={lite} />
          <Terrain lite={lite} />
          <Trees lite={lite} />
          <Logos lite={lite} projectTech={projectTech} />
          <Keeper lite={lite} />
          <ProjectShards count={Math.max(1, projectTech.length)} />
          <Artifacts lite={lite} />
          <Fireflies lite={lite} />
          <Snow lite={lite} />
          <NightSky lite={lite} />
        </group>
        {inRealm ? <RealmStage index={realm.index} lite={lite} /> : null}
        <CameraRig lite={lite} />
        {/* After the camera rig, so it pins itself to this frame's camera. */}
        <Guide lite={lite} />
        <ReadySignal onReady={onReady} />
        {lite ? null : (
          <EffectComposer multisampling={4}>
            <Bloom mipmapBlur intensity={0.85} luminanceThreshold={0.75} luminanceSmoothing={0.2} radius={0.7} />
            <Noise premultiply opacity={0.3} />
            <Vignette offset={0.28} darkness={0.6} />
          </EffectComposer>
        )}
      </Canvas>
    </div>
  );
}
