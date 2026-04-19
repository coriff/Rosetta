

## Goal

Rebuild your Streamlit Python trainer as a cross-platform web app (works on any browser, any OS), then later wrap it for mobile. Replace the simple +1/−1 weighting with a real **SM-2 spaced repetition** engine (Anki-style). Keep the multi-language, configurable design.

## Data model (matches your Excel)

Each card:
- `lang_src`, `lang_dest` — e.g. "Français", "Anglais"
- `text_src`, `text_dest` — main translation
- `category` — `word` | `expression` | `sentence`
- `alt1..alt10` — accepted alternative translations (semicolon-separated also supported)
- SRS fields (new): `ease`, `interval`, `repetitions`, `due_at`, `last_reviewed_at`, `lapses`

Cards are stored in browser **IndexedDB** (via Dexie) so the app is fully offline and works without login. A "No login now, add later" architecture: a thin `storage` layer so we can swap to Lovable Cloud later without rewriting screens.

## Screens

1. **Home / Dashboard** — counts: due today, new, learning; "Start review" button; deck stats.
2. **Import** — drag-drop your `.xlsx`. Column mapper (auto-detects `lang_src, lang_dest, text_src, text_dest, category, alt*`). Preview first 20 rows, then import. Re-import merges by `(text_src, text_dest)` pair without duplicating SRS progress.
3. **Review session** — picks due cards (SM-2). Three exercise modes, auto-rotated:
   - **Flashcard**: prompt → reveal → rate Again / Hard / Good / Easy
   - **Typing**: type translation; accepts `text_dest` + any `alt*`; case/accent-insensitive; "passer" to skip
   - **Multiple choice**: 4 options sampled from same language pair
   - Direction toggle (src→dest, dest→src, or both) + category filter + language pair selector (preserves your existing filters)
4. **Browse / manage** — table of all cards: search, filter by lang/category, edit, delete, add alt translation (replicates your sidebar CRUD).
5. **Stats** — review history, retention %, due-forecast chart.
6. **Settings** — daily new-card limit, max reviews, reset SRS, export deck to `.xlsx` (round-trips to your Excel format).

## SRS algorithm (SM-2, Anki-flavored)

- New card: `ease=2.5, interval=0, repetitions=0`.
- On review with quality `q` (Again=0, Hard=3, Good=4, Easy=5):
  - q<3 → `repetitions=0, interval=1 day, lapses+=1`
  - q≥3 → `repetitions+=1`; interval = `1d` (rep 1), `6d` (rep 2), else `prev_interval * ease`
  - `ease = max(1.3, ease + 0.1 - (5-q)*(0.08 + (5-q)*0.02))`
  - `due_at = now + interval`
- Session picks cards where `due_at <= now`, plus up to N new cards/day.

## Tech stack

- React 18 + Vite + TypeScript + Tailwind + shadcn/ui (already scaffolded)
- React Router for the 6 screens
- **Dexie** (IndexedDB wrapper) for local persistence
- **SheetJS (xlsx)** for import/export of `.xlsx`
- **Recharts** for stats
- **Web Speech API** (`speechSynthesis`) for optional TTS pronunciation
- Mobile-friendly layout via Tailwind responsive classes; viewport meta + safe-area insets
- Later: PWA (vite-plugin-pwa) so you can install it on phone home screen — clean upgrade path, no rewrite

## File structure (new)

```text
src/
  pages/
    Home.tsx
    Import.tsx
    Review.tsx
    Browse.tsx
    Stats.tsx
    Settings.tsx
  components/
    review/{Flashcard,TypingCard,MultipleChoiceCard,RatingButtons}.tsx
    import/{Dropzone,ColumnMapper,PreviewTable}.tsx
    layout/{AppShell,SideNav,MobileNav}.tsx
  lib/
    db.ts            # Dexie schema + storage interface
    srs.ts           # SM-2 engine + scheduler
    xlsx.ts          # parse/normalize/export Excel
    normalize.ts     # lowercase, strip accents, trim, alt parsing
    sampler.ts       # due-card picker, exercise-mode rotation
  hooks/
    useDeck.ts, useSession.ts, useDueCounts.ts
  types/card.ts
```

## Build sequence

1. Storage + types + SM-2 engine + unit tests (`vitest`).
2. App shell with responsive nav (sidebar on desktop, bottom-tab on mobile).
3. Excel import with column mapper, normalization, dedup against your existing `clean.xlsx`.
4. Review screen with the 3 exercise modes + rating.
5. Browse / CRUD + Excel export.
6. Stats + Settings.
7. Polish responsive design at 310px (your current viewport) up to desktop.

After this is solid, step 2 is adding PWA install + (later) Lovable Cloud sync for cross-device progress.

## Open question

Your raw Excel rows look like the cleaned schema doesn't quite match — I'd like to validate column auto-detection on the first import. The plan covers this with the manual column-mapper fallback, so we're safe either way.

