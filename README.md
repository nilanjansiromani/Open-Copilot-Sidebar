# OpenCopilot - AI Assistant Browser Extension

An AI-powered co-pilot browser extension that provides intelligent assistance directly in your browser sidebar. Built for Chrome, Firefox, and Zen browser with support for multiple AI services, autonomous agent mode, memory management, and multi-tab context awareness.

## 🌟 Features

### Core Features
- **Native Sidebar Integration** - Seamlessly integrated into Chrome Side Panel, Firefox Sidebar, and Zen Browser sidebar
- **Multi-Tab Context** - Automatically or manually select tabs to provide context to the AI
- **Multiple AI Services** - Support for Groq, Gemini, Ollama, LM Studio, Osaurus, and OpenRouter
- **Memory System** - Save todos, notes, and memories that persist across sessions
- **Bookmarks & History Search** - Intelligent search through your browsing history and bookmarks
- **Light/Dark Mode** - Beautiful themes that adapt to your preference

### Advanced Features
- **@agent Autonomous Mode** - Let the AI agent browse, search, and gather information autonomously
- **@mention Popup** - Quick access to open tabs, bookmarks, and history with smart filtering
- **Command System** - Use commands like `/todo`, `/note`, `/remember` to manage your data
- **Source Pills** - See where information came from with favicon and site title pills
- **Markdown Rendering** - Rich markdown support with Mermaid.js diagram rendering
- **Custom Pills** - Create custom quick prompts for common tasks

## 📦 Installation

### Chrome / Zen Browser
1. Navigate to the `chrome` folder
2. Open Chrome/Zen browser and go to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the `chrome` folder
5. The extension icon will appear in your toolbar

### Firefox
1. Navigate to the `firefox` folder
2. Open Firefox and go to `about:debugging`
3. Click "This Firefox"
4. Click "Load Temporary Add-on"
5. Select `manifest.json` from the `firefox` folder
6. The sidebar will be available via the extension icon

## 🚀 Quick Start

1. **Configure AI Service**
   - Click the extension icon to open the sidebar
   - Click the settings icon (⚙️) or use `Ctrl+Shift+K` (Mac: `Command+Shift+K`)
   - Select your preferred AI service and enter your API key
   - Save settings

2. **Start Chatting**
   - Type your question in the input field
   - The AI will use the current tab as context by default
   - Use "Add Tabs" to manually select additional tabs for context

3. **Use Agent Mode**
   - Type `@agent <your task>` to activate autonomous mode
   - Example: `@agent search for hotels in bangalore`
   - The agent will browse, search, and compile results automatically

4. **Manage Memory**
   - Use `/todo <text>` to create a todo with current page link
   - Use `/note <text>` to save a note
   - Use `/remember <text>` to save to memory
   - Access todos, notes, and memory via the tabs at the top

## 📚 Documentation

- [User Guide](docs/USER_GUIDE.md) - Comprehensive user documentation
- [Agent Mode](docs/AGENT_MODE.md) - Detailed guide to autonomous agent mode

## 🏗️ Project Structure

```
Open-Copilot-Sidebar/
├── chrome/              # Chrome/Zen browser version
│   ├── manifest.json
│   ├── sidepanel.html
│   ├── sidepanel.js
│   ├── background.js
│   └── ...
├── firefox/             # Firefox version
│   ├── manifest.json
│   ├── sidepanel.html
│   ├── sidepanel.js
│   ├── background.js
│   └── ...
├── docs/                # Documentation
│   ├── USER_GUIDE.md
│   └── AGENT_MODE.md
└── README.md
```

## 🎯 Use Cases

- **Research Assistant** - Ask questions about the pages you're viewing
- **Content Summarization** - Get TLDR summaries, bullet points, and mindmaps
- **Autonomous Research** - Let the agent search and compile information for you
- **Memory Management** - Save important links, notes, and todos
- **Multi-Tab Analysis** - Analyze content across multiple open tabs

## ⌨️ Keyboard Shortcuts

- `Ctrl+Shift+O` (Mac: `Command+Shift+O`) - Toggle sidebar
- `Ctrl+Shift+K` (Mac: `Command+Shift+K`) - Open settings

## 🔧 Configuration

### Supported AI Services

1. **Groq** - Fast inference with various models
2. **Gemini** - Google's AI models
3. **Ollama** - Local AI models (requires Ollama running locally)
4. **LM Studio** - Local AI models (requires LM Studio running locally)
5. **Osaurus** - Local AI models (requires Osaurus running locally)
6. **OpenRouter** - Access to multiple AI models via OpenRouter

### Settings

Access settings via the settings icon or `Ctrl+Shift+K`. Configure:
- AI service selection
- API keys
- Model selection
- Custom pills (quick prompts)

## 🤖 Agent Mode

The `@agent` command activates autonomous mode where the AI can:
- Search the web using Google AI Search
- Open and scrape web pages
- Analyze content
- Compile results into concise summaries

See [AGENT_MODE.md](docs/AGENT_MODE.md) for detailed documentation.

## 💾 Memory System

The extension includes a persistent memory system:
- **Todos** - Track tasks with associated links
- **Notes** - Save important information
- **Memories** - Store facts and information for future reference

Access these via the tabs at the top of the sidebar.

## 🎨 Theming

The extension supports both light and dark themes:
- Toggle via the theme switcher in settings
- Theme preference is saved and persists across sessions
- All UI elements adapt to the selected theme

## 🔒 Privacy & Security

- All API keys are stored locally using `chrome.storage.sync`
- No data is sent to external servers except your configured AI service
- Content extraction happens locally in your browser
- History and bookmarks are only accessed locally

## 🐛 Troubleshooting

### Extension not loading
- Ensure you're using the correct folder (`chrome` for Chrome/Zen, `firefox` for Firefox)
- Check that all files are present in the folder
- Verify manifest.json is valid

### AI not responding
- Check your API key is correct in settings
- Verify your AI service is accessible (for local services, ensure they're running)
- Check browser console for error messages

### Sidebar not appearing
- Chrome/Zen: Click the extension icon in the toolbar
- Firefox: The sidebar should appear automatically, or click the extension icon

## 📝 License

This project is open source. See LICENSE file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Support

For issues, feature requests, or questions, please open an issue on the repository.

---

**Made with ❤️ for productive browsing**


