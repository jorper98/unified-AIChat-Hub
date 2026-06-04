# Unified Multimodal Sandbox Workspace

A self-hosted, private AI development workspace and model playground built with **Next.js 14**, **Tailwind CSS**, and **MongoDB**.

This workspace securely anchors conversational prompt stream history and configurations entirely within local Docker volumes, orchestrating connections to a highly curated roster of premium model endpoints via OpenRouter.

---

# Release Information

**Current Sandbox Tracking Release:** `v0.1.5`
---

## Key Architecture & Features

### 🖼️ Text-to-Image Generation & Smart Context Optimization
Full support for text-to-image models (e.g., Gemini 3.1 Flash Image, Flux Pro, SDXL). When an image is generated:
- The base64 payload is automatically extracted from the API response
- Images are saved to the `public/images/` folder with unique filenames
- The chat message stores only a lightweight markdown link instead of the raw base64 string
- This keeps context windows clean and eliminates token bloat from large image payloads
- Images render directly in the chat from saved files on subsequent loads

### 🚀 Dynamic Mid-Stream Model Hot-Swapping
Switch seamlessly between premium models (e.g., GPT-4o, Claude 3.5 Sonnet, DeepSeek Chat, Gemini Pro) inside the *same active conversation thread*. Every response is stamped with the exact model that generated it.

### ⚙️ Persistent Settings Panel
Toggle visibility and customize the layout/priority order of models inside the main interface dropdown menu. Preferences are stored directly in MongoDB.

### 🗂 Local Chat Logging & Vectorized Retrieval
Retains multi-tenant message payloads locally with explicit support for indexing conversation paths.

### 🔍 Global Message Search Logs
Real-time keyword filtering across your database cluster, enabling instant search of historical chats directly from the sidebar.

###  Backup & Restore
Full data backup and restore via Settings → Backup & Restore panel. Exports a ZIP file containing:

**Backup Contents:**
- `data.json` — All database collections (threads, messages, model settings, saved prompts, theme colors, global system prompt)
- `images/` — All generated images from `public/images/` folder

**Restore Process:**
1. Download a backup ZIP file from the Export section
2. In the Restore section, choose a mode:
   - **Replace All** — Deletes all existing data, then restores everything from the backup
   - **Merge Only** — Skips items that already exist (by ID), only adds new ones
3. Select the backup ZIP file — data and images are restored automatically
4. The page reloads to reflect the restored data

### 🌍 Global System Prompt & Dynamic Context
A system-wide prompt injected into EVERY chat session, separate from per-thread instructions:
- Set custom global instructions in Settings → Global System Prompt
- Current date/time is automatically injected (timezone-aware via `TIMEZONE` env var)
- Weather is fetched on-demand when you ask about it (via `WEATHER_LOCATION` env var, uses wttr.in)
- Both apply to all models and all conversations

### 🔍 Perplexity Sonar Fallback & Auto-Continue
When the model expresses uncertainty ("I don't know", "I can't access", etc.), Perplexity Sonar is automatically queried via OpenRouter:
- **Automatic fallback** — 35 uncertainty patterns detected, Perplexity answers replace the uncertain response
- **Recheck trigger** — Say "recheck with Perplexity", "ask Perplexity", "search the web", etc. to force a Perplexity lookup
- **Auto-continue mode** — After a recheck, follow-ups automatically go through Perplexity with full conversation history
- **Exit mode** — Say "switch back", "exit perplexity", "back to normal" to return to the regular model
- **Cost tracking** — Perplexity usage shown as a separate row in the CostCalculator ($)
- No separate API key needed — uses your existing `OPENROUTER_API_KEY`

### 📦 Automated Sandbox Backup Daemon
An isolated secondary database container automatically performs `mongodump` snapshot extractions every 24 hours and stores them on the host disk under:

```text
./backups
```

---

## Technical Stack Architecture

| Component | Technology |
|------------|------------|
| UI & Backend API Core | Next.js 14 (App Router) + TypeScript |
| Database Layer | MongoDB 6.0 Community Edition |
| Styling Framework | Tailwind CSS 3.4 + PostCSS |
| Container Orchestration | Docker Compose + Node.js 18 Alpine |
| Network Binding | Local host virtualization on port `3031` |

---

## Directory Blueprint

```text
unified-chat/
├── .env                              # Local API tokens & connection strings
├── .env.sample                       # Template with all configurable variables
├── Dockerfile                        # Single-stage Node compiler engine
├── docker-compose.yml                # Multi-container service definitions
├── package.json                      # Runtime dependencies
├── postcss.config.js                 # Tailwind compilation driver
├── tailwind.config.js                # Style layer specifications
├── version.txt                       # Deployment version tag
├── README.md                         # Project documentation
└── src/
    ├── lib/
    │   ├── db.ts                     # MongoDB connection pool manager
    │   ├── context.ts                # Dynamic context builder (date/time/weather)
    │   ├── perplexity.ts             # Perplexity fallback/recheck utility
    │   └── tokens.ts                 # Token estimation & formatting utilities
    ├── config/
    │   └── models.json               # Default model catalog & provider config
    └── app/
        ├── globals.css               # Tailwind CSS bindings
        ├── layout.tsx                # Global HTML layout shell
        ├── page.tsx                  # Main chat workspace interface
        ├── settings/
        │   └── page.tsx              # Configuration dashboard
        ├── components/
        │   ├── CostCalculator.tsx    # Thread cost breakdown modal
        │   ├── MarkdownRenderer.tsx  # Markdown rendering with code highlighting
        │   └── RawDataModal.tsx      # Raw data inspection modal
        └── api/
            ├── chat/                 # OpenRouter routing endpoint + Perplexity fallback
            ├── settings/             # Persist dropdown settings + global system prompt
            ├── threads/              # Sidebar listings & search
            └── threads/[id]/messages/
                                        # Historical message loading
```

---

# Quick-Start Deployment Instructions

## 1. Configure Environment Variables

Create a `.env` file in the project root:

```env
OPENROUTER_API_KEY=sk-or-v1-your_actual_token_string_here
MONGODB_URI=mongodb://mongo_db:27017/chathub

# Timezone for date/time display (IANA format)
TIMEZONE=America/Phoenix

# Location for weather injection (city name, zip code, or coordinates)
# Leave empty to disable weather. You can ask about any location: "weather in Paris"
WEATHER_LOCATION=Phoenix, AZ

# Perplexity via OpenRouter - no separate API key needed!
# Uses your existing OPENROUTER_API_KEY with model: perplexity/sonar
```

---

## 2. Build and Start the Stack

From the root `unified-chat` directory, run:

```powershell
docker compose up --build
```

Once the build completes, open:

```text
http://localhost:3031
```

or click:

👉 http://localhost:3031

---

# Maintenance & Infrastructure Controls

## Automated Database Backups

Backups run automatically every 24 hours.

Snapshots are exported from the database container and stored on the host filesystem using the following structure:

```text
./backups/YYYY-MM-DD_HH-MM/
```

---

## Rebuilding After Configuration Changes

If you modify:

- `.env`
- `package.json`
- `docker-compose.yml`
- Directory structure
- Build configuration

rebuild the stack using:

```powershell
docker compose down --remove-orphans
docker compose up --build
```

---

