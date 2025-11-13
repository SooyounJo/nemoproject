"use client";

import * as THREE from "three";
// EXR 제거: 환경맵을 사용하지 않고 흰색 배경 공간만 구성
export function setupEXREnvironment(renderer, scene, _exrPath = "") {
  scene.environment = null;
  scene.background = new THREE.Color(0xf2f2f2);
  return () => {
    // no-op: nothing to dispose
  };
}


