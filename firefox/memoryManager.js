// Memory Manager - Handles todos, notes, memories, bookmarks, and history search

// Browser API polyfill: Use browser.* (Firefox) if available, otherwise browserAPI.* (Chrome/Zen)
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

class MemoryManager {
  constructor() {
    this.todos = [];
    this.notes = [];
    this.memories = [];
    this.loaded = false;
  }

  // Initialize and load from storage
  async init() {
    if (this.loaded) return;
    
    try {
      const data = await browserAPI.storage.local.get(['opencopilot_todos', 'opencopilot_notes', 'opencopilot_memories']);
      this.todos = data.opencopilot_todos || [];
      this.notes = data.opencopilot_notes || [];
      this.memories = data.opencopilot_memories || [];
      this.loaded = true;
      console.log('Memory loaded:', { todos: this.todos.length, notes: this.notes.length, memories: this.memories.length });
    } catch (error) {
      console.error('Error loading memory:', error);
    }
  }

  // Save all data to storage
  async save() {
    try {
      await browserAPI.storage.local.set({
        opencopilot_todos: this.todos,
        opencopilot_notes: this.notes,
        opencopilot_memories: this.memories
      });
    } catch (error) {
      console.error('Error saving memory:', error);
    }
  }

  // ==================== TODOS ====================

  async addTodo(text, url = null, metadata = {}) {
    const todo = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2),
      text: text.trim(),
      url: url,
      createdAt: new Date().toISOString(),
      completed: false,
      ...metadata
    };
    this.todos.unshift(todo);
    await this.save();
    return todo;
  }

  async toggleTodo(id) {
    const todo = this.todos.find(t => t.id === id);
    if (todo) {
      todo.completed = !todo.completed;
      todo.completedAt = todo.completed ? new Date().toISOString() : null;
      await this.save();
    }
    return todo;
  }

  async deleteTodo(id) {
    this.todos = this.todos.filter(t => t.id !== id);
    await this.save();
  }

  getTodos(includeCompleted = true) {
    if (includeCompleted) return this.todos;
    return this.todos.filter(t => !t.completed);
  }

  // ==================== NOTES ====================

  async addNote(text, url = null, metadata = {}) {
    const note = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2),
      text: text.trim(),
      url: url,
      createdAt: new Date().toISOString(),
      tags: extractTags(text),
      ...metadata
    };
    this.notes.unshift(note);
    await this.save();
    return note;
  }

  async updateNote(id, text) {
    const note = this.notes.find(n => n.id === id);
    if (note) {
      note.text = text.trim();
      note.tags = extractTags(text);
      note.updatedAt = new Date().toISOString();
      await this.save();
    }
    return note;
  }

  async deleteNote(id) {
    this.notes = this.notes.filter(n => n.id !== id);
    await this.save();
  }

  getNotes() {
    return this.notes;
  }

  // ==================== MEMORIES ====================

  async addMemory(text, type = 'general', metadata = {}) {
    const memory = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2),
      text: text.trim(),
      type: type, // 'general', 'preference', 'fact', 'link'
      createdAt: new Date().toISOString(),
      ...metadata
    };
    this.memories.unshift(memory);
    await this.save();
    return memory;
  }

  async deleteMemory(id) {
    this.memories = this.memories.filter(m => m.id !== id);
    await this.save();
  }

  getMemories() {
    return this.memories;
  }

  // ==================== SEARCH ====================

  // Search through all stored data
  searchMemory(query) {
    const queryLower = query.toLowerCase();
    const words = queryLower.split(/\s+/).filter(w => w.length > 2);
    
    const results = {
      todos: [],
      notes: [],
      memories: []
    };

    // Search todos
    this.todos.forEach(todo => {
      const score = calculateScore(todo.text, words, queryLower);
      if (score > 0) {
        results.todos.push({ ...todo, score });
      }
    });

    // Search notes
    this.notes.forEach(note => {
      const score = calculateScore(note.text, words, queryLower);
      if (score > 0) {
        results.notes.push({ ...note, score });
      }
    });

    // Search memories
    this.memories.forEach(memory => {
      const score = calculateScore(memory.text, words, queryLower);
      if (score > 0) {
        results.memories.push({ ...memory, score });
      }
    });

    // Sort by score
    results.todos.sort((a, b) => b.score - a.score);
    results.notes.sort((a, b) => b.score - a.score);
    results.memories.sort((a, b) => b.score - a.score);

    return results;
  }

  // Search browser bookmarks
  async searchBookmarks(query, maxResults = 10) {
    try {
      const results = await browserAPI.bookmarks.search(query);
      return results.slice(0, maxResults).map(b => ({
        id: b.id,
        title: b.title,
        url: b.url,
        dateAdded: b.dateAdded ? new Date(b.dateAdded).toISOString() : null,
        type: 'bookmark'
      }));
    } catch (error) {
      console.error('Error searching bookmarks:', error);
      return [];
    }
  }

  // Search browser history
  async searchHistory(query, maxResults = 10) {
    try {
      const results = await browserAPI.history.search({
        text: query,
        maxResults: maxResults,
        startTime: Date.now() - (30 * 24 * 60 * 60 * 1000) // Last 30 days
      });
      return results.map(h => ({
        id: h.id,
        title: h.title,
        url: h.url,
        lastVisitTime: h.lastVisitTime ? new Date(h.lastVisitTime).toISOString() : null,
        visitCount: h.visitCount,
        type: 'history'
      }));
    } catch (error) {
      console.error('Error searching history:', error);
      return [];
    }
  }

  // Unified search across all sources
  async searchAll(query) {
    const memoryResults = this.searchMemory(query);
    const bookmarks = await this.searchBookmarks(query);
    const history = await this.searchHistory(query);

    return {
      ...memoryResults,
      bookmarks,
      history,
      hasResults: memoryResults.todos.length > 0 || 
                  memoryResults.notes.length > 0 || 
                  memoryResults.memories.length > 0 ||
                  bookmarks.length > 0 || 
                  history.length > 0
    };
  }

  // Get context string for AI
  getContextForAI(query = null) {
    let context = '';

    // Add pending todos
    const pendingTodos = this.getTodos(false);
    if (pendingTodos.length > 0) {
      context += '--- USER\'S PENDING TODOS ---\n';
      pendingTodos.slice(0, 10).forEach((todo, i) => {
        context += `${i + 1}. ${todo.text}${todo.url ? ` (from: ${todo.url})` : ''}\n`;
      });
      context += '\n';
    }

    // Add recent notes
    if (this.notes.length > 0) {
      context += '--- USER\'S NOTES ---\n';
      this.notes.slice(0, 10).forEach((note, i) => {
        context += `• ${note.text}${note.url ? ` (ref: ${note.url})` : ''}\n`;
      });
      context += '\n';
    }

    // Add memories
    if (this.memories.length > 0) {
      context += '--- USER\'S SAVED MEMORIES ---\n';
      this.memories.slice(0, 10).forEach((memory, i) => {
        context += `• ${memory.text}\n`;
      });
      context += '\n';
    }

    return context;
  }

  // Get statistics
  getStats() {
    return {
      totalTodos: this.todos.length,
      pendingTodos: this.todos.filter(t => !t.completed).length,
      completedTodos: this.todos.filter(t => t.completed).length,
      totalNotes: this.notes.length,
      totalMemories: this.memories.length
    };
  }

  // Clear all data
  async clearAll() {
    this.todos = [];
    this.notes = [];
    this.memories = [];
    await this.save();
  }
}

// Helper: Extract hashtags from text
function extractTags(text) {
  const matches = text.match(/#\w+/g);
  return matches ? matches.map(t => t.slice(1).toLowerCase()) : [];
}

// Helper: Calculate search score
function calculateScore(text, words, fullQuery) {
  const textLower = text.toLowerCase();
  let score = 0;

  // Exact phrase match
  if (textLower.includes(fullQuery)) {
    score += 10;
  }

  // Individual word matches
  words.forEach(word => {
    if (textLower.includes(word)) {
      score += 2;
    }
  });

  return score;
}

// Create singleton instance
const memoryManager = new MemoryManager();

