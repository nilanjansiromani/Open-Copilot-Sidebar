# What You Can Do — Use Cases

This document highlights practical ways to use OpenCopilot in everyday browsing and specialized workflows.

## Quick Productivity Wins

- Instant Summaries
  - Ask the assistant to summarize long articles or reports into bullet lists.
  - Example: Select an open article and click "TLDR" or type: "Summarize this page in 5 bullets." 

- Research Aggregation
  - Add several search results to the context and ask cross-page questions like price comparisons or feature differences.
  - Example: Add three competing product pages and ask "Which has the best battery life and under $200?"

- Manage Todos and Notes
  - Save tasks or notes from pages and query them later.
  - Example: `/todo Add to buy list — ergonomic mouse (from: example.com)`

## Autonomous Tasks with `@agent`

- Multi-step web tasks
  - Ask the agent to run searches, open pages, extract facts, and return a compiled summary.
  - Example: `@agent find the top 5 gluten-free restaurants in Brooklyn with price ranges`.

- Personal data queries
  - Ask about your browsing history or bookmarks: the agent will check local data first.
  - Example: `@agent find that recipe I saved last month`.

## Developer & Research Workflows

- Fast data extraction
  - Use the background extractor to convert web pages to markdown, making it easy to pull structured data for notes.

- Experiment with local models
  - Connect to Ollama/LM Studio/Osaurus and iterate on prompt engineering locally.

## Accessibility & Collaboration

- Generate meeting notes or shareable summaries
  - Use the assistant to convert meeting content or long documents into shareable bullet points and mermaid diagrams.

- Quick conversion of technical content
  - Convert API docs, blog posts, or long-form content into digestible instructions for non-technical stakeholders.

