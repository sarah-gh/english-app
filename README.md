# 🃏 Flashcards — AI-Powered Vocabulary Trainer

An offline-first flashcard app for learning English vocabulary and grammar, built with **Vue 3**, **TypeScript**, and **Tailwind CSS 4**. All data lives locally in **IndexedDB** (via Dexie.js) — no backend, no account, no server round-trip for your deck.

It combines a priority-driven study/practice flow with swipe gestures, an AI quiz generator with automated grading, AI-assisted card authoring, and JSON/Excel/full-backup import-export, wrapped in an installable PWA with a dark "editorial" theme.

---

## ✨ Key Features

### 🎴 Study & Practice Sessions
* **Priority Queue, not plain SRS:** each session builds a capped queue that puts never-studied cards first, then previously-failed cards, then the rest weighted by Hard → Medium → Easy (`src/services/review/priority-queue.ts`).
* **Chunked Flow:** cards are studied 5 at a time; every chunk ends with a 2-column matching quiz before the next chunk starts, and a missed match can be re-queued later in the same session.
* **Two View Modes:** *Practice* (swipe right = Known, swipe left = Not Known, with undo) and *Study* (plain Next/Previous, no assessment).
* **Session Summary:** tracks studied count, match accuracy, and elapsed time, with a "Study Another Batch" restart.
* **Rich Card Fields:** IPA, hints, examples, synonyms/antonyms, multiple parts-of-speech entries (each with its own definition/IPA/examples), an alternative "Word Family" template (root word + noun/verb/adjective/adverb forms), images, and per-card audio.
* **Pronunciation:** built-in browser Text-to-Speech (US/UK accent) plus one-click fetch of real human pronunciation audio from the [Free Dictionary API](https://dictionaryapi.dev).

### 🤖 AI Quiz Generator & Grading
* **Multiple Choice (4 options):** generated from your cards, scored instantly client-side.
* **Open-Ended / Descriptive:** free-text answers graded by AI afterward — score (0–100), feedback, and a sample answer per question.
* **Quiz History:** every AI quiz run is saved (mode, deck/topic, score, per-question detail) and shown on the Profile page.
* **AI Card Auto-Fill:** generate a card's definition, IPA, hint, examples, and parts-of-speech from just its title, or auto-fill a Word Family's noun/verb/adjective/adverb forms from a root word — field-by-field or all at once.

### 🔌 Multi-Provider AI (bring your own key)
Configured entirely in Settings, keys stored only in local IndexedDB, never bundled or exported:
* **Google (Gemini)**, **Groq**, **OpenRouter**, **AIHubMix** — each with its own API key (and base URL/model where applicable).
* **Fallback mode:** pick a primary and a backup provider; requests automatically retry on the backup if the primary fails (network error, rate limit, missing credentials, etc.).
* **Test Connection** button to validate credentials before use.

### 🗂️ Deck / Topic / Tag Organization
* **Expandable Tree Browser:** Decks → Topics → Cards in a Notion-style nested tree, no page reloads.
* **Deck & Tag Management:** dedicated screen to create, rename, and delete decks and tags.
* Cards can carry multiple tags and are filterable by deck, topic, tag, or review status.

### 📦 Import & Export
* **JSON Card Import** (Settings → Data Management): pastes/uploads JSON in a flat-array, deck-grouped, or `{decks:[...]}`/`{cards:[...]}` wrapped shape, with a validation + preview modal before saving (see exact schema below).
* **Excel Card Import** (`/cards/import`): upload a `.xlsx` workbook of cards, with a downloadable template, per-row validation, and a preview before import.
* **Full Backup / Restore:** exports every deck, topic, tag, card (including audio/image blobs), AI quiz history, and daily stats into a single `.zip` (`data.json` + `media/`); restoring merges it back in. The AI API keys are intentionally excluded from backups.
* **Reset All Data:** wipes the local database back to a clean slate.

### 📊 Progress Tracking
* **Daily Goal Ring & 7-Day Streak:** on the Profile page, backed by per-day study-count stats.
* **AI Quiz History List** on Profile.

### 🎨 Appearance & Settings
* **Light / Dark / System theme**, editorial dark palette.
* **Custom UI kit:** `BaseButton`, `BaseSelect`, `BaseModal`, `BaseAutocomplete`, etc., plus `@headlessui/vue` under the hood for accessible dropdowns/modals.
* **Installable PWA:** offline-first via Workbox precaching, with an in-app "Install App" prompt.

---

## 🛠️ Tech Stack

* **Framework:** Vue 3 (`rc` / Vapor-track release) — Composition API with `<script setup>`
* **Language:** TypeScript
* **Routing:** Vue Router
* **State:** Pinia
* **Data fetching / async state:** TanStack Query (`@tanstack/vue-query`) for AI calls and pronunciation fetches
* **Forms & validation:** VeeValidate + Zod (`vee-validate`, `@vee-validate/zod`, `zod`)
* **Styling:** Tailwind CSS 4 (`@tailwindcss/vite`, custom theme tokens)
* **Icons:** `vue-iconsax` (per-icon static imports to keep the PWA precache small)
* **UI Primitives:** `@headlessui/vue`
* **Database & Persistence:** Dexie.js (IndexedDB), schema versioned with migrations (`src/db/schema.ts`)
* **HTTP:** Axios (AI provider calls, dictionary audio lookup)
* **Import/Export:** `read-excel-file` / `write-excel-file` (Excel), `jszip` (backup archives)
* **Swipe gestures:** Swiper (custom Tinder-style effect)
* **PWA:** `vite-plugin-pwa` (Workbox precaching, autoUpdate)
* **Build Tool:** Vite
* **Testing:** Vitest (unit), Playwright (e2e)
* **Linting/Formatting:** ESLint (+ oxlint), Prettier, Husky pre-commit hook

---

## 🗺️ Routes

| Path | View | Purpose |
|---|---|---|
| `/` | `DashboardView` | Home — quick "Start Studying", deck list, add card |
| `/cards` | `CardBrowseDecksView` | Expandable Deck → Topic tree browser |
| `/cards/new` | `CardEditorView` | Create a card |
| `/cards/:id/edit` | `CardEditorView` | Edit a card |
| `/cards/import` | `CardImportView` | Excel batch import |
| `/cards/:deckId/:topicId` | `CardBrowseCardsView` | Cards within a topic |
| `/decks` | `DeckTagManagementView` | Manage decks & tags |
| `/study` | `StudySetupView` | Choose deck/topic/session size |
| `/study/session` | `StudySessionView` | Swipe/practice + matching-quiz flow |
| `/ai-quiz` | `AiQuizSetupView` | Configure an AI quiz (mode, source, count) |
| `/ai-quiz/session` | `AiQuizView` | Take & grade the AI quiz |
| `/profile` | `ProfileView` | Daily goal ring, streak, AI quiz history |
| `/settings` | `SettingsView` | AI providers, appearance, pronunciation, daily goal, data management |

---

## 🗄️ Data Model (Dexie / IndexedDB, `english-app-db`)

Tables: `cards`, `decks`, `topics`, `tags`, `aiQuizResults`, `dailyStats`, `settings` (a single-row settings table).

* **Card:** front/back text, deck/topic/tag references, IPA, hint, examples, synonyms, antonyms, optional multi-entry parts-of-speech, optional Word Family data, optional image/audio blobs, review status (`new` / `easy` / `medium` / `hard`), per-card review stats (times reviewed, successful/failed matches), embedded quiz questions saved from AI quiz sessions.
* **Deck → Topic → Card** is a strict hierarchy (topics are scoped per deck).
* Schema is versioned (currently v3) with in-place Dexie `.upgrade()` migrations — e.g. v2 introduced the Topic layer and backfilled a "General" topic per deck; v3 backfilled empty synonym/antonym arrays.
* Pinia stores (`src/stores/`) are thin caches over Dexie repositories (`src/db/repositories/`) — one store each for cards, decks, topics, tags, settings, theme, study session, quiz session, browse tree, and analytics.

---

## 📥 JSON Card Import Schema

Parsed and validated by `src/utils/import/json-card-importer.ts`. Three top-level shapes are accepted:

1. **A flat array of cards**, each free to declare its own deck/topic.
2. **An array of deck groups**, `{ name, topicName?, cards: [...] }`.
3. Either of the above wrapped in an object: `{ "decks": [...] }` or `{ "cards": [...] }`.

Each card object supports:

```json
{
  "frontTitle": "Ephemeral",
  "backAnswer": "Lasting for a very short time",
  "deckName": "Advanced Vocabulary",
  "topicName": "Adjectives",
  "ipa": "/ɪˈfem.ər.əl/",
  "hint": "Think of a mayfly's lifespan.",
  "examples": ["Fashion trends are ephemeral."],
  "synonyms": ["fleeting", "transient"],
  "antonyms": ["permanent", "everlasting"],
  "tagNames": ["GRE", "adjectives"],
  "partsOfSpeech": [
    {
      "pos": "adjective",
      "wordForm": "Ephemeral",
      "definition": "Lasting for a very short time",
      "ipa": "/ɪˈfem.ər.əl/",
      "examples": ["An ephemeral moment of joy."]
    }
  ],
  "wordFamily": {
    "rootWord": "Decide",
    "noun": { "word": "Decision", "meaning": "A conclusion reached", "example": "She made a decision." },
    "verb": { "word": "Decide", "meaning": "To make a choice", "example": "I can't decide." },
    "adjective": { "word": "Decisive", "meaning": "Settling an issue" },
    "adverb": { "word": "Decisively", "meaning": "In a decisive manner" },
    "usageNotes": "Decisive describes a person or action, not a decision itself."
  }
}
```

Rules:
* Only **`frontTitle`** and **`backAnswer`** are required; every other field is optional and independently defaulted.
* `deckName` / `topicName` fall back to the group's values (for shape 2), then to `"Imported"` / `"General"`.
* `pos` must be one of `noun` | `verb` | `adjective` | `adverb` | `other`; a `partsOfSpeech` entry without a valid `pos` and `definition` is dropped.
* `wordFamily` is dropped entirely if it has no `rootWord`.
* Deck/topic/tag names are matched case-insensitively against what already exists — new ones are listed in the preview modal as "to be created" before you confirm the import.
* Malformed entries are skipped individually (with an error message) rather than rejecting the whole file — the preview always shows whatever *did* parse.

---

## 🚀 Getting Started

### Prerequisites
Node.js `^22.18.0` or `>=24.12.0` (see `engines` in `package.json`) and npm.

### Installation

```bash
git clone https://github.com/sarah-gh/english-app.git
cd english-app
npm install
```

### Development

```bash
npm run dev            # start the dev server
npm run dev:network     # start the dev server, exposed on your LAN
```

### Build & Preview

```bash
npm run build           # type-check + production build to dist/
npm run preview         # preview the production build locally
```

### Deploy

```bash
npm run deploy           # publish dist/ to GitHub Pages (gh-pages branch)
```

### Testing & Quality

```bash
npm run test:unit        # Vitest unit tests
npm run test:e2e         # Playwright end-to-end tests
npm run lint             # ESLint (+ oxlint), auto-fix
npm run format            # Prettier, write mode
```

### AI Setup
Add at least one provider's API key in **Settings → AI Provider** (Google Gemini, Groq, OpenRouter, or AIHubMix) to unlock AI Quiz Generation and AI Card Auto-Fill. Keys are stored only in your browser's IndexedDB and are never included in exported backups.

---

## 📄 License

No license file is currently present in this repository — treat the code as all-rights-reserved unless the repository owner states otherwise.
