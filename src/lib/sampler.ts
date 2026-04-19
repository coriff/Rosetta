import type { Card, Settings } from "@/types/card";
import { db } from "./db";
import { isDue, isNew } from "./srs";

export type ExerciseMode = "flashcard" | "typing" | "mcq";

export interface SessionItem {
  card: Card;
  direction: "src_to_dest" | "dest_to_src";
  mode: ExerciseMode;
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function buildSession(settings: Settings, max = 30): Promise<SessionItem[]> {
  let q = db.cards.toCollection();
  let cards = await q.toArray();

  if (settings.category_filter && settings.category_filter.length) {
    const set = new Set(settings.category_filter);
    cards = cards.filter((c) => set.has(c.category));
  }
  if (settings.lang_pair_filter) {
    const { src, dest } = settings.lang_pair_filter;
    cards = cards.filter((c) => c.lang_src === src && c.lang_dest === dest);
  }

  const now = Date.now();
  const due = cards.filter((c) => !isNew(c) && isDue(c, now));
  const fresh = cards.filter((c) => isNew(c)).slice(0, settings.daily_new_limit);

  const pool = shuffle([...due, ...fresh]).slice(0, Math.min(max, settings.daily_review_limit));

  const modes: ExerciseMode[] = [];
  if (settings.mode_mix.flashcard) modes.push("flashcard");
  if (settings.mode_mix.typing) modes.push("typing");
  if (settings.mode_mix.mcq) modes.push("mcq");
  const safeModes = modes.length ? modes : (["flashcard"] as ExerciseMode[]);

  return pool.map((card, i) => {
    let direction: "src_to_dest" | "dest_to_src";
    if (settings.direction === "src_to_dest") direction = "src_to_dest";
    else if (settings.direction === "dest_to_src") direction = "dest_to_src";
    else direction = Math.random() < 0.5 ? "src_to_dest" : "dest_to_src";
    return { card, direction, mode: safeModes[i % safeModes.length] };
  });
}

export async function getMcqDistractors(card: Card, direction: "src_to_dest" | "dest_to_src", n = 3): Promise<string[]> {
  const all = await db.cards
    .where("[lang_src+lang_dest]")
    .equals([card.lang_src, card.lang_dest])
    .toArray();
  const correct = direction === "src_to_dest" ? card.text_dest : card.text_src;
  const pool = all
    .filter((c) => c.id !== card.id)
    .map((c) => (direction === "src_to_dest" ? c.text_dest : c.text_src))
    .filter((t) => t && t !== correct);
  return shuffle(pool).slice(0, n);
}

export async function getDueCounts(): Promise<{ due: number; new: number; learning: number; total: number }> {
  const cards = await db.cards.toArray();
  const now = Date.now();
  let due = 0,
    fresh = 0,
    learning = 0;
  for (const c of cards) {
    if (isNew(c)) fresh++;
    else if (isDue(c, now)) due++;
    else if (c.repetitions > 0 && c.repetitions < 3) learning++;
  }
  return { due, new: fresh, learning, total: cards.length };
}
