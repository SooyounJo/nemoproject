"use client";

import * as THREE from "three";

// Create only lightweight dust; no blur/composer
export function createAtmosphere(renderer, scene, camera, container) {
  const dust = buildDust();
  scene.add(dust.points);

  function onResize() {
    // no-op (nothing to resize)
  }

  function onFrame() {
    updateDust(dust);
  }

  function dispose() {
    if (dust.points) {
      if (dust.points.material && dust.points.material.map) {
        dust.points.material.map.dispose();
      }
      dust.points.material.dispose && dust.points.material.dispose();
      dust.points.geometry.dispose && dust.points.geometry.dispose();
      scene.remove(dust.points);
    }
  }

  return { onResize, onFrame, dispose };
}

function buildDust() {
  const count = 100;
  const area = { x: 8, y: 6, z: 8 };
  const positions = new Float32Array(count * 3);
  const velocities = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    positions[i * 3 + 0] = (Math.random() - 0.5) * area.x;
    positions[i * 3 + 1] = Math.random() * area.y;
    positions[i * 3 + 2] = (Math.random() - 0.5) * area.z;
    velocities[i] = 0.02 + Math.random() * 0.05;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    map: createDustTexture(),
    transparent: true,
    depthWrite: false,
    size: 0.04,
    color: 0xffffff,
    opacity: 0.2,
    blending: THREE.NormalBlending,
  });
  const points = new THREE.Points(geometry, material);
  return { points, velocities, area };
}

function updateDust(dust) {
  const geom = dust.points.geometry;
  const pos = geom.attributes.position.array;
  const vel = dust.velocities;
  for (let i = 0; i < vel.length; i++) {
    pos[i * 3 + 1] -= vel[i] * 0.016;
    if (pos[i * 3 + 1] < -1) {
      pos[i * 3 + 1] = 5 + Math.random();
      pos[i * 3 + 0] = (Math.random() - 0.5) * dust.area.x;
      pos[i * 3 + 2] = (Math.random() - 0.5) * dust.area.z;
    }
  }
  geom.attributes.position.needsUpdate = true;
}

function createDustTexture() {
  const size = 64;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d");
  ctx.clearRect(0, 0, size, size);
  const grd = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grd.addColorStop(0, "rgba(255,255,255,0.35)");
  grd.addColorStop(0.6, "rgba(255,255,255,0.15)");
  grd.addColorStop(1, "rgba(255,255,255,0.0)");
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}


