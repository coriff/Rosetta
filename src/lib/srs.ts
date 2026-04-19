import type { Card } from "@/types/card";

export type Quality = 0 | 3 | 4 | 5; // Again, Hard, Good, Easy
export const DAY_MS = 24 * 60 * 60 * 1000;

export function newCardSRS(): Pick<Card, "ease" | "interval" | "repetitions" | "due_at" | "last_reviewed_at" | "lapses"> {
  return {
    ease: 2.5,
    interval: 0,
    repetitions: 0,
    due_at: Date.now(), // new cards are due now
    last_reviewed_at: null,
    lapses: 0,
  };
}

export interface SRSUpdate {
  ease: number;
  interval: number;
  repetitions: number;
  due_at: number;
  last_reviewed_at: number;
  lapses: number;
  prev_interval: number;
  new_interval: number;
}

export function applyReview(card: Card, q: Quality, now = Date.now()): SRSUpdate {
  const prev_interval = card.interval;
  let { ease, interval, repetitions, lapses } = card;

  if (q < 3) {
    repetitions = 0;
    interval = 1;
    lapses += 1;
  } else {
    repetitions += 1;
    if (repetitions === 1) interval = 1;
    else if (repetitions === 2) interval = 6;
    else interval = Math.round(prev_interval * ease);
  }

  ease = Math.max(1.3, ease + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));

  return {
    ease,
    interval,
    repetitions,
    lapses,
    due_at: now + interval * DAY_MS,
    last_reviewed_at: now,
    prev_interval,
    new_interval: interval,
  };
}

export function isDue(card: Card, now = Date.now()): boolean {
  return card.due_at <= now;
}

export function isNew(card: Card): boolean {
  return card.repetitions === 0 && card.last_reviewed_at === null;
}
