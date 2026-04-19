import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";
import type { Card as CardType } from "@/types/card";

export default function Browse() {
  const [q, setQ] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Partial<CardType>>({});
  const [altDraft, setAltDraft] = useState("");

  const cards = useLiveQuery(async () => {
    const all = await db.cards.orderBy("id").reverse().limit(500).toArray();
    if (!q.trim()) return all;
    const needle = q.trim().toLowerCase();
    return all.filter(
      (c) =>
        c.text_src.toLowerCase().includes(needle) ||
        c.text_dest.toLowerCase().includes(needle) ||
        c.alts.some((a) => a.toLowerCase().includes(needle)),
    );
  }, [q], []);

  async function remove(id: number) {
    await db.cards.delete(id);
    toast.success("Carte supprimée");
  }

  function startEdit(c: CardType) {
    setEditingId(c.id!);
    setDraft({ text_src: c.text_src, text_dest: c.text_dest });
    setAltDraft(c.alts.join("; "));
  }

  async function saveEdit(id: number) {
    const alts = altDraft
      .split(/[;|]/)
      .map((s) => s.trim())
      .filter(Boolean);
    await db.cards.update(id, {
      text_src: draft.text_src ?? "",
      text_dest: draft.text_dest ?? "",
      alts,
    });
    setEditingId(null);
    toast.success("Carte mise à jour");
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Mes cartes</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {cards?.length ?? 0} carte(s) {q && "(filtrées)"}
        </p>
      </header>

      <Input placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)} />

      <div className="space-y-2">
        {cards?.map((c) => (
          <Card key={c.id} className="shadow-card">
            <CardContent className="p-3 sm:p-4">
              {editingId === c.id ? (
                <div className="space-y-2">
                  <Input
                    value={draft.text_src ?? ""}
                    onChange={(e) => setDraft({ ...draft, text_src: e.target.value })}
                    placeholder="Source"
                  />
                  <Input
                    value={draft.text_dest ?? ""}
                    onChange={(e) => setDraft({ ...draft, text_dest: e.target.value })}
                    placeholder="Cible"
                  />
                  <Input
                    value={altDraft}
                    onChange={(e) => setAltDraft(e.target.value)}
                    placeholder="Alternatives (séparées par ;)"
                  />
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                    <Button size="sm" onClick={() => saveEdit(c.id!)}>
                      <Check className="h-4 w-4" /> Enregistrer
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium truncate">{c.text_src}</p>
                      <span className="text-muted-foreground">→</span>
                      <p className="text-primary truncate">{c.text_dest}</p>
                    </div>
                    {c.alts.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">{c.alts.join(" · ")}</p>
                    )}
                    <div className="flex items-center gap-1 mt-2 flex-wrap">
                      <Badge variant="secondary" className="text-[10px]">
                        {c.lang_src}→{c.lang_dest}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">{c.category}</Badge>
                      <span className="text-[10px] text-muted-foreground">
                        rep {c.repetitions} · int {c.interval}j
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" onClick={() => startEdit(c)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(c.id!)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {cards && cards.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-10">Aucune carte.</p>
        )}
      </div>
    </div>
  );
}
