# Unified Multimodal Sandbox Workspace

A self-hosted, private AI development workspace and model playground built with **Next.js 14**, **Tailwind CSS**, and **MongoDB**.

This workspace securely anchors conversational prompt stream history and configurations entirely within local Docker volumes, orchestrating connections to a highly curated roster of premium model endpoints via OpenRouter.

---

# Release Information

**Current Sandbox Tracking Release:** `v0.2.3`
---

## Key Architecture & Features

### 🧪 In-App Automated Testing
A dedicated "Automated Testing" section in the Settings UI allows you to run end-to-end tests with one click. It verifies routing logic, context injection, and API integrations using randomized prompts, displaying clear pass/fail results and saving the test conversation for review.

### 🏗 Backend Modularization
The monolithic chat route has been decomposed into focused, maintainable libraries:
- `thread.ts`: Thread naming and CRUD operations
- `model-providers.ts`: Provider configuration resolution
- `image-processing.ts`: Secure base64 extraction and file saving
- `response-parser.ts`: Robust multimodal response handling

### 🖼️ Robust Image Extraction & Smart Context Optimization
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

### 🛡️ Robust Backup & Restore
Full data backup and restore via Settings → Backup & Restore panel. Exports a ZIP file containing:

**Backup Contents:**
- `data.json` — All database collections (threads, messages, model settings, saved prompts, theme colors, global system prompt, timezone, weather location)
- `images/` — All generated images from `public/images/` folder

**Restore Process:**
1. Download a backup ZIP file from the Export section
2. In the Restore section, choose a mode:
   - **Replace All** — Deletes all existing data, then restores everything from the backup
   - **Merge Only** — Safely skips items that already exist (by ID), only adds new or missing messages to existing threads
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
├── .env                              # Local API tokens & connection strings (excluded from deployment packages)
├── Dockerfile                        # Single-stage Node compiler engine
├── docker-compose.yml                # Multi-container service definitions (development)
├── docker-compose.prod.yml           # Production-ready deployment configuration
├── package.json                      # Runtime dependencies
├── next.config.js                    # Next.js build configuration
├── postcss.config.js                 # Tailwind compilation driver
├── tailwind.config.js                # Style layer specifications
├── tsconfig.json                     # TypeScript configuration
├── readme.md                         # Project documentation
├── todo.md                           # Development task tracking
├── scripts/
│   ├── package-for-deploy.ps1        # Secure deployment packaging script
│   └── test-routing.ts               # CLI automated routing test script
└── src/
    ├── types.ts                      # Shared TypeScript interfaces
    ├── config/
    │   └── models.json               # Default model catalog & provider config
    ├── lib/
    │   ├── context.ts                # Dynamic context builder (date/time/weather)
    │   ├── db.ts                     # MongoDB connection pool manager
    │   ├── image-processing.ts       # Secure base64 extraction and file saving
    │   ├── logger.ts                 # Server-side logging utility
    │   ├── model-providers.ts        # Provider configuration resolution
    │   ├── perplexity.ts             # Perplexity fallback/recheck utility
    │   ├── response-parser.ts        # Robust multimodal response handling
    │   ├── router.ts                 # Intent classification router
    │   ├── thread.ts                 # Thread CRUD and naming operations
    │   ├── tokens.ts                 # Token estimation & formatting utilities
    │   ├── types.ts                  # Database document interfaces
    │   └── utils.ts                  # Shared utility functions (e.g., formatDate)
    └── app/
        ├── globals.css               # Tailwind CSS bindings
        ├── layout.tsx                # Global HTML layout shell
        ├── page.tsx                  # Main chat workspace interface (orchestrator)
        ├── logs/page.tsx             # Server logs viewer
        ├── settings/page.tsx         # Configuration dashboard (includes Automated Testing)
        ├── components/
        │   ├── AboutModal.tsx        # About information modal
        │   ├── ArchiveModal.tsx      # Archived threads modal
        │   ├── ChatInput.tsx         # Message input and model selection
        │   ├── CostCalculator.tsx    # Thread cost breakdown modal
        │   ├── DeleteConfirmModal.tsx# Thread deletion confirmation
        │   ├── MarkdownRenderer.tsx  # Markdown rendering with code highlighting
        │   ├── MessageArea.tsx       # Chat message rendering
        │   ├── PromptModal.tsx       # Saved prompts management modal
        │   ├── RawDataModal.tsx      # Raw data inspection modal
        │   ├── ReadmeModal.tsx       # README viewer modal
        │   ├── SettingsModal.tsx     # Settings viewer modal
        │   └── ThreadSidebar.tsx     # Thread history and search
        └── api/
            ├── chat/route.ts         # Main chat routing endpoint + Perplexity fallback
            ├── logs/route.ts         # Server logs retrieval
            ├── prompts/route.ts      # Saved prompts CRUD
            ├── readme/route.ts       # README file retrieval
            ├── settings/
            │   ├── route.ts          # Settings GET/POST
            │   ├── export/route.ts   # Backup export (ZIP)
            │   └── import/route.ts   # Backup restore (ZIP)
            ├── test/routing/route.ts # In-app automated testing API endpoint
            └── threads/
                ├── route.ts          # Thread listings & search
                ├── [id]/route.ts     # Thread update/delete/archive
                ├── [id]/archive/route.ts # Thread archive toggle
                └── [id]/messages/route.ts # Historical message loading
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

