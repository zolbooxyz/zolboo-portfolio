import { supabase } from "./supabase";

// A visitor memory. NOTE: `phone` is intentionally NOT part of this type — it is
// collected on submit and stored, but never read back to the client (the public
// Supabase view / localStorage payload omit it for privacy).
export type Memory = {
  id: string;
  nickname: string;
  comment: string;
  cube: number; // index into the lattice's cube list → stable, shared placement
  createdAt: string;
};

export type MemoryInput = { nickname: string; phone: string; comment: string; cube: number };

const LS_KEY = "zolboo_memories";

type Row = { id: string; nickname: string; comment: string; cube: number; created_at: string };
const fromRow = (r: Row): Memory => ({
  id: r.id,
  nickname: r.nickname,
  comment: r.comment,
  cube: r.cube,
  createdAt: r.created_at,
});

function readLocal(): Memory[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "[]") as Memory[];
  } catch {
    return [];
  }
}

/** All memories, oldest → newest. Phone is never included. */
export async function fetchMemories(): Promise<Memory[]> {
  if (supabase) {
    const { data, error } = await supabase
      .from("memories_public")
      .select("id, nickname, comment, cube, created_at")
      .order("created_at", { ascending: true });
    if (error) {
      console.error("[memories] fetch failed:", error.message);
      return [];
    }
    return (data as Row[]).map(fromRow);
  }
  return readLocal();
}

/** Insert a memory. On Supabase this goes through a security-definer RPC so the
 *  client never touches the base table (keeping `phone` write-only). */
export async function addMemory(input: MemoryInput): Promise<Memory | null> {
  if (supabase) {
    const { data, error } = await supabase.rpc("add_memory", {
      p_nickname: input.nickname,
      p_phone: input.phone,
      p_comment: input.comment,
      p_cube: input.cube,
    });
    if (error) {
      console.error("[memories] insert failed:", error.message);
      return null;
    }
    const r = (Array.isArray(data) ? data[0] : data) as Row | undefined;
    return r ? fromRow(r) : null;
  }
  // localStorage fallback (phone is simply dropped — never persisted locally)
  const mem: Memory = {
    id: crypto.randomUUID(),
    nickname: input.nickname,
    comment: input.comment,
    cube: input.cube,
    createdAt: new Date().toISOString(),
  };
  const all = readLocal();
  all.push(mem);
  localStorage.setItem(LS_KEY, JSON.stringify(all));
  return mem;
}

/** Pick a random cube index that isn't taken yet; if the lattice is full, reuse
 *  a random cell so submissions never get rejected. */
export function pickFreeCube(total: number, occupied: number[]): number {
  if (total <= 0) return 0;
  const taken = new Set(occupied);
  const free: number[] = [];
  for (let i = 0; i < total; i++) if (!taken.has(i)) free.push(i);
  const pool = free.length > 0 ? free : Array.from({ length: total }, (_, i) => i);
  return pool[Math.floor(Math.random() * pool.length)];
}
