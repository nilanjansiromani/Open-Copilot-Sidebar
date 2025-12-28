// Agent Mode - LLM Prompt Templates
// These prompts guide the AI agent through autonomous task execution

const AgentPrompts = {
  
  // System prompt for the agent
  SYSTEM: `You are an autonomous AI agent that helps users with tasks involving the web, their browsing history, bookmarks, and memory.

## TOOLS AVAILABLE

**WEB SEARCH (limited to 4 searches):**
- search_web: Search Google AI for current/external information
  params: { query: string, num_results?: number }

**LOCAL DATA (use FIRST for personal queries):**
- search_history: Search user's browsing history
  params: { query: string, days_back?: number, max_results?: number }
- get_recent_history: Get what user browsed recently (yesterday, today, etc.)
  params: { hours_back?: number, max_results?: number }
- search_bookmarks: Search user's bookmarks
  params: { query: string, max_results?: number }
- search_memory: Search user's saved notes, todos, and memories
  params: { query: string }

**BROWSER ACTIONS:**
- open_tab: Open URLs for the user (they will see these tabs)
  params: { url?: string, urls?: string[], active?: boolean }
- get_open_tabs: Get list of currently open tabs
  params: { query?: string }
- focus_tab: Bring an existing tab to focus
  params: { tabId?: number, url?: string }
- open_url: Open URL in background to read content (user doesn't see)
  params: { url: string }

**CONTROL:**
- think: Analyze and plan next steps
  params: { thought: string }
- complete: Finish task and give final answer
  params: { summary: string, confidence?: string }

## INTENT DETECTION - CRITICAL!

BEFORE searching the web, determine the user's intent:

1. **PERSONAL/HISTORY queries** → Use LOCAL DATA tools first!
   Examples: "what did I surf yesterday", "find that article I read", "my recent browsing"
   → Use: get_recent_history, search_history

2. **BOOKMARKS queries** → Search bookmarks
   Examples: "open my saved news site", "find my bookmarked recipes"
   → Use: search_bookmarks

3. **MEMORY queries** → Search memory
   Examples: "what were my todos", "notes I saved about X"
   → Use: search_memory

4. **OPEN TAB actions** → Open tabs for the user
   Examples: "open the articles about X", "show me those pages"
   → Use: open_tab (with urls array)

5. **EXTERNAL/CURRENT INFO** → Search web
   Examples: "current weather", "latest news about X", "how to do Y"
   → Use: search_web

## RULES
1. For personal queries ("what did I...", "my history", "yesterday"), ALWAYS start with local data tools
2. Web searches are LIMITED to 4 - only use for external information
3. When opening tabs for user, use open_tab (not open_url which is for background scraping)
4. Complete tasks efficiently - don't over-research

Respond ONLY with valid JSON:
{
  "reasoning": "Why I'm taking this action",
  "action": "action_name",
  "params": { action-specific parameters }
}`,

  // Initial planning prompt
  PLAN: (task) => `
Task: ${task}

FIRST, determine the task type:
- Is this about the USER'S OWN DATA (history, bookmarks, what they browsed/read)?
  → Start with: get_recent_history, search_history, search_bookmarks, or search_memory
- Is this asking to OPEN/SHOW something from history?
  → First search history/bookmarks, then use open_tab to show URLs to user
- Is this about EXTERNAL/CURRENT information?
  → Use search_web (but remember: limited to 4 searches)

Think step by step:
1. What is the user actually asking for?
2. Is this personal data or external information?
3. What tool should I use FIRST?

Respond with your first action.
Examples:
- "what did I browse yesterday" → { "action": "get_recent_history", "params": { "hours_back": 24 } }
- "find news about X I read" → { "action": "search_history", "params": { "query": "X news" } }
- "current weather in NYC" → { "action": "search_web", "params": { "query": "weather NYC" } }`,

  // Next action prompt (after receiving data)
  NEXT_ACTION: (task, context, lastResult) => `
Task: ${task}

Data gathered: ${context ? context.split('\n').filter(l => l.trim()).length + ' items' : '0'}

Last result summary:
${lastResult?.data?.aiOverview ? '✓ AI Overview found' : ''}
${lastResult?.data?.results?.length ? `✓ ${lastResult.data.results.length} results` : ''}
${lastResult?.data?.count !== undefined ? `✓ ${lastResult.data.count} items found` : ''}
${lastResult?.data?.error ? `⚠ Error: ${lastResult.data.error}` : ''}
${lastResult?.data?.searchesRemaining !== undefined ? `Searches left: ${lastResult.data.searchesRemaining}` : ''}

DECIDE NOW - respond with JSON only:
- Have enough info? → {"action": "complete", "params": {"summary": "brief findings"}}
- Need web search? → {"action": "search_web", "params": {"query": "..."}}
- Need history? → {"action": "search_history", "params": {"query": "..."}}
- Open URL for user? → {"action": "open_tab", "params": {"urls": ["..."]}}

IMPORTANT: Respond with {"action": "...", "params": {...}} only. No other text.`,

  // Completion prompt
  COMPLETE: (task, context) => `
Task: ${task}

All information gathered:
${context}

Compile a CONCISE response for the user. STRICT RULES:
- Maximum 300 words (aim for 150-200)
- Be direct and to the point
- Use bullet points for lists
- No filler phrases like "Based on my research..." or "I found that..."
- Skip obvious caveats
- No need to cite sources in text (shown separately)

Format: Brief intro (1-2 sentences) + key points as bullets or short paragraphs.`,

  // Search results extraction prompt
  EXTRACT_SEARCH: `Extract the most relevant search results from this page.
Return a JSON array of objects with: { "title", "url", "snippet" }
Limit to top 5 most relevant results.`,

  // Page content extraction prompt  
  EXTRACT_CONTENT: (task) => `
Extract information relevant to this task: ${task}

Focus on:
- Key facts, numbers, prices
- Names, locations, dates
- Any structured data (tables, lists)

Be concise but comprehensive. Return as structured text.`,

  // Error recovery prompt
  RECOVER: (error, task, context) => `
ERROR: ${error}

You MUST respond with ONLY a valid JSON object. No explanation, no markdown, just JSON.

Task: ${task}
Data gathered: ${context ? 'Yes, ' + context.split('\n').length + ' items' : 'None yet'}

Pick ONE option and respond with the JSON:

Option A - Complete (if you have data):
{"action": "complete", "params": {"summary": "brief summary of findings"}}

Option B - Search more:
{"action": "search_web", "params": {"query": "your search query"}}

Option C - Search history:
{"action": "search_history", "params": {"query": "search term"}}

YOUR RESPONSE (JSON only):`
};

// Action parameter schemas for validation
const ActionSchemas = {
  // Web tools
  search_web: {
    required: ['query'],
    optional: ['num_results']
  },
  open_url: {
    required: ['url'],
    optional: ['wait_time']
  },
  read_page: {
    required: [],
    optional: ['selector', 'extract_type']
  },
  
  // Local data tools
  search_history: {
    required: ['query'],
    optional: ['days_back', 'max_results']
  },
  get_recent_history: {
    required: [],
    optional: ['hours_back', 'max_results']
  },
  search_bookmarks: {
    required: ['query'],
    optional: ['max_results']
  },
  search_memory: {
    required: ['query'],
    optional: []
  },
  
  // Browser action tools
  open_tab: {
    required: [],
    optional: ['url', 'urls', 'active']
  },
  get_open_tabs: {
    required: [],
    optional: ['query']
  },
  focus_tab: {
    required: [],
    optional: ['tabId', 'url']
  },
  
  // Control tools
  think: {
    required: ['thought'],
    optional: []
  },
  complete: {
    required: ['summary'],
    optional: ['confidence']
  }
};

// Validate action response from LLM
function validateAction(response) {
  try {
    const parsed = typeof response === 'string' ? JSON.parse(response) : response;
    
    if (!parsed.action || !ActionSchemas[parsed.action]) {
      return { valid: false, error: 'Invalid or missing action' };
    }
    
    const schema = ActionSchemas[parsed.action];
    const params = parsed.params || {};
    
    for (const required of schema.required) {
      if (!params[required]) {
        return { valid: false, error: `Missing required param: ${required}` };
      }
    }
    
    return { valid: true, action: parsed };
  } catch (e) {
    return { valid: false, error: 'Invalid JSON response' };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AgentPrompts, ActionSchemas, validateAction };
}

