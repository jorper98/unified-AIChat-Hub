# Unified Chat Hub

## Version 0.3.7

### About
Unified Chat Hub is a self-hosted (Local or Docker) workspace that provides a unified interface for interacting with multiple LLM models within the same chat (Thread). You can search across all chats and track the tokens and costs of your interactions. It relies on OpenRouter, featuring an intelligent intent router that classifies queries and routes them to different tools or your directly selected LLM response.

### Why Use This?
- **Unified Workspace**: Tired of juggling different web and native OS applications? Keep everything in one simple, consolidated interface.
- **Model Agnostic**: Use different LLMs based on your current task, or seamlessly switch when you hit the usage limits of free versions. Try new models as soon as they come out.
- **No Vendor Lock-in**: Maintain your freedom to choose. Rely on OpenRouter for broad access or connect your own custom providers.
- **Local Model Support**: Seamlessly integrate and use your locally hosted models (e.g., via Ollama or LLM Studio) alongside cloud APIs.
- **Persistent Context & Memory**: Never re-enter your style, preferences, or memory every time you switch tools or models. Your system instructions and thread history stay with you.
- **Consolidated Search**: Never forget which chatbot or tool you used for specific research. Search across all your chat threads in one place.
- **Transparent Cost Tracking**: Track token usage and costs per session, per model, and overall, so you always know exactly what you are spending.

### Features
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

### Technical Stack
- **Frontend**: Next.js 14.1.4, React 18.2.0, TypeScript 5.4.3
- **Styling**: Tailwind CSS 3.4.1
- **Database**: MongoDB 6.5.0
- **API Integration**: OpenRouter, Perplexity Sonar
- **Router Model**: OpenAI GPT-4o Mini (structured JSON classification)
- **Container Support**: Docker

---

### ⚠️ Security Notice
**This application is designed for private, self-hosted environments.** It does not include built-in user authentication or access controls. It should **not** be exposed directly to the public internet without proper network-level security, such as a reverse proxy (e.g., Nginx, Traefik), a VPN, or a secure tunnel (e.g., Cloudflare Tunnel), along with appropriate firewall rules.

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


### Quick-Start Deployment Instructions

#### 1. Configure Environment Variables
Create a `.env` file in the project root:

```env
OPENROUTER_API_KEY=sk-or-v1-your_actual_token_string_here
MONGODB_URI=mongodb://mongo_db:27017/chathub

# Public URL of the application (used for OpenRouter rate-limit attribution and absolute URLs)
# Update the port if you change the docker-compose port mapping (default is 3031)
NEXT_PUBLIC_APP_URL=http://localhost:3031

# Host port for running tests from the host machine (matches the left side of docker-compose port mapping)
HOST_PORT=3031

# Timezone for date/time display (IANA format)
TIMEZONE=America/Phoenix

# Location for weather injection (city name, zip code, or coordinates)
# Leave empty to disable weather. You can ask about any location: "weather in Paris"
WEATHER_LOCATION=Phoenix, AZ
```
*Note: Perplexity Sonar uses your existing `OPENROUTER_API_KEY` with the model `perplexity/sonar`. No separate API key is required.*

#### 2. Build and Start the Stack
From the root `unified-chat` directory, run:

```powershell
docker compose up --build
```

Once the build completes, open your browser to:
http://localhost:3031

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
*Built with Next.js and powered by OpenRouter*