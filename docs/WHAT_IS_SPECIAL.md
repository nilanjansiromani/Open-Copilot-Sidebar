# What Makes OpenCopilot Special

OpenCopilot is designed for tight integration with the browsing experience and supports workflows not commonly found in typical browser assistant extensions. These differentiators help both casual users and power users.

## Distinctive Capabilities

- Multi-Tab Context Awareness
  - Unlike single-page assistants, OpenCopilot can include multiple open tabs into a single AI context. This enables cross-page reasoning — for example, comparing product pages or aggregating information across several articles.

- Autonomous `@agent` Mode
  - The `@agent` command runs an LLM-driven, tool-augmented agent that can search the web, open background tabs, scrape, and iterate until it compiles an answer. It’s bounded by safety limits (max iterations, max tabs) to avoid runaway behavior.

- Local Model Support (Ollama / LM Studio / Osaurus)
  - You can run models locally (no API keys required) or use the Apple Foundation model via Osaurus for on-device inference — useful for privacy-sensitive usage and low-latency responses.

- Rich Context (Bookmarks / History / Memory)
  - The assistant can search your bookmarks, recent browsing history, and saved memories (notes/todos) before hitting web search — prioritizing personal data for personal queries.

- User Customizable Prompts (Pills)
  - Create and share quick-prompt buttons that send pre-configured instructions to the assistant (e.g., company-specific summarization templates).

- Source Attribution & Extract-to-Markdown
  - Responses include source pills linking back to pages used for the answer. Page extraction converts HTML to markdown to produce concise, LLM-friendly context.

## Built for Developers and Power Users

- Clear extension points (AI provider adapters, agent tools) make it easy to add new tools and model integrations.
- Background service worker performs privileged actions while the UI stays lightweight and responsive.

These features make OpenCopilot a flexible tool for research, note-taking, and complex browsing workflows.