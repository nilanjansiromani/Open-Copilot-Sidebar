# User Guide — OpenCopilot

## Introduction

OpenCopilot is an AI-powered extension that provides a persistent assistant in your browser's sidebar. It helps you interact with pages, perform multi-step tasks using `@agent`, and keep a short-term memory of conversations.

This guide walks through installation, daily usage, advanced features, and troubleshooting.

---

## Quick Start

### Install (Developer / local)

1. Clone the repo:

```bash
git clone https://github.com/nilanjansiromani/Open-Copilot-Sidebar.git
cd Open-Copilot-Sidebar
```

2. In Chrome/Edge, go to `chrome://extensions` and enable **Developer mode**.
3. Click **Load unpacked** and select the project directory.
4. The extension will be available in the toolbar and side panel. The default side panel path is `sidepanel.html`.

### Open the Sidebar

- Toggle the sidebar: **Ctrl+Shift+O** (Windows/Linux) or **Cmd+Shift+O** (macOS)
- Open Settings Dashboard: **Ctrl+Shift+K** (or **Cmd+Shift+K** on macOS)

---

## UI Overview

- **Sidebar (sidepanel.html / sidepanel.js)**: Primary chat UI where you can converse with the assistant.
- **Action button**: Shortcut to open the extension quickly.
- **Settings (settings.html)**: Configure memory, model settings, and other preferences.
- **Background service worker (background.js)**: Handles background tab operations and agent-related tasks.

---

## Chat & Prompts

- Type messages into the chat input and press Enter to send.
- Use Markdown in messages; the extension supports rendering via `marked.min.js` and `mermaid.min.js` for diagrams.
- Preview code blocks, lists, images (if allowed), and mermaid diagrams inline.

---

## Agent Mode (`@agent`)

- Prefix your message with `@agent` to run an autonomous, multi-step task. Example: `@agent find best web hosting options for a small blog under $10/month`.
- Agent mode runs a planning loop (see `docs/AGENT_MODE.md`) and may open background tabs to gather data.
- You can cancel agent execution from the UI while it runs.

For detailed architecture, tooling, and safety considerations, see [docs/AGENT_MODE.md](docs/AGENT_MODE.md).

---

## Settings & Memory

Open the Settings Dashboard to:

- Enable/disable memory
- Configure how long conversations are stored
- Customize agent constraints (max tabs, iterations, timeouts)
- Set API keys or LLM provider details if applicable

Settings are stored via the `chrome.storage` API (see `manifest.json` permissions).

---

## Best Practices

- When running `@agent` for web searches, be specific in the task and include constraints (budget, time, location).
- Avoid instructing the agent to access sensitive internal pages (e.g., `chrome://` pages) — those domains are blocked.
- For faster iterations during development, use smaller tasks and fewer iterations.

---

## Troubleshooting

- Sidebar doesn't open: check `chrome://extensions` for errors in the extension entry and inspect background service worker logs.
- Agent stalls or times out: check agent iteration limits and page timeouts in settings.
- Markdown or mermaid diagrams not rendering: ensure the page can access `assets/libs/marked.min.js` and `mermaid.min.js` (they are listed as web accessible resources in `manifest.json`).

---

## FAQ

Q: How do I prevent the agent from opening too many tabs?

A: Adjust the `Max tabs` setting in the dashboard; defaults are set to avoid overwhelming your browser.

Q: Where is my conversation history stored?

A: Conversations are stored using Chrome's `storage` API and can be cleared via the Settings Dashboard.

---

## Developer Notes

- Main folders:
  - `agentmode/` — agent controller, prompts, tools
  - `assets/` — fonts, icons, libs
  - `sidepanel.*` — UI files
  - `settings.*` — options page

- Key files:
  - `background.js` — background service worker
  - `aiService.js` — LLM helper functions
  - `memoryManager.js` — memory storage and retrieval

When changing functionality that interacts with browser APIs (tabs, scripting), test in an unpacked extension first.

---

## Contact & Contribution

If you find bugs or want to request features, open an issue in the repository. Pull requests are welcome — please include a clear description and testing steps.

---

## Changelog

- 2.1.0 — Current (see `manifest.json`)

---

*This guide was generated to get you started. Let me know if you'd like additional sections (e.g., screenshots, command reference, or a contributor guide).*