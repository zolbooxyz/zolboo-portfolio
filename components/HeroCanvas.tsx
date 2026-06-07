"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { palette } from "@/lib/theme";

/**
 * Flowing wireframe form rendered with raw three.js (no react-three-fiber, to
 * avoid React-internals coupling). A subdivided icosahedron is displaced per
 * frame with layered noise for an organic, breathing motion, tilts toward the
 * pointer, and slowly rotates. Skipped on small screens / reduced-motion.
 */
export default function HeroCanvas() {
  const mount = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const el = mount.current;
    if (!el || reduced || window.innerWidth < 768) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.appendChild(renderer.domElement);

    // Geometry — keep a pristine copy of the vertices to displace from.
    const geometry = new THREE.IcosahedronGeometry(1.6, 24);
    const base = (geometry.attributes.position as THREE.BufferAttribute).clone();
    const pos = geometry.attributes.position as THREE.BufferAttribute;

    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(palette.accent),
      emissive: new THREE.Color(palette.accent2),
      emissiveIntensity: 0.4,
      metalness: 0.7,
      roughness: 0.2,
      wireframe: true,
    });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const key = new THREE.PointLight(new THREE.Color(palette.accent), 1.4);
    key.position.set(4, 4, 4);
    scene.add(key);
    const fill = new THREE.PointLight(new THREE.Color(palette.accent2), 0.7);
    fill.position.set(-4, -2, 2);
    scene.add(fill);

    // Pointer parallax (normalised -1..1).
    const ptr = { x: 0, y: 0 };
    const onMove = (e: PointerEvent) => {
      ptr.x = (e.clientX / window.innerWidth) * 2 - 1;
      ptr.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove);

    const resize = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    const v = new THREE.Vector3();
    const start = performance.now();
    let raf = 0;

    const tick = () => {
      const t = (performance.now() - start) / 1000;

      // Displace each vertex along its normal using layered sine "noise".
      for (let i = 0; i < pos.count; i++) {
        v.set(base.getX(i), base.getY(i), base.getZ(i));
        const n = v.clone().normalize();
        const wave =
          Math.sin(v.x * 2.2 + t * 1.1) * 0.12 +
          Math.sin(v.y * 2.8 + t * 0.9) * 0.1 +
          Math.sin(v.z * 2.5 + t * 1.3) * 0.1;
        pos.setXYZ(i, v.x + n.x * wave, v.y + n.y * wave, v.z + n.z * wave);
      }
      pos.needsUpdate = true;
      geometry.computeVertexNormals();

      mesh.rotation.y += 0.0016;
      mesh.rotation.z += 0.0006;
      mesh.rotation.x += (ptr.y * 0.4 - mesh.rotation.x) * 0.04;
      mesh.position.x += (ptr.x * 0.3 - mesh.position.x) * 0.04;

      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      ro.disconnect();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      el.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mount} className="absolute inset-0 h-full w-full" />;
}
