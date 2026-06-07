"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { palette } from "@/lib/theme";

/**
 * Renders a portrait as a cloud of glowing cyan points sampled from a source
 * image (the photo itself is never shown — only its luminance drives point
 * placement/brightness, matching the hero's neon-wireframe aesthetic).
 *
 * Provide a source image at `src` (front-facing, clean/dark background works
 * best). Falls back to `children` (e.g. a monogram) if the image can't load or
 * on reduced-motion / small screens.
 */
export default function ParticlePortrait({
  src = "/portrait.png",
  cols = 110,
  threshold = 0.18,
  invert = false,
  children,
}: {
  src?: string;
  cols?: number;
  threshold?: number;
  invert?: boolean;
  children?: React.ReactNode;
}) {
  const mount = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = mount.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setFailed(true);
      return;
    }

    let renderer: THREE.WebGLRenderer | null = null;
    let raf = 0;
    let disposed = false;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = src;

    img.onerror = () => setFailed(true);
    img.onload = () => {
      if (disposed) return;

      // Sample the image into a low-res grid.
      const aspect = img.height / img.width;
      const rows = Math.round(cols * aspect);
      const c = document.createElement("canvas");
      c.width = cols;
      c.height = rows;
      const ctx = c.getContext("2d", { willReadFrequently: true });
      if (!ctx) return setFailed(true);
      ctx.drawImage(img, 0, 0, cols, rows);
      const data = ctx.getImageData(0, 0, cols, rows).data;

      const positions: number[] = [];
      const colors: number[] = [];
      const base = new THREE.Color(palette.accent);

      const plane = 4; // world width
      const cw = plane;
      const ch = plane * aspect;

      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const idx = (y * cols + x) * 4;
          const r = data[idx] / 255;
          const g = data[idx + 1] / 255;
          const b = data[idx + 2] / 255;
          let lum = 0.299 * r + 0.587 * g + 0.114 * b;
          if (invert) lum = 1 - lum;
          if (lum < threshold) continue;

          const px = (x / cols - 0.5) * cw;
          const py = -(y / rows - 0.5) * ch;
          positions.push(px, py, (Math.random() - 0.5) * 0.12);

          // brighter where the original is darker (hair/glasses/eyes), but keep
          // skin filled so the face doesn't read as a hollow skull
          const bright = 0.45 + lum * 1.0;
          colors.push(base.r * bright, base.g * bright, base.b * bright);
        }
      }

      if (positions.length === 0) return setFailed(true);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
      camera.position.z = 5;

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      renderer.domElement.style.display = "block";
      el.appendChild(renderer.domElement);

      const geo = new THREE.BufferGeometry();
      const posArr = new Float32Array(positions);
      geo.setAttribute("position", new THREE.BufferAttribute(posArr, 3));
      geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
      const baseY = Float32Array.from(posArr);

      const mat = new THREE.PointsMaterial({
        size: 0.04,
        vertexColors: true,
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const points = new THREE.Points(geo, mat);
      scene.add(points);

      const ptr = { x: 0, y: 0 };
      const onMove = (e: PointerEvent) => {
        ptr.x = (e.clientX / window.innerWidth) * 2 - 1;
        ptr.y = (e.clientY / window.innerHeight) * 2 - 1;
      };
      window.addEventListener("pointermove", onMove);

      const resize = () => {
        const w = el.clientWidth;
        const h = el.clientHeight;
        if (!renderer || w === 0 || h === 0) return;
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };
      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(el);

      const start = performance.now();
      const attr = geo.attributes.position as THREE.BufferAttribute;

      const tick = () => {
        const t = (performance.now() - start) / 1000;
        // gentle breathing wave along z
        for (let i = 0; i < attr.count; i++) {
          const bx = baseY[i * 3];
          const by = baseY[i * 3 + 1];
          attr.setZ(i, Math.sin(bx * 2.5 + by * 2 + t * 1.2) * 0.14);
        }
        attr.needsUpdate = true;

        points.rotation.y += (ptr.x * 0.35 - points.rotation.y) * 0.05;
        points.rotation.x += (ptr.y * 0.2 - points.rotation.x) * 0.05;

        renderer!.render(scene, camera);
        raf = requestAnimationFrame(tick);
      };
      tick();

      // store cleanup on the element for the outer return
      cleanup = () => {
        window.removeEventListener("pointermove", onMove);
        ro.disconnect();
        cancelAnimationFrame(raf);
        geo.dispose();
        mat.dispose();
        renderer?.dispose();
        if (renderer?.domElement.parentNode === el) el.removeChild(renderer.domElement);
      };
    };

    let cleanup = () => {};
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      cleanup();
    };
  }, [src, cols, threshold, invert]);

  if (failed) return <>{children}</>;

  return <div ref={mount} className="h-full w-full" />;
}
