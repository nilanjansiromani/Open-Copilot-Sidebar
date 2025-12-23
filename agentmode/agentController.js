// Agent Mode - Main Controller
// Orchestrates the autonomous agent execution loop

class AgentController {
  constructor(aiService, onUpdate) {
    this.aiService = aiService;
    this.onUpdate = onUpdate || (() => {});  // Callback for UI updates
    
    // Agent state
    this.isRunning = false;
    this.isCancelled = false;
    this.task = '';
    this.context = [];
    this.iterations = 0;
    
    // Configuration
    this.config = {
      maxIterations: 10,
      maxContextItems: 20
    };
  }
  
  // Start the agent with a task
  async run(task) {
    if (this.isRunning) {
      throw new Error('Agent is already running');
    }
    
    this.isRunning = true;
    this.isCancelled = false;
    this.task = task;
    this.context = [];
    this.iterations = 0;
    
    // Reset tool counters
    if (typeof AgentTools !== 'undefined') {
      AgentTools.resetCounters();
    }
    
    this.updateUI({
      status: 'starting',
      message: '🤖 Agent Mode Activated',
      task: task
    });
    
    try {
      // Phase 1: Initial planning
      this.updateUI({
        status: 'planning',
        step: 1,
        message: '📋 Creating execution plan...'
      });
      
      const planResponse = await this.callLLM(
        AgentPrompts.SYSTEM,
        AgentPrompts.PLAN(task)
      );
      
      const firstAction = this.parseAction(planResponse);
      if (!firstAction) {
        throw new Error('Failed to create initial plan');
      }
      
      // Add plan to context
      this.addToContext('plan', firstAction.reasoning);
      
      // Phase 2: Execution loop
      let currentAction = firstAction;
      
      while (this.isRunning && !this.isCancelled && this.iterations < this.config.maxIterations) {
        this.iterations++;
        
        // Check if task is complete
        if (currentAction.action === 'complete') {
          this.updateUI({
            status: 'completing',
            step: this.iterations,
            message: '✨ Compiling final response...'
          });
          
          // Generate final response
          const finalResponse = await this.generateFinalResponse(currentAction.params?.summary);
          
          this.updateUI({
            status: 'complete',
            message: '✅ Task Complete!',
            result: finalResponse
          });
          
          return finalResponse;
        }
        
        // Execute the current action
        this.updateUI({
          status: 'executing',
          step: this.iterations,
          message: this.getActionMessage(currentAction),
          action: currentAction.action
        });
        
        const result = await this.executeAction(currentAction);
        
        // Add result to context
        this.addToContext(currentAction.action, result);
        
        // Update UI with result data (for source extraction)
        this.updateUI({
          status: 'thinking',
          step: this.iterations,
          message: '🧠 Analyzing results...',
          result: result  // Pass result for source extraction
        });
        
        const nextResponse = await this.callLLM(
          AgentPrompts.SYSTEM,
          AgentPrompts.NEXT_ACTION(this.task, this.getContextSummary(), result)
        );
        
        currentAction = this.parseAction(nextResponse);
        
        if (!currentAction) {
          console.log('First parse failed, trying recovery...');
          
          // Try to recover with a cleaner prompt
          const recoveryResponse = await this.callLLM(
            AgentPrompts.SYSTEM,
            AgentPrompts.RECOVER('Could not parse your response as JSON', this.task, this.getContextSummary())
          );
          currentAction = this.parseAction(recoveryResponse);
          
          if (!currentAction) {
            console.log('Recovery failed, trying simpler prompt...');
            
            // Second attempt: very simple prompt
            const simpleResponse = await this.callLLM(
              'Respond with ONLY a JSON object. No other text.',
              `Task: ${this.task}\n\nYou have gathered ${this.context.length} pieces of information.\n\nChoose ONE action:\n- {"action": "complete", "params": {"summary": "..."}} - if you have enough info\n- {"action": "search_web", "params": {"query": "..."}} - to search more\n\nRespond with JSON only:`
            );
            currentAction = this.parseAction(simpleResponse);
          }
          
          if (!currentAction) {
            console.log('All parsing failed, using fallback action');
            // Use fallback instead of throwing error
            currentAction = this.getFallbackAction();
            
            this.updateUI({
              status: 'recovering',
              message: '⚠️ Adapting strategy...'
            });
          }
        }
      }
      
      // Max iterations reached
      if (this.iterations >= this.config.maxIterations) {
        this.updateUI({
          status: 'max_iterations',
          message: '⚠️ Max iterations reached, compiling partial results...'
        });
        
        const partialResponse = await this.generateFinalResponse('Partial results due to iteration limit');
        return partialResponse;
      }
      
      // Cancelled
      if (this.isCancelled) {
        this.updateUI({
          status: 'cancelled',
          message: '🛑 Agent cancelled by user'
        });
        return null;
      }
      
    } catch (error) {
      this.updateUI({
        status: 'error',
        message: `❌ Error: ${error.message}`,
        error: error.message
      });
      throw error;
    } finally {
      this.isRunning = false;
      await AgentTools.cleanupTabs();
    }
  }
  
  // Cancel the running agent
  cancel() {
    this.isCancelled = true;
    this.updateUI({
      status: 'cancelling',
      message: '🛑 Cancelling agent...'
    });
  }
  
  // Execute a single action
  async executeAction(action) {
    const { action: actionName, params = {} } = action;
    
    if (!AgentTools[actionName]) {
      throw new Error(`Unknown action: ${actionName}`);
    }
    
    return await AgentTools[actionName](params);
  }
  
  // Call the LLM
  async callLLM(systemPrompt, userMessage) {
    const messages = [
      { role: 'user', content: userMessage }
    ];
    
    return await this.aiService.sendMessage(messages, systemPrompt);
  }
  
  // Parse action from LLM response
  parseAction(response) {
    if (!response) return null;
    
    // Strategy 1: Try to extract JSON from markdown code blocks
    try {
      const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1].trim());
        if (parsed.action) {
          return { action: parsed.action, params: parsed.params || {}, reasoning: parsed.reasoning || '' };
        }
      }
    } catch {}
    
    // Strategy 2: Find JSON object anywhere in text
    try {
      const objectMatch = response.match(/\{[\s\S]*?"action"\s*:\s*"[^"]+"/);
      if (objectMatch) {
        // Find the complete JSON object
        let depth = 0;
        let start = response.indexOf(objectMatch[0]);
        let end = start;
        for (let i = start; i < response.length; i++) {
          if (response[i] === '{') depth++;
          if (response[i] === '}') depth--;
          if (depth === 0) { end = i + 1; break; }
        }
        const jsonStr = response.substring(start, end);
        const parsed = JSON.parse(jsonStr);
        if (parsed.action) {
          return { action: parsed.action, params: parsed.params || {}, reasoning: parsed.reasoning || '' };
        }
      }
    } catch {}
    
    // Strategy 3: Look for action keywords in text and infer
    const actionKeywords = {
      'search_web': ['search the web', 'google search', 'searching for', 'search online'],
      'search_history': ['search history', 'browsing history', 'look in history'],
      'get_recent_history': ['recent history', 'recently browsed', 'what i surfed', 'yesterday'],
      'search_bookmarks': ['search bookmarks', 'bookmarked'],
      'search_memory': ['search memory', 'notes', 'todos', 'remember'],
      'open_url': ['open url', 'open the page', 'visit'],
      'open_tab': ['open tab', 'show the user', 'open for the user'],
      'complete': ['complete', 'done', 'finished', 'have enough', 'task is complete', 'summarize']
    };
    
    const responseLower = response.toLowerCase();
    for (const [action, keywords] of Object.entries(actionKeywords)) {
      if (keywords.some(kw => responseLower.includes(kw))) {
        // Try to extract query if needed
        let params = {};
        if (['search_web', 'search_history', 'search_bookmarks', 'search_memory'].includes(action)) {
          const queryMatch = response.match(/["']([^"']+)["']/);
          if (queryMatch) {
            params.query = queryMatch[1];
          }
        }
        if (action === 'complete') {
          params.summary = 'Task completed based on gathered information';
        }
        console.log('Inferred action from text:', action, params);
        return { action, params, reasoning: 'Inferred from response text' };
      }
    }
    
    // Strategy 4: If we have gathered context and LLM seems confused, just complete
    if (this.context.length >= 2 && (
      responseLower.includes("i have") || 
      responseLower.includes("the information") ||
      responseLower.includes("based on") ||
      responseLower.includes("found")
    )) {
      console.log('Forcing completion due to confused LLM with existing context');
      return { 
        action: 'complete', 
        params: { summary: 'Completing task with gathered information' },
        reasoning: 'Auto-completing as LLM seems to have enough information'
      };
    }
    
    console.error('Failed to parse action from:', response.substring(0, 200));
    return null;
  }
  
  // Fallback action when all parsing fails
  getFallbackAction() {
    // If we have context, complete the task
    if (this.context.length >= 1) {
      return {
        action: 'complete',
        params: { summary: 'Completing with available information' },
        reasoning: 'Fallback: completing with gathered data'
      };
    }
    // Otherwise, just search for the task
    return {
      action: 'search_web',
      params: { query: this.task },
      reasoning: 'Fallback: searching for the task'
    };
  }
  
  // Add item to context
  addToContext(type, data) {
    this.context.push({
      type,
      data,
      timestamp: Date.now()
    });
    
    // Trim old context if too large
    if (this.context.length > this.config.maxContextItems) {
      this.context = this.context.slice(-this.config.maxContextItems);
    }
  }
  
  // Get context summary for LLM
  getContextSummary() {
    return this.context.map((item, i) => {
      const data = typeof item.data === 'object' ? JSON.stringify(item.data, null, 2) : item.data;
      return `[${i + 1}] ${item.type}: ${data}`;
    }).join('\n\n');
  }
  
  // Generate final response
  async generateFinalResponse(summary) {
    const response = await this.callLLM(
      'You are a helpful assistant. Format the information clearly in Markdown.',
      AgentPrompts.COMPLETE(this.task, this.getContextSummary())
    );
    
    return response;
  }
  
  // Get human-readable action message
  getActionMessage(action) {
    const messages = {
      // Web tools
      search_web: `🔍 Searching web: "${action.params?.query}"`,
      open_url: `🌐 Opening: ${this.truncateUrl(action.params?.url)}`,
      read_page: '📄 Reading page content...',
      
      // Local data tools
      search_history: `📜 Searching your history: "${action.params?.query}"`,
      get_recent_history: `📜 Getting your recent browsing (last ${action.params?.hours_back || 24}h)...`,
      search_bookmarks: `🔖 Searching bookmarks: "${action.params?.query}"`,
      search_memory: `🧠 Searching your notes & memories: "${action.params?.query}"`,
      
      // Browser action tools
      open_tab: `🔗 Opening ${action.params?.urls?.length || 1} tab(s) for you...`,
      get_open_tabs: '📑 Checking your open tabs...',
      focus_tab: '👁️ Bringing tab to focus...',
      
      // Control tools
      think: '🧠 Analyzing information...',
      complete: '✅ Completing task...'
    };
    
    return messages[action.action] || `Executing: ${action.action}`;
  }
  
  // Truncate URL for display
  truncateUrl(url) {
    if (!url) return '';
    try {
      const u = new URL(url);
      return u.hostname + (u.pathname.length > 20 ? u.pathname.substring(0, 20) + '...' : u.pathname);
    } catch {
      return url.substring(0, 40) + '...';
    }
  }
  
  // Update UI callback
  updateUI(state) {
    this.onUpdate({
      ...state,
      iterations: this.iterations,
      maxIterations: this.config.maxIterations,
      contextSize: this.context.length
    });
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AgentController;
}

