// Agent Mode - Entry Point
// Exports all agent modules and provides initialization

// Import modules (these will be loaded via script tags in the browser)
// In a module environment, these would be ES6 imports

/**
 * Agent Mode for OpenCopilot
 * 
 * Usage:
 * 1. Load all agent scripts in sidepanel.html
 * 2. Detect @agent trigger in user input
 * 3. Initialize and run the agent
 * 
 * Example:
 * ```javascript
 * // In sidepanel.js
 * if (userInput.startsWith('@agent ')) {
 *   const task = userInput.replace('@agent ', '').trim();
 *   
 *   const agent = new AgentController(aiService, (update) => {
 *     AgentUI.update(update);
 *   });
 *   
 *   AgentUI.show(task);
 *   
 *   try {
 *     const result = await agent.run(task);
 *     addMessage('assistant', result);
 *   } catch (error) {
 *     addMessage('assistant', `Agent error: ${error.message}`, true);
 *   }
 * }
 * ```
 * 
 * Files:
 * - agentController.js - Main orchestration logic
 * - agentTools.js      - Browser action implementations  
 * - agentPrompts.js    - LLM prompt templates
 * - agentUI.js         - Visual feedback components
 */

// Quick start function for integration
async function startAgent(task, aiService, callbacks = {}) {
  const {
    onUpdate = () => {},
    onComplete = () => {},
    onError = () => {}
  } = callbacks;
  
  // Initialize UI
  AgentUI.init();
  AgentUI.show(task);
  
  // Create controller
  const controller = new AgentController(aiService, (update) => {
    AgentUI.update(update);
    onUpdate(update);
  });
  
  // Store globally for cancel access
  window.agentController = controller;
  
  try {
    const result = await controller.run(task);
    onComplete(result);
    return result;
  } catch (error) {
    onError(error);
    throw error;
  } finally {
    window.agentController = null;
  }
}

// Check if input is an agent command
function isAgentCommand(input) {
  return input.trim().toLowerCase().startsWith('@agent ');
}

// Extract task from agent command
function extractAgentTask(input) {
  return input.replace(/^@agent\s+/i, '').trim();
}

// Export utilities
if (typeof window !== 'undefined') {
  window.AgentMode = {
    start: startAgent,
    isCommand: isAgentCommand,
    extractTask: extractAgentTask,
    Controller: typeof AgentController !== 'undefined' ? AgentController : null,
    Tools: typeof AgentTools !== 'undefined' ? AgentTools : null,
    Prompts: typeof AgentPrompts !== 'undefined' ? AgentPrompts : null,
    UI: typeof AgentUI !== 'undefined' ? AgentUI : null
  };
}

