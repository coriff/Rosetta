/**
 * Cleaning pipeline for raw Google Translate "Saved translations" exports.
 *
 * The raw export has NO header row and 4 columns:
 *   [lang_src, lang_dest, text_src, text_dest]
 * Cells can be multi-line (feminine\nmasculine) or contain "(masculin)" hints,
 * and the same pair can appear in both directions (chat→cat AND cat→chat).
 */

export interface CleanedRow {
  lang_src: string;
  lang_dest: string;
  text_src: string;
  text_dest: string;
}

export interface CleaningReport {
  format: "raw_google_translate" | "structured" | "unknown";
  totalRows: number;
  cleanedRows: number;
  masculineKept: number;
  duplicatesRemoved: number;
  emptyRowsSkipped: number;
}

/**
 * From a multi-line / parenthesised cell, keep ONE canonical form.
 * Priority:
 *   1. Line containing "(masculin...)"  → strip parens
 *   2. Otherwise, last non-empty line   (Google Translate puts masculine last)
 *   3. Strip remaining parenthesised hints
 */
export function keepMasculine(raw: unknown): { value: string; collapsed: boolean } {
  if (raw === null || raw === undefined) return { value: "", collapsed: false };
  const s = String(raw);
  const lines = s.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return { value: "", collapsed: false };

  const masc = lines.find((l) => /\(\s*masculin/i.test(l));
  let chosen = masc ?? (lines.length > 1 ? lines[lines.length - 1] : lines[0]);
  chosen = chosen.replace(/\s*\([^)]*\)/g, "").trim();
  return { value: chosen, collapsed: lines.length > 1 || /\(/.test(s) };
}

/**
 * Detect whether a sheet looks like the raw Google Translate export.
 * Heuristic: first row's first cell is a known language label AND there are
 * exactly 4 columns of data with no obvious header keywords.
 */
const LANG_LABELS = new Set(
  [
    "anglais", "français", "francais", "english", "french",
    "espagnol", "spanish", "allemand", "german", "italien", "italian",
    "portugais", "portuguese", "néerlandais", "dutch", "russe", "russian",
    "chinois", "chinese", "japonais", "japanese", "arabe", "arabic",
  ],
);

export function isRawGoogleFormat(headers: string[], firstRow?: Record<string, unknown>): boolean {
  // Headers from sheet_to_json with defval will be the first data row when there's no header.
  // We treat as raw when ALL "headers" look like language names (e.g. "Anglais","Français",...)
  if (headers.length < 4) return false;
  const langLike = headers.slice(0, 2).every((h) => LANG_LABELS.has(String(h).trim().toLowerCase()));
  if (!langLike) return false;
  // sanity-check first row content also looks like a translation pair
  if (firstRow) {
    const vals = Object.values(firstRow).map((v) => String(v ?? "").trim());
    return vals.filter(Boolean).length >= 4;
  }
  return true;
}

/**
 * Clean a raw Google Translate export. Input rows = array of arrays (header:1).
 * Returns canonical {lang_src, lang_dest, text_src, text_dest} rows
 * with order-insensitive deduplication on the (text_src, text_dest) pair.
 */
export function cleanRawRows(matrix: unknown[][]): { rows: CleanedRow[]; report: CleaningReport } {
  let masculineKept = 0;
  let emptyRowsSkipped = 0;

  const intermediate: CleanedRow[] = [];
  for (const r of matrix) {
    const lang_src = String(r[0] ?? "").trim();
    const lang_dest = String(r[1] ?? "").trim();
    const srcRes = keepMasculine(r[2]);
    const destRes = keepMasculine(r[3]);
    const text_src = srcRes.value.toLowerCase();
    const text_dest = destRes.value.toLowerCase();
    if (!text_src || !text_dest) {
      emptyRowsSkipped++;
      continue;
    }
    if (srcRes.collapsed || destRes.collapsed) masculineKept++;
    intermediate.push({ lang_src, lang_dest, text_src, text_dest });
  }

  // Order-insensitive dedup on the pair
  const seen = new Map<string, CleanedRow>();
  for (const row of intermediate) {
    const key = [row.text_src, row.text_dest].sort().join("\u0001");
    if (!seen.has(key)) seen.set(key, row);
  }
  const cleaned = Array.from(seen.values());

  return {
    rows: cleaned,
    report: {
      format: "raw_google_translate",
      totalRows: matrix.length,
      cleanedRows: cleaned.length,
      masculineKept,
      duplicatesRemoved: intermediate.length - cleaned.length,
      emptyRowsSkipped,
    },
  };
}
