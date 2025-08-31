# Word Circle Game (Corporate Edition)

A modern, configurable word circle game for corporate training and team building. Now supports multiple challenges from a single page via a catalog, per-challenge themes/logos/styles, mobile-first sticky input bar, fuzzy matching, and PDF exports.

## ✅ What's New (v2)

- **Multi-Challenge Catalog**: Switch between challenges using `catalog.json`. Each challenge can override game settings, theme, logos, styles, and question sources.
- **Two routing modes**: by URL param (`?challenge=slug`) or path-based (e.g. `/game/sales-directors`).
- **Mobile sticky action bar**: input + Submit/Pass pinned to the bottom, with on-screen-keyboard aware positioning.
- **Centered header title** on the compact header bar.
- **Icon buttons**: white icons on Submit / Pass; green hint bulb.
- **Preview mode**: uses `preview.json` (or falls back to `questions.json`) with a 3-2-1 countdown.

---

## 📁 File Structure

```
word-circle-game/
├── index.html                 # App shell (loads challenge stylesheet at runtime)
├── styles.css                 # Base/shared styles (theme vars + UI)
├── wordCircleGame.js          # Main game logic (multi-challenge aware)
├── gameUtils.js               # Utilities (matching, scoring, etc.)
├── catalog.json               # NEW: challenge catalog + defaults + routing
├── challenges/
│   ├── default/
│   │   ├── logo.svg           # Welcome (white/inverted) logo
│   │   ├── logoRed.png        # Center circle logo (colored)
│   │   └── styles.css         # Default challenge stylesheet (optional)
│   ├── sales-directors/
│   │   ├── questions.json     # Full question bank (A–Z)
│   │   ├── preview.json       # Short/alt set for Preview
│   │   ├── logo.svg
│   │   ├── logoRed.png
│   │   └── styles.css         # Per-challenge style overrides
│   └── eu-nrm/
│       ├── questions.json
│       ├── preview.json
│       ├── logo.svg
│       ├── logoRed.png
│       └── styles.css
└── README.md                  # This file
```

---

## 🚀 Quick Start

1. **Download/clone the repo**.
2. **Keep the structure above** (especially `catalog.json` and the `challenges/` folder).
3. **Open `index.html` in a browser** (file:// is fine; no build step).
4. **Pick a challenge via:**
   - URL param: `index.html?challenge=sales-directors`
   - or set a path base in `catalog.json` and host at `/game/<slug>`.

The app remembers the last challenge in `localStorage` and loads it by default.

---

## ⚙️ Catalog & Configuration

All global defaults and the challenge list live in `catalog.json`. Example (shortened):

```json
{
  "routing": {
    "param": "challenge",
    "defaultSlug": "sales-directors",
    "pathBase": null
  },

  "default": {
    "basePath": "challenges/default",
    "title": "Corporate Word Circle",
    "subtitle": "Company Challenge",
    "logoPath": "logo.svg",
    "centerLogoPath": "logoRed.png",
    "stylesPath": "styles.css",
    "gameSettings": {
      "timeLimit": 300,
      "maxHints": 5,
      "fuzzyMatching": { "enabled": true, "threshold": 0.8, "maxDistance": 2 },
      "penalizeUnanswered": false,
      "scoring": {
        "correct": 3,
        "incorrect": -2,
        "pasapalabra": -1,
        "timeBonus": {
          "threshold": 10,
          "levels": [
            { "maxTime": 120, "bonus": 30 },
            { "maxTime": 180, "bonus": 20 },
            { "maxTime": 240, "bonus": 10 }
          ]
        }
      }
    },
    "theme": {
      "name": "corporate",
      "colors": {
        "primary": "#2c3e50",
        "accent": "#3498db",
        "correct": "#2ecc71",
        "incorrect": "#e74c3c",
        "background": "#ecf0f1",
        "cardBackground": "#ffffff",
        "textColor": "#333333"
      }
    }
  },

  "challenges": {
    "eu-nrm": {
      "basePath": "challenges/eu-nrm",
      "title": "EU NRM Team - Challenge 2025",
      "subtitle": "The Alphabet Game",
      "questionsPath": "questions.json",
      "previewPath": "preview.json"
    },
    "sales-directors": {
      "basePath": "challenges/sales-directors",
      "title": "EU Sales Directors Meeting",
      "subtitle": "The Alphabet Game",
      "questionsPath": "questions.json",
      "previewPath": "preview.json"
    }
  }
}
```

### Routing Modes

- **Param mode** (default): set `"param": "challenge"` and use `?challenge=<slug>`.
- **Path mode**: set `"pathBase": "/game"` then navigate to `/game/<slug>`.

(Leave `"pathBase": null` if you don't host under a fixed prefix.)

---

## ➕ How to Add a New Challenge (Step-by-Step)

### 1. Create a folder for the challenge

```
challenges/my-challenge/
├── questions.json      # required
├── preview.json        # optional (used for "Preview")
├── logo.svg            # white/inverted, used on the welcome header
├── logoRed.png         # colored center logo (circle middle)
└── styles.css          # optional per-challenge overrides
```

### 2. Add the challenge to `catalog.json`

```json
{
  "challenges": {
    "my-challenge": {
      "basePath": "challenges/my-challenge",
      "title": "My Custom Challenge",
      "subtitle": "The Alphabet Game",
      "questionsPath": "questions.json",
      "previewPath": "preview.json",

      // Optional overrides (use ONLY what you need):
      "gameSettings": {
        "timeLimit": 240,
        "maxHints": 3,
        "scoring": { "correct": 4, "incorrect": -1, "pasapalabra": -1 }
      },
      "theme": {
        "colors": {
          "primary": "#7b1fa2",
          "accent": "#512da8",
          "correct": "#2e7d32",
          "incorrect": "#c62828"
        }
      },
      "logoPath": "logo.svg",
      "centerLogoPath": "logoRed.png",
      "stylesPath": "styles.css"
    }
  }
}
```

### 3. (Optional) Make it the default

In `catalog.json`, set `"routing.defaultSlug": "my-challenge"`.

### 4. Open the challenge

- `index.html?challenge=my-challenge` (param mode)
- or `/game/my-challenge` (path mode, if configured).

---

## 🧩 Questions Format

Each letter (A–Z) maps to an array of question objects. The game picks one item at random per letter at runtime.

```json
{
  "A": [
    {
      "word": "Automation",
      "definition": "What word means using technology to make processes automatic?",
      "answers": ["Automation", "Automatization", "Auto"]
    }
  ],
  "B": [
    {
      "word": "Brand",
      "definition": "What represents company identity and product recognition?",
      "answers": ["Brand"]
    }
  ]
}
```

- **`word`** (string): canonical answer (also used when `answers` is omitted).
- **`answers`** (string[]): accepted variants (case-insensitive, fuzzy matching supported).
- **`definition`** (string): displayed prompt.

Preview mode uses `preview.json` if present, otherwise falls back to `questions.json`.

---

## 🎨 Theming & Styling

- **Theme variables** (colors) come from `catalog.json` → `default.theme.colors` + optional per-challenge overrides.
- At runtime, variables are applied to CSS custom properties such as:
  - `--primary`, `--accent`, `--correct`, `--incorrect`, `--background`
  - `--card-background`, `--text-color`, `--text-secondary`

### Per-challenge Styles

Add `styles.css` inside your challenge folder and reference it via `"stylesPath"` in the catalog. Great for:
- Subtle brand tweaks
- Replacing fonts
- Adjusting the rosco size for a kiosk screen
- etc.

---

## 🎮 Controls & UI

- **Enter**: Submit current answer
- **Submit / Pass**: Big buttons with white icons
- **Hint**: Green bulb icon (first letter + length)
- **Sticky action bar** (mobile): input + buttons pinned to the bottom; automatically moves above the on-screen keyboard
- **Timer**: Pill at top; turns urgent in the last minute
- **Results**: Breakdown + PDF export

---

## 🧠 Fuzzy Matching (Configurable)

Defined under `gameSettings.fuzzyMatching`:

```json
{ "enabled": true, "threshold": 0.8, "maxDistance": 2 }
```

- Exact match always passes.
- Otherwise uses Levenshtein distance & similarity ratio.
- A small "Close!" hint appears if the answer is near the threshold.

---

## 🏆 Scoring

In `gameSettings.scoring`:

```json
{
  "correct": 3,
  "incorrect": -2,
  "pasapalabra": -1,
  "timeBonus": {
    "threshold": 10,
    "levels": [
      { "maxTime": 120, "bonus": 30 },
      { "maxTime": 180, "bonus": 20 },
      { "maxTime": 240, "bonus": 10 }
    ]
  }
}
```

- Optional `penalizeUnanswered` (if true, unanswered count as incorrect when time ends).

---

## 🧪 Tips & Troubleshooting

- **Bulb not green?** Ensure any inline `.hint-icon` rule sets `color: var(--correct)` and the SVG uses `stroke="currentColor"`. Remove older grey overrides if present.
- **Duplicate inputs?** Only the sticky action bar should contain `#answer`. If you kept the in-content input for desktop, use a different id (`#answerTop`) or remove it to avoid duplication.
- **Buttons too wide on mobile?** They're constrained to a max width inside the sticky bar; tweak the `.actionbar .btn-row max-width` if needed.
- **PDF not saving?** Confirm jsPDF CDN is loading and no CSP blocks it.

---

## 🔐 Deployment Notes

- Static hosting is fine (GitHub Pages, Netlify, S3, etc.).
- Use HTTPS in production.
- If you enable path routing (`pathBase`), deploy the app under that base path (e.g. `/game`) and ensure your host serves `index.html` for nested routes (or use the query-param mode).

---

## 🤝 Contributing

- Keep `catalog.json` backward-compatible.
- Test challenges on mobile (sticky bar + keyboard).
- Prefer per-challenge overrides over editing global styles where possible.

---

## 📄 License

Provided as-is for corporate training and education. Customize and distribute within your organization.

---

**That's it!** Create a folder under `challenges/`, wire it up in `catalog.json`, and you've got a new challenge ready to go.