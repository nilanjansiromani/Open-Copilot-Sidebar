// Agent Mode - UI Components
// Handles the visual feedback during agent execution (inline in messages)

const AgentUI = {
  
  // Current message element
  messageElement: null,
  statusElement: null,
  
  // Current state
  state: {
    status: 'idle',
    task: '',
    steps: [],
    currentStep: 0,
    sources: []  // Track sources for display
  },
  
  // Initialize - create inline message in chat
  init(containerId) {
    // We'll create inline elements, not use a container
  },
  
  // Show the agent status as a message in the chat
  show(task) {
    this.state = {
      status: 'starting',
      task,
      steps: [],
      currentStep: 0,
      sources: []
    };
    
    // Create a message element in the messages list
    const messagesList = document.getElementById('messagesList');
    if (!messagesList) return;
    
    // Create message container
    this.messageElement = document.createElement('div');
    this.messageElement.className = 'message assistant agent-message';
    this.messageElement.innerHTML = `
      <div class="message-content">
        <div class="message-avatar assistant-avatar">⚡</div>
        <div class="message-bubble">
          <div class="message-header">
            <span class="message-author">Agent Mode</span>
            <button class="agent-cancel-btn" id="agentCancelBtn">Cancel</button>
          </div>
          <div class="agent-inline-status" id="agentInlineStatus">
            ${this.renderInlineStatus()}
          </div>
        </div>
      </div>
    `;
    
    messagesList.appendChild(this.messageElement);
    this.statusElement = this.messageElement.querySelector('#agentInlineStatus');
    
    // Add cancel handler
    const cancelBtn = this.messageElement.querySelector('#agentCancelBtn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        if (window.agentController) {
          window.agentController.cancel();
        }
      });
    }
    
    // Scroll to bottom
    this.scrollToBottom();
  },
  
  // Hide/remove the agent status
  hide() {
    // Don't remove - let it stay as history
    // Just update to final state
    if (this.statusElement) {
      const cancelBtn = this.messageElement?.querySelector('#agentCancelBtn');
      if (cancelBtn) cancelBtn.style.display = 'none';
    }
  },
  
  // Update the status inline
  update(updateData) {
    if (!this.statusElement) return;
    
    // Update state
    Object.assign(this.state, updateData);
    
    // Extract sources from results
    if (updateData.result?.data) {
      this.extractSources(updateData.result.data);
    }
    
    // Add step to history
    if (updateData.message && !['complete', 'error', 'cancelled'].includes(updateData.status)) {
      // Avoid duplicates
      const lastStep = this.state.steps[this.state.steps.length - 1];
      if (!lastStep || lastStep.message !== updateData.message) {
        this.state.steps.push({
          message: updateData.message,
          status: updateData.status,
          time: new Date().toLocaleTimeString()
        });
      }
    }
    
    // Re-render status
    this.statusElement.innerHTML = this.renderInlineStatus();
    
    // Hide cancel on complete/error
    if (['complete', 'error', 'cancelled'].includes(updateData.status)) {
      const cancelBtn = this.messageElement?.querySelector('#agentCancelBtn');
      if (cancelBtn) cancelBtn.style.display = 'none';
    }
    
    this.scrollToBottom();
  },
  
  // Extract sources from action results
  extractSources(data) {
    // From search results
    if (data.results && Array.isArray(data.results)) {
      data.results.forEach(r => {
        if (r.url && !this.state.sources.find(s => s.url === r.url)) {
          this.state.sources.push({
            url: r.url,
            title: r.title || this.getDomain(r.url)
          });
        }
      });
    }
    
    // From history results
    if (data.items && Array.isArray(data.items)) {
      data.items.forEach(r => {
        if (r.url && !this.state.sources.find(s => s.url === r.url)) {
          this.state.sources.push({
            url: r.url,
            title: r.title || this.getDomain(r.url)
          });
        }
      });
    }
    
    // From opened tabs
    if (data.opened && Array.isArray(data.opened)) {
      data.opened.forEach(r => {
        if (r.url && !this.state.sources.find(s => s.url === r.url)) {
          this.state.sources.push({
            url: r.url,
            title: r.title || this.getDomain(r.url)
          });
        }
      });
    }
    
    // Single URL
    if (data.url && data.title) {
      if (!this.state.sources.find(s => s.url === data.url)) {
        this.state.sources.push({
          url: data.url,
          title: data.title
        });
      }
    }
    
    // Limit sources
    if (this.state.sources.length > 8) {
      this.state.sources = this.state.sources.slice(0, 8);
    }
  },
  
  // Get domain from URL
  getDomain(url) {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return url;
    }
  },
  
  // Get favicon URL
  getFavicon(url) {
    try {
      const domain = new URL(url).origin;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    } catch {
      return '';
    }
  },
  
  // Render inline status HTML
  renderInlineStatus() {
    const { status, task, steps, iterations, maxIterations } = this.state;
    
    const isRunning = !['complete', 'error', 'cancelled'].includes(status);
    const progress = maxIterations ? Math.round((iterations / maxIterations) * 100) : 0;
    
    let html = `
      <div class="agent-task-line">
        <span class="agent-task-label">Task:</span>
        <span class="agent-task-text">${this.escapeHtml(task)}</span>
      </div>
    `;
    
    // Progress bar (only while running)
    if (isRunning && maxIterations) {
      html += `
        <div class="agent-progress-line">
          <div class="agent-progress-track">
            <div class="agent-progress-fill" style="width: ${progress}%"></div>
          </div>
          <span class="agent-progress-label">Step ${iterations || 0}/${maxIterations}</span>
        </div>
      `;
    }
    
    // Steps
    if (steps.length > 0) {
      html += `<div class="agent-steps-list">`;
      steps.forEach((step, i) => {
        const isLast = i === steps.length - 1;
        const icon = this.getStepIcon(step.status, isLast && isRunning);
        html += `
          <div class="agent-step-line ${isLast ? 'active' : ''}">
            <span class="agent-step-icon">${icon}</span>
            <span class="agent-step-text">${this.escapeHtml(step.message)}</span>
          </div>
        `;
      });
      html += `</div>`;
    }
    
    // Final status
    if (status === 'complete') {
      html += `<div class="agent-final-status success">✓ Task completed</div>`;
      // Add sources on complete
      if (this.state.sources.length > 0) {
        html += this.renderSources();
      }
    } else if (status === 'error') {
      html += `<div class="agent-final-status error">✗ Task failed</div>`;
    } else if (status === 'cancelled') {
      html += `<div class="agent-final-status cancelled">◼ Cancelled</div>`;
    }
    
    return html;
  },
  
  // Render source pills
  renderSources() {
    if (!this.state.sources || this.state.sources.length === 0) return '';
    
    let html = `<div class="agent-sources">`;
    
    this.state.sources.forEach(source => {
      const favicon = this.getFavicon(source.url);
      const title = source.title || this.getDomain(source.url);
      html += `
        <a href="${this.escapeHtml(source.url)}" 
           class="agent-source-pill" 
           target="_blank" 
           title="${this.escapeHtml(source.url)}">
          <img src="${favicon}" class="agent-source-favicon" onerror="this.style.display='none'">
          <span class="agent-source-title">${this.escapeHtml(title)}</span>
        </a>
      `;
    });
    
    html += `</div>`;
    return html;
  },
  
  // Get icon for step
  getStepIcon(status, isActive) {
    if (isActive) return '<span class="agent-spinner"></span>';
    
    const icons = {
      planning: '📋',
      executing: '✓',
      thinking: '✓',
      completing: '✓',
      complete: '✓',
      error: '✗'
    };
    return icons[status] || '•';
  },
  
  // Scroll messages to bottom
  scrollToBottom() {
    const container = document.getElementById('messagesContainer');
    if (container) {
      setTimeout(() => {
        container.scrollTop = container.scrollHeight;
      }, 50);
    }
  },
  
  // Escape HTML
  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

// CSS for inline Agent UI
const agentInlineStyles = `
/* Agent inline message styles */
.agent-message .message-bubble {
  background: transparent;
  border: none;
  padding: 0;
}

.agent-message .message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.agent-message .message-author {
  color: var(--command-color);
  font-weight: 600;
  font-size: 13px;
}

.agent-cancel-btn {
  padding: 4px 12px;
  background: transparent;
  border: 1px solid var(--danger);
  border-radius: 4px;
  color: var(--danger);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.agent-cancel-btn:hover {
  background: rgba(239, 68, 68, 0.1);
}

.agent-inline-status {
  margin-top: 4px;
}

.agent-task-line {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.agent-task-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
}

.agent-task-text {
  font-size: 13px;
  color: var(--text-primary);
  font-weight: 500;
}

.agent-progress-line {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.agent-progress-track {
  flex: 1;
  height: 3px;
  background: var(--bg-tertiary);
  border-radius: 2px;
  overflow: hidden;
}

.agent-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--command-color), var(--accent-primary));
  border-radius: 2px;
  transition: width 0.3s ease;
}

.agent-progress-label {
  font-size: 12px;
  color: var(--text-muted);
  white-space: nowrap;
}

.agent-steps-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 8px;
}

.agent-step-line {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 2px 0;
  font-size: 12px;
  color: var(--text-muted);
}

.agent-step-line.active {
  color: var(--text-primary);
}

.agent-step-icon {
  flex-shrink: 0;
  width: 16px;
  text-align: center;
  font-size: 12px;
}

.agent-step-text {
  flex: 1;
  line-height: 1.4;
}

.agent-spinner {
  display: inline-block;
  width: 10px;
  height: 10px;
  border: 2px solid var(--border-color);
  border-top-color: var(--accent-primary);
  border-radius: 50%;
  animation: agentSpin 0.8s linear infinite;
}

@keyframes agentSpin {
  to { transform: rotate(360deg); }
}

.agent-final-status {
  margin-top: 10px;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
}

/* Agent source pills */
.agent-sources {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid var(--border-light);
}

.agent-source-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: var(--bg-tertiary);
  border-radius: 12px;
  font-size: 11px;
  color: var(--text-secondary);
  text-decoration: none;
  transition: all 0.15s;
  max-width: 200px;
}

.agent-source-pill:hover {
  background: var(--bg-hover);
  color: var(--accent-primary);
}

.agent-source-favicon {
  width: 12px;
  height: 12px;
  border-radius: 2px;
  flex-shrink: 0;
}

.agent-source-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.agent-final-status.success {
  background: rgba(16, 185, 129, 0.1);
  color: var(--success);
}

.agent-final-status.error {
  background: rgba(239, 68, 68, 0.1);
  color: var(--danger);
}

.agent-final-status.cancelled {
  background: rgba(245, 158, 11, 0.1);
  color: var(--warning);
}

/* Hide the old floating container */
.agent-status-container {
  display: none !important;
}
`;

// Inject styles
function injectAgentStyles() {
  if (document.getElementById('agent-inline-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'agent-inline-styles';
  style.textContent = agentInlineStyles;
  document.head.appendChild(style);
}

// Auto-inject styles when loaded
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectAgentStyles);
  } else {
    injectAgentStyles();
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AgentUI;
}
