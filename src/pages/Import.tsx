import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  autoDetectMapping,
  importRows,
  readWorkbook,
  type ColumnMapping,
  type RawRow,
} from "@/lib/xlsx";
import type { CleaningReport } from "@/lib/clean";
import { Upload, FileCheck2, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function ImportPage() {
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<RawRow[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [report, setReport] = useState<CleaningReport | null>(null);
  const [preMapped, setPreMapped] = useState(false);

  function reset() {
    setHeaders([]);
    setRows([]);
    setMapping(null);
    setFileName(null);
    setReport(null);
    setPreMapped(false);
  }

  async function onFile(file: File) {
    setBusy(true);
    try {
      const result = await readWorkbook(file);
      setHeaders(result.headers);
      setRows(result.rows);
      setMapping(autoDetectMapping(result.headers));
      setFileName(file.name);
      setReport(result.cleaningReport ?? null);
      setPreMapped(!!result.preMapped);
      if (result.cleaningReport) {
        toast.success(
          `Format Google Translate brut détecté · ${result.cleaningReport.cleanedRows} cartes prêtes`,
        );
      } else {
        toast.success(`${result.rows.length} lignes lues depuis ${file.name}`);
      }
    } catch (e) {
      toast.error("Impossible de lire le fichier");
      console.error(e);
    } finally {
      setBusy(false);
    }
  }

  async function runImport() {
    if (!mapping) return;
    if (!mapping.text_src || !mapping.text_dest) {
      toast.error("Sélectionnez les colonnes texte source et cible");
      return;
    }
    setBusy(true);
    try {
      const result = await importRows(rows, mapping);
      toast.success(
        `Import terminé : ${result.inserted} ajoutées, ${result.merged} fusionnées, ${result.skipped} ignorées`,
      );
      reset();
    } catch (e) {
      toast.error("Erreur lors de l'import");
      console.error(e);
    } finally {
      setBusy(false);
    }
  }

  function MapRow({
    field,
    label,
    optional,
  }: {
    field: keyof ColumnMapping;
    label: string;
    optional?: boolean;
  }) {
    if (!mapping) return null;
    const value = mapping[field] as string;
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:items-center">
        <Label className="text-sm">
          {label}{" "}
          {optional && <span className="text-muted-foreground">(optionnel)</span>}
        </Label>
        <div className="sm:col-span-2">
          <Select
            value={value || "__none__"}
            onValueChange={(v) =>
              setMapping({ ...mapping, [field]: v === "__none__" ? "" : v })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">—</SelectItem>
              {headers.map((h) => (
                <SelectItem key={h} value={h}>
                  {h}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Importer un fichier Excel
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Glissez-déposez un .xlsx. Le format brut Google Translate est nettoyé
          automatiquement (formes féminines retirées, doublons fusionnés).
        </p>
      </header>

      <Card
        className="shadow-card border-dashed border-2"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files?.[0];
          if (f) onFile(f);
        }}
      >
        <CardContent className="p-6 sm:p-10 flex flex-col items-center text-center gap-3">
          {busy ? (
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          ) : fileName ? (
            <FileCheck2 className="h-10 w-10 text-success" />
          ) : (
            <Upload className="h-10 w-10 text-muted-foreground" />
          )}
          <div>
            <p className="font-medium">
              {fileName ?? "Déposez votre fichier ici"}
            </p>
            <p className="text-sm text-muted-foreground">
              ou choisissez un fichier .xlsx
            </p>
          </div>
          <Input
            type="file"
            accept=".xlsx,.xls"
            className="max-w-xs"
            onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
          />
        </CardContent>
      </Card>

      {report && (
        <Card className="shadow-card border-primary/30 bg-primary/5">
          <CardContent className="p-4 sm:p-6 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Nettoyage automatique appliqué</h2>
              <Badge variant="secondary">Google Translate brut</Badge>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <Stat label="Lignes lues" value={report.totalRows} />
              <Stat label="Cartes prêtes" value={report.cleanedRows} tone="success" />
              <Stat
                label="Doublons retirés"
                value={report.duplicatesRemoved}
                tone="warning"
              />
              <Stat label="Formes masc. gardées" value={report.masculineKept} />
            </div>
            <p className="text-xs text-muted-foreground">
              Les paires sont dédupliquées dans les deux sens (chat→cat = cat→chat),
              et la nature (mot · expression · phrase) sera détectée à l'import.
            </p>
          </CardContent>
        </Card>
      )}

      {mapping && !preMapped && (
        <Card className="shadow-card">
          <CardContent className="p-4 sm:p-6 space-y-4">
            <div>
              <h2 className="font-semibold">Mapping des colonnes</h2>
              <p className="text-xs text-muted-foreground">
                {mapping.alt_columns.length} colonne(s) d'alternatives détectées
                : {mapping.alt_columns.join(", ") || "aucune"}
              </p>
            </div>
            <div className="space-y-3">
              <MapRow field="lang_src" label="Langue source" />
              <MapRow field="lang_dest" label="Langue cible" />
              <MapRow field="text_src" label="Texte source" />
              <MapRow field="text_dest" label="Texte cible" />
              <MapRow field="category" label="Catégorie" optional />
            </div>
          </CardContent>
        </Card>
      )}

      {mapping && rows.length > 0 && (
        <Card className="shadow-card">
          <CardContent className="p-4 sm:p-6 space-y-4">
            <h2 className="font-semibold">
              Aperçu ({Math.min(10, rows.length)} sur {rows.length})
            </h2>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-xs">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-2">Source</th>
                    <th className="text-left p-2">Cible</th>
                    <th className="text-left p-2">Catégorie</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 10).map((r, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-2">
                        {String(r[mapping.text_src] ?? "")}
                      </td>
                      <td className="p-2">
                        {String(r[mapping.text_dest] ?? "")}
                      </td>
                      <td className="p-2 text-muted-foreground">
                        {mapping.category
                          ? String(r[mapping.category] ?? "")
                          : "auto"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={reset} disabled={busy}>
                Annuler
              </Button>
              <Button onClick={runImport} disabled={busy}>
                {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Importer {rows.length} cartes
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "success" | "warning";
}) {
  const color =
    tone === "success"
      ? "text-success"
      : tone === "warning"
        ? "text-warning"
        : "text-foreground";
  return (
    <div className="rounded-md bg-background p-3 border">
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
