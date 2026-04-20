import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EditCardDialog } from "./EditCardDialog";
import { db } from "@/lib/db";
import { Pencil, PartyPopper, Check, X } from "lucide-react";
import type { Card as CardType } from "@/types/card";

export interface RecapEntry {
  cardId: number;
  text_src: string;
  text_dest: string;
  lang_src: string;
  lang_dest: string;
  direction: "src_to_dest" | "dest_to_src";
  mode: "flashcard" | "typing" | "mcq";
  correct: boolean;
}

interface Props {
  entries: RecapEntry[];
  stats: { correct: number; total: number };
  onRestart: () => void;
}

export function SessionRecap({ entries, stats, onRestart }: Props) {
  const [editingCard, setEditingCard] = useState<CardType | null>(null);
  const pct = stats.total ? Math.round((stats.correct / stats.total) * 100) : 0;

  async function openEdit(cardId: number) {
    const c = await db.cards.get(cardId);
    if (c) setEditingCard(c);
  }

  return (
    <div className="space-y-4">
      <Card className="shadow-elevated">
        <CardContent className="p-6 sm:p-8 text-center space-y-3">
          <PartyPopper className="h-10 w-10 mx-auto text-primary" />
          <h2 className="text-2xl font-semibold">Session terminée !</h2>
          <p className="text-muted-foreground">
            <span className="text-foreground font-semibold text-lg">
              {stats.correct} / {stats.total}
            </span>{" "}
            ({pct}%)
          </p>
          <div className="flex gap-2 justify-center pt-2">
            <Button onClick={onRestart}>Nouvelle session</Button>
            <Button asChild variant="outline">
              <Link to="/">Accueil</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
          Récapitulatif ({entries.length})
        </h3>
        <div className="space-y-1.5">
          {entries.map((e, i) => (
            <Card
              key={i}
              className={`shadow-card border-l-4 ${
                e.correct
                  ? "bg-success/5 border-l-success"
                  : "bg-destructive/5 border-l-destructive"
              }`}
            >
              <CardContent className="p-2.5 sm:p-3 flex items-center gap-2">
                {e.correct ? (
                  <Check className="h-4 w-4 text-success shrink-0" />
                ) : (
                  <X className="h-4 w-4 text-destructive shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap text-sm">
                    <span className="font-medium truncate">
                      {e.direction === "src_to_dest" ? e.text_src : e.text_dest}
                    </span>
                    <span className="text-muted-foreground">→</span>
                    <span className="text-primary truncate">
                      {e.direction === "src_to_dest" ? e.text_dest : e.text_src}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[10px] mt-0.5">
                    {e.mode}
                  </Badge>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 shrink-0"
                  onClick={() => openEdit(e.cardId)}
                  aria-label="Modifier"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {editingCard && (
        <EditCardDialog
          card={editingCard}
          open={!!editingCard}
          onOpenChange={(o) => !o && setEditingCard(null)}
        />
      )}
    </div>
  );
}
