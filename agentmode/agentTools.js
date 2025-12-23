// Agent Mode - Browser Tools
// Implements the actions the agent can take

const AgentTools = {
  
  // Configuration
  config: {
    maxTabs: 5,
    maxSearches: 4,          // Limit total searches per task
    pageLoadTimeout: 10000,  // 10 seconds
    maxContentLength: 50000, // 50KB per page
    blockedDomains: ['chrome://', 'chrome-extension://', 'file://', 'about:', 'data:']
  },
  
  // Track open tabs for cleanup
  openTabs: new Set(),
  
  // Track search count
  searchCount: 0,
  
  // Reset counters (call at start of new agent task)
  resetCounters() {
    this.searchCount = 0;
    this.openTabs.clear();
  },
  
  // Search the web using Google AI Search
  async search_web(params) {
    const { query, num_results = 5 } = params;
    
    if (!query) {
      return { success: false, error: 'No search query provided' };
    }
    
    // Check search limit
    if (this.searchCount >= this.config.maxSearches) {
      return {
        success: true,
        action: 'search_web',
        data: {
          query,
          results: [],
          count: 0,
          note: `Search limit reached (${this.config.maxSearches}). Use the information you have or complete the task.`
        }
      };
    }
    
    this.searchCount++;
    
    let tab = null;
    try {
      // Create Google AI Search URL (udm=50 for AI overview)
      const searchUrl = `https://www.google.com/search?udm=50&q=${encodeURIComponent(query)}`;
      
      // Open in background tab
      tab = await this.createBackgroundTab(searchUrl);
      
      // Wait for page to load (with error tolerance)
      try {
        await this.waitForPageLoad(tab.id);
      } catch (loadError) {
        console.warn('Page load warning:', loadError.message);
        // Continue anyway - page might be partially loaded
        await new Promise(r => setTimeout(r, 3000));
      }
      
      // Extract AI overview content first, then regular results
      const aiContent = await this.extractAIOverview(tab.id);
      const results = await this.extractSearchResults(tab.id, num_results);
      
      // Close the tab
      await this.closeTab(tab.id);
      
      // Even if results are empty, return success with what we got
      return {
        success: true,
        action: 'search_web',
        data: {
          query,
          aiOverview: aiContent || null,
          results: results || [],
          count: results?.length || 0,
          searchesRemaining: this.config.maxSearches - this.searchCount,
          note: aiContent ? 'AI overview found' : (results?.length === 0 ? 'No results, try different query' : null)
        }
      };
    } catch (error) {
      // Clean up tab if it exists
      if (tab?.id) {
        try { await this.closeTab(tab.id); } catch {}
      }
      // Return partial success with error note
      return { 
        success: true, // Mark as success so agent continues
        action: 'search_web',
        data: {
          query,
          aiOverview: null,
          results: [],
          count: 0,
          searchesRemaining: this.config.maxSearches - this.searchCount,
          error: error.message,
          note: 'Search failed, try alternative approach'
        }
      };
    }
  },
  
  // Open a specific URL
  async open_url(params) {
    const { url, wait_time = 3000 } = params;
    
    if (!url) {
      return { success: false, error: 'No URL provided' };
    }
    
    // Check blocked domains
    if (this.config.blockedDomains.some(d => url.startsWith(d))) {
      return { 
        success: true, // Continue but note the block
        action: 'open_url',
        data: {
          url,
          content: '',
          note: 'URL is restricted, skipping'
        }
      };
    }
    
    let tab = null;
    try {
      // Open in background tab
      tab = await this.createBackgroundTab(url);
      
      // Wait for page to load (with error tolerance)
      try {
        await this.waitForPageLoad(tab.id, wait_time);
      } catch (loadError) {
        console.warn('Page load warning:', loadError.message);
        // Wait a bit anyway
        await new Promise(r => setTimeout(r, 3000));
      }
      
      // Extract page content (with error tolerance)
      let content = '';
      let title = url;
      try {
        content = await this.extractPageContent(tab.id);
        title = tab.title || url;
      } catch (extractError) {
        console.warn('Content extraction warning:', extractError.message);
        content = `[Could not extract content from ${url}]`;
      }
      
      // Close the tab
      await this.closeTab(tab.id);
      
      return {
        success: true,
        action: 'open_url',
        data: {
          url,
          title,
          content: this.truncateContent(content),
          note: content.length < 100 ? 'Limited content extracted' : null
        }
      };
    } catch (error) {
      // Clean up tab if it exists
      if (tab?.id) {
        try { await this.closeTab(tab.id); } catch {}
      }
      // Return partial success so agent can continue
      return { 
        success: true,
        action: 'open_url',
        data: {
          url,
          title: url,
          content: `[Failed to load: ${error.message}]`,
          error: error.message,
          note: 'Page failed to load, try alternative URL'
        }
      };
    }
  },
  
  // Read content from a specific tab (if still open)
  async read_page(params, tabId) {
    const { selector, extract_type = 'text' } = params;
    
    try {
      let content;
      
      if (selector) {
        // Extract specific element
        content = await chrome.scripting.executeScript({
          target: { tabId },
          func: (sel) => {
            const el = document.querySelector(sel);
            return el ? el.innerText : null;
          },
          args: [selector]
        });
      } else {
        // Extract full page
        content = await this.extractPageContent(tabId);
      }
      
      return {
        success: true,
        action: 'read_page',
        data: {
          content: this.truncateContent(content)
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  
  // Think/analyze (just returns the thought for context)
  async think(params) {
    const { thought } = params;
    
    return {
      success: true,
      action: 'think',
      data: {
        thought
      }
    };
  },
  
  // Complete the task
  async complete(params) {
    const { summary, confidence = 'high' } = params;
    
    // Clean up any remaining tabs
    await this.cleanupTabs();
    
    return {
      success: true,
      action: 'complete',
      data: {
        summary,
        confidence,
        completed: true
      }
    };
  },
  
  // ==================== LOCAL DATA TOOLS ====================
  
  // Search browsing history
  async search_history(params) {
    const { query, max_results = 20, days_back = 7 } = params;
    
    if (!query) {
      return { success: false, error: 'No search query provided' };
    }
    
    try {
      const startTime = Date.now() - (days_back * 24 * 60 * 60 * 1000);
      
      const historyItems = await chrome.history.search({
        text: query,
        startTime,
        maxResults: max_results
      });
      
      const results = historyItems.map(item => ({
        url: item.url,
        title: item.title || item.url,
        visitCount: item.visitCount,
        lastVisit: new Date(item.lastVisitTime).toLocaleString()
      }));
      
      return {
        success: true,
        action: 'search_history',
        data: {
          query,
          results,
          count: results.length,
          daysSearched: days_back,
          note: results.length === 0 ? 'No matching history found' : null
        }
      };
    } catch (error) {
      return { 
        success: true, 
        action: 'search_history',
        data: {
          query,
          results: [],
          count: 0,
          error: error.message
        }
      };
    }
  },
  
  // Search bookmarks
  async search_bookmarks(params) {
    const { query, max_results = 20 } = params;
    
    if (!query) {
      return { success: false, error: 'No search query provided' };
    }
    
    try {
      const bookmarks = await chrome.bookmarks.search(query);
      
      const results = bookmarks
        .filter(b => b.url) // Only items with URLs (not folders)
        .slice(0, max_results)
        .map(item => ({
          url: item.url,
          title: item.title || item.url,
          dateAdded: item.dateAdded ? new Date(item.dateAdded).toLocaleString() : null
        }));
      
      return {
        success: true,
        action: 'search_bookmarks',
        data: {
          query,
          results,
          count: results.length,
          note: results.length === 0 ? 'No matching bookmarks found' : null
        }
      };
    } catch (error) {
      return { 
        success: true, 
        action: 'search_bookmarks',
        data: {
          query,
          results: [],
          count: 0,
          error: error.message
        }
      };
    }
  },
  
  // Search user's memory (notes, todos, memories)
  async search_memory(params) {
    const { query } = params;
    
    if (!query) {
      return { success: false, error: 'No search query provided' };
    }
    
    try {
      // Access memory from storage
      const data = await chrome.storage.local.get(['todos', 'notes', 'memories']);
      
      const searchLower = query.toLowerCase();
      const results = {
        todos: [],
        notes: [],
        memories: []
      };
      
      // Search todos
      if (data.todos) {
        results.todos = data.todos.filter(item => 
          item.text?.toLowerCase().includes(searchLower) ||
          item.url?.toLowerCase().includes(searchLower)
        ).map(t => ({ text: t.text, url: t.url, done: t.done, date: t.createdAt }));
      }
      
      // Search notes
      if (data.notes) {
        results.notes = data.notes.filter(item => 
          item.text?.toLowerCase().includes(searchLower) ||
          item.url?.toLowerCase().includes(searchLower)
        ).map(n => ({ text: n.text, url: n.url, date: n.createdAt }));
      }
      
      // Search memories
      if (data.memories) {
        results.memories = data.memories.filter(item => 
          item.text?.toLowerCase().includes(searchLower) ||
          item.key?.toLowerCase().includes(searchLower)
        ).map(m => ({ key: m.key, text: m.text, date: m.createdAt }));
      }
      
      const totalCount = results.todos.length + results.notes.length + results.memories.length;
      
      return {
        success: true,
        action: 'search_memory',
        data: {
          query,
          results,
          count: totalCount,
          note: totalCount === 0 ? 'No matching memories found' : null
        }
      };
    } catch (error) {
      return { 
        success: true, 
        action: 'search_memory',
        data: {
          query,
          results: { todos: [], notes: [], memories: [] },
          count: 0,
          error: error.message
        }
      };
    }
  },
  
  // Get recent history (what user surfed recently)
  async get_recent_history(params) {
    const { hours_back = 24, max_results = 50 } = params;
    
    try {
      const startTime = Date.now() - (hours_back * 60 * 60 * 1000);
      
      const historyItems = await chrome.history.search({
        text: '',  // Empty = all history
        startTime,
        maxResults: max_results
      });
      
      // Group by domain for easier reading
      const byDomain = {};
      historyItems.forEach(item => {
        try {
          const domain = new URL(item.url).hostname;
          if (!byDomain[domain]) {
            byDomain[domain] = [];
          }
          byDomain[domain].push({
            url: item.url,
            title: item.title || item.url,
            lastVisit: new Date(item.lastVisitTime).toLocaleString()
          });
        } catch {}
      });
      
      return {
        success: true,
        action: 'get_recent_history',
        data: {
          hoursBack: hours_back,
          totalItems: historyItems.length,
          byDomain,
          items: historyItems.slice(0, 20).map(h => ({
            title: h.title,
            url: h.url,
            lastVisit: new Date(h.lastVisitTime).toLocaleString()
          }))
        }
      };
    } catch (error) {
      return { 
        success: true, 
        action: 'get_recent_history',
        data: {
          hoursBack: hours_back,
          totalItems: 0,
          byDomain: {},
          items: [],
          error: error.message
        }
      };
    }
  },
  
  // ==================== BROWSER ACTION TOOLS ====================
  
  // Open URL in foreground (user can see it)
  async open_tab(params) {
    const { url, urls, active = true } = params;
    
    // Handle single URL or multiple URLs
    const urlList = urls || (url ? [url] : []);
    
    if (urlList.length === 0) {
      return { success: false, error: 'No URL provided' };
    }
    
    try {
      const openedTabs = [];
      
      for (let i = 0; i < urlList.length; i++) {
        const targetUrl = urlList[i];
        
        // Validate URL
        if (this.config.blockedDomains.some(d => targetUrl.startsWith(d))) {
          continue;
        }
        
        // Open tab - first one is active, rest are not
        const tab = await chrome.tabs.create({ 
          url: targetUrl, 
          active: active && i === 0  // Only first tab is active
        });
        
        openedTabs.push({
          tabId: tab.id,
          url: targetUrl,
          active: active && i === 0
        });
      }
      
      return {
        success: true,
        action: 'open_tab',
        data: {
          opened: openedTabs,
          count: openedTabs.length,
          note: `Opened ${openedTabs.length} tab(s) for the user`
        }
      };
    } catch (error) {
      return { 
        success: true, 
        action: 'open_tab',
        data: {
          opened: [],
          count: 0,
          error: error.message
        }
      };
    }
  },
  
  // Get currently open tabs
  async get_open_tabs(params) {
    const { query } = params || {};
    
    try {
      const tabs = await chrome.tabs.query({});
      
      let results = tabs.map(tab => ({
        tabId: tab.id,
        url: tab.url,
        title: tab.title,
        active: tab.active,
        windowId: tab.windowId
      }));
      
      // Filter if query provided
      if (query) {
        const searchLower = query.toLowerCase();
        results = results.filter(t => 
          t.title?.toLowerCase().includes(searchLower) ||
          t.url?.toLowerCase().includes(searchLower)
        );
      }
      
      return {
        success: true,
        action: 'get_open_tabs',
        data: {
          tabs: results,
          count: results.length,
          query: query || null
        }
      };
    } catch (error) {
      return { 
        success: true, 
        action: 'get_open_tabs',
        data: {
          tabs: [],
          count: 0,
          error: error.message
        }
      };
    }
  },
  
  // Focus/activate an existing tab
  async focus_tab(params) {
    const { tabId, url } = params;
    
    try {
      let targetTab;
      
      if (tabId) {
        targetTab = await chrome.tabs.get(tabId);
      } else if (url) {
        // Find tab by URL
        const tabs = await chrome.tabs.query({ url: `*://*/*` });
        targetTab = tabs.find(t => t.url?.includes(url));
      }
      
      if (!targetTab) {
        return { 
          success: true, 
          action: 'focus_tab',
          data: { found: false, note: 'Tab not found' }
        };
      }
      
      // Activate the tab and its window
      await chrome.tabs.update(targetTab.id, { active: true });
      await chrome.windows.update(targetTab.windowId, { focused: true });
      
      return {
        success: true,
        action: 'focus_tab',
        data: {
          found: true,
          tabId: targetTab.id,
          url: targetTab.url,
          title: targetTab.title
        }
      };
    } catch (error) {
      return { 
        success: true, 
        action: 'focus_tab',
        data: {
          found: false,
          error: error.message
        }
      };
    }
  },
  
  // Helper: Create a background tab (via background script)
  async createBackgroundTab(url) {
    // Check tab limit
    if (this.openTabs.size >= this.config.maxTabs) {
      // Close oldest tab
      const oldestTabId = this.openTabs.values().next().value;
      await this.closeTab(oldestTabId);
    }
    
    const response = await chrome.runtime.sendMessage({
      action: 'agent_createTab',
      url
    });
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to create tab');
    }
    
    this.openTabs.add(response.tabId);
    return response.tab;
  },
  
  // Helper: Wait for page to load (via background script)
  async waitForPageLoad(tabId, extraWait = 2000) {
    const response = await chrome.runtime.sendMessage({
      action: 'agent_waitForTab',
      tabId,
      timeout: this.config.pageLoadTimeout
    });
    
    if (!response.success) {
      throw new Error(response.error || 'Page load timeout');
    }
    
    // Additional wait for dynamic content
    await new Promise(resolve => setTimeout(resolve, extraWait));
    
    return response.tab;
  },
  
  // Helper: Extract AI Overview from Google AI Search
  async extractAIOverview(tabId) {
    const response = await chrome.runtime.sendMessage({
      action: 'agent_extractAIOverview',
      tabId
    });
    
    if (!response.success) {
      console.warn('No AI overview found:', response.error);
      return null;
    }
    
    return response.content || null;
  },
  
  // Helper: Extract search results from Google (via background script)
  async extractSearchResults(tabId, limit = 5) {
    const response = await chrome.runtime.sendMessage({
      action: 'agent_extractSearchResults',
      tabId,
      limit
    });
    
    if (!response.success) {
      console.error('Failed to extract search results:', response.error);
      return [];
    }
    
    return response.results || [];
  },
  
  // Helper: Extract page content (via background script)
  async extractPageContent(tabId) {
    const response = await chrome.runtime.sendMessage({
      action: 'agent_extractContent',
      tabId
    });
    
    if (!response.success) {
      console.error('Failed to extract content:', response.error);
      return '';
    }
    
    return response.content?.content || '';
  },
  
  // Helper: Close a tab (via background script)
  async closeTab(tabId) {
    try {
      await chrome.runtime.sendMessage({
        action: 'agent_closeTab',
        tabId
      });
      this.openTabs.delete(tabId);
    } catch (e) {
      // Tab may already be closed
      this.openTabs.delete(tabId);
    }
  },
  
  // Helper: Cleanup all agent tabs
  async cleanupTabs() {
    for (const tabId of this.openTabs) {
      await this.closeTab(tabId);
    }
    this.openTabs.clear();
  },
  
  // Helper: Truncate content to max length
  truncateContent(content) {
    if (!content) return '';
    if (content.length <= this.config.maxContentLength) return content;
    return content.substring(0, this.config.maxContentLength) + '... [truncated]';
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AgentTools;
}

