import { useState } from "react";
import type { Card } from "@/types/card";
import { db } from "@/lib/db";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Props {
  card: Card;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved?: (updated: Card) => void;
}

/**
 * Quick edit dialog usable mid-review or from the recap / browse screens.
 * Lets the user fix the source, target, or add alternative translations.
 */
export function EditCardDialog({ card, open, onOpenChange, onSaved }: Props) {
  const [src, setSrc] = useState(card.text_src);
  const [dest, setDest] = useState(card.text_dest);
  const [alts, setAlts] = useState(card.alts.join("; "));

  async function save() {
    const altList = alts
      .split(/[;|]/)
      .map((s) => s.trim())
      .filter(Boolean);
    const patch = {
      text_src: src.trim(),
      text_dest: dest.trim(),
      alts: Array.from(new Set(altList)),
    };
    await db.cards.update(card.id!, patch);
    toast.success("Carte mise à jour");
    onSaved?.({ ...card, ...patch });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier la carte</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">{card.lang_src}</Label>
            <Input value={src} onChange={(e) => setSrc(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">{card.lang_dest}</Label>
            <Input value={dest} onChange={(e) => setDest(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Traductions alternatives (séparées par ;)</Label>
            <Input
              value={alts}
              onChange={(e) => setAlts(e.target.value)}
              placeholder="ex: kitty; feline"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Acceptées en plus de la traduction principale lors des exercices.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={save} disabled={!src.trim() || !dest.trim()}>
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
