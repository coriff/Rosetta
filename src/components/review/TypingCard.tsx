import { useState } from "react";
import type { Card } from "@/types/card";
import { Card as UICard, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, X } from "lucide-react";
import { answersEqual } from "@/lib/normalize";
import { RatingButtons } from "./RatingButtons";
import type { Quality } from "@/lib/srs";

interface Props {
  card: Card;
  direction: "src_to_dest" | "dest_to_src";
  onAnswer: (q: Quality, correct: boolean) => void;
}

export function TypingCard({ card, direction, onAnswer }: Props) {
  const [value, setValue] = useState("");
  const [checked, setChecked] = useState<null | { ok: boolean }>(null);

  const prompt = direction === "src_to_dest" ? card.text_src : card.text_dest;
  const answer = direction === "src_to_dest" ? card.text_dest : card.text_src;
  const promptLang = direction === "src_to_dest" ? card.lang_src : card.lang_dest;
  const answerLang = direction === "src_to_dest" ? card.lang_dest : card.lang_src;
  const accepted = direction === "src_to_dest" ? [answer, ...card.alts] : [answer];

  function check() {
    const ok = accepted.some((a) => answersEqual(a, value));
    setChecked({ ok });
  }

  return (
    <div className="space-y-4">
      <UICard className="shadow-elevated">
        <CardContent className="p-6 sm:p-8 space-y-4">
          <div className="text-center space-y-1">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{promptLang}</p>
            <p className="text-xl sm:text-2xl font-semibold break-words">{prompt}</p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!checked) check();
            }}
          >
            <Input
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={`Tapez en ${answerLang}…`}
              disabled={!!checked}
              className="text-base"
            />
          </form>

          {checked && (
            <div
              className={`rounded-md p-3 text-sm flex items-start gap-2 ${
                checked.ok ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
              }`}
            >
              {checked.ok ? <Check className="h-4 w-4 mt-0.5" /> : <X className="h-4 w-4 mt-0.5" />}
              <div>
                <p className="font-medium">{checked.ok ? "Correct !" : "Réponse attendue"}</p>
                <p>
                  {answer}
                  {card.alts.length > 0 && direction === "src_to_dest" && (
                    <span className="opacity-70"> · {card.alts.join(" · ")}</span>
                  )}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </UICard>

      {!checked ? (
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => onAnswer(0, false)}>
            Passer
          </Button>
          <Button className="flex-1" onClick={check} disabled={!value.trim()}>
            Vérifier
          </Button>
        </div>
      ) : (
        <RatingButtons onRate={(q) => onAnswer(q, checked.ok)} />
      )}
    </div>
  );
}
