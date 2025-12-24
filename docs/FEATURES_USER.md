# Features (User Summary)

This page lists the most important features of OpenCopilot from a user's perspective, with short examples of how they help.

## Key Features

- Native Sidebar Chat
  - Keep a persistent assistant open alongside the page you're browsing. Ask questions without switching tabs.
  - Example: "Summarize this article" and get a concise, markdown-formatted summary.

- Multi-Tab Context
  - Combine multiple open tabs into a context so the assistant can answer questions across pages.
  - Example: Select three product pages and ask "Which product has the best review for battery life?"

- Autonomous Agent Mode (`@agent`)
  - Run multi-step tasks: the agent can search the web, open background tabs, scrape pages, analyze results, and return compiled answers.
  - Example: `@agent find cheapest flights from NYC to LAX in June under $200`.

- Memory: Todos, Notes, Saved Memories
  - Save important notes and todos tied to pages or freeform text; the assistant can reference them later.
  - Example: Save a recipe note and ask later "Where did I save that recipe for chicken curry?"

- Quick Prompt Pills
  - Predefined and customizable buttons (TLDR, Mindmap, Bullets) that send pre-configured prompts.
  - Example: Click "TLDR" to get a 5-bullet summary.

- Markdown & Mermaid Rendering
  - Assistant responses support markdown, code blocks, and mermaid diagrams for rich, visual output.

- Multiple LLM Backends & Local Models
  - Connect to cloud services (Groq, Gemini, OpenRouter) or local servers (Ollama, LM Studio, Osaurus), including Apple Foundation models via Osaurus.

- Privacy & Safety Controls
  - Internal pages are blocked (e.g., `chrome://`), extraction size is limited, and agent searches are rate-limited.

