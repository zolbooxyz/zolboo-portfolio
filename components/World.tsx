"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { BokehPass } from "three/examples/jsm/postprocessing/BokehPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { content } from "@/lib/content";
import { useLang } from "@/lib/LanguageContext";
import { palette } from "@/lib/theme";

type NodeKind = "project";
type WorldNode = { id: string; kind: NodeKind; pos: [number, number, number] };

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

// opacity envelope: 0 before a, ramp to 1 by b, hold to c, ramp to 0 by d
function band(p: number, a: number, b: number, c: number, d: number) {
  if (p <= a || p >= d) return 0;
  if (p < b) return (p - a) / (b - a);
  if (p > c) return 1 - (p - c) / (d - c);
  return 1;
}

// camera keyframes along the scroll timeline (spherical: radius/theta/phi)
type Key = { p: number; r: number; th: number; ph: number };
const KEYS: Key[] = [
  { p: 0.0, r: 7.0, th: 0.0, ph: 1.35 }, // intro — front of figure
  { p: 0.3, r: 5.0, th: 0.8, ph: 1.12 }, // about — close, side
  { p: 0.62, r: 12.5, th: 1.7, ph: 0.92 }, // works — pull back & up to reveal nodes
  { p: 1.0, r: 7.8, th: 2.7, ph: 1.3 }, // contact
];
function sampleCam(p: number): { r: number; th: number; ph: number } {
  if (p <= KEYS[0].p) return KEYS[0];
  if (p >= KEYS[KEYS.length - 1].p) return KEYS[KEYS.length - 1];
  for (let i = 0; i < KEYS.length - 1; i++) {
    const a = KEYS[i];
    const b = KEYS[i + 1];
    if (p >= a.p && p <= b.p) {
      let t = (p - a.p) / (b.p - a.p);
      t = t * t * (3 - 2 * t);
      return { r: lerp(a.r, b.r, t), th: lerp(a.th, b.th, t), ph: lerp(a.ph, b.ph, t) };
    }
  }
  return KEYS[KEYS.length - 1];
}

function fibSphere(n: number, radius: number): [number, number, number][] {
  const out: [number, number, number][] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const theta = golden * i;
    out.push([Math.cos(theta) * r * radius, y * radius * 0.8, Math.sin(theta) * r * radius]);
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

  const nodes = useMemo<WorldNode[]>(() => {
    const items = content.projects.items;
    const positions = fibSphere(items.length, 5.2);
    return items.map((p, i) => ({ id: p.id, kind: "project", pos: positions[i] }));
  }, []);

  const mountRef = useRef<HTMLDivElement>(null);
  const labelRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const introRef = useRef<HTMLDivElement>(null);
  const aboutRef = useRef<HTMLDivElement>(null);
  const worksRef = useRef<HTMLDivElement>(null);
  const contactRef = useRef<HTMLDivElement>(null);

  const [fallback, setFallback] = useState(false);
  const [selected, setSelected] = useState<WorldNode | null>(null);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const el = mountRef.current;
    if (!el || reduced || window.innerWidth < 768 || !hasWebGL()) {
      setFallback(true);
      return;
    }

    let disposed = false;
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(new THREE.Color(palette.bg), 0.04);
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.appendChild(renderer.domElement);

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    // cinematic depth-of-field
    const bokeh = new BokehPass(scene, camera, { focus: 8, aperture: 0.0009, maxblur: 0.008 });
    composer.addPass(bokeh);
    const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.5, 0.5, 0.2);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());

    // starfield
    const starN = 1400;
    const starPos = new Float32Array(starN * 3);
    for (let i = 0; i < starN; i++) {
      const r = 12 + Math.random() * 20;
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
      new THREE.PointsMaterial({ color: new THREE.Color(palette.ink), size: 0.05, transparent: true, opacity: 0.5, depthWrite: false })
    );
    scene.add(stars);

    // faint energy core
    const coreGeo = new THREE.IcosahedronGeometry(1.5, 12);
    const core = new THREE.Points(
      coreGeo,
      new THREE.PointsMaterial({ color: new THREE.Color(palette.accent), size: 0.02, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    core.scale.setScalar(0.32);
    scene.add(core);

    // glowing human figure
    let mixer: THREE.AnimationMixer | null = null;
    let figure: THREE.Group | null = null;
    const figureMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(palette.accent), wireframe: true, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false });
    new GLTFLoader().load("/models/figure.glb", (gltf) => {
      if (disposed) return;
      figure = gltf.scene;
      figure.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) m.material = figureMat;
      });
      const box = new THREE.Box3().setFromObject(figure);
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);
      const s = 3.4 / size.y;
      figure.scale.setScalar(s);
      figure.position.set(-center.x * s, -center.y * s, -center.z * s);
      scene.add(figure);
      if (gltf.animations?.length) {
        mixer = new THREE.AnimationMixer(figure);
        const idle = gltf.animations.find((a) => /idle/i.test(a.name)) || gltf.animations[0];
        mixer.clipAction(idle).play();
      }
    });

    // project nodes
    const nodeArr = new Float32Array(nodes.length * 3);
    nodes.forEach((n, i) => {
      nodeArr[i * 3] = n.pos[0];
      nodeArr[i * 3 + 1] = n.pos[1];
      nodeArr[i * 3 + 2] = n.pos[2];
    });
    const nodeGeo = new THREE.BufferGeometry();
    nodeGeo.setAttribute("position", new THREE.BufferAttribute(nodeArr, 3));
    const nodeMarkers = new THREE.Points(
      nodeGeo,
      new THREE.PointsMaterial({ color: new THREE.Color(palette.accent), size: 0.2, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    scene.add(nodeMarkers);

    // mouse parallax
    const mouse = { x: 0, y: 0 };
    const onMouse = (e: PointerEvent) => {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMouse);

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
    let lastT = start;
    let raf = 0;
    // smoothed scroll progress
    let p = 0;

    const setOverlay = (ref: HTMLDivElement | null, o: number) => {
      if (!ref) return;
      ref.style.opacity = String(o);
      ref.style.pointerEvents = o > 0.5 ? "auto" : "none";
    };

    const tick = () => {
      const now = performance.now();
      const delta = Math.min(0.05, (now - lastT) / 1000);
      lastT = now;
      if (mixer) mixer.update(delta);
      if (figure) figure.rotation.y += 0.0012;
      core.rotation.y += 0.0016;
      stars.rotation.y += 0.0003;

      // scroll progress (eased)
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const target = max > 0 ? clamp01(window.scrollY / max) : 0;
      p += (target - p) * 0.08;

      const c = sampleCam(p);
      const px = mouse.x * 0.4;
      const py = -mouse.y * 0.3;
      camera.position.set(
        c.r * Math.sin(c.ph) * Math.sin(c.th) + px,
        c.r * Math.cos(c.ph) + py,
        c.r * Math.sin(c.ph) * Math.cos(c.th)
      );
      camera.lookAt(0, 0.2, 0);

      // keep the figure in focus; everything else softly blurs
      const focusDist = camera.position.distanceTo(tmp.set(0, 0.2, 0));
      (bokeh.uniforms as Record<string, { value: number }>).focus.value = focusDist;

      // chapter overlays
      setOverlay(introRef.current, band(p, -1, 0, 0.08, 0.18));
      setOverlay(aboutRef.current, band(p, 0.18, 0.26, 0.4, 0.5));
      setOverlay(worksRef.current, band(p, 0.5, 0.58, 0.78, 0.86));
      setOverlay(contactRef.current, band(p, 0.86, 0.93, 1.1, 1.2));

      const worksVis = band(p, 0.5, 0.58, 0.82, 0.9);

      // project node labels
      const w = renderer.domElement.clientWidth;
      const h = renderer.domElement.clientHeight;
      nodes.forEach((n, i) => {
        const lbl = labelRefs.current[i];
        if (!lbl) return;
        v.set(n.pos[0], n.pos[1], n.pos[2]).project(camera);
        const behind = v.z > 1;
        tmp.set(n.pos[0], n.pos[1], n.pos[2]);
        const dist = camera.position.distanceTo(tmp);
        const x = (v.x * 0.5 + 0.5) * w;
        const y = (-v.y * 0.5 + 0.5) * h;
        lbl.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
        const op = behind ? 0 : worksVis * Math.max(0.3, Math.min(1, 16 / dist));
        lbl.style.opacity = String(op);
        lbl.style.pointerEvents = op > 0.4 ? "auto" : "none";
      });

      composer.render();
      raf = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      disposed = true;
      mixer?.stopAllAction();
      figureMat.dispose();
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMouse);
      ro.disconnect();
      starGeo.dispose();
      coreGeo.dispose();
      nodeGeo.dispose();
      composer.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === el) el.removeChild(renderer.domElement);
    };
  }, [nodes]);

  if (fallback) return <WorldFallback />;

  return (
    <>
      {/* scroll height driver */}
      <div style={{ height: "500vh" }} aria-hidden />

      {/* fixed cinematic stage */}
      <div className="fixed inset-0 select-none overflow-hidden bg-bg">
        <div ref={mountRef} className="absolute inset-0 h-full w-full" />

        {/* cinematic vignette */}
        <div
          className="pointer-events-none absolute inset-0 z-[5]"
          style={{ background: "radial-gradient(125% 110% at 50% 45%, transparent 52%, rgba(0,0,0,0.6) 100%)" }}
        />
        {/* film grain */}
        <div
          className="pointer-events-none absolute inset-0 z-[5] opacity-[0.07] mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />

        {/* top bar */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between px-6 py-5 sm:px-10">
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="pointer-events-auto flex items-center gap-2"
          >
            <span className="font-display text-lg font-extrabold tracking-tight text-ink">Zolboo</span>
            <span className="h-2 w-2 animate-pulseGlow rounded-full bg-accent" />
          </button>
          <LangToggle />
        </div>

        {/* node labels */}
        <div className="pointer-events-none absolute inset-0 z-10">
          {nodes.map((n, i) => (
            <button
              key={n.id}
              ref={(elr) => {
                labelRefs.current[i] = elr;
              }}
              onClick={() => setSelected(n)}
              className="group absolute left-0 top-0 flex items-center gap-2 whitespace-nowrap"
              style={{ opacity: 0 }}
            >
              <span className="h-2 w-2 rounded-full bg-accent shadow-glow-sm transition-transform group-hover:scale-150" />
              <span className="font-mono text-xs tracking-wide text-ink/80 transition-colors group-hover:text-accent">
                {nodeTitle(n, t)}
              </span>
            </button>
          ))}
        </div>

        {/* chapter: intro */}
        <div ref={introRef} className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center" style={{ opacity: 1 }}>
          <p className="font-display text-sm text-muted">{t(content.hero.greeting)}</p>
          <h1 className="font-display text-6xl font-extrabold tracking-tight text-grad sm:text-8xl">
            Zolboo<span className="text-accent text-glow">.</span>
          </h1>
          <p className="mt-3 max-w-md px-6 text-sm text-muted">{t(content.hero.tagline)}</p>
          <p className="mt-10 animate-pulseGlow font-mono text-[11px] tracking-wide text-accent/70">↓ доош гүйлгээрэй</p>
        </div>

        {/* chapter: about */}
        <div ref={aboutRef} className="pointer-events-none absolute inset-0 flex items-center justify-center px-6" style={{ opacity: 0 }}>
          <div className="max-w-xl rounded-[2rem] bg-bg/40 px-8 py-10 text-center backdrop-blur-md">
            <PanelEyebrow>{t(content.about.label)}</PanelEyebrow>
            <p className="text-xl leading-relaxed text-ink/90 sm:text-2xl">{t(content.about.body)}</p>
            <div className="mt-6 space-y-1 font-mono text-xs text-muted">
              <div>{t(content.about.edu)}</div>
              <div className="text-accent/80">{t(content.about.now)}</div>
            </div>
          </div>
        </div>

        {/* chapter: works (heading; the nodes are the works) */}
        <div ref={worksRef} className="pointer-events-none absolute inset-x-0 top-24 flex flex-col items-center text-center" style={{ opacity: 0 }}>
          <PanelEyebrow>{t(content.projects.label)}</PanelEyebrow>
          <h2 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">{t(content.projects.heading)}</h2>
          <p className="mt-2 font-mono text-[11px] text-accent/70">цэг дээр дарж дэлгэрэнгүйг үз</p>
        </div>

        {/* chapter: contact */}
        <div ref={contactRef} className="pointer-events-none absolute inset-0 flex items-center justify-center px-6 text-center" style={{ opacity: 0 }}>
          <div className="rounded-[2rem] bg-bg/40 px-8 py-10 backdrop-blur-md">
            <PanelEyebrow>{t(content.contact.label)}</PanelEyebrow>
            <h2 className="font-display text-4xl font-bold tracking-tight text-grad sm:text-6xl">{t(content.contact.heading)}</h2>
            <p className="mt-4 text-muted">{t(content.contact.sub)}</p>
            <div className="mt-6 space-y-2 font-mono text-sm">
              <a href={`mailto:${content.contact.email}`} className="block text-ink transition-colors hover:text-accent">{content.contact.email}</a>
              <a href={`tel:${content.contact.phoneRaw}`} className="block text-ink transition-colors hover:text-accent">{content.contact.phone}</a>
              <div className="text-muted">{t(content.contact.location)}</div>
            </div>
          </div>
        </div>

        {/* project detail panel */}
        {selected && <DetailPanel node={selected} onClose={() => setSelected(null)} />}
      </div>
    </>
  );
}

function nodeTitle(n: WorldNode, t: (v: { mn: string; en: string } | string) => string) {
  const p = content.projects.items.find((x) => x.id === n.id);
  return p ? t(p.title) : n.id;
}

function LangToggle() {
  const { lang, toggle } = useLang();
  return (
    <button onClick={toggle} aria-label="Toggle language" className="pointer-events-auto flex items-center gap-1 rounded-full border border-line bg-surface/70 px-1 py-1 font-mono text-xs backdrop-blur">
      <span className={`rounded-full px-2.5 py-1 ${lang === "mn" ? "bg-accent text-bg" : "text-muted"}`}>MN</span>
      <span className={`rounded-full px-2.5 py-1 ${lang === "en" ? "bg-accent text-bg" : "text-muted"}`}>EN</span>
    </button>
  );
}

function DetailPanel({ node, onClose }: { node: WorldNode; onClose: () => void }) {
  const { t } = useLang();
  const p = content.projects.items.find((x) => x.id === node.id);
  if (!p) return null;
  return (
    <div className="pointer-events-auto absolute inset-y-0 right-0 z-30 flex w-full max-w-md flex-col justify-center border-l border-line bg-bg/85 p-8 backdrop-blur-xl sm:p-12">
      <button onClick={onClose} className="absolute right-6 top-6 font-mono text-xs text-muted transition-colors hover:text-accent">✕ хаах</button>
      <PanelEyebrow>
        {t(p.category)} · {p.year}
      </PanelEyebrow>
      <h2 className="font-display text-4xl font-bold tracking-tight text-ink">{t(p.title)}</h2>
      <p className="mt-4 leading-relaxed text-muted">{t(p.desc)}</p>
      {"clients" in p && p.clients ? <p className="mt-3 font-mono text-xs text-ink/60">{p.clients}</p> : null}
      <div className="mt-6 flex flex-wrap gap-2">
        {p.tags.map((tag) => (
          <span key={tag} className="rounded-md border border-line bg-bg/40 px-2.5 py-1 font-mono text-[11px] text-ink/70">{tag}</span>
        ))}
      </div>
    </div>
  );
}

function PanelEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-center gap-3">
      <span className="h-px w-6 bg-accent/60" />
      <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">{children}</span>
    </div>
  );
}

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
      <h2 className="mt-12 font-mono text-xs uppercase tracking-[0.2em] text-accent">{t(content.projects.label)}</h2>
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
      <h2 className="mt-12 font-mono text-xs uppercase tracking-[0.2em] text-accent">{t(content.contact.label)}</h2>
      <div className="mt-3 space-y-2 font-mono text-sm">
        <a href={`mailto:${content.contact.email}`} className="block text-ink">{content.contact.email}</a>
        <a href={`tel:${content.contact.phoneRaw}`} className="block text-ink">{content.contact.phone}</a>
      </div>
    </div>
  );
}
