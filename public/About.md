# Unified Chat Hub

## Version 0.2.5

### About
Unified Chat Hub is a self-hosted, private AI development workspace and model playground built with Next.js 14, Tailwind CSS, and MongoDB. It provides a unified interface for interacting with multiple AI models through OpenRouter, with an intelligent intent router that classifies queries and routes them to web search or direct LLM response.

### Features

- Multi-model support via OpenRouter integration (GPT-4o, Claude, Gemini, DeepSeek, Qwen, MiniMax, Kimi, or any other available there)
- Ability to use other providers including local models.
- Persistant Context within the chat session (thread) while changing models
- Persistent chat history with search functionality
- Custom system prompts with save/load capabilities
- Ability to create, edit, save and switch system instructions within a chat (thread)
- Real-time token estimation and cost tracking (model, router, and Perplexity costs)
- Robust Image Extraction: Replaced fragile regex chains with recursive JSON parsing for reliable multimodal response handling
- Dynamic Context Settings: Timezone and default weather location configurable directly from the Settings UI (no server restart required)
- Refactored Architecture**: Modular component design for improved maintainability and performance
- Intelligent Intent Router: GPT-4o Mini classifier routes queries to web_search or direct_reply
- Web search via Perplexity Sonar with XML context injection and clickable source citations
- LLM Only mode: bypass router and context injection for pure model interaction
- Server Logs: persistent file-based logging with standalone popup viewer
- Dark/light theme support
- Thread archiving and management
- Markdown rendering with syntax highlighting
- Backup & Restore with ZIP export/import
- Able to fully deploy via Docker container with option to place data on local folder
- In-App Automated Testing: One-click UI testing in Settings to verify routing, context injection, and API integrations

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
Website: [https://35sites.com](https://35sites.com)

### License
// Copyright (c) 2026 Jorge Pereira (35sites.com LLC). Licensed under the MIT License.

---
*Built with Next.js and powered by OpenRouter*
