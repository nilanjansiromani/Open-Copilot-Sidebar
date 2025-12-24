# Using Apple Foundation Models with Osaurus

This guide explains how to connect OpenCopilot to Osaurus to use Apple Foundation models (macOS system models) for local inference.

> Note: Osaurus and Apple Foundation models require macOS with Apple Silicon and the Osaurus server. This guide assumes some familiarity with running local model servers.

## Prerequisites

- macOS (Apple Silicon recommended)
- Homebrew installed
- Osaurus installed and running (see Osaurus docs)
- OpenCopilot extension loaded as an unpacked extension in Chrome/Edge

## Install & Start Osaurus

1. Install Osaurus via Homebrew:

```bash
brew install dinoki-labs/tap/osaurus
```

2. Start the Osaurus server:

```bash
osaurus serve
```

By default, Osaurus runs on `http://127.0.0.1:1337`.

## Configure OpenCopilot

1. Open the OpenCopilot Settings Dashboard (`settings.html`).
2. Choose the **Osaurus** service.
3. In the **Osaurus URL** field, enter `http://127.0.0.1:1337` (or your Osaurus server URL).
4. For **Model Name**, select or enter `foundation` to use Apple's foundation model (if available on your machine).
5. Save connection settings.

## Troubleshooting

- "No models found" — Ensure Osaurus is running (`osaurus serve`) and that your macOS version supports the Apple Foundation models (macOS 14+ and appropriate hardware dependencies).
- Connection refused — Check firewall or network issues and confirm the port (1337) is correct.
- High memory usage — Foundation models can be large; monitor system resources and consider using smaller or hosted models for heavy workloads.

## Using the Model

- Once configured, the extension will send LLM requests to your local Osaurus server.
- Latency should be lower than cloud APIs, and your data remains local to your machine.
- You can use all extension features (chat, agent, pills) with Osaurus as the backend.

## Tips

- Use Osaurus for privacy-sensitive tasks to avoid sending data to cloud APIs.
- If you prefer GPU acceleration or tuned models, consult Osaurus docs for local model management and model pulling.

