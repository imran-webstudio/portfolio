import { ambient } from "../audio";
import { live, setRealm } from "../store";

export function enterRealm(index: number) {
  if (live.realm.phase !== "idle") return;
  live.hoverArtifact = -1;
  setRealm(index, "enter");
  ambient.warp();
}

export function exitRealm() {
  if (live.realm.phase !== "inside") return;
  live.hoverRealm = false;
  setRealm(live.realm.index, "exit");
  ambient.warp(true);
}
