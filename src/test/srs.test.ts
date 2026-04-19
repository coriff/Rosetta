import { describe, it, expect } from "vitest";
import { applyReview, newCardSRS, DAY_MS } from "@/lib/srs";
import type { Card } from "@/types/card";

function makeCard(over: Partial<Card> = {}): Card {
  return {
    lang_src: "fr",
    lang_dest: "en",
    text_src: "chat",
    text_dest: "cat",
    category: "word",
    alts: [],
    ...newCardSRS(),
    created_at: 0,
    ...over,
  };
}

describe("SM-2", () => {
  it("Good on new card -> 1d interval, repetitions=1", () => {
    const c = makeCard();
    const u = applyReview(c, 4, 1000);
    expect(u.repetitions).toBe(1);
    expect(u.new_interval).toBe(1);
    expect(u.due_at).toBe(1000 + DAY_MS);
  });

  it("Second Good -> 6 days", () => {
    const c = makeCard({ repetitions: 1, interval: 1 });
    const u = applyReview(c, 4, 0);
    expect(u.new_interval).toBe(6);
  });

  it("Again resets repetitions and increments lapses", () => {
    const c = makeCard({ repetitions: 5, interval: 30, lapses: 0 });
    const u = applyReview(c, 0, 0);
    expect(u.repetitions).toBe(0);
    expect(u.new_interval).toBe(1);
    expect(u.lapses).toBe(1);
  });

  it("Ease never below 1.3", () => {
    let c = makeCard();
    for (let i = 0; i < 20; i++) {
      const u = applyReview(c, 0);
      c = { ...c, ...u };
    }
    expect(c.ease).toBeGreaterThanOrEqual(1.3);
  });
});
