import Dexie, { type Table } from "dexie";
import type { Card, ReviewLog, Settings } from "@/types/card";

export class TrainerDB extends Dexie {
  cards!: Table<Card, number>;
  reviews!: Table<ReviewLog, number>;
  settings!: Table<Settings, string>;

  constructor() {
    super("english-trainer");
    this.version(1).stores({
      cards: "++id, lang_src, lang_dest, category, due_at, [lang_src+lang_dest], [text_src+text_dest]",
      reviews: "++id, card_id, reviewed_at",
      settings: "id",
    });
  }
}

export const db = new TrainerDB();

export const DEFAULT_SETTINGS: Settings = {
  id: "singleton",
  daily_new_limit: 20,
  daily_review_limit: 200,
  direction: "both",
  mode_mix: { flashcard: true, typing: true, mcq: true },
  category_filter: null,
  lang_pair_filter: null,
};

export async function getSettings(): Promise<Settings> {
  const s = await db.settings.get("singleton");
  if (!s) {
    await db.settings.put(DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  }
  return s;
}

export async function updateSettings(patch: Partial<Settings>) {
  const cur = await getSettings();
  await db.settings.put({ ...cur, ...patch, id: "singleton" });
}
