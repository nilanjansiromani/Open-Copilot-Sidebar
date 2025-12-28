# OpenCopilot User Guide

Complete guide to using the OpenCopilot browser extension.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Basic Usage](#basic-usage)
3. [Context Management](#context-management)
4. [Agent Mode](#agent-mode)
5. [Memory System](#memory-system)
6. [Commands](#commands)
7. [Settings](#settings)
8. [Tips & Tricks](#tips--tricks)

---

## Getting Started

### Installation

#### Chrome / Zen Browser
1. Open Chrome or Zen browser
2. Navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the `chrome` folder from this project
6. The extension icon will appear in your toolbar

#### Firefox
1. Open Firefox
2. Navigate to `about:debugging`
3. Click "This Firefox" in the left sidebar
4. Click "Load Temporary Add-on"
5. Select `manifest.json` from the `firefox` folder
6. The sidebar will be available via the extension icon

### First-Time Setup

1. **Open the Sidebar**
   - Click the extension icon in your toolbar
   - Or use keyboard shortcut: `Ctrl+Shift+O` (Mac: `Command+Shift+O`)

2. **Configure AI Service**
   - Click the settings icon (⚙️) in the sidebar
   - Or use keyboard shortcut: `Ctrl+Shift+K` (Mac: `Command+Shift+K`)
   - Select your preferred AI service
   - Enter your API key (if required)
   - Choose a model
   - Click "Save Settings"

3. **Start Using**
   - Type a question in the input field
   - Press Enter or click Send
   - The AI will respond using the current tab as context

---

## Basic Usage

### Asking Questions

Simply type your question in the input field at the bottom of the sidebar and press Enter. The AI will use the current active tab as context by default.

**Examples:**
- "Summarize this page"
- "What are the main points?"
- "Explain this in simple terms"
- "What is this article about?"

### Using Quick Pills

Quick pills are pre-configured prompts for common tasks. Click any pill to apply that prompt to the current page.

**Default Pills:**
- **TLDR** - Get a 5-bullet summary (exactly 5 words per bullet)
- **Summarize** - Concise summary of main points
- **Bullets** - Bullet point breakdown
- **Terms** - Key terms and concepts explained
- **Mindmap** - Visual mindmap in Mermaid format

### Viewing Responses

Responses appear in the chat interface with:
- Message bubbles (user questions in blue, AI responses in gray)
- Markdown rendering (headings, lists, code blocks, etc.)
- Mermaid diagram support
- Source pills showing where information came from

---

## Context Management

### Auto-Search Tabs (Default: OFF)

By default, only the active tab is used as context. You can enable auto-search to automatically find and use relevant tabs.

**To enable:**
1. Toggle "Auto search tabs" switch in the sidebar
2. When enabled, the extension will search through your open tabs
3. Relevant tabs will be automatically included as context

### Manual Tab Selection

**Add Tabs Manually:**
1. Click "Add Tabs" button in the sidebar
2. A panel will show all your open tabs
3. Click tabs to select/deselect them
4. Selected tabs will be used as context for your questions

**Remove Tabs:**
- Click the × icon on any context chip
- Or deselect in the "Add Tabs" panel

### @mention Popup

Type `@` in the input field to open the mention popup, which shows:
- **Open Tabs** - All currently open tabs
- **Bookmarks** - Your saved bookmarks
- **History** - Recent browsing history

**Using @mention:**
1. Type `@` in the input field
2. Continue typing to filter results
3. Use arrow keys to navigate
4. Press Enter or click to select
5. Selected items become context chips

**Note:** `@agent` does not trigger the mention popup - it activates agent mode instead.

---

## Agent Mode

Agent mode allows the AI to autonomously browse, search, and gather information.

### Activating Agent Mode

Type `@agent <your task>` in the input field.

**Examples:**
- `@agent search for hotels in bangalore`
- `@agent find flights to goa under 5000`
- `@agent research the best restaurants in mumbai`

### How It Works

1. **Planning** - The agent creates a plan for your task
2. **Searching** - Uses Google AI Search (limited to 4 searches)
3. **Browsing** - Opens relevant pages in background tabs
4. **Scraping** - Extracts content from pages
5. **Analyzing** - Uses AI to analyze gathered information
6. **Compiling** - Creates a concise summary (max 300 words)

### Agent Status

While the agent is running, you'll see:
- Current task
- Progress steps
- Current action being performed
- Source pills for gathered information

### Canceling Agent

Click "Cancel Agent" button to stop the agent mid-task.

### Agent Capabilities

The agent can:
- ✅ Search the web (Google AI Search)
- ✅ Open URLs in background tabs
- ✅ Extract page content
- ✅ Analyze content with AI
- ✅ Search your history and bookmarks
- ✅ Open and focus tabs
- ✅ Access your memory (todos, notes, memories)

### Agent Limitations

- Maximum 4 web searches per task
- Maximum 10 iterations
- Maximum 5 tabs open at once
- 10-second timeout per page load
- Cannot access restricted pages (chrome://, file://, etc.)

---

## Memory System

The extension includes a persistent memory system for storing information.

### Todos

**Create a Todo:**
- Type `/todo <your task>` in the chat
- The todo will be saved with a link to the current page
- Access todos via the "Todos" tab at the top

**Example:**
```
/todo Review this article later
```

**View Todos:**
- Click the "Todos" tab
- See all your todos with associated links
- Click a link to open it in a new tab

### Notes

**Create a Note:**
- Type `/note <your note>` in the chat
- The note will be saved
- Access notes via the "Notes" tab at the top

**Example:**
```
/note Important: This API requires authentication
```

**View Notes:**
- Click the "Notes" tab
- See all your saved notes
- Notes are searchable by the AI

### Memories

**Create a Memory:**
- Type `/remember <information>` in the chat
- The memory will be saved
- Access memories via the "Memory" tab at the top

**Example:**
```
/remember My favorite restaurant is XYZ in downtown
```

**View Memories:**
- Click the "Memory" tab
- See all your saved memories
- Memories are used by the AI to answer questions

### Using Memory in Questions

The AI automatically uses your memory when answering questions. For example:
- "What did I save about restaurants?" → Searches your memories
- "What todos do I have?" → Lists your todos
- "What notes did I save?" → Shows your notes

---

## Commands

### Chat Commands

| Command | Description | Example |
|---------|-------------|---------|
| `/todo <text>` | Create a todo with current page link | `/todo Review this later` |
| `/note <text>` | Save a note | `/note API key: xyz123` |
| `/remember <text>` | Save to memory | `/remember My favorite color is blue` |
| `/search <query>` | Search bookmarks & history | `/search python tutorial` |
| `/clear` | Clear current conversation | `/clear` |

### Agent Command

| Command | Description | Example |
|---------|-------------|---------|
| `@agent <task>` | Activate autonomous agent mode | `@agent find hotels in mumbai` |

### @mention Command

| Trigger | Description | Usage |
|---------|-------------|-------|
| `@` | Open mention popup | Type `@` then continue typing to filter |

---

## Settings

### Accessing Settings

- Click the settings icon (⚙️) in the sidebar
- Or use keyboard shortcut: `Ctrl+Shift+K` (Mac: `Command+Shift+K`)

### AI Service Configuration

**Select Service:**
- Choose from: Groq, Gemini, Ollama, LM Studio, Osaurus, OpenRouter
- Each service has different models available

**API Keys:**
- Enter your API key for the selected service
- Keys are stored securely in browser storage
- Never shared with external servers

**Models:**
- Select a model from the dropdown
- Different models have different capabilities and costs

### Custom Pills

Create custom quick prompts for common tasks:

1. Go to Settings
2. Scroll to "Custom Pills" section
3. Click "Add Custom Pill"
4. Enter label and prompt
5. Save

**Example Custom Pill:**
- Label: "Explain Like I'm 5"
- Prompt: "Explain this content in simple terms that a 5-year-old would understand"

### Theme

Toggle between light and dark themes:
- Click the theme switcher in settings
- Preference is saved automatically

---

## Tips & Tricks

### 1. Multi-Tab Analysis
Select multiple tabs to analyze content across different pages. Useful for:
- Comparing information from different sources
- Getting a comprehensive view of a topic
- Analyzing related content together

### 2. Agent Mode for Research
Use agent mode for tasks that require multiple sources:
- Research topics
- Find products/services
- Compare options
- Gather information from multiple sites

### 3. Memory for Context
Save important information to memory so the AI can reference it later:
- Personal preferences
- Important facts
- Frequently used information
- Project-specific details

### 4. Custom Pills for Workflows
Create custom pills for your specific workflows:
- Code review prompts
- Documentation templates
- Analysis formats
- Summary styles

### 5. Keyboard Shortcuts
- `Ctrl+Shift+O` - Toggle sidebar
- `Ctrl+Shift+K` - Open settings
- Arrow keys in @mention popup
- Enter to send messages

### 6. Source Tracking
Always check source pills below AI responses to verify information and find original sources.

### 7. Agent Intent Detection
The agent can detect when to use local data vs. web search:
- "What did I surf yesterday?" → Searches history
- "Open the news I read about X" → Finds and opens tabs
- "What's in my memory about X?" → Searches memory

### 8. Error Recovery
If the agent encounters an error, it will:
- Try alternative approaches
- Use fallback strategies
- Complete with available information
- Never fail completely

---

## Troubleshooting

### AI Not Responding
- Check your API key in settings
- Verify your AI service is accessible
- For local services (Ollama, LM Studio), ensure they're running
- Check browser console for errors

### Sidebar Not Appearing
- Chrome/Zen: Click extension icon in toolbar
- Firefox: Check if sidebar is enabled
- Try reloading the extension

### Agent Mode Not Working
- Ensure you typed `@agent` correctly
- Check that you have internet connection (for web search)
- Verify permissions are granted (tabs, bookmarks, history)

### Memory Not Saving
- Check browser storage permissions
- Try clearing and re-saving
- Verify you're using the correct command format

### Tabs Not Loading
- Ensure tab permissions are granted
- Check that tabs are not restricted pages
- Try refreshing the extension

---

## Advanced Usage

### Intent Detection

The agent can detect user intent and choose appropriate actions:

**Local Data Queries:**
- "What did I browse yesterday?" → Searches history
- "Open tabs about X" → Finds and opens relevant tabs
- "What's in my memory?" → Searches saved memories

**Browser Actions:**
- "Open the news about X" → Searches history, opens tabs
- "Focus on the tab with Y" → Finds and focuses tab

**Web Search:**
- "Search for X" → Uses Google AI Search
- "Find information about X" → Web search and browsing

### Context Prioritization

When multiple context sources are available, priority is:
1. Manually selected tabs
2. Auto-searched tabs (if enabled)
3. Active tab
4. Memory (todos, notes, memories)
5. Bookmarks and history (via @mention)

---

## Best Practices

1. **Be Specific** - Clear questions get better answers
2. **Use Context** - Select relevant tabs for better context
3. **Save Important Info** - Use memory system for frequently needed information
4. **Use Agent Mode Wisely** - Best for research tasks requiring multiple sources
5. **Check Sources** - Always verify information from source pills
6. **Organize Memory** - Keep todos, notes, and memories organized
7. **Customize Pills** - Create pills for your specific workflows
8. **Theme Preference** - Choose a theme that's comfortable for long sessions

---

## Support

For issues, questions, or feature requests:
- Check the [README.md](../README.md) for general information
- Review [AGENT_MODE.md](AGENT_MODE.md) for agent-specific details
- Open an issue on the repository

---

**Happy browsing with OpenCopilot! 🚀**

