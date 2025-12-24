# API Reference — Level 3 Documentation

Complete method signatures, parameter types, and return values for all public functions.

## Table of Contents

1. [sidepanel.js](#sidepaneljs)
2. [background.js](#backgroundjs)
3. [aiService.js](#aiservicejs)
4. [memoryManager.js](#memorymanagerjs)
5. [agentController.js](#agentcontrollerjs)
6. [agentTools.js](#agenttoolsjs)
7. [agentPrompts.js](#agentpromsjs)

---

## sidepanel.js

### Core Functions

#### `sendMessage(messageText?: string): Promise<void>`

Send a message to the AI backend with context.

**Parameters:**
- `messageText` (optional `string`): Message to send. If omitted, uses `messageInput.value`

**Return value:** `Promise<void>` (resolves when response is rendered)

**Behavior:**
1. Checks for commands (`/todo`, `/note`, `/search`, `/clear`)
2. Checks for agent mode (`@agent ...`)
3. Regular mode: gathers context tabs, extracts content, calls LLM
4. Formats response with source pills

**Throws:** None (errors shown in UI)

**Example:**
```javascript
// User clicks send button
await sendMessage();

// Programmatic call
await sendMessage('What is this page about?');
```

**See also:** `parseCommand()`, `sendToAIService()`

---

#### `parseCommand(text: string): {command: string, args: string, handler: Function} | null`

Parse special commands from user input.

**Parameters:**
- `text` (string): User input to parse

**Return value:** 
- `{command: string, args: string, handler: Function}` if command matched
- `null` if no command

**Supported commands:**
- `/todo <text>` → adds todo
- `/note <text>` → adds note
- `/search <query>` → searches memory + web
- `/remember <text>` → saves to memory
- `/clear` → clears conversation

**Example:**
```javascript
const cmd = parseCommand('/todo Buy coffee');
if (cmd) {
  // {command: '/todo', args: 'Buy coffee', handler: <function>}
  await cmd.handler(cmd.args);
}
```

---

#### `findRelevantTabs(query: string): Promise<Tab[]>`

Search open tabs and score by relevance to query.

**Parameters:**
- `query` (string): User's message or search query

**Return value:** `Promise<Tab[]>` — array of tabs sorted by relevance score (highest first)

**Tab object:**
```javascript
{
  id: number,
  title: string,
  url: string,
  favicon: string,
  content?: string,
  markdown?: string
}
```

**Scoring logic:**
- Title exact match: +5
- Title word match: +2
- Content contains words: +1
- URL contains words: +0.5

**Example:**
```javascript
const relevantTabs = await findRelevantTabs('React tutorial');
// Returns tabs with titles/content about React, sorted by score
```

**Note:** Only returns tabs with score > 0. Max 5 tabs returned.

---

#### `addMessage(role: 'user' | 'assistant', content: string, isError?: boolean, sources?: SourcePill[]): void`

Add a message to the conversation UI.

**Parameters:**
- `role` (`'user'` | `'assistant'`): Who sent the message
- `content` (string): Message text (supports Markdown + HTML)
- `isError` (optional `boolean`): If `true`, shows as error (red styling)
- `sources` (optional `SourcePill[]`): Array of tabs/links mentioned

**SourcePill object:**
```javascript
{
  title: string,
  url: string,
  favicon?: string
}
```

**Return value:** `void`

**Behavior:**
1. Formats content (renders Markdown, applies syntax highlighting)
2. Adds timestamp
3. Shows source pills if provided
4. Scrolls to bottom

**Example:**
```javascript
addMessage('assistant', '**Summary:** This page is about React hooks.');
addMessage('user', 'What is React?');
addMessage('assistant', 'Error loading tab', true);
addMessage('assistant', 'Found it!', false, [
  {title: 'React Docs', url: 'https://react.dev', favicon: '...'}
]);
```

---

#### `switchView(viewName: 'chat' | 'memory' | 'settings'): void`

Switch between chat, memory management, and settings views.

**Parameters:**
- `viewName` (`'chat'` | `'memory'` | `'settings'`): Which view to show

**Return value:** `void`

**Behavior:**
1. Hides current view
2. Shows selected view with appropriate data
3. Updates button states

**Example:**
```javascript
switchView('memory');  // Show memory (todos, notes, memories)
switchView('settings');  // Show settings panel
switchView('chat');  // Back to chat
```

---

#### `updateContextTabsDisplay(): void`

Refresh the display of selected context tabs as chips.

**Parameters:** None

**Return value:** `void`

**Behavior:**
1. Clears container
2. Renders small chip for each context tab
3. Attaches remove button listeners

**Example:**
```javascript
// After adding a tab to context
updateContextTabsDisplay();
// Now shows chips like "📄 Page Title ×"
```

---

#### `removeTabFromContext(tabId: number): void`

Remove a tab from the context selection.

**Parameters:**
- `tabId` (number): Chrome tab ID to remove

**Return value:** `void`

**Behavior:**
1. Removes from `contextTabs` array
2. Updates UI
3. Message: "Removed from context"

**Example:**
```javascript
removeTabFromContext(12345);
```

---

### Memory Management Functions

#### `renderMemoryView(): Promise<void>`

Display all todos, notes, and memories with edit/delete buttons.

**Parameters:** None

**Return value:** `Promise<void>`

**Behavior:**
1. Queries `chrome.storage.local` for all items
2. Groups by type (todos, notes, memories)
3. Shows completion status for todos
4. Attaches edit/delete listeners

**Example:**
```javascript
await renderMemoryView();  // Switch to memory tab and display items
```

---

#### `addTodo(text: string, url?: string): Promise<void>`

Add a new todo item.

**Parameters:**
- `text` (string): Todo description
- `url` (optional `string`): Associated URL (current tab if omitted)

**Return value:** `Promise<void>`

**Behavior:**
1. Creates todo with timestamp
2. Saves to `chrome.storage.local` under key `opencopilot_todos`
3. Adds to UI with checkbox
4. Shows confirmation message

**Example:**
```javascript
await addTodo('Review this paper', 'https://arxiv.org/abs/...');
```

---

#### `toggleTodo(id: string): Promise<void>`

Mark todo as complete/incomplete.

**Parameters:**
- `id` (string): Todo ID (UUID)

**Return value:** `Promise<void>`

**Behavior:**
1. Toggles `done` flag
2. Saves to storage
3. Updates checkbox UI

**Example:**
```javascript
await toggleTodo('todo-uuid-1234');
```

---

#### `addNote(text: string, url?: string): Promise<void>`

Add a new note.

**Parameters:**
- `text` (string): Note content
- `url` (optional `string`): Associated URL

**Return value:** `Promise<void>`

**Behavior:**
1. Creates note with timestamp
2. Saves to `chrome.storage.local` under key `opencopilot_notes`
3. Refreshes memory view

**Example:**
```javascript
await addNote('Remember: React 18 has new features like Suspense');
```

---

#### `addMemory(key: string, value: string): Promise<void>`

Add a key-value memory entry (for quick recall).

**Parameters:**
- `key` (string): Memory key/name
- `value` (string): Memory content

**Return value:** `Promise<void>`

**Behavior:**
1. Creates memory entry with timestamp
2. Saves to `chrome.storage.local` under key `opencopilot_memories`
3. Shows confirmation

**Example:**
```javascript
await addMemory('my_api_key', 'sk-proj-...');
await addMemory('preferred_browser', 'Firefox');
```

---

#### `searchMemory(query: string): Promise<{todos, notes, memories}>`

Search all memory types for matching items.

**Parameters:**
- `query` (string): Search text

**Return value:** 
```javascript
Promise<{
  todos: Array<{id, text, url, done, createdAt}>,
  notes: Array<{id, text, url, createdAt}>,
  memories: Array<{id, key, text, createdAt}>
}>
```

**Scoring:** Phrase match +10, word match +2

**Example:**
```javascript
const results = await searchMemory('React hooks');
// Returns todos, notes, memories with 'React' or 'hooks' in them
```

---

### UI Helper Functions

#### `showTypingIndicator(): void`

Show "Assistant is typing..." animation.

**Parameters:** None

**Return value:** `void`

---

#### `hideTypingIndicator(): void`

Hide the typing indicator.

**Parameters:** None

**Return value:** `void`

---

#### `showError(message: string): void`

Display error message to user.

**Parameters:**
- `message` (string): Error text to show

**Return value:** `void`

---

#### `hideError(): void`

Clear error display.

**Parameters:** None

**Return value:** `void`

---

---

## background.js

### Core Functions

#### `extractTabContent(tabId: number): Promise<{textContent: string, markdown: string}>`

Extract readable text and Markdown from a web page.

**Parameters:**
- `tabId` (number): Chrome tab ID to extract from

**Return value:**
```javascript
Promise<{
  textContent: string,      // Plain text (max 50KB)
  markdown: string,         // Markdown format (max 50KB)
  htmlSize: number,         // Original HTML size
  truncated: boolean        // True if content was cut off
}>
```

**Behavior:**
1. Injects content script into tab
2. Extracts readable text (strips scripts, styles)
3. Converts HTML to Markdown (via `htmlToMarkdown.js`)
4. Applies size limits (50KB text, 100KB HTML)
5. Blocks restricted protocols (chrome://, file://, data:)

**Throws:**
- "Tab not accessible" for restricted pages
- "Tab load timeout" if page takes >10s

**Example:**
```javascript
const content = await extractTabContent(12345);
console.log(content.markdown);  // Markdown version of page
```

**Security:** Content scripts run in isolated context; no data leaves browser without user consent.

---

#### `waitForPageLoad(tabId: number, timeout?: number): Promise<Tab>`

Wait for a tab to finish loading.

**Parameters:**
- `tabId` (number): Tab to wait for
- `timeout` (optional `number`): Max wait time in ms (default: 10000)

**Return value:** `Promise<Tab>` — Chrome Tab object when loaded

**Throws:** "Tab load timeout" if exceeds timeout

**Example:**
```javascript
const tab = await waitForPageLoad(tabId, 15000);
```

---

#### `extractGoogleSearchResults(tabId: number, limit?: number): Promise<SearchResult[]>`

Parse organic search results from Google Search page.

**Parameters:**
- `tabId` (number): Google Search results page tab
- `limit` (optional `number`): Max results to return (default: 10)

**Return value:**
```javascript
Promise<Array<{
  title: string,
  url: string,
  description: string,
  snippet: string
}>>
```

**Behavior:**
1. Waits for page to load
2. Queries DOM for `h3` + URL patterns
3. Extracts snippets and descriptions
4. Returns top N results

**Example:**
```javascript
const results = await extractGoogleSearchResults(tabId);
// [{title: "React Docs", url: "...", description: "...", snippet: "..."}]
```

---

#### `extractGoogleAIOverview(tabId: number): Promise<string | null>`

Extract AI-generated overview from Google Search page (if available).

**Parameters:**
- `tabId` (number): Google Search results page tab

**Return value:** `Promise<string | null>` — AI overview text, or null if not found

**Behavior:**
1. Waits for page to load
2. Looks for Google's AI overview box
3. Extracts text content

**Example:**
```javascript
const overview = await extractGoogleAIOverview(tabId);
if (overview) {
  console.log('AI says:', overview);
}
```

---

### Message Handlers

#### `chrome.runtime.onMessage.addListener(callback)`

Main message dispatcher. Handles all requests from sidepanel and agent.

**Request types:**

**`getSettings`** → `{service, apiKey, model, ...}`
```javascript
chrome.runtime.sendMessage({action: 'getSettings'}, (response) => {
  console.log(response);  // Current settings
});
```

**`saveSettings`** → `{success: boolean}`
```javascript
chrome.runtime.sendMessage({
  action: 'saveSettings',
  settings: {service: 'groq', groqApiKey: '...', ...}
}, (response) => {
  console.log(response.success);
});
```

**`extractTabContent`** → `{textContent, markdown, truncated}`
```javascript
chrome.runtime.sendMessage({
  action: 'extractTabContent',
  tabId: 12345
}, (response) => {
  console.log(response.textContent);
});
```

**`agent_createTab`** → `{success, tabId, tab}`
```javascript
chrome.runtime.sendMessage({
  action: 'agent_createTab',
  url: 'https://example.com'
}, (response) => {
  if (response.success) {
    console.log('Created tab:', response.tabId);
  }
});
```

**`agent_waitForTab`** → `{success, tab}`
```javascript
chrome.runtime.sendMessage({
  action: 'agent_waitForTab',
  tabId: 12345,
  timeout: 10000
}, (response) => {
  console.log('Tab loaded');
});
```

---

---

## aiService.js

### AIService Class

#### Constructor: `new AIService(settings)`

Initialize AI service with provider configuration.

**Parameters:**
```javascript
settings: {
  service: 'groq' | 'gemini' | 'ollama' | 'lmstudio' | 'osaurus' | 'openrouter',
  groqApiKey?: string,
  groqModel?: string,      // Default: 'mixtral-8x7b-32768'
  geminiApiKey?: string,
  geminiModel?: string,    // Default: 'gemini-pro'
  ollamaUrl?: string,      // Default: 'http://localhost:11434'
  ollamaModel?: string,    // Default: 'llama2'
  lmstudioUrl?: string,    // Default: 'http://localhost:1234'
  lmstudioModel?: string,  // Default: 'local-model'
  osaurusUrl?: string,     // Default: 'http://127.0.0.1:1337'
  osaurusModel?: string,   // Default: 'foundation'
  openRouterApiKey?: string,
  openRouterModel?: string // Default: 'anthropic/claude-3.5-sonnet'
}
```

**Example:**
```javascript
const ai = new AIService({
  service: 'groq',
  groqApiKey: 'sk-...',
  groqModel: 'mixtral-8x7b-32768'
});
```

---

#### `sendMessage(messages: Message[], systemPrompt: string): Promise<string>`

Send messages to LLM and get response.

**Parameters:**
- `messages` (array): Conversation messages
- `systemPrompt` (string): System instructions for the LLM

**Message object:**
```javascript
{
  role: 'user' | 'assistant',
  content: string
}
```

**Return value:** `Promise<string>` — LLM's text response

**Behavior:**
1. Routes to appropriate provider method (`sendToGroq`, `sendToGemini`, etc.)
2. Handles API authentication and rate limiting
3. Returns clean text response

**Throws:**
- "API key not configured" if missing
- "API error: ..." for network/auth failures

**Example:**
```javascript
const response = await ai.sendMessage(
  [
    {role: 'user', content: 'What is React?'},
    {role: 'assistant', content: 'React is a JavaScript library...'},
    {role: 'user', content: 'Tell me about hooks'}
  ],
  'You are a React expert. Be concise.'
);
```

---

### Provider Methods (Internal)

#### `sendToGroq(messages, systemPrompt): Promise<string>`

Call Groq API (mixtral-8x7b-32768 or other models).

**Endpoint:** `https://api.groq.com/openai/v1/chat/completions`

**Auth:** `Authorization: Bearer {groqApiKey}`

**Payload:**
```javascript
{
  model: settings.groqModel,
  messages: [{role, content}, ...],
  temperature: 0.7,
  max_tokens: 2048
}
```

---

#### `sendToGemini(messages, systemPrompt): Promise<string>`

Call Google Gemini API.

**Endpoint:** `https://generativelanguage.googleapis.com/v1/models/{model}:generateContent`

**Auth:** API key in URL

**Payload:** Google's contentRequest format

---

#### `sendToOllama(messages, systemPrompt): Promise<string>`

Call local Ollama server.

**Endpoint:** `http://localhost:11434/api/chat`

**Payload:**
```javascript
{
  model: settings.ollamaModel,
  messages: [{role, content}, ...],
  stream: false
}
```

---

#### `sendToLMStudio(messages, systemPrompt): Promise<string>`

Call local LM Studio server.

**Endpoint:** `http://localhost:1234/v1/chat/completions`

**Payload:** OpenAI-compatible format

---

#### `sendToOsaurus(messages, systemPrompt): Promise<string>`

Call local Osaurus (Apple Foundation models).

**Endpoint:** `http://127.0.0.1:1337/chat/completions`

**Payload:** OpenAI-compatible format

---

#### `sendToOpenRouter(messages, systemPrompt): Promise<string>`

Call OpenRouter (multi-model API).

**Endpoint:** `https://openrouter.ai/api/v1/chat/completions`

**Auth:** `Authorization: Bearer {openRouterApiKey}`

**Payload:** OpenAI-compatible format

---

---

## memoryManager.js

### MemoryManager Class

Singleton instance managing todos, notes, and memories.

#### Constructor: `new MemoryManager()`

Create memory manager instance.

**Properties:**
```javascript
{
  todos: Array<{id, text, url, done, createdAt}>,
  notes: Array<{id, text, url, createdAt}>,
  memories: Array<{id, key, text, createdAt}>,
  pageStats: Map<string, {count, lastVisit}>
}
```

---

#### `addTodo(text: string, url?: string): Promise<string>`

Add a todo item.

**Parameters:**
- `text` (string): Todo description
- `url` (optional `string`): Associated URL

**Return value:** `Promise<string>` — New todo ID (UUID)

**Behavior:**
1. Creates object with timestamp
2. Saves to `chrome.storage.local`
3. Adds to `this.todos` array

**Example:**
```javascript
const id = await memoryManager.addTodo('Learn React Hooks');
```

---

#### `toggleTodo(id: string): Promise<void>`

Mark todo as done/undone.

**Parameters:**
- `id` (string): Todo ID

**Return value:** `Promise<void>`

---

#### `deleteTodo(id: string): Promise<void>`

Remove a todo.

**Parameters:**
- `id` (string): Todo ID

**Return value:** `Promise<void>`

---

#### `addNote(text: string, url?: string): Promise<string>`

Add a note.

**Parameters:**
- `text` (string): Note content
- `url` (optional `string`): Associated URL

**Return value:** `Promise<string>` — New note ID

---

#### `deleteNote(id: string): Promise<void>`

Remove a note.

**Parameters:**
- `id` (string): Note ID

**Return value:** `Promise<void>`

---

#### `addMemory(key: string, value: string): Promise<string>`

Add a memory entry.

**Parameters:**
- `key` (string): Memory name/key
- `value` (string): Memory content

**Return value:** `Promise<string>` — New memory ID

**Example:**
```javascript
await memoryManager.addMemory('favorite_color', 'blue');
```

---

#### `deleteMemory(id: string): Promise<void>`

Remove a memory.

**Parameters:**
- `id` (string): Memory ID

**Return value:** `Promise<void>`

---

#### `searchMemory(query: string): Promise<{todos, notes, memories}>`

Search todos, notes, and memories.

**Parameters:**
- `query` (string): Search text

**Return value:**
```javascript
Promise<{
  todos: Array<{...todo, score}>,
  notes: Array<{...note, score}>,
  memories: Array<{...memory, score}>
}>
```

**Scoring:**
- Exact phrase match: +10
- Word match: +2

**Example:**
```javascript
const results = await memoryManager.searchMemory('React');
```

---

#### `searchAll(query: string): Promise<{todos, notes, memories, bookmarks, history}>`

Search all sources including bookmarks and history.

**Parameters:**
- `query` (string): Search text

**Return value:**
```javascript
Promise<{
  todos: Array,
  notes: Array,
  memories: Array,
  bookmarks: Array<{title, url}>,
  history: Array<{title, url, visitCount}>
}>
```

**Behavior:**
1. Searches memory items
2. Queries Chrome bookmarks API
3. Queries Chrome history API
4. Returns all matches, scored

---

#### `getContextForAI(query?: string): string`

Format memory items as context string for LLM.

**Parameters:**
- `query` (optional `string`): If provided, returns only relevant items

**Return value:** `string` — Formatted Markdown context

**Format:**
```
## TODOS
- [ ] Item 1
- [x] Item 2

## NOTES
- Note content

## MEMORIES
- key: value

## TOP VISITED PAGES
- ...
```

**Example:**
```javascript
const context = memoryManager.getContextForAI('React');
// Returns formatted todos/notes/memories about React
```

---

---

## agentController.js

### AgentController Class

Orchestrate autonomous agent execution.

#### Constructor: `new AgentController(aiService, onUpdate)`

Initialize agent.

**Parameters:**
- `aiService` (AIService): Configured AI service
- `onUpdate` (function): Callback for progress updates

**Callback format:**
```javascript
(update: {status, message, step?, action?, result?}) => void
```

---

#### `run(task: string): Promise<string>`

Execute agent task.

**Parameters:**
- `task` (string): Task description (e.g., "Find best React courses")

**Return value:** `Promise<string>` — Final response/result

**State machine:**
1. **START** → Initialize
2. **PLAN** → Create execution plan
3. **EXECUTE_LOOP** → Run actions (max 10 iterations)
4. **COMPLETE** → Generate final response
5. **END** → Cleanup

**Throws:**
- "Task cancelled" if `cancel()` called
- "Max iterations exceeded"
- "LLM error: ..."

**Example:**
```javascript
const controller = new AgentController(ai, (update) => {
  console.log(update.status, update.message);
});

const result = await controller.run('Find a good React tutorial');
// Result: formatted markdown with findings
```

---

#### `cancel(): void`

Stop agent execution.

**Parameters:** None

**Return value:** `void`

**Behavior:**
1. Sets `isCancelled` flag
2. Closes open tabs
3. Returns partial result

**Example:**
```javascript
setTimeout(() => controller.cancel(), 5000);  // Cancel after 5s
```

---

#### `executeAction(action: {action, params}): Promise<string>`

Execute a single agent action.

**Parameters:**
```javascript
action: {
  action: string,  // One of: search_web, open_url, read_page, etc.
  params: object,  // Action-specific parameters
  reasoning: string  // Why the agent chose this action
}
```

**Return value:** `Promise<string>` — Action result (formatted for LLM)

**Behavior:**
1. Routes to appropriate tool method in `AgentTools`
2. Formats result as markdown
3. Tracks action in context array

---

#### `parseAction(response: string): {action, params, reasoning} | null`

Parse LLM response into structured action.

**Parameters:**
- `response` (string): Raw LLM response

**Return value:**
```javascript
{
  action: string,
  params: object,
  reasoning: string
} | null
```

**Parsing logic:**
1. Try to extract JSON `{action, params}`
2. If fails, try regex patterns
3. If fails, apply recovery strategy (attempt 3 fallbacks)

**Supported actions:**
- `search_web` → Search Google
- `open_url` → Open URL in tab
- `read_page` → Extract page content
- `search_history` → Search browsing history
- `search_bookmarks` → Search bookmarks
- `search_memory` → Search todos/notes/memories
- `get_recent_history` → Get recent browsing
- `open_tab` → Open new tab
- `get_open_tabs` → List open tabs
- `focus_tab` → Switch to tab
- `think` → Internal reasoning
- `complete` → Task complete

---

---

## agentTools.js

### AgentTools Class

Implement tools available to agent.

#### `search_web(params): Promise<{success, action, data}>`

Search Google.

**Parameters:**
```javascript
{
  query: string,           // Search query
  num_results?: number     // Results to return (default: 5, max: 10)
}
```

**Return value:**
```javascript
{
  success: true,
  action: 'search_web',
  data: {
    query: string,
    aiOverview?: string,   // Google's AI overview if available
    results: [{title, url, description}, ...],
    count: number,
    searchesRemaining: number
  }
}
```

**Limits:** Max 4 searches per task

---

#### `read_page(params): Promise<{success, action, data}>`

Extract content from current tab.

**Parameters:**
```javascript
{
  tabId?: number  // If omitted, uses active tab
}
```

**Return value:**
```javascript
{
  success: true,
  action: 'read_page',
  data: {
    tabId: number,
    title: string,
    url: string,
    content: string,        // First 50KB
    contentLength: number
  }
}
```

---

#### `open_url(params): Promise<{success, action, data}>`

Open URL in background tab.

**Parameters:**
```javascript
{
  url: string
}
```

**Return value:**
```javascript
{
  success: true,
  action: 'open_url',
  data: {
    url: string,
    tabId: number
  }
}
```

---

#### `search_history(params): Promise<{success, action, data}>`

Search browser history.

**Parameters:**
```javascript
{
  query: string,
  maxResults?: number  // Default: 10
}
```

**Return value:**
```javascript
{
  success: true,
  action: 'search_history',
  data: {
    query: string,
    results: [{title, url, visitCount, lastVisitTime}, ...],
    count: number
  }
}
```

---

#### `search_memory(params): Promise<{success, action, data}>`

Search todos, notes, memories.

**Parameters:**
```javascript
{
  query: string
}
```

**Return value:**
```javascript
{
  success: true,
  action: 'search_memory',
  data: {
    query: string,
    results: {
      todos: [...],
      notes: [...],
      memories: [...]
    },
    count: number
  }
}
```

---

#### `get_open_tabs(): Promise<{success, action, data}>`

List all open tabs.

**Parameters:** None

**Return value:**
```javascript
{
  success: true,
  action: 'get_open_tabs',
  data: {
    tabs: [{id, title, url}, ...],
    count: number
  }
}
```

---

#### `focus_tab(params): Promise<{success, action, data}>`

Switch to a tab.

**Parameters:**
```javascript
{
  tabId: number
}
```

**Return value:**
```javascript
{
  success: true,
  action: 'focus_tab',
  data: {
    tabId: number,
    message: 'Tab focused'
  }
}
```

---

#### `think(params): Promise<{success, action, data}>`

Internal reasoning (no external action).

**Parameters:**
```javascript
{
  reasoning: string
}
```

**Return value:**
```javascript
{
  success: true,
  action: 'think',
  data: {
    reasoning: string,
    message: 'Thought recorded'
  }
}
```

---

#### `complete(params): Promise<{success, action, data}>`

Mark task as complete.

**Parameters:**
```javascript
{
  result: string  // Summary of findings
}
```

**Return value:**
```javascript
{
  success: true,
  action: 'complete',
  data: {
    result: string,
    message: 'Task completed'
  }
}
```

---

### Configuration Constants

```javascript
{
  maxTabs: 5,                  // Max background tabs open
  maxSearches: 4,              // Max web searches per task
  pageLoadTimeout: 10000,      // 10 seconds
  maxContentLength: 50000,     // 50KB max content
  blockedDomains: [
    'chrome://',
    'file://',
    'data:',
    'about:'
  ]
}
```

---

---

## agentPrompts.js

### Prompt Templates

#### `SYSTEM: string`

System prompt defining agent capabilities.

**Content:**
- Describes 12 available tools with syntax
- Instructs on when to use each tool
- Sets safety boundaries
- Defines action JSON schema

**Used in:** All agent planning and execution steps

---

#### `PLAN(task): string`

Create execution plan prompt.

**Parameters:**
- `task` (string): User's task

**Returns:** Prompt instructing LLM to plan the task

**Expected output:**
```json
{
  "action": "search_web",
  "params": {"query": "..."},
  "reasoning": "..."
}
```

---

#### `NEXT_ACTION(task, context, result): string`

Get next action based on task progress.

**Parameters:**
- `task` (string): Original task
- `context` (string): Summary of actions taken so far
- `result` (string): Result from previous action

**Returns:** Prompt asking what to do next

---

#### `COMPLETE(task, context): string`

Generate final response prompt.

**Parameters:**
- `task` (string): Original task
- `context` (string): Full action history

**Returns:** Prompt asking for summary of findings

---

#### `RECOVER(error): string`

Error recovery prompt.

**Parameters:**
- `error` (string): Error message from failed action

**Returns:** Prompt instructing alternative approach

---

#### `EXTRACT_SEARCH(html): string`

Parse Google Search results.

**Parameters:**
- `html` (string): Page HTML

**Returns:** Prompt extracting structured results

---

#### `EXTRACT_CONTENT(html): string`

Extract readable content from page.

**Parameters:**
- `html` (string): Page HTML

**Returns:** Prompt extracting main content

---

### Helper Functions

#### `validateActionSchema(action): boolean`

Validate parsed action matches schema.

**Parameters:**
- `action` (object): Parsed action

**Return value:** `boolean`

**Checks:**
- `action.action` is string
- `action.params` is object
- `action.reasoning` is string

---

---

## Error Handling

### Common Errors & Recovery

| Error | Cause | Recovery |
|-------|-------|----------|
| "API key not configured" | Missing credentials | Show settings prompt |
| "Tab load timeout" | Page takes >10s | Retry with longer timeout |
| "Tab not accessible" | chrome://, file://, etc. | Skip or show message |
| "Max iterations exceeded" | Agent runs too long | Return partial result |
| "Search limit reached" | >4 searches | Suggest using web search outside agent |
| "No matching memories found" | Query too specific | Broaden search or use web |

---

## Comparison: UI Functions vs Agent Functions

| Task | UI (sendMessage) | Agent (@agent) |
|------|------------------|--------|
| One-off questions | ✅ Fast, uses current context | ✅ Can use multiple searches |
| Multi-step research | ❌ Requires manual tab switching | ✅ Autonomous execution |
| Memory usage | ✅ Searches personal memory first | ✅ Can search and save |
| Iterations | Single call → response | Up to 10 calls per task |
| Tab management | Manual selection | Automated (max 5 tabs) |

