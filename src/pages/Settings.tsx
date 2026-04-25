import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { db, getSettings, updateSettings } from "@/lib/db";
import { exportToXlsx } from "@/lib/xlsx";
import { newCardSRS } from "@/lib/srs";
import type { Category, Settings } from "@/types/card";
import { toast } from "sonner";
import { Download, RotateCcw, Trash2 } from "lucide-react";

type Pair = { src: string; dest: string; count: number };

const CATEGORY_OPTIONS: { value: "random" | Category; label: string }[] = [
  { value: "random", label: "Random" },
  { value: "word", label: "Seulement mots" },
  { value: "expression", label: "Seulement expressions" },
  { value: "sentence", label: "Seulement phrases" },
];

export default function SettingsPage() {
  const [s, setS] = useState<Settings | null>(null);
  const [pairs, setPairs] = useState<Pair[]>([]);

  useEffect(() => {
    getSettings().then(setS);
    (async () => {
      const all = await db.cards.toArray();
      const map = new Map<string, Pair>();
      for (const c of all) {
        const k = `${c.lang_src}→${c.lang_dest}`;
        const cur = map.get(k);
        if (cur) cur.count++;
        else map.set(k, { src: c.lang_src, dest: c.lang_dest, count: 1 });
      }
      setPairs([...map.values()].sort((a, b) => b.count - a.count));
    })();
  }, []);

  async function patch(p: Partial<Settings>) {
    if (!s) return;
    const next = { ...s, ...p };
    setS(next);
    await updateSettings(p);
  }

  async function doExport() {
    const blob = await exportToXlsx();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "lexio-export.xlsx";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Export téléchargé");
  }

  async function resetSRS() {
    if (!confirm("Réinitialiser la progression de toutes les cartes ?")) return;
    const all = await db.cards.toArray();
    await db.transaction("rw", db.cards, async () => {
      for (const c of all) await db.cards.update(c.id!, newCardSRS());
    });
    await db.reviews.clear();
    toast.success("Progression réinitialisée");
  }

  async function deleteAll() {
    if (!confirm("Supprimer toutes les cartes ? Cette action est irréversible.")) return;
    await db.cards.clear();
    await db.reviews.clear();
    toast.success("Toutes les cartes supprimées");
  }

  if (!s) return null;

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Réglages</h1>
      </header>

      <Card className="shadow-card"><CardContent className="p-4 sm:p-6 space-y-4">
        <h2 className="font-semibold">Session</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-sm">Nouvelles cartes / jour</Label>
            <Input type="number" min={0} value={s.daily_new_limit}
              onChange={(e) => patch({ daily_new_limit: Number(e.target.value) })} />
          </div>
          <div>
            <Label className="text-sm">Révisions max / session</Label>
            <Input type="number" min={1} value={s.daily_review_limit}
              onChange={(e) => patch({ daily_review_limit: Number(e.target.value) })} />
          </div>
        </div>
        <div>
          <Label className="text-sm">Direction</Label>
          <Select value={s.direction} onValueChange={(v) => patch({ direction: v as Settings["direction"] })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="src_to_dest">Source → Cible</SelectItem>
              <SelectItem value="dest_to_src">Cible → Source</SelectItem>
              <SelectItem value="both">Les deux (aléatoire)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-sm">Type de cartes</Label>
          <Select
            value={s.category_filter?.[0] ?? "random"}
            onValueChange={(v) => {
              if (v === "random") patch({ category_filter: null });
              else patch({ category_filter: [v as Category] });
            }}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-sm">Modes d'exercice</Label>
          {(["flashcard", "typing", "mcq"] as const).map((m) => (
            <div key={m} className="flex items-center justify-between rounded-md border p-2">
              <span className="text-sm capitalize">{m === "mcq" ? "Choix multiple" : m === "typing" ? "Saisie" : "Carte"}</span>
              <Switch
                checked={s.mode_mix[m]}
                onCheckedChange={(v) => patch({ mode_mix: { ...s.mode_mix, [m]: v } })}
              />
            </div>
          ))}
        </div>
        <div>
          <Label className="text-sm">Langues à réviser</Label>
          <Select
            value={s.lang_pair_filter ? `${s.lang_pair_filter.src}→${s.lang_pair_filter.dest}` : "all"}
            onValueChange={(v) => {
              if (v === "all") patch({ lang_pair_filter: null });
              else {
                const [src, dest] = v.split("→");
                patch({ lang_pair_filter: { src, dest } });
              }
            }}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les langues</SelectItem>
              {pairs.map((p) => (
                <SelectItem key={`${p.src}→${p.dest}`} value={`${p.src}→${p.dest}`}>
                  {p.src} → {p.dest} ({p.count})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">
            Combiné avec « Direction », vous pouvez aussi être interrogé dans le sens inverse.
          </p>
        </div>
      </CardContent></Card>

      <Card className="shadow-card"><CardContent className="p-4 sm:p-6 space-y-3">
        <h2 className="font-semibold">Données</h2>
        <div className="grid sm:grid-cols-3 gap-2">
          <Button variant="outline" onClick={doExport}><Download className="h-4 w-4" /> Exporter</Button>
          <Button variant="outline" onClick={resetSRS}><RotateCcw className="h-4 w-4" /> Réinit. SRS</Button>
          <Button variant="destructive" onClick={deleteAll}><Trash2 className="h-4 w-4" /> Tout supprimer</Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Vos cartes sont stockées localement dans votre navigateur. Aucun compte requis.
        </p>
      </CardContent></Card>
    </div>
  );
}
