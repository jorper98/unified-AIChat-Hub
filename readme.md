# Unified Chat Hub

## Version 0.4.0

### About
Unified Chat Hub is a self-hosted (Local or Docker) workspace that provides a unified interface for interacting with multiple LLM models within the same chat (Thread). You can search across all chats and track the tokens and costs of your interactions. It relies on OpenRouter, featuring an intelligent intent router that classifies queries and routes them to different tools or your directly selected LLM response.

---

### 🔐 New: Multi-User Authentication
This version introduces strict multi-user authentication. All access requires a valid, verified account. Each user has isolated data (threads, messages, settings) and manages their own encrypted OpenRouter API key. Existing data can be migrated to a default Admin account using the included migration script.

### Why Use This?
- **Unified Workspace**: Tired of juggling different web and native OS applications? Keep everything in one simple, consolidated interface.
- **Model Agnostic**: Use different LLMs based on your current task, or seamlessly switch when you hit the usage limits of free versions. Try new models as soon as they come out.
- **No Vendor Lock-in**: Maintain your freedom to choose. Rely on OpenRouter for broad access or connect your own custom providers.
- **Local Model Support**: Seamlessly integrate and use your locally hosted models (e.g., via Ollama or LLM Studio) alongside cloud APIs.
- **Persistent Context & Memory**: Never re-enter your style, preferences, or memory every time you switch tools or models. Your system instructions and thread history stay with you.
- **Consolidated Search**: Never forget which chatbot or tool you used for specific research. Search across all your chat threads in one place.
- **Transparent Cost Tracking**: Track token usage and costs per session, per model, and overall, so you always know exactly what you are spending.

### Features
- **Strict Multi-User Authentication**: Secure registration, email verification, login with 24-hour "remember me", and clean logout flow.
- **Per-User Data Isolation**: Threads, messages, settings, and prompts are strictly isolated by user ID. Users cannot see each other's data.
- **Individual API Key Management**: Each user securely stores their own encrypted OpenRouter API key. Admins can optionally use a global fallback key.
- **Admin User Management**: Dedicated admin dashboard to view users, force password resets, and delete accounts (with safe cascade deletion of their data).
- **Multi-model support**: Via OpenRouter integration (GPT-4o, Claude, Gemini, DeepSeek, Qwen, MiniMax, Kimi, or any other available there).
- **Custom providers**: Ability to use other providers including local models.
- **Persistent context**: Maintained within the chat session (thread) while changing models.
- **Persistent chat history**: With search functionality across threads.
- **Custom system prompts**: With save and load capabilities.
- **Dynamic system instructions**: Ability to create, edit, save, and switch system instructions within a chat (thread).
- **Thread management**: Including archiving and organization.
- **Real-time token estimation and cost tracking**: Covering model, router, and Perplexity costs.
- **Robust image extraction**: Replaced fragile regex chains with recursive JSON parsing for reliable multimodal response handling.
- **Dynamic context settings**: Timezone and default weather location configurable directly from the Settings UI (no server restart required).
- **Modular component design**: For improved maintainability and performance.
- **Intelligent intent router**: Classifier routes queries to web_search, image generation, direct_reply, and other routes (utilizing user-configured LLM like GPT-4o, Gemini Lite, or other).
- **Web search**: Via Perplexity Sonar with XML context injection and clickable source citations.
- **LLM Only mode**: Bypass router and context injection for pure model interaction.
- **Server logs**: Persistent file-based logging with a standalone popup viewer.
- **Dark/light theme support**.
- **Backup & Restore**: With ZIP export/import capabilities.
- **Docker deployment**: Able to fully deploy via Docker container with the option to place data on a local folder.
- **In-app automated testing**: One-click UI testing in Settings to verify routing, context injection, and API integrations.
- **Environment-aware configuration**: Dynamic URL and port handling for seamless local, Docker, and production deployments.
- **Reliable image serving in production**: API-based image delivery bypasses static file caching for immediate display.
- **Increased backup capacity**: Backup file size limit raised to 500MB for larger data exports.
- **Over-The-Air (OTA) Updates**: Built-in update mechanism to download and apply new versions directly from a GitHub Release zip URL via the About modal, with automatic dependency syncing.
- **Customizable theme colors**: Fully configurable dark and light mode colors including background, surface, text, accent, border, and secondary/tertiary backgrounds via the Settings UI.
- **OpenRouter Model Browser**: Built-in UI in Settings to easily browse, search, and select from available OpenRouter models when adding or editing models.
- **SMTP Email Testing**: Dedicated one-click test button in Settings to verify your email configuration before relying on it for user verification and password resets.

### Technical Stack
- **Frontend**: Next.js 14.1.4, React 18.2.0, TypeScript 5.4.3
- **Styling**: Tailwind CSS 3.4.1
- **Database**: MongoDB 6.5.0
- **API Integration**: OpenRouter, Perplexity Sonar
- **Router Model**: OpenAI GPT-4o Mini (structured JSON classification)
- **Container Support**: Docker

---

### ⚠️ Security Notice
**This application now includes robust, built-in multi-user authentication and strict data isolation.** It is designed to be secure, but should still be hosted in trusted environments with standard network-level security (e.g., reverse proxy, VPN, or Cloudflare Tunnel) and proper firewall rules.

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
│   ├── test-routing.ts               # CLI automated routing test script
│   ├── migrate-admin.ts              # Migrates existing global data to a default Admin user
│   └── reset-admin.ts                # Resets or creates the default Admin account credentials
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
            ├── auth/                   # Authentication endpoints (register, verify, login, logout, me)
            ├── admin/                  # Admin-only endpoints (user management, password resets)
            ├── chat/route.ts           # Main chat routing endpoint + Perplexity fallback
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


### Quick-Start Deployment Instructions

#### 1. Configure Environment Variables
Create a `.env` file in the project root:

```env
OPENROUTER_API_KEY=sk-or-v1-your_actual_token_string_here # Optional: Fallback if user doesn't set their own
MONGODB_URI=mongodb://localhost:27017/chathub

# Authentication & Security
JWT_SECRET=your-super-secret-jwt-key-change-in-production
ENCRYPTION_KEY=exactly-32-bytes-long-key-required!!

# Email Configuration (Gmail SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_gmail_app_password
SMTP_FROM="Unified Chat Hub" <no-reply@unifiedchat.com>

# Public URL of the application (used for OpenRouter rate-limit attribution and absolute URLs)
NEXT_PUBLIC_APP_URL=http://localhost:3031

# Host port for running tests from the host machine
HOST_PORT=3031

# Timezone for date/time display (IANA format)
TIMEZONE=America/Phoenix

# Location for weather injection
WEATHER_LOCATION=Phoenix, AZ
```
*Note: Perplexity Sonar uses your existing `OPENROUTER_API_KEY` with the model `perplexity/sonar`. Users can also configure their personal API key in Settings.*

#### 1.5. Migrate Existing Data (Optional)
If you have existing data in your database, run the migration script to assign it to a default Admin user:
```powershell
npx tsx scripts/migrate-admin.ts
```
This creates an Admin account (email: `admin@localhost`, password: `admin123456`) and reassigns all global threads, messages, and settings to this user. Change the admin credentials in the script or via environment variables (`ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME`) before running.

#### 2. Build and Start the Stack
From the root `unified-chat` directory, run:

```powershell
docker compose up --build
```

Once the build completes, open your browser to:
http://localhost:3031

Note: If you want to run the dev environment, use 
npm run dev

---

### Maintenance & Infrastructure Controls

#### Rebuilding After Configuration Changes
If you modify `.env`, `package.json`, `docker-compose.yml`, or the directory structure, rebuild the stack using:

```powershell
docker compose down --remove-orphans
docker compose up --build
```

#### Over-The-Air (OTA) Updates
To update the application without rebuilding the Docker image:
1. Ensure your `UPDATE_ZIP_URL` is configured in your `.env` file (e.g., pointing to a GitHub Release asset: `https://github.com/your-username/unified-chat/releases/latest/download/unified-chat-latest.zip`).
2. Open the app, click the **About** icon, and click the **🔄 Update** button.
3. The container will download the zip, extract it, run `npm install`, and copy the new files.
4. **Important**: Restart the container (`docker compose restart web-app`) after the update completes to ensure all changes and new dependencies are fully applied.

*Note: Your local `.env`, `data/`, and `backups/` directories are automatically preserved during this process.*

#### Automated Database Backups
Backups run automatically every 24 hours. Snapshots are exported from the database container and stored on the host filesystem under:
`./backups/YYYY-MM-DD_HH-MM/`

---

### Author
Jorge Pereira  
35sites.com LLC  
Website: [https://35sites.com/applications/unified-aichat-hub/](https://35sites.com/applications/unified-aichat-hub/)  
Repository: [https://github.com/jorper98/unified-AIChat-Hub](https://github.com/jorper98/unified-AIChat-Hub)

### License
Copyright (c) 2026 Jorge Pereira (35sites.com LLC). Licensed under the MIT License.

---
