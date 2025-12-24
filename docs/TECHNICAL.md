# Technical Documentation

This document explains the architecture, data flow, key files, and extension points for OpenCopilot.

## Architecture Overview

- UI: `sidepanel.html` / `sidepanel.js` — chat UI, mention popup, context management, message rendering.
- Background Worker: `background.js` — privileged actions: opening/closing tabs, injecting extraction scripts, waiting for load events.
- AI Service: `aiService.js` — adapter for multiple backends (Groq, Gemini, OpenRouter, Ollama, LM Studio, Osaurus).
- Memory: `memoryManager.js` — todos, notes, memories and search utilities.
- Agent Mode: `agentmode/` — `agentController.js`, `agentTools.js`, `agentPrompts.js` implement autonomous agent planning and tools.
- Utilities: `htmlToMarkdown.js`, `icons.js`.

## Data Flow

1. User sends a message via the sidebar UI (`sidepanel.js`).
2. The sidebar determines context: active tab, selected context tabs, memory search results.
3. The system prompt is constructed and `aiService.sendMessage` is invoked.
4. Responses are rendered in the UI with markdown and optional source pills.
5. For agent tasks (`@agent`), `AgentController` orchestrates tool calls (AgentTools) that interact with `background.js` for tab creation and content extraction.

## Key Extension Points

- AI Providers: implement a new `sendTo{Provider}` method in `aiService.js` and add settings fields in `settings.html`/`settings.js`.
- Agent Tools: add functions to `agentmode/agentTools.js` following the pattern that returns `{ success: true, action, data }` and update `AgentPrompts.SYSTEM` with documentation.
- Memory search & scoring: modify `memoryManager.searchMemory` or `calculateScore` to change relevance heuristics.

## Security Considerations

- Avoid extracting internal browser pages (blocked protocols enforced in `background.js` and `agentmode/agentTools.js`).
- Truncate page content before sending to LLMs (limits in `background.js` and `agentmode` tools).
- Agent searches are limited per task to avoid excessive requests or loops.

## Performance Notes

- Page extraction may be slow for large pages; agent waits include timeouts and grace periods.
- Markdown conversion keeps results to manageable sizes (50KB limits) to avoid exceeding provider token limits.

## Testing and Debugging

- Use `chrome://extensions` and the extension's service worker console to inspect background logs.
- Open the side panel and inspect the UI console for client-side logs.
- Add `console.log` output to `AgentController` and `AgentTools` when testing autonomous workflows.

