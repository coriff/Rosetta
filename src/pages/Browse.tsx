import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Pencil, Filter, Plus } from "lucide-react";
import { toast } from "sonner";
import { EditCardDialog } from "@/components/review/EditCardDialog";
import { AddCardDialog } from "@/components/browse/AddCardDialog";
import { isNew, isDue } from "@/lib/srs";
import type { Card as CardType, Category } from "@/types/card";

type Status = "all" | "new" | "due" | "learning" | "mature" | "leech";
type Interval = "all" | "lt7" | "7to21" | "21to60" | "gt60";
type SortKey = "recent" | "due" | "lapses" | "ease" | "alpha";

const PAGE_SIZE = 200;

function statusOf(c: CardType, now: number): Status {
  if (c.lapses >= 5) return "leech";
  if (isNew(c)) return "new";
  if (isDue(c, now)) return "due";
  if (c.repetitions > 0 && c.repetitions < 3) return "learning";
  return "mature";
}

function intervalBucket(days: number): Interval {
  if (days < 7) return "lt7";
  if (days < 21) return "7to21";
  if (days < 60) return "21to60";
  return "gt60";
}

const STATUS_DOT: Record<Exclude<Status, "all">, string> = {
  new: "bg-muted-foreground",
  due: "bg-warning",
  learning: "bg-accent",
  mature: "bg-success",
  leech: "bg-destructive",
};

export default function Browse() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<Status>("all");
  const [category, setCategory] = useState<Category | "all">("all");
  const [pair, setPair] = useState<string>("all");
  const [interval, setInterval] = useState<Interval>("all");
  const [sort, setSort] = useState<SortKey>("recent");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<CardType | null>(null);

  const allCards = useLiveQuery(() => db.cards.toArray(), [], []);

  const langPairs = useMemo(() => {
    const set = new Set<string>();
    (allCards ?? []).forEach((c) => set.add(`${c.lang_src}→${c.lang_dest}`));
    return Array.from(set).sort();
  }, [allCards]);

  const filtered = useMemo(() => {
    if (!allCards) return [];
    const now = Date.now();
    const needle = q.trim().toLowerCase();
    let out = allCards.filter((c) => {
      if (needle) {
        const hit =
          c.text_src.toLowerCase().includes(needle) ||
          c.text_dest.toLowerCase().includes(needle) ||
          c.alts.some((a) => a.toLowerCase().includes(needle));
        if (!hit) return false;
      }
      if (status !== "all" && statusOf(c, now) !== status) return false;
      if (category !== "all" && c.category !== category) return false;
      if (pair !== "all" && `${c.lang_src}→${c.lang_dest}` !== pair) return false;
      if (interval !== "all" && intervalBucket(c.interval) !== interval) return false;
      return true;
    });
    out.sort((a, b) => {
      switch (sort) {
        case "recent": return (b.created_at ?? 0) - (a.created_at ?? 0);
        case "due": return a.due_at - b.due_at;
        case "lapses": return b.lapses - a.lapses;
        case "ease": return a.ease - b.ease;
        case "alpha": return a.text_src.localeCompare(b.text_src);
      }
    });
    return out;
  }, [allCards, q, status, category, pair, interval, sort]);

  const visible = filtered.slice(0, page * PAGE_SIZE);
  const hasMore = filtered.length > visible.length;

  function resetFilters() {
    setQ("");
    setStatus("all");
    setCategory("all");
    setPair("all");
    setInterval("all");
    setPage(1);
  }

  async function remove(id: number) {
    if (!confirm("Supprimer cette carte ?")) return;
    await db.cards.delete(id);
    toast.success("Carte supprimée");
  }

  return (
    <div className="space-y-4">
      <header className="flex items-baseline justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Mes cartes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {filtered.length} / {allCards?.length ?? 0} carte(s)
          </p>
        </div>
        {(status !== "all" || category !== "all" || pair !== "all" || interval !== "all" || q) && (
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            Réinitialiser les filtres
          </Button>
        )}
      </header>

      <Card className="shadow-card">
        <CardContent className="p-3 sm:p-4 space-y-3">
          <Input placeholder="Rechercher…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <Select value={status} onValueChange={(v) => { setStatus(v as Status); setPage(1); }}>
              <SelectTrigger><Filter className="h-3 w-3 mr-1" /><SelectValue placeholder="Statut" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous statuts</SelectItem>
                <SelectItem value="new">Nouvelles</SelectItem>
                <SelectItem value="due">À réviser</SelectItem>
                <SelectItem value="learning">En apprentissage</SelectItem>
                <SelectItem value="mature">Maîtrisées</SelectItem>
                <SelectItem value="leech">Difficiles (leech)</SelectItem>
              </SelectContent>
            </Select>
            <Select value={category} onValueChange={(v) => { setCategory(v as Category | "all"); setPage(1); }}>
              <SelectTrigger><SelectValue placeholder="Catégorie" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes catégories</SelectItem>
                <SelectItem value="word">Mot</SelectItem>
                <SelectItem value="expression">Expression</SelectItem>
                <SelectItem value="sentence">Phrase</SelectItem>
                <SelectItem value="unknown">Inconnue</SelectItem>
              </SelectContent>
            </Select>
            <Select value={pair} onValueChange={(v) => { setPair(v); setPage(1); }}>
              <SelectTrigger><SelectValue placeholder="Langues" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes langues</SelectItem>
                {langPairs.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={interval} onValueChange={(v) => { setInterval(v as Interval); setPage(1); }}>
              <SelectTrigger><SelectValue placeholder="Intervalle" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous intervalles</SelectItem>
                <SelectItem value="lt7">&lt; 7 jours</SelectItem>
                <SelectItem value="7to21">7–21 jours</SelectItem>
                <SelectItem value="21to60">21–60 jours</SelectItem>
                <SelectItem value="gt60">&gt; 60 jours</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
              <SelectTrigger><SelectValue placeholder="Tri" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Plus récentes</SelectItem>
                <SelectItem value="due">Échéance proche</SelectItem>
                <SelectItem value="lapses">Plus d'erreurs</SelectItem>
                <SelectItem value="ease">Plus difficiles</SelectItem>
                <SelectItem value="alpha">Alphabétique</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {visible.map((c) => {
          const st = statusOf(c, Date.now());
          return (
            <Card key={c.id} className="shadow-card">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`h-2 w-2 rounded-full ${STATUS_DOT[st]}`} aria-label={st} />
                      <p className="font-medium truncate">{c.text_src}</p>
                      <span className="text-muted-foreground">→</span>
                      <p className="text-primary truncate">{c.text_dest}</p>
                    </div>
                    {c.alts.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1 ml-4">
                        aussi: {c.alts.join(" · ")}
                      </p>
                    )}
                    <div className="flex items-center gap-1 mt-2 flex-wrap ml-4">
                      <Badge variant="secondary" className="text-[10px]">
                        {c.lang_src}→{c.lang_dest}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">{c.category}</Badge>
                      <span className="text-[10px] text-muted-foreground">
                        rep {c.repetitions} · int {c.interval}j · lapses {c.lapses}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" onClick={() => setEditing(c)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(c.id!)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-10">
            Aucune carte ne correspond aux filtres.
          </p>
        )}

        {hasMore && (
          <div className="flex justify-center pt-2">
            <Button variant="outline" onClick={() => setPage((p) => p + 1)}>
              Afficher plus ({filtered.length - visible.length} restantes)
            </Button>
          </div>
        )}
      </div>

      {editing && (
        <EditCardDialog
          card={editing}
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
        />
      )}
    </div>
  );
}
