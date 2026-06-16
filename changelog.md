# Changelog

## v0.4.9
- Added independent Import/Export for Models & Providers configuration, allowing users to back up and restore their model settings separately from general data.
- Fixed duplicate "Model ID" field in the model add/edit modal; replaced with "Model Display Name".

## v0.4.8
- Fixed backup export corruption ("No END header found") by switching ZIP generation to `Uint8Array`.
- Fixed backup export to correctly read and package images from the user-specific folder (`public/images/{userId}/`).
- Fixed backup import to restore images into the currently logged-in user's specific folder, ensuring strict data isolation.

## v0.4.7
- Defaulted application theme to light mode, including the Login and Register pages.
- Restricted server logs access to admin users only (returns 403 Forbidden for non-admins).
- Added 15 free API calls for new users using the master OpenRouter key before requiring them to configure their own key in Settings.
- Added a visual credit badge in the sidebar showing remaining free uses for non-admin users, with instant UI updates after each message.
- Fixed "Go to Settings" button in API Key warning to navigate directly to the Utility LLMs tab.
- Fixed API key clearing bug where empty strings were ignored instead of removing the key from the database.
- Fixed Global Cost Breakdown to strictly filter by the current user's ID for proper data isolation.
- Implemented user-specific image folders (`public/images/{userId}/`) to ensure image gallery data isolation.
- Added admin capability to traverse and view other users' image folders via a dropdown in the Image Gallery modal.
- Fixed image generation crash caused by missing `userId` parameter in the response parser.
- Removed unnecessary console logs from CostCalculator for a cleaner development experience.

## v0.4.4
- Fixed login on HTTP deployments by replacing `NODE_ENV === 'production'` cookie Secure flag with `SECURE_COOKIE` environment variable.
- Changed email verification API to return JSON responses instead of server-side redirects, fixing client-side fetch handling in `VerifyEmailClient`.
- Bumped version to 0.4.4.

## v0.4.3
- Fixed EACCES permission errors on mounted volumes by removing restrictive non-root user in Docker runtime stage.
- Bumped version to 0.4.5.

## v0.4.4
- Fixed login on HTTP deployments by replacing NODE_ENV === 'production' cookie Secure flag with SECURE_COOKIE environment variable.
- Changed email verification API to return JSON responses instead of server-side redirects, fixing client-side fetch handling in VerifyEmailClient.
- Fixed SECURE_COOKIE documentation in .env.example and removed deprecated OTA update fields.
- Bumped version to 0.4.4.

## v0.4.3
- Replaced Over-The-Air (OTA) in-app update mechanism with pre-built Docker image deployment workflow.
- Migrated deployment process to GitHub Actions for automated build and push to GitHub Container Registry.
- Restructured `package-for-deploy.ps1` to act as a release orchestrator (version bumping and git tagging).
- Updated About modal to display Docker update instructions instead of in-app apply button.
- Optimized Dockerfile to use multi-stage builds and Next.js `standalone` output, significantly reducing production image size by excluding dev dependencies, source code, and build artifacts. Switched to Node.js 20 Alpine base image.
- Simplified GitHub Actions workflow to use raw Docker CLI for reliable builds and transparent error output.
- Fixed email verification API to return JSON responses instead of server-side redirects, fixing client-side fetch handling.
- Replaced `NODE_ENV === 'production'` cookie security check with `SECURE_COOKIE` environment variable for HTTP-compatible deployments.
- Bumped version to 0.4.2.

## v0.4.1
- Security and other improvements.

## v0.4.0
- Added full authentication system with user registration, email verification, secure login, and "remember me" for 24 hours.
- Strict per-user data isolation: threads, messages, and settings are now isolated by user ID.
- User-specific OpenRouter API key management with AES-256-GCM encryption at rest.
- Added Admin user management interface to list and delete users.
- Integrated NodeMailer with Gmail SMTP for email delivery and Cloudflare Turnstile support for anti-spam.
- Created data migration script (`scripts/migrate-admin.ts`) to safely migrate existing global data to a default Admin user.
- Bumped version to 0.4.0.

## v0.3.15
- Enhanced OTA update script to perform a thorough cleanup (`package-lock.json` deletion, `npm cache clean --force`, and `node_modules/.cache` removal), ensuring pristine dependency resolution and preventing stale Webpack module errors during production updates.
- Bumped version to 0.3.15.

## v0.3.14
- Chat input changed from single-line input to auto-expanding textarea: Enter inserts CRLF, message only sends via Dispatch button click
- `{ }` Raw Data button moved to stats row next to `$` cost indicator, styled as compact bordered box
- `{ }` and `$` buttons styled consistently with matching `text-[9px]` monospace font and border boxes
- Stats row font increased from `10px` to `12px` for better readability
- LLM Only (LLM Only/bypass router) reduced to compact toggle icon button with clear on/off visual states and hover feedback
- Added MongoDB connection check with 3-second timeout and clear "DB server not found" error message in UI and console
- System Instructions field shows first 100 characters as truncated preview; click to expand into an auto-growing textarea
- System Instructions edit textarea in Load System Prompt modal now also auto-expands while typing
- Bumped version to 0.3.14.

## v0.3.13
- Fixed OTA update script to clear `node_modules` before `npm install`, preventing stale module resolution errors during updates.
- Bumped version to 0.3.13.

## v0.3.12
- Fixed local model response parsing to support OpenAI-compatible formats (e.g., FastFlowLM, LM Studio) alongside Ollama formats.
- Bumped version to 0.3.12.

## v0.3.11
- Added red Info Sign (i) indicator in the sidebar when an update is available.
- Replaced native alert with a dedicated Update Modal showing current version, new version, changelog, and an apply button.
- Updated deployment script to run `npm install` and `npm run build` before packaging when the `-Release` flag is used.
- Bumped version to 0.3.11.

## v0.3.8
- Fixed frontend state desync: UI model dropdown now correctly syncs with the thread's saved `currentModel` upon loading.
- Added `identity_query` router classification to prevent context priming. Standalone identity questions (e.g., "Who are you?") now automatically strip conversation history before sending to the model.
- Injected `modelUsed` metadata into assistant message history, enabling the LLM to accurately read and report which models were used in a thread.
- Refined router logic with strict negative constraints to prevent false positives (e.g., misclassifying history questions as image generation or identity queries).
- Fixed `RangeError` crash in Settings page preview when typing incomplete/invalid timezones by adding safe validation fallback.
- Bumped version to 0.3.8.

## v0.3.7
- Fixed backup/restore: corrected collection name mismatch to ensure saved system prompts (multiple system instructions) are properly exported and imported.
- Bumped version to 0.3.7.

## v0.3.6
- Improved OTA update reliability: added `npm run build` step to ensure production `.next` folder is correctly compiled after file extraction.
- Enhanced deployment packaging script to ensure `.next` folder is included in release artifacts.
- Added detailed logging to the OTA update UI to display step-by-step progress and troubleshooting information.
- Bumped version to 0.3.6.

## v0.3.5
- Added detailed logging to the OTA update UI to display step-by-step progress and troubleshooting information.
- Bumped version to 0.3.5.

## v0.3.4
- Fixed Over-The-Air (OTA) update script: resolved `SyntaxError` by wrapping top-level `await` in an async function.
- Fixed OTA update script to properly handle HTTP 302 redirects from GitHub release assets using native `fetch`.
- Fixed OTA update script to correctly handle flat ZIP file structures without throwing `ENOTDIR` errors.
- Updated OTA update script to include `.next` and `node_modules` in the deployment package, ensuring compiled production code is properly overwritten during updates.
- Added `devnotes` folder and files starting with `old` to the deployment packaging exclusion list to keep release artifacts clean.
- Configured OTA update process to automatically trigger a Docker container restart upon successful completion (leveraging `restart: unless-stopped`).
- Bumped version to 0.3.4.

## v0.3.3
- Bumped version to 0.3.3.
- Changed about.md to test the OTA update process.

## v0.3.2
- Added customizable BG Secondary and BG Tertiary colors to Settings > Theme Colors, allowing users to control assistant message bubble backgrounds and hover states in both dark and light modes.
- Fixed light mode text visibility: made `prose-invert` conditional in MarkdownRenderer so message text renders correctly in light mode.
- Fixed CSS variable fallbacks on initial page load so theme colors apply before settings are fetched from the database.
- Unified assistant message bubble background to use `--bg-secondary` in both dark and light modes for consistent theming.
- Updated footer link to point directly to the application page (35sites.com/applications/unified-aichat-hub/).
- Bumped version to 0.3.2.

## v0.3.1
- Added Over-The-Air (OTA) update feature: container can now download and apply updates directly from a configured GitHub Release zip URL.
- Added "Update" button in the About modal to trigger the OTA update process with visual feedback.
- Created `scripts/update-app.js` to handle secure zip download, extraction, dependency sync (`npm install`), and file copying while preserving local data (`.env`, `data`, `backups`).
- Added `UPDATE_ZIP_URL` environment variable configuration for custom update source targeting.
- Updated `Dockerfile` to include `curl` and `unzip` utilities for enhanced container debugging and update support.
- Bumped version to 0.3.1.

## v0.3.0
- Added prominent security notice to documentation emphasizing self-hosted, private environment deployment requirements
- Updated all website and repository references to point to the official application page and GitHub repository
- Bumped version to 0.3.0

## v0.2.8
- Fixed critical DB connection race condition: wrapped connection promise in `try...finally` to prevent permanent rejection caching on failure
- Replaced dynamic import with static import for `getDb` in chat route for better performance and standard Next.js practices
- Added `predev` and `prestart` scripts to log application version on startup, complying with developer guidelines
- Added `lint` and `typecheck` scripts to enforce code quality standards
- Enhanced automated testing documentation in `docs.md` to clearly document CLI and in-app testing
- Bumped version to 0.2.8

## v0.2.7
- Fixed Next.js production image caching issue: new API route (`/api/images/[filename]`) serves images dynamically, bypassing static file cache
- Added rewrite rule in `next.config.js` to redirect `/images/*` requests to the new API route
- Increased backup file size limit from 50MB to 500MB in import API route
- Added `chat_images` bind mount volume to `docker-compose.prod.yml` for persistent image storage
- Added startup `chmod` command in production Docker config to fix image file permissions
- Bumped version to 0.2.7

## v0.2.6
- Made test script environment-aware: auto-detects Docker vs Host and supports `HOST_PORT` override for seamless multi-environment testing
- Made OpenRouter `HTTP-Referer` headers dynamic using `NEXT_PUBLIC_APP_URL` for accurate production rate-limit attribution
- Removed `ROUTER_TIMEOUT_MS` and `PERPLEXITY_TIMEOUT_MS` from `.env.sample` (now handled by app defaults/settings)
- Added `NEXT_PUBLIC_APP_URL` and `HOST_PORT` to `.env.sample` for flexible custom port and URL configuration
- Bumped version to 0.2.6

## v0.2.5
- Fixed light mode support for Global Cost Breakdown and Image Gallery modals
- Moved sidebar icons to second line (right-aligned), version number next to title
- Made APP_VERSION dynamic by importing from package.json
- Updated license to MIT across readme.md, About.md, and created license.md
- Added favicon.ico to fix 404 error
- Added Roadmap.md for development tracking

## v0.2.4
- Added Global Cost Breakdown modal to view aggregated token usage and costs across Active, Archived, and All chats
- Added Image Gallery modal to browse, view, download, and delete generated images in `/public/images`
- Added dedicated API routes for cost aggregation and image management

## v0.2.3
- Added in-app "Automated Testing" UI in Settings to run end-to-end routing and context tests with one click
- Fixed backup/restore ObjectId parsing errors to safely handle both hex IDs and string IDs (like "global_settings")
- Fixed backup restore file picker to correctly accept `.zip` files
- Enhanced deployment packaging script to exclude `.env` and `.kilo` for security and cleaner transfers
- Added `next.config.js` with `ignoreBuildErrors: true` to ensure smooth Docker production builds

## v0.2.2
- Refactored monolithic 834-line chat route into 4 focused, modular libraries (`thread.ts`, `model-providers.ts`, `image-processing.ts`, `response-parser.ts`)
- Replaced fragile, overlapping regex chains for image extraction with a robust, recursive JSON parsing approach
- Added automated routing test script with randomized prompts and timestamped thread naming for reliable end-to-end verification
- Migrated `TIMEZONE` and `WEATHER_LOCATION` configuration from `.env` to the database-backed Settings UI

## v0.2.1
- Added automated routing test script (`npm run test:routing`) with randomized prompts for weather, stocks, and image generation
- Test runs now create cleanly named, timestamped threads (e.g., "Test Run: YYYYMMDD-HHMMSS") for easy identification
- Migrated `TIMEZONE` and `WEATHER_LOCATION` configuration from `.env` to the database-backed Settings UI for dynamic, no-restart updates
- Fixed router JSON parsing failures for image generation by increasing `max_tokens` and adding robust regex fallbacks for truncated responses
- Fixed missing time injection in system context prompt (was calculating `timeStr` but not including it in the output)

## v0.2.0
- Refactored monolithic 1273-line main page component into 11 focused, modular components for improved maintainability and readability
- Extracted shared TypeScript interfaces into `src/types.ts` and utility functions into `src/lib/utils.ts`
- Decomposed UI into dedicated components: `ThreadSidebar`, `MessageArea`, `ChatInput`, `PromptModal`, `ArchiveModal`, `DeleteConfirmModal`, `AboutModal`, `ReadmeModal`, and `SettingsModal`
- Reduced main `page.tsx` file size by ~45% (down to 702 lines) while preserving all existing functionality and state management

## v0.1.9
- Added thread and message pagination with configurable limits (25, 50, 100) and "Load More" UI controls to improve performance and reduce memory usage
- Fixed MongoDB connection race condition by implementing a promise-based connection lock to prevent duplicate connections under concurrent load
- Replaced unsafe `as any` type casts with proper TypeScript interfaces (`SettingsDocument`, `ThreadDocument`, `MessageDocument`) for better type safety
- Made router and Perplexity API timeouts configurable via `ROUTER_TIMEOUT_MS` and `PERPLEXITY_TIMEOUT_MS` environment variables
- Removed flawed client-side API secret implementation to prevent security vulnerabilities, deferring to network-level security for self-hosted deployments

## v0.1.8
- Added Settings modal in About page to display current configuration (Models, Providers, Utility LLMs, Global System Prompt, Theme, and Chat/Archive statistics)

## v0.1.7
- Utility LLMs Settings Section: configurable Router LLM and Image Generation LLM via settings UI
- Image Generation Routing: router classifies intent as image_generation and calls dedicated image model
- Router model is now configurable (previously hardcoded to gpt-4o-mini)
- Dynamic pricing for router based on configured model
- Image generation cost tracking in CostCalculator
- Tool use indicators in chat: shows direct, web_search (Perplexity), or image (model-name)
- Web search context truncation and history overflow protection
- Single source of truth for utility model settings (MongoDB)

## v0.1.6
- Intelligent Intent Router: lightweight GPT-4o Mini classifier routes queries to web_search or direct_reply
- Structured JSON schema routing with auto-fallback on timeout/error
- Web search context injection via XML tags (`<web_search_context>`) with source citations
- Dual Perplexity formats: full_answer (factual queries) and snippets (complex/analytical queries)
- Perplexity citation markers replaced with clickable markdown links
- LLM Only mode: checkbox bypass to skip router and all context injection
- Server Logs: persistent file-based logging to `data/logs/server.log` with auto-rotation
- Standalone server logs popup window with live auto-refresh, level filtering, and clear
- Router and Perplexity cost tracking in CostCalculator (routerTokens, routerCost, perplexityTokens, perplexityCost)
- Cost decimal precision increased to 10 decimal places
- Date/time anchor injected into system prompt for real-time awareness

## v0.1.5
- Auto-continue Perplexity mode: after a recheck, follow-ups automatically go through Perplexity
- Perplexity mode persists per-thread in MongoDB (survives page reloads)
- Exit Perplexity mode with: "switch back", "exit perplexity", "stop perplexity", "back to normal", etc.
- Perplexity follow-ups include full conversation history for context-aware responses
- 12 exit trigger phrases detected
- Fixed: userQuery not being added to Perplexity API messages array (caused 500 errors)

## v0.1.4
- Perplexity recheck trigger: say "recheck with Perplexity", "ask Perplexity", "use Perplexity", etc.
- Recheck finds the PREVIOUS user question in thread history and runs it through Perplexity Sonar
- Skips the normal model call when recheck is triggered (saves tokens and time)
- 19 trigger phrases detected (recheck with/using, ask, use, try, search, look it up, etc.)
- Cost tracking works for recheck requests (shown in CostCalculator)

## v0.1.3
- Perplexity API fallback: when the model expresses uncertainty, Perplexity Sonar is queried automatically via OpenRouter
- No separate Perplexity API key needed — uses existing OPENROUTER_API_KEY
- Real-time web search answers injected when the model says "I don't know" or similar
- 35 uncertainty detection patterns (weather, real-time data, browsing, etc.)
- 10-second timeout on Perplexity calls to avoid blocking responses
- Falls back to original response if Perplexity fails
- Perplexity cost tracking in CostCalculator: token usage and cost shown as separate row
- Perplexity Sonar via OpenRouter pricing: $1/1M input tokens, $1/1M output tokens

## v0.1.2
- Global System Prompt feature: custom instructions injected into every chat session
- Dynamic context injection: current date/time (timezone-aware) and weather (via wttr.in)
- New settings section for managing global system prompt
- Environment variables: TIMEZONE and WEATHER_LOCATION for context customization
- Weather API with 3-second timeout (fails gracefully if unavailable)

## v0.1.1
- Theme colors moved from localStorage to MongoDB for full backup/restore coverage
- Backup ZIP now includes dark/light theme color configurations
- Restore process now applies saved theme colors automatically

## v0.1.0
- Text-to-image model support: automatic extraction from OpenRouter/Gemini API responses
- Smart context optimization: base64 images saved to public/images/, replaced with lightweight markdown links
- Image cost tracking in cost calculator (actual OpenRouter costs + image token counts)
- Fixed model dropdown: non-OpenRouter models (Ollama, LLM Studio) now appear correctly
- Settings Model Configuration: single table layout with drag-and-drop row reordering
- Model ID validation: per-row check and validate-all against provider APIs
- Invalid model IDs shown in red with warning indicators
- Model search and provider filter in settings
- Backup & Restore: export all data + images as ZIP, restore with replace or merge mode
- public/images/ folder added to .gitignore

## v0.0.9
- Theme color configuration (customizable dark/light colors with live preview)
- Settings sidebar navigation (Models, Providers, Theme Colors sections)
- OpenRouter as fixed built-in provider (non-editable, auto-configured)
- Custom provider management (add/edit/delete Ollama, LLM Studio, etc.)
- Provider endpoint fallback (uses config defaults when settings endpoint is empty)
- Settings page moved to unified sidebar layout
- Fixed null content errors in message handling
- Fixed hydration mismatch for theme persistence

## v0.0.8
- Prompt name display after model (shows saved prompt used for response)
- System prompt restoration when loading existing threads
- Prompt name persistence across thread loads
- Active prompt indicator badge in UI
- Raw data modal now includes thread metadata and system instructions
- Fixed MongoDB ObjectId serialization for saved prompts API
- System instruction tracking per message in database

## v0.0.7
- Dark/light theme toggle with localStorage persistence
- Chat auto-scrolls to latest response
- Footer font size increased
- Thread metadata (systemInstruction, currentModel, dates) in raw data view
- System instruction shown per message in chat

## v0.0.6
- Smart thread naming from first message content
- Inline thread rename with hover edit button
- Relative date display (e.g., "2h ago") next to thread ID
- Markdown rendering with syntax highlighting for code blocks
- Copy button on assistant responses (hover to reveal)
- Token estimation with context usage bar
- Cost calculator modal with model pricing ($ button)
- Local development support (port 3031, MongoDB in Docker)

## v0.0.5
- Initial commit of unified-chat sandbox
- Next.js 14 app with MongoDB integration
- Dynamic model hot-swapping via OpenRouter
- Persistent settings panel with MongoDB storage
- Global message search across chat history
- Automated database backup daemon via Docker
- Thread management with sidebar history
- Tailwind CSS dark mode UI
