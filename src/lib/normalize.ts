export function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function normalizeAnswer(s: string): string {
  return stripAccents(s.trim().toLowerCase())
    .replace(/[.,;:!?'"`()[\]{}]/g, "")
    .replace(/\s+/g, " ");
}

export function answersEqual(a: string, b: string): boolean {
  return normalizeAnswer(a) === normalizeAnswer(b);
}

export function parseAlts(raw: unknown): string[] {
  if (raw === null || raw === undefined) return [];
  const s = String(raw).trim();
  if (!s) return [];
  // semicolon or pipe separated
  return s
    .split(/[;|]/)
    .map((x) => x.trim())
    .filter(Boolean);
}

export function detectCategory(text: string): "word" | "expression" | "sentence" {
  const t = text.trim();
  if (/[.!?]$/.test(t) || t.split(/\s+/).length >= 6) return "sentence";
  if (t.includes(" ")) return "expression";
  return "word";
}
