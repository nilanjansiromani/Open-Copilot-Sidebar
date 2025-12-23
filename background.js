// Background service worker for Chrome Side Panel extension

console.log('OpenCopilot background service worker started');

// Open side panel when extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener((command) => {
  console.log('Command received:', command);
  if (command === 'open-settings') {
    chrome.runtime.openOptionsPage();
  }
});

// Handle installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Set default settings
    chrome.storage.sync.set({
      settings: {
        service: 'groq',
        groqApiKey: '',
        groqModel: 'openai/gpt-oss-20b',
        geminiApiKey: '',
        geminiModel: 'gemini-2.5-flash-preview-09-2025',
        openRouterApiKey: '',
        openRouterModel: 'z-ai/glm-4.5-air:free',
        ollamaUrl: 'http://localhost:11434',
        ollamaModel: 'granite4:350m',
        lmstudioUrl: 'http://localhost:1234',
        lmstudioModel: 'local-model',
        osaurusUrl: 'http://127.0.0.1:1337',
        osaurusModel: 'foundation'
      }
    });
    
    // Open settings page on first install
    chrome.tabs.create({ url: 'settings.html' });
  }
});

// Handle messages from side panel and other parts of the extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getSettings') {
    chrome.storage.sync.get(['settings'], (result) => {
      sendResponse(result.settings || {});
    });
    return true; // Will respond asynchronously
  }
  
  if (request.action === 'saveSettings') {
    chrome.storage.sync.set({ settings: request.settings }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
  
  if (request.action === 'openSettings') {
    chrome.runtime.openOptionsPage();
    sendResponse({ success: true });
    return false;
  }
  
  if (request.action === 'extractTabContent') {
    extractTabContent(request.tabId)
      .then(content => sendResponse(content))
      .catch(error => {
        console.error('Error extracting tab content:', error);
        sendResponse(null);
      });
    return true; // Will respond asynchronously
  }
  
  // ==================== AGENT MODE HANDLERS ====================
  
  // Create a background tab (for agent browsing)
  if (request.action === 'agent_createTab') {
    chrome.tabs.create({
      url: request.url,
      active: false  // Open in background
    }).then(tab => {
      sendResponse({ success: true, tabId: tab.id, tab });
    }).catch(error => {
      sendResponse({ success: false, error: error.message });
    });
    return true;
  }
  
  // Close a tab (for agent cleanup)
  if (request.action === 'agent_closeTab') {
    chrome.tabs.remove(request.tabId).then(() => {
      sendResponse({ success: true });
    }).catch(error => {
      sendResponse({ success: false, error: error.message });
    });
    return true;
  }
  
  // Wait for tab to load completely
  if (request.action === 'agent_waitForTab') {
    const tabId = request.tabId;
    const timeout = request.timeout || 10000;
    
    const checkComplete = () => {
      return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          chrome.tabs.onUpdated.removeListener(listener);
          reject(new Error('Tab load timeout'));
        }, timeout);
        
        const listener = (updatedTabId, changeInfo, tab) => {
          if (updatedTabId === tabId && changeInfo.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(listener);
            clearTimeout(timeoutId);
            // Give extra time for dynamic content
            setTimeout(() => resolve({ success: true, tab }), 1500);
          }
        };
        
        chrome.tabs.onUpdated.addListener(listener);
        
        // Check if already complete
        chrome.tabs.get(tabId).then(tab => {
          if (tab.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(listener);
            clearTimeout(timeoutId);
            setTimeout(() => resolve({ success: true, tab }), 1500);
          }
        });
      });
    };
    
    checkComplete()
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
  
  // Extract Google AI Overview
  if (request.action === 'agent_extractAIOverview') {
    chrome.scripting.executeScript({
      target: { tabId: request.tabId },
      func: extractGoogleAIOverview
    }).then(results => {
      sendResponse({ success: true, content: results[0]?.result || null });
    }).catch(error => {
      sendResponse({ success: false, error: error.message });
    });
    return true;
  }
  
  // Extract Google search results
  if (request.action === 'agent_extractSearchResults') {
    chrome.scripting.executeScript({
      target: { tabId: request.tabId },
      func: extractGoogleSearchResults,
      args: [request.limit || 5]
    }).then(results => {
      sendResponse({ success: true, results: results[0]?.result || [] });
    }).catch(error => {
      sendResponse({ success: false, error: error.message });
    });
    return true;
  }
  
  // Extract page content for agent
  if (request.action === 'agent_extractContent') {
    chrome.scripting.executeScript({
      target: { tabId: request.tabId },
      func: extractPageForAgent
    }).then(results => {
      sendResponse({ success: true, content: results[0]?.result || '' });
    }).catch(error => {
      sendResponse({ success: false, error: error.message });
    });
    return true;
  }
});

// Extract content from a specific tab
async function extractTabContent(tabId) {
  try {
    // Get tab info
    const tab = await chrome.tabs.get(tabId);
    
    // Check if URL is accessible
    const restrictedProtocols = ['chrome://', 'chrome-extension://', 'edge://', 'about:', 'data:', 'file://'];
    if (restrictedProtocols.some(protocol => tab.url.startsWith(protocol))) {
      console.log('Cannot extract content from restricted page:', tab.url);
      return {
        title: tab.title,
        url: tab.url,
        textContent: `[Cannot extract content from ${tab.url}]`,
        markdown: `[Cannot extract content from ${tab.url}]`
      };
    }
    
    // Inject content extraction script
    const results = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: extractPageContentFunction
    });
    
    if (results && results[0] && results[0].result) {
      const content = results[0].result;
      
      // Convert HTML to markdown
      const markdownResults = await chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: htmlToMarkdownFunction,
        args: [content.htmlContent]
      });
      
      const markdown = markdownResults?.[0]?.result || content.textContent;
      
      return {
        title: content.title,
        url: content.url,
        textContent: content.textContent,
        htmlContent: content.htmlContent,
        markdown: markdown,
        timestamp: content.timestamp
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error in extractTabContent:', error);
    return null;
  }
}

// Function to be injected into the page to extract content
function extractPageContentFunction() {
  // Get the main content of the page
  const body = document.body.cloneNode(true);
  
  // Remove script tags, style tags, and other non-content elements
  const elementsToRemove = body.querySelectorAll('script, style, noscript, iframe, nav, header, footer, aside, [role="navigation"], [role="banner"], [role="contentinfo"]');
  elementsToRemove.forEach(el => el.remove());
  
  // Get text content
  const textContent = body.innerText || body.textContent;
  
  // Get main HTML content for markdown conversion
  const mainContent = document.querySelector('main') || 
    document.querySelector('article') || 
    document.querySelector('.content') ||
    document.querySelector('#content') ||
    document.querySelector('[role="main"]') ||
    document.body;
  
  return {
    title: document.title,
    url: window.location.href,
    textContent: textContent.trim().substring(0, 50000), // Limit to ~50k chars
    htmlContent: mainContent.innerHTML.substring(0, 100000), // Limit HTML content
    timestamp: new Date().toISOString()
  };
}

// Function to convert HTML to Markdown (injected into page)
function htmlToMarkdownFunction(html) {
  // Create a temporary element to parse HTML
  const temp = document.createElement('div');
  temp.innerHTML = html;
  
  // Remove unwanted elements
  const unwanted = temp.querySelectorAll('script, style, noscript, iframe');
  unwanted.forEach(el => el.remove());
  
  let markdown = '';
  
  function processNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent.trim();
      if (text) {
        markdown += text + ' ';
      }
      return;
    }
    
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    
    const tag = node.tagName.toLowerCase();
    
    switch (tag) {
      case 'h1':
        markdown += '\n\n# ' + node.textContent.trim() + '\n\n';
        break;
      case 'h2':
        markdown += '\n\n## ' + node.textContent.trim() + '\n\n';
        break;
      case 'h3':
        markdown += '\n\n### ' + node.textContent.trim() + '\n\n';
        break;
      case 'h4':
        markdown += '\n\n#### ' + node.textContent.trim() + '\n\n';
        break;
      case 'h5':
        markdown += '\n\n##### ' + node.textContent.trim() + '\n\n';
        break;
      case 'h6':
        markdown += '\n\n###### ' + node.textContent.trim() + '\n\n';
        break;
      case 'p':
        markdown += '\n\n';
        node.childNodes.forEach(processNode);
        markdown += '\n\n';
        break;
      case 'strong':
      case 'b':
        markdown += '**' + node.textContent.trim() + '**';
        break;
      case 'em':
      case 'i':
        markdown += '_' + node.textContent.trim() + '_';
        break;
      case 'a':
        markdown += '[' + node.textContent.trim() + '](' + (node.href || '#') + ')';
        break;
      case 'ul':
      case 'ol':
        markdown += '\n\n';
        Array.from(node.children).forEach((li, index) => {
          const prefix = tag === 'ul' ? '- ' : `${index + 1}. `;
          markdown += prefix + li.textContent.trim() + '\n';
        });
        markdown += '\n';
        break;
      case 'code':
        if (node.parentElement?.tagName !== 'PRE') {
          markdown += '`' + node.textContent.trim() + '`';
        }
        break;
      case 'pre':
        markdown += '\n\n```\n' + node.textContent.trim() + '\n```\n\n';
        break;
      case 'br':
        markdown += '\n';
        break;
      case 'hr':
        markdown += '\n\n---\n\n';
        break;
      default:
        node.childNodes.forEach(processNode);
    }
  }
  
  temp.childNodes.forEach(processNode);
  
  // Clean up excessive whitespace
  markdown = markdown
    .replace(/\n{3,}/g, '\n\n')
    .replace(/  +/g, ' ')
    .trim();
  
  // Limit markdown length
  return markdown.substring(0, 50000);
}

// ==================== AGENT MODE HELPER FUNCTIONS ====================

// Extract Google AI Overview from AI search results
function extractGoogleAIOverview() {
  // Try multiple selectors for AI overview content
  const selectors = [
    '[data-attrid="AIOverview"]',           // Main AI overview container
    '.wDYxhc[data-md]',                      // AI response container
    '[jsname="WbKHeb"]',                     // AI generated content
    '.kno-rdesc',                            // Knowledge panel description
    '.IZ6rdc',                               // Featured snippet
    '.hgKElc',                               // Answer box
    '[data-tts="answers"]',                  // Direct answers
    '.xpdopen .kp-blk',                      // Expanded knowledge panel
    'div[data-async-token] .wDYxhc',         // Async loaded AI content
    '.VjDLd',                                // AI summary block
    '.mod[data-md]'                          // Module with markdown
  ];
  
  let aiContent = '';
  
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      const text = element.innerText?.trim();
      if (text && text.length > 50) {
        aiContent = text;
        break;
      }
    }
  }
  
  // If no AI overview found, try to get the first substantial text block
  if (!aiContent) {
    const mainContent = document.querySelector('#main');
    if (mainContent) {
      const textBlocks = mainContent.querySelectorAll('div[data-snf], .VwiC3b, .yXK7lf');
      for (const block of textBlocks) {
        const text = block.innerText?.trim();
        if (text && text.length > 100) {
          aiContent = text;
          break;
        }
      }
    }
  }
  
  // Truncate if too long
  if (aiContent && aiContent.length > 2000) {
    aiContent = aiContent.substring(0, 2000) + '...';
  }
  
  return aiContent || null;
}

// Extract Google search results from a search page
function extractGoogleSearchResults(limit = 5) {
  const results = [];
  const searchItems = document.querySelectorAll('div.g');
  
  for (let i = 0; i < Math.min(searchItems.length, limit); i++) {
    const item = searchItems[i];
    const titleEl = item.querySelector('h3');
    const linkEl = item.querySelector('a');
    const snippetEl = item.querySelector('div[data-snf], div[data-sncf], .VwiC3b');
    
    if (titleEl && linkEl && linkEl.href) {
      results.push({
        title: titleEl.textContent || '',
        url: linkEl.href,
        snippet: snippetEl ? snippetEl.textContent : ''
      });
    }
  }
  
  return results;
}

// Extract page content optimized for agent analysis
function extractPageForAgent() {
  // Clone body to avoid modifying the actual page
  const clone = document.body.cloneNode(true);
  
  // Remove non-content elements
  const removeSelectors = [
    'script', 'style', 'noscript', 'iframe', 
    'nav', 'footer', 'header', 'aside',
    '.ad', '.ads', '.advertisement', '[class*="cookie"]', 
    '[class*="popup"]', '[class*="modal"]', '[class*="banner"]',
    '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]'
  ];
  
  removeSelectors.forEach(sel => {
    try {
      clone.querySelectorAll(sel).forEach(el => el.remove());
    } catch (e) {}
  });
  
  // Get text content
  let text = clone.innerText || clone.textContent || '';
  
  // Clean up whitespace
  text = text
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n\n')
    .trim();
  
  // Truncate to reasonable size
  const maxLength = 30000;
  if (text.length > maxLength) {
    text = text.substring(0, maxLength) + '\n\n[Content truncated...]';
  }
  
  return {
    title: document.title,
    url: window.location.href,
    content: text
  };
}

// Enable side panel for all URLs
chrome.sidePanel.setOptions({
  enabled: true
});

// Set up side panel behavior
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error('Error setting panel behavior:', error));

