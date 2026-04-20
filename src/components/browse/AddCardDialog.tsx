import { useEffect, useState } from "react";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { db } from "@/lib/db";
import { newCardSRS } from "@/lib/srs";
import { toast } from "sonner";
import type { Category } from "@/types/card";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  knownPairs: { src: string; dest: string }[];
}

const schema = z.object({
  text_src: z.string().trim().min(1, "Texte source requis").max(500),
  text_dest: z.string().trim().min(1, "Traduction requise").max(500),
  lang_src: z.string().trim().min(1, "Langue source requise").max(40),
  lang_dest: z.string().trim().min(1, "Langue cible requise").max(40),
});

export function AddCardDialog({ open, onOpenChange, knownPairs }: Props) {
  const [text_src, setSrc] = useState("");
  const [text_dest, setDest] = useState("");
  const [lang_src, setLangSrc] = useState("");
  const [lang_dest, setLangDest] = useState("");
  const [category, setCategory] = useState<Category>("word");
  const [altsRaw, setAltsRaw] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && knownPairs.length && !lang_src && !lang_dest) {
      setLangSrc(knownPairs[0].src);
      setLangDest(knownPairs[0].dest);
    }
  }, [open, knownPairs, lang_src, lang_dest]);

  function reset() {
    setSrc(""); setDest(""); setAltsRaw(""); setCategory("word");
  }

  async function save() {
    const parsed = schema.safeParse({ text_src, text_dest, lang_src, lang_dest });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSaving(true);
    try {
      const alts = altsRaw.split(/[,;|]/).map((a) => a.trim()).filter(Boolean).slice(0, 20);
      const dup = await db.cards
        .where("[text_src+text_dest]")
        .equals([parsed.data.text_src, parsed.data.text_dest])
        .first();
      if (dup) {
        toast.error("Cette carte existe déjà");
        return;
      }
      await db.cards.add({
        text_src: parsed.data.text_src,
        text_dest: parsed.data.text_dest,
        lang_src: parsed.data.lang_src,
        lang_dest: parsed.data.lang_dest,
        category,
        alts,
        ...newCardSRS(),
        created_at: Date.now(),
      });
      toast.success("Carte ajoutée");
      reset();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  const pairKey = `${lang_src}→${lang_dest}`;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Ajouter une carte</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {knownPairs.length > 0 && (
            <div>
              <Label className="text-sm">Paire de langues</Label>
              <Select
                value={knownPairs.some((p) => `${p.src}→${p.dest}` === pairKey) ? pairKey : "custom"}
                onValueChange={(v) => {
                  if (v === "custom") return;
                  const [s, d] = v.split("→");
                  setLangSrc(s); setLangDest(d);
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {knownPairs.map((p) => (
                    <SelectItem key={`${p.src}→${p.dest}`} value={`${p.src}→${p.dest}`}>
                      {p.src} → {p.dest}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">Personnalisée…</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-sm">Langue source</Label>
              <Input value={lang_src} onChange={(e) => setLangSrc(e.target.value)} placeholder="Français" maxLength={40} />
            </div>
            <div>
              <Label className="text-sm">Langue cible</Label>
              <Input value={lang_dest} onChange={(e) => setLangDest(e.target.value)} placeholder="Anglais" maxLength={40} />
            </div>
          </div>
          <div>
            <Label className="text-sm">Texte source</Label>
            <Input value={text_src} onChange={(e) => setSrc(e.target.value)} maxLength={500} autoFocus />
          </div>
          <div>
            <Label className="text-sm">Traduction</Label>
            <Input value={text_dest} onChange={(e) => setDest(e.target.value)} maxLength={500} />
          </div>
          <div>
            <Label className="text-sm">Alternatives (séparées par , ; ou |)</Label>
            <Input value={altsRaw} onChange={(e) => setAltsRaw(e.target.value)} placeholder="kitty, feline" maxLength={500} />
          </div>
          <div>
            <Label className="text-sm">Catégorie</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="word">Mot</SelectItem>
                <SelectItem value="expression">Expression</SelectItem>
                <SelectItem value="sentence">Phrase</SelectItem>
                <SelectItem value="unknown">Inconnue</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={save} disabled={saving}>Ajouter</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
