import { useState } from "react";
import type { Card } from "@/types/card";
import { Card as UICard, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Volume2 } from "lucide-react";
import { RatingButtons } from "./RatingButtons";
import type { Quality } from "@/lib/srs";

interface Props {
  card: Card;
  direction: "src_to_dest" | "dest_to_src";
  onAnswer: (q: Quality, correct: boolean) => void;
}

function speak(text: string, lang: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  window.speechSynthesis.speak(u);
}

export function Flashcard({ card, direction, onAnswer }: Props) {
  const [revealed, setRevealed] = useState(false);
  const prompt = direction === "src_to_dest" ? card.text_src : card.text_dest;
  const answer = direction === "src_to_dest" ? card.text_dest : card.text_src;
  const promptLang = direction === "src_to_dest" ? card.lang_src : card.lang_dest;
  const answerLang = direction === "src_to_dest" ? card.lang_dest : card.lang_src;

  return (
    <div className="space-y-4">
      <UICard className="shadow-elevated">
        <CardContent className="p-6 sm:p-10 min-h-[180px] flex flex-col items-center justify-center text-center gap-3">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{promptLang}</p>
          <p className="text-xl sm:text-2xl font-semibold break-words">{prompt}</p>
          <Button variant="ghost" size="sm" onClick={() => speak(prompt, promptLang)}>
            <Volume2 className="h-4 w-4" />
          </Button>

          {revealed && (
            <>
              <div className="w-full border-t my-2" />
              <p className="text-xs uppercase tracking-wider text-muted-foreground">{answerLang}</p>
              <p className="text-lg sm:text-xl text-primary font-medium break-words">{answer}</p>
              {card.alts.length > 0 && direction === "src_to_dest" && (
                <p className="text-xs text-muted-foreground">aussi: {card.alts.join(" · ")}</p>
              )}
              <Button variant="ghost" size="sm" onClick={() => speak(answer, answerLang)}>
                <Volume2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </CardContent>
      </UICard>

      {!revealed ? (
        <Button className="w-full" onClick={() => setRevealed(true)}>
          Afficher la réponse
        </Button>
      ) : (
        <RatingButtons card={card} onRate={(q) => onAnswer(q, q >= 3)} />
      )}
    </div>
  );
}
