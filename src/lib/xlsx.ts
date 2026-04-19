import * as XLSX from "xlsx";
import type { Card, Category } from "@/types/card";
import { db } from "./db";
import { newCardSRS } from "./srs";
import { detectCategory, parseAlts } from "./normalize";

export interface RawRow {
  [key: string]: unknown;
}

export interface ColumnMapping {
  lang_src: string;
  lang_dest: string;
  text_src: string;
  text_dest: string;
  category?: string;
  alt_columns: string[]; // header names for alt1..altN
}

export async function readWorkbook(file: File): Promise<{ headers: string[]; rows: RawRow[] }> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<RawRow>(sheet, { defval: "" });
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  return { headers, rows };
}

export function autoDetectMapping(headers: string[]): ColumnMapping {
  const lower = headers.map((h) => h.toLowerCase());
  const find = (...needles: string[]) => {
    for (const n of needles) {
      const i = lower.findIndex((h) => h === n || h.includes(n));
      if (i >= 0) return headers[i];
    }
    return "";
  };
  const alt_columns = headers.filter((h) => /^alt\d*$/i.test(h.trim()) || /alternative/i.test(h));
  return {
    lang_src: find("lang_src", "langue source", "source lang", "src lang", "from lang"),
    lang_dest: find("lang_dest", "langue cible", "target lang", "dest lang", "to lang"),
    text_src: find("text_src", "texte source", "source", "from", "original"),
    text_dest: find("text_dest", "texte cible", "traduction", "translation", "target", "to"),
    category: find("category", "catégorie", "categorie", "type", "nature"),
    alt_columns,
  };
}

function normCategory(v: unknown, fallback: string): Category {
  const s = String(v ?? "").trim().toLowerCase();
  if (s.startsWith("word") || s.startsWith("mot")) return "word";
  if (s.startsWith("expr")) return "expression";
  if (s.startsWith("sent") || s.startsWith("phrase")) return "sentence";
  if (!s) return detectCategory(fallback);
  return "unknown";
}

export interface ImportResult {
  inserted: number;
  merged: number;
  skipped: number;
}

export async function importRows(rows: RawRow[], map: ColumnMapping): Promise<ImportResult> {
  let inserted = 0;
  let merged = 0;
  let skipped = 0;

  await db.transaction("rw", db.cards, async () => {
    for (const row of rows) {
      const text_src = String(row[map.text_src] ?? "").trim();
      const text_dest = String(row[map.text_dest] ?? "").trim();
      if (!text_src || !text_dest) {
        skipped++;
        continue;
      }
      const lang_src = String(row[map.lang_src] ?? "").trim() || "Source";
      const lang_dest = String(row[map.lang_dest] ?? "").trim() || "Cible";
      const category = map.category
        ? normCategory(row[map.category], text_src)
        : detectCategory(text_src);

      const altsRaw: string[] = [];
      for (const col of map.alt_columns) {
        const v = row[col];
        if (v !== undefined && v !== null && String(v).trim()) {
          altsRaw.push(...parseAlts(v));
        }
      }
      const alts = Array.from(new Set(altsRaw.filter(Boolean)));

      // dedup on (text_src, text_dest)
      const existing = await db.cards
        .where("[text_src+text_dest]")
        .equals([text_src, text_dest])
        .first();

      if (existing) {
        const mergedAlts = Array.from(new Set([...(existing.alts || []), ...alts]));
        await db.cards.update(existing.id!, {
          alts: mergedAlts,
          lang_src,
          lang_dest,
          category: existing.category === "unknown" ? category : existing.category,
        });
        merged++;
      } else {
        const card: Card = {
          lang_src,
          lang_dest,
          text_src,
          text_dest,
          category,
          alts,
          ...newCardSRS(),
          created_at: Date.now(),
        };
        await db.cards.add(card);
        inserted++;
      }
    }
  });

  return { inserted, merged, skipped };
}

export async function exportToXlsx(): Promise<Blob> {
  const cards = await db.cards.toArray();
  const maxAlts = cards.reduce((m, c) => Math.max(m, c.alts.length), 0);
  const rows = cards.map((c) => {
    const r: Record<string, unknown> = {
      lang_src: c.lang_src,
      lang_dest: c.lang_dest,
      text_src: c.text_src,
      text_dest: c.text_dest,
      category: c.category,
      ease: c.ease,
      interval: c.interval,
      repetitions: c.repetitions,
      due_at: new Date(c.due_at).toISOString(),
      lapses: c.lapses,
    };
    for (let i = 0; i < maxAlts; i++) r[`alt${i + 1}`] = c.alts[i] ?? "";
    return r;
  });
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Cards");
  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}
