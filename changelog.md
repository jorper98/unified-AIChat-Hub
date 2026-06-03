# Changelog

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
