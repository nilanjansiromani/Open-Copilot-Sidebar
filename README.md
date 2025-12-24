# OpenCopilot - AI Assistant

> AI-powered co-pilot for web pages with multi-tab support, memory, and a native sidebar.

**Version:** 2.1.0

---

## Table of Contents

- [About](#about)
- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Using Agent Mode](#using-agent-mode)
- [Settings & Memory](#settings--memory)
- [Development](#development)
- [Contributing](#contributing)
- [License](#license)
- [Docs](#docs)

---

## About

OpenCopilot is a browser extension that provides an AI co-pilot inside a native sidebar. It supports conversational interactions, memory, and an autonomous `@agent` mode for multi-step tasks (see docs for details).

## Features

- Native browser sidebar for persistent AI assistant
- `@agent` autonomous mode for multi-step browsing tasks
- Memory and conversation history
- Markdown rendering and mermaid support
- Keyboard shortcuts for quick access
- Settings dashboard and customizable options

For a comprehensive feature list and file mappings, see `docs/FEATURES.md`.

## Installation

1. Clone the repository:

```bash
git clone https://github.com/nilanjansiromani/Open-Copilot-Sidebar.git
cd Open-Copilot-Sidebar
```

2. Open your browser (Chrome, Edge, or Chromium-based browser) and go to `chrome://extensions`
3. Enable **Developer mode**
4. Click **Load unpacked** and select the project folder
5. The extension should appear in your toolbar and side panel (default path: `sidepanel.html`)

> Tip: Keyboard shortcuts can be found in `manifest.json` or via the extension's details page.

## Quick Start

- Toggle the sidebar: Ctrl+Shift+O (Cmd+Shift+O on macOS)
- Open Settings Dashboard: Ctrl+Shift+K (Cmd+Shift+K on macOS)
- Use `@agent` in the chat to run autonomous tasks, e.g. `@agent find top hotels in Bangalore`

## Using Agent Mode

For detailed documentation on `@agent` autonomous mode (architecture, flow, safety, and examples), see [docs/AGENT_MODE.md](docs/AGENT_MODE.md).

## Settings & Memory

Open the options page (`settings.html`) from the extension's context menu or using the keyboard shortcut to configure memory, disabling features, or customizing model / API settings.

## Development

- No build step is required for development — the extension runs as-is in the browser.
- Core code locations:
  - `sidepanel/` — UI and sidebar behavior
  - `agentmode/` — agent controller, prompts, tools
  - `background.js` — background service worker for tab actions
  - `aiService.js` — LLM interaction helpers

Developer tips:
- Edit source files and reload the extension from `chrome://extensions` (or use *unpacked* reload).
- Use the browser console in the sidebar to inspect logs and debug UI code.

## Contributing

Contributions are welcome! Please open issues and PRs with clear descriptions and test steps. Follow these basic rules:

- Keep commits small and focused
- Add tests where applicable
- Update docs when behavior changes

## License

No `LICENSE` file found in this repository. Please add a license (for example, MIT) or discuss desired licensing via an issue.

## Docs

- Documentation Index: `docs/README.md`
- User Guide: `docs/User_Guide.md`
- Agent mode details: `docs/AGENT_MODE.md`

---

User Guide: `docs/User_Guide.md` contains step-by-step usage and troubleshooting guidance.