// Settings Dashboard - Enhanced with Pill Management

// Browser API polyfill: Use browser.* (Firefox) if available, otherwise browserAPI.* (Chrome/Zen)
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

// Default pills
const DEFAULT_PILLS = {
  tldr: {
    label: 'TLDR',
    prompt: 'Please provide a TLDR summary of this page in exactly 5 bullet points. Each bullet point must contain exactly 5 words. Be concise and capture the key essence.'
  },
  summarize: {
    label: 'Summarize',
    prompt: 'Please provide a concise summary of the main points and key information from this web page.'
  },
  bullets: {
    label: 'Bullets',
    prompt: 'Please summarize this web page into clear, concise bullet points covering the main topics and important details.'
  },
  terms: {
    label: 'Terms',
    prompt: 'Please identify and explain the key terms, concepts, and technical vocabulary from this web page.'
  },
  mindmap: {
    label: 'Mindmap',
    prompt: 'Please create a mindmap of this web page content in Mermaid.js format. Use the mindmap syntax with a root node and organize the key topics, subtopics, and concepts hierarchically. Format it as a Mermaid code block.'
  }
};

// DOM Elements
const serviceRadios = document.querySelectorAll('input[name="service"]');
const serviceCards = document.querySelectorAll('.service-card-dashboard');
const sections = {
  groq: document.getElementById('groqSection'),
  gemini: document.getElementById('geminiSection'),
  ollama: document.getElementById('ollamaSection'),
  lmstudio: document.getElementById('lmstudioSection'),
  osaurus: document.getElementById('osaurusSection'),
  openrouter: document.getElementById('openrouterSection')
};
const saveBtn = document.getElementById('saveBtn');
const resetBtn = document.getElementById('resetBtn');
const statusMessage = document.getElementById('statusMessage');
const refreshOllamaModelsBtn = document.getElementById('refreshOllamaModels');
const ollamaModelSelect = document.getElementById('ollamaModel');

// Pills Management
const addPillBtn = document.getElementById('addPillBtn');
const resetPillsBtn = document.getElementById('resetPillsBtn');
const pillsList = document.getElementById('pillsList');
const pillModal = document.getElementById('pillModal');
const modalTitle = document.getElementById('modalTitle');
const closeModal = document.getElementById('closeModal');
const cancelPillBtn = document.getElementById('cancelPillBtn');
const savePillBtn = document.getElementById('savePillBtn');
const pillKeyInput = document.getElementById('pillKey');
const pillLabelInput = document.getElementById('pillLabel');
const pillPromptInput = document.getElementById('pillPrompt');

let currentPills = {};
let editingPillKey = null;
let isNewPill = false;

// Show/hide sections based on selected service
function updateSections() {
  const selectedService = document.querySelector('input[name="service"]:checked').value;
  
  // Hide all sections
  Object.values(sections).forEach(section => {
    section.classList.remove('active');
  });
  
  // Show selected section
  sections[selectedService].classList.add('active');
  
  // Update card styling
  serviceCards.forEach(card => {
    card.classList.remove('active');
  });
  document.querySelector(`label[for="${selectedService}"]`).classList.add('active');
  
  // Fetch Ollama models if Ollama is selected
  if (selectedService === 'ollama') {
    fetchOllamaModels();
  }
  
  // Fetch LM Studio models if LM Studio is selected
  if (selectedService === 'lmstudio') {
    fetchLMStudioModels();
  }
  
  // Fetch Osaurus models if Osaurus is selected
  if (selectedService === 'osaurus') {
    fetchOsaurusModels();
  }
}

// Fetch available models from Ollama API
async function fetchOllamaModels() {
  const ollamaUrl = document.getElementById('ollamaUrl').value || 'http://localhost:11434';
  const helpText = document.getElementById('ollamaModelHelp');
  
  // Store the currently selected value
  const currentValue = ollamaModelSelect.value;
  
  // Show loading state
  ollamaModelSelect.innerHTML = '<option value="">Loading models...</option>';
  ollamaModelSelect.disabled = true;
  refreshOllamaModelsBtn.disabled = true;
  
  try {
    const response = await fetch(`${ollamaUrl}/api/tags`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.models && data.models.length > 0) {
      // Clear and populate dropdown with models
      ollamaModelSelect.innerHTML = '';
      
      data.models.forEach(model => {
        const option = document.createElement('option');
        option.value = model.name;
        option.textContent = model.name;
        ollamaModelSelect.appendChild(option);
      });
      
      // Restore previously selected value if it exists in the list
      if (currentValue && data.models.some(m => m.name === currentValue)) {
        ollamaModelSelect.value = currentValue;
      }
      
      helpText.textContent = `Found ${data.models.length} model(s) in your local Ollama instance`;
      helpText.className = 'form-help';
      helpText.style.color = '#10b981';
    } else {
      ollamaModelSelect.innerHTML = '<option value="">No models found</option>';
      helpText.textContent = 'No models found. Please pull a model using "ollama pull <model-name>"';
      helpText.style.color = '#f59e0b';
    }
  } catch (error) {
    console.error('Error fetching Ollama models:', error);
    ollamaModelSelect.innerHTML = '<option value="">Error loading models</option>';
    helpText.textContent = `Error: ${error.message}. Make sure Ollama is running at ${ollamaUrl}`;
    helpText.style.color = '#ef4444';
  } finally {
    ollamaModelSelect.disabled = false;
    refreshOllamaModelsBtn.disabled = false;
  }
}

// Fetch available models from LM Studio API
async function fetchLMStudioModels() {
  const lmstudioUrl = document.getElementById('lmstudioUrl').value || 'http://localhost:1234';
  const lmstudioModelSelect = document.getElementById('lmstudioModel');
  const refreshLMStudioModelsBtn = document.getElementById('refreshLMStudioModels');
  const helpText = document.getElementById('lmstudioModelHelp');
  
  // Store the currently selected value
  const currentValue = lmstudioModelSelect.value;
  
  // Show loading state
  lmstudioModelSelect.innerHTML = '<option value="">Loading models...</option>';
  lmstudioModelSelect.disabled = true;
  refreshLMStudioModelsBtn.disabled = true;
  
  try {
    const response = await fetch(`${lmstudioUrl}/v1/models`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.data && data.data.length > 0) {
      // Clear and populate dropdown with models
      lmstudioModelSelect.innerHTML = '';
      
      data.data.forEach(model => {
        const option = document.createElement('option');
        option.value = model.id;
        option.textContent = model.id;
        lmstudioModelSelect.appendChild(option);
      });
      
      // Restore previously selected value if it exists in the list
      if (currentValue && data.data.some(m => m.id === currentValue)) {
        lmstudioModelSelect.value = currentValue;
      }
      
      helpText.textContent = `Found ${data.data.length} loaded model(s) in LM Studio`;
      helpText.className = 'form-help';
      helpText.style.color = '#10b981';
    } else {
      lmstudioModelSelect.innerHTML = '<option value="local-model">local-model (default)</option>';
      helpText.textContent = 'No models detected. Make sure a model is loaded in LM Studio.';
      helpText.style.color = '#f59e0b';
    }
  } catch (error) {
    console.error('Error fetching LM Studio models:', error);
    lmstudioModelSelect.innerHTML = '<option value="local-model">local-model (default)</option>';
    helpText.textContent = `Error: ${error.message}. Make sure LM Studio server is running at ${lmstudioUrl}`;
    helpText.style.color = '#ef4444';
  } finally {
    lmstudioModelSelect.disabled = false;
    refreshLMStudioModelsBtn.disabled = false;
  }
}

// Fetch available models from Osaurus API
async function fetchOsaurusModels() {
  const osaurusUrl = document.getElementById('osaurusUrl').value || 'http://127.0.0.1:1337';
  const osaurusModelSelect = document.getElementById('osaurusModel');
  const refreshOsaurusModelsBtn = document.getElementById('refreshOsaurusModels');
  const helpText = document.getElementById('osaurusModelHelp');
  
  // Store the currently selected value
  const currentValue = osaurusModelSelect.value;
  
  // Show loading state
  osaurusModelSelect.innerHTML = '<option value="">Loading models...</option>';
  osaurusModelSelect.disabled = true;
  refreshOsaurusModelsBtn.disabled = true;
  
  try {
    const response = await fetch(`${osaurusUrl}/v1/models`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.data && data.data.length > 0) {
      // Clear and populate dropdown with models
      osaurusModelSelect.innerHTML = '';
      
      data.data.forEach(model => {
        const option = document.createElement('option');
        option.value = model.id;
        option.textContent = model.id + (model.id === 'foundation' ? ' (Apple System Model)' : '');
        osaurusModelSelect.appendChild(option);
      });
      
      // Restore previously selected value if it exists in the list
      if (currentValue && data.data.some(m => m.id === currentValue)) {
        osaurusModelSelect.value = currentValue;
      }
      
      helpText.textContent = `Found ${data.data.length} model(s) in Osaurus`;
      helpText.className = 'form-help';
      helpText.style.color = '#10b981';
    } else {
      osaurusModelSelect.innerHTML = '<option value="foundation">foundation (Apple System Model)</option>';
      helpText.textContent = 'No models detected. Using default Apple Foundation model.';
      helpText.style.color = '#f59e0b';
    }
  } catch (error) {
    console.error('Error fetching Osaurus models:', error);
    osaurusModelSelect.innerHTML = '<option value="foundation">foundation (Apple System Model)</option>';
    helpText.textContent = `Error: ${error.message}. Make sure Osaurus is running at ${osaurusUrl}`;
    helpText.style.color = '#ef4444';
  } finally {
    osaurusModelSelect.disabled = false;
    refreshOsaurusModelsBtn.disabled = false;
  }
}

// Load settings
function loadSettings() {
  browserAPI.storage.sync.get(['settings'], (result) => {
    if (result.settings) {
      const settings = result.settings;
      
      // Set service
      if (settings.service) {
        const radio = document.querySelector(`input[value="${settings.service}"]`);
        if (radio) {
          radio.checked = true;
          updateSections();
        }
      }
      
      // Groq settings
      if (settings.groqApiKey) {
        document.getElementById('groqApiKey').value = settings.groqApiKey;
      }
      if (settings.groqModel) {
        document.getElementById('groqModel').value = settings.groqModel;
      }
      
      // Gemini settings
      if (settings.geminiApiKey) {
        document.getElementById('geminiApiKey').value = settings.geminiApiKey;
      }
      if (settings.geminiModel) {
        document.getElementById('geminiModel').value = settings.geminiModel;
      }
      
      // Ollama settings
      if (settings.ollamaUrl) {
        document.getElementById('ollamaUrl').value = settings.ollamaUrl;
      }
      if (settings.ollamaModel) {
        document.getElementById('ollamaModel').value = settings.ollamaModel;
      }
      
      // LM Studio settings
      if (settings.lmstudioUrl) {
        document.getElementById('lmstudioUrl').value = settings.lmstudioUrl;
      }
      if (settings.lmstudioModel) {
        document.getElementById('lmstudioModel').value = settings.lmstudioModel;
      }
      
      // Osaurus settings
      if (settings.osaurusUrl) {
        document.getElementById('osaurusUrl').value = settings.osaurusUrl;
      }
      if (settings.osaurusModel) {
        document.getElementById('osaurusModel').value = settings.osaurusModel;
      }
      
      // OpenRouter settings
      if (settings.openRouterApiKey) {
        document.getElementById('openRouterApiKey').value = settings.openRouterApiKey;
      }
      if (settings.openRouterModel) {
        document.getElementById('openRouterModel').value = settings.openRouterModel;
      }
    }
  });
}

// Save settings
function saveSettings() {
  const selectedService = document.querySelector('input[name="service"]:checked').value;
  
  const settings = {
    service: selectedService,
    groqApiKey: document.getElementById('groqApiKey').value,
    groqModel: document.getElementById('groqModel').value || 'mixtral-8x7b-32768',
    geminiApiKey: document.getElementById('geminiApiKey').value,
    geminiModel: document.getElementById('geminiModel').value || 'gemini-pro',
    ollamaUrl: document.getElementById('ollamaUrl').value,
    ollamaModel: document.getElementById('ollamaModel').value || 'llama2',
    lmstudioUrl: document.getElementById('lmstudioUrl').value,
    lmstudioModel: document.getElementById('lmstudioModel').value || 'local-model',
    osaurusUrl: document.getElementById('osaurusUrl').value,
    osaurusModel: document.getElementById('osaurusModel').value || 'foundation',
    openRouterApiKey: document.getElementById('openRouterApiKey').value,
    openRouterModel: document.getElementById('openRouterModel').value || 'anthropic/claude-3.5-sonnet'
  };
  
  // Validate based on selected service
  if (selectedService === 'groq' && !settings.groqApiKey) {
    showStatus('Please enter your Groq API key', 'danger');
    return;
  }
  
  if (selectedService === 'gemini' && !settings.geminiApiKey) {
    showStatus('Please enter your Gemini API key', 'danger');
    return;
  }
  
  if (selectedService === 'ollama' && !settings.ollamaUrl) {
    showStatus('Please enter your Ollama URL', 'danger');
    return;
  }
  
  if (selectedService === 'lmstudio' && !settings.lmstudioUrl) {
    showStatus('Please enter your LM Studio URL', 'danger');
    return;
  }
  
  if (selectedService === 'osaurus' && !settings.osaurusUrl) {
    showStatus('Please enter your Osaurus URL', 'danger');
    return;
  }
  
  if (selectedService === 'openrouter' && !settings.openRouterApiKey) {
    showStatus('Please enter your OpenRouter API key', 'danger');
    return;
  }
  
  browserAPI.storage.sync.set({ settings }, () => {
    showStatus('Connection settings saved successfully! 🎉', 'success');
  });
}

// Reset to defaults
function resetSettings() {
  if (confirm('Are you sure you want to reset all settings to defaults?')) {
    const defaultSettings = {
      service: 'groq',
      groqApiKey: '',
      groqModel: 'mixtral-8x7b-32768',
      geminiApiKey: '',
      geminiModel: 'gemini-pro',
      ollamaUrl: 'http://localhost:11434',
      ollamaModel: 'llama2',
      lmstudioUrl: 'http://localhost:1234',
      lmstudioModel: 'local-model',
      osaurusUrl: 'http://127.0.0.1:1337',
      osaurusModel: 'foundation',
      openRouterApiKey: '',
      openRouterModel: 'anthropic/claude-3.5-sonnet'
    };
    
    browserAPI.storage.sync.set({ settings: defaultSettings }, () => {
      loadSettings();
      showStatus('Settings reset to defaults ✓', 'success');
    });
  }
}

// Show status message
function showStatus(message, type) {
  statusMessage.innerHTML = `
    <div class="alert alert-${type}">
      ${message}
      <button type="button" class="alert-close">×</button>
    </div>
  `;
  
  // Add event listener to close button
  const closeBtn = statusMessage.querySelector('.alert-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      statusMessage.innerHTML = '';
    });
  }
  
  setTimeout(() => {
    statusMessage.innerHTML = '';
  }, 4000);
}

// ==================== PILLS MANAGEMENT ====================

// Load pills from storage
function loadPills() {
  browserAPI.storage.sync.get(['customPills'], (result) => {
    if (result.customPills) {
      currentPills = result.customPills;
    } else {
      // Use default pills if none saved
      currentPills = { ...DEFAULT_PILLS };
    }
    renderPillsList();
  });
}

// Save pills to storage
function savePills() {
  browserAPI.storage.sync.set({ customPills: currentPills }, () => {
    console.log('Pills saved to storage');
    // Notify the sidebar to reload pills
    browserAPI.runtime.sendMessage({ action: 'pillsUpdated' });
  });
}

// Render pills list
function renderPillsList() {
  pillsList.innerHTML = '';
  
  const pillsArray = Object.entries(currentPills);
  
  if (pillsArray.length === 0) {
    pillsList.innerHTML = '<div class="pills-list-empty">💊 No pills configured yet.<br><br>Click <strong>"Add New Pill"</strong> to create your first custom quick prompt!</div>';
    return;
  }
  
  pillsArray.forEach(([key, data]) => {
    const pillItem = document.createElement('div');
    pillItem.className = 'pill-item';
    
    pillItem.innerHTML = `
      <div class="pill-info">
        <div class="pill-key">${key}</div>
        <div class="pill-label">${data.label}</div>
      </div>
      <div class="pill-prompt">${data.prompt}</div>
      <div class="pill-actions">
        <button class="btn-edit-pill" data-key="${key}">Edit</button>
        <button class="btn-delete-pill" data-key="${key}">Delete</button>
      </div>
    `;
    
    pillsList.appendChild(pillItem);
  });
  
  // Add event listeners to edit and delete buttons
  document.querySelectorAll('.btn-edit-pill').forEach(btn => {
    btn.addEventListener('click', () => editPill(btn.dataset.key));
  });
  
  document.querySelectorAll('.btn-delete-pill').forEach(btn => {
    btn.addEventListener('click', () => deletePill(btn.dataset.key));
  });
}

// Open modal for adding new pill
function openAddPillModal() {
  isNewPill = true;
  editingPillKey = null;
  
  modalTitle.textContent = 'Add New Pill';
  pillKeyInput.value = '';
  pillKeyInput.disabled = false;
  pillLabelInput.value = '';
  pillPromptInput.value = '';
  
  pillModal.classList.add('show');
}

// Open modal for editing pill
function editPill(key) {
  isNewPill = false;
  editingPillKey = key;
  
  const pill = currentPills[key];
  
  modalTitle.textContent = 'Edit Pill';
  pillKeyInput.value = key;
  pillKeyInput.disabled = true; // Don't allow changing key when editing
  pillLabelInput.value = pill.label;
  pillPromptInput.value = pill.prompt;
  
  pillModal.classList.add('show');
}

// Delete pill
function deletePill(key) {
  const pill = currentPills[key];
  
  if (confirm(`Are you sure you want to delete the "${pill.label}" pill?\n\nThis action cannot be undone.`)) {
    delete currentPills[key];
    savePills();
    renderPillsList();
    showStatus(`Pill "${pill.label}" deleted successfully 🗑️`, 'success');
  }
}

// Close modal
function closeModalWindow() {
  pillModal.classList.remove('show');
  editingPillKey = null;
  isNewPill = false;
}

// Save pill (add or edit)
function savePill() {
  const key = pillKeyInput.value.trim().toLowerCase();
  const label = pillLabelInput.value.trim();
  const prompt = pillPromptInput.value.trim();
  
  // Validation
  if (!key) {
    alert('Please enter a pill ID');
    return;
  }
  
  if (!/^[a-z_]+$/.test(key)) {
    alert('Pill ID must contain only lowercase letters and underscores');
    return;
  }
  
  if (!label) {
    alert('Please enter a button label');
    return;
  }
  
  if (!prompt) {
    alert('Please enter a prompt text');
    return;
  }
  
  // Check if key already exists (only for new pills)
  if (isNewPill && currentPills[key]) {
    alert(`A pill with the ID "${key}" already exists. Please use a different ID.`);
    return;
  }
  
  // Save pill
  currentPills[key] = {
    label: label,
    prompt: prompt
  };
  
  savePills();
  renderPillsList();
  closeModalWindow();
  
  const action = isNewPill ? 'added' : 'updated';
  showStatus(`Pill "${label}" ${action} successfully! 💊`, 'success');
}

// Reset pills to defaults
function resetPillsToDefaults() {
  if (confirm('Reset all pills to default configuration?\n\nThis will delete all custom pills you have created.')) {
    currentPills = { ...DEFAULT_PILLS };
    savePills();
    renderPillsList();
    showStatus('Pills reset to defaults ✓', 'success');
  }
}

// ==================== EVENT LISTENERS ====================

// Service selection
serviceRadios.forEach(radio => {
  radio.addEventListener('change', updateSections);
});

serviceCards.forEach(card => {
  card.addEventListener('click', () => {
    const radio = card.querySelector('input[type="radio"]');
    radio.checked = true;
    updateSections();
  });
});

// Connection settings
saveBtn.addEventListener('click', saveSettings);
resetBtn.addEventListener('click', resetSettings);
refreshOllamaModelsBtn.addEventListener('click', fetchOllamaModels);

// LM Studio refresh button
const refreshLMStudioModelsBtn = document.getElementById('refreshLMStudioModels');
if (refreshLMStudioModelsBtn) {
  refreshLMStudioModelsBtn.addEventListener('click', fetchLMStudioModels);
}

// Osaurus refresh button
const refreshOsaurusModelsBtn = document.getElementById('refreshOsaurusModels');
if (refreshOsaurusModelsBtn) {
  refreshOsaurusModelsBtn.addEventListener('click', fetchOsaurusModels);
}

// Fetch models when Ollama URL changes
document.getElementById('ollamaUrl').addEventListener('blur', () => {
  const selectedService = document.querySelector('input[name="service"]:checked').value;
  if (selectedService === 'ollama') {
    fetchOllamaModels();
  }
});

// Fetch models when LM Studio URL changes
document.getElementById('lmstudioUrl').addEventListener('blur', () => {
  const selectedService = document.querySelector('input[name="service"]:checked').value;
  if (selectedService === 'lmstudio') {
    fetchLMStudioModels();
  }
});

// Fetch models when Osaurus URL changes
document.getElementById('osaurusUrl').addEventListener('blur', () => {
  const selectedService = document.querySelector('input[name="service"]:checked').value;
  if (selectedService === 'osaurus') {
    fetchOsaurusModels();
  }
});

// Pills management
addPillBtn.addEventListener('click', openAddPillModal);
resetPillsBtn.addEventListener('click', resetPillsToDefaults);
closeModal.addEventListener('click', closeModalWindow);
cancelPillBtn.addEventListener('click', closeModalWindow);
savePillBtn.addEventListener('click', savePill);

// Close modal when clicking outside
pillModal.addEventListener('click', (e) => {
  if (e.target === pillModal) {
    closeModalWindow();
  }
});

// ==================== INITIALIZATION ====================

loadSettings();
updateSections();
loadPills();
