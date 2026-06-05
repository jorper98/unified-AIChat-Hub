# Unified Chat Hub

## Version 0.2.1

### About
Unified Chat Hub is a self-hosted, private AI development workspace and model playground built with Next.js 14, Tailwind CSS, and MongoDB. It provides a unified interface for interacting with multiple AI models through OpenRouter, with an intelligent intent router that classifies queries and routes them to web search or direct LLM response.

### Features
- **Automated Testing**: Built-in routing test script with randomized prompts and timestamped test threads
- **Dynamic Context Settings**: Timezone and default weather location configurable directly from the Settings UI (no server restart required)
- **Refactored Architecture**: Modular component design for improved maintainability and performance
- Intelligent Intent Router: GPT-4o Mini classifier routes queries to web_search or direct_reply
- Web search via Perplexity Sonar with XML context injection and clickable source citations
- LLM Only mode: bypass router and context injection for pure model interaction
- Multi-model support via OpenRouter integration (GPT-4o, Claude, Gemini, DeepSeek, Qwen, MiniMax, Kimi)
- Persistent chat history with search functionality
- Custom system prompts with save/load capabilities
- Real-time token estimation and cost tracking (model, router, and Perplexity costs)
- Server Logs: persistent file-based logging with standalone popup viewer
- Dark/light theme support
- Thread archiving and management
- Markdown rendering with syntax highlighting
- Backup & Restore with ZIP export/import

### Technical Stack
- **Frontend**: Next.js 14.1.4, React 18.2.0, TypeScript 5.4.3
- **Styling**: Tailwind CSS 3.4.1
- **Database**: MongoDB 6.5.0
- **API Integration**: OpenRouter, Perplexity Sonar
- **Router Model**: OpenAI GPT-4o Mini (structured JSON classification)
- **Container Support**: Docker

### Author
**Jorge Pereira**  
35sites.com LLC  
Website: [https://35sites.com](https://35sites.com)

### License
This application is proprietary software developed by 35sites.com LLC. All rights reserved.

---
*Built with Next.js and powered by OpenRouter*
