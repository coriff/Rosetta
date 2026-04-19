import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { DAY_MS } from "@/lib/srs";

export default function Stats() {
  const data = useLiveQuery(async () => {
    const reviews = await db.reviews.toArray();
    const cards = await db.cards.toArray();
    const total = reviews.length;
    const correct = reviews.filter((r) => r.correct).length;
    const retention = total ? Math.round((correct / total) * 100) : 0;

    // 7-day forecast
    const now = Date.now();
    const buckets: { day: string; count: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const start = now + i * DAY_MS;
      const end = start + DAY_MS;
      const count = cards.filter((c) => c.due_at >= (i === 0 ? 0 : start) && c.due_at < end).length;
      const d = new Date(start);
      buckets.push({ day: d.toLocaleDateString(undefined, { weekday: "short" }), count });
    }

    return { total, correct, retention, buckets };
  }, [], null);

  if (!data) return null;
  const max = Math.max(1, ...data.buckets.map((b) => b.count));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Statistiques</h1>
      </header>

      <div className="grid grid-cols-3 gap-3">
        <Card className="shadow-card"><CardContent className="p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Révisions</p>
          <p className="text-2xl font-bold">{data.total}</p>
        </CardContent></Card>
        <Card className="shadow-card"><CardContent className="p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Correctes</p>
          <p className="text-2xl font-bold text-success">{data.correct}</p>
        </CardContent></Card>
        <Card className="shadow-card"><CardContent className="p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Rétention</p>
          <p className="text-2xl font-bold text-primary">{data.retention}%</p>
        </CardContent></Card>
      </div>

      <Card className="shadow-card">
        <CardContent className="p-4">
          <p className="font-medium mb-3">Cartes dues sur 7 jours</p>
          <div className="flex items-end gap-2 h-32">
            {data.buckets.map((b, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-primary rounded-t"
                  style={{ height: `${(b.count / max) * 100}%`, minHeight: b.count > 0 ? 4 : 0 }}
                  title={`${b.count}`}
                />
                <span className="text-[10px] text-muted-foreground">{b.day}</span>
                <span className="text-[10px] font-medium">{b.count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
