# Developer Guide — OpenCopilot

This guide covers architecture, key files, development workflow, and how to extend or debug the extension.

## Project overview

OpenCopilot is a Chrome/Chromium extension that provides an AI assistant in the browser side panel. Major responsibilities are split across:

- UI & interaction: `sidepanel.html`, `sidepanel.js`, `sidepanel.css`
- Settings & configuration: `settings.html`, `settings.js`
- Background tasks & content extraction: `background.js`, `htmlToMarkdown.js`
- Memory & local storage: `memoryManager.js`
- AI service integrations: `aiService.js`
- Agent autonomous mode: `agentmode/agentController.js`, `agentmode/agentTools.js`, `agentmode/agentPrompts.js`

## Runtime model

- UI (side panel) sends messages to the background script for privileged actions (tab creation, content extraction).
- LLM calls are performed by `AIService` which routes requests to configured providers.
- Agent mode orchestrates multi-step tasks using the `AgentTools` wrappers and LLM-guided planning (`AgentController`).

## Adding a new AI provider

1. Add configuration fields to `settings.html` and load/save in `settings.js`.
2. Implement a method in `aiService.js` (e.g., `sendToMyProvider`) and add it to the `sendMessage` switch.
3. Add UI hints or help text in the settings dashboard.
4. Add validation if API keys or URLs are required.

## Extending agent capabilities (adding a new tool)

1. Implement the tool function in `agentmode/agentTools.js` and follow existing patterns (return `{ success: true, action, data }`).
2. Add documentation to `agentmode/agentPrompts.js` under `SYSTEM` so the LLM knows the tool signature.
3. Add to `ActionSchemas` for validation if necessary.
4. Update tests or add an example to `docs/AGENT_MODE.md`.

## Debugging tips

- Inspect the side panel UI: right-click the side panel and choose "Inspect" to view console logs and UI state.
- Background worker logs: go to `chrome://serviceworker-internals` or the extension entry in `chrome://extensions` and inspect the background service worker console.
- Use `console.log` liberally in the controller and tools during development and watch for messages in the extension consoles.

## Testing locally

1. Open `chrome://extensions` and enable **Developer mode**.
2. Click **Load unpacked** and point to the project directory.
3. Reload the extension after making code changes.
4. Use the settings dashboard to configure an LLM backend or a local server (Ollama, LM Studio, etc.).

## Security & Privacy

- Avoid sending sensitive data to external APIs unless explicitly intended by the user.
- Block extraction of internal/protected pages (`chrome://`, `file://`, `chrome-extension://`).
- Limit per-page context sizes when sending to LLMs to prevent leaks of large amounts of data.

## File map & quick references

- `manifest.json` — permissions, commands, side panel configuration
- `background.js` — tab creation, content extraction, agent tab operations
- `sidepanel.js` — chat UI, context selection, message handling
- `settings.js` — settings dashboard, pills management, model discovery
- `memoryManager.js` — todos, notes, memories and unified search
- `aiService.js` — integration logic for supported AI providers
- `agentmode/` — controller, tools, prompts for autonomous agent

## Next steps / Suggestions

- Add automated unit tests for `memoryManager` and the `AgentTools` helpers.
- Add a CI workflow (GitHub Actions) to run linting and basic checks.
- Add screenshot assets and an examples page documenting common user flows.

If you'd like, I can add a CONTRIBUTING.md template and a PR checklist next.