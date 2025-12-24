# Agent Deep Dive — Level 3 Documentation

Detailed guide to agent mode: how it works, how to extend it, and real-world examples.

## Table of Contents

1. [Agent Execution Overview](#agent-execution-overview)
2. [State Machine & Action Parsing](#state-machine--action-parsing)
3. [Tool Implementation Guide](#tool-implementation-guide)
4. [Extending with Custom Tools](#extending-with-custom-tools)
5. [Real-world Agent Tasks](#real-world-agent-tasks)
6. [Safety & Limits](#safety--limits)
7. [Debugging & Troubleshooting](#debugging--troubleshooting)

---

## Agent Execution Overview

### What is Agent Mode?

**Agent mode** (`@agent <task>`) is autonomous task execution where the AI:
1. Plans steps to accomplish a goal
2. Executes actions (search web, read pages, search history/bookmarks/memory)
3. Iterates based on results
4. Synthesizes findings into a final answer

**Unlike regular chat:**
- Regular: "Summarize this page" → reads current page → responds
- Agent: "Find top React tutorials" → searches web → reads results → extracts key info → responds

### Core Flow

```
User types:        @agent Find latest React tutorials
                        ↓
Initialize:        Create AgentController, show UI
                        ↓
Phase 1 - PLAN:    LLM creates execution plan
                        ↓
Phase 2 - EXECUTE: Loop up to 10 iterations:
                   - Execute current action
                   - LLM decides next action (or complete)
                        ↓
Phase 3 - COMPLETE: Generate final markdown response
                        ↓
Cleanup:           Close background tabs, show result
                        ↓
User sees:         "Here are the top 5 React tutorials..."
```

### Key Differences from UI Chat

| Aspect | UI Chat | Agent Mode |
|--------|---------|-----------|
| **Entry point** | Send button (regular query) | `@agent` prefix |
| **Context** | Selected tabs + memory | Auto-searched via tools |
| **Actions** | Single LLM call | Multi-step iteration |
| **Tab management** | Manual selection | Automatic (up to 5 tabs) |
| **Search limit** | No limit | Max 4 per task |
| **Iteration** | Single response | Up to 10 iterations |
| **Use case** | Quick questions | Complex research tasks |

---

## State Machine & Action Parsing

### Agent States

```javascript
// Inside agentController.js
class AgentController {
  isRunning = false       // Task is active
  isCancelled = false     // User clicked cancel
  iterations = 0          // Current iteration count (0-10)
  task = ''               // Original user task
  context = []            // Array of {action, result} pairs
  
  // Config limits
  config = {
    maxIterations: 10,
    maxTabs: 5,
    maxSearches: 4,
    pageLoadTimeout: 10000  // 10 seconds
  }
}
```

### State Transitions

```
START
  ↓
↓→ PLANNING ←→ LLM plans first action
  ↓
EXECUTING (Iteration 1-10)
  ├─ Action: search_web
  │   └─ Result: [title, url, snippet, ...]
  │
  ├─ Action: read_page
  │   └─ Result: Page content extracted
  │
  ├─ Action: search_history
  │   └─ Result: Browsing history items
  │
  └─ (Loop: LLM decides next action or "complete")
     ↓
     If action == "complete" → Exit loop
     Else → Execute next action
  ↓
COMPLETING
  ├─ LLM synthesizes all results
  └─ Generate markdown response
  ↓
ENDING
  ├─ Close background tabs
  └─ Return final response to UI
```

### LLM Action Parsing

**The agent sends requests like:**

```
I need to find React tutorials. Let me search for them first.

{
  "action": "search_web",
  "params": {
    "query": "best React tutorials 2024",
    "num_results": 5
  },
  "reasoning": "I need to find current, high-quality React tutorials to answer the user's request."
}
```

**Parsing steps (agentController.js, parseAction function):**

```javascript
parseAction(response) {
  // Step 1: Try exact JSON extraction
  try {
    const json = JSON.parse(response);
    if (json.action && json.params) {
      return {
        action: json.action,
        params: json.params,
        reasoning: json.reasoning || ''
      };
    }
  } catch {}
  
  // Step 2: Try regex for JSON block in response
  const jsonMatch = response.match(/\{[^{}]*"action"[^{}]*\}/);
  if (jsonMatch) {
    try {
      const json = JSON.parse(jsonMatch[0]);
      return {
        action: json.action,
        params: json.params,
        reasoning: extractReasoningFromResponse(response)
      };
    } catch {}
  }
  
  // Step 3: Try regex patterns for specific actions
  const actionMatch = response.match(/action:\s*["'](\w+)["']/i);
  const paramsMatch = response.match(/params?:\s*({[^}]+})/);
  
  if (actionMatch && paramsMatch) {
    return {
      action: actionMatch[1],
      params: JSON.parse(paramsMatch[1]),
      reasoning: extractReasoningFromResponse(response)
    };
  }
  
  // Step 4: Fallback - return null, trigger recovery
  return null;  // Will use RECOVER prompt
}
```

### Recovery Mechanism (3 Strategies)

When LLM doesn't return valid action format:

```javascript
// agentController.js - recovery flow
async executeLoop() {
  let currentAction = firstAction;
  
  while (iterations < maxIterations) {
    if (!currentAction) {
      // Strategy 1: Gentle nudge
      console.warn('Invalid action format, requesting clarification');
      const recover1 = await this.callLLM(
        SYSTEM,
        RECOVER('Invalid action format. Please use exact JSON format.')
      );
      currentAction = this.parseAction(recover1);
      
      if (!currentAction) {
        // Strategy 2: Simpler format request
        const recover2 = await this.callLLM(
          SYSTEM,
          'Please provide ONLY this format:\n{"action": "...", "params": {...}}'
        );
        currentAction = this.parseAction(recover2);
      }
      
      if (!currentAction) {
        // Strategy 3: Default action
        currentAction = {
          action: 'think',
          params: {reasoning: 'Processing results'},
          reasoning: 'Fallback: recording progress'
        };
      }
    }
    
    // Execute the action
    const result = await this.executeAction(currentAction);
    this.context.push({action: currentAction.action, result});
    
    // Ask LLM for next action
    currentAction = await this.askForNextAction();
  }
}
```

---

## Tool Implementation Guide

### How Tools Work

**Tool definition in agentPrompts.js (SYSTEM prompt):**

```javascript
SYSTEM = `
You have access to the following tools:

1. search_web
   Description: Search Google for information
   Usage: {"action": "search_web", "params": {"query": "...", "num_results": 5}}
   Returns: {results: [{title, url, description, snippet}], aiOverview: "..."}
   
2. read_page
   Description: Extract content from a web page
   Usage: {"action": "read_page", "params": {"tabId": 12345}}
   Returns: {title, url, content (first 50KB)}
   
3. open_url
   Description: Open a URL in a background tab
   Usage: {"action": "open_url", "params": {"url": "https://..."}}
   Returns: {tabId, message: "opened"}
   
4. search_history
   Description: Search browser history
   Usage: {"action": "search_history", "params": {"query": "..."}}
   Returns: {results: [{title, url, visitCount, lastVisitTime}]}
   
5. search_bookmarks
   Description: Search saved bookmarks
   Usage: {"action": "search_bookmarks", "params": {"query": "..."}}
   Returns: {results: [{title, url, folder}]}
   
6. search_memory
   Description: Search todos, notes, and personal memories
   Usage: {"action": "search_memory", "params": {"query": "..."}}
   Returns: {results: {todos: [...], notes: [...], memories: [...]}}
   
7. get_open_tabs
   Description: List all currently open tabs
   Usage: {"action": "get_open_tabs", "params": {}}
   Returns: {tabs: [{id, title, url}]}
   
8. focus_tab
   Description: Switch to a specific tab
   Usage: {"action": "focus_tab", "params": {"tabId": 12345}}
   Returns: {message: "Tab focused"}
   
9. open_tab
   Description: Open a new browser tab
   Usage: {"action": "open_tab", "params": {"url": "https://..."}}
   Returns: {tabId, message: "opened"}
   
10. think
    Description: Internal reasoning (doesn't perform action)
    Usage: {"action": "think", "params": {"reasoning": "..."}}
    Returns: {message: "Thought recorded"}
    
11. get_recent_history
    Description: Get recently visited pages
    Usage: {"action": "get_recent_history", "params": {"limit": 10}}
    Returns: {results: [...]}
    
12. complete
    Description: Mark task as complete
    Usage: {"action": "complete", "params": {"result": "summary"}}
    Returns: {message: "Task completed"}
`;
```

**Tool implementation in agentTools.js:**

```javascript
class AgentTools {
  // Search tool example
  async search_web(params) {
    const { query, num_results = 5 } = params;
    
    // Validation
    if (!query) {
      return {success: false, error: 'No query provided'};
    }
    
    if (this.searchCount >= this.config.maxSearches) {
      return {
        success: true,
        action: 'search_web',
        data: {
          query,
          results: [],
          note: `Search limit reached (${this.config.maxSearches})`
        }
      };
    }
    
    this.searchCount++;
    
    try {
      // Create Google search URL
      const url = `https://www.google.com/search?udm=50&q=${encodeURIComponent(query)}`;
      
      // Open tab via background.js
      const tab = await this.createBackgroundTab(url);
      
      // Wait for load
      await this.waitForPageLoad(tab.id);
      
      // Extract results via background.js
      const results = await this.extractSearchResults(tab.id, num_results);
      const aiOverview = await this.extractAIOverview(tab.id);
      
      // Close tab
      await this.closeTab(tab.id);
      
      return {
        success: true,
        action: 'search_web',
        data: {
          query,
          results: results || [],
          aiOverview: aiOverview || null,
          count: results?.length || 0,
          searchesRemaining: this.config.maxSearches - this.searchCount
        }
      };
    } catch (error) {
      return {
        success: true,
        action: 'search_web',
        data: {
          query,
          results: [],
          error: error.message,
          note: 'Search failed. Try a different approach.'
        }
      };
    }
  }
  
  // Read page tool
  async read_page(params) {
    const { tabId } = params;
    
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'extractTabContent',
        tabId: tabId || (await this.getActiveTabId())
      });
      
      return {
        success: true,
        action: 'read_page',
        data: {
          tabId: params.tabId,
          title: response.title,
          url: response.url,
          content: response.textContent,
          contentLength: response.textContent?.length || 0
        }
      };
    } catch (error) {
      return {
        success: true,
        action: 'read_page',
        data: {
          tabId: params.tabId,
          error: error.message,
          note: 'Could not extract page content'
        }
      };
    }
  }
  
  // Think tool (no external action)
  async think(params) {
    const { reasoning } = params;
    return {
      success: true,
      action: 'think',
      data: {
        reasoning,
        message: 'Internal reasoning recorded'
      }
    };
  }
  
  // Complete tool
  async complete(params) {
    const { result } = params;
    return {
      success: true,
      action: 'complete',
      data: {
        result,
        message: 'Task marked as complete'
      }
    };
  }
}
```

---

## Extending with Custom Tools

### Step-by-step: Add a New Tool

**Scenario:** Add `translate_text` tool to translate content in another language

**Step 1: Add to SYSTEM prompt (agentPrompts.js)**

```javascript
export const AgentPrompts = {
  SYSTEM: `
    ...existing tools...
    
    13. translate_text
       Description: Translate text to another language
       Usage: {"action": "translate_text", "params": {"text": "...", "targetLang": "es"}}
       Returns: {translatedText: "...", sourceLang: "en", targetLang: "es"}
    
    IMPORTANT: Only use translate_text when the content is in a different language.
  `,
  // ... rest of prompts
};
```

**Step 2: Implement in agentTools.js**

```javascript
class AgentTools {
  // ... existing tools ...
  
  async translate_text(params) {
    const { text, targetLang } = params;
    
    // Validation
    if (!text || !targetLang) {
      return {success: false, error: 'Missing text or targetLang'};
    }
    
    // Supported languages
    const supported = ['es', 'fr', 'de', 'it', 'pt', 'ja', 'zh', 'ko'];
    if (!supported.includes(targetLang)) {
      return {
        success: true,
        action: 'translate_text',
        data: {
          error: `Language ${targetLang} not supported`,
          supportedLanguages: supported
        }
      };
    }
    
    try {
      // Option A: Use browser's native translation API (if available)
      // Option B: Call external translation service
      // Option C: Use LLM for translation
      
      const translatedText = await this.translateViaLLM(text, targetLang);
      
      return {
        success: true,
        action: 'translate_text',
        data: {
          originalText: text,
          translatedText,
          targetLang,
          confidence: 'high'
        }
      };
    } catch (error) {
      return {
        success: true,
        action: 'translate_text',
        data: {
          error: error.message,
          note: 'Translation failed, try manual translation'
        }
      };
    }
  }
  
  async translateViaLLM(text, lang) {
    // Use the same AI service to translate
    const langNames = {
      es: 'Spanish', fr: 'French', de: 'German',
      it: 'Italian', pt: 'Portuguese', ja: 'Japanese',
      zh: 'Simplified Chinese', ko: 'Korean'
    };
    
    const response = await this.aiService.sendMessage(
      [{role: 'user', content: `Translate this to ${langNames[lang]}:\n\n${text}`}],
      'You are a professional translator. Translate accurately and naturally.'
    );
    
    return response;
  }
}
```

**Step 3: Update PLAN/NEXT_ACTION prompts (optional)**

If you want the LLM to prefer this tool for specific cases:

```javascript
PLAN: (task) => `
  ...
  
  If the task involves text in a non-English language, use translate_text.
  ...
`;
```

**Step 4: Test**

```javascript
// In browser console
const task = 'Translate "Hello, how are you?" to Spanish';
await runAgentMode(task);

// Expected output:
// ✓ Tool executes
// ✓ Result shows: "Hola, ¿cómo estás?"
```

### Best Practices for Custom Tools

1. **Keep tools focused:** One tool = one clear action
2. **Return consistent format:** Always `{success, action, data}`
3. **Include error messages:** Help LLM recover gracefully
4. **Set limits:** Max iterations, max results, timeout
5. **Log execution:** For debugging
6. **Test edge cases:** Empty inputs, network errors, timeouts

---

## Real-world Agent Tasks

### Example 1: Research Task

**User input:** `@agent Summarize latest developments in quantum computing`

**Execution trace:**

```
Iteration 1: search_web
  Query: "quantum computing latest developments 2024"
  Results: 5 URLs about quantum computing news
  
Iteration 2: read_page
  Tab: https://www.nature.com/articles/quantum-breakthrough
  Content: Article about Google's quantum chip
  
Iteration 3: read_page
  Tab: https://www.ibm.com/quantum/roadmap
  Content: IBM quantum computing roadmap
  
Iteration 4: search_memory
  Query: "quantum computing research"
  Results: 1 saved note about quantum algorithms
  
Iteration 5: think
  Reasoning: "I have enough information from three sources. Time to synthesize."
  
Iteration 6: complete
  Result: "Quantum computing latest developments:
           1. Google announced quantum error correction breakthrough
           2. IBM released new 400-qubit processor
           3. Microsoft demonstrated topological qubits
           4. Local note: key algorithms include VQE and QAOA
           Sources: Nature, IBM, local research notes"

Final output to user: Formatted markdown with findings
```

### Example 2: Task Execution

**User input:** `@agent Create a checklist of React best practices`

**Execution trace:**

```
Iteration 1: search_web
  Query: "React best practices 2024"
  Results: 10 resources
  
Iteration 2: read_page
  Tab: React official documentation
  Content: Component patterns, hooks rules, etc.
  
Iteration 3: search_history
  Query: "react patterns"
  Results: 5 previously visited React pages
  
Iteration 4: think
  Reasoning: "I have sufficient information from docs and history"
  
Iteration 5: complete
  Result: "React Best Practices Checklist:
           ✓ Use functional components with hooks
           ✓ Follow rules of hooks
           ✓ Memoize expensive computations
           ✓ Keep components small and focused
           ✓ Use proper key attributes in lists
           ✓ Avoid inline object/function definitions
           ✓ Use context for shared state (not for everything)
           ✓ Test components with React Testing Library"

Final: User gets formatted checklist
```

### Example 3: Information Gathering

**User input:** `@agent Find the top 3 coffee shops near me from my bookmarks`

**Execution trace:**

```
Iteration 1: search_bookmarks
  Query: "coffee shops"
  Results: 12 bookmarked coffee shop pages
  
Iteration 2: read_page
  Tab: First coffee shop page
  Content: Hours, address, reviews (4.8 stars)
  
Iteration 3: read_page
  Tab: Second coffee shop page
  Content: Hours, address, reviews (4.7 stars)
  
Iteration 4: read_page
  Tab: Third coffee shop page
  Content: Hours, address, reviews (4.9 stars)
  
Iteration 5: complete
  Result: "Top 3 coffee shops from your bookmarks:
           1. Blue Bottle (4.9 stars) - 123 Main St
           2. Stumptown (4.8 stars) - 456 Oak Ave
           3. Intelligentsia (4.7 stars) - 789 Park Blvd
           All have hours 6am-8pm"

Final: User sees ranking
```

---

## Safety & Limits

### Resource Limits

```javascript
config = {
  maxIterations: 10,           // Max 10 action iterations
  maxTabs: 5,                  // Max 5 background tabs open at once
  maxSearches: 4,              // Max 4 web searches per task
  pageLoadTimeout: 10000,      // 10 seconds to load a page
  maxContentLength: 50000      // 50KB max content per page
}
```

**Why these limits?**

| Limit | Reason |
|-------|--------|
| 10 iterations | Prevent infinite loops, save time |
| 5 tabs | Don't overwhelm browser, save memory |
| 4 searches | Respect Google rate limits, save time |
| 10s load | Don't wait forever for slow sites |
| 50KB content | Keep LLM context reasonable |

### Blocked Domains

```javascript
blockedDomains: [
  'chrome://',           // Internal Chrome pages
  'chrome-extension://', // Other extensions
  'file://',             // Local files
  'data:',               // Data URLs
  'about:'               // About pages
]
```

**Why?**
- `chrome://`: Restricted by browser API
- `file://`: Restricted for security
- `data:`: Can be arbitrary data, not useful
- `about:`: Internal pages, no useful content

### Cancellation

User can stop agent at any time:

```javascript
// Agent UI shows cancel button
// Clicking triggers:
controller.cancel();

// Inside AgentController:
cancel() {
  this.isCancelled = true;
  this.cleanup();  // Close open tabs
  // Returns partial result to user
}
```

### Error Isolation

If one action fails, agent continues:

```javascript
const result = await this.executeAction(action);
// Even if search_web fails, agent tries next action
// Failure recorded: "Search failed: network error. Trying alternative..."
```

---

## Debugging & Troubleshooting

### Enable Debug Logging

**In agentController.js:**

```javascript
constructor(aiService, onUpdate) {
  this.debug = true;  // Set to true
  
  // Now logs appear in console
  this.log('Starting agent');
}

log(message, data) {
  if (this.debug) {
    console.log(`[Agent ${new Date().toISOString()}]`, message, data);
  }
}
```

**Or from browser console:**

```javascript
window.agentController.debug = true;
// Now all agent actions are logged
```

### Common Issues & Solutions

| Issue | Symptom | Cause | Fix |
|-------|---------|-------|-----|
| Agent won't start | "Agent mode is not available" | AgentUI not loaded | Check manifest.json, ensure agentmode/ files are included |
| Search returns empty | No results from Google | Page format changed | Update `extractSearchResults()` selectors |
| Page extraction fails | "Could not extract page content" | Page is AJAX/dynamic | Add extra wait time in `waitForPageLoad()` |
| LLM won't produce actions | Recovery attempts fail | Prompt confusion | Simplify SYSTEM prompt or use different model |
| Task runs 10 iterations | Max iterations reached | Agent looping | Add logic to detect when to call `complete` |
| Browser crashes | Memory spike | Too many tabs open | Reduce `maxTabs` config |

### View Agent Execution Log

**In browser DevTools:**

```javascript
// In Console:
window.agentController.context
// Shows all actions taken so far

window.agentController.iterations
// Current iteration count

window.agentController.isCancelled
// Whether task was cancelled
```

### Test Custom Tool

```javascript
// In console, manually test a tool:
const tools = new AgentTools(aiService);

// Test search_web
const result = await tools.search_web({
  query: 'React hooks tutorial',
  num_results: 3
});
console.log(result);  // Should show results array

// Test translate_text (if implemented)
const translated = await tools.translate_text({
  text: 'Hello',
  targetLang: 'es'
});
console.log(translated);  // Should show "Hola"
```

### Validate Action Schema

```javascript
// Check if action can be parsed:
const testResponse = `
{
  "action": "search_web",
  "params": {"query": "test", "num_results": 5},
  "reasoning": "Testing the tool"
}
`;

const action = controller.parseAction(testResponse);
console.log(action);  // Should show structured action
```

---

## Performance Optimization

### Pre-cache Common Searches

```javascript
// In agentPrompts.js, PLAN phase:
PLAN: (task) => `
  ${task}
  
  IMPORTANT: If this task is about React, Node.js, Python, or JavaScript,
  use local bookmarks and history first before web search.
  This is faster.
`;
```

### Parallel Tool Execution (Future)

Currently agent executes sequentially. Future enhancement:

```javascript
// Execute multiple non-blocking actions in parallel
async executeParallel(actions) {
  const results = await Promise.all(
    actions.map(a => this.executeAction(a))
  );
  return results;
}
```

### Cache Search Results

```javascript
// In agentTools.js:
constructor() {
  this.searchCache = new Map();  // Query → results
}

async search_web(params) {
  const cacheKey = params.query;
  
  if (this.searchCache.has(cacheKey)) {
    return this.searchCache.get(cacheKey);  // Return cached
  }
  
  const result = await performSearch(params);
  this.searchCache.set(cacheKey, result);  // Store for future
  return result;
}
```

---

## Next Steps

1. **Run your first agent task:** `@agent Find X`
2. **Observe the execution:** Watch iteration counter in UI
3. **Extend with custom tool:** Add a tool following the guide above
4. **Monitor logs:** Use browser console to watch actions
5. **Share findings:** Report issues or improvements

For API details, see `docs/API_REFERENCE.md`.
For code examples, see `docs/CODE_WALKTHROUGH.md`.
