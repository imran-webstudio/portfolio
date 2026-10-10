"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { PerspectiveCamera, Vector3 } from "three";
import { ARTIFACTS } from "../realms/artifacts";
import { blendAt, clamp01, live, presence, REALM_TIMING, stopProgress } from "../store";
import { CAMERA, type CameraKey } from "./config";

const PORTRAIT_SHIFT = 0.22;
const CONTACT = 5;
const PORTRAIT_CONTACT_PULL = 0.55;
/** Extra field of view at the end of a realm dive, for a warp-speed stretch. */
const DIVE_FOV = 32;

function setVec(out: Vector3, v: readonly [number, number, number]) {
  return out.set(v[0], v[1], v[2]);
}

function shots(key: CameraKey) {
  return [key.a, ...(key.stops ?? []), key.b];
}

export function CameraRig({ lite }: { lite: boolean }) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const first = useRef(true);
  const baseFov = useRef(45);
  const dive = useRef({ active: false, from: new Vector3(), lookFrom: new Vector3() });
  const v = useMemo(
    () => ({
      pos: new Vector3(),
      look: new Vector3(),
      a: new Vector3(),
      b: new Vector3(),
      curPos: new Vector3(),
      curLook: new Vector3(),
      sway: new Vector3(),
      target: new Vector3(),
    }),
    [],
  );

  useEffect(() => {
    if (!(camera instanceof PerspectiveCamera)) return;
    const aspect = size.width / size.height;
    live.aspect = aspect;
    baseFov.current = aspect < 0.8 ? 62 : aspect < 1.2 ? 54 : 45;
    camera.fov = baseFov.current;
    // Portrait panels are bottom sheets: shift the frame so each chapter's focus sits above them.
    if (aspect < 0.8) {
      camera.setViewOffset(size.width, size.height, 0, size.height * PORTRAIT_SHIFT, size.width, size.height);
    } else {
      camera.clearViewOffset();
    }
    camera.updateProjectionMatrix();
  }, [camera, size]);

  useFrame(({ clock }, delta) => {
    const realm = live.realm;
    // Inside a realm the realm stage owns the camera.
    if (realm.phase === "inside" || realm.phase === "exit" || !(camera instanceof PerspectiveCamera)) return;

    const b = blendAt(live.chapter);
    const t = clock.elapsedTime;

    if (b.from === b.to) {
      const list = shots(CAMERA[b.from]!);
      if (list.length > 2) {
        const { k, glide } = stopProgress(b.u, list.length);
        const s0 = list[k]!;
        const s1 = list[Math.min(k + 1, list.length - 1)]!;
        v.pos.lerpVectors(setVec(v.a, s0.pos), setVec(v.b, s1.pos), glide);
        v.look.lerpVectors(setVec(v.a, s0.look), setVec(v.b, s1.look), glide);
      } else {
        const key = CAMERA[b.from]!;
        v.pos.lerpVectors(setVec(v.a, key.a.pos), setVec(v.b, key.b.pos), b.u);
        v.look.lerpVectors(setVec(v.a, key.a.look), setVec(v.b, key.b.look), b.u);
      }
    } else {
      const prev = CAMERA[b.from]!;
      const next = CAMERA[b.to]!;
      v.pos.lerpVectors(setVec(v.a, prev.b.pos), setVec(v.b, next.a.pos), b.t);
      v.pos.y += Math.sin(Math.PI * b.t) * (next.arc ?? 0);
      v.look.lerpVectors(setVec(v.a, prev.b.look), setVec(v.b, next.a.look), b.t);
    }

    // Narrow screens need the contact crystals further away to leave room for their annotations.
    const pull = live.aspect < 0.8 ? presence(b, CONTACT) * PORTRAIT_CONTACT_PULL : 0;
    if (pull > 0) v.pos.sub(v.look).multiplyScalar(1 + pull).add(v.look);

    const parallax = lite ? 0.12 : 0.4;
    v.sway.set(
      live.pointerX * parallax + Math.sin(t * 0.21) * 0.08,
      live.pointerY * parallax * 0.5 + Math.sin(t * 0.17) * 0.06,
      0,
    );
    v.pos.add(v.sway);

    let fovTarget = baseFov.current;
    const d = dive.current;
    if (realm.phase === "enter" && ARTIFACTS[realm.index]) {
      // Accelerate straight into the chosen crystal.
      setVec(v.target, ARTIFACTS[realm.index]!.position);
      if (!d.active) {
        d.active = true;
        d.from.copy(v.curPos);
        d.lookFrom.copy(v.curLook);
      }
      const p = clamp01((performance.now() - realm.since) / REALM_TIMING.dive);
      const e = p * p * p;
      v.curLook.lerpVectors(d.lookFrom, v.target, clamp01(p * 3));
      v.curPos.lerpVectors(d.from, v.target, e * 0.97);
      fovTarget = baseFov.current + DIVE_FOV * e;
      camera.fov = fovTarget;
    } else {
      d.active = false;
      if (first.current) {
        v.curPos.copy(v.pos);
        v.curLook.copy(v.look);
        first.current = false;
      } else {
        const k = 1 - Math.exp(-delta * 5);
        v.curPos.lerp(v.pos, k);
        v.curLook.lerp(v.look, k);
      }
      camera.fov += (fovTarget - camera.fov) * (1 - Math.exp(-delta * 4));
    }
    camera.updateProjectionMatrix();
    camera.position.copy(v.curPos);
    camera.lookAt(v.curLook);
  });

  return null;
}
