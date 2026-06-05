# Changelog

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
