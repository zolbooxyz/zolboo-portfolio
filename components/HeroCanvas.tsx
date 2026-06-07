"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { palette } from "@/lib/theme";

/**
 * Interactive neon point-cloud sphere (raw three.js — no react-three-fiber).
 * - Drag to spin it; release to throw (angular momentum decays).
 * - The cursor repels nearby points, which spring back.
 * - Idle: gentle auto-rotation + breathing.
 * Skipped on small screens / reduced-motion.
 */
export default function HeroCanvas() {
  const mount = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = mount.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || window.innerWidth < 768) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.appendChild(renderer.domElement);

    // Point-cloud sphere.
    const geometry = new THREE.IcosahedronGeometry(1.7, 20);
    const pos = geometry.attributes.position as THREE.BufferAttribute;
    const base = Float32Array.from(pos.array as Float32Array);
    const count = pos.count;

    // Per-point colour: brighter toward the rim for depth.
    const colors = new Float32Array(count * 3);
    const accent = new THREE.Color(palette.accent);
    const accent2 = new THREE.Color(palette.accent2);
    for (let i = 0; i < count; i++) {
      const mix = Math.random();
      const c = accent.clone().lerp(accent2, mix * 0.6);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.032,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const points = new THREE.Points(geometry, material);
    scene.add(points);

    // ---- interaction state ----
    const ndc = new THREE.Vector2(0, 0);
    const raycaster = new THREE.Raycaster();
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const hitWorld = new THREE.Vector3();
    const hitLocal = new THREE.Vector3();
    let hasPointer = false;

    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let velY = 0.003; // idle spin
    let velX = 0;

    const setNdc = (clientX: number, clientY: number) => {
      const r = renderer.domElement.getBoundingClientRect();
      ndc.x = ((clientX - r.left) / r.width) * 2 - 1;
      ndc.y = -((clientY - r.top) / r.height) * 2 + 1;
    };

    const onPointerMove = (e: PointerEvent) => {
      hasPointer = true;
      setNdc(e.clientX, e.clientY);
      if (dragging) {
        velY = (e.clientX - lastX) * 0.005;
        velX = (e.clientY - lastY) * 0.005;
        lastX = e.clientX;
        lastY = e.clientY;
      }
    };
    const onPointerDown = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      el.style.cursor = "grabbing";
    };
    const onPointerUp = () => {
      dragging = false;
      el.style.cursor = "grab";
    };
    const onLeave = () => {
      hasPointer = false;
    };

    el.style.cursor = "grab";
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    el.addEventListener("pointerleave", onLeave);

    const resize = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w === 0 || h === 0) return;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    const v = new THREE.Vector3();
    const dir = new THREE.Vector3();
    const start = performance.now();
    let raf = 0;
    const REPEL_R = 0.9;
    const REPEL_R2 = REPEL_R * REPEL_R;

    const tick = () => {
      const t = (performance.now() - start) / 1000;

      // spin: apply velocity, decay toward idle when released
      points.rotation.y += velY;
      points.rotation.x += velX;
      if (!dragging) {
        velY += (0.003 - velY) * 0.02;
        velX += (0 - velX) * 0.04;
      }
      points.rotation.x = Math.max(-0.8, Math.min(0.8, points.rotation.x));

      // pointer position in the sphere's local space (for repel)
      let repel = false;
      if (hasPointer) {
        raycaster.setFromCamera(ndc, camera);
        if (raycaster.ray.intersectPlane(plane, hitWorld)) {
          hitLocal.copy(hitWorld);
          points.worldToLocal(hitLocal);
          repel = true;
        }
      }

      for (let i = 0; i < count; i++) {
        const bx = base[i * 3];
        const by = base[i * 3 + 1];
        const bz = base[i * 3 + 2];

        // breathing along the radial direction
        const wave =
          Math.sin(bx * 2.0 + t * 1.1) * 0.05 +
          Math.sin(by * 2.4 + t * 0.9) * 0.05;
        v.set(bx, by, bz);
        const len = v.length() || 1;
        let nx = (bx / len) * wave;
        let ny = (by / len) * wave;
        let nz = (bz / len) * wave;

        // cursor repel
        if (repel) {
          const dx = bx - hitLocal.x;
          const dy = by - hitLocal.y;
          const dz = bz - hitLocal.z;
          const d2 = dx * dx + dy * dy + dz * dz;
          if (d2 < REPEL_R2) {
            const f = (1 - Math.sqrt(d2) / REPEL_R) * 0.6;
            dir.set(dx, dy, dz).normalize();
            nx += dir.x * f;
            ny += dir.y * f;
            nz += dir.z * f;
          }
        }

        pos.setXYZ(i, bx + nx, by + ny, bz + nz);
      }
      pos.needsUpdate = true;

      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("pointerleave", onLeave);
      ro.disconnect();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === el) el.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mount} className="absolute inset-0 h-full w-full" />;
}
