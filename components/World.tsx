"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { BokehPass } from "three/examples/jsm/postprocessing/BokehPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { SMAAPass } from "three/examples/jsm/postprocessing/SMAAPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { content } from "@/lib/content";
import { useLang } from "@/lib/LanguageContext";
import { palette } from "@/lib/theme";
import { fetchMemories, addMemory, pickFreeCube, type Memory } from "@/lib/memories";
import { motion } from "framer-motion";
import { Mail, Phone, Facebook, Instagram, Github } from "lucide-react";
import Logo from "@/components/Logo";
import MemoryForm from "@/components/MemoryForm";
import MemoryCard from "@/components/MemoryCard";
import ProjectsCarousel from "@/components/ProjectsCarousel";
import SoundToggle from "@/components/SoundToggle";
import HudOverlay from "@/components/HudOverlay";
import ScrambleText from "@/components/ScrambleText";
import SeoContent from "@/components/SeoContent";
import { sfx } from "@/lib/sound";

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

// opacity envelope: 0 before a, ramp to 1 by b, hold to c, ramp to 0 by d
function band(p: number, a: number, b: number, c: number, d: number) {
  if (p <= a || p >= d) return 0;
  if (p < b) return (p - a) / (b - a);
  if (p > c) return 1 - (p - c) / (d - c);
  return 1;
}

// camera keyframes along the scroll timeline (spherical r/theta/phi).
// fx = lookAt x-offset, ly = lookAt height, lz = lookAt depth.
type Key = { p: number; r: number; th: number; ph: number; fx: number; ly: number; lz: number };
// One continuous orbit of the figure (th: 0 -> 2π, kept monotonic so it never
// reverses): front -> walk + 180° turn -> arc round to the face -> hold while it
// presents -> arc on and dive into the room. Repeated keys = a hold on that beat.
const KEYS: Key[] = [
  { p: 0.00, r: 5.2, th: 0.00, ph: 1.18, fx: 0, ly: 0.20, lz: 0 },   // hero — front, close
  { p: 0.20, r: 5.8, th: 0.55, ph: 1.14, fx: 0, ly: 0.25, lz: 0 },   // starts walking
  { p: 0.38, r: 5.6, th: 1.30, ph: 1.18, fx: 0, ly: 0.60, lz: 0 },   // 180° turn done; side-back
  { p: 0.50, r: 3.2, th: 2.78, ph: 1.40, fx: 0, ly: 1.25, lz: 0.20 }, // arc toward the front
  { p: 0.54, r: 2.9, th: 3.14, ph: 1.42, fx: 0, ly: 1.30, lz: 0.20 }, // settle in front of the face
  { p: 0.70, r: 2.9, th: 3.14, ph: 1.42, fx: 0, ly: 1.30, lz: 0.20 }, // hold — presenting
  { p: 0.84, r: 2.4, th: 6.28, ph: 1.48, fx: 0, ly: 1.42, lz: -5.0 }, // arc on; gaze toward the room
  { p: 1.00, r: 2.1, th: 6.28, ph: 1.50, fx: 0, ly: 1.45, lz: -6.0 }, // dive into the room (-z)
];
function sampleCam(p: number): { r: number; th: number; ph: number; fx: number; ly: number; lz: number } {
  if (p <= KEYS[0].p) return KEYS[0];
  if (p >= KEYS[KEYS.length - 1].p) return KEYS[KEYS.length - 1];
  for (let i = 0; i < KEYS.length - 1; i++) {
    const a = KEYS[i];
    const b = KEYS[i + 1];
    if (p >= a.p && p <= b.p) {
      let t = (p - a.p) / (b.p - a.p);
      t = t * t * (3 - 2 * t);
      return { r: lerp(a.r, b.r, t), th: lerp(a.th, b.th, t), ph: lerp(a.ph, b.ph, t), fx: lerp(a.fx, b.fx, t), ly: lerp(a.ly, b.ly, t), lz: lerp(a.lz, b.lz, t) };
    }
  }
  return KEYS[KEYS.length - 1];
}

// environment values keyed to the same scroll timeline: fog / stars / grid /
// dust / bloom / vignette / exposure all interpolate together.
type Mood = { p: number; fog: number; star: number; grid: number; dust: number; bloom: number; vig: number; exp: number };
const MOOD: Mood[] = [
  { p: 0.0, fog: 0.04, star: 0.42, grid: 0, dust: 0.5, bloom: 0.32, vig: 0.24, exp: 0.86 }, // hero — softer vignette so the starfield fills the frame
  { p: 0.42, fog: 0.03, star: 0.6, grid: 0, dust: 0.45, bloom: 0.36, vig: 0.34, exp: 0.9 }, // opens slightly as it moves
  { p: 0.88, fog: 0.036, star: 0.55, grid: 0, dust: 0.5, bloom: 0.34, vig: 0.38, exp: 0.88 }, // dive settle, just before the finale
  { p: 1.0, fog: 0.02, star: 0.18, grid: 0, dust: 0.5, bloom: 0.34, vig: 0.3, exp: 0.96 }, // FINALE sign-off — clean dark void, dim the field stars so the signature reads
];
function sampleMood(p: number): Omit<Mood, "p"> {
  if (p <= MOOD[0].p) return MOOD[0];
  if (p >= MOOD[MOOD.length - 1].p) return MOOD[MOOD.length - 1];
  for (let i = 0; i < MOOD.length - 1; i++) {
    const a = MOOD[i];
    const b = MOOD[i + 1];
    if (p >= a.p && p <= b.p) {
      let t = (p - a.p) / (b.p - a.p);
      t = t * t * (3 - 2 * t);
      return {
        fog: lerp(a.fog, b.fog, t), star: lerp(a.star, b.star, t), grid: lerp(a.grid, b.grid, t),
        dust: lerp(a.dust, b.dust, t), bloom: lerp(a.bloom, b.bloom, t), vig: lerp(a.vig, b.vig, t), exp: lerp(a.exp, b.exp, t),
      };
    }
  }
  return MOOD[MOOD.length - 1];
}

function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl") || c.getContext("experimental-webgl"));
  } catch {
    return false;
  }
}

// shared easing for the HUD entrance variants below
const EASE_OUT = [0.22, 1, 0.36, 1] as const;

// --- HERO character-select HUD entrance (framer-motion variants) ---
const hudContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09, delayChildren: 0.25 } },
};
const hudItem = {
  hidden: { opacity: 0, y: 18, filter: "blur(6px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.6, ease: EASE_OUT } },
};
const hudLine = {
  hidden: { scaleX: 0, opacity: 0 },
  visible: { scaleX: 1, opacity: 1, transition: { duration: 0.8, ease: EASE_OUT } },
};
const hudBracketWrap = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};
const hudBracket = {
  hidden: { opacity: 0, scale: 0.3 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.55, ease: EASE_OUT } },
};

// shared professional skill sheet (used by the desktop HUD + the mobile view)
const SKILLS = [
  { cat: "Frontend", items: "Next.js · React · TypeScript · Tailwind · Three.js · GSAP" },
  { cat: "Backend & SaaS", items: "Node.js · Supabase · PostgreSQL · REST · Auth" },
  { cat: "Automation", items: "n8n · Make.com · ManyChat · Zapier · Webhooks" },
  { cat: "AI", items: "Claude · OpenAI · RAG · Agents · Chatbots · Image · Voice" },
  { cat: "Design", items: "Figma · Framer Motion · UI/UX" },
  { cat: "Foundations", items: "HTML · CSS · JavaScript · Git · SEO" },
];

export default function World() {
  const { t } = useLang();

  const mountRef = useRef<HTMLDivElement>(null);
  // hero "character select" HUD (DOM overlay). the tick drives a staggered exit
  // on these sub-groups, synced to the scroll-scrubbed walk.
  const heroRef = useRef<HTMLDivElement>(null);
  const hudBracketsRef = useRef<HTMLDivElement>(null);
  const hudPanelRef = useRef<HTMLDivElement>(null);
  const hudStartRef = useRef<HTMLDivElement>(null);
  const hudSkillsRef = useRef<HTMLDivElement>(null); // skill matrix — scrubbed in as the figure walks
  const hudSkillRowsRef = useRef<HTMLDivElement>(null); // its rows, staggered per scroll

  const [fallback, setFallback] = useState(false);
  // play the HUD entrance only once the loader reveals the scene (scene-ready),
  // otherwise the cascade finishes hidden behind the loader
  const [heroReady, setHeroReady] = useState(false);
  useEffect(() => {
    const w = window as unknown as { __sceneReady?: boolean };
    if (w.__sceneReady) {
      const id = window.setTimeout(() => setHeroReady(true), 350);
      return () => window.clearTimeout(id);
    }
    const on = () => setHeroReady(true);
    window.addEventListener("scene-ready", on, { once: true });
    const fb = window.setTimeout(() => setHeroReady(true), 2600);
    return () => {
      window.removeEventListener("scene-ready", on);
      window.clearTimeout(fb);
    };
  }, []);

  // visitor "room of memories" guestbook
  const [memories, setMemories] = useState<Memory[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [openMemory, setOpenMemory] = useState<Memory | null>(null);
  // true once the scroll has carried us into the room-of-memories scene, so the
  // "leave a memory" trigger only surfaces where it makes sense
  const [memoryRoomActive, setMemoryRoomActive] = useState(false);
  const memoryRoomActiveRef = useRef(false); // throttle: only setState on crossings
  // the project carousel beat — plays after the figure presents, before the room
  const [carouselActive, setCarouselActive] = useState(false);
  const carouselActiveRef = useRef(false);
  const carouselProgressRef = useRef(0); // 0→1 sweep, read by the carousel's own rAF
  const handScreenRef = useRef({ x: 0.5, y: 0.45 }); // figure's right-hand position projected to screen (0..1), so cards can bloom out of it
  // the closing "memory galaxy" beat — drives the contact finale overlay
  const [finaleActive, setFinaleActive] = useState(false);
  const finaleActiveRef = useRef(false);
  const memoriesRef = useRef<Memory[]>([]); // live copy the WebGL tick can read
  const cubeCentersRef = useRef<THREE.Vector3[]>([]); // lattice cube world centres
  const labelEls = useRef<Map<string, HTMLButtonElement>>(new Map()); // nickname label DOM
  const topBarRef = useRef<HTMLDivElement>(null); // logo + toggles; dimmed in the memory room so it stops burying corner cubes
  const reticleRef = useRef<HTMLDivElement>(null); // FUI targeting reticle on the hovered cube
  const reticleLabelRef = useRef<HTMLDivElement>(null); // its coordinate/ID readout
  // returns the cube indices currently ON SCREEN (centred, in front, near) so a
  // new memory lands in a cube the visitor can actually see right now
  const visibleCubesRef = useRef<(() => number[]) | null>(null);
  // (re)builds the glowing glass cubes for the occupied cells
  const syncOccupiedRef = useRef<((mems: Memory[]) => void) | null>(null);
  // camera "fly to this cube" / "release back to scroll" controls
  const focusCubeRef = useRef<((cube: number) => void) | null>(null);
  const releaseFocusRef = useRef<(() => void) | null>(null);
  // lets the WebGL raycast click open the React card (kept fresh each render)
  const openMemoryRef = useRef<(m: Memory) => void>(() => {});
  useEffect(() => {
    openMemoryRef.current = (mem) => setOpenMemory(mem);
  });

  // keyboard ←/→ steps through the portfolio one project at a time while the
  // carousel is on screen. We only RETARGET the scroll position to the chosen
  // project's dwell point and let the scene's own eased scrub glide there — so
  // the keys feel identical to (a very precise) scroll.
  useEffect(() => {
    if (!carouselActive) return;
    const N = content.projects.items.length;
    if (N < 2) return;
    // p↔scroll mapping mirrors the carousel: cp = (p-0.535)/0.21 (the progress
    // ref), sweep = (cp-0.20)/0.56, and project i is dead-front at sweep i/(N-1).
    const pForIndex = (i: number) => 0.535 + (0.2 + (i / (N - 1)) * 0.56) * 0.21;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      // don't hijack the arrows while typing in the memory form
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max <= 0) return;
      // read the current front project back from the live scroll position, so
      // rapid presses accumulate correctly (scrollY updates instantly)
      const p = window.scrollY / max;
      const sweep = clamp01((clamp01((p - 0.535) / 0.21) - 0.2) / 0.56);
      const cur = Math.round(sweep * (N - 1));
      const next = Math.min(N - 1, Math.max(0, cur + (e.key === "ArrowRight" ? 1 : -1)));
      e.preventDefault(); // capture the arrows so the page doesn't also nudge
      window.scrollTo(0, pForIndex(next) * max);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [carouselActive]);

  useEffect(() => {
    fetchMemories().then(setMemories);
  }, []);
  useEffect(() => {
    memoriesRef.current = memories;
    syncOccupiedRef.current?.(memories); // light up the glass cubes for occupied cells
  }, [memories]);

  const handleMemorySubmit = async (fields: { nickname: string; phone: string; comment: string }) => {
    const total = cubeCentersRef.current.length;
    // fold every stored index into the corridor slot list (older memories were
    // saved against the much larger old lattice) so "taken" lines up with where
    // each memory actually renders now
    const occupied = memoriesRef.current.map((x) => x.cube % total);
    const taken = new Set(occupied);
    // prefer a free cube that's currently visible on screen; fall back to any
    // visible cube, then to any free cube anywhere
    const visible = visibleCubesRef.current?.() ?? [];
    const visibleFree = visible.filter((i) => !taken.has(i));
    const cube =
      visibleFree.length > 0
        ? visibleFree[Math.floor(Math.random() * visibleFree.length)]
        : visible.length > 0
          ? visible[Math.floor(Math.random() * visible.length)]
          : pickFreeCube(total, occupied);
    const mem = await addMemory({ ...fields, cube });
    if (!mem) return false;
    setMemories((prev) => [...prev, mem]);
    return true;
  };

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const el = mountRef.current;
    // debug: /?flat forces the simple (no-WebGL) view so it can be previewed
    const forceFlat = new URLSearchParams(window.location.search).has("flat");
    // full WebGL experience everywhere (incl. mobile/touch) — only fall back when
    // motion is unwanted or the device genuinely can't do WebGL
    if (!el || reduced || forceFlat || !hasWebGL()) {
      setFallback(true);
      return;
    }

    // tell the loader the heavy 3D scene is loading so it holds the veil until
    // the figure is actually ready (scene-ready) instead of timing out early
    (window as unknown as { __webglActive?: boolean }).__webglActive = true;
    window.dispatchEvent(new Event("scene-loading"));

    // the scene always opens on the blank void + greeting; SmoothScroll owns the
    // scroll reset (manual restoration + scrollTo 0) and runs right after this
    // child effect mounts, so we don't duplicate it here.

    let disposed = false;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 420); // far reaches the finale galaxy (~157 units out)

    // no MSAA: the composer renders to its own targets (the canvas backbuffer is
    // just a fullscreen blit) so renderer-level antialias is wasted memory/bandwidth
    // — edge AA is done by the SMAA pass below. high-performance picks the dGPU.
    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: "high-performance" });
    // phones report DPR up to ~3; the bokeh+bloom chain is fill-rate heavy, so cap
    // tighter on narrow/touch screens to keep the scroll-scrub smooth
    const touch = window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, touch ? 1.25 : 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.82;
    renderer.localClippingEnabled = true; // for the floor-emergence reveal
    el.appendChild(renderer.domElement);

    // GPU context loss (mobile memory pressure, driver reset, tab backgrounded
    // too long): without this the canvas goes permanently black. Prevent the
    // default so the browser keeps the element, then drop to the flat portfolio
    // so the visitor isn't stuck staring at a dead stage.
    const onContextLost = (e: Event) => {
      e.preventDefault();
      console.warn("[world] WebGL context lost — falling back to the flat view");
      (window as unknown as { __sceneReady?: boolean }).__sceneReady = true;
      window.dispatchEvent(new Event("scene-ready"));
      setFallback(true);
    };
    renderer.domElement.addEventListener("webglcontextlost", onContextLost);

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    // depth-of-field — a full-res depth gather, the heaviest pass in the chain.
    // skip it on phones (the blur barely shows on a small screen) for smoother
    // scrolling on weaker GPUs.
    let bokeh: BokehPass | null = null;
    if (!touch) {
      bokeh = new BokehPass(scene, camera, { focus: 8, aperture: 0.0009, maxblur: 0.008 });
      composer.addPass(bokeh);
    }
    // very high threshold + low strength: only the hottest specular edges
    // bloom, so the body keeps its sculpted form instead of washing to white
    const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.26, 0.6, 0.86);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());

    // edge anti-aliasing on top of the post stack (composer disables MSAA),
    // kills shimmer on thin highlights and the chrome edges
    const smaa = new SMAAPass();
    composer.addPass(smaa);

    // subtle lens character: chromatic aberration that grows toward the edges
    // plus a gentle vignette — pulls the whole frame together
    const lensPass = new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        uAberration: { value: 0.0018 },
        uVignette: { value: 0.36 },
        uContrast: { value: 1.32 },
        uBlack: { value: 0.032 },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D tDiffuse;
        uniform float uAberration;
        uniform float uVignette;
        uniform float uContrast;
        uniform float uBlack;
        varying vec2 vUv;
        void main() {
          vec2 dir = vUv - 0.5;
          float d = dot(dir, dir);                 // squared distance from centre
          vec2 off = dir * d * uAberration * 8.0;  // shift scales toward edges
          float r = texture2D(tDiffuse, vUv - off).r;
          float g = texture2D(tDiffuse, vUv).g;
          float b = texture2D(tDiffuse, vUv + off).b;
          float a = texture2D(tDiffuse, vUv).a;
          vec3 col = vec3(r, g, b);
          // crush the haze to true black, then add contrast for a punchy grade
          col = max(col - uBlack, 0.0) / (1.0 - uBlack);
          col = (col - 0.5) * uContrast + 0.5;
          col = clamp(col, 0.0, 1.0);
          col *= 1.0 - uVignette * d * 2.2;        // soft darkened corners
          gl_FragColor = vec4(col, a);
        }
      `,
    });
    composer.addPass(lensPass);

    // image-based lighting: a cube of emissive panels (white key + cyan/magenta
    // rims) baked into an env map so the chrome body reflects coloured light.
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envScene = new THREE.Scene();
    envScene.background = new THREE.Color(0x04060a);
    const envPanels: THREE.Mesh[] = [];
    const addPanel = (color: THREE.ColorRepresentation, intensity: number, pos: [number, number, number], w: number, h: number) => {
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(w, h),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide })
      );
      mesh.position.set(...pos);
      mesh.lookAt(0, 0, 0);
      envScene.add(mesh);
      envPanels.push(mesh);
    };
    // one defined key + dark surroundings → the chrome body gets real tonal
    // falloff (bright side → shadow side) instead of washing out flat
    addPanel(0xffffff, 3.6, [-7, 8, 7], 10, 12); // key light
    addPanel(0xc4d2e0, 0.85, [11, 3, -5], 8, 18); // soft rim, right-back
    addPanel(0x8aa0b4, 0.18, [4, -2, 9], 7, 12); // dim front fill (darker → deeper shadow side)
    addPanel(0x0a141f, 0.4, [0, -9, 3], 18, 18); // dim floor bounce
    // thin softbox strips → crisp vertical highlight streaks run down the chrome
    addPanel(0xffffff, 2.6, [-3, 5, -9], 1.2, 16); // strip, behind-left
    addPanel(0xeef3f8, 1.9, [9, 6, 4], 1.0, 14); // strip, upper-right
    addPanel(0xaab6c4, 0.9, [-10, 1, -3], 1.0, 18); // strip, far-left
    const envRT = pmrem.fromScene(envScene, 0.04);
    scene.environment = envRT.texture;
    // env map is baked once — release the scratch panels
    envPanels.forEach((m) => {
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    });

    // key + rim lights add crisp specular edges (kept low so they don't blow out)
    const keyLight = new THREE.DirectionalLight(0xeaf6ff, 1.0);
    keyLight.position.set(4, 6, 5);
    const rimLight = new THREE.DirectionalLight(0xdfe7ff, 0.7);
    rimLight.position.set(-6, 3, -4);
    const fillLight = new THREE.DirectionalLight(new THREE.Color(palette.ink), 0.22);
    fillLight.position.set(0, -4, 2);
    // FACE light — sits on the -z side (where the camera arcs round to for the
    // portfolio). Off during the hero/walk (camera is +z); the tick ramps it up
    // only as we come around to meet the figure's face, so the presenter reads
    // instead of falling into a black silhouette. Aimed at the head height.
    const faceLight = new THREE.DirectionalLight(0xcfe9ff, 0);
    faceLight.position.set(0, 3.2, -7);
    // HERO front-fill — the landing frame (p=0) faces the figure's front (+z),
    // where the dark chrome body otherwise reads as a near-black silhouette. A
    // soft +z key lifts the front so the figure has presence on first sight, then
    // fades out the instant the walk begins (handed off to the moving rig) so the
    // carousel / room / finale art direction is left untouched. Aimed chest-high.
    const heroFill = new THREE.DirectionalLight(0xdce9ff, 0);
    heroFill.position.set(1.5, 4, 8);
    scene.add(keyLight, rimLight, fillLight, faceLight, heroFill);

    // soft round sprite for the point clouds (stars + dust) — without it
    // PointsMaterial renders hard squares
    const dotCanvas = document.createElement("canvas");
    dotCanvas.width = dotCanvas.height = 64;
    const dotCtx = dotCanvas.getContext("2d")!;
    const dotGrad = dotCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
    dotGrad.addColorStop(0, "rgba(255,255,255,1)");
    dotGrad.addColorStop(0.45, "rgba(255,255,255,0.55)");
    dotGrad.addColorStop(1, "rgba(255,255,255,0)");
    dotCtx.fillStyle = dotGrad;
    dotCtx.fillRect(0, 0, 64, 64);
    const dotTex = new THREE.CanvasTexture(dotCanvas);
    dotTex.colorSpace = THREE.SRGBColorSpace;

    // starfield
    const starN = 7200;
    const starPos = new Float32Array(starN * 3);
    for (let i = 0; i < starN; i++) {
      const r = 10 + Math.random() * 62; // wide depth range → layered space
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
      new THREE.PointsMaterial({ color: new THREE.Color(palette.ink), size: 2, map: dotTex, transparent: true, opacity: 0.5, depthWrite: false, sizeAttenuation: false })
    );
    scene.add(stars);


    // ROOM OF MEMORIES: the dive emerges into a cyan wireframe grid.
    // A 3D lattice of discrete wireframe cube cells receding in every direction.
    // memories are placed inside select cells later (centres on
    // grid.userData.cubeCenters).
    const latPts: number[] = [];
    const cubeCenters: THREE.Vector3[] = [];
    const SP = 14; // cube cell spacing (centre-to-centre)
    const HC = 4; // half cube edge (cube = 8, smaller cells with wider gaps)
    const NX = 4; // cubes either side of centre in x → 9 columns (wide)
    const NY = 2; // cubes either side of centre in y → 5 rows (trim the empty sky/floor)
    const LZ0 = 34; // near end (behind start)
    const LZ1 = -120; // far end — trimmed to roughly where the dive actually reaches
    // EVERY cell draws its wireframe (the endless-matrix vibe stays). But a memory
    // may only be PLACED in a cell inside the flight CORRIDOR — a tight tube around
    // the dive axis, at eye height, within the flown depth — so every memory is
    // carried right past the camera and stays readable, instead of being stranded
    // out in a cell the dive never approaches.
    const inCorridor = (ix: number, iy: number, cz: number) =>
      Math.abs(ix) <= 3 && Math.abs(iy) <= 1 && cz <= 8 && cz >= -92;
    const addCube = (cx: number, cy: number, cz: number, corridor: boolean) => {
      if (corridor) cubeCenters.push(new THREE.Vector3(cx, cy, cz));
      const x0 = cx - HC, x1 = cx + HC, y0 = cy - HC, y1 = cy + HC, z0 = cz - HC, z1 = cz + HC;
      // 12 edges of the cube as line-segment pairs
      latPts.push(
        x0, y0, z0, x1, y0, z0,  x1, y0, z0, x1, y0, z1,  x1, y0, z1, x0, y0, z1,  x0, y0, z1, x0, y0, z0, // bottom
        x0, y1, z0, x1, y1, z0,  x1, y1, z0, x1, y1, z1,  x1, y1, z1, x0, y1, z1,  x0, y1, z1, x0, y1, z0, // top
        x0, y0, z0, x0, y1, z0,  x1, y0, z0, x1, y1, z0,  x1, y0, z1, x1, y1, z1,  x0, y0, z1, x0, y1, z1, // verticals
      );
    };
    for (let ix = -NX; ix <= NX; ix++)
      for (let iy = -NY; iy <= NY; iy++)
        for (let cz = LZ0; cz >= LZ1; cz -= SP) addCube(ix * SP, iy * SP, cz, inCorridor(ix, iy, cz));
    const latGeo = new THREE.BufferGeometry();
    latGeo.setAttribute("position", new THREE.Float32BufferAttribute(latPts, 3));
    const gridUniforms = {
      uReveal: { value: 0 },
      uColA: { value: new THREE.Color(palette.accent) }, // bright cyan (near)
      uColB: { value: new THREE.Color(palette.accent2) }, // deep teal (far)
    };
    const gridMat = new THREE.ShaderMaterial({
      uniforms: gridUniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        varying vec3 vW;
        void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vW = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }
      `,
      fragmentShader: /* glsl */ `
        uniform float uReveal;
        uniform vec3 uColA;
        uniform vec3 uColB;
        varying vec3 vW;
        void main(){
          float d = length(vW - cameraPosition);
          // fade near + far → cubes emerge from and dissolve into the distance
          // (purely DISTANCE-based — steady, so the cubes hold still when the
          // scroll stops instead of pulsing/drifting away)
          float fade = (1.0 - smoothstep(60.0, 175.0, d)) * smoothstep(3.0, 12.0, d);
          // colour shifts with depth: near = bright cyan, far = deep teal
          float depthMix = smoothstep(-120.0, 34.0, vW.z);
          vec3 col = mix(uColB, uColA, depthMix);
          float a = fade * uReveal;
          gl_FragColor = vec4(col * a, a);
        }
      `,
    });
    const grid = new THREE.LineSegments(latGeo, gridMat);
    grid.userData.cubeCenters = cubeCenters; // world centres for placing content in cubes later
    cubeCentersRef.current = cubeCenters; // expose to React (random placement + label projection)
    scene.add(grid);

    // finale sky: a teal gradient dome, hidden during the journey (uFade = 0).
    // it fades in as the finale rises out of the lattice, and is recentred on
    // the camera each frame so it stays the far sky.
    const skyUniforms = {
      uFade: { value: 0 },
      uHorizon: { value: new THREE.Color(palette.accent2) }, // teal glow band at the horizon
      uZenith: { value: new THREE.Color(0x061018) },         // deep dark overhead → text stays legible
      uGround: { value: new THREE.Color(0x02050a) },         // near-black below the horizon
    };
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(320, 32, 16),
      new THREE.ShaderMaterial({
        uniforms: skyUniforms,
        side: THREE.BackSide,
        depthWrite: false,
        depthTest: false,
        transparent: true,
        vertexShader: /* glsl */ `
          varying vec3 vDir;
          void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
        `,
        fragmentShader: /* glsl */ `
          uniform float uFade;
          uniform vec3 uHorizon;
          uniform vec3 uZenith;
          uniform vec3 uGround;
          varying vec3 vDir;
          void main(){
            float y = vDir.y;                 // -1 down · 0 horizon · +1 up
            // a deep dark sky everywhere (so overlaid text stays legible),
            // easing to near-black below the horizon
            vec3 col = mix(uGround, uZenith, smoothstep(-0.22, 0.28, y));
            // a single tight teal glow band hugging the horizon line
            col += uHorizon * exp(-abs(y) * 9.0) * 0.6;
            gl_FragColor = vec4(col, 1.0) * uFade;
          }
        `,
      })
    );
    sky.renderOrder = -10; // draw behind everything (depthTest off)
    sky.frustumCulled = false;
    scene.add(sky);

    // OCCUPIED cells = "filled glass cubes": faint additive glowing faces + bright
    // edges so a memory-bearing cube stands out from the hollow lattice. Geometry
    // and materials are shared across all occupied cubes (cheap); a sync function
    // adds/removes a small group per memory as the list changes.
    const occGroup = new THREE.Group();
    scene.add(occGroup);
    const occBoxGeo = new THREE.BoxGeometry(2 * HC, 2 * HC, 2 * HC);
    const occEdgeGeo = new THREE.EdgesGeometry(occBoxGeo);
    const occFaceMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(palette.accent),
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const occEdgeMat = new THREE.LineBasicMaterial({
      color: new THREE.Color(palette.accent),
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const occMeshes = new Map<string, THREE.Group>();
    syncOccupiedRef.current = (mems) => {
      const ids = new Set(mems.map((mm) => mm.id));
      occMeshes.forEach((g, id) => {
        if (!ids.has(id)) {
          occGroup.remove(g);
          occMeshes.delete(id);
        }
      });
      for (const mm of mems) {
        if (occMeshes.has(mm.id)) continue;
        const center = cubeCenters[mm.cube % cubeCenters.length];
        if (!center) continue;
        const g = new THREE.Group();
        g.position.copy(center);
        g.userData.memId = mm.id; // for click raycasting
        g.userData.bornAt = performance.now(); // drives the materialize pop in the tick
        g.scale.setScalar(0.001); // starts collapsed, springs to full size
        g.add(new THREE.Mesh(occBoxGeo, occFaceMat));
        g.add(new THREE.LineSegments(occEdgeGeo, occEdgeMat));
        occGroup.add(g);
        occMeshes.set(mm.id, g);
      }
    };
    syncOccupiedRef.current(memoriesRef.current); // memories that loaded before this effect

    // finale: the dive opens into an empty void; the wordmark + contact render
    // as a DOM overlay, so nothing extra is added to the 3D scene here.

    // figure feet rest here (scaled to 3.4 tall + centred)
    const FEET_Y = -1.7;

    // cool key light from above-left
    const moonLight = new THREE.DirectionalLight(0xcfd8ff, 1.6);
    moonLight.position.set(-9, 11, -10);
    scene.add(moonLight);

    // the figure, rendered as a polished chrome body that reflects the env map
    let figure: THREE.Group | null = null;
    const metalMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0x1a1e26), // dark steel
      metalness: 1.0,
      roughness: 0.18, // glossy
      envMapIntensity: 1.7,
      clearcoat: 1.0,
      clearcoatRoughness: 0.06,
      // subtle oil-slick iridescence on the dark glossy skin
      iridescence: 0.7,
      iridescenceIOR: 1.3,
      iridescenceThicknessRange: [180, 520],
    });
    // vertex ripple over the body so the reflections shift slightly (vertex-only)
    let bodyTime: { value: number } | null = null;
    metalMat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = { value: 0 };
      bodyTime = shader.uniforms.uTime;
      shader.vertexShader =
        "uniform float uTime;\n" +
        shader.vertexShader.replace(
          "#include <begin_vertex>",
          /* glsl */ `#include <begin_vertex>
          {
            // gentle, LOW-frequency swell only — keeps the surface smooth (no
            // high-frequency noise that made the low-poly body look crude)
            vec3 pp = transformed;
            float w = sin( pp.y * 2.2 + uTime * 0.7 ) * 0.6 + sin( pp.y * 1.3 - uTime * 0.5 ) * 0.4;
            transformed += objectNormal * w * 0.006;
          }`
        );
    };
    // additive fresnel rim shell around the body (separate mesh). brightens at
    // grazing edges and pulses; the bloom pass then haloes it.
    const glowUniforms = { uTime: { value: 0 }, uFade: { value: 1 } };
    const glowMat = new THREE.ShaderMaterial({
      uniforms: glowUniforms,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      depthWrite: false,
      vertexShader: /* glsl */ `
        varying vec3 vN;
        varying vec3 vP;
        void main() {
          vN = normalize( normalMatrix * normal );
          vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
          vP = mvPosition.xyz;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform float uFade;
        varying vec3 vN;
        varying vec3 vP;
        void main() {
          vec3 vd = normalize( -vP );
          float fres = pow( 1.0 - clamp( dot( vN, vd ), 0.0, 1.0 ), 2.4 );
          float pulse = 0.6 + 0.4 * sin( uTime * 1.15 );
          // oil-slick edge: green core shifting to magenta at grazing angles
          vec3 col = mix( vec3( 0.12, 0.95, 0.7 ), vec3( 0.95, 0.25, 0.9 ), fres );
          gl_FragColor = vec4( col * fres * pulse, fres ) * uFade;
        }
      `,
    });
    // Mixamo animated figure: mixer plays the clip; hips XZ is locked to hip0 so
    // the walk-and-turn happens in place rather than striding off-screen
    let mixer: THREE.AnimationMixer | null = null;
    let action: THREE.AnimationAction | null = null;
    let clipDur = 0;
    let animTime = 0; // eased clip time, scrubbed by scroll
    let hipsBone: THREE.Object3D | null = null;
    let hip0: THREE.Vector3 | null = null;
    // right-arm bones → at the very end the figure raises its arm and points
    // forward (toward where the next "room of memories" scene opens)
    let rArm: THREE.Object3D | null = null;
    let rForeArm: THREE.Object3D | null = null;
    let rHand: THREE.Object3D | null = null;
    // figure.glb is the catwalk FBX re-exported as a meshopt-compressed glTF
    // (~0.3 MB vs the original ~35 MB FBX) — same rig, bones and single clip
    const gltfLoader = new GLTFLoader();
    gltfLoader.setMeshoptDecoder(MeshoptDecoder);
    gltfLoader.load("/models/figure.glb", (gltf) => {
      if (disposed) return;
      const fbx = gltf.scene;
      // dark glossy iridescent skin on every mesh; keep the rig for animation
      fbx.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          m.material = metalMat;
          m.frustumCulled = false;
        }
        if (!hipsBone && /hips/i.test(o.name)) hipsBone = o; // robust: any "Hips" bone
        if (!rArm && /RightArm$/i.test(o.name)) rArm = o;
        else if (!rForeArm && /RightForeArm$/i.test(o.name)) rForeArm = o;
        else if (!rHand && /RightHand$/i.test(o.name)) rHand = o;
      });

      // Mixamo exports in centimetres → scale so the figure is ~3.4 units tall,
      // its feet resting on the floor, centred on the origin
      const box = new THREE.Box3().setFromObject(fbx);
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);
      const s = 3.4 / size.y;
      fbx.scale.setScalar(s);
      fbx.position.set(-center.x * s, FEET_Y - box.min.y * s, -center.z * s);

      // load the catwalk walk-and-turn clip but PAUSE it — we scrub its time by
      // scroll instead of letting it auto-play (the body becomes a scroll puppet)
      if (gltf.animations.length) {
        mixer = new THREE.AnimationMixer(fbx);
        action = mixer.clipAction(gltf.animations[0]);
        action.play();
        action.paused = true;
        clipDur = action.getClip().duration;
      }
      if (hipsBone) hip0 = (hipsBone as THREE.Object3D).position.clone();

      const group = new THREE.Group();
      group.add(fbx);
      figure = group;
      scene.add(group);


      // tell the entry veil the heavy load is done so it can fade away
      (window as unknown as { __sceneReady?: boolean }).__sceneReady = true;
      window.dispatchEvent(new Event("scene-ready"));
    }, (e) => {
      // stream the figure download progress to the loader's readout
      if (e.lengthComputable) {
        (window as unknown as { __sceneProgress?: number }).__sceneProgress = e.loaded / e.total;
        window.dispatchEvent(new Event("scene-progress"));
      }
    }, (err) => {
      // model 404 / network failure: don't strand the visitor on a 25s blank
      // loader over an empty stage. Mark the scene "ready" so the veil lifts,
      // and drop to the flat DOM portfolio so they still get the full content.
      if (disposed) return;
      console.error("[world] figure failed to load:", err);
      (window as unknown as { __sceneReady?: boolean }).__sceneReady = true;
      window.dispatchEvent(new Event("scene-ready"));
      setFallback(true);
    });

    // mouse parallax
    const mouse = { x: 0, y: 0 };
    const onMouse = (e: PointerEvent) => {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMouse);

    let stageW = el.clientWidth || window.innerWidth;
    let stageH = el.clientHeight || window.innerHeight;
    const resize = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (!w || !h) return;
      stageW = w;
      stageH = h;
      renderer.setSize(w, h);
      composer.setSize(w, h);
      // bloom is a blur anyway — run it at half resolution to save fill-rate
      // (no visible difference, lighter on the GPU)
      bloom.setSize(Math.max(1, Math.round(w / 2)), Math.max(1, Math.round(h / 2)));
      smaa.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    const tmp = new THREE.Vector3();
    const labelV = new THREE.Vector3(); // scratch for projecting memory nickname labels
    // which cubes are comfortably ON SCREEN right now (centred + in front + near):
    // used to place a new memory where the visitor is actually looking
    visibleCubesRef.current = () => {
      const out: number[] = [];
      camera.updateMatrixWorld(); // ensure projection reads the current camera
      const cs = cubeCenters;
      for (let i = 0; i < cs.length; i++) {
        const dist = camera.position.distanceTo(cs[i]);
        if (dist < 10 || dist > 95) continue; // too close (clipping) / too far (faded)
        labelV.copy(cs[i]).project(camera);
        if (labelV.z >= 1) continue; // behind the camera
        if (Math.abs(labelV.x) > 0.72 || Math.abs(labelV.y) > 0.72) continue; // off-screen / edge
        out.push(i);
      }
      return out;
    };

    // camera FOCUS: clicking a memory cube flies the camera in to face it. The
    // scroll camera is computed every frame, then blended toward this focus pose
    // (slerp on orientation) while `active`; releasing eases the blend back to 0.
    const focus = { active: false, blend: 0, pos: new THREE.Vector3(), look: new THREE.Vector3() };
    const aimObj = new THREE.Object3D();
    const scrollPos = new THREE.Vector3();
    const scrollQuat = new THREE.Quaternion();
    focusCubeRef.current = (cubeIdx) => {
      const ctr = cubeCenters[cubeIdx % cubeCenters.length];
      if (!ctr) return;
      // settle just OUTSIDE the cube's back (-z) face, square and head-on, with
      // the cube centred on screen — close enough that the box fills the frame.
      // cube half-edge is 4, so -12 sits ~8 units off the face: right outside it.
      focus.pos.set(ctr.x, ctr.y, ctr.z - 12);
      focus.look.copy(ctr);
      focus.active = true;
    };
    releaseFocusRef.current = () => {
      focus.active = false;
    };

    // click a glowing glass cube directly (raycast) → fly to it + open the card,
    // even when its nickname label isn't currently on screen
    let hoveredCubeId: string | null = null; // which memory cube the pointer is over (drives the reticle)
    const raycaster = new THREE.Raycaster();
    const clickNdc = new THREE.Vector2();
    const onSceneClick = (e: MouseEvent) => {
      if (gridUniforms.uReveal.value < 0.2) return; // only meaningful in the room
      clickNdc.x = (e.clientX / stageW) * 2 - 1;
      clickNdc.y = -(e.clientY / stageH) * 2 + 1;
      raycaster.setFromCamera(clickNdc, camera);
      const hits = raycaster.intersectObjects(occGroup.children, true);
      if (!hits.length) return;
      let o: THREE.Object3D | null = hits[0].object;
      while (o && !o.userData.memId) o = o.parent;
      const id = o?.userData.memId as string | undefined;
      if (!id) return;
      const mem = memoriesRef.current.find((x) => x.id === id);
      if (!mem) return;
      sfx.play("lock");
      focusCubeRef.current?.(mem.cube);
      window.setTimeout(() => openMemoryRef.current(mem), 850);
    };
    el.addEventListener("click", onSceneClick);

    // hover raycast → drive the targeting reticle (read in the tick) + lock cursor
    const hoverRay = new THREE.Raycaster();
    const hoverNdc = new THREE.Vector2();
    const onHover = (e: PointerEvent) => {
      if (gridUniforms.uReveal.value < 0.2) {
        if (hoveredCubeId) { hoveredCubeId = null; el.style.cursor = ""; }
        return;
      }
      hoverNdc.x = (e.clientX / stageW) * 2 - 1;
      hoverNdc.y = -(e.clientY / stageH) * 2 + 1;
      hoverRay.setFromCamera(hoverNdc, camera);
      const hits = hoverRay.intersectObjects(occGroup.children, true);
      let id: string | null = null;
      if (hits.length) {
        let o: THREE.Object3D | null = hits[0].object;
        while (o && !o.userData.memId) o = o.parent;
        id = (o?.userData.memId as string | undefined) ?? null;
      }
      if (id !== hoveredCubeId) {
        hoveredCubeId = id;
        el.style.cursor = id ? "pointer" : "";
        if (id) sfx.play("hover");
      }
    };
    el.addEventListener("pointermove", onHover);

    // scratch + targets for the closing "point forward" arm pose. Local-space
    // euler targets (radians) the arm bones slerp toward as the walk finishes;
    // live-tweakable via window.__armPose, then baked into ARM_POINT here.
    const eScratch = new THREE.Euler();
    const qScratch = new THREE.Quaternion();
    const ARM_POINT = { arm: [-0.5, -1.45, -1.0], fore: [0, 0, -0.2], hand: [0, 0, 0] };
    let raf = 0;
    // smoothed scroll progress + horizontal framing (shifts figure off-centre)
    let p = 0;
    let frameX = 0;
    let t = 0; // animation clock for breathing / float
    let introT = 0; // clock for the floor-emergence reveal
    let started = false; // latches true once the user first scrolls down
    const INTRO_DUR = 4.2;
    // debug: /?p=<0..1> pins scroll progress for tuning (null = normal scroll)
    const pDebugRaw = new URLSearchParams(window.location.search).get("p");
    const pDebug = pDebugRaw != null ? clamp01(parseFloat(pDebugRaw)) : null;
    const sm = { x: 0, y: 0 }; // inertia-smoothed pointer

    // smoothstep ramp between two scroll points
    const smooth = (a: number, b: number, x: number) => { const tt = clamp01((x - a) / (b - a)); return tt * tt * (3 - 2 * tt); };
    let metalTrans = false; // track transparent flag to avoid per-frame recompiles

    // o = visibility 0..1; (dx,dy) = slide-in offset direction (px) when hidden
    const setOverlay = (ref: HTMLDivElement | null, o: number, dx = 0, dy = 0) => {
      if (!ref) return;
      // smoothstep the band so chapters ease in/out instead of ramping linearly
      const s = o <= 0 ? 0 : o >= 1 ? 1 : o * o * (3 - 2 * o);
      const e = 1 - s;
      ref.style.opacity = String(s);
      ref.style.transform = `translate3d(${e * dx}px, ${e * dy}px, 0)`;
      ref.style.pointerEvents = s > 0.5 ? "auto" : "none";
    };

    // eased 0..1 ramp used by the scroll-scrubbed skill matrix below
    const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

    const skillTicked = new Array(SKILLS.length).fill(false); // soft blip as each skill row locks in
    let ambFrame = 0; // throttles the ambient-pad crossfade updates
    let stepPrevY: number | null = null; // hip-bob tracking for exact footsteps
    let stepPrevVy = 0;
    let lastStepMs = 0;
    const sndFwd = new THREE.Vector3(); // listener forward (scratch)
    const sndUp = new THREE.Vector3(); // listener up (scratch)
    const prevCamPos = new THREE.Vector3(); // last frame's camera position (flight-whoosh speed)
    let prevCamInit = false;
    let travelSpeed = 0; // smoothed normalised travel speed through the room
    const handWorld = new THREE.Vector3(); // scratch for projecting the hand to screen

    const tick = () => {
      t += 0.016;
      if (figure) {
        if (!started) started = true;
        if (started && introT < INTRO_DUR) introT += 0.016;
        const it = clamp01(introT / INTRO_DUR); // 0..1 intro progress

        // figure fades + settles up into view on load
        const showE = smooth(0.05, 0.7, it);
        // dim the figure partway as the carousel arrives (so the cards read in
        // front of it), then fully fade it out into the room dive.
        const figFade = (1 - 0.5 * smooth(0.50, 0.60, p)) * (1 - smooth(0.84, 0.93, p));
        figure.visible = it > 0.02 && figFade > 0.02;
        const wantTrans = figFade < 1;
        if (wantTrans !== metalTrans) {
          metalTrans = wantTrans;
          metalMat.transparent = wantTrans;
          metalMat.needsUpdate = true;
        }
        metalMat.opacity = figFade;
        glowUniforms.uFade.value = figFade;
        // bring up the front/face light only while the camera is round at the
        // figure's front for the portfolio, then let it dissolve with the dive
        faceLight.intensity = smooth(0.42, 0.54, p) * (1 - smooth(0.82, 0.90, p)) * 1.15;
        // hero front-fill: full on the landing frame, gone by the time the walk
        // starts (mirrors heroOut at p≈0.16) so only the first impression changes
        heroFill.intensity = (1 - smooth(0.04, 0.16, p)) * 1.1;
        const grow = 0.9 + 0.1 * showE;

        // the catwalk animation drives the body; here we only reveal it (grow +
        // a small settle) — no manual idle (the clip is the life)
        figure.scale.setScalar(grow);
        figure.position.set(0, (1 - showE) * -0.4, 0);
      }
      glowUniforms.uTime.value = t; // rim-glow pulse
      if (bodyTime) bodyTime.value = t; // body surface ripple
      stars.rotation.y += 0.0003;

      // scroll progress (eased)
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const target = max > 0 ? clamp01(window.scrollY / max) : 0;
      // debug: /?p=0.95 freezes the scene at that progress for tuning the finale
      if (pDebug != null) {
        p = pDebug;
      } else {
        // follow the (Lenis-smoothed) scroll position directly: the scene tracks
        // the scroll 1:1 and settles the moment you stop, so it never feels frozen
        // then auto-drifts to catch up. the cap is high enough that normal
        // scrolling never reaches it — it only softens an extreme fling so the
        // scene glides instead of teleporting.
        const cap = 0.022;
        p += Math.max(-cap, Math.min(cap, (target - p) * 0.2));
      }

      // scrub the walk-and-turn clip by scroll: clip time = scroll position, eased
      // so it glides instead of snapping. lock the hips' XZ so the body walks +
      // turns in place rather than striding off-screen (root-motion strip).
      // scrub the walk-and-turn clip by scroll: clip time = scroll position,
      // eased so it glides instead of snapping. lock the hips' XZ so the body
      // walks + turns in place rather than striding off-screen (root-motion strip)
      if (mixer && action && clipDur > 0) {
        // the walk + 180° turn completes by p≈0.38, then holds — the rest of the
        // scroll is camera-only (arc around to the face, present, dive into the room)
        const targetTime = clamp01(p / 0.38) * clipDur;
        animTime += (targetTime - animTime) * 0.12;
        action.time = animTime;
        mixer.update(0);
        if (hipsBone && hip0) {
          hipsBone.position.x = hip0.x;
          hipsBone.position.z = hip0.z;
          // footstep: fire exactly on each LOW point of the hip bob (foot plant).
          // detect the moment the vertical velocity flips down→up while walking.
          const y = hipsBone.position.y;
          if (stepPrevY !== null) {
            const vy = y - stepPrevY;
            const walking = p > 0.02 && p < 0.38 && Math.abs(vy) > 0.00005;
            if (walking && stepPrevVy < 0 && vy >= 0 && performance.now() - lastStepMs > 160) {
              lastStepMs = performance.now();
              sfx.play("step");
            }
            stepPrevVy = vy;
          }
          stepPrevY = y;
        }
        // raise the right arm + point forward as the walk finishes — blended
        // over the clip pose for the arm chain only (slerp by pointF). Read
        // live-tweak values from window.__armPose while dialling in the pose.
        // the arm rises in lock-step with the camera move: it starts lifting the
        // moment the walk ends (~0.38) and is fully pointing by the time the
        // camera has arced around to meet the face (~0.54)
        const pointF = smooth(0.42, 0.52, p);
        if (pointF > 0.001 && rArm) {
          const tw = (window as unknown as { __armPose?: { arm?: number[]; fore?: number[]; hand?: number[] } }).__armPose || {};
          const a = tw.arm || ARM_POINT.arm;
          const f = tw.fore || ARM_POINT.fore;
          const h = tw.hand || ARM_POINT.hand;
          qScratch.setFromEuler(eScratch.set(a[0], a[1], a[2]));
          rArm.quaternion.slerp(qScratch, pointF);
          if (rForeArm) {
            qScratch.setFromEuler(eScratch.set(f[0], f[1], f[2]));
            rForeArm.quaternion.slerp(qScratch, pointF);
          }
          if (rHand) {
            qScratch.setFromEuler(eScratch.set(h[0], h[1], h[2]));
            rHand.quaternion.slerp(qScratch, pointF);
          }
        }
      }

      // interpolate the environment values for this scroll position
      const m = sampleMood(p);
      const sMat = stars.material as THREE.PointsMaterial;
      // fade the starfield out into the finale so no stray stars flicker behind
      // the sign-off
      const starFade = 1 - smooth(0.92, 0.98, p);
      sMat.opacity = Math.min(1, 0.65 + m.star * 0.9) * starFade;
      sMat.size = 2.6 + m.star * 1.6; // pixel-sized (no attenuation)
      stars.visible = starFade > 0.001;
      bloom.strength = m.bloom;
      lensPass.uniforms.uVignette.value = m.vig;
      renderer.toneMappingExposure = m.exp;

      const c = sampleCam(p);
      // inertia on the pointer so parallax glides instead of snapping
      sm.x += (mouse.x - sm.x) * 0.05;
      sm.y += (mouse.y - sm.y) * 0.05;
      // fade the mouse-look parallax OUT in the memory room: there the cubes are
      // click targets, and a camera that drifts with the cursor turns every cube
      // into a moving target you can't aim at. Hold it steady so cubes + their
      // labels stay put under the pointer.
      const parallax = 1 - smooth(0.74, 0.82, p);
      const px = sm.x * 0.4 * parallax;
      const py = -sm.y * 0.3 * parallax;
      // figure sits to the right while the greeting holds the left column, then
      // glides to centre stage as the greeting fades and the walk begins
      const heroOut = clamp01(p / 0.16);
      const targetFrameX = -1.1 * (1 - heroOut);
      frameX += (targetFrameX - frameX) * 0.1;
      // orbit around the lookAt point (which rises to head height), not the
      // origin — so a small radius brings the camera right up to the head/ear
      camera.position.set(
        frameX + c.r * Math.sin(c.ph) * Math.sin(c.th) + px,
        c.ly + c.r * Math.cos(c.ph) + py,
        c.r * Math.sin(c.ph) * Math.cos(c.th)
      );
      camera.lookAt(frameX, c.ly, c.lz);
      // dive: scrolling flies the camera forward along its gaze through the
      // lattice (completes by p≈0.93). stop scrolling -> stop moving.
      const dive = smooth(0.84, 0.93, p);
      if (dive > 0.001) camera.translateZ(-dive * 100.0);
      // finale pull-back: ease the camera back out so the lattice falls away
      const pull = smooth(0.94, 0.985, p);
      if (pull > 0.001) camera.translateZ(pull * 145.0);

      // finale rise: lift up out of the lattice into the open sky. the cube
      // ceiling tops out at y≈42, so rise above it and level the gaze.
      const rise = smooth(0.94, 0.985, p);
      if (rise > 0.001) {
        const e = rise * rise * (3 - 2 * rise); // ease-in-out
        const fwd = new THREE.Vector3();
        camera.getWorldDirection(fwd);
        const gazePt = camera.position.clone().addScaledVector(fwd, 130);
        camera.position.y += e * 86; // clear the y=42 ceiling
        gazePt.y = THREE.MathUtils.lerp(gazePt.y, camera.position.y - 10, e); // level out the gaze
        camera.lookAt(gazePt);
      }
      // the dawn dome fades in as the rise begins, and rides with the camera
      skyUniforms.uFade.value = smooth(0.935, 0.985, p);
      sky.position.copy(camera.position);

      // camera focus: capture the scroll-driven pose, then ease toward the
      // clicked cube (position lerp + orientation slerp). On release it eases
      // straight back to wherever the scroll camera now sits.
      const focusTarget = focus.active ? 1 : 0;
      focus.blend += (focusTarget - focus.blend) * 0.06;
      if (focus.blend > 0.001) {
        // ease-in-out on the blend so the glide accelerates then settles softly
        const e = focus.blend * focus.blend * (3 - 2 * focus.blend);
        scrollPos.copy(camera.position);
        scrollQuat.copy(camera.quaternion);
        aimObj.position.copy(focus.pos);
        aimObj.lookAt(focus.look);
        camera.position.lerpVectors(scrollPos, focus.pos, e);
        camera.quaternion.slerpQuaternions(scrollQuat, aimObj.quaternion, e);
      }

      // the lattice resolves in the moment the figure stops walking (p≈0.6) and
      // the camera-only move begins — it glows up around the standing figure,
      // then the dive carries us into it. In the finale the lattice STAYS lit so
      // the sign-off keeps the room-of-memories atmosphere: the camera pulls back
      // to face the front wall of cyan cubes, and the words type onto that wall.
      const revealFinale = smooth(0.97, 1.0, p);
      // the lattice forms as the cards launch away + the camera arcs around into
      // the room — so the gallery visibly dissolves INTO the memory room and the
      // space is already there as the dive begins.
      gridUniforms.uReveal.value = smooth(0.72, 0.88, p);

      // FINALE sign-off: the cyan wireframe wall holds; the signature + contact
      // type themselves onto it via the DOM overlay (gated on finaleActive below).

      // surface the "leave a memory" trigger once the room has clearly resolved;
      // flip React state only on the crossing so we don't setState every frame
      // the memory room comes after the portfolio: surface the CTA only while we
      // are actually in the room (after the dive, before the rise)
      const roomActive = gridUniforms.uReveal.value > 0.5 && p > 0.86 && p < 0.95;
      if (roomActive !== memoryRoomActiveRef.current) {
        memoryRoomActiveRef.current = roomActive;
        setMemoryRoomActive(roomActive);
        sfx.play(roomActive ? "open" : "close"); // "sector change" cue as the room resolves
      }

      // PROJECT CAROUSEL: right after the figure points (~0.68), it presents its
      // work — the holo carousel plays while the camera holds on the figure.
      // Progress drives the ring rotation in the overlay's own rAF; the boolean
      // only flips React state on the crossing.
      carouselProgressRef.current = clamp01((p - 0.535) / (0.745 - 0.535));
      const carOn = p > 0.525 && p < 0.76;
      // project the figure's right hand to screen so the cards can bloom out of it
      if (rHand && carOn) {
        rHand.updateWorldMatrix(true, false);
        rHand.getWorldPosition(handWorld).project(camera);
        handScreenRef.current.x = handWorld.x * 0.5 + 0.5;
        handScreenRef.current.y = -handWorld.y * 0.5 + 0.5;
      }
      if (carOn !== carouselActiveRef.current) {
        carouselActiveRef.current = carOn;
        setCarouselActive(carOn);
        if (carOn) sfx.play("open"); // "sector change" cue as the gallery resolves
      }

      // surface the contact finale once the sign-off space has resolved
      const finOn = revealFinale > 0.6;
      if (finOn !== finaleActiveRef.current) {
        finaleActiveRef.current = finOn;
        setFinaleActive(finOn);
        if (finOn) sfx.play("boot"); // power-up swell as the sign-off wall comes online
      }

      // project each visitor memory's nickname label from its cube → screen, so
      // the DOM label rides on the 3D cube as the camera moves through the room.
      // refresh the camera matrices FIRST: otherwise project() reads last frame's
      // matrixWorldInverse and the label lags a frame behind the cube on the dive
      camera.updateMatrixWorld();
      const reveal = gridUniforms.uReveal.value;
      // the glowing glass cubes fade in/out with the room reveal
      occFaceMat.opacity = 0.13 * reveal;
      occEdgeMat.opacity = 0.95 * reveal;
      occGroup.visible = reveal > 0.01;

      // materialize pop: a newly added cube springs from collapsed → full with a
      // soft overshoot (easeOutBack), so a fresh memory visibly "forms" in place
      const nowMs = performance.now();
      for (let i = 0; i < occGroup.children.length; i++) {
        const g = occGroup.children[i] as THREE.Object3D;
        const born = g.userData.bornAt as number | undefined;
        if (born == null) continue;
        const a = (nowMs - born) / 900; // 0.9s materialize
        if (a >= 1) {
          g.scale.setScalar(1);
          g.userData.bornAt = undefined; // settle: stop animating
        } else {
          const c1 = 1.70158;
          const c3 = c1 + 1;
          const s = 1 + c3 * Math.pow(a - 1, 3) + c1 * Math.pow(a - 1, 2); // easeOutBack
          g.scale.setScalar(Math.max(0.001, s));
        }
      }

      const centers = cubeCentersRef.current;
      if (reveal > 0.01 && centers.length) {
        const mems = memoriesRef.current;
        for (let i = 0; i < mems.length; i++) {
          const mem = mems[i];
          const elx = labelEls.current.get(mem.id);
          if (!elx) continue;
          const center = centers[mem.cube % centers.length];
          if (!center) { elx.style.opacity = "0"; continue; }
          const dist = camera.position.distanceTo(center);
          labelV.copy(center).project(camera);
          const inFront = labelV.z < 1;
          // nickname reveals on PROXIMITY — fades in from further out now (~45u)
          // and fades when too close, so several names down the corridor read at
          // once (even when the scroll is stopped) instead of one at a time
          const prox = (1 - smooth(45, 78, dist)) * smooth(8, 14, dist);
          const op = inFront ? reveal * prox : 0;
          if (op < 0.015) {
            elx.style.opacity = "0";
            elx.style.pointerEvents = "none";
            continue;
          }
          const sx = (labelV.x * 0.5 + 0.5) * stageW;
          const sy = (-labelV.y * 0.5 + 0.5) * stageH;
          const popScale = (0.8 + 0.2 * op).toFixed(3); // pops up as it fades in on approach
          elx.style.transform = `translate(-50%,-50%) translate(${sx.toFixed(1)}px,${sy.toFixed(1)}px) scale(${popScale})`;
          elx.style.opacity = op.toFixed(2);
          elx.style.pointerEvents = op > 0.45 ? "auto" : "none";
        }
      } else {
        labelEls.current.forEach((elx) => { elx.style.opacity = "0"; elx.style.pointerEvents = "none"; });
      }

      // targeting reticle: lock onto the hovered cube, projecting its centre to
      // screen each frame so it tracks while the camera moves
      const ret = reticleRef.current;
      if (ret) {
        const hm = hoveredCubeId ? memoriesRef.current.find((m) => m.id === hoveredCubeId) : null;
        const hc = hm ? centers[hm.cube % centers.length] : null;
        if (hm && hc && reveal > 0.2) {
          labelV.copy(hc).project(camera);
          if (labelV.z < 1) {
            const rx = (labelV.x * 0.5 + 0.5) * stageW;
            const ry = (-labelV.y * 0.5 + 0.5) * stageH;
            ret.style.transform = `translate(-50%,-50%) translate(${rx.toFixed(1)}px,${ry.toFixed(1)}px)`;
            ret.style.opacity = "1";
            if (reticleLabelRef.current) {
              reticleLabelRef.current.textContent = `NODE ${hm.id.slice(0, 4).toUpperCase()} · ${hc.x | 0} ${hc.y | 0} ${hc.z | 0}`;
            }
          } else ret.style.opacity = "0";
        } else {
          ret.style.opacity = "0";
        }
      }

      // keep the figure in focus; everything else softly blurs (no-op on phones
      // where the bokeh pass is skipped)
      if (bokeh) {
        const focusDist = camera.position.distanceTo(tmp.set(0, c.ly, 0));
        (bokeh.uniforms as Record<string, { value: number }>).focus.value = focusDist;
      }

      // 3D-anchored text: each chapter block drifts with the camera azimuth +
      // pointer and scales with distance, so it reads as pinned beside the figure
      // (thRest/rRest = the camera angle/radius at that chapter's hold)
      // hero greeting: full at rest, drifts up + away as the scroll/walk begins
      // hero character-select HUD: a staggered, directional power-down synced to
      // the scroll-scrubbed walk — START drops first, brackets fade, then the
      // whole skill panel slides off to the left as the character walks in.
      setOverlay(hudStartRef.current, clamp01(1 - smooth(0.0, 0.06, p)), 0, 28);
      setOverlay(hudBracketsRef.current, clamp01(1 - smooth(0.0, 0.1, p)), 0, 0);
      setOverlay(hudPanelRef.current, clamp01(1 - smooth(0.04, 0.17, p)), -60, 0);
      // dim the logo/toggles bar through the memory room so it stops burying the
      // corner cubes behind it, then bring it back for the finale sign-off
      if (topBarRef.current) topBarRef.current.style.opacity = (1 - 0.85 * band(p, 0.78, 0.84, 0.93, 0.98)).toFixed(3);

      // SKILL MATRIX (right) — builds row-by-row in sync with the walk, then clears
      // before the dive. Each row wipes + slides in from the right, staggered.
      const skWrap = hudSkillsRef.current;
      if (skWrap) {
        const skOut = smooth(0.40, 0.48, p); // whole matrix retreats as the approach begins
        skWrap.style.opacity = (smooth(0.10, 0.16, p) * (1 - skOut)).toFixed(3);
        const rows = hudSkillRowsRef.current?.children;
        if (rows) {
          for (let i = 0; i < rows.length; i++) {
            const r = rows[i] as HTMLElement;
            const rin = ease(clamp01((p - (0.13 + i * 0.038)) / 0.05)); // staggered scrub-in
            const vis = rin * (1 - skOut);
            const x = (1 - rin) * 46 + skOut * 64; // slide in, then retreat as the dive nears
            r.style.opacity = vis.toFixed(3);
            r.style.transform = `translate3d(${x.toFixed(1)}px,0,0)`;
            r.style.clipPath = `inset(0 ${((1 - rin) * 100).toFixed(1)}% 0 0)`; // reveal left→right (works L/R aligned)
            // a soft blip the moment each row locks in (reset when scrolled back up)
            if (rin > 0.6 && !skillTicked[i]) {
              skillTicked[i] = true;
              sfx.play("tick");
            } else if (rin < 0.1 && skillTicked[i]) {
              skillTicked[i] = false;
            }
          }
        }
      }

      // ambient pads: keep the bed alive (once audio is unlocked) and crossfade
      // void → memory room → finale with scroll progress; throttled to ~8 Hz
      if ((ambFrame & 7) === 0) {
        sfx.ensureAmbient();
        sfx.setAmbientProgress(p);
      }

      // (footsteps are fired from the hip-bob low points in the walk block above)

      // spatial memory cubes: point the listener at the camera and pan the
      // nearest glowing cubes around it in 3D (only in the room; throttled)
      if ((ambFrame & 3) === 0 && gridUniforms.uReveal.value > 0.2) {
        sfx.ensureSpatial();
        camera.getWorldDirection(sndFwd);
        sndUp.set(0, 1, 0).applyQuaternion(camera.quaternion);
        sfx.setListener(
          camera.position.x, camera.position.y, camera.position.z,
          sndFwd.x, sndFwd.y, sndFwd.z,
          sndUp.x, sndUp.y, sndUp.z,
        );
        const occ: { id: string; x: number; y: number; z: number }[] = [];
        for (let i = 0; i < occGroup.children.length; i++) {
          const g = occGroup.children[i];
          const id = g.userData.memId as string | undefined;
          if (id) occ.push({ id, x: g.position.x, y: g.position.y, z: g.position.z });
        }
        sfx.updateSpatial({ x: camera.position.x, y: camera.position.y, z: camera.position.z }, occ);
      }

      // flight whoosh: a soft wind that tracks how fast the camera is actually
      // travelling through the room, so scrolling forward feels like gliding and
      // stopping settles to silence. Only audible once the room has revealed.
      {
        const inRoom = gridUniforms.uReveal.value > 0.2;
        let inst = 0;
        if (prevCamInit) {
          // per-frame distance → normalised speed (the dive flies ~100 units of
          // camera translateZ across the room, so even a small step is plenty)
          inst = clamp01(camera.position.distanceTo(prevCamPos) / 2.2);
        }
        prevCamPos.copy(camera.position);
        prevCamInit = true;
        const target = inRoom ? inst : 0;
        // ease up quickly, glide down slowly so the wind tapers off naturally
        travelSpeed += (target - travelSpeed) * (target > travelSpeed ? 0.3 : 0.06);
        if (inRoom) {
          sfx.ensureMotion();
          sfx.setMotion(travelSpeed);
        } else if (travelSpeed > 0.001) {
          sfx.setMotion(travelSpeed);
        }
      }
      ambFrame++;

      composer.render();
      raf = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMouse);
      el.removeEventListener("click", onSceneClick);
      el.removeEventListener("pointermove", onHover);
      renderer.domElement.removeEventListener("webglcontextlost", onContextLost);
      ro.disconnect();
      starGeo.dispose();
      grid.geometry.dispose();
      gridMat.dispose();
      occBoxGeo.dispose();
      occEdgeGeo.dispose();
      occFaceMat.dispose();
      occEdgeMat.dispose();
      metalMat.dispose();
      glowMat.dispose();
      dotTex.dispose();
      envRT.dispose();
      pmrem.dispose();
      composer.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === el) el.removeChild(renderer.domElement);
    };
  }, []);

  if (fallback) return <WorldFallback />;

  return (
    <>
      {/* crawler- + screen-reader-readable mirror of the whole portfolio (the 3D
          scene itself is opaque to both). Visually hidden, present in the SSR HTML. */}
      <SeoContent />

      {/* scroll runway — scrubs the figure's walk-and-turn clip; the stage below
          is fixed/pinned so the scene holds while the body animates with scroll */}
      <div style={{ height: "1350vh" }} aria-hidden />

      {/* fixed stage */}
      <div className="fixed inset-0 select-none overflow-hidden bg-bg">
        <div ref={mountRef} className="absolute inset-0 h-full w-full" />

        {/* cinematic vignette */}
        <div
          className="pointer-events-none absolute inset-0 z-[5]"
          style={{ background: "radial-gradient(140% 130% at 50% 45%, transparent 74%, rgba(0,0,0,0.45) 100%)" }}
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
        <div ref={topBarRef} className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between px-6 py-5 sm:px-10 will-change-[opacity]">
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            aria-label="zolboo.xyz — back to top"
            className="pointer-events-auto transition-opacity hover:opacity-80"
          >
            <Logo className="text-xl" />
          </button>
          <div className="flex items-center gap-2.5">
            <SoundToggle />
            <LangToggle />
          </div>
        </div>

        {/* persistent FUI chrome: scanlines, frame, live telemetry */}
        <HudOverlay />

        {/* scroll-progress rail — a cyan spine that fills through the journey */}
        <ScrollRail />

        {/* hero greeting — a clean boot terminal (no background) that types itself
            out; the WebGL tick fades it as the figure rises */}
        <div ref={heroRef} className="pointer-events-none absolute inset-0 z-[6] will-change-transform">
          {/* HUD corner brackets — lock into the frame one by one on load */}
          <div ref={hudBracketsRef} className="absolute inset-0 will-change-[opacity]" style={{ opacity: 1 }}>
            <motion.div initial="hidden" animate={heroReady ? "visible" : "hidden"} variants={hudBracketWrap} className="absolute inset-0">
              <motion.div variants={hudBracket} className="absolute left-5 top-5 h-7 w-7 border-l border-t border-accent/40 sm:left-8 sm:top-8" />
              <motion.div variants={hudBracket} className="absolute right-5 top-5 h-7 w-7 border-r border-t border-accent/40 sm:right-8 sm:top-8" />
              <motion.div variants={hudBracket} className="absolute bottom-5 left-5 h-7 w-7 border-b border-l border-accent/40 sm:bottom-8 sm:left-8" />
              <motion.div variants={hudBracket} className="absolute bottom-5 right-5 h-7 w-7 border-b border-r border-accent/40 sm:bottom-8 sm:right-8" />
            </motion.div>
          </div>

          {/* left: character identity + skill sheet (outer centres, inner is the
              group the tick slides off-screen on scroll) */}
          <div className="absolute left-8 top-1/2 max-w-md -translate-y-1/2 sm:left-16 sm:max-w-xl">
           <div ref={hudPanelRef} className="will-change-transform" style={{ opacity: 1 }}>
            <motion.div initial="hidden" animate={heroReady ? "visible" : "hidden"} variants={hudContainer}>
              <motion.div variants={hudItem} className="font-mono text-[10px] uppercase tracking-[0.45em] text-accent/70">
                ✦ <ScrambleText text="Character Select" active={heroReady} speed={34} />
              </motion.div>
              <motion.h1
                variants={hudItem}
                className="mt-2 font-display text-6xl font-extrabold uppercase leading-none tracking-tight text-ink [text-shadow:0_4px_30px_rgba(0,0,0,0.85)] sm:text-7xl"
              >
                <ScrambleText text={content.hero.name} active={heroReady} speed={70} onReveal={() => sfx.play("tick")} />
              </motion.h1>
              {/* accent underline draws in beneath the name */}
              <motion.div
                variants={hudLine}
                className="mt-3 h-px w-44 origin-left bg-gradient-to-r from-accent to-transparent"
              />
              <motion.div variants={hudItem} className="mt-3 font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
                <span className="text-accent">CLASS</span> · <ScrambleText text={t(content.hero.role)} active={heroReady} speed={20} />
              </motion.div>
              <motion.div
                variants={hudItem}
                className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-[0.22em] text-muted/70"
              >
                <span><ScrambleText text="EST. 2019" active={heroReady} speed={26} /></span>
                <span className="text-muted/40">·</span>
                <span><ScrambleText text={t(content.contact.location)} active={heroReady} speed={22} /></span>
                <span className="text-muted/40">·</span>
                <span className="flex items-center gap-1.5 text-ink/80">
                  <span className="h-1.5 w-1.5 animate-pulseGlow rounded-full bg-accent" />
                  <ScrambleText text={t(content.hero.status)} active={heroReady} speed={20} />
                </span>
              </motion.div>

            </motion.div>
           </div>
          </div>

          {/* SKILL MATRIX — pulled out of the identity panel so it can build on the
              RIGHT in sync with the figure's walk: each row scrubs in one-by-one as
              you scroll the walk (p≈0.18→0.5), then clears before the dive */}
          <div
            ref={hudSkillsRef}
            className="absolute left-5 right-12 top-1/2 -translate-y-1/2 text-left sm:left-auto sm:right-16 sm:max-w-[18rem] sm:text-right lg:right-24"
            style={{ opacity: 0 }}
          >
            <div className="mb-3 flex items-center justify-start gap-2 font-mono text-[9px] uppercase tracking-[0.4em] text-accent/70 sm:justify-end">
              <span className="h-1 w-1 animate-pulseGlow rounded-full bg-accent" />
              <ScrambleText text="SKILLS" active={heroReady} speed={30} />
            </div>
            <div ref={hudSkillRowsRef}>
              {SKILLS.map((s) => (
                <div
                  key={s.cat}
                  className="border-b border-line/50 py-2 text-left will-change-transform sm:text-right"
                  style={{ opacity: 0 }}
                >
                  <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent/90">{s.cat}</div>
                  <div className="font-mono text-[11px] leading-relaxed tracking-wide text-ink/80">{s.items}</div>
                </div>
              ))}
            </div>
          </div>

          {/* press start (bottom-centre) — outer centres, inner is what the tick
              drops away first as the walk begins. Lifted above the HUD telemetry
              on phones (left/right readouts sit at bottom-7) so the centred CTA
              doesn't collide with them on a narrow screen. */}
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 sm:bottom-9">
            <div ref={hudStartRef} className="will-change-transform" style={{ opacity: 1 }}>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={heroReady ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
                transition={{ duration: 0.6, delay: 1.15 }}
                className="flex flex-col items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.35em] text-accent"
              >
                <span className="flex items-center gap-2"><ScrambleText text={t(content.hero.startCta)} active={heroReady} speed={24} /></span>
                <span className="animate-bounce text-sm leading-none text-accent/70">⌄</span>
              </motion.div>
            </div>
          </div>

        </div>

        {/* visitor memory nickname labels — each rides on its lattice cube, the
            tick projects its 3D centre to screen every frame (mono cyan to match
            the wireframe). Click → glass card with the full message. */}
        <div className="pointer-events-none absolute inset-0 z-[16]">
          {memories.map((mem) => (
            <button
              key={mem.id}
              ref={(elx) => {
                if (elx) labelEls.current.set(mem.id, elx);
                else labelEls.current.delete(mem.id);
              }}
              onClick={() => {
                sfx.play("lock");
                focusCubeRef.current?.(mem.cube); // fly the camera in to the cube
                window.setTimeout(() => setOpenMemory(mem), 850); // card after it arrives
              }}
              onPointerEnter={() => sfx.play("hover")}
              style={{ position: "absolute", top: 0, left: 0, opacity: 0 }}
              className="whitespace-nowrap font-mono text-xs tracking-[0.18em] text-accent text-glow transition-colors hover:text-ink"
            >
              {mem.nickname}
            </button>
          ))}
        </div>

        {/* targeting reticle — locks onto the cube under the pointer (positioned
            by the tick), with a live NODE id + coordinate readout */}
        <div className="pointer-events-none absolute inset-0 z-[15]">
          <div ref={reticleRef} style={{ position: "absolute", top: 0, left: 0, opacity: 0 }} className="transition-opacity duration-150">
            <div className="relative h-16 w-16">
              <span className="absolute left-0 top-0 h-3 w-3 border-l-2 border-t-2 border-accent" />
              <span className="absolute right-0 top-0 h-3 w-3 border-r-2 border-t-2 border-accent" />
              <span className="absolute bottom-0 left-0 h-3 w-3 border-b-2 border-l-2 border-accent" />
              <span className="absolute bottom-0 right-0 h-3 w-3 border-b-2 border-r-2 border-accent" />
              <span className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent shadow-[0_0_8px_rgba(45,230,230,0.9)]" />
              <div
                ref={reticleLabelRef}
                className="absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap font-mono text-[9px] uppercase tracking-[0.2em] text-accent/80"
              />
            </div>
          </div>
        </div>

        {/* leave-a-memory trigger — fades in once the room of memories resolves;
            a prominent, glowing accent pill so it clearly invites a tap */}
        <button
          onClick={() => {
            sfx.play("open");
            setFormOpen(true);
          }}
          onPointerEnter={() => sfx.play("hover")}
          aria-hidden={!memoryRoomActive || finaleActive || carouselActive}
          className={`group absolute bottom-8 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2.5 rounded-full border border-accent/60 bg-accent/15 px-7 py-3 font-mono text-[12px] font-semibold uppercase tracking-[0.24em] text-accent shadow-[0_0_30px_-6px_rgba(45,230,230,0.55)] backdrop-blur-md transition-all duration-700 ease-out hover:border-accent hover:bg-accent/25 hover:text-ink hover:shadow-[0_0_44px_-6px_rgba(45,230,230,0.8)] ${
            memoryRoomActive && !finaleActive && !carouselActive
              ? "pointer-events-auto translate-y-0 opacity-100"
              : "pointer-events-none translate-y-3 opacity-0"
          }`}
        >
          <span className="h-1.5 w-1.5 animate-pulseGlow rounded-full bg-accent shadow-[0_0_10px_rgba(45,230,230,0.9)]" />
          <ScrambleText text={t(content.memories.cta)} active={memoryRoomActive} speed={22} />
        </button>

        {/* PROJECT CAROUSEL: the holo gallery between the room and the finale */}
        <ProjectsCarousel active={carouselActive} progressRef={carouselProgressRef} handRef={handScreenRef} />

        {/* FINALE: the sign-off — the closing words type themselves onto the
            wireframe wall, terminal-style, and come to rest there */}
        <div
          aria-hidden={!finaleActive}
          className={`absolute inset-0 z-20 flex items-center justify-center px-6 transition-opacity duration-700 ${
            finaleActive ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          {/* centred cyan glow behind the wall */}
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[58vh] w-[58vh] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ background: "radial-gradient(circle, rgba(45,230,230,0.14), rgba(45,230,230,0.04) 40%, transparent 66%)" }}
          />
          <FinaleWall active={finaleActive} />
        </div>

        <MemoryForm open={formOpen} onClose={() => setFormOpen(false)} onSubmit={handleMemorySubmit} />
        {openMemory && (
          <MemoryCard
            memory={openMemory}
            onClose={() => {
              setOpenMemory(null);
              releaseFocusRef.current?.(); // ease the camera back to the scroll path
            }}
          />
        )}
      </div>
    </>
  );
}

// Minimal scroll-progress rail — a slim cyan spine on the right that fills as
// you move through the experience, with ticks at the real beats. Click to jump.
// jump targets land squarely inside each beat: WORK in the live carousel
// (active p0.53–0.76), MEMORIES inside the resolved room (p0.86–0.95)
const RAIL_BEATS = [
  { p: 0.0, label: "INTRO" },
  { p: 0.62, label: "WORK" },
  { p: 0.88, label: "MEMORIES" },
  { p: 0.95, label: "SIGN-OFF" },
];

function ScrollRail() {
  const [p, setP] = useState(0);
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const max = document.documentElement.scrollHeight - window.innerHeight;
        setP(max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const jump = (tp: number) => {
    sfx.play("click");
    const max = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo({ top: tp * max, behavior: "smooth" });
  };

  let active = 0;
  for (let i = 0; i < RAIL_BEATS.length; i++) if (p >= RAIL_BEATS[i].p - 0.04) active = i;

  return (
    <div
      className="pointer-events-none absolute right-5 top-1/2 z-20 flex -translate-y-1/2 flex-col items-center transition-opacity duration-500 sm:right-9"
      style={{ opacity: p > 0.01 ? 1 : 0 }}
    >
      <div className="relative h-44 w-px bg-white/12">
        {/* fill */}
        <div
          className="absolute left-0 top-0 w-px bg-gradient-to-b from-accent to-accent/40"
          style={{ height: `${p * 100}%`, boxShadow: "0 0 8px rgba(45,230,230,0.6)" }}
        />
        {/* moving head */}
        <div
          className="absolute left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-accent"
          style={{ top: `calc(${p * 100}% - 3px)`, boxShadow: "0 0 10px rgba(45,230,230,0.9)" }}
        />
        {/* beat ticks + labels */}
        {RAIL_BEATS.map((b, i) => (
          <button
            key={b.label}
            onClick={() => jump(b.p)}
            onPointerEnter={() => sfx.play("hover")}
            aria-label={b.label}
            className="group pointer-events-auto absolute left-1/2 -translate-x-1/2"
            style={{ top: `${b.p * 100}%`, transform: "translate(-50%,-50%)" }}
          >
            <span
              className={`block h-1.5 w-1.5 rounded-full border transition-all group-hover:scale-125 group-hover:border-accent ${
                i === active ? "scale-125 border-accent bg-accent" : "border-white/30 bg-bg group-hover:bg-accent/40"
              }`}
            />
            {/* label: lit on the active beat, and revealed on hover for any beat
                so the whole rail reads as a jump menu */}
            <span
              className={`absolute right-4 top-1/2 -translate-y-1/2 whitespace-nowrap text-right font-mono text-[9px] uppercase tracking-[0.3em] transition-all duration-300 group-hover:text-accent group-hover:opacity-100 ${
                i === active ? "text-accent opacity-100" : "text-muted opacity-0"
              }`}
            >
              {b.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function LangToggle() {
  const { lang, toggle } = useLang();
  return (
    <button onClick={() => { sfx.play("click"); toggle(); }} onPointerEnter={() => sfx.play("hover")} aria-label="Toggle language" className="pointer-events-auto flex items-center gap-1 rounded-full border border-line bg-surface/70 px-1 py-1 font-mono text-xs backdrop-blur">
      <span className={`rounded-full px-2.5 py-1 ${lang === "mn" ? "bg-accent text-bg" : "text-muted"}`}>MN</span>
      <span className={`rounded-full px-2.5 py-1 ${lang === "en" ? "bg-accent text-bg" : "text-muted"}`}>EN</span>
    </button>
  );
}

function PanelEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <span className="h-px w-8 bg-gradient-to-r from-ink/70 to-transparent" />
      <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-muted">{children}</span>
    </div>
  );
}

// --- FINALE: the sign-off typed onto the wireframe wall ---------------------
type FinaleLine = {
  kind: "sig" | "sub" | "link" | "end";
  text: string;
  href?: string;
  label?: string;
};

// The closing words, typed terminal-style onto a wireframe panel. Once the
// last line lands, the socials fade in beneath and the caret keeps blinking.
function FinaleWall({ active }: { active: boolean }) {
  const { t } = useLang();
  const [typedDone, setTypedDone] = useState(false);
  const onDone = useCallback(() => {
    setTypedDone(true);
    sfx.play("confirm"); // chime as the sign-off lands + the wall ripples
  }, []);

  // reset when the finale leaves the screen so it re-types on the next visit
  useEffect(() => {
    if (!active) setTypedDone(false);
  }, [active]);

  const lines: FinaleLine[] = [
    { kind: "sig", text: "zolboo.xyz" },
    { kind: "sub", text: t(content.finale.sub) },
    { kind: "link", label: "EMAIL", text: content.contact.email, href: `mailto:${content.contact.email}` },
    { kind: "link", label: "PHONE", text: content.contact.phone, href: `tel:${content.contact.phoneRaw}` },
    { kind: "end", text: t(content.finale.continued) },
  ];

  return (
    <div className="relative w-full max-w-xl">
      {/* THE WALL — a section of cyan cube cells matching the room's lattice,
          extended past the text and edge-faded so it fuses with the 3D wireframe
          behind it. This is the surface the sign-off is written onto. */}
      <div
        className="pointer-events-none absolute -inset-x-10 -inset-y-12 sm:-inset-x-20 sm:-inset-y-16"
        style={{
          backgroundImage:
            "linear-gradient(rgba(45,230,230,0.30) 1px, transparent 1px), linear-gradient(90deg, rgba(45,230,230,0.30) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          backgroundPosition: "center",
          maskImage: "radial-gradient(115% 110% at 50% 50%, #000 28%, transparent 78%)",
          WebkitMaskImage: "radial-gradient(115% 110% at 50% 50%, #000 28%, transparent 78%)",
        }}
      />
      {/* additive cyan wash so the wall glows like the lattice */}
      <div
        className="pointer-events-none absolute -inset-x-10 -inset-y-12 mix-blend-screen sm:-inset-x-20 sm:-inset-y-16"
        style={{ background: "radial-gradient(55% 50% at 50% 50%, rgba(45,230,230,0.12), transparent 72%)" }}
      />
      {/* frosted scrim directly behind the words — see-through (the wireframe
          wall still reads) but lightly blurred so the type stays legible, as if
          the words are etched into a pane set into the wall */}
      <div
        className="pointer-events-none absolute -inset-x-5 -inset-y-7 rounded-2xl backdrop-blur-[3px]"
        style={{
          background: "radial-gradient(72% 72% at 50% 50%, rgba(2,6,10,0.6), transparent 76%)",
          maskImage: "radial-gradient(78% 78% at 50% 50%, #000 44%, transparent 80%)",
          WebkitMaskImage: "radial-gradient(78% 78% at 50% 50%, #000 44%, transparent 80%)",
        }}
      />
      {/* corner brackets framing the wall panel */}
      <span className="pointer-events-none absolute -left-3 -top-3 h-7 w-7 border-l-2 border-t-2 border-accent/60" />
      <span className="pointer-events-none absolute -right-3 -top-3 h-7 w-7 border-r-2 border-t-2 border-accent/60" />
      <span className="pointer-events-none absolute -bottom-3 -left-3 h-7 w-7 border-b-2 border-l-2 border-accent/60" />
      <span className="pointer-events-none absolute -bottom-3 -right-3 h-7 w-7 border-b-2 border-r-2 border-accent/60" />

      {/* a cyan ripple radiates across the wall the moment the sign-off lands */}
      {typedDone && (
        <div
          key="pulse"
          className="wall-pulse pointer-events-none absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ border: "1px solid rgba(45,230,230,0.5)", boxShadow: "0 0 40px rgba(45,230,230,0.4)" }}
        />
      )}

      <div className="relative px-7 py-9 text-left sm:px-10 sm:py-11">
        <FinaleTyper active={active} lines={lines} onDone={onDone} done={typedDone} />

        {/* socials resolve only after the message has finished typing */}
        <div
          className={`mt-8 flex items-center gap-3 transition-all duration-700 ${
            typedDone ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0"
          }`}
        >
          <a
            href={content.contact.social.facebook}
            target="_blank"
            rel="noreferrer"
            aria-label="Facebook"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-muted transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:text-accent"
          >
            <Facebook size={15} strokeWidth={2} />
          </a>
          <a
            href={content.contact.social.instagram}
            target="_blank"
            rel="noreferrer"
            aria-label="Instagram"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-muted transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:text-accent"
          >
            <Instagram size={15} strokeWidth={2} />
          </a>
          <a
            href={content.contact.social.github}
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-muted transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:text-accent"
          >
            <Github size={15} strokeWidth={2} />
          </a>
        </div>
      </div>
    </div>
  );
}

function FinaleTyper({
  active,
  lines,
  speed = 34,
  onDone,
  done = false,
}: {
  active: boolean;
  lines: FinaleLine[];
  speed?: number;
  onDone?: () => void;
  done?: boolean;
}) {
  const total = lines.reduce((a, l) => a + l.text.length, 0);
  const [typed, setTyped] = useState(0);

  useEffect(() => {
    if (!active) {
      setTyped(0);
      return;
    }
    let raf = 0;
    let tickBucket = -1;
    const t0 = performance.now();
    const tick = (now: number) => {
      const v = Math.min(total, Math.round((now - t0) / speed));
      setTyped(v);
      // soft typewriter blip every few characters (not every one → not noisy)
      const bucket = Math.floor(v / 3);
      if (v < total && bucket !== tickBucket) {
        tickBucket = bucket;
        sfx.play("tick");
      }
      if (v < total) raf = requestAnimationFrame(tick);
      else onDone?.();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, total, speed, onDone]);

  let acc = 0;
  return (
    <div className="space-y-4">
      {lines.map((line, i) => {
        const start = acc;
        acc += line.text.length;
        const started = typed >= start;
        if (!started && typed < start) return null;
        const visible = Math.max(0, Math.min(line.text.length, typed - start));
        const typing = visible < line.text.length;
        // caret rides the line being typed, and rests on the final line when done
        const caret = typing || (i === lines.length - 1 && typed >= total);
        if (visible <= 0 && !(i === 0 && typed === 0 && active)) return null;
        return <FinaleLineView key={i} line={line} visible={visible} caret={caret} bloom={done && line.kind === "sig"} />;
      })}
    </div>
  );
}

function FinaleLineView({
  line,
  visible,
  caret,
  bloom = false,
}: {
  line: FinaleLine;
  visible: number;
  caret: boolean;
  bloom?: boolean;
}) {
  const shown = line.text.slice(0, visible);
  const Caret = caret ? <span className="caret ml-0.5 text-accent">▋</span> : null;

  if (line.kind === "sig") {
    const a = shown.slice(0, 6); // "zolboo"
    const b = shown.slice(6); // ".xyz"
    return (
      <div
        className={`font-logo text-4xl font-extrabold italic tracking-tight text-ink sm:text-6xl ${bloom ? "finale-bloom" : ""}`}
        style={{ textShadow: "0 0 40px rgba(45,230,230,0.4)" }}
      >
        {a}
        <span className="text-accent">{b}</span>
        {Caret}
      </div>
    );
  }

  if (line.kind === "sub") {
    return (
      <p className="max-w-md font-mono text-sm leading-relaxed text-muted">
        {shown}
        {Caret}
      </p>
    );
  }

  if (line.kind === "link") {
    const complete = visible >= line.text.length;
    const inner = (
      <>
        <span className="text-accent/55">{line.label}&nbsp;&nbsp;</span>
        <span className="text-ink">{shown}</span>
        {Caret}
      </>
    );
    return complete && line.href ? (
      <a href={line.href} className="block w-fit font-mono text-sm transition-colors hover:text-accent">
        {inner}
      </a>
    ) : (
      <div className="font-mono text-sm">{inner}</div>
    );
  }

  // end — "To be continued…"
  return (
    <div
      className="pt-1 font-mono text-xs font-medium uppercase tracking-[0.35em] text-ink/90"
      style={{ textShadow: "0 0 22px rgba(45,230,230,0.35)" }}
    >
      {shown}
      {Caret}
    </div>
  );
}

// Mobile / no-WebGL view: a single-column portfolio that mirrors
// the desktop content without the heavy 3D scroll experience.
function WorldFallback() {
  const { t } = useLang();
  const c = content;
  return (
    <div className="min-h-screen bg-bg text-ink">
      {/* top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line/60 bg-bg/80 px-5 py-4 backdrop-blur-md">
        <Logo className="text-lg" />
        <div className="flex items-center gap-2.5">
          <SoundToggle />
          <LangToggle />
        </div>
      </header>

      <main className="mx-auto max-w-md px-5 pb-24">
        {/* hero */}
        <section className="pb-12 pt-14">
          <div className="font-mono text-[10px] uppercase tracking-[0.35em] text-accent/80">
            ✦ <ScrambleText text={t(c.hero.role)} whenVisible speed={20} />
          </div>
          <h1 className="mt-4 font-display text-6xl font-extrabold uppercase leading-[0.95] tracking-tight">
            <ScrambleText text={c.hero.name} whenVisible speed={60} />
          </h1>
          <div className="mt-4 h-px w-28 bg-gradient-to-r from-accent to-transparent" />
          <p className="mt-6 text-[15px] leading-relaxed text-muted">{t(c.hero.tagline)}</p>
          <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted/70">
            <span className="flex items-center gap-1.5 text-ink/80">
              <span className="h-1.5 w-1.5 animate-pulseGlow rounded-full bg-accent" />
              <ScrambleText text={t(c.hero.status)} whenVisible speed={20} />
            </span>
            <span className="text-muted/40">·</span>
            <span><ScrambleText text={t(c.contact.location)} whenVisible speed={22} /></span>
          </div>
          <div className="mt-7 flex flex-wrap gap-3">
            <a
              href={`mailto:${c.contact.email}`}
              className="rounded-full bg-accent px-5 py-2.5 font-mono text-xs font-semibold uppercase tracking-[0.15em] text-bg transition-all hover:shadow-[0_0_24px_-6px_rgba(45,230,230,0.7)] active:scale-[0.97]"
            >
              {t(c.hero.ctaContact)}
            </a>
            <a
              href="#work"
              className="rounded-full border border-line px-5 py-2.5 font-mono text-xs uppercase tracking-[0.15em] text-muted transition-colors hover:border-accent/40 hover:text-ink active:scale-[0.97]"
            >
              {t(c.hero.ctaWork)}
            </a>
          </div>
        </section>

        {/* skills */}
        <section className="border-t border-line/60 py-10">
          <PanelEyebrow><ScrambleText text="Skills" whenVisible speed={30} /></PanelEyebrow>
          <div className="-mt-1">
            {SKILLS.map((s) => (
              <div key={s.cat} className="grid grid-cols-[88px_1fr] gap-x-3 border-b border-line/50 py-2.5">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-accent/90"><ScrambleText text={s.cat} whenVisible speed={24} /></span>
                <span className="font-mono text-[11px] leading-relaxed text-ink/80"><ScrambleText text={s.items} whenVisible speed={12} /></span>
              </div>
            ))}
          </div>
        </section>

        {/* selected work */}
        <section id="work" className="scroll-mt-20 border-t border-line/60 py-10">
          <PanelEyebrow><ScrambleText text={t(c.projects.label)} whenVisible speed={24} /></PanelEyebrow>
          <h2 className="font-display text-2xl font-bold tracking-tight"><ScrambleText text={t(c.projects.heading)} whenVisible speed={20} /></h2>
          <div className="mt-6 space-y-6">
            {c.projects.items.map((p) => (
              <div key={p.id} className="border-t border-line pt-4">
                <div className="font-mono text-[10px] uppercase tracking-wider text-accent/80">
                  <ScrambleText text={`${t(p.category)} · ${p.year}`} whenVisible speed={20} />
                </div>
                <h3 className="mt-1 font-display text-lg font-bold"><ScrambleText text={t(p.title)} whenVisible speed={26} /></h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{t(p.desc)}</p>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {p.tags.map((tag) => (
                    <span key={tag} className="rounded border border-line px-2 py-0.5 font-mono text-[10px] text-muted">{tag}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* journey */}
        <section className="border-t border-line/60 py-10">
          <PanelEyebrow><ScrambleText text={t(c.journey.label)} whenVisible speed={24} /></PanelEyebrow>
          <h2 className="font-display text-2xl font-bold tracking-tight"><ScrambleText text={t(c.journey.heading)} whenVisible speed={20} /></h2>
          <div className="mt-6 space-y-4 border-l border-white/12 pl-5">
            {c.journey.items.map((it) => (
              <div key={it.year} className="relative">
                <span className="absolute -left-[23px] top-1.5 h-1.5 w-1.5 rounded-full bg-accent" />
                <div className="font-mono text-[10px] uppercase tracking-wider text-accent/80"><ScrambleText text={it.year} whenVisible speed={26} /></div>
                <div className="font-display text-base font-semibold"><ScrambleText text={t(it.title)} whenVisible speed={24} /></div>
                <div className="text-sm text-muted">{t(it.desc)}</div>
              </div>
            ))}
          </div>
        </section>

        {/* services */}
        <section className="border-t border-line/60 py-10">
          <PanelEyebrow><ScrambleText text={t(c.services.label)} whenVisible speed={24} /></PanelEyebrow>
          <h2 className="font-display text-2xl font-bold tracking-tight"><ScrambleText text={t(c.services.heading)} whenVisible speed={20} /></h2>
          <div className="mt-6 grid gap-3">
            {c.services.items.map((s) => (
              <div key={s.id} className="rounded-xl border border-line bg-white/[0.02] p-4">
                <div className="font-display text-base font-semibold"><ScrambleText text={t(s.title)} whenVisible speed={24} /></div>
                <div className="mt-1 text-sm leading-relaxed text-muted">{t(s.desc)}</div>
                <div className="mt-2 font-mono text-[10px] uppercase tracking-wider text-accent/70">{s.tools}</div>
              </div>
            ))}
          </div>
        </section>

        {/* contact */}
        <section className="border-t border-line/60 py-10">
          <PanelEyebrow><ScrambleText text={t(c.contact.label)} whenVisible speed={24} /></PanelEyebrow>
          <h2 className="font-display text-3xl font-extrabold leading-tight tracking-tight text-grad"><ScrambleText text={t(c.contact.heading)} whenVisible speed={26} /></h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">{t(c.contact.sub)}</p>
          <div className="mt-6 space-y-3 font-mono text-sm">
            <a href={`mailto:${c.contact.email}`} className="flex w-fit items-center gap-2.5 text-ink transition-colors hover:text-accent">
              <Mail size={15} className="text-accent" />
              {c.contact.email}
            </a>
            <a href={`tel:${c.contact.phoneRaw}`} className="flex w-fit items-center gap-2.5 text-ink transition-colors hover:text-accent">
              <Phone size={15} className="text-accent" />
              {c.contact.phone}
            </a>
          </div>
          <div className="mt-6 flex gap-3">
            <a href={c.contact.social.facebook} target="_blank" rel="noreferrer" aria-label="Facebook" className="flex h-11 w-11 items-center justify-center rounded-full border border-line text-muted transition-all hover:border-accent/40 hover:text-accent active:scale-95">
              <Facebook size={17} />
            </a>
            <a href={c.contact.social.instagram} target="_blank" rel="noreferrer" aria-label="Instagram" className="flex h-11 w-11 items-center justify-center rounded-full border border-line text-muted transition-all hover:border-accent/40 hover:text-accent active:scale-95">
              <Instagram size={17} />
            </a>
            <a href={c.contact.social.github} target="_blank" rel="noreferrer" aria-label="GitHub" className="flex h-11 w-11 items-center justify-center rounded-full border border-line text-muted transition-all hover:border-accent/40 hover:text-accent active:scale-95">
              <Github size={17} />
            </a>
          </div>
        </section>

        {/* footer */}
        <footer className="border-t border-line/60 pt-9 text-center">
          <div className="font-logo text-2xl font-extrabold italic">
            zolboo<span className="text-accent">.xyz</span>
          </div>
          <div className="mt-3 font-mono text-[11px] uppercase tracking-[0.3em] text-ink/80 [text-shadow:0_0_20px_rgba(45,230,230,0.3)]">
            {t(c.finale.continued)}
          </div>
          <div className="mt-3 font-mono text-[10px] text-muted/50">
            © {new Date().getFullYear()} {c.hero.name} · {t(c.footer.built)}
          </div>
        </footer>
      </main>
    </div>
  );
}
