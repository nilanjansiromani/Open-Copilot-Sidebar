# Features — OpenCopilot

This document lists the user-facing and developer-facing features implemented in the extension, grouped by area and mapped to the most relevant files.

## User-facing Features

- Chat-based sidebar assistant (persistent UI)
  - Files: `sidepanel.html`, `sidepanel.js`, `sidepanel.css`
  - Markdown & mermaid rendering via `marked.min.js` and `mermaid.min.js`
  - Typing indicator, error banner, and message source pills

- Quick Prompts (Pills)
  - Default pills: TLDR, Summarize, Bullets, Terms, Mindmap
  - Custom pills can be added/edited in settings and stored in `chrome.storage.sync`
  - Files: `sidepanel.js`, `settings.html`, `settings.js`

- Commands
  - `/todo` — Save a todo referencing the current page
  - `/note` — Save a note
  - `/remember` — Persist a memory
  - `/search` — Quick search bookmarks & history
  - `/clear` — Clear conversation history
  - Files: `sidepanel.js`, `memoryManager.js`

- @ Mention popup
  - Add tabs, bookmarks, or history items to the AI context using `@` (except `@agent`)
  - Files: `sidepanel.js`

- Multi-tab context management
  - Manually add selected open tabs to context, auto-context mode to search relevant tabs
  - Context chips and per-context conversation storage
  - Files: `sidepanel.js`, `background.js`

- Persistent conversation history and context-scoped storage
  - Per-context keys, stored via `chrome.storage.local`
  - Files: `sidepanel.js`

- Memory: todos, notes, saved memories
  - Add, update, delete, and search
  - Files: `memoryManager.js`

- Usage statistics
  - Tracks unique sites visited and questions asked
  - Files: `sidepanel.js`

- Settings Dashboard
  - Configure LLM providers, API keys, local server URLs, model selection
  - Manage custom pills
  - Files: `settings.html`, `settings.js`

- Keyboard shortcuts
  - Toggle sidebar, open settings (configured in `manifest.json`)
  - Files: `manifest.json`, `background.js`

- Agent Mode (`@agent` autonomous mode)
  - Run autonomous multi-step tasks (search web, open tabs, scrape content, analyze)
  - Cancelable, bounded by iteration and tab limits
  - Files: `agentmode/agentController.js`, `agentmode/agentTools.js`, `agentmode/agentPrompts.js`, `background.js`

- Source attribution
  - Assistant messages can include source pills linking to the original pages
  - Files: `sidepanel.js`

## Developer & Integration Features

- Multiple AI backends supported
  - Groq, Gemini, OpenRouter (remote APIs) and Ollama, LM Studio, Osaurus (local servers)
  - Files: `aiService.js`, `settings.js` (model discovery for local servers)

- Content extraction & HTML → Markdown
  - Extract page text and main HTML segment, convert to Markdown for LLM context
  - Files: `background.js`, `htmlToMarkdown.js`

- Agent tooling & safety constraints
  - Agent prompts, action validation, tool wrappers for browsing and local data access
  - Limits: max iterations (default 10), max tabs (default 5), per-page size limits
  - Files: `agentmode/*` (Controller, Tools, Prompts)

- Background service worker responsibilities
  - Create and close background tabs for agent, wait for page load, execute content extraction scripts
  - Files: `background.js`

- Storage & synchronization
  - Uses `chrome.storage.sync` for settings and pills, `chrome.storage.local` for conversation history & memory
  - Files: `settings.js`, `memoryManager.js`, `sidepanel.js`

- Local model discovery
  - Fetch available models from Ollama, LM Studio, and Osaurus
  - Files: `settings.js`

- Safety & domain blocking
  - Prevent extracting from blocked protocols (chrome://, extension URLs, file://, etc.)
  - Files: `background.js`, `agentmode/agentTools.js`

## Notes & Limitations

- The extension intentionally avoids accessing internal browser pages (e.g., `chrome://`) for security.
- Extraction and markdown conversion truncate very large pages to keep context manageable (limits in `background.js`).
- Agent searches are rate-limited per task to avoid runaway behavior.

---

If you'd like, I can add a one-page printable feature summary (`FEATURES_SUMMARY.md`) or embed small screenshots for each feature. Let me know which additional docs you want next.