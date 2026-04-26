import { useEffect, useState } from "react";
import type { Card } from "@/types/card";
import { Card as UICard, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getMcqDistractors } from "@/lib/sampler";
import { RatingButtons } from "./RatingButtons";
import type { Quality } from "@/lib/srs";
import { cn } from "@/lib/utils";

interface Props {
  card: Card;
  direction: "src_to_dest" | "dest_to_src";
  onAnswer: (q: Quality, correct: boolean) => void;
}

export function MultipleChoiceCard({ card, direction, onAnswer }: Props) {
  const [options, setOptions] = useState<string[] | null>(null);
  const [picked, setPicked] = useState<string | null>(null);

  const prompt = direction === "src_to_dest" ? card.text_src : card.text_dest;
  const correct = direction === "src_to_dest" ? card.text_dest : card.text_src;
  const promptLang = direction === "src_to_dest" ? card.lang_src : card.lang_dest;

  useEffect(() => {
    let alive = true;
    setPicked(null);
    setOptions(null);
    getMcqDistractors(card, direction, 3).then((dist) => {
      if (!alive) return;
      const all = [...dist, correct];
      // shuffle
      for (let i = all.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [all[i], all[j]] = [all[j], all[i]];
      }
      setOptions(all);
    });
    return () => {
      alive = false;
    };
  }, [card.id, direction, correct, card]);

  const isCorrect = picked === correct;

  return (
    <div className="space-y-4">
      <UICard className="shadow-elevated">
        <CardContent className="p-6 sm:p-8 space-y-4">
          <div className="text-center space-y-1">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{promptLang}</p>
            <p className="text-xl sm:text-2xl font-semibold break-words">{prompt}</p>
          </div>
          <div className="grid gap-2">
            {(options ?? []).map((opt) => {
              const isPicked = picked === opt;
              const isAnswer = opt === correct;
              const showState = picked !== null;
              return (
                <button
                  key={opt}
                  disabled={picked !== null}
                  onClick={() => setPicked(opt)}
                  className={cn(
                    "w-full text-left rounded-md border px-4 py-3 text-sm transition-colors",
                    !showState && "hover:bg-accent/10",
                    showState && isAnswer && "bg-success/10 border-success text-success",
                    showState && isPicked && !isAnswer && "bg-destructive/10 border-destructive text-destructive",
                  )}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </CardContent>
      </UICard>

      {picked !== null && (
        <RatingButtons card={card} onRate={(q) => onAnswer(q, isCorrect)} />
      )}
    </div>
  );
}
