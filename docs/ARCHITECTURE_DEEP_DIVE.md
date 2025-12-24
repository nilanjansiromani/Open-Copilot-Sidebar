# Architecture Deep Dive — Level 3 Documentation

This comprehensive document explains the internal architecture, data flow, state management, and implementation details of OpenCopilot.

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Data Flow Diagrams](#data-flow-diagrams)
3. [Core Components](#core-components)
4. [State Management](#state-management)
5. [Communication Patterns](#communication-patterns)
6. [Storage Strategy](#storage-strategy)
7. [Performance Optimizations](#performance-optimizations)

---

## System Architecture

OpenCopilot follows a **background-worker + UI split architecture**, common in modern browser extensions:

```
┌─────────────────────────────────────────────────────┐
│              Chrome Extension Runtime                │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌────────────────────────────────────────────┐   │
│  │     SIDE PANEL (UI)                        │   │
│  │  ┌──────────────────────────────────────┐  │   │
│  │  │ sidepanel.html / sidepanel.js        │  │   │
│  │  │ - Chat UI rendering                  │  │   │
│  │  │ - Message handling                   │  │   │
│  │  │ - Context management                 │  │   │
│  │  │ - Memory view (todos/notes)          │  │   │
│  │  │ - Quick pill buttons                 │  │   │
│  │  └──────────────────────────────────────┘  │   │
│  └────────────────────────────────────────────┘   │
│                         ↓                         │
│           chrome.runtime.sendMessage              │
│                         ↓                         │
│  ┌────────────────────────────────────────────┐   │
│  │  BACKGROUND SERVICE WORKER                 │   │
│  │  ┌──────────────────────────────────────┐  │   │
│  │  │ background.js                        │  │   │
│  │  │ - Tab creation/closure               │  │   │
│  │  │ - Content extraction (scripting)     │  │   │
│  │  │ - Page load waiting                  │  │   │
│  │  │ - Settings sync                      │  │   │
│  │  │ - Message routing                    │  │   │
│  │  └──────────────────────────────────────┘  │   │
│  └────────────────────────────────────────────┘   │
│                         ↓                         │
│  ┌────────────────────────────────────────────┐   │
│  │  LLM BACKENDS (External)                  │   │
│  │  ┌──────────────────────────────────────┐  │   │
│  │  │ aiService.js                         │  │   │
│  │  │ - Groq API                           │  │   │
│  │  │ - Gemini API                         │  │   │
│  │  │ - OpenRouter API                     │  │   │
│  │  │ - Ollama (localhost:11434)           │  │   │
│  │  │ - LM Studio (localhost:1234)         │  │   │
│  │  │ - Osaurus (localhost:1337)           │  │   │
│  │  └──────────────────────────────────────┘  │   │
│  └────────────────────────────────────────────┘   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Why this architecture?

- **Background worker** can perform privileged operations (tab creation, script injection) that UI cannot.
- **UI stays lightweight**, reducing lag and memory overhead.
- **Messaging-based communication** keeps layers decoupled and testable.

---

## Data Flow Diagrams

### User Message Flow (Chat)

```
USER TYPES MESSAGE IN SIDEBAR
           │
           ▼
┌─────────────────────────────────────────┐
│ sidepanel.js: sendMessage()             │
│ - Check for commands (/todo, /remember) │
│ - Check for @agent prefix               │
│ - Build context (active tab or search)  │
│ - Fetch memory (todos/notes/memories)   │
└─────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│ Build System Prompt                     │
│ - Context from tabs (markdown)          │
│ - User memory (todos/notes/memories)    │
│ - Bookmarks & history search results    │
│ - Instructions to reference sources     │
└─────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│ aiService.js: sendMessage()             │
│ Dispatches by service:                  │
│ - sendToGroq(messages, systemPrompt)    │
│ - sendToGemini(messages, systemPrompt)  │
│ - sendToOllama(messages, systemPrompt)  │
│ - etc.                                  │
└─────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│ API Request (cloud) or               │
│ HTTP Request (localhost)                │
│                                         │
│ fetch('https://api.groq.com/...')       │
│ fetch('http://localhost:11434/...')     │
└─────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│ LLM Returns Response                    │
│ Parse response based on service format  │
└─────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│ sidepanel.js: addMessage()              │
│ - Render message with markdown          │
│ - Attach source pills (if applicable)   │
│ - Render mermaid diagrams if present    │
│ - Save to local storage (history)       │
└─────────────────────────────────────────┘
           │
           ▼
    MESSAGE APPEARS IN UI
```

### Agent Mode Flow (`@agent` task)

```
USER TYPES: @agent find hotels in NYC
           │
           ▼
┌─────────────────────────────────────────┐
│ sidepanel.js: runAgentMode()            │
│ - Create AgentController                │
│ - Pass task to controller               │
└─────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│ AgentController.run(task)               │
│ Phase 1: Planning                       │
│  - Call LLM with AgentPrompts.PLAN()    │
│  - Parse action from response           │
└─────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│ Execution Loop (max 10 iterations)      │
│                                         │
│ While not complete:                     │
│   1. executeAction(action)              │
│      - Route to AgentTools              │
│      - Interact with background.js      │
│   2. Update UI (AgentUI.update)         │
│   3. Call LLM: NEXT_ACTION()            │
│   4. Parse next action                  │
└─────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│ Action Execution Examples:              │
│                                         │
│ search_web → open tab → scrape content  │
│ search_history → local search           │
│ search_memory → local search            │
│ open_tab → call background.js           │
│ complete → compile final response       │
└─────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│ generateFinalResponse()                 │
│ - Call LLM with all context             │
│ - Format markdown with findings         │
└─────────────────────────────────────────┘
           │
           ▼
    FINAL AGENT RESULT DISPLAYED
```

---

## Core Components

### 1. sidepanel.js (≈2790 lines)

**Responsibilities:**
- Manage UI state, message rendering, and interaction
- Context selection and multi-tab management
- Command parsing and handling
- Memory integration
- Settings display and service selection

**Key Functions:**

```javascript
sendMessage(text)
  - Main entry point for user messages
  - Determines context, calls aiService, renders response

findRelevantTabs(query, maxTabs)
  - Scores open tabs based on query relevance
  - Used for auto-search mode

parseCommand(text)
  - Detects /todo, /note, /remember, /search, /clear
  - Routes to appropriate handler

handleMentionInput()
  - Shows @ mention popup with tabs/bookmarks/history
  - Allows user to add context on-the-fly

renderQuickPrompts(pills)
  - Creates UI buttons for quick prompts (TLDR, Mindmap, etc.)
```

**State Variables:**

```javascript
messages []                     // Array of {role, content, timestamp}
contextTabs []                  // Tabs selected for context
autoContextMode bool            // Auto-search vs manual context
cachedTabContents Map           // Cache of extracted page contents
currentView string              // 'chat', 'todos', 'notes', 'memory'
usageStats                      // {sitesVisited: Set, questionsAsked: int}
```

### 2. background.js (≈494 lines)

**Responsibilities:**
- Respond to extension action clicks
- Extract page content via script injection
- Create/close/manage background tabs
- Handle settings sync
- Route messages from sidebar

**Key Functions:**

```javascript
extractTabContent(tabId)
  - Injects extractPageContentFunction into tab
  - Returns {title, url, textContent, markdown, htmlContent}
  - Converts HTML to markdown via htmlToMarkdownFunction

waitForPageLoad(tabId, timeout)
  - Polls chrome.tabs.get until status === 'complete'
  - Adds grace period for dynamic content

extractGoogleAIOverview()
  - Extracts AI overview from Google Search results
  - Tries multiple selectors for robustness

extractGoogleSearchResults(limit)
  - Scrapes organic search results from Google
  - Returns [{title, url, snippet}]
```

**Security Measures:**
- Blocks extraction from `chrome://`, `file://`, `data:`, extension URLs
- Limits content to 50KB per page
- Truncates HTML to 100KB

### 3. aiService.js (≈280 lines)

**Responsibilities:**
- Abstract interface for multiple LLM backends
- Format messages according to provider requirements
- Handle API authentication and errors

**Supported Backends:**

| Backend    | Type      | Endpoint                | Auth         |
|-----------|-----------|------------------------|--------------|
| Groq      | API       | api.groq.com           | API key      |
| Gemini    | API       | generativelanguage.googleapis.com | API key |
| OpenRouter| API       | openrouter.ai          | API key      |
| Ollama    | Local     | localhost:11434        | None         |
| LM Studio | Local     | localhost:1234         | None         |
| Osaurus   | Local     | localhost:1337         | None         |

**Key Methods:**

```javascript
sendMessage(messages, systemPrompt)
  - Routes to sendToGroq(), sendToGemini(), etc.

sendToGroq(messages, systemPrompt)
  - POST to https://api.groq.com/openai/v1/chat/completions
  - Expects format: {model, messages, temperature, max_tokens}

sendToOllama(messages, systemPrompt)
  - POST to http://localhost:11434/api/chat
  - Expects format: {model, messages, stream: false}
```

### 4. memoryManager.js (≈250 lines)

**Responsibilities:**
- CRUD operations for todos, notes, memories
- Search and ranking across all memory types
- Bookmarks and history search wrapper
- Export memory context for LLM

**Classes & Functions:**

```javascript
class MemoryManager {
  todos []          // {id, text, url, createdAt, completed}
  notes []          // {id, text, url, createdAt, tags}
  memories []       // {id, text, type, createdAt}
  
  async addTodo(text, url, metadata)
  async toggleTodo(id)
  async addNote(text, url, metadata)
  async addMemory(text, type)
  
  searchMemory(query)  // Returns {todos[], notes[], memories[]}
  searchBookmarks(query)
  searchHistory(query)
  async searchAll(query)  // Unified search
  
  getContextForAI(query)  // Formats memory for LLM system prompt
}
```

**Search Scoring:**
- Exact phrase matches: +10 points
- Word match in title: +3 points
- Word match in content: +2 points
- Word match in URL: +1 point

### 5. agentmode/agentController.js (≈407 lines)

**Responsibilities:**
- Orchestrate agent execution loop
- Parse LLM responses into action objects
- Handle error recovery
- Manage iteration limits and safety

**Agent State Machine:**

```
START
  ↓
PLAN (LLM creates initial plan)
  ↓
EXECUTE LOOP:
  - Determine action (search, open_url, complete, etc.)
  - Execute action via AgentTools
  - Update context with result
  - Ask LLM for next action
  - Check if max_iterations reached
  ↓
COMPLETE (generate final response)
  ↓
END
```

**Key Methods:**

```javascript
async run(task)
  - Main entry point, orchestrates phases

async executeAction(action)
  - Routes to AgentTools[actionName]

parseAction(response)
  - Strategies: extract from markdown, find JSON, keyword inference
  - Returns {action, params, reasoning}

async generateFinalResponse(summary)
  - Call LLM with COMPLETE prompt
  - Compile findings into readable answer
```

### 6. agentmode/agentTools.js (≈751 lines)

**Responsibilities:**
- Implement concrete browser actions and searches
- Manage safety limits (max tabs, max searches)
- Cleanup and resource management

**Available Tools:**

```javascript
search_web(params)              // Google search + AI overview
open_url(params)                // Open URL in background tab, extract content
read_page(params, tabId)        // Read specific DOM element
search_history(params)          // Local history search
search_bookmarks(params)        // Local bookmark search
search_memory(params)           // Search todos/notes/memories
get_recent_history(params)      // What user surfed recently
open_tab(params)                // Open URL(s) for user
get_open_tabs(params)           // List all tabs
focus_tab(params)               // Bring tab to foreground
think(params)                   // Pause and think
complete(params)                // Mark task complete
```

**Safety Constraints:**

```javascript
config = {
  maxTabs: 5                    // Limit concurrent background tabs
  maxSearches: 4                // Max web searches per task
  pageLoadTimeout: 10000        // 10 second page load timeout
  maxContentLength: 50000       // Truncate pages to 50KB
  blockedDomains: [...]         // chrome://, file://, etc.
}
```

### 7. agentmode/agentPrompts.js (≈250 lines)

**Responsibilities:**
- Define LLM system prompts
- Provide prompt templates for different agent phases
- Validate action schemas

**Key Prompts:**

```
SYSTEM
  - Describes available tools, intent detection rules
  - Guides agent to prioritize local data for personal queries

PLAN(task)
  - First-action prompt; analyzes task type

NEXT_ACTION(task, context, lastResult)
  - Decides on next step given current context

COMPLETE(task, context)
  - Generates final user-facing response

RECOVER(error, task, context)
  - Recovery prompt when LLM response parsing fails
```

---

## State Management

### Local Storage Keys

**`chrome.storage.sync` (synced across profile logins):**
```
settings: {
  service: 'groq' | 'gemini' | 'ollama' | ...
  groqApiKey: string
  groqModel: string
  geminiApiKey: string
  geminiModel: string
  ollamaUrl: string
  ollamaModel: string
  lmstudioUrl: string
  lmstudioModel: string
  osaurusUrl: string
  osaurusModel: string
  openRouterApiKey: string
  openRouterModel: string
}

customPills: {
  tldr: {label: 'TLDR', prompt: '...'}
  summarize: {label: 'Summarize', prompt: '...'}
  [key: string]: {label: string, prompt: string}
}
```

**`chrome.storage.local` (device-only storage):**
```
conversation_general: {
  messages: [{role, content, timestamp, isError}]
  contextTabs: [{id, title, url}]
  lastUpdated: ISO8601
}

conversation_tabs_<tabId1>_<tabId2>_...json: {...}
  // Per-context conversation storage keyed by tab IDs

usageStats: {
  sitesVisited: [hostname, ...]
  questionsAsked: number
}

autoSearchTabs: bool

opencopilot_todos: [{id, text, url, createdAt, completed}]
opencopilot_notes: [{id, text, url, createdAt, tags}]
opencopilot_memories: [{id, text, type, createdAt}]

theme: 'dark' | 'light'
```

### UI State (In-Memory)

```javascript
// sidepanel.js
messages: Message[]
contextTabs: ContextTab[]
currentView: 'chat' | 'todos' | 'notes' | 'memory'
autoContextMode: bool
cachedTabContents: Map<tabId, CachedContent>
isLoading: bool
mentionActive: bool
mentionMode: 'tabs' | 'bookmarks' | 'history'

// Agent Mode
agentController: AgentController | null  // Active agent instance
```

---

## Communication Patterns

### Message Protocol: `chrome.runtime.sendMessage`

**Sidebar → Background:**

```javascript
// Extract content from tab
{
  action: 'extractTabContent',
  tabId: number
}
// Response: {title, url, textContent, markdown, htmlContent} or null

// Save settings
{
  action: 'saveSettings',
  settings: {...}
}
// Response: {success: bool}

// Agent creates background tab
{
  action: 'agent_createTab',
  url: string
}
// Response: {success: bool, tabId: number, tab: Tab}

// Agent waits for tab load
{
  action: 'agent_waitForTab',
  tabId: number,
  timeout: number
}
// Response: {success: bool, tab: Tab}

// Agent extracts AI overview from Google Search
{
  action: 'agent_extractAIOverview',
  tabId: number
}
// Response: {success: bool, content: string | null}

// Agent extracts search results from Google
{
  action: 'agent_extractSearchResults',
  tabId: number,
  limit: number
}
// Response: {success: bool, results: [{title, url, snippet}]}
```

**Background → Sidebar:**

```javascript
// Notify sidebar of pills update (from settings page)
{
  action: 'pillsUpdated'
}

// Notify sidebar of extracted tab content
{
  action: 'tabContentExtracted',
  tabId: number,
  content: {...}
}
```

---

## Storage Strategy

### Conversation History Organization

**Single Context:**
```
Key: 'conversation_general'
Value: {
  messages: [
    {role: 'user', content: 'Hello', timestamp: '2025-01-01T10:00:00Z'},
    {role: 'assistant', content: 'Hi!', timestamp: '2025-01-01T10:00:05Z'}
  ]
}
```

**Multi-Tab Context:**
```
Key: 'conversation_tabs_42_103_205'  // Sorted tab IDs
Value: {
  messages: [...],
  contextTabs: [
    {id: 42, title: '...', url: 'https://...'},
    {id: 103, title: '...', url: 'https://...'},
    {id: 205, title: '...', url: 'https://...'}
  ]
}
```

**Key Generation:**
```javascript
// Function in sidepanel.js
function getContextKey() {
  if (contextTabs.length === 0) return 'conversation_general';
  const tabIds = contextTabs.map(t => t.id).sort().join('_');
  return `conversation_tabs_${tabIds}`;
}
```

### Memory Search Index

- No pre-built index; searches are linear scans.
- Scoring function calculates relevance on-the-fly.
- Results sorted by score descending.
- Top N results returned (usually 3-5 per category).

---

## Performance Optimizations

### 1. Tab Content Caching

**Pre-cache on startup:**
```javascript
// preCacheTabContents() in sidepanel.js
// Extracts content from first 10 accessible tabs on load
// Allows fast relevance scoring during queries without re-extraction
```

**Cache invalidation:**
```javascript
// On tab update
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'complete') {
    cachedTabContents.delete(tabId);  // Invalidate stale cache
  }
});

// On tab close
chrome.tabs.onRemoved.addListener((tabId) => {
  cachedTabContents.delete(tabId);
});
```

### 2. Content Truncation

- Page text limited to 50KB per extraction (in `background.js`).
- HTML limited to 100KB for markdown conversion.
- Search results limited to top 5-10 items.
- Agent per-action content truncated to prevent token bloat.

### 3. Local-First Search

- For personal queries, search local memory/history/bookmarks first.
- Only fall back to web search if no local results.
- Saves API calls and latency.

### 4. Lazy Loading

- Tabs panel loads open tabs on-demand when button clicked.
- Memory views (todos/notes) rendered only when switched to.
- Settings fetches models only for selected service.

### 5. Debouncing & Throttling

- `tabsSearch` input filters tabs in real-time (no debounce, fast local search).
- `messageInput` keydown handles Enter to prevent accidental duplicates.
- Agent stops after max iterations or search limit to prevent runaway.

---

## Extension Manifest Configuration

Key permissions in `manifest.json`:

```json
{
  "permissions": [
    "storage",          // Read/write chrome.storage
    "activeTab",        // Access current tab info
    "scripting",        // Inject scripts into pages
    "sidePanel",        // Use side panel
    "tabs",             // Query/manage tabs
    "bookmarks",        // Search bookmarks
    "history"           // Search history
  ],
  "host_permissions": [
    "<all_urls>"        // Access all pages for extraction
  ],
  "side_panel": {
    "default_path": "sidepanel.html"
  },
  "background": {
    "service_worker": "background.js"
  },
  "commands": {
    "_execute_action": {
      "suggested_key": "Ctrl+Shift+O",
      "description": "Toggle OpenCopilot Sidebar"
    },
    "open-settings": {
      "suggested_key": "Ctrl+Shift+K",
      "description": "Open Settings Dashboard"
    }
  }
}
```

---

## Next Steps

For implementation details on specific features:
- See `docs/CODE_WALKTHROUGH.md` for step-by-step code examples.
- See `docs/API_REFERENCE.md` for method signatures and usage.
- See `docs/AGENT_DEEP_DIVE.md` for autonomous agent architecture.
