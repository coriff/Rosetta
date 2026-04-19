import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDueCounts } from "@/hooks/useDueCounts";
import { BookOpen, Upload, Sparkles, Layers } from "lucide-react";

function Stat({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <Card className="shadow-card">
      <CardContent className="p-4">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className={`mt-1 text-2xl font-bold ${accent ?? ""}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

export default function Home() {
  const counts = useDueCounts();
  const empty = counts.total === 0;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Bonjour 👋</h1>
        <p className="text-sm text-muted-foreground">
          Apprenez vos mots et expressions avec la répétition espacée.
        </p>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="À réviser" value={counts.due} accent="text-primary" />
        <Stat label="Nouvelles" value={counts.new} accent="text-accent" />
        <Stat label="En cours" value={counts.learning} />
        <Stat label="Total" value={counts.total} />
      </div>

      <Card className="shadow-elevated overflow-hidden border-0">
        <div className="bg-gradient-primary p-6 sm:p-8 text-primary-foreground">
          <div className="flex items-start gap-3">
            <Sparkles className="h-6 w-6 shrink-0 mt-1" />
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-xl font-semibold">
                {empty
                  ? "Importez votre premier deck"
                  : counts.due + counts.new === 0
                  ? "Tout est à jour !"
                  : `${counts.due + counts.new} cartes prêtes`}
              </h2>
              <p className="text-sm opacity-90 mt-1">
                {empty
                  ? "Glissez-déposez votre fichier Excel pour commencer."
                  : "Une session courte vous suffit pour rester régulier."}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {empty ? (
                  <Button asChild variant="secondary">
                    <Link to="/import">
                      <Upload className="h-4 w-4" /> Importer un fichier
                    </Link>
                  </Button>
                ) : (
                  <>
                    <Button asChild variant="secondary" disabled={counts.due + counts.new === 0}>
                      <Link to="/review">
                        <BookOpen className="h-4 w-4" /> Démarrer la session
                      </Link>
                    </Button>
                    <Button asChild variant="ghost" className="text-primary-foreground hover:bg-white/10">
                      <Link to="/browse">
                        <Layers className="h-4 w-4" /> Voir les cartes
                      </Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
