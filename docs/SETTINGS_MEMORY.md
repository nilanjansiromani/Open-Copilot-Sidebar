# Settings & Memory

This guide explains the Settings Dashboard and how OpenCopilot handles memory (todos, notes, and saved memories).

## Settings Dashboard Overview

Accessible via: `settings.html` or the keyboard shortcut (see `manifest.json`). The dashboard allows:

- Selecting an LLM provider (Groq, Gemini, OpenRouter, Ollama, LM Studio, Osaurus)
- Entering API keys or local server URLs
- Selecting a model for the chosen provider
- Managing Quick Prompt Pills (add, edit, delete, reset)
- Resetting connection settings to defaults

### Local model discovery
- Ollama, LM Studio, and Osaurus sections allow refreshing available models from your local server.
- If a local server is unreachable, the dashboard will show an error and hints to fix connectivity.

## Memory: what is stored and how

OpenCopilot stores two main types of data:

- Settings & Pills — stored in `chrome.storage.sync` (synchronized across signed-in browser instances) for convenience.
- Conversations, Todos, Notes, Memories — stored in `chrome.storage.local` (device-local storage) to avoid syncing sensitive history.

### Memory features
- Todos: add, toggle completion, delete, and search. Can include a URL reference.
- Notes: freeform notes with auto-hashtag extraction for quick search.
- Memories: arbitrary facts or preferences you want the assistant to remember.

### How memory is used
- The assistant runs a local memory search for relevant todos/notes/memories before performing external web searches for personal queries.
- Memory context is included in system prompts sent to the LLM to improve personalized responses.

## Privacy & Controls

- Internal pages (`chrome://`, `file://`, `chrome-extension://`) are excluded from extraction.
- The dashboard offers settings to enable/disable memory and to clear stored data.
- Use the "Clear All" operation in the Settings or the sidebar to wipe conversations and memory data.

## Troubleshooting

- If models are not listed for local servers: verify the server is running and reachable from your machine, then click the refresh button in the dashboard.
- If API-based providers fail: confirm your API key and model name are correct.

---

If you want, I can add a short screenshot walkthrough of the Settings panel and a step-by-step guide to clear or export memory.