import { Button } from "@/components/ui/button";
import type { Quality } from "@/lib/srs";

interface Props {
  onRate: (q: Quality) => void;
  disabled?: boolean;
}

export function RatingButtons({ onRate, disabled }: Props) {
  const items: { q: Quality; label: string; cls: string }[] = [
    { q: 0, label: "Encore", cls: "bg-rate-again hover:bg-rate-again/90 text-white" },
    { q: 3, label: "Difficile", cls: "bg-rate-hard hover:bg-rate-hard/90 text-white" },
    { q: 4, label: "Bien", cls: "bg-rate-good hover:bg-rate-good/90 text-white" },
    { q: 5, label: "Facile", cls: "bg-rate-easy hover:bg-rate-easy/90 text-white" },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {items.map((it) => (
        <Button key={it.q} disabled={disabled} className={it.cls} onClick={() => onRate(it.q)}>
          {it.label}
        </Button>
      ))}
    </div>
  );
}
