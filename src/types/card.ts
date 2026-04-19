export type Category = "word" | "expression" | "sentence" | "unknown";

export interface Card {
  id?: number;
  lang_src: string;
  lang_dest: string;
  text_src: string;
  text_dest: string;
  category: Category;
  alts: string[]; // alternative accepted answers (for text_dest)
  // SRS
  ease: number; // default 2.5
  interval: number; // days
  repetitions: number;
  due_at: number; // ms epoch
  last_reviewed_at: number | null;
  lapses: number;
  created_at: number;
}

export interface ReviewLog {
  id?: number;
  card_id: number;
  reviewed_at: number;
  quality: 0 | 3 | 4 | 5;
  prev_interval: number;
  new_interval: number;
  mode: "flashcard" | "typing" | "mcq";
  correct: boolean;
}

export interface Settings {
  id: "singleton";
  daily_new_limit: number;
  daily_review_limit: number;
  direction: "src_to_dest" | "dest_to_src" | "both";
  mode_mix: { flashcard: boolean; typing: boolean; mcq: boolean };
  category_filter: Category[] | null;
  lang_pair_filter: { src: string; dest: string } | null;
}
