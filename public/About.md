# Unified Chat Hub

## Version 0.3.8

### About
Unified Chat Hub is a self-hosted (Local or Docker) workspace that provides a unified interface for interacting with multiple LLM models within the same chat (Thread). You can search across all chats and track the tokens and costs of your interactions. It relies on OpenRouter, featuring an intelligent intent router that classifies queries and routes them to different tools or your directly selected LLM response.

### Features

- Multi-model support via OpenRouter integration (GPT-4o, Claude, Gemini, DeepSeek, Qwen, MiniMax, Kimi, or any other available there)
- Ability to use other providers including local models.
- Persistant Context within the chat session (thread) while changing models
- Persistent chat history with search functionality across threads
- Custom system prompts with save/load capabilities
- Ability to create, edit, save and switch system instructions within a chat (thread)
- Thread archiving and management
- Real-time token estimation and cost tracking (model, router, and Perplexity costs)
- Robust Image Extraction: Replaced fragile regex chains with recursive JSON parsing for reliable multimodal response handling
- Dynamic Context Settings: Timezone and default weather location configurable directly from the Settings UI (no server restart required)
- Modular component design for improved maintainability and performance
- Intelligent Intent Router: classifier routes queries to web_search, image generatio,  direct_reply and other routes (utilizing user configured LLM like ChatGPT-4o, Gemini Lite or other)
- Web search via Perplexity Sonar with XML context injection and clickable source citations
- LLM Only mode: bypass router and context injection for pure model interaction
- Server Logs: persistent file-based logging with standalone popup viewer
- Backup & Restore with ZIP export/import
- Able to fully deploy via Docker container with option to place data on local folder
- In-App Automated Testing: One-click UI testing in Settings to verify routing, context injection, and API integrations
- Environment-aware configuration: Dynamic URL and port handling for seamless local, Docker, and production deployments
- Reliable image serving in production: API-based image delivery bypasses static file caching
- Over-The-Air (OTA) Updates: Built-in update mechanism to download and apply new versions directly from a GitHub Release zip URL via the About modal, with automatic dependency syncing and zero-config latest release detection.
- Customizable theme colors: Fully configurable dark and light mode colors including background, surface, text, accent, border, and secondary/tertiary backgrounds via the Settings UI.

### Technical Stack
- Frontend: Next.js 14.1.4, React 18.2.0, TypeScript 5.4.3
- Styling: Tailwind CSS 3.4.1
- Database: MongoDB 6.5.0
- API Integration: OpenRouter, Perplexity Sonar
- Router Model: OpenAI GPT-4o Mini (structured JSON classification)
- Container Support: Docker

### Author
Jorge Pereira  
35sites.com LLC  
Website: [https://35sites.com/applications/unified-aichat-hub/](https://35sites.com/applications/unified-aichat-hub/)  
Repository: [https://github.com/jorper98/unified-AIChat-Hub](https://github.com/jorper98/unified-AIChat-Hub)

### License
// Copyright (c) 2026 Jorge Pereira (35sites.com LLC). Licensed under the MIT License.

---
*Built with Next.js and powered by OpenRouter*
