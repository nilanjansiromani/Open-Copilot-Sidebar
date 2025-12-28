# 🤖 @agent Autonomous Mode

## Overview

When user types `@agent <task>`, the extension enters **autonomous mode** where it acts as an AI agent that can browse, search, and gather information independently.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INPUT                               │
│                   "@agent search hotels in bangalore"            │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                      TASK PLANNER (LLM)                          │
│  "I need to: 1) Search Google 2) Open results 3) Extract data"  │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                       EXECUTION LOOP                             │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐      │
│  │ Search  │───▶│  Open   │───▶│ Scrape  │───▶│ Analyze │      │
│  │ Google  │    │  Tabs   │    │ Content │    │  (LLM)  │      │
│  └─────────┘    └─────────┘    └─────────┘    └────┬────┘      │
│                                                     │           │
│                         ◀── Need more info? ────────┘           │
│                                                                  │
└─────────────────────────────────┬───────────────────────────────┘
                                  │ Task complete
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                      FINAL RESPONSE                              │
│         Consolidated list of hotels with details                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Execution Flow

### Phase 1: Parse & Plan

```
User: "@agent search for hotels in bangalore"
        │
        ▼
┌─────────────────────────────────────────┐
│ LLM receives task and creates a plan:   │
│                                         │
│ {                                       │
│   "goal": "Find hotels in Bangalore",   │
│   "steps": [                            │
│     "Search Google for hotels",         │
│     "Open top 3-5 results",             │
│     "Extract hotel names, prices, etc", │
│     "Compile into a list"               │
│   ]                                     │
│ }                                       │
└─────────────────────────────────────────┘
```

### Phase 2: Available Tools/Actions

The agent has these capabilities via Chrome APIs:

| Tool | Chrome API | Purpose |
|------|------------|---------|
| `search_web` | `chrome.tabs.create` | Open Google search in background tab |
| `open_url` | `chrome.tabs.create` | Open any URL in background |
| `read_page` | `chrome.scripting.executeScript` | Extract content from a tab |
| `close_tab` | `chrome.tabs.remove` | Clean up after scraping |
| `wait` | `setTimeout` | Wait for page to load |
| `think` | LLM call | Analyze scraped content, decide next step |
| `complete` | - | Mark task as done and compile results |

### Phase 3: Execution Loop

```
WHILE task_not_complete AND iterations < MAX_ITERATIONS:
    
    1. ASK LLM: "Given current context, what's the next action?"
       
       LLM responds with structured action:
       {
         "action": "search_web",
         "query": "best hotels in bangalore",
         "reasoning": "Need to find hotel listings first"
       }
    
    2. EXECUTE the action:
       - Create background tab with Google search
       - Wait for page load (2-3 seconds)
       - Extract search results (titles, URLs, snippets)
       - Close the tab
    
    3. UPDATE CONTEXT:
       - Add scraped data to agent's memory
       - Show user: "🔍 Searching Google... found 10 results"
    
    4. ASK LLM: "Is task complete? What's next?"
       
       LLM decides:
       - If need more info → Loop back to step 1
       - If task complete → Exit loop, compile response
```

### Phase 4: Example Flow

```
User: @agent search for hotels in bangalore

Agent: 🤖 Starting autonomous task...
       📋 Plan: Search → Scrape → Compile
       
Agent: 🔍 Searching Google for "hotels in bangalore"...
       [Opens background tab, scrapes results]
       Found: Booking.com, TripAdvisor, MakeMyTrip...

Agent: 🌐 Opening Booking.com results...
       [Opens in background, extracts hotel list]
       Found 15 hotels with prices

Agent: 🌐 Opening TripAdvisor for reviews...
       [Opens in background, extracts ratings]
       Got ratings for 12 hotels

Agent: 🧠 Analyzing and compiling results...

Agent: ✅ Task Complete!
       
       ## Hotels in Bangalore
       
       | Hotel | Price/Night | Rating | Source |
       |-------|-------------|--------|--------|
       | Taj   | ₹8,500      | 4.5⭐  | Booking |
       | ITC   | ₹12,000     | 4.7⭐  | TripAdvisor |
       | ...   | ...         | ...    | ... |
```

---

## File Structure

```
agentmode/
├── agentController.js   # Main agent orchestration
├── agentTools.js        # Browser action implementations
├── agentPrompts.js      # LLM prompt templates
└── agentUI.js           # UI update functions
```

---

## Safety & Limits

| Constraint | Value | Reason |
|------------|-------|--------|
| Max iterations | 10 | Prevent infinite loops |
| Max tabs open | 5 | Don't overwhelm browser |
| Timeout per page | 10s | Don't hang on slow sites |
| Max content per page | 50KB | Keep context manageable |
| Blocked domains | `chrome://`, `file://`, `chrome-extension://` | Security |

---

## User Experience

```
┌────────────────────────────────────────────────┐
│ 💬 @agent find me flights to goa under 5000    │
└────────────────────────────────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────────────┐
│ 🤖 Agent Mode Activated                        │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━        │
│ 📋 Task: Find flights to Goa under ₹5000       │
│                                                │
│ ⏳ Step 1/5: Planning approach...              │
│ 🔍 Step 2/5: Searching Google Flights...       │
│ 🌐 Step 3/5: Opening MakeMyTrip...             │
│ 📄 Step 4/5: Extracting flight data...         │
│ ✨ Step 5/5: Compiling results...              │
│                                                │
│ [Cancel Agent]                                 │
└────────────────────────────────────────────────┘
```

---

## API Response Format

### Action Request (LLM → Agent)
```json
{
  "action": "search_web | open_url | read_page | think | complete",
  "params": {
    "query": "search query",
    "url": "https://...",
    "reasoning": "why this action"
  }
}
```

### Action Result (Agent → LLM)
```json
{
  "success": true,
  "action": "search_web",
  "data": {
    "results": [...],
    "content": "extracted text..."
  },
  "error": null
}
```

---

## Integration Points

1. **sidepanel.js** - Detect `@agent` trigger, call agent controller
2. **background.js** - Handle background tab operations
3. **aiService.js** - LLM calls with agent-specific prompts
4. **sidepanel.html** - Agent status UI elements

