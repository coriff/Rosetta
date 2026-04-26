import { Button } from "@/components/ui/button";
import type { Quality } from "@/lib/srs";
import { applyReview, DAY_MS } from "@/lib/srs";
import type { Card } from "@/types/card";

interface Props {
  card: Card;
  onRate: (q: Quality) => void;
  disabled?: boolean;
}

function formatDelay(days: number) {
  if (days <= 0) return "aujourd'hui";
  if (days === 1) return "dans 1 jour";
  return `dans ${days} jours`;
}

export function RatingButtons({ card, onRate, disabled }: Props) {
  const now = Date.now();
  const items: { q: Quality; label: string; cls: string }[] = [
    { q: 0, label: "Encore", cls: "bg-rate-again hover:bg-rate-again/90 text-white" },
    { q: 3, label: "Difficile", cls: "bg-rate-hard hover:bg-rate-hard/90 text-white" },
    { q: 4, label: "Bien", cls: "bg-rate-good hover:bg-rate-good/90 text-white" },
    { q: 5, label: "Facile", cls: "bg-rate-easy hover:bg-rate-easy/90 text-white" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {items.map((it) => {
        const preview = applyReview(card, it.q, now);
        const days = Math.max(0, Math.round((preview.due_at - now) / DAY_MS));
        return (
          <Button
            key={it.q}
            disabled={disabled}
            className={`${it.cls} h-auto py-2 flex flex-col items-center`}
            onClick={() => onRate(it.q)}
          >
            <span>{it.label}</span>
            <span className="text-[10px] opacity-90">{formatDelay(days)}</span>
          </Button>
        );
      })}
    </div>
  );
}
