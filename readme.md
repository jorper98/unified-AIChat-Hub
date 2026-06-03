# Unified Multimodal Sandbox Workspace

A self-hosted, private AI development workspace and model playground built with **Next.js 14**, **Tailwind CSS**, and **MongoDB**.

This workspace securely anchors conversational prompt stream history and configurations entirely within local Docker volumes, orchestrating connections to a highly curated roster of premium model endpoints via OpenRouter.

---

# Release Information

**Current Sandbox Tracking Release:** `v0.0.9`
---

## Key Architecture & Features

### 🚀 Dynamic Mid-Stream Model Hot-Swapping
Switch seamlessly between premium models (e.g., GPT-4o, Claude 3.5 Sonnet, DeepSeek Chat, Gemini Pro) inside the *same active conversation thread*. Every response is stamped with the exact model that generated it.

### ⚙️ Persistent Settings Panel
Toggle visibility and customize the layout/priority order of models inside the main interface dropdown menu. Preferences are stored directly in MongoDB.

### 🗂 Local Chat Logging & Vectorized Retrieval
Retains multi-tenant message payloads locally with explicit support for indexing conversation paths.

### 🔍 Global Message Search Logs
Real-time keyword filtering across your database cluster, enabling instant search of historical chats directly from the sidebar.

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
├── Dockerfile                        # Single-stage Node compiler engine
├── docker-compose.yml                # Multi-container service definitions
├── package.json                      # Runtime dependencies
├── postcss.config.js                 # Tailwind compilation driver
├── tailwind.config.js                # Style layer specifications
├── version.txt                       # Deployment version tag
├── README.md                         # Project documentation
└── src/
    ├── lib/
    │   └── db.ts                     # MongoDB connection pool manager
    └── app/
        ├── globals.css               # Tailwind CSS bindings
        ├── layout.tsx                # Global HTML layout shell
        ├── page.tsx                  # Main chat workspace interface
        ├── settings/
        │   └── page.tsx              # Configuration dashboard
        └── api/
            ├── chat/                 # OpenRouter routing endpoint
            ├── settings/             # Persist dropdown settings
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

