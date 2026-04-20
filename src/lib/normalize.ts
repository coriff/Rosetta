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

/**
 * Articles / determiners across common languages.
 * "a cat", "le chat", "la maison", "el gato", "die Katze", "lo zaino", etc.
 * are still considered a single WORD, not an expression.
 */
const ARTICLES = new Set([
  // English
  "a", "an", "the",
  // French
  "le", "la", "les", "l", "un", "une", "des", "du", "de", "d",
  // Spanish
  "el", "los", "las", "uno", "unos", "unas", "lo",
  // Italian
  "il", "lo", "gli", "i", "uno", "una", "un'", "degli", "delle",
  // German
  "der", "die", "das", "den", "dem", "des", "ein", "eine", "einen", "einem", "eines",
  // Portuguese
  "o", "os", "uns", "umas",
  // Dutch
  "de", "het", "een",
]);

function stripLeadingArticle(text: string): string {
  // also handle elided forms like "l'", "d'"
  const t = text.trim().toLowerCase();
  const elided = t.match(/^([ldnsj]['’])\s*(.+)$/i);
  if (elided && ARTICLES.has(elided[1].replace(/['’]/, ""))) return elided[2];
  const parts = t.split(/\s+/);
  if (parts.length >= 2 && ARTICLES.has(parts[0])) {
    return parts.slice(1).join(" ");
  }
  return t;
}

export function detectCategory(text: string): "word" | "expression" | "sentence" {
  const t = text.trim();
  if (/[.!?]$/.test(t) || t.split(/\s+/).length >= 6) return "sentence";
  const stripped = stripLeadingArticle(t);
  if (stripped.includes(" ")) return "expression";
  return "word";
}
