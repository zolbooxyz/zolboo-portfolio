"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { BokehPass } from "three/examples/jsm/postprocessing/BokehPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { SMAAPass } from "three/examples/jsm/postprocessing/SMAAPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { content } from "@/lib/content";
import { useLang } from "@/lib/LanguageContext";
import { palette } from "@/lib/theme";
import { fetchMemories, addMemory, pickFreeCube, type Memory } from "@/lib/memories";
import MemoryForm from "@/components/MemoryForm";
import MemoryCard from "@/components/MemoryCard";

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

// opacity envelope: 0 before a, ramp to 1 by b, hold to c, ramp to 0 by d
function band(p: number, a: number, b: number, c: number, d: number) {
  if (p <= a || p >= d) return 0;
  if (p < b) return (p - a) / (b - a);
  if (p > c) return 1 - (p - c) / (d - c);
  return 1;
}

// camera keyframes along the scroll timeline (spherical: radius/theta/phi).
// fx = lookAt x-offset → shifts the figure off-centre so the chapter text gets
// the opposite column (alternating left/right gives the page its rhythm)
// ly = lookAt height (rises to head level for the closing shot)
// lz = lookAt depth → at the end the gaze pushes FORWARD past the head, in the
//      same direction the figure faces, so camera + model share one POV and the
//      space ahead is where the next section will open
type Key = { p: number; r: number; th: number; ph: number; fx: number; ly: number; lz: number };
// Each chapter gets a HOLD plateau (a pair of near-identical keys) so the
// camera parks on the beat for a stretch of scroll before moving on.
// hero-only: one slow cinematic 3/4 orbit + gentle dolly that showcases the
// figure's scroll-scrubbed walk-and-turn, then — once it finishes the 180° —
// the camera settles directly behind the head, looking the same way it does.
const KEYS: Key[] = [
  { p: 0.0, r: 5.2, th: 0.0, ph: 1.18, fx: 0, ly: 0.2, lz: 0 }, // front, close — standing pose
  { p: 0.3, r: 5.8, th: 0.5, ph: 1.14, fx: 0, ly: 0.2, lz: 0 }, // ease around as it starts walking
  { p: 0.6, r: 6.0, th: 1.1, ph: 1.14, fx: 0, ly: 0.4, lz: 0 }, // walk + 180° completes here; swung to the side-back
  { p: 0.72, r: 2.6, th: 0.62, ph: 1.45, fx: 0, ly: 1.4, lz: -2.0 }, // camera-only: settle behind the right ear, watch the point
  { p: 1.0, r: 2.2, th: 0.5, ph: 1.48, fx: 0, ly: 1.45, lz: -4.5 }, // long, slow glide forward — the dive (below) eases into the moment
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

// environment "mood" along the same scroll timeline: fog / stars / grid / dust /
// bloom / vignette / exposure all drift together so the void evolves as one
// continuous journey (tight & dark → open star-filled awe → settled → closing in)
type Mood = { p: number; fog: number; star: number; grid: number; dust: number; bloom: number; vig: number; exp: number };
const MOOD: Mood[] = [
  { p: 0.0, fog: 0.04, star: 0.42, grid: 0, dust: 0.5, bloom: 0.32, vig: 0.4, exp: 0.86 }, // hero — tight, dark
  { p: 0.5, fog: 0.03, star: 0.6, grid: 0, dust: 0.45, bloom: 0.36, vig: 0.34, exp: 0.9 }, // opens slightly as it moves
  { p: 1.0, fog: 0.036, star: 0.52, grid: 0, dust: 0.5, bloom: 0.34, vig: 0.38, exp: 0.88 }, // settle
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

export default function World() {
  const { t } = useLang();

  const mountRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const aboutRef = useRef<HTMLDivElement>(null);
  const journeyRef = useRef<HTMLDivElement>(null);
  const worksRef = useRef<HTMLDivElement>(null);
  const worksHeadingRef = useRef<HTMLHeadingElement>(null);
  const worksItemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const contactRef = useRef<HTMLDivElement>(null);
  const contactHeadingRef = useRef<HTMLHeadingElement>(null);
  // parallax layers (sit between the positioning flex + the reveal layer) so the
  // chapter text drifts/scales with the camera, feeling anchored in the world
  const aboutWrapRef = useRef<HTMLDivElement>(null);
  const journeyWrapRef = useRef<HTMLDivElement>(null);
  const worksWrapRef = useRef<HTMLDivElement>(null);
  const contactWrapRef = useRef<HTMLDivElement>(null);

  const [fallback, setFallback] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  // visitor "room of memories" guestbook
  const [memories, setMemories] = useState<Memory[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [openMemory, setOpenMemory] = useState<Memory | null>(null);
  const memoriesRef = useRef<Memory[]>([]); // live copy the WebGL tick can read
  const cubeCentersRef = useRef<THREE.Vector3[]>([]); // lattice cube world centres
  const labelEls = useRef<Map<string, HTMLButtonElement>>(new Map()); // nickname label DOM
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

  useEffect(() => {
    fetchMemories().then(setMemories);
  }, []);
  useEffect(() => {
    memoriesRef.current = memories;
    syncOccupiedRef.current?.(memories); // light up the glass cubes for occupied cells
  }, [memories]);

  const handleMemorySubmit = async (fields: { nickname: string; phone: string; comment: string }) => {
    const total = cubeCentersRef.current.length;
    const occupied = memoriesRef.current.map((x) => x.cube);
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
    if (!el || reduced || window.innerWidth < 768 || !hasWebGL()) {
      setFallback(true);
      return;
    }

    // always open on the blank void + greeting (don't let the browser restore a
    // prior scroll position, which would pop the figure in under the greeting)
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    window.scrollTo(0, 0);

    let disposed = false;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.82;
    renderer.localClippingEnabled = true; // for the floor-emergence reveal
    el.appendChild(renderer.domElement);

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    // cinematic depth-of-field
    const bokeh = new BokehPass(scene, camera, { focus: 8, aperture: 0.0009, maxblur: 0.008 });
    composer.addPass(bokeh);
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

    // image-based lighting: a custom studio cube of coloured emissive panels
    // (white key + cyan / magenta rims) baked into an env map, so the chrome
    // body reflects dramatic on-brand light instead of flat grey.
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
    addPanel(0xffffff, 3.6, [-7, 8, 7], 10, 12); // key — strong, dramatic highlight
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
    scene.add(keyLight, rimLight, fillLight);

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
      new THREE.PointsMaterial({ color: new THREE.Color(palette.ink), size: 0.05, map: dotTex, transparent: true, opacity: 0.5, depthWrite: false })
    );
    scene.add(stars);

    // --- "I'm having a moment": the trippy plunge from Project Hail Mary.

    // --- ROOM OF MEMORIES: the dive emerges into a cyan wireframe cyberspace.
    // A cyan grid lattice fills the void; terminal UI resolves over it. ---

    // infinite 3D LATTICE made of DISCRETE WIREFRAME CUBES — a volumetric matrix
    // of individual cyan cube cells (small gaps between them) receding in every
    // direction, so flying through reads as endless digital space. Each cube is
    // an addressable cell: content gets placed INSIDE select cubes later (their
    // world centres are stashed on grid.userData.cubeCenters).
    const latPts: number[] = [];
    const cubeCenters: THREE.Vector3[] = [];
    const SP = 14; // cube cell spacing (centre-to-centre)
    const HC = 4; // half cube edge (cube = 8, smaller cells with wider gaps)
    const NX = 5; // cubes either side of centre in x → 11 columns (wide)
    const NY = 3; // cubes either side of centre in y → 7 rows
    const LZ0 = 34; // near end (behind start)
    const LZ1 = -185; // far end (deep ahead)
    const addCube = (cx: number, cy: number, cz: number) => {
      cubeCenters.push(new THREE.Vector3(cx, cy, cz));
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
        for (let cz = LZ0; cz >= LZ1; cz -= SP) addCube(ix * SP, iy * SP, cz);
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
          float depthMix = smoothstep(-185.0, 34.0, vW.z);
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
        const center = cubeCenters[mm.cube];
        if (!center) continue;
        const g = new THREE.Group();
        g.position.copy(center);
        g.userData.memId = mm.id; // for click raycasting
        g.add(new THREE.Mesh(occBoxGeo, occFaceMat));
        g.add(new THREE.LineSegments(occEdgeGeo, occEdgeMat));
        occGroup.add(g);
        occMeshes.set(mm.id, g);
      }
    };
    syncOccupiedRef.current(memoriesRef.current); // memories that loaded before this effect


    // figure stands on this plane (scaled to 3.4 tall + centred → feet at -1.7)
    const FEET_Y = -1.7;

    // --- dark cinematic void: the figure on a black reflective floor ---

    // a cool key light raking across the figure from above-left
    const moonLight = new THREE.DirectionalLight(0xcfd8ff, 1.6);
    moonLight.position.set(-9, 11, -10);
    scene.add(moonLight);

    // metallic human figure: free male human base mesh (T-pose, CC0, from
    // BoQsc/Godot-3D-Male-Base-Mesh) rendered as a solid polished-chrome body
    // that reflects the environment. Grouped for the slow turntable rotation.
    let figure: THREE.Group | null = null;
    const metalMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0x1a1e26), // dark steel — reflections sculpt the form
      metalness: 1.0,
      roughness: 0.18, // wet, glossy
      envMapIntensity: 1.7, // rich reflections read the body's shape (no outline needed)
      clearcoat: 1.0,
      clearcoatRoughness: 0.06,
      // subtle oil-slick iridescence on the dark glossy skin
      iridescence: 0.7,
      iridescenceIOR: 1.3,
      iridescenceThicknessRange: [180, 520],
    });
    // liquid-metal surface: a vertex ripple that flows over the body so the chrome
    // reflections roll and morph like molten metal (vertex-only injection — safe)
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
    // sentient "AGI" rim glow: a thin additive fresnel shell wrapped around the
    // body (separate mesh, so it never touches the body's own shading). It
    // brightens along grazing edges and slowly pulses, like contained energy;
    // the high bloom threshold then haloes this rim into an ethereal aura.
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
    // particle-dissolve cloud (built once the body geometry exists) — the figure
    // disperses into motes and reforms across chapter transitions
    let dissolveUniforms: {
      uDissolve: { value: number };
      uForm: { value: number };
      uTime: { value: number };
      uPosY: { value: number };
      uVis: { value: number };
      uClusters: { value: THREE.Vector3[] };
      uText: { value: number };
      uTextOrigin: { value: THREE.Vector3 };
      uTextRight: { value: THREE.Vector3 };
      uTextUp: { value: THREE.Vector3 };
    } | null = null;
    let dissolveMat: THREE.ShaderMaterial | null = null;
    let dissolveGeo: THREE.BufferGeometry | null = null;
    let figureParticles: THREE.Points | null = null;
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
    new FBXLoader().load("/models/Catwalk Walk Start Turn 180 Right.fbx", (fbx) => {
      if (disposed) return;
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
      if (fbx.animations.length) {
        mixer = new THREE.AnimationMixer(fbx);
        action = mixer.clipAction(fbx.animations[0]);
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
      bloom.setSize(w, h);
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
      const ctr = cubeCenters[cubeIdx];
      if (!ctr) return;
      // always settle directly IN FRONT of the cube (its +z face, square to the
      // screen) for a clean head-on framing — not at an angle from the current side
      focus.pos.set(ctr.x, ctr.y, ctr.z + 16);
      focus.look.copy(ctr);
      focus.active = true;
    };
    releaseFocusRef.current = () => {
      focus.active = false;
    };

    // click a glowing glass cube directly (raycast) → fly to it + open the card,
    // even when its nickname label isn't currently on screen
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
      focusCubeRef.current?.(mem.cube);
      window.setTimeout(() => openMemoryRef.current(mem), 850);
    };
    el.addEventListener("click", onSceneClick);

    // scratch + targets for the closing "point forward" arm pose. Local-space
    // euler targets (radians) the arm bones slerp toward as the walk finishes;
    // live-tweakable via window.__armPose, then baked into ARM_POINT here.
    const eScratch = new THREE.Euler();
    const qScratch = new THREE.Quaternion();
    const ARM_POINT = { arm: [-0.5, -1.45, -1.0], fore: [0, 0, -0.2], hand: [0, 0, 0] };
    // scratch vectors for the camera-aligned project-row cluster column
    const fwd = new THREE.Vector3();
    const right = new THREE.Vector3();
    const upWorld = new THREE.Vector3(0, 1, 0);
    const anchorV = new THREE.Vector3();
    // scratch for mapping a DOM text element's screen rect into a world quad
    const txO = new THREE.Vector3();
    const txR = new THREE.Vector3();
    const txU = new THREE.Vector3();
    const camFwd = new THREE.Vector3();
    let textSection = ""; // which section's text the motes are currently shaped to
    // map a screen pixel onto a FLAT plane `depth` units in front of the camera
    // (constant view-space depth, not constant distance — so a screen rect maps
    // to a quad that projects back exactly onto that rect, no perspective skew)
    const ndcToWorld = (px: number, py: number, depth: number, out: THREE.Vector3) => {
      out.set((px / el.clientWidth) * 2 - 1, -((py / el.clientHeight) * 2 - 1), 0.5);
      out.unproject(camera).sub(camera.position); // ray cam→point
      out.multiplyScalar(depth / out.dot(camFwd)).add(camera.position);
      return out;
    };
    // sample a DOM text element's glyph pixels → list of [u,v] in its own box,
    // then scatter the motes across those points so they condense into the words
    const shapeMotesToText = (elx: HTMLElement) => {
      if (!dissolveGeo) return;
      const cs = getComputedStyle(elx);
      const fontSize = parseFloat(cs.fontSize) || 32;
      const lh = parseFloat(cs.lineHeight) || fontSize * 1.15;
      const wrapW = Math.max(8, elx.clientWidth || elx.getBoundingClientRect().width);
      const meas = document.createElement("canvas").getContext("2d")!;
      const font = `${cs.fontStyle} ${cs.fontWeight} ${fontSize}px ${cs.fontFamily}`;
      meas.font = font;
      const words = (elx.textContent || "").trim().split(/\s+/);
      const lines: string[] = [];
      let line = "";
      for (const w of words) {
        const test = line ? line + " " + w : w;
        if (meas.measureText(test).width > wrapW && line) { lines.push(line); line = w; } else line = test;
      }
      if (line) lines.push(line);
      const SS = 2;
      const Wc = Math.ceil(wrapW) * SS;
      const Hc = Math.max(8, Math.ceil(lines.length * lh)) * SS;
      const cv = document.createElement("canvas");
      cv.width = Wc; cv.height = Hc;
      const ctx = cv.getContext("2d")!;
      ctx.scale(SS, SS);
      ctx.fillStyle = "#fff";
      ctx.font = font;
      // centre each line in its line-box (matches the CSS line-height layout) so
      // the glyph rows line up vertically with the real HTML heading
      ctx.textBaseline = "middle";
      lines.forEach((ln, i) => ctx.fillText(ln, 0, i * lh + lh / 2));
      const data = ctx.getImageData(0, 0, Wc, Hc).data;
      const uvs: number[] = [];
      const step = 3 * SS;
      for (let yy = 0; yy < Hc; yy += step) for (let xx = 0; xx < Wc; xx += step) {
        if (data[(yy * Wc + xx) * 4 + 3] > 100) uvs.push(xx / Wc, 1 - yy / Hc);
      }
      const n = uvs.length / 2;
      if (n < 4) return;
      const attr = dissolveGeo.attributes.aTextUV as THREE.BufferAttribute;
      const arr = attr.array as Float32Array;
      for (let i = 0; i < arr.length / 2; i++) {
        const j = ((Math.random() * n) | 0) * 2;
        arr[i * 2] = uvs[j];
        arr[i * 2 + 1] = uvs[j + 1];
      }
      attr.needsUpdate = true;
    };
    let raf = 0;
    // smoothed scroll progress + horizontal framing (shifts figure off-centre)
    let p = 0;
    let frameX = 0;
    let t = 0; // animation clock for breathing / float
    let introT = 0; // clock for the floor-emergence reveal
    let introDone = false;
    let started = false; // latches true once the user first scrolls down
    const INTRO_DUR = 4.2;
    const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);
    const sm = { x: 0, y: 0 }; // inertia-smoothed pointer

    // smoothstep ramp between two scroll points
    const smooth = (a: number, b: number, x: number) => { const tt = clamp01((x - a) / (b - a)); return tt * tt * (3 - 2 * tt); };
    // EVERYTHING IS MADE OF ATOMS. The figure is solid only as it rises (hero)
    // and at the void-awe breather; at every content beat it bursts and its motes
    // flow into that section's text/cards, then gather back. Three beats:
    //   about   ~0.16–0.36   motes form the bio block (right)
    //   works   ~0.50–0.85   motes form the project rows (right)
    //   contact ~0.88–1.00   motes form the contact block (left), holds to the end
    const dissolveAt = (x: number) => clamp01(Math.max(
      smooth(0.16, 0.22, x) - smooth(0.32, 0.38, x), // about
      smooth(0.5, 0.585, x) - smooth(0.85, 0.92, x), // works
      smooth(0.88, 0.93, x), // contact (stays dispersed → atoms hold the contact block)
    ));
    // motes condense into the section's clusters (starts almost with the dissolve
    // so they head for the layout rather than drifting nowhere)
    const formAt = (x: number) => Math.max(
      smooth(0.185, 0.27, x) * (1 - smooth(0.31, 0.37, x)), // about
      smooth(0.52, 0.63, x) * (1 - smooth(0.83, 0.89, x)), // works
      smooth(0.9, 0.96, x), // contact
    );
    // the HTML resolves out of the formed clusters; motes fade once it has
    const htmlAt = (x: number) => Math.max(
      smooth(0.24, 0.3, x) * (1 - smooth(0.33, 0.38, x)), // about
      smooth(0.67, 0.75, x) * (1 - smooth(0.8, 0.86, x)), // works — let the glyph-motes linger before the crisp text takes over
      smooth(0.93, 0.98, x), // contact
    );
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

    // card-free kinetic typography: scrub each child line in with a staggered
    // mask-reveal + rise, then slide it up and out — driven by scroll, no panel.
    const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
    const revealSection = (ref: HTMLDivElement | null, inP: number, outP: number) => {
      if (!ref) return;
      ref.style.opacity = "1";
      const lines = ref.children;
      for (let i = 0; i < lines.length; i++) {
        const elc = lines[i] as HTMLElement;
        const ein = ease((inP - i * 0.13) / 0.5); // staggered enter
        const xout = ease((outP - i * 0.04) / 0.7); // exit, near-together
        const y = (1 - ein) * 38 - xout * 64; // rise in → slide up out
        elc.style.opacity = String(ein * (1 - xout));
        elc.style.transform = `translate3d(0, ${y}px, 0)`;
        elc.style.clipPath = `inset(${(1 - ein) * 100}% 0 -25% 0)`;
        elc.style.willChange = "transform, opacity";
      }
      ref.style.pointerEvents = inP > 0.6 && outP < 0.4 ? "auto" : "none";
    };

    const tick = () => {
      t += 0.016;
      if (figure) {
        if (!started) started = true;
        if (started && introT < INTRO_DUR) introT += 0.016;
        const it = clamp01(introT / INTRO_DUR); // 0..1 intro progress

        // figure fades + settles up into view on load
        const showE = smooth(0.05, 0.7, it);
        figure.visible = it > 0.02;
        const grow = 0.9 + 0.1 * showE;

        // the catwalk animation drives the body; here we only reveal it (grow +
        // a small settle) — no manual idle (the clip is the life)
        figure.scale.setScalar(grow);
        figure.position.set(0, (1 - showE) * -0.4, 0);
      }
      glowUniforms.uTime.value = t; // drive the sentient rim-glow pulse
      if (bodyTime) bodyTime.value = t; // flow the liquid-metal surface ripple
      stars.rotation.y += 0.0003;

      // scroll progress (eased)
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const target = max > 0 ? clamp01(window.scrollY / max) : 0;
      // advance toward the scroll target at a CAPPED, uniform pace: no matter how
      // fast the user flings the scroll, the scene only ever glides forward at
      // this max speed (it eases as it nears the target so it still settles).
      p += Math.max(-0.0065, Math.min(0.0065, (target - p) * 0.18));

      // scrub the walk-and-turn clip by scroll: clip time = scroll position, eased
      // so it glides instead of snapping. lock the hips' XZ so the body walks +
      // turns in place rather than striding off-screen (root-motion strip).
      // scrub the walk-and-turn clip by scroll: clip time = scroll position,
      // eased so it glides instead of snapping. lock the hips' XZ so the body
      // walks + turns in place rather than striding off-screen (root-motion strip)
      if (mixer && action && clipDur > 0) {
        // the walk + 180° turn completes by p≈0.6, then holds — the rest of the
        // scroll is camera-only (swing to the ear, point, dive into the moment)
        const targetTime = clamp01(p / 0.6) * clipDur;
        animTime += (targetTime - animTime) * 0.12;
        action.time = animTime;
        mixer.update(0);
        if (hipsBone && hip0) {
          hipsBone.position.x = hip0.x;
          hipsBone.position.z = hip0.z;
        }
        // raise the right arm + point forward as the walk finishes — blended
        // over the clip pose for the arm chain only (slerp by pointF). Read
        // live-tweak values from window.__armPose while dialling in the pose.
        // the arm rises in lock-step with the camera move: it starts lifting the
        // moment the walk ends (~0.6, camera-only begins) and is fully pointing
        // by the time the camera settles behind the ear (~0.82)
        const pointF = smooth(0.6, 0.72, p);
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

      // evolving environment: one continuous mood that breathes with the journey
      const m = sampleMood(p);
      const sMat = stars.material as THREE.PointsMaterial;
      sMat.opacity = m.star;
      sMat.size = 0.07 + m.star * 0.075; // stars swell open in the awe void (round sprites read softer, so a touch larger)
      bloom.strength = m.bloom;
      lensPass.uniforms.uVignette.value = m.vig;
      renderer.toneMappingExposure = m.exp;

      const c = sampleCam(p);
      // inertia on the pointer so parallax glides instead of snapping
      sm.x += (mouse.x - sm.x) * 0.05;
      sm.y += (mouse.y - sm.y) * 0.05;
      const px = sm.x * 0.4;
      const py = -sm.y * 0.3;
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
      // the dive IS the travel: scrolling flies the camera deep along its gaze,
      // through the static lattice + memory boxes. Stop scrolling → stop moving.
      const dive = smooth(0.72, 1.0, p);
      if (dive > 0.001) camera.translateZ(-dive * 100.0); // longer flight through the extended room

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
      // then the dive carries us into it
      gridUniforms.uReveal.value = smooth(0.6, 0.8, p);

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

      const centers = cubeCentersRef.current;
      if (reveal > 0.01 && centers.length) {
        const mems = memoriesRef.current;
        for (let i = 0; i < mems.length; i++) {
          const mem = mems[i];
          const elx = labelEls.current.get(mem.id);
          if (!elx) continue;
          const center = centers[mem.cube];
          if (!center) { elx.style.opacity = "0"; continue; }
          const dist = camera.position.distanceTo(center);
          labelV.copy(center).project(camera);
          const inFront = labelV.z < 1;
          // nickname reveals only on PROXIMITY — it fades in as the camera flies
          // near a cube (peak ~16-34 units) and fades out far + when too close,
          // so the lattice stays clean and the glass cube is the at-a-glance cue
          const prox = (1 - smooth(34, 60, dist)) * smooth(10, 16, dist);
          const op = inFront ? reveal * prox : 0;
          if (op < 0.015) {
            elx.style.opacity = "0";
            elx.style.pointerEvents = "none";
            continue;
          }
          const sx = (labelV.x * 0.5 + 0.5) * stageW;
          const sy = (-labelV.y * 0.5 + 0.5) * stageH;
          elx.style.transform = `translate(-50%,-50%) translate(${sx.toFixed(1)}px,${sy.toFixed(1)}px)`;
          elx.style.opacity = op.toFixed(2);
          elx.style.pointerEvents = op > 0.45 ? "auto" : "none";
        }
      } else {
        labelEls.current.forEach((elx) => { elx.style.opacity = "0"; elx.style.pointerEvents = "none"; });
      }

      // keep the figure in focus; everything else softly blurs
      const focusDist = camera.position.distanceTo(tmp.set(0, c.ly, 0));
      (bokeh.uniforms as Record<string, { value: number }>).focus.value = focusDist;

      // 3D-anchored text: each chapter block drifts with the camera azimuth +
      // pointer and scales with distance, so it reads as pinned beside the figure
      // (thRest/rRest = the camera angle/radius at that chapter's hold)
      // hero greeting: full at rest, drifts up + away as the scroll/walk begins
      setOverlay(hintRef.current, clamp01(1 - p / 0.12), 0, -40);

      // chapter sections (about/journey/works/contact) are deferred for now —
      // re-enable by wiring their reveals back to scroll beats once they return.

      composer.render();
      raf = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMouse);
      el.removeEventListener("click", onSceneClick);
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
      {/* scroll runway — scrubs the figure's walk-and-turn clip; the stage below
          is fixed/pinned so the scene holds while the body animates with scroll */}
      <div style={{ height: "520vh" }} aria-hidden />

      {/* fixed cinematic stage — colour (iridescent figure reads in full colour) */}
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

        {/* hero: the opening greeting on the blank void — bold welcome + faint
            scroll prompt; drifts away as the figure rises on first scroll */}
        <div ref={hintRef} className="pointer-events-none absolute inset-0 flex flex-col items-start justify-center px-8 text-left will-change-transform sm:px-20" style={{ opacity: 1 }}>
          <h1 className="text-grad max-w-2xl font-display text-5xl font-extrabold leading-[1.02] tracking-tight [filter:drop-shadow(0_6px_34px_rgba(0,0,0,0.85))] sm:text-7xl">
            {t(content.hero.greeting)} Zolboo<span className="text-accent text-glow">.</span>
          </h1>
          <p className="mt-5 max-w-md font-display text-lg font-semibold text-ink/85 [text-shadow:0_2px_22px_rgba(0,0,0,0.9)] sm:text-2xl">
            {t(content.hero.welcome)}
          </p>
        </div>

        {/* chapter: about — card-free kinetic type, right column */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-end px-6 sm:px-20">
          <div ref={aboutWrapRef} className="max-w-md will-change-transform">
          <div ref={aboutRef} className="text-left [text-shadow:0_2px_26px_rgba(0,0,0,0.9)]" style={{ opacity: 0 }}>
            <PanelEyebrow>{t(content.about.label)}</PanelEyebrow>
            <p className="font-display text-xl font-semibold leading-snug tracking-tight text-ink sm:text-2xl">{t(content.about.body)}</p>
            <div className="mt-7 font-mono text-xs text-muted">{t(content.about.edu)}</div>
            <div className="mt-1 font-mono text-xs text-accent/80">{t(content.about.now)}</div>
          </div>
          </div>
        </div>

        {/* chapter: journey — compact timeline of milestones, left column (figure
            walks to the right) — the walk reads as moving forward through time */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-start px-6 text-left sm:px-20">
          <div ref={journeyWrapRef} className="max-w-md will-change-transform">
          <div ref={journeyRef} className="[text-shadow:0_2px_26px_rgba(0,0,0,0.9)]" style={{ opacity: 0 }}>
            <PanelEyebrow>{t(content.journey.label)}</PanelEyebrow>
            <h2 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">{t(content.journey.heading)}</h2>
            <div className="mt-6 space-y-3 border-l border-white/12 pl-5">
              {content.journey.items.filter((it) => "highlight" in it && it.highlight).map((it) => (
                <div key={it.year} className="relative">
                  <span className="absolute -left-[23px] top-1.5 h-1.5 w-1.5 rounded-full bg-accent" />
                  <div className="font-mono text-[10px] uppercase tracking-wider text-accent/80">{it.year}</div>
                  <div className="font-display text-base font-semibold tracking-tight text-ink">{t(it.title)}</div>
                  <div className="text-sm text-muted">{t(it.desc)}</div>
                </div>
              ))}
            </div>
          </div>
          </div>
        </div>

        {/* chapter: works — card-free; rows fly in and assemble, right column */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-end px-6 sm:px-20">
          <div ref={worksWrapRef} className="w-full max-w-md will-change-transform">
          <div ref={worksRef} className="w-full [text-shadow:0_2px_22px_rgba(0,0,0,0.85)]" style={{ opacity: 0 }}>
            <PanelEyebrow>{t(content.projects.label)}</PanelEyebrow>
            <h2 ref={worksHeadingRef} className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">{t(content.projects.heading)}</h2>
            <div className="mt-5 border-t border-white/10">
              {content.projects.items.map((p, i) => (
                <button
                  key={p.id}
                  ref={(el) => {
                    worksItemRefs.current[i] = el;
                  }}
                  onClick={() => setSelected(p.id)}
                  className="group flex w-full items-center gap-4 border-b border-line py-3 text-left transition-colors will-change-transform hover:bg-accent/[0.04]"
                  style={{ opacity: 0 }}
                >
                  <span className="font-mono text-[10px] text-muted/60">{String(i + 1).padStart(2, "0")}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-lg font-bold tracking-tight text-ink transition-colors group-hover:text-accent">
                      {t(p.title)}
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
                      {t(p.category)} · {p.year}
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-xs text-muted transition-all group-hover:translate-x-0.5 group-hover:text-accent">↗</span>
                </button>
              ))}
            </div>
          </div>
          </div>
        </div>

        {/* chapter: contact — card-free oversized kinetic headline, left column */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-start px-6 text-left sm:px-20">
          <div ref={contactWrapRef} className="max-w-xl will-change-transform">
          <div ref={contactRef} className="[text-shadow:0_2px_30px_rgba(0,0,0,0.9)]" style={{ opacity: 0 }}>
            <PanelEyebrow>{t(content.contact.label)}</PanelEyebrow>
            <h2 ref={contactHeadingRef} className="font-display text-5xl font-extrabold leading-[0.95] tracking-[-0.02em] text-grad sm:text-7xl">{t(content.contact.heading)}</h2>
            <p className="mt-5 max-w-sm text-muted">{t(content.contact.sub)}</p>
            <div className="mt-7 space-y-2 font-mono text-sm">
              <a href={`mailto:${content.contact.email}`} className="block w-fit text-ink transition-colors hover:text-accent">{content.contact.email}</a>
              <a href={`tel:${content.contact.phoneRaw}`} className="block w-fit text-ink transition-colors hover:text-accent">{content.contact.phone}</a>
              <div className="text-muted">{t(content.contact.location)}</div>
            </div>
          </div>
          </div>
        </div>

        {/* project detail panel */}
        {selected && <DetailPanel id={selected} onClose={() => setSelected(null)} />}

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
                focusCubeRef.current?.(mem.cube); // fly the camera in to the cube
                window.setTimeout(() => setOpenMemory(mem), 850); // card after it arrives
              }}
              style={{ position: "absolute", top: 0, left: 0, opacity: 0 }}
              className="whitespace-nowrap font-mono text-xs tracking-[0.18em] text-accent text-glow transition-colors hover:text-ink"
            >
              {mem.nickname}
            </button>
          ))}
        </div>

        {/* leave-a-memory trigger */}
        <button
          onClick={() => setFormOpen(true)}
          className="pointer-events-auto absolute bottom-7 left-1/2 z-20 -translate-x-1/2 rounded-full border border-accent/30 bg-surface/60 px-5 py-2.5 font-mono text-xs uppercase tracking-[0.18em] text-accent backdrop-blur transition-colors hover:bg-accent/10"
        >
          ✦ {t(content.memories.cta)}
        </button>

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

function LangToggle() {
  const { lang, toggle } = useLang();
  return (
    <button onClick={toggle} aria-label="Toggle language" className="pointer-events-auto flex items-center gap-1 rounded-full border border-line bg-surface/70 px-1 py-1 font-mono text-xs backdrop-blur">
      <span className={`rounded-full px-2.5 py-1 ${lang === "mn" ? "bg-accent text-bg" : "text-muted"}`}>MN</span>
      <span className={`rounded-full px-2.5 py-1 ${lang === "en" ? "bg-accent text-bg" : "text-muted"}`}>EN</span>
    </button>
  );
}

function DetailPanel({ id, onClose }: { id: string; onClose: () => void }) {
  const { t } = useLang();
  const p = content.projects.items.find((x) => x.id === id);
  if (!p) return null;
  return (
    <div className="pointer-events-auto absolute inset-y-0 right-0 z-30 flex w-full max-w-md flex-col justify-center border-l border-line bg-bg/90 p-8 backdrop-blur-xl sm:p-12">
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
    <div className="mb-5 flex items-center gap-3">
      <span className="h-px w-8 bg-gradient-to-r from-ink/70 to-transparent" />
      <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-muted">{children}</span>
    </div>
  );
}

function WorldFallback() {
  const { t } = useLang();
  return (
    <div className="mx-auto max-w-2xl px-6 py-20" style={{ filter: "grayscale(1)" }}>
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
