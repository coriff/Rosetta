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
import { Loader2, PartyPopper } from "lucide-react";

export default function Review() {
  const [items, setItems] = useState<SessionItem[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [stats, setStats] = useState({ correct: 0, total: 0 });

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
    const pct = stats.total ? Math.round((stats.correct / stats.total) * 100) : 0;
    return (
      <Card className="shadow-card">
        <CardContent className="p-8 text-center space-y-3">
          <PartyPopper className="h-10 w-10 mx-auto text-primary" />
          <h2 className="text-xl font-semibold">Session terminée !</h2>
          <p className="text-sm text-muted-foreground">
            {stats.correct} / {stats.total} ({pct}%)
          </p>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => location.reload()}>Nouvelle session</Button>
            <Button asChild variant="outline">
              <Link to="/">Accueil</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const current = items[idx];

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
    setIdx((i) => i + 1);
  }

  const progress = (idx / items.length) * 100;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {idx + 1} / {items.length} · <span className="capitalize">{current.mode}</span>
        </p>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/">Quitter</Link>
        </Button>
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
    </div>
  );
}
