"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { content } from "@/lib/content";
import { useLang } from "@/lib/LanguageContext";
import { palette } from "@/lib/theme";

type NodeKind = "about" | "project" | "contact";
type WorldNode = {
  id: string;
  kind: NodeKind;
  pos: [number, number, number];
};

// Distribute N nodes evenly on a sphere shell (fibonacci sphere).
function fibSphere(n: number, radius: number): [number, number, number][] {
  const out: [number, number, number][] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const theta = golden * i;
    out.push([Math.cos(theta) * r * radius, y * radius * 0.7, Math.sin(theta) * r * radius]);
  }
  return out;
}

function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl") || c.getContext("experimental-webgl"));
  } catch {
    return false;
  }
}

export default function World() {
  const { t } = useLang();

  // Build the node list once: about + projects + contact.
  const nodes = useMemo<WorldNode[]>(() => {
    const ids: { id: string; kind: NodeKind }[] = [
      { id: "about", kind: "about" },
      ...content.projects.items.map((p) => ({ id: p.id, kind: "project" as const })),
      { id: "contact", kind: "contact" },
    ];
    const positions = fibSphere(ids.length, 4.2);
    return ids.map((n, i) => ({ ...n, pos: positions[i] }));
  }, []);

  const mountRef = useRef<HTMLDivElement>(null);
  const labelRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const introRef = useRef<HTMLDivElement>(null);

  const [fallback, setFallback] = useState(false);
  const [selected, setSelected] = useState<WorldNode | null>(null);
  const focusRef = useRef<{ theta: number; phi: number } | null>(null);
  const introGoneRef = useRef(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const el = mountRef.current;
    if (!el || reduced || window.innerWidth < 768 || !hasWebGL()) {
      setFallback(true);
      return;
    }

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(new THREE.Color(palette.bg), 0.045);
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.appendChild(renderer.domElement);

    // ---- cinematic post-processing: bloom ----
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(1, 1),
      0.6, // strength
      0.6, // radius
      0.12 // threshold — keep point structure, glow the brightest
    );
    composer.addPass(bloom);
    composer.addPass(new OutputPass());

    // ---- starfield ----
    const starN = 1400;
    const starPos = new Float32Array(starN * 3);
    for (let i = 0; i < starN; i++) {
      const r = 12 + Math.random() * 18;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(Math.random() * 2 - 1);
      starPos[i * 3] = r * Math.sin(ph) * Math.cos(th);
      starPos[i * 3 + 1] = r * Math.cos(ph);
      starPos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    const stars = new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({
        color: new THREE.Color(palette.ink),
        size: 0.05,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
      })
    );
    scene.add(stars);

    // ---- central neon core (points sphere) ----
    const coreGeo = new THREE.IcosahedronGeometry(1.5, 16);
    const corePos = coreGeo.attributes.position as THREE.BufferAttribute;
    const coreBase = Float32Array.from(corePos.array as Float32Array);
    const core = new THREE.Points(
      coreGeo,
      new THREE.PointsMaterial({
        color: new THREE.Color(palette.accent),
        size: 0.03,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    scene.add(core);

    // ---- node markers (glowing points) ----
    const nodeGeo = new THREE.BufferGeometry();
    const nodeArr = new Float32Array(nodes.length * 3);
    nodes.forEach((n, i) => {
      nodeArr[i * 3] = n.pos[0];
      nodeArr[i * 3 + 1] = n.pos[1];
      nodeArr[i * 3 + 2] = n.pos[2];
    });
    nodeGeo.setAttribute("position", new THREE.BufferAttribute(nodeArr, 3));
    const nodeMarkers = new THREE.Points(
      nodeGeo,
      new THREE.PointsMaterial({
        color: new THREE.Color(palette.accent),
        size: 0.22,
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    scene.add(nodeMarkers);

    // faint links from core to each node
    const linkPts: number[] = [];
    nodes.forEach((n) => {
      linkPts.push(0, 0, 0, n.pos[0], n.pos[1], n.pos[2]);
    });
    const linkGeo = new THREE.BufferGeometry();
    linkGeo.setAttribute("position", new THREE.Float32BufferAttribute(linkPts, 3));
    const links = new THREE.LineSegments(
      linkGeo,
      new THREE.LineBasicMaterial({
        color: new THREE.Color(palette.accent2),
        transparent: true,
        opacity: 0.12,
      })
    );
    scene.add(links);

    // ---- camera orbit state ----
    const cam = { theta: 0.6, phi: 1.25, radius: 9.5 };
    const vel = { theta: 0, phi: 0 };
    let dragging = false;
    let lastX = 0;
    let lastY = 0;

    const onDown = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      el.style.cursor = "grabbing";
      if (!introGoneRef.current) {
        introGoneRef.current = true;
        if (introRef.current) introRef.current.style.opacity = "0";
      }
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      vel.theta = -(e.clientX - lastX) * 0.005;
      vel.phi = -(e.clientY - lastY) * 0.005;
      lastX = e.clientX;
      lastY = e.clientY;
      focusRef.current = null; // user took control
    };
    const onUp = () => {
      dragging = false;
      el.style.cursor = "grab";
    };
    const onWheel = (e: WheelEvent) => {
      cam.radius = Math.max(5.5, Math.min(16, cam.radius + e.deltaY * 0.01));
    };

    el.style.cursor = "grab";
    renderer.domElement.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    renderer.domElement.addEventListener("wheel", onWheel, { passive: true });

    const resize = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h);
      composer.setSize(w, h);
      bloom.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    const v = new THREE.Vector3();
    const tmp = new THREE.Vector3();
    const start = performance.now();
    let raf = 0;

    const tick = () => {
      const time = (performance.now() - start) / 1000;

      // breathing core
      for (let i = 0; i < corePos.count; i++) {
        const bx = coreBase[i * 3];
        const by = coreBase[i * 3 + 1];
        const bz = coreBase[i * 3 + 2];
        const len = Math.hypot(bx, by, bz) || 1;
        const w = Math.sin(bx * 2 + time * 1.1) * 0.06 + Math.sin(by * 2.3 + time) * 0.05;
        corePos.setXYZ(i, bx + (bx / len) * w, by + (by / len) * w, bz + (bz / len) * w);
      }
      corePos.needsUpdate = true;
      core.rotation.y += 0.0016;
      stars.rotation.y += 0.0004;

      // camera orbit (apply velocity + decay, idle auto-rotate, focus tween)
      if (focusRef.current) {
        cam.theta += (focusRef.current.theta - cam.theta) * 0.06;
        cam.phi += (focusRef.current.phi - cam.phi) * 0.06;
      } else {
        cam.theta += vel.theta + (dragging ? 0 : 0.0008);
        cam.phi += vel.phi;
        vel.theta *= 0.92;
        vel.phi *= 0.92;
      }
      cam.phi = Math.max(0.45, Math.min(2.6, cam.phi));

      camera.position.set(
        cam.radius * Math.sin(cam.phi) * Math.sin(cam.theta),
        cam.radius * Math.cos(cam.phi),
        cam.radius * Math.sin(cam.phi) * Math.cos(cam.theta)
      );
      camera.lookAt(0, 0, 0);

      // project node positions to screen → move DOM labels
      const w = renderer.domElement.clientWidth;
      const h = renderer.domElement.clientHeight;
      nodes.forEach((n, i) => {
        const elLabel = labelRefs.current[i];
        if (!elLabel) return;
        v.set(n.pos[0], n.pos[1], n.pos[2]).project(camera);
        const behind = v.z > 1;
        tmp.set(n.pos[0], n.pos[1], n.pos[2]);
        const dist = camera.position.distanceTo(tmp);
        const x = (v.x * 0.5 + 0.5) * w;
        const y = (-v.y * 0.5 + 0.5) * h;
        elLabel.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
        elLabel.style.opacity = behind ? "0" : String(Math.max(0.25, Math.min(1, 14 / dist)));
        elLabel.style.pointerEvents = behind ? "none" : "auto";
        elLabel.style.zIndex = String(1000 - Math.round(dist * 10));
      });

      composer.render();
      raf = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      renderer.domElement.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      renderer.domElement.removeEventListener("wheel", onWheel);
      ro.disconnect();
      starGeo.dispose();
      coreGeo.dispose();
      nodeGeo.dispose();
      linkGeo.dispose();
      composer.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === el) el.removeChild(renderer.domElement);
    };
  }, [nodes]);

  // focus the camera roughly toward a node when selected
  const selectNode = (n: WorldNode) => {
    setSelected(n);
    introGoneRef.current = true;
    if (introRef.current) introRef.current.style.opacity = "0";
    const [x, y, z] = n.pos;
    focusRef.current = {
      theta: Math.atan2(x, z),
      phi: Math.acos(Math.max(-1, Math.min(1, y / Math.hypot(x, y, z)))),
    };
  };

  if (fallback) return <WorldFallback />;

  return (
    <div className="fixed inset-0 select-none overflow-hidden bg-bg">
      <div ref={mountRef} className="absolute inset-0 h-full w-full" />

      {/* node labels (positioned each frame by the render loop) */}
      <div className="pointer-events-none absolute inset-0">
        {nodes.map((n, i) => (
          <button
            key={n.id}
            ref={(elr) => {
              labelRefs.current[i] = elr;
            }}
            onClick={() => selectNode(n)}
            className="group absolute left-0 top-0 flex items-center gap-2 whitespace-nowrap"
            style={{ pointerEvents: "auto" }}
          >
            <span className="h-2 w-2 rounded-full bg-accent shadow-glow-sm transition-transform group-hover:scale-150" />
            <span className="font-mono text-xs tracking-wide text-ink/80 transition-colors group-hover:text-accent">
              {nodeTitle(n, t)}
            </span>
          </button>
        ))}
      </div>

      {/* center intro */}
      <div
        ref={introRef}
        className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center transition-opacity duration-700"
      >
        <p className="font-display text-sm text-muted">{t(content.hero.greeting)}</p>
        <h1 className="font-display text-6xl font-extrabold tracking-tight text-grad sm:text-8xl">
          Zolboo<span className="text-accent text-glow">.</span>
        </h1>
        <p className="mt-3 max-w-md px-6 text-sm text-muted">{t(content.hero.tagline)}</p>
        <p className="mt-8 animate-pulseGlow font-mono text-[11px] tracking-wide text-accent/70">
          ↔ чирээд тойрон нисээрэй · дугаарууд дээр дар
        </p>
      </div>

      {/* top bar: name + language */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between px-6 py-5 sm:px-10">
        <a href="#" className="pointer-events-auto flex items-center gap-2" onClick={(e) => { e.preventDefault(); setSelected(null); }}>
          <span className="font-display text-lg font-extrabold tracking-tight text-ink">Zolboo</span>
          <span className="h-2 w-2 animate-pulseGlow rounded-full bg-accent" />
        </a>
        <LangToggle />
      </div>

      {/* detail panel */}
      {selected && <DetailPanel node={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

// ---- helpers / sub-components ----

function nodeTitle(n: WorldNode, t: (v: { mn: string; en: string } | string) => string) {
  if (n.kind === "about") return t({ mn: "Миний тухай", en: "About me" });
  if (n.kind === "contact") return t({ mn: "Холбогдох", en: "Say hi" });
  const p = content.projects.items.find((x) => x.id === n.id);
  return p ? t(p.title) : n.id;
}

function LangToggle() {
  const { lang, toggle } = useLang();
  return (
    <button
      onClick={toggle}
      aria-label="Toggle language"
      className="pointer-events-auto flex items-center gap-1 rounded-full border border-line bg-surface/70 px-1 py-1 font-mono text-xs backdrop-blur"
    >
      <span className={`rounded-full px-2.5 py-1 ${lang === "mn" ? "bg-accent text-bg" : "text-muted"}`}>MN</span>
      <span className={`rounded-full px-2.5 py-1 ${lang === "en" ? "bg-accent text-bg" : "text-muted"}`}>EN</span>
    </button>
  );
}

function DetailPanel({ node, onClose }: { node: WorldNode; onClose: () => void }) {
  const { t } = useLang();

  let body: React.ReactNode = null;
  if (node.kind === "about") {
    const a = content.about;
    body = (
      <>
        <PanelEyebrow>{t(a.label)}</PanelEyebrow>
        <p className="text-lg leading-relaxed text-ink/90">{t(a.body)}</p>
        <div className="mt-6 space-y-3 font-mono text-xs text-muted">
          <div>{t(a.edu)}</div>
          <div className="text-accent/80">{t(a.now)}</div>
        </div>
      </>
    );
  } else if (node.kind === "contact") {
    const c = content.contact;
    body = (
      <>
        <PanelEyebrow>{t(c.label)}</PanelEyebrow>
        <h2 className="font-display text-4xl font-bold tracking-tight text-grad">{t(c.heading)}</h2>
        <p className="mt-4 text-muted">{t(c.sub)}</p>
        <div className="mt-6 space-y-3 font-mono text-sm">
          <a href={`mailto:${c.email}`} className="block text-ink transition-colors hover:text-accent">{c.email}</a>
          <a href={`tel:${c.phoneRaw}`} className="block text-ink transition-colors hover:text-accent">{c.phone}</a>
          <div className="text-muted">{t(c.location)}</div>
        </div>
      </>
    );
  } else {
    const p = content.projects.items.find((x) => x.id === node.id);
    if (p)
      body = (
        <>
          <PanelEyebrow>
            {t(p.category)} · {p.year}
          </PanelEyebrow>
          <h2 className="font-display text-4xl font-bold tracking-tight text-ink">{t(p.title)}</h2>
          <p className="mt-4 leading-relaxed text-muted">{t(p.desc)}</p>
          {"clients" in p && p.clients ? (
            <p className="mt-3 font-mono text-xs text-ink/60">{p.clients}</p>
          ) : null}
          <div className="mt-6 flex flex-wrap gap-2">
            {p.tags.map((tag) => (
              <span key={tag} className="rounded-md border border-line bg-bg/40 px-2.5 py-1 font-mono text-[11px] text-ink/70">
                {tag}
              </span>
            ))}
          </div>
        </>
      );
  }

  return (
    <div className="pointer-events-auto absolute inset-y-0 right-0 flex w-full max-w-md flex-col justify-center border-l border-line bg-bg/85 p-8 backdrop-blur-xl sm:p-12">
      <button
        onClick={onClose}
        className="absolute right-6 top-6 font-mono text-xs text-muted transition-colors hover:text-accent"
      >
        ✕ хаах
      </button>
      <div>{body}</div>
    </div>
  );
}

function PanelEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className="h-px w-6 bg-accent/60" />
      <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">{children}</span>
    </div>
  );
}

/** Readable, non-3D fallback for mobile / no-WebGL / reduced-motion. */
function WorldFallback() {
  const { t } = useLang();
  return (
    <div className="mx-auto max-w-2xl px-6 py-20">
      <p className="font-display text-sm text-muted">{t(content.hero.greeting)}</p>
      <h1 className="font-display text-5xl font-extrabold tracking-tight text-grad">
        Zolboo<span className="text-accent">.</span>
      </h1>
      <p className="mt-4 text-muted">{t(content.hero.tagline)}</p>

      <p className="mt-10 leading-relaxed text-ink/90">{t(content.about.body)}</p>

      <h2 className="mt-12 font-mono text-xs uppercase tracking-[0.2em] text-accent">
        {t(content.projects.label)}
      </h2>
      <div className="mt-4 space-y-6">
        {content.projects.items.map((p) => (
          <div key={p.id} className="border-t border-line pt-4">
            <div className="font-mono text-xs text-muted">
              {t(p.category)} · {p.year}
            </div>
            <h3 className="mt-1 font-display text-xl font-bold text-ink">{t(p.title)}</h3>
            <p className="mt-1 text-sm text-muted">{t(p.desc)}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-12 font-mono text-xs uppercase tracking-[0.2em] text-accent">
        {t(content.contact.label)}
      </h2>
      <div className="mt-3 space-y-2 font-mono text-sm">
        <a href={`mailto:${content.contact.email}`} className="block text-ink">{content.contact.email}</a>
        <a href={`tel:${content.contact.phoneRaw}`} className="block text-ink">{content.contact.phone}</a>
      </div>
    </div>
  );
}
