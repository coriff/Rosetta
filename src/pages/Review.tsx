import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { buildSession, type SessionItem } from "@/lib/sampler";
import { db, getSettings } from "@/lib/db";
import { applyReview, type Quality } from "@/lib/srs";
import { Flashcard } from "@/components/review/Flashcard";
import { TypingCard } from "@/components/review/TypingCard";
import { MultipleChoiceCard } from "@/components/review/MultipleChoiceCard";
import { EditCardDialog } from "@/components/review/EditCardDialog";
import { SessionRecap, type RecapEntry } from "@/components/review/SessionRecap";
import { Loader2, PartyPopper, Pencil } from "lucide-react";
import type { Card as CardType } from "@/types/card";

export default function Review() {
  const [items, setItems] = useState<SessionItem[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [stats, setStats] = useState({ correct: 0, total: 0 });
  const [recap, setRecap] = useState<RecapEntry[]>([]);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    (async () => {
      const settings = await getSettings();
      const session = await buildSession(settings, 30);
      setItems(session);
    })();
  }, []);

  if (!items) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <Card className="shadow-card">
        <CardContent className="p-8 text-center space-y-3">
          <PartyPopper className="h-10 w-10 mx-auto text-primary" />
          <h2 className="text-xl font-semibold">Aucune carte à réviser</h2>
          <p className="text-sm text-muted-foreground">
            Importez un fichier ou revenez plus tard quand de nouvelles cartes seront dues.
          </p>
          <div className="flex gap-2 justify-center">
            <Button asChild>
              <Link to="/import">Importer</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/">Accueil</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (idx >= items.length) {
    return <SessionRecap entries={recap} stats={stats} onRestart={() => location.reload()} />;
  }

  const current = items[idx];

  function updateCurrentCard(updated: CardType) {
    setItems((prev) =>
      prev
        ? prev.map((it, i) => (i === idx ? { ...it, card: updated } : it))
        : prev,
    );
  }

  async function answer(q: Quality, correct: boolean) {
    const card = current.card;
    const update = applyReview(card, q);
    await db.cards.update(card.id!, {
      ease: update.ease,
      interval: update.interval,
      repetitions: update.repetitions,
      due_at: update.due_at,
      last_reviewed_at: update.last_reviewed_at,
      lapses: update.lapses,
    });
    await db.reviews.add({
      card_id: card.id!,
      reviewed_at: update.last_reviewed_at,
      quality: q,
      prev_interval: update.prev_interval,
      new_interval: update.new_interval,
      mode: current.mode,
      correct,
    });
    setStats((s) => ({ correct: s.correct + (correct ? 1 : 0), total: s.total + 1 }));
    setRecap((r) => [
      ...r,
      {
        cardId: card.id!,
        text_src: card.text_src,
        text_dest: card.text_dest,
        lang_src: card.lang_src,
        lang_dest: card.lang_dest,
        direction: current.direction,
        mode: current.mode,
        correct,
      },
    ]);
    setIdx((i) => i + 1);
  }

  const progress = (idx / items.length) * 100;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {idx + 1} / {items.length} · <span className="capitalize">{current.mode}</span>
        </p>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditing(true)}
            aria-label="Modifier la carte"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/">Quitter</Link>
          </Button>
        </div>
      </div>
      <Progress value={progress} />

      {current.mode === "flashcard" && (
        <Flashcard key={`${current.card.id}-fc`} card={current.card} direction={current.direction} onAnswer={answer} />
      )}
      {current.mode === "typing" && (
        <TypingCard key={`${current.card.id}-tp`} card={current.card} direction={current.direction} onAnswer={answer} />
      )}
      {current.mode === "mcq" && (
        <MultipleChoiceCard
          key={`${current.card.id}-mc`}
          card={current.card}
          direction={current.direction}
          onAnswer={answer}
        />
      )}

      <EditCardDialog
        card={current.card}
        open={editing}
        onOpenChange={setEditing}
        onSaved={updateCurrentCard}
      />
    </div>
  );
}
