# Documentation Index

Welcome to the documentation for OpenCopilot. This folder contains user-facing docs and developer guides, organized by audience and technical depth.

## For End Users
- **[User Guide](User_Guide.md)** — Installation, setup, and step-by-step usage
- **[Features](FEATURES_USER.md)** — User-facing features summary
- **[What Makes It Special](WHAT_IS_SPECIAL.md)** — Unique capabilities and differentiators
- **[Use Cases](USE_CASES.md)** — Practical examples and common tasks
- **[Settings & Memory](SETTINGS_MEMORY.md)** — Configure settings, manage memory (todos/notes)
- **[Agent Mode](AGENT_MODE.md)** — Using the `@agent` autonomous task execution feature

## For Developers (Level 3 - Implementation Detail)
- **[Developer Guide](DEVELOPER_GUIDE.md)** — Dev environment setup, building, testing, contributing
- **[Technical Overview](TECHNICAL.md)** — Architecture, data flows, extension points
- **[Features Implementation](FEATURES.md)** — Complete feature list with file mappings and code locations
- **[Architecture Deep Dive](ARCHITECTURE_DEEP_DIVE.md)** — System-wide design, component breakdown, state management, message protocols, storage strategy, performance optimizations
- **[Code Walkthrough](CODE_WALKTHROUGH.md)** — Step-by-step code examples for key workflows:
  - User sends a message (chat flow)
  - Multi-tab context selection
  - Agent executes web search
  - Memory search and ranking
  - Settings persistence
- **[API Reference](API_REFERENCE.md)** — Complete method signatures, parameters, return types, and error handling for all modules:
  - sidepanel.js (UI functions, memory management, helpers)
  - background.js (content extraction, message handlers)
  - aiService.js (LLM provider abstraction)
  - memoryManager.js (todos/notes/memories CRUD)
  - agentController.js (agent orchestration)
  - agentTools.js (agent tool implementations)
  - agentPrompts.js (prompt templates and validation)
- **[Agent Deep Dive](AGENT_DEEP_DIVE.md)** — Detailed agent operation:
  - State machine and action parsing (with 3-strategy recovery)
  - Tool implementation guide with examples
  - Extending with custom tools (step-by-step)
  - Real-world agent task walkthroughs
  - Safety limits and error handling
  - Debugging techniques and troubleshooting

## Platform-Specific
- **[Osaurus Foundation Models](USING_OSAURUS_FOUNDATION.md)** — Using Apple Foundation models via local Osaurus server

## Documentation Levels

**Level 1 - User Facing:** How to install, configure, and use the extension
**Level 2 - Feature/Admin:** What features exist, when to use them, troubleshooting
**Level 3 - Implementation:** How the code is organized, APIs, component interactions, extending the system

---

## Quick Links by Task

| Task | Documentation |
|------|-----------------|
| Install and start using | [User Guide](User_Guide.md) |
| Understand all features | [FEATURES_USER.md](FEATURES_USER.md) or [FEATURES.md](FEATURES.md) |
| Set up API keys and models | [Settings & Memory](SETTINGS_MEMORY.md) |
| Use agent autonomous mode | [Agent Mode](AGENT_MODE.md) or [Agent Deep Dive](AGENT_DEEP_DIVE.md) |
| Understand system architecture | [Architecture Deep Dive](ARCHITECTURE_DEEP_DIVE.md) |
| See actual code examples | [Code Walkthrough](CODE_WALKTHROUGH.md) |
| Find method signatures | [API Reference](API_REFERENCE.md) |
| Extend agent with new tools | [Agent Deep Dive](AGENT_DEEP_DIVE.md#extending-with-custom-tools) |
| Debug issues | [Agent Deep Dive](AGENT_DEEP_DIVE.md#debugging--troubleshooting) or [Developer Guide](DEVELOPER_GUIDE.md) |
| Set up development environment | [Developer Guide](DEVELOPER_GUIDE.md) |