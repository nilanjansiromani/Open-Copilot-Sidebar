// Side Panel JavaScript - Native Chrome Side Panel with Multi-Tab Support

let messages = [];
let isLoading = false;
let settings = null;
let currentService = '';
let welcomeMessageAdded = false;
let currentView = 'chat'; // 'chat', 'todos', 'notes', 'memory'

// Multi-tab context management
let contextTabs = []; // Array of { id, title, url, favicon, content, markdown }
let allOpenTabs = []; // All open browser tabs
let cachedTabContents = new Map(); // Cache for extracted tab contents
let autoContextMode = false; // Automatically search and use relevant tabs (off by default)

// Command definitions
const COMMANDS = {
  '/todo': { description: 'Add a todo with current page link', handler: handleTodoCommand },
  '/note': { description: 'Save a note', handler: handleNoteCommand },
  '/remember': { description: 'Save to memory', handler: handleRememberCommand },
  '/search': { description: 'Search bookmarks & history', handler: handleSearchCommand },
  '/clear': { description: 'Clear current conversation', handler: handleClearCommand }
};

let usageStats = {
  sitesVisited: new Set(),
  questionsAsked: 0
};

// Default pills (fallback if no custom pills are saved)
const DEFAULT_PILLS = {
  tldr: {
    label: 'TLDR',
    prompt: 'Please provide a TLDR summary in exactly 5 bullet points. Each bullet point must contain exactly 5 words. Be concise and capture the key essence.'
  },
  summarize: {
    label: 'Summarize',
    prompt: 'Please provide a concise summary of the main points and key information from the content.'
  },
  bullets: {
    label: 'Bullets',
    prompt: 'Please summarize the content into clear, concise bullet points covering the main topics and important details.'
  },
  terms: {
    label: 'Terms',
    prompt: 'Please identify and explain the key terms, concepts, and technical vocabulary from the content.'
  },
  mindmap: {
    label: 'Mindmap',
    prompt: 'Please create a mindmap of the content in Mermaid.js format. Use the mindmap syntax with a root node and organize the key topics, subtopics, and concepts hierarchically. Format it as a Mermaid code block.'
  }
};

let quickPromptTemplates = {};

const serviceIcons = {
  groq: '🚀',
  gemini: '✨',
  ollama: '🦙',
  openrouter: '🌐',
  lmstudio: '🖥️',
  osaurus: '🦖'
};

const serviceNames = {
  groq: 'Groq',
  gemini: 'Gemini',
  ollama: 'Ollama',
  lmstudio: 'LM Studio',
  osaurus: 'Osaurus',
  openrouter: 'OpenRouter'
};

// DOM Elements
const messagesList = document.getElementById('messagesList');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const settingsBtn = document.getElementById('settingsBtn');
const clearPageBtn = document.getElementById('clearPageBtn');
const clearAllBtn = document.getElementById('clearAllBtn');
const pageInfo = document.getElementById('pageInfo');
const pageTitle = document.getElementById('pageTitle');
const serviceBadge = document.getElementById('serviceBadge');
const errorBanner = document.getElementById('errorBanner');
const errorMessage = document.getElementById('errorMessage');
const closeError = document.getElementById('closeError');
const quickPrompts = document.getElementById('quickPrompts');
const settingsPanel = document.getElementById('settingsPanel');
const settingsPanelClose = document.getElementById('settingsPanelClose');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const serviceSelect = document.getElementById('serviceSelect');
const settingsConfirmation = document.getElementById('settingsConfirmation');
const contextToggle = document.getElementById('contextToggle');

// Tabs panel elements
const addTabsBtn = document.getElementById('addTabsBtn');
const tabsPanel = document.getElementById('tabsPanel');
const tabsPanelClose = document.getElementById('tabsPanelClose');
const tabsList = document.getElementById('tabsList');
const tabsSearch = document.getElementById('tabsSearch');
const addSelectedTabsBtn = document.getElementById('addSelectedTabsBtn');
const clearTabsBtn = document.getElementById('clearTabsBtn');
const activeTabsContext = document.getElementById('activeTabsContext');
const contextTabsContainer = document.getElementById('contextTabs');

// @ Mention popup elements
const mentionPopup = document.getElementById('mentionPopup');
const mentionSearch = document.getElementById('mentionSearch');
const mentionList = document.getElementById('mentionList');
const mentionTitle = document.getElementById('mentionTitle');
const contextChipsContainer = document.getElementById('contextChips');
const searchBookmarksBtn = document.getElementById('searchBookmarksBtn');
const searchHistoryBtn = document.getElementById('searchHistoryBtn');

// @ Mention state
let mentionActive = false;
let mentionMode = 'tabs'; // 'tabs', 'bookmarks', 'history'
let mentionHighlightIndex = 0;
let mentionItems = [];

// Load settings
function loadSettings() {
  chrome.runtime.sendMessage({ action: 'getSettings' }, (response) => {
    if (response) {
      settings = response;
      currentService = response.service || 'groq';
      updateServiceBadge();
      populateSettingsPanel();
    }
  });
}

loadSettings();

// Load custom pills from storage
function loadCustomPills() {
  chrome.storage.sync.get(['customPills'], (result) => {
    if (result.customPills && Object.keys(result.customPills).length > 0) {
      const customPills = result.customPills;
      quickPromptTemplates = {};
      
      Object.entries(customPills).forEach(([key, data]) => {
        quickPromptTemplates[key] = data.prompt;
      });
      
      console.log('Loaded custom pills:', Object.keys(quickPromptTemplates));
      renderQuickPrompts(customPills);
    } else {
      Object.entries(DEFAULT_PILLS).forEach(([key, data]) => {
        quickPromptTemplates[key] = data.prompt;
      });
      
      console.log('Using default pills');
      renderQuickPrompts(DEFAULT_PILLS);
    }
  });
}

// Render quick prompt buttons dynamically
function renderQuickPrompts(pills) {
  const quickPromptsContainer = document.getElementById('quickPrompts');
  if (!quickPromptsContainer) return;
  
  const defaultIcons = {
    tldr: '⚡',
    summarize: '✨',
    bullets: '📋',
    terms: '📚',
    mindmap: '🧠',
    explain: '💡',
    translate: '🌍',
    code: '💻',
    analyze: '🔍',
    compare: '⚖️'
  };
  
  quickPromptsContainer.innerHTML = '';
  
  Object.entries(pills).forEach(([key, data]) => {
    const button = document.createElement('button');
    button.className = 'quick-prompt-button';
    button.setAttribute('data-prompt', key);
    
    const iconSpan = document.createElement('span');
    iconSpan.textContent = defaultIcons[key] || '💊';
    
    const labelSpan = document.createElement('span');
    labelSpan.textContent = data.label;
    
    button.appendChild(iconSpan);
    button.appendChild(labelSpan);
    quickPromptsContainer.appendChild(button);
  });
  
  document.querySelectorAll('.quick-prompt-button').forEach(btn => {
    btn.addEventListener('click', () => {
      const promptType = btn.getAttribute('data-prompt');
      const promptText = quickPromptTemplates[promptType];
      if (promptText) {
        sendMessage(promptText);
      }
    });
  });
}

// Listen for pills updates from settings page
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'pillsUpdated') {
    console.log('Pills updated, reloading...');
    loadCustomPills();
  }
  if (request.action === 'tabContentExtracted') {
    handleExtractedTabContent(request.tabId, request.content);
  }
});

loadCustomPills();

// Load usage stats
function loadUsageStats() {
  chrome.storage.local.get(['usageStats'], (result) => {
    if (result.usageStats) {
      usageStats.sitesVisited = new Set(result.usageStats.sitesVisited || []);
      usageStats.questionsAsked = result.usageStats.questionsAsked || 0;
    }
    updateStatsDisplay();
  });
}

function saveUsageStats() {
  const statsToSave = {
    sitesVisited: Array.from(usageStats.sitesVisited),
    questionsAsked: usageStats.questionsAsked
  };
  chrome.storage.local.set({ usageStats: statsToSave });
}

function updateStatsDisplay() {
  const sitesCount = document.getElementById('sitesCount');
  const questionsCount = document.getElementById('questionsCount');
  
  if (sitesCount) {
    sitesCount.textContent = usageStats.sitesVisited.size;
  }
  if (questionsCount) {
    questionsCount.textContent = usageStats.questionsAsked;
  }
}

function trackSiteVisit(url) {
  try {
    const hostname = new URL(url).hostname;
    if (!usageStats.sitesVisited.has(hostname)) {
      usageStats.sitesVisited.add(hostname);
      saveUsageStats();
      updateStatsDisplay();
    }
  } catch (error) {
    console.error('Error tracking site visit:', error);
  }
}

function trackQuestionAsked() {
  usageStats.questionsAsked++;
  saveUsageStats();
  updateStatsDisplay();
}

loadUsageStats();

// Load context toggle state
function loadContextToggleState() {
  chrome.storage.local.get(['autoSearchTabs'], (result) => {
    // Default to OFF (false) if not set
    autoContextMode = result.autoSearchTabs === true;
    if (contextToggle) {
      contextToggle.checked = autoContextMode;
    }
    updateAutoModeIndicator();
  });
}

function saveContextToggleState() {
  if (contextToggle) {
    autoContextMode = contextToggle.checked;
    chrome.storage.local.set({ autoSearchTabs: autoContextMode });
  }
}

loadContextToggleState();

if (contextToggle) {
  contextToggle.addEventListener('change', () => {
    saveContextToggleState();
    updateAutoModeIndicator();
  });
}

// Update auto mode indicator
function updateAutoModeIndicator() {
  const indicator = document.getElementById('autoModeIndicator');
  if (indicator) {
    indicator.classList.toggle('disabled', !autoContextMode);
    indicator.title = autoContextMode 
      ? "Auto-search is active - I'll automatically find relevant tabs" 
      : "Auto-search is OFF - using only the active tab";
  }
}

// Initialize auto mode indicator
setTimeout(updateAutoModeIndicator, 100);

// Get welcome message based on context
function getWelcomeMessage() {
  if (contextTabs.length > 0) {
    const tabNames = contextTabs.map(t => `"${t.title}"`).join(', ');
    return `I've loaded ${contextTabs.length} tab(s) into context: ${tabNames}. You can ask me anything about them, or use the quick prompts below!`;
  } else {
    return `Hello! I'm **OpenCopilot**. I'm using the **current tab** as context.

**Commands:** \`/todo\`, \`/note\`, \`/remember\`, \`/search\`

Toggle "Auto-search tabs" in settings to search across all open tabs.`;
  }
}

// Initialize Mermaid
if (typeof mermaid !== 'undefined') {
  mermaid.initialize({ 
    startOnLoad: false,
    theme: 'dark',
    themeVariables: {
      primaryColor: '#1e3c72',
      primaryTextColor: '#e2e8f0',
      primaryBorderColor: '#60a5fa',
      lineColor: '#60a5fa',
      secondaryColor: '#2a5298',
      tertiaryColor: '#051020',
      background: '#0a1628',
      mainBkg: '#0a1628',
      secondBkg: '#051020',
      textColor: '#e2e8f0',
      border1: '#60a5fa',
      border2: '#3b82f6',
      fontFamily: 'Lato, sans-serif'
    }
  });
}

// Get context key for storage (based on context tabs)
function getContextKey() {
  if (contextTabs.length === 0) return 'conversation_general';
  const tabIds = contextTabs.map(t => t.id).sort().join('_');
  return `conversation_tabs_${tabIds}`;
}

// Save conversation history
function saveConversationHistory() {
  const historyKey = getContextKey();
  const conversationData = {
    messages: messages.map(m => ({
      role: m.role,
      content: m.content,
      timestamp: m.timestamp.toISOString(),
      isError: m.isError
    })),
    contextTabs: contextTabs.map(t => ({ id: t.id, title: t.title, url: t.url })),
    lastUpdated: new Date().toISOString()
  };
  
  chrome.storage.local.set({ [historyKey]: conversationData }, () => {
    console.log('Conversation saved');
  });
}

// Load conversation history
function loadConversationHistory() {
  const historyKey = getContextKey();
  
  chrome.storage.local.get([historyKey], (result) => {
    if (result[historyKey] && result[historyKey].messages) {
      console.log('Loading conversation history');
      const savedMessages = result[historyKey].messages;
      
      messages = [];
      messagesList.innerHTML = '';
      welcomeMessageAdded = false;
      
      savedMessages.forEach(msg => {
        const timestamp = new Date(msg.timestamp);
        addMessageWithoutSave(msg.role, msg.content, msg.isError, timestamp);
      });
      
      if (messages.length > 0 && messages[0].role === 'assistant') {
        welcomeMessageAdded = true;
      }
    } else {
      if (!welcomeMessageAdded) {
        welcomeMessageAdded = true;
        addMessage('assistant', getWelcomeMessage());
      }
    }
  });
}

// Show settings confirmation message
function showSettingsConfirmation(message) {
  settingsConfirmation.innerHTML = message;
  settingsConfirmation.classList.add('show');
  
  setTimeout(() => {
    settingsConfirmation.classList.remove('show');
  }, 3000);
}

// Clear current chat
function clearCurrentChat() {
  const historyKey = getContextKey();
  
  if (confirm('Clear the current chat history?')) {
    chrome.storage.local.remove([historyKey], () => {
      messages = [];
      messagesList.innerHTML = '';
      welcomeMessageAdded = false;
      welcomeMessageAdded = true;
      addMessage('assistant', getWelcomeMessage());
      showSettingsConfirmation('Chat history cleared');
    });
  }
}

// Clear all conversations and reset stats
function clearAllData() {
  if (confirm('Clear ALL conversations and reset usage statistics?\n\nThis action cannot be undone!')) {
    chrome.storage.local.get(null, (items) => {
      const keysToRemove = [];
      
      for (const key in items) {
        if (key.startsWith('conversation_') || key === 'usageStats') {
          keysToRemove.push(key);
        }
      }
      
      chrome.storage.local.remove(keysToRemove, () => {
        usageStats.sitesVisited = new Set();
        usageStats.questionsAsked = 0;
        updateStatsDisplay();
        
        messages = [];
        messagesList.innerHTML = '';
        welcomeMessageAdded = false;
        contextTabs = [];
        updateContextTabsDisplay();
        
        welcomeMessageAdded = true;
        addMessage('assistant', getWelcomeMessage());
        
        showSettingsConfirmation('All conversations and stats cleared');
      });
    });
  }
}

// ==================== @ MENTION POPUP ====================

// Show the mention popup
function showMentionPopup() {
  if (!mentionPopup) return;
  
  mentionActive = true;
  mentionMode = 'tabs';
  mentionHighlightIndex = 0;
  mentionPopup.style.display = 'block';
  
  // Reset state
  if (mentionSearch) {
    mentionSearch.value = '';
    mentionSearch.placeholder = 'Filter tabs...';
  }
  if (mentionTitle) {
    mentionTitle.textContent = 'Open Tabs';
  }
  
  // Reset button states
  searchBookmarksBtn?.classList.remove('active');
  searchHistoryBtn?.classList.remove('active');
  
  // Load tabs
  loadMentionTabs();
  
  // Focus search after a small delay
  setTimeout(() => mentionSearch?.focus(), 50);
}

// Hide the mention popup
function hideMentionPopup() {
  if (!mentionPopup) return;
  
  mentionActive = false;
  mentionPopup.style.display = 'none';
}

// Load open tabs into mention popup
async function loadMentionTabs(filter = '') {
  if (!mentionList) return;
  
  try {
    const tabs = await chrome.tabs.query({});
    const accessibleTabs = tabs.filter(tab => 
      tab.url &&
      !tab.url.startsWith('chrome://') && 
      !tab.url.startsWith('chrome-extension://') &&
      !tab.url.startsWith('edge://') &&
      !tab.url.startsWith('about:') &&
      !tab.url.startsWith('data:')
    );
    
    // Filter if search provided
    const filterLower = filter.toLowerCase();
    mentionItems = filterLower 
      ? accessibleTabs.filter(tab => 
          tab.title?.toLowerCase().includes(filterLower) ||
          tab.url?.toLowerCase().includes(filterLower)
        )
      : accessibleTabs;
    
    renderMentionList();
  } catch (error) {
    console.error('Error loading tabs:', error);
    mentionList.innerHTML = '<div class="mention-empty">Unable to load tabs</div>';
  }
}

// Search bookmarks
async function searchBookmarks(query) {
  if (!mentionList) return;
  
  if (!query.trim()) {
    mentionList.innerHTML = '<div class="mention-empty">Type to search bookmarks...</div>';
    mentionItems = [];
    return;
  }
  
  try {
    const results = await chrome.bookmarks.search(query);
    mentionItems = results
      .filter(b => b.url)
      .slice(0, 15)
      .map(b => ({
        id: `bookmark-${b.id}`,
        title: b.title || b.url,
        url: b.url,
        favIconUrl: `https://www.google.com/s2/favicons?domain=${new URL(b.url).hostname}&sz=32`,
        type: 'bookmark'
      }));
    
    renderMentionList();
  } catch (error) {
    console.error('Error searching bookmarks:', error);
    mentionList.innerHTML = '<div class="mention-empty">Error searching bookmarks</div>';
  }
}

// Search history
async function searchHistory(query) {
  if (!mentionList) return;
  
  if (!query.trim()) {
    mentionList.innerHTML = '<div class="mention-empty">Type to search history...</div>';
    mentionItems = [];
    return;
  }
  
  try {
    const results = await chrome.history.search({
      text: query,
      maxResults: 15
    });
    
    mentionItems = results
      .filter(h => h.url)
      .map(h => ({
        id: `history-${h.id}`,
        title: h.title || h.url,
        url: h.url,
        favIconUrl: `https://www.google.com/s2/favicons?domain=${new URL(h.url).hostname}&sz=32`,
        type: 'history'
      }));
    
    renderMentionList();
  } catch (error) {
    console.error('Error searching history:', error);
    mentionList.innerHTML = '<div class="mention-empty">Error searching history</div>';
  }
}

// Render the mention list
function renderMentionList() {
  if (!mentionList) return;
  
  if (mentionItems.length === 0) {
    const emptyText = mentionMode === 'tabs' ? 'No tabs found' 
      : mentionMode === 'bookmarks' ? 'No bookmarks found'
      : 'No history found';
    mentionList.innerHTML = `<div class="mention-empty">${emptyText}</div>`;
    return;
  }
  
  mentionList.innerHTML = mentionItems.map((item, index) => {
    const isSelected = contextTabs.some(ct => ct.url === item.url);
    const isHighlighted = index === mentionHighlightIndex;
    
    let hostname = '';
    try {
      hostname = new URL(item.url).hostname.replace('www.', '');
    } catch (e) {
      hostname = item.url?.substring(0, 30) || '';
    }
    
    return `
      <div class="mention-item ${isSelected ? 'selected' : ''} ${isHighlighted ? 'highlighted' : ''}" 
           data-index="${index}">
        <img class="mention-favicon" 
             src="${item.favIconUrl || `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`}" 
             onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22%2394a3b8%22><rect width=%2224%22 height=%2224%22 rx=%224%22/></svg>'">
        <div class="mention-item-content">
          <div class="mention-item-title">${escapeHtml(item.title || 'Untitled')}</div>
          <div class="mention-item-url">${hostname}</div>
        </div>
        <div class="mention-check">${Icons.check || ''}</div>
      </div>
    `;
  }).join('');
  
  // Add click handlers
  mentionList.querySelectorAll('.mention-item').forEach(el => {
    el.addEventListener('click', () => {
      const index = parseInt(el.dataset.index);
      selectMentionItem(index);
    });
  });
}

// Select an item from the mention list
async function selectMentionItem(index) {
  const item = mentionItems[index];
  if (!item) return;
  
  // Check if already in context
  const existingIndex = contextTabs.findIndex(ct => ct.url === item.url);
  
  if (existingIndex >= 0) {
    // Remove from context
    contextTabs.splice(existingIndex, 1);
  } else {
    // Add to context
    if (item.type === 'bookmark' || item.type === 'history') {
      // For bookmarks/history, we just add the reference
      contextTabs.push({
        id: item.id,
        title: item.title,
        url: item.url,
        favicon: item.favIconUrl,
        content: `Reference: ${item.title}\nURL: ${item.url}`,
        markdown: `**Reference:** [${item.title}](${item.url})`
      });
    } else {
      // For tabs, try to extract content
      try {
        const content = await chrome.runtime.sendMessage({
          action: 'extractTabContent',
          tabId: item.id
        });
        
        contextTabs.push({
          id: item.id,
          title: item.title,
          url: item.url,
          favicon: item.favIconUrl,
          content: content?.textContent || '',
          markdown: content?.markdown || content?.textContent || ''
        });
      } catch (error) {
        console.error('Error extracting tab content:', error);
        contextTabs.push({
          id: item.id,
          title: item.title,
          url: item.url,
          favicon: item.favIconUrl,
          content: '',
          markdown: ''
        });
      }
    }
  }
  
  // Update UI
  renderMentionList();
  updateContextChips();
  updatePageInfo();
}

// Update context chips display
function updateContextChips() {
  if (!contextChipsContainer) return;
  
  if (contextTabs.length === 0) {
    contextChipsContainer.innerHTML = '';
    return;
  }
  
  contextChipsContainer.innerHTML = contextTabs.map(tab => {
    let hostname = '';
    try {
      hostname = new URL(tab.url).hostname.replace('www.', '');
    } catch (e) {
      hostname = tab.title?.substring(0, 15) || 'Tab';
    }
    
    return `
      <span class="context-chip" data-url="${escapeHtml(tab.url)}">
        <img class="context-chip-favicon" 
             src="${tab.favicon || `https://www.google.com/s2/favicons?domain=${hostname}&sz=16`}" 
             onerror="this.style.display='none'">
        <span class="context-chip-text" title="${escapeHtml(tab.title)}">${escapeHtml(hostname)}</span>
        <button class="context-chip-remove" data-url="${escapeHtml(tab.url)}">×</button>
      </span>
    `;
  }).join('');
  
  // Add remove handlers
  contextChipsContainer.querySelectorAll('.context-chip-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const url = btn.dataset.url;
      contextTabs = contextTabs.filter(ct => ct.url !== url);
      updateContextChips();
      updatePageInfo();
    });
  });
}

// Handle keyboard navigation in mention popup
function handleMentionKeydown(e) {
  if (!mentionActive) return false;
  
  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      mentionHighlightIndex = Math.min(mentionHighlightIndex + 1, mentionItems.length - 1);
      renderMentionList();
      scrollHighlightedIntoView();
      return true;
      
    case 'ArrowUp':
      e.preventDefault();
      mentionHighlightIndex = Math.max(mentionHighlightIndex - 1, 0);
      renderMentionList();
      scrollHighlightedIntoView();
      return true;
      
    case 'Enter':
      e.preventDefault();
      if (mentionItems[mentionHighlightIndex]) {
        selectMentionItem(mentionHighlightIndex);
      }
      return true;
      
    case 'Escape':
      e.preventDefault();
      hideMentionPopup();
      messageInput?.focus();
      return true;
      
    case 'Tab':
      e.preventDefault();
      if (e.shiftKey) {
        mentionHighlightIndex = Math.max(mentionHighlightIndex - 1, 0);
      } else {
        mentionHighlightIndex = Math.min(mentionHighlightIndex + 1, mentionItems.length - 1);
      }
      renderMentionList();
      scrollHighlightedIntoView();
      return true;
  }
  
  return false;
}

// Scroll highlighted item into view
function scrollHighlightedIntoView() {
  const highlighted = mentionList?.querySelector('.mention-item.highlighted');
  if (highlighted) {
    highlighted.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}

// Initialize mention popup event listeners
function initMentionPopup() {
  if (!mentionPopup) return;
  
  // Handle search input
  if (mentionSearch) {
    mentionSearch.addEventListener('input', (e) => {
      const query = e.target.value;
      mentionHighlightIndex = 0;
      
      if (mentionMode === 'tabs') {
        loadMentionTabs(query);
      } else if (mentionMode === 'bookmarks') {
        searchBookmarks(query);
      } else if (mentionMode === 'history') {
        searchHistory(query);
      }
    });
    
    mentionSearch.addEventListener('keydown', handleMentionKeydown);
  }
  
  // Bookmarks button
  if (searchBookmarksBtn) {
    searchBookmarksBtn.addEventListener('click', () => {
      mentionMode = 'bookmarks';
      mentionHighlightIndex = 0;
      searchBookmarksBtn.classList.add('active');
      searchHistoryBtn?.classList.remove('active');
      
      if (mentionTitle) mentionTitle.textContent = 'Bookmarks';
      if (mentionSearch) {
        mentionSearch.placeholder = 'Search bookmarks...';
        mentionSearch.value = '';
        mentionSearch.focus();
      }
      mentionList.innerHTML = '<div class="mention-empty">Type to search bookmarks...</div>';
      mentionItems = [];
    });
  }
  
  // History button
  if (searchHistoryBtn) {
    searchHistoryBtn.addEventListener('click', () => {
      mentionMode = 'history';
      mentionHighlightIndex = 0;
      searchHistoryBtn.classList.add('active');
      searchBookmarksBtn?.classList.remove('active');
      
      if (mentionTitle) mentionTitle.textContent = 'History';
      if (mentionSearch) {
        mentionSearch.placeholder = 'Search history...';
        mentionSearch.value = '';
        mentionSearch.focus();
      }
      mentionList.innerHTML = '<div class="mention-empty">Type to search history...</div>';
      mentionItems = [];
    });
  }
  
  // Close when clicking outside
  document.addEventListener('click', (e) => {
    if (mentionActive && 
        !mentionPopup.contains(e.target) && 
        e.target !== messageInput) {
      hideMentionPopup();
    }
  });
  
  // Handle @ in main input
  if (messageInput) {
    messageInput.addEventListener('input', (e) => {
      const value = e.target.value;
      const cursorPos = e.target.selectionStart;
      
      // Check if @ was just typed
      if (value[cursorPos - 1] === '@') {
        // Remove the @ from input
        e.target.value = value.slice(0, cursorPos - 1) + value.slice(cursorPos);
        showMentionPopup();
      }
    });
    
    messageInput.addEventListener('keydown', (e) => {
      if (mentionActive && handleMentionKeydown(e)) {
        return;
      }
    });
  }
}

// Initialize mention popup
initMentionPopup();

// ==================== TABS MANAGEMENT ====================

// Open tabs panel
function openTabsPanel() {
  tabsPanel.classList.add('show');
  loadOpenTabs();
}

// Close tabs panel
function closeTabsPanel() {
  tabsPanel.classList.remove('show');
}

// Load all open tabs
async function loadOpenTabs() {
  try {
    const tabs = await chrome.tabs.query({});
    allOpenTabs = tabs.filter(tab => 
      !tab.url.startsWith('chrome://') && 
      !tab.url.startsWith('chrome-extension://') &&
      !tab.url.startsWith('edge://') &&
      !tab.url.startsWith('about:')
    );
    renderTabsList();
  } catch (error) {
    console.error('Error loading tabs:', error);
  }
}

// Render tabs list
function renderTabsList(filter = '') {
  tabsList.innerHTML = '';
  
  const filteredTabs = allOpenTabs.filter(tab => {
    const searchText = filter.toLowerCase();
    return tab.title.toLowerCase().includes(searchText) || 
           tab.url.toLowerCase().includes(searchText);
  });
  
  if (filteredTabs.length === 0) {
    tabsList.innerHTML = `
      <div class="tabs-empty">
        <div class="tabs-empty-icon">📭</div>
        <div class="tabs-empty-text">No tabs found</div>
      </div>
    `;
    return;
  }
  
  filteredTabs.forEach(tab => {
    const isInContext = contextTabs.some(ct => ct.id === tab.id);
    
    const tabItem = document.createElement('div');
    tabItem.className = `tab-item ${isInContext ? 'in-context' : ''}`;
    tabItem.setAttribute('data-tab-id', tab.id);
    
    tabItem.innerHTML = `
      <input type="checkbox" class="tab-checkbox" ${isInContext ? 'checked disabled' : ''}>
      <img class="tab-favicon" src="${tab.favIconUrl || 'data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\"><rect fill=\"%2360a5fa\" width=\"24\" height=\"24\" rx=\"4\"/></svg>'}" alt="">
      <div class="tab-info">
        <div class="tab-title">${escapeHtml(tab.title)}</div>
        <div class="tab-url">${escapeHtml(tab.url)}</div>
      </div>
    `;
    
    if (!isInContext) {
      tabItem.addEventListener('click', (e) => {
        if (e.target.classList.contains('tab-checkbox')) return;
        const checkbox = tabItem.querySelector('.tab-checkbox');
        checkbox.checked = !checkbox.checked;
        tabItem.classList.toggle('selected', checkbox.checked);
      });
    }
    
    tabsList.appendChild(tabItem);
  });
}

// Add selected tabs to context
async function addSelectedTabsToContext() {
  const selectedItems = tabsList.querySelectorAll('.tab-item.selected');
  const tabIds = Array.from(selectedItems).map(item => parseInt(item.getAttribute('data-tab-id')));
  
  if (tabIds.length === 0) {
    showSettingsConfirmation('Please select at least one tab');
    return;
  }
  
  showSettingsConfirmation(`Adding ${tabIds.length} tab(s)...`);
  
  for (const tabId of tabIds) {
    const tab = allOpenTabs.find(t => t.id === tabId);
    if (tab && !contextTabs.some(ct => ct.id === tabId)) {
      // Request content extraction from background script
      try {
        const content = await chrome.runtime.sendMessage({
          action: 'extractTabContent',
          tabId: tabId
        });
        
        if (content) {
          contextTabs.push({
            id: tabId,
            title: tab.title,
            url: tab.url,
            favicon: tab.favIconUrl,
            content: content.textContent,
            markdown: content.markdown || content.textContent
          });
          
          trackSiteVisit(tab.url);
        }
      } catch (error) {
        console.error('Error extracting content from tab:', tabId, error);
      }
    }
  }
  
  updateContextTabsDisplay();
  closeTabsPanel();
  
  // Update welcome message or add context notification
  if (contextTabs.length > 0) {
    addMessage('assistant', `Added ${tabIds.length} tab(s) to context. I can now answer questions about: ${contextTabs.map(t => `"${t.title}"`).join(', ')}`);
  }
  
  updatePageInfo();
}

// Handle extracted tab content
function handleExtractedTabContent(tabId, content) {
  const tabIndex = contextTabs.findIndex(t => t.id === tabId);
  if (tabIndex !== -1) {
    contextTabs[tabIndex].content = content.textContent;
    contextTabs[tabIndex].markdown = content.markdown || content.textContent;
  }
}

// Remove tab from context
function removeTabFromContext(tabId) {
  contextTabs = contextTabs.filter(t => t.id !== tabId);
  updateContextTabsDisplay();
  updatePageInfo();
}

// Update context tabs display in header
function updateContextTabsDisplay() {
  if (contextTabs.length === 0) {
    activeTabsContext.classList.remove('has-tabs');
    contextTabsContainer.innerHTML = '';
    return;
  }
  
  activeTabsContext.classList.add('has-tabs');
  contextTabsContainer.innerHTML = '';
  
  contextTabs.forEach(tab => {
    const chip = document.createElement('div');
    chip.className = 'context-tab-chip';
    chip.innerHTML = `
      <img class="tab-favicon" src="${tab.favicon || 'data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\"><rect fill=\"%2360a5fa\" width=\"24\" height=\"24\" rx=\"4\"/></svg>'}" alt="">
      <span>${escapeHtml(tab.title.substring(0, 20))}${tab.title.length > 20 ? '...' : ''}</span>
      <button class="remove-tab" data-tab-id="${tab.id}">×</button>
    `;
    
    chip.querySelector('.remove-tab').addEventListener('click', (e) => {
      e.stopPropagation();
      removeTabFromContext(parseInt(e.target.getAttribute('data-tab-id')));
    });
    
    contextTabsContainer.appendChild(chip);
  });
}

// Clear all tabs from context
function clearAllTabsFromContext() {
  contextTabs = [];
  updateContextTabsDisplay();
  updatePageInfo();
  renderTabsList(tabsSearch.value);
}

// Update page info display
function updatePageInfo() {
  if (contextTabs.length > 0) {
    pageTitle.textContent = `Answering questions about ${contextTabs.length} tab(s)`;
    pageInfo.style.display = 'block';
  } else {
    pageInfo.style.display = 'none';
  }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ==================== TABS EVENT LISTENERS ====================

addTabsBtn.addEventListener('click', openTabsPanel);
tabsPanelClose.addEventListener('click', closeTabsPanel);
addSelectedTabsBtn.addEventListener('click', addSelectedTabsToContext);
clearTabsBtn.addEventListener('click', clearAllTabsFromContext);

tabsSearch.addEventListener('input', (e) => {
  renderTabsList(e.target.value);
});

// ==================== MESSAGING ====================

// Update service badge
function updateServiceBadge() {
  const icon = serviceIcons[currentService] || '🤖';
  const name = serviceNames[currentService] || 'AI';
  
  let modelName = '';
  if (settings) {
    switch (currentService) {
      case 'groq':
        modelName = settings.groqModel || 'mixtral-8x7b';
        break;
      case 'gemini':
        modelName = settings.geminiModel || 'gemini-pro';
        break;
      case 'ollama':
        modelName = settings.ollamaModel || 'llama2';
        break;
      case 'lmstudio':
        modelName = settings.lmstudioModel || 'local-model';
        break;
      case 'osaurus':
        modelName = settings.osaurusModel || 'foundation';
        break;
      case 'openrouter':
        modelName = settings.openRouterModel || 'claude-3.5';
        break;
    }
    if (modelName.length > 18) {
      modelName = modelName.substring(0, 18) + '...';
    }
  }
  
  serviceBadge.innerHTML = `<span>${icon}</span><span>${name}</span>${modelName ? `<span style="opacity: 0.8; font-size: 9px;"> • ${modelName}</span>` : ''}`;
}

// Format timestamp
function formatTimestamp(date) {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

// Add message to UI (with save)
function addMessage(role, content, isError = false, sources = null) {
  const timestamp = new Date();
  addMessageWithoutSave(role, content, isError, timestamp, sources);
  saveConversationHistory();
}

// Add message to UI (without saving)
function addMessageWithoutSave(role, content, isError = false, timestamp = new Date(), sources = null) {
  const message = { role, content, timestamp, isError, sources };
  messages.push(message);
  
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${role}`;
  
  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';
  
  const avatar = document.createElement('div');
  avatar.className = `message-avatar ${role}-avatar`;
  avatar.textContent = role === 'user' ? 'You' : '⚡';
  
  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';
  
  const header = document.createElement('div');
  header.className = 'message-header';
  
  const author = document.createElement('span');
  author.className = 'message-author';
  author.textContent = role === 'user' ? 'You' : 'OpenCopilot';
  
  const time = document.createElement('span');
  time.className = 'message-timestamp';
  time.textContent = formatTimestamp(timestamp);
  
  header.appendChild(author);
  header.appendChild(time);
  bubble.appendChild(header);
  
  const text = document.createElement('div');
  text.className = 'message-text';
  
  if (role === 'assistant' && typeof marked !== 'undefined') {
    try {
      if (content.includes('```mermaid') || content.includes('mindmap')) {
        const html = marked.parse(content);
        text.innerHTML = html;
        
        setTimeout(() => {
          const mermaidBlocks = text.querySelectorAll('code.language-mermaid, pre code');
          mermaidBlocks.forEach((block, index) => {
            const code = block.textContent;
            if (code.includes('mindmap') || code.includes('graph') || code.includes('flowchart')) {
              const container = document.createElement('div');
              container.className = 'mermaid-container';
              container.style.background = 'rgba(10, 22, 40, 0.5)';
              container.style.padding = '16px';
              container.style.borderRadius = '8px';
              container.style.margin = '12px 0';
              container.style.border = '1px solid rgba(96, 165, 250, 0.2)';
              
              const mermaidDiv = document.createElement('div');
              mermaidDiv.className = 'mermaid';
              mermaidDiv.textContent = code;
              container.appendChild(mermaidDiv);
              
              block.parentElement.replaceWith(container);
              
              if (typeof mermaid !== 'undefined') {
                mermaid.run({ nodes: [mermaidDiv] });
              }
            }
          });
        }, 100);
      } else {
        text.innerHTML = marked.parse(content);
      }
    } catch (e) {
      text.textContent = content;
    }
  } else {
    text.textContent = content;
  }
  
  bubble.appendChild(text);
  
  // Add source pill for assistant messages with sources
  if (role === 'assistant' && sources && sources.length > 0) {
    const sourcesContainer = document.createElement('div');
    sourcesContainer.className = 'message-sources';
    
    const sourceLabel = document.createElement('span');
    sourceLabel.className = 'source-label';
    sourceLabel.textContent = 'Source';
    sourcesContainer.appendChild(sourceLabel);
    
    sources.forEach(source => {
      const sourcePill = document.createElement('a');
      sourcePill.className = 'source-pill';
      sourcePill.href = source.url;
      sourcePill.target = '_blank';
      sourcePill.title = source.title;
      
      const favicon = document.createElement('img');
      favicon.className = 'source-favicon';
      favicon.src = source.favicon || `https://www.google.com/s2/favicons?domain=${new URL(source.url).hostname}&sz=16`;
      favicon.onerror = () => { favicon.style.display = 'none'; };
      
      const urlText = document.createElement('span');
      urlText.className = 'source-url';
      try {
        const urlObj = new URL(source.url);
        urlText.textContent = urlObj.hostname.replace('www.', '');
      } catch {
        urlText.textContent = source.url;
      }
      
      sourcePill.appendChild(favicon);
      sourcePill.appendChild(urlText);
      sourcesContainer.appendChild(sourcePill);
    });
    
    bubble.appendChild(sourcesContainer);
  }
  
  contentDiv.appendChild(avatar);
  contentDiv.appendChild(bubble);
  messageDiv.appendChild(contentDiv);
  
  messagesList.appendChild(messageDiv);
  
  setTimeout(() => {
    const container = document.getElementById('messagesContainer');
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, 200);
}

// Show typing indicator
function showTypingIndicator() {
  const typingDiv = document.createElement('div');
  typingDiv.className = 'message assistant';
  typingDiv.id = 'typingIndicator';
  
  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';
  
  const avatar = document.createElement('div');
  avatar.className = 'message-avatar assistant-avatar';
  avatar.textContent = '⚡';
  
  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';
  
  const header = document.createElement('div');
  header.className = 'message-header';
  
  const author = document.createElement('span');
  author.className = 'message-author';
  author.textContent = 'OpenCopilot';
  
  const time = document.createElement('span');
  time.className = 'message-timestamp';
  time.textContent = formatTimestamp(new Date());
  
  header.appendChild(author);
  header.appendChild(time);
  bubble.appendChild(header);
  
  const indicatorWrapper = document.createElement('div');
  indicatorWrapper.className = 'message-text';
  indicatorWrapper.style.paddingTop = '4px';
  
  const indicator = document.createElement('div');
  indicator.className = 'typing-indicator';
  indicator.innerHTML = '<span></span><span></span><span></span>';
  
  indicatorWrapper.appendChild(indicator);
  bubble.appendChild(indicatorWrapper);
  contentDiv.appendChild(avatar);
  contentDiv.appendChild(bubble);
  typingDiv.appendChild(contentDiv);
  
  messagesList.appendChild(typingDiv);
  messagesList.scrollTop = messagesList.scrollHeight;
}

// Remove typing indicator
function hideTypingIndicator() {
  const typing = document.getElementById('typingIndicator');
  if (typing) {
    typing.remove();
  }
}

// Show error
function showError(message) {
  errorMessage.textContent = message;
  errorBanner.style.display = 'flex';
}

// Hide error
function hideError() {
  errorBanner.style.display = 'none';
}

// Send message
async function sendMessage(messageText = null) {
  const text = messageText || messageInput.value.trim();
  
  if (!text || isLoading) return;
  
  // Check for commands first
  const command = parseCommand(text);
  if (command) {
    messageInput.value = '';
    document.getElementById('commandHint').style.display = 'none';
    
    // Special handling for /search which shows its own messages
    if (command.command === '/search') {
      await command.handler(command.args);
      return;
    }
    
    // For other commands, show user message and handle
    if (command.command !== '/clear') {
      addMessage('user', text);
    }
    await command.handler(command.args);
    return;
  }
  
  const localServices = ['ollama', 'lmstudio', 'osaurus'];
  const requiresApiKey = !localServices.includes(settings?.service);
  
  if (!settings || (requiresApiKey && !settings.groqApiKey && !settings.geminiApiKey && !settings.openRouterApiKey)) {
    showError('Please configure your API keys in settings first.');
    return;
  }
  
  hideError();
  messageInput.value = '';
  document.getElementById('commandHint').style.display = 'none';
  
  addMessage('user', text);
  trackQuestionAsked();
  
  isLoading = true;
  sendBtn.disabled = true;
  messageInput.disabled = true;
  
  showTypingIndicator();
  
  try {
    let systemPrompt;
    let relevantTabs = [];
    let usedSources = [];
    
    // Always use context (active tab or auto-search based on toggle)
      // Search bookmarks and history for relevant links
      updateTypingStatus('Searching memory, bookmarks & history...');
      let additionalContext = '';
      
      try {
        const searchResults = await memoryManager.searchAll(text);
        
        if (searchResults.bookmarks.length > 0) {
          additionalContext += '\n--- RELEVANT BOOKMARKS ---\n';
          searchResults.bookmarks.slice(0, 3).forEach(b => {
            additionalContext += `• ${b.title}: ${b.url}\n`;
          });
        }
        
        if (searchResults.history.length > 0) {
          additionalContext += '\n--- RECENTLY VISITED (relevant) ---\n';
          searchResults.history.slice(0, 3).forEach(h => {
            additionalContext += `• ${h.title}: ${h.url}\n`;
          });
        }
      } catch (e) {
        console.log('Could not search bookmarks/history:', e);
      }
      
      // Get memory context (todos, notes, memories)
      const memoryContext = memoryManager.getContextForAI(text);
      
      // Determine which tabs to use for context
      if (contextTabs.length > 0) {
        // Use manually selected tabs
        relevantTabs = contextTabs;
      } else if (autoContextMode) {
        // Auto-search mode: Find relevant tabs based on the query
        updateTypingStatus('Searching open tabs...');
        relevantTabs = await findRelevantTabs(text);
        
        if (relevantTabs.length > 0) {
          updateTypingStatus(`Found ${relevantTabs.length} relevant tab(s), extracting content...`);
          // Extract content from relevant tabs
          for (const tab of relevantTabs) {
            if (!cachedTabContents.has(tab.id)) {
              try {
                const content = await chrome.runtime.sendMessage({
                  action: 'extractTabContent',
                  tabId: tab.id
                });
                if (content) {
                  cachedTabContents.set(tab.id, {
                    ...tab,
                    content: content.textContent,
                    markdown: content.markdown || content.textContent
                  });
                }
              } catch (error) {
                console.error('Error extracting tab:', tab.id, error);
              }
            }
          }
          updateTypingStatus('Analyzing content...');
        }
      } else {
        // Default mode: Use only the active tab
        updateTypingStatus('Getting current tab...');
        try {
          const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (activeTab && !activeTab.url.startsWith('chrome://') && !activeTab.url.startsWith('chrome-extension://')) {
            const content = await chrome.runtime.sendMessage({
              action: 'extractTabContent',
              tabId: activeTab.id
            });
            if (content) {
              const tabData = {
                id: activeTab.id,
                title: activeTab.title,
                url: activeTab.url,
                favicon: activeTab.favIconUrl,
                content: content.textContent,
                markdown: content.markdown || content.textContent
              };
              cachedTabContents.set(activeTab.id, tabData);
              relevantTabs = [tabData];
            }
          }
        } catch (error) {
          console.error('Error getting active tab:', error);
        }
        updateTypingStatus('Analyzing content...');
      }
      
      // Build context from relevant tabs
      let tabsToUse = contextTabs.length > 0 ? contextTabs : 
        relevantTabs.filter(t => t.content || t.markdown); // Already have content
      
      // If relevantTabs don't have content, get from cache
      if (tabsToUse.length === 0 && relevantTabs.length > 0) {
        tabsToUse = relevantTabs.map(t => cachedTabContents.get(t.id)).filter(Boolean);
      }
      
      // Track sources for display
      usedSources = tabsToUse.map(tab => ({
        title: tab.title,
        url: tab.url,
        favicon: tab.favicon || tab.favIconUrl
      }));
      
      if (tabsToUse.length > 0) {
        let tabsContext = tabsToUse.map((tab, index) => {
          return `--- TAB ${index + 1}: ${tab.title} ---
URL: ${tab.url}

${tab.markdown || tab.content}
`;
        }).join('\n\n');
        
        // Show which tabs are being used
        if (contextTabs.length === 0 && relevantTabs.length > 0) {
          const tabNames = tabsToUse.map(t => t.title).slice(0, 3);
          const moreCount = tabsToUse.length - 3;
          const tabsUsedText = tabNames.join(', ') + (moreCount > 0 ? ` +${moreCount} more` : '');
          updateAutoContextIndicator(tabsToUse.length, tabsUsedText);
        }
        
        systemPrompt = `You are a helpful AI assistant with access to browser tabs, bookmarks, history, and the user's personal memory (todos, notes, saved memories).

${memoryContext ? '--- USER MEMORY ---\n' + memoryContext : ''}
${additionalContext ? additionalContext : ''}

--- WEB PAGES IN CONTEXT ---
${tabsContext}

IMPORTANT INSTRUCTIONS:
1. Answer based on the content from these tabs when relevant
2. If the question is about a specific topic, focus on the most relevant tab(s)
3. Mention which tab(s) or sources your answer comes from when applicable
4. If you found relevant info from bookmarks, history, or memory, mention it
5. When creating tables, limit them to a maximum of 2 columns
6. Be concise and helpful

Please answer the user's question.`;
      } else {
        // No relevant tabs found, use memory and general mode
        systemPrompt = `You are a helpful AI assistant with access to the user's personal memory (todos, notes, saved memories), bookmarks, and browsing history.

${memoryContext ? '--- USER MEMORY ---\n' + memoryContext : ''}
${additionalContext ? additionalContext : ''}

If the user asks about their todos, notes, or things they've remembered, refer to the memory above.
If they ask about URLs, links, or websites they've visited, check the bookmarks and history.

Please answer the user's questions directly and concisely. Do not hallucinate or make up information.
Seek clarification if needed. When creating tables, limit them to a maximum of 2 columns.`;
      }
    
    const conversationMessages = messages
      .filter(m => m.role !== 'system' && !m.isError)
      .map(m => ({ role: m.role, content: m.content }));
    
    const aiService = new AIService(settings);
    const response = await aiService.sendMessage(conversationMessages, systemPrompt);
    
    hideTypingIndicator();
    addMessage('assistant', response, false, usedSources);
    
  } catch (error) {
    hideTypingIndicator();
    showError(error.message);
    addMessage('assistant', `Sorry, I encountered an error: ${error.message}`, true, null);
  } finally {
    isLoading = false;
    sendBtn.disabled = false;
    messageInput.disabled = false;
    messageInput.focus();
    clearAutoContextIndicator();
  }
}

// Find relevant tabs based on query
async function findRelevantTabs(query, maxTabs = 5) {
  try {
    // Get all open tabs
    const tabs = await chrome.tabs.query({});
    const accessibleTabs = tabs.filter(tab => 
      !tab.url.startsWith('chrome://') && 
      !tab.url.startsWith('chrome-extension://') &&
      !tab.url.startsWith('edge://') &&
      !tab.url.startsWith('about:') &&
      !tab.url.startsWith('data:')
    );
    
    if (accessibleTabs.length === 0) return [];
    
    // Extract keywords from query
    const queryWords = query.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2)
      .filter(word => !STOP_WORDS.has(word));
    
    // Also extract potential phrases (2-3 word combinations)
    const queryPhrases = [];
    const words = query.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter(w => w.length > 1);
    for (let i = 0; i < words.length - 1; i++) {
      queryPhrases.push(words.slice(i, i + 2).join(' '));
      if (i < words.length - 2) {
        queryPhrases.push(words.slice(i, i + 3).join(' '));
      }
    }
    
    // Score each tab based on relevance
    const scoredTabs = accessibleTabs.map(tab => {
      const titleLower = tab.title.toLowerCase();
      const urlLower = tab.url.toLowerCase();
      
      // Get cached content if available
      const cached = cachedTabContents.get(tab.id);
      const contentLower = cached ? (cached.content || '').toLowerCase().substring(0, 5000) : '';
      
      let score = 0;
      
      // Check phrase matches first (higher weight)
      for (const phrase of queryPhrases) {
        if (titleLower.includes(phrase)) {
          score += 5;
        }
        if (contentLower.includes(phrase)) {
          score += 3;
        }
      }
      
      // Check each query word against title, URL, and content
      for (const word of queryWords) {
        if (titleLower.includes(word)) {
          score += 3; // Title match is weighted higher
        }
        if (urlLower.includes(word)) {
          score += 1;
        }
        if (contentLower.includes(word)) {
          score += 2; // Content match
        }
      }
      
      // Bonus for active tab
      if (tab.active) {
        score += 2;
      }
      
      // Bonus for having cached content (already visited)
      if (cached) {
        score += 1;
      }
      
      return { ...tab, score, hasCachedContent: !!cached };
    });
    
    // Sort by score and return top N
    const relevantTabs = scoredTabs
      .filter(tab => tab.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxTabs);
    
    // If no keyword matches found, include the active tab at minimum
    if (relevantTabs.length === 0) {
      const activeTab = accessibleTabs.find(t => t.active);
      if (activeTab) {
        return [activeTab];
      }
      // Or return tabs with cached content, or a few most recent
      const cachedTabs = accessibleTabs.filter(t => cachedTabContents.has(t.id));
      if (cachedTabs.length > 0) {
        return cachedTabs.slice(0, Math.min(3, cachedTabs.length));
      }
      return accessibleTabs.slice(0, Math.min(3, accessibleTabs.length));
    }
    
    return relevantTabs;
  } catch (error) {
    console.error('Error finding relevant tabs:', error);
    return [];
  }
}

// Common stop words to ignore in search
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
  'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those',
  'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what', 'which', 'who',
  'when', 'where', 'why', 'how', 'all', 'each', 'every', 'both', 'few',
  'more', 'most', 'other', 'some', 'such', 'no', 'not', 'only', 'own',
  'same', 'so', 'than', 'too', 'very', 'just', 'about', 'into', 'through',
  'me', 'my', 'your', 'his', 'her', 'its', 'our', 'their', 'tell', 'give',
  'please', 'help', 'want', 'need', 'know', 'think', 'make', 'get', 'find'
]);

// Update typing indicator with status
function updateTypingStatus(status) {
  const typingIndicator = document.getElementById('typingIndicator');
  if (typingIndicator) {
    const statusEl = typingIndicator.querySelector('.typing-status');
    if (statusEl) {
      statusEl.textContent = status;
    } else {
      const bubble = typingIndicator.querySelector('.message-bubble');
      if (bubble) {
        const statusDiv = document.createElement('div');
        statusDiv.className = 'typing-status';
        statusDiv.style.cssText = 'font-size: 10px; color: #94a3b8; margin-top: 4px;';
        statusDiv.textContent = status;
        bubble.appendChild(statusDiv);
      }
    }
  }
}

// Show auto-context indicator
function updateAutoContextIndicator(count, tabsText) {
  let indicator = document.getElementById('autoContextIndicator');
  if (!indicator) {
    indicator = document.createElement('div');
    indicator.id = 'autoContextIndicator';
    indicator.className = 'auto-context-indicator';
    const inputContainer = document.querySelector('.input-container');
    if (inputContainer) {
      inputContainer.insertBefore(indicator, inputContainer.firstChild);
    }
  }
  indicator.innerHTML = `<span class="auto-context-icon">🔍</span> Using ${count} tab(s): <span class="auto-context-tabs">${escapeHtml(tabsText)}</span>`;
  indicator.style.display = 'flex';
}

// Clear auto-context indicator
function clearAutoContextIndicator() {
  const indicator = document.getElementById('autoContextIndicator');
  if (indicator) {
    indicator.style.display = 'none';
  }
}

// ==================== SETTINGS ====================

// Populate settings panel with current settings
function populateSettingsPanel() {
  if (!settings) return;
  
  serviceSelect.value = settings.service || 'groq';
  document.getElementById('groqApiKeyInput').value = settings.groqApiKey || '';
  document.getElementById('groqModelInput').value = settings.groqModel || 'mixtral-8x7b-32768';
  document.getElementById('geminiApiKeyInput').value = settings.geminiApiKey || '';
  document.getElementById('geminiModelInput').value = settings.geminiModel || 'gemini-pro';
  document.getElementById('ollamaUrlInput').value = settings.ollamaUrl || 'http://localhost:11434';
  document.getElementById('ollamaModelInput').value = settings.ollamaModel || 'llama2';
  document.getElementById('lmstudioUrlInput').value = settings.lmstudioUrl || 'http://localhost:1234';
  document.getElementById('lmstudioModelInput').value = settings.lmstudioModel || 'local-model';
  document.getElementById('osaurusUrlInput').value = settings.osaurusUrl || 'http://127.0.0.1:1337';
  document.getElementById('osaurusModelInput').value = settings.osaurusModel || 'foundation';
  document.getElementById('openRouterApiKeyInput').value = settings.openRouterApiKey || '';
  document.getElementById('openRouterModelInput').value = settings.openRouterModel || 'anthropic/claude-3.5-sonnet';
  
  updateServiceSettingsVisibility();
}

// Update which service settings are visible
function updateServiceSettingsVisibility() {
  const selected = serviceSelect.value;
  document.getElementById('groqSettings').style.display = selected === 'groq' ? 'block' : 'none';
  document.getElementById('geminiSettings').style.display = selected === 'gemini' ? 'block' : 'none';
  document.getElementById('ollamaSettings').style.display = selected === 'ollama' ? 'block' : 'none';
  document.getElementById('lmstudioSettings').style.display = selected === 'lmstudio' ? 'block' : 'none';
  document.getElementById('osaurusSettings').style.display = selected === 'osaurus' ? 'block' : 'none';
  document.getElementById('openrouterSettings').style.display = selected === 'openrouter' ? 'block' : 'none';
  
  if (selected === 'ollama') {
    fetchOllamaModels();
  }
  if (selected === 'lmstudio') {
    fetchLMStudioModels();
  }
  if (selected === 'osaurus') {
    fetchOsaurusModels();
  }
}

// Fetch models functions
async function fetchOllamaModels() {
  const ollamaUrl = document.getElementById('ollamaUrlInput').value || 'http://localhost:11434';
  const ollamaModelSelect = document.getElementById('ollamaModelInput');
  const helpText = document.getElementById('ollamaModelHelp');
  
  const currentValue = ollamaModelSelect.value;
  
  ollamaModelSelect.innerHTML = '<option value="">Loading models...</option>';
  ollamaModelSelect.disabled = true;
  
  try {
    const response = await fetch(`${ollamaUrl}/api/tags`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const data = await response.json();
    
    if (data.models && data.models.length > 0) {
      ollamaModelSelect.innerHTML = '';
      data.models.forEach(model => {
        const option = document.createElement('option');
        option.value = model.name;
        option.textContent = model.name;
        ollamaModelSelect.appendChild(option);
      });
      
      if (currentValue && data.models.some(m => m.name === currentValue)) {
        ollamaModelSelect.value = currentValue;
      }
      
      if (helpText) {
        helpText.textContent = `Found ${data.models.length} model(s)`;
        helpText.style.color = '#10b981';
      }
    } else {
      ollamaModelSelect.innerHTML = '<option value="">No models found</option>';
    }
  } catch (error) {
    ollamaModelSelect.innerHTML = '<option value="">Error loading</option>';
    if (helpText) {
      helpText.textContent = `Error: ${error.message}`;
      helpText.style.color = '#ef4444';
    }
  } finally {
    ollamaModelSelect.disabled = false;
  }
}

async function fetchLMStudioModels() {
  const lmstudioUrl = document.getElementById('lmstudioUrlInput').value || 'http://localhost:1234';
  const lmstudioModelSelect = document.getElementById('lmstudioModelInput');
  const helpText = document.getElementById('lmstudioModelHelp');
  
  const currentValue = lmstudioModelSelect.value;
  
  lmstudioModelSelect.innerHTML = '<option value="">Loading models...</option>';
  lmstudioModelSelect.disabled = true;
  
  try {
    const response = await fetch(`${lmstudioUrl}/v1/models`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const data = await response.json();
    
    if (data.data && data.data.length > 0) {
      lmstudioModelSelect.innerHTML = '';
      data.data.forEach(model => {
        const option = document.createElement('option');
        option.value = model.id;
        option.textContent = model.id;
        lmstudioModelSelect.appendChild(option);
      });
      
      if (currentValue && data.data.some(m => m.id === currentValue)) {
        lmstudioModelSelect.value = currentValue;
      }
      
      if (helpText) {
        helpText.textContent = `Found ${data.data.length} model(s)`;
        helpText.style.color = '#10b981';
      }
    } else {
      lmstudioModelSelect.innerHTML = '<option value="local-model">local-model (default)</option>';
    }
  } catch (error) {
    lmstudioModelSelect.innerHTML = '<option value="local-model">local-model (default)</option>';
    if (helpText) {
      helpText.textContent = `Error: ${error.message}`;
      helpText.style.color = '#ef4444';
    }
  } finally {
    lmstudioModelSelect.disabled = false;
  }
}

async function fetchOsaurusModels() {
  const osaurusUrl = document.getElementById('osaurusUrlInput').value || 'http://127.0.0.1:1337';
  const osaurusModelSelect = document.getElementById('osaurusModelInput');
  const helpText = document.getElementById('osaurusModelHelp');
  
  const currentValue = osaurusModelSelect.value;
  
  osaurusModelSelect.innerHTML = '<option value="">Loading models...</option>';
  osaurusModelSelect.disabled = true;
  
  try {
    const response = await fetch(`${osaurusUrl}/v1/models`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const data = await response.json();
    
    if (data.data && data.data.length > 0) {
      osaurusModelSelect.innerHTML = '';
      data.data.forEach(model => {
        const option = document.createElement('option');
        option.value = model.id;
        option.textContent = model.id + (model.id === 'foundation' ? ' (Apple System Model)' : '');
        osaurusModelSelect.appendChild(option);
      });
      
      if (currentValue && data.data.some(m => m.id === currentValue)) {
        osaurusModelSelect.value = currentValue;
      }
      
      if (helpText) {
        helpText.textContent = `Found ${data.data.length} model(s)`;
        helpText.style.color = '#10b981';
      }
    } else {
      osaurusModelSelect.innerHTML = '<option value="foundation">foundation (Apple System Model)</option>';
    }
  } catch (error) {
    osaurusModelSelect.innerHTML = '<option value="foundation">foundation (Apple System Model)</option>';
    if (helpText) {
      helpText.textContent = `Error: ${error.message}`;
      helpText.style.color = '#ef4444';
    }
  } finally {
    osaurusModelSelect.disabled = false;
  }
}

// ==================== EVENT LISTENERS ====================

sendBtn.addEventListener('click', () => sendMessage());

messageInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

if (clearPageBtn) {
  clearPageBtn.addEventListener('click', clearCurrentChat);
}

if (clearAllBtn) {
  clearAllBtn.addEventListener('click', clearAllData);
}

settingsBtn.addEventListener('click', () => {
  settingsPanel.classList.toggle('show');
});

settingsPanelClose.addEventListener('click', () => {
  settingsPanel.classList.remove('show');
});

serviceSelect.addEventListener('change', updateServiceSettingsVisibility);

// Refresh buttons
const refreshOllamaBtn = document.getElementById('refreshOllamaModels');
const refreshLMStudioBtn = document.getElementById('refreshLMStudioModels');
const refreshOsaurusBtn = document.getElementById('refreshOsaurusModels');

if (refreshOllamaBtn) refreshOllamaBtn.addEventListener('click', fetchOllamaModels);
if (refreshLMStudioBtn) refreshLMStudioBtn.addEventListener('click', fetchLMStudioModels);
if (refreshOsaurusBtn) refreshOsaurusBtn.addEventListener('click', fetchOsaurusModels);

// URL change listeners
document.getElementById('ollamaUrlInput')?.addEventListener('blur', () => {
  if (serviceSelect.value === 'ollama') fetchOllamaModels();
});
document.getElementById('lmstudioUrlInput')?.addEventListener('blur', () => {
  if (serviceSelect.value === 'lmstudio') fetchLMStudioModels();
});
document.getElementById('osaurusUrlInput')?.addEventListener('blur', () => {
  if (serviceSelect.value === 'osaurus') fetchOsaurusModels();
});

// Save settings
saveSettingsBtn.addEventListener('click', () => {
  const newSettings = {
    service: serviceSelect.value,
    groqApiKey: document.getElementById('groqApiKeyInput').value,
    groqModel: document.getElementById('groqModelInput').value || 'mixtral-8x7b-32768',
    geminiApiKey: document.getElementById('geminiApiKeyInput').value,
    geminiModel: document.getElementById('geminiModelInput').value || 'gemini-pro',
    ollamaUrl: document.getElementById('ollamaUrlInput').value || 'http://localhost:11434',
    ollamaModel: document.getElementById('ollamaModelInput').value || 'llama2',
    lmstudioUrl: document.getElementById('lmstudioUrlInput').value || 'http://localhost:1234',
    lmstudioModel: document.getElementById('lmstudioModelInput').value || 'local-model',
    osaurusUrl: document.getElementById('osaurusUrlInput').value || 'http://127.0.0.1:1337',
    osaurusModel: document.getElementById('osaurusModelInput').value || 'foundation',
    openRouterApiKey: document.getElementById('openRouterApiKeyInput').value,
    openRouterModel: document.getElementById('openRouterModelInput').value || 'anthropic/claude-3.5-sonnet'
  };
  
  chrome.runtime.sendMessage({ action: 'saveSettings', settings: newSettings }, (response) => {
    if (response.success) {
      settings = newSettings;
      currentService = newSettings.service;
      updateServiceBadge();
      settingsPanel.classList.remove('show');
      
      const serviceName = serviceNames[newSettings.service] || 'AI';
      let modelName = '';
      switch (newSettings.service) {
        case 'groq': modelName = newSettings.groqModel; break;
        case 'gemini': modelName = newSettings.geminiModel; break;
        case 'ollama': modelName = newSettings.ollamaModel; break;
        case 'lmstudio': modelName = newSettings.lmstudioModel; break;
        case 'osaurus': modelName = newSettings.osaurusModel; break;
        case 'openrouter': modelName = newSettings.openRouterModel; break;
      }
      
      showSettingsConfirmation(`✓ Now using <strong>${serviceName}</strong> with <strong>${modelName}</strong>`);
    }
  });
});

closeError.addEventListener('click', hideError);

// Auto-focus input
messageInput.focus();

// Initialize
initIcons();
loadConversationHistory();
initMemoryManager();
initViewTabs();
initThemeToggle();
initCommandHints();
initQuickAddButtons();

// Pre-cache tab contents on load for faster search
preCacheTabContents();

// Pre-cache contents from all open tabs
async function preCacheTabContents() {
  try {
    const tabs = await chrome.tabs.query({});
    const accessibleTabs = tabs.filter(tab => 
      !tab.url.startsWith('chrome://') && 
      !tab.url.startsWith('chrome-extension://') &&
      !tab.url.startsWith('edge://') &&
      !tab.url.startsWith('about:') &&
      !tab.url.startsWith('data:')
    );
    
    console.log(`Pre-caching ${accessibleTabs.length} tabs...`);
    
    // Cache in background, limit to first 10 for performance
    const tabsToCache = accessibleTabs.slice(0, 10);
    
    for (const tab of tabsToCache) {
      if (!cachedTabContents.has(tab.id)) {
        try {
          const content = await chrome.runtime.sendMessage({
            action: 'extractTabContent',
            tabId: tab.id
          });
          if (content) {
            cachedTabContents.set(tab.id, {
              id: tab.id,
              title: content.title || tab.title,
              url: content.url || tab.url,
              favicon: tab.favIconUrl,
              content: content.textContent,
              markdown: content.markdown || content.textContent
            });
            trackSiteVisit(tab.url);
          }
        } catch (error) {
          // Silently skip tabs that can't be accessed
        }
      }
    }
    
    console.log(`Cached ${cachedTabContents.size} tabs`);
  } catch (error) {
    console.error('Error pre-caching tabs:', error);
  }
}

// Listen for tab updates to refresh cache
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && cachedTabContents.has(tabId)) {
    // Invalidate cache for updated tab
    cachedTabContents.delete(tabId);
  }
});

// Listen for tab removal to clean cache
chrome.tabs.onRemoved.addListener((tabId) => {
  cachedTabContents.delete(tabId);
});

// ==================== MEMORY MANAGER INTEGRATION ====================

async function initMemoryManager() {
  await memoryManager.init();
  updateMemoryBadges();
}

function updateMemoryBadges() {
  const stats = memoryManager.getStats();
  
  const todosBadge = document.getElementById('todosBadge');
  const notesBadge = document.getElementById('notesBadge');
  
  if (todosBadge) {
    if (stats.pendingTodos > 0) {
      todosBadge.textContent = stats.pendingTodos;
      todosBadge.style.display = 'block';
    } else {
      todosBadge.style.display = 'none';
    }
  }
  
  if (notesBadge) {
    if (stats.totalNotes > 0) {
      notesBadge.textContent = stats.totalNotes;
      notesBadge.style.display = 'block';
    } else {
      notesBadge.style.display = 'none';
    }
  }
  
  // Update memory stats
  const statTodos = document.getElementById('statTodos');
  const statNotes = document.getElementById('statNotes');
  const statMemories = document.getElementById('statMemories');
  
  if (statTodos) statTodos.textContent = stats.totalTodos;
  if (statNotes) statNotes.textContent = stats.totalNotes;
  if (statMemories) statMemories.textContent = stats.totalMemories;
}

// ==================== COMMAND HANDLERS ====================

async function handleTodoCommand(text) {
  if (!text.trim()) {
    addMessage('assistant', 'Please provide a todo text. Example: `/todo Review the PR`');
    return;
  }
  
  // Get current active tab URL
  let currentUrl = null;
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]) {
      currentUrl = tabs[0].url;
    }
  } catch (e) {}
  
  const todo = await memoryManager.addTodo(text, currentUrl);
  updateMemoryBadges();
  
  addMessage('assistant', `**Todo added:** "${text}"${currentUrl ? `\n\nLinked to current page` : ''}`);
}

async function handleNoteCommand(text) {
  if (!text.trim()) {
    addMessage('assistant', 'Please provide note text. Example: `/note This is important`');
    return;
  }
  
  let currentUrl = null;
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]) {
      currentUrl = tabs[0].url;
    }
  } catch (e) {}
  
  const note = await memoryManager.addNote(text, currentUrl);
  updateMemoryBadges();
  
  addMessage('assistant', `**Note saved:** "${text}"`);
}

async function handleRememberCommand(text) {
  if (!text.trim()) {
    addMessage('assistant', 'Please provide something to remember. Example: `/remember The API key is in the .env file`');
    return;
  }
  
  await memoryManager.addMemory(text);
  updateMemoryBadges();
  
  addMessage('assistant', `**Remembered:** "${text}"\n\nI'll use this information to help answer your future questions.`);
}

async function handleSearchCommand(query) {
  if (!query.trim()) {
    addMessage('assistant', 'Please provide a search query. Example: `/search React documentation`');
    return;
  }
  
  addMessage('user', `/search ${query}`);
  showTypingIndicator();
  
  try {
    const results = await memoryManager.searchAll(query);
    hideTypingIndicator();
    
    let response = `**Search results for "${query}":**\n\n`;
    
    if (results.bookmarks.length > 0) {
      response += `**Bookmarks (${results.bookmarks.length}):**\n`;
      results.bookmarks.slice(0, 5).forEach(b => {
        response += `• [${b.title}](${b.url})\n`;
      });
      response += '\n';
    }
    
    if (results.history.length > 0) {
      response += `**History (${results.history.length}):**\n`;
      results.history.slice(0, 5).forEach(h => {
        response += `• [${h.title}](${h.url})\n`;
      });
      response += '\n';
    }
    
    if (results.notes.length > 0) {
      response += `**Notes (${results.notes.length}):**\n`;
      results.notes.slice(0, 3).forEach(n => {
        response += `• ${n.text}\n`;
      });
      response += '\n';
    }
    
    if (results.todos.length > 0) {
      response += `**Todos (${results.todos.length}):**\n`;
      results.todos.slice(0, 3).forEach(t => {
        response += `• ${t.completed ? '[x]' : '[ ]'} ${t.text}\n`;
      });
    }
    
    if (!results.hasResults) {
      response = `No results found for "${query}". Try different keywords.`;
    }
    
    addMessage('assistant', response);
  } catch (error) {
    hideTypingIndicator();
    addMessage('assistant', `Error searching: ${error.message}`);
  }
  
  return true; // Prevent normal message sending
}

function handleClearCommand() {
  clearCurrentChat();
  return true;
}

// Parse and handle commands
function parseCommand(text) {
  const trimmed = text.trim();
  
  for (const [cmd, config] of Object.entries(COMMANDS)) {
    if (trimmed.toLowerCase().startsWith(cmd)) {
      const args = trimmed.substring(cmd.length).trim();
      return { command: cmd, args, handler: config.handler };
    }
  }
  
  return null;
}

// ==================== VIEW SWITCHING ====================

function initViewTabs() {
  const viewTabs = document.querySelectorAll('.view-tab');
  
  viewTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const view = tab.getAttribute('data-view');
      switchView(view);
    });
  });
}

function switchView(view) {
  currentView = view;
  
  // Update tab states
  document.querySelectorAll('.view-tab').forEach(tab => {
    tab.classList.toggle('active', tab.getAttribute('data-view') === view);
  });
  
  // Update container class for CSS-based visibility
  const container = document.querySelector('.sidebar-container');
  container.classList.remove('view-todos', 'view-notes', 'view-memory');
  if (view !== 'chat') {
    container.classList.add(`view-${view}`);
  }
  
  // Render content for the active view
  if (view !== 'chat') {
    
    // Render view content
    if (view === 'todos') renderTodosList();
    if (view === 'notes') renderNotesList();
    if (view === 'memory') renderMemoryView();
  }
}

// ==================== TODOS VIEW ====================

function renderTodosList() {
  const container = document.getElementById('todosList');
  const todos = memoryManager.getTodos();
  
  if (todos.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">${Icons.checkCircle}</div>
        <div class="empty-text">No todos yet</div>
        <div class="empty-hint">Use <code>/todo your task</code> in chat to add one</div>
      </div>
    `;
    return;
  }
  
  container.innerHTML = todos.map(todo => `
    <div class="todo-item ${todo.completed ? 'completed' : ''}" data-id="${todo.id}">
      <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''}>
      <div class="todo-content">
        <div class="todo-text">${escapeHtml(todo.text)}</div>
        <div class="todo-meta">
          ${todo.url ? `<a href="${todo.url}" target="_blank" class="todo-url"><span class="meta-icon">${Icons.link}</span>${new URL(todo.url).hostname}</a>` : ''}
          <span><span class="meta-icon">${Icons.clock}</span>${formatDate(todo.createdAt)}</span>
        </div>
      </div>
      <button class="item-delete" title="Delete">${Icons.close}</button>
    </div>
  `).join('');
  
  // Add event listeners
  container.querySelectorAll('.todo-checkbox').forEach(cb => {
    cb.addEventListener('change', async (e) => {
      const id = e.target.closest('.todo-item').dataset.id;
      await memoryManager.toggleTodo(id);
      renderTodosList();
      updateMemoryBadges();
    });
  });
  
  container.querySelectorAll('.item-delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.closest('.todo-item').dataset.id;
      await memoryManager.deleteTodo(id);
      renderTodosList();
      updateMemoryBadges();
    });
  });
}

// ==================== NOTES VIEW ====================

function renderNotesList() {
  const container = document.getElementById('notesList');
  const notes = memoryManager.getNotes();
  
  if (notes.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">${Icons.note}</div>
        <div class="empty-text">No notes yet</div>
        <div class="empty-hint">Use <code>/note your note</code> in chat to add one</div>
      </div>
    `;
    return;
  }
  
  container.innerHTML = notes.map(note => `
    <div class="note-item" data-id="${note.id}">
      <div class="note-content">
        <div class="note-text">${escapeHtml(note.text)}</div>
        <div class="note-meta">
          ${note.url ? `<a href="${note.url}" target="_blank" class="note-url"><span class="meta-icon">${Icons.link}</span>${new URL(note.url).hostname}</a>` : ''}
          <span><span class="meta-icon">${Icons.clock}</span>${formatDate(note.createdAt)}</span>
          ${note.tags.length > 0 ? note.tags.map(t => `<span class="tag"><span class="meta-icon">${Icons.tag}</span>${t}</span>`).join('') : ''}
        </div>
      </div>
      <button class="item-delete" title="Delete">${Icons.close}</button>
    </div>
  `).join('');
  
  container.querySelectorAll('.item-delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.closest('.note-item').dataset.id;
      await memoryManager.deleteNote(id);
      renderNotesList();
      updateMemoryBadges();
    });
  });
}

// ==================== MEMORY VIEW ====================

function renderMemoryView() {
  const container = document.getElementById('memoriesList');
  const memories = memoryManager.getMemories();
  
  updateMemoryBadges();
  
  if (memories.length === 0) {
    container.innerHTML = `
      <div class="empty-state small">
        <div class="empty-text">No memories saved</div>
        <div class="empty-hint">Use <code>/remember something important</code></div>
      </div>
    `;
    return;
  }
  
  container.innerHTML = memories.map(memory => `
    <div class="memory-item" data-id="${memory.id}">
      <div class="memory-content">
        <div class="memory-text">${escapeHtml(memory.text)}</div>
        <div class="memory-meta">
          <span><span class="meta-icon">${Icons.clock}</span>${formatDate(memory.createdAt)}</span>
        </div>
      </div>
      <button class="item-delete" title="Delete">${Icons.close}</button>
    </div>
  `).join('');
  
  container.querySelectorAll('.item-delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.closest('.memory-item').dataset.id;
      await memoryManager.deleteMemory(id);
      renderMemoryView();
      updateMemoryBadges();
    });
  });
}

// ==================== THEME TOGGLE ====================

function initThemeToggle() {
  const themeToggle = document.getElementById('themeToggle');
  
  // Load saved theme
  chrome.storage.local.get(['theme'], (result) => {
    const theme = result.theme || 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    updateThemeIcon(theme);
  });
  
  themeToggle?.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    chrome.storage.local.set({ theme: newTheme });
    updateThemeIcon(newTheme);
  });
}

// ==================== COMMAND HINTS ====================

function initCommandHints() {
  const input = document.getElementById('messageInput');
  const hint = document.getElementById('commandHint');
  
  input?.addEventListener('input', () => {
    const text = input.value.trim();
    
    if (text.startsWith('/')) {
      const matchingCmd = Object.entries(COMMANDS).find(([cmd]) => 
        cmd.startsWith(text.toLowerCase()) || text.toLowerCase().startsWith(cmd)
      );
      
      if (matchingCmd) {
        const [cmd, config] = matchingCmd;
        hint.querySelector('.command-type').textContent = cmd;
        hint.querySelector('.command-desc').textContent = config.description;
        hint.style.display = 'flex';
      } else {
        hint.style.display = 'none';
      }
    } else {
      hint.style.display = 'none';
    }
  });
}

// ==================== QUICK ADD BUTTONS ====================

function initQuickAddButtons() {
  // Todo quick add
  const quickAddTodoBtn = document.getElementById('quickAddTodoBtn');
  const quickAddTodoInput = document.getElementById('quickAddTodo');
  
  quickAddTodoBtn?.addEventListener('click', async () => {
    const text = quickAddTodoInput.value.trim();
    if (text) {
      await memoryManager.addTodo(text);
      quickAddTodoInput.value = '';
      renderTodosList();
      updateMemoryBadges();
    }
  });
  
  quickAddTodoInput?.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
      quickAddTodoBtn.click();
    }
  });
  
  // Note quick add
  const quickAddNoteBtn = document.getElementById('quickAddNoteBtn');
  const quickAddNoteInput = document.getElementById('quickAddNote');
  
  quickAddNoteBtn?.addEventListener('click', async () => {
    const text = quickAddNoteInput.value.trim();
    if (text) {
      await memoryManager.addNote(text);
      quickAddNoteInput.value = '';
      renderNotesList();
      updateMemoryBadges();
    }
  });
  
  quickAddNoteInput?.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
      quickAddNoteBtn.click();
    }
  });
  
  // Memory quick add
  const quickAddMemoryBtn = document.getElementById('quickAddMemoryBtn');
  const quickAddMemoryInput = document.getElementById('quickAddMemory');
  
  quickAddMemoryBtn?.addEventListener('click', async () => {
    const text = quickAddMemoryInput.value.trim();
    if (text) {
      await memoryManager.addMemory(text);
      quickAddMemoryInput.value = '';
      renderMemoryView();
      updateMemoryBadges();
    }
  });
  
  quickAddMemoryInput?.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
      quickAddMemoryBtn.click();
    }
  });
  
  // Clear completed todos
  document.getElementById('clearCompletedTodos')?.addEventListener('click', async () => {
    const todos = memoryManager.getTodos();
    for (const todo of todos.filter(t => t.completed)) {
      await memoryManager.deleteTodo(todo.id);
    }
    renderTodosList();
    updateMemoryBadges();
  });
  
  // Clear memory
  document.getElementById('clearMemory')?.addEventListener('click', async () => {
    if (confirm('Clear all memories? This cannot be undone.')) {
      for (const memory of memoryManager.getMemories()) {
        await memoryManager.deleteMemory(memory.id);
      }
      renderMemoryView();
      updateMemoryBadges();
    }
  });
}

// ==================== HELPER FUNCTIONS ====================

function formatDate(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const diff = now - date;
  
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  
  return date.toLocaleDateString();
}

// ==================== ICON INITIALIZATION ====================

function initIcons() {
  // Helper to set icon
  const setIcon = (id, iconName, size = 16) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = Icons[iconName] || '';
  };
  
  // View tabs icons
  setIcon('iconChat', 'chat', 14);
  setIcon('iconTodos', 'checkSquare', 14);
  setIcon('iconNotes', 'note', 14);
  setIcon('iconMemory', 'brain', 14);
  
  // Header icons
  setIcon('iconLogo', 'zap', 20);
  setIcon('iconAddTabs', 'tabs', 16);
  setIcon('iconClearPage', 'trash', 16);
  setIcon('iconClearAll', 'trashAll', 16);
  setIcon('iconSettings', 'settings', 16);
  
  // Stats icons
  setIcon('iconGlobe', 'globe', 12);
  setIcon('iconQuestion', 'question', 12);
  setIcon('iconAutoSearch', 'search', 12);
  
  // Send button
  setIcon('iconSend', 'send', 16);
  
  // Toggle icon
  setIcon('iconToggleSearch', 'search', 12);
  
  // Tabs panel
  setIcon('iconTabsHeader', 'tabs', 18);
  setIcon('iconTabsClose', 'close', 16);
  
  // Settings panel
  setIcon('iconSettingsHeader', 'settings', 18);
  setIcon('iconSettingsClose', 'close', 16);
  
  // View headers
  setIcon('iconTodosHeader', 'checkSquare', 20);
  setIcon('iconNotesHeader', 'note', 20);
  setIcon('iconMemoryHeader', 'brain', 20);
  
  // Empty state icons
  setIcon('iconEmptyTodos', 'checkCircle', 48);
  setIcon('iconEmptyNotes', 'note', 48);
  
  // Memory section icons
  setIcon('iconSavedMemories', 'database', 16);
  setIcon('iconStats', 'sparkles', 16);
  
  // Settings info/warning icons
  setIcon('iconWarningOllama', 'warning', 14);
  setIcon('iconInfoLMStudio', 'info', 14);
  
  // Mention popup icons
  setIcon('iconMentionBookmark', 'bookmark', 14);
  setIcon('iconMentionHistory', 'clock', 14);
}

// Update theme icon based on current theme
function updateThemeIcon(theme) {
  const container = document.getElementById('themeIconContainer');
  if (container) {
    container.innerHTML = Icons[theme === 'dark' ? 'moon' : 'sun'] || '';
  }
}

