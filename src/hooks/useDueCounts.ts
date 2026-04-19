import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { isDue, isNew } from "@/lib/srs";

export function useDueCounts() {
  return useLiveQuery(async () => {
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
  }, [], { due: 0, new: 0, learning: 0, total: 0 });
}
