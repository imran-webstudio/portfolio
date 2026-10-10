"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import { Color, FogExp2, type DirectionalLight, type HemisphereLight } from "three";
import { blendAt, live } from "../store";
import { createAtmosphereSample, sampleAtmosphere } from "./sampleAtmosphere";

/** Drives sky colour, fog and light levels from the current chapter blend. */
export function Atmosphere({ lite }: { lite: boolean }) {
  const scene = useThree((s) => s.scene);
  const hemi = useRef<HemisphereLight>(null);
  const moon = useRef<DirectionalLight>(null);
  const rim = useRef<DirectionalLight>(null);
  const sample = useMemo(createAtmosphereSample, []);

  useLayoutEffect(() => {
    scene.background = new Color("#04070b");
    scene.fog = new FogExp2("#04070b", 0.022);
    return () => {
      scene.background = null;
      scene.fog = null;
    };
  }, [scene]);

  useFrame(({ clock }) => {
    // Realms set their own sky and fog.
    if (live.realm.phase === "inside" || live.realm.phase === "exit") return;
    const atm = sampleAtmosphere(blendAt(live.chapter), sample);
    if (scene.background instanceof Color) scene.background.copy(atm.sky);
    if (scene.fog instanceof FogExp2) {
      scene.fog.color.copy(atm.sky);
      scene.fog.density = atm.fog;
    }
    if (hemi.current) hemi.current.intensity = atm.hemi;
    if (moon.current) moon.current.intensity = atm.moon;
    if (rim.current) rim.current.intensity = atm.aurora * (0.55 + Math.sin(clock.elapsedTime * 0.3) * 0.12);
  });

  return (
    <>
      <hemisphereLight ref={hemi} args={["#4a6f9a", "#0a1712", 0.5]} />
      <directionalLight
        ref={moon}
        position={[6, 10, 12]}
        color="#b4c8ff"
        castShadow={!lite}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-9}
        shadow-camera-right={9}
        shadow-camera-top={9}
        shadow-camera-bottom={-9}
        shadow-camera-near={1}
        shadow-camera-far={40}
        shadow-bias={-0.0008}
        shadow-normalBias={0.02}
      />
      <directionalLight ref={rim} position={[-4, 12, -20]} color="#4ade80" />
    </>
  );
}
