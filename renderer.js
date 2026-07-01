// DOM Elements
const sidebar = document.getElementById('sidebar');
const btnToggleSidebar = document.getElementById('btn-toggle-sidebar');
const btnNewChat = document.getElementById('btn-new-chat');
const historyList = document.getElementById('history-list');

const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');
const btnStartOllama = document.getElementById('btn-start-ollama');
const btnRefreshStatus = document.getElementById('btn-refresh-status');
const modelSelect = document.getElementById('model-select');

const welcomeScreen = document.getElementById('welcome-screen');
const chatMessagesContainer = document.getElementById('chat-messages-container');
const messagesList = document.getElementById('messages-list');

const chatInput = document.getElementById('chat-input');
const btnSend = document.getElementById('btn-send');
const inputCharCount = document.getElementById('input-char-count');

// Prompt Type Elements
const btnTypeText = document.getElementById('btn-type-text');
const btnTypeImage = document.getElementById('btn-type-image');

// Engine Elements
const engineSelect = document.getElementById('engine-select');
const ollamaModelContainer = document.getElementById('ollama-model-container');
const statusContainer = document.querySelector('.status-container');

// State Variables
let isOllamaOnline = false;
let installedModels = [];
let history = [];
let activeChatId = null;
let activePromptType = 'text'; // Default to text/code mode
let activeEngine = 'google'; // Default to Google Translate

// Handle Engine Change
engineSelect.addEventListener('change', (e) => {
  activeEngine = e.target.value;
  if (activeEngine === 'google') {
    ollamaModelContainer.style.display = 'none';
    btnStartOllama.classList.add('hidden');
    statusContainer.style.display = 'none';
    btnRefreshStatus.style.display = 'none';
  } else {
    ollamaModelContainer.style.display = 'block';
    statusContainer.style.display = 'flex';
    btnRefreshStatus.style.display = 'inline-flex';
    checkOllamaStatus(false);
  }
});
// Initialize display
engineSelect.dispatchEvent(new Event('change'));

// Persian digit formatter
const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
function toPersianDigits(num) {
  return num.toString().replace(/\d/g, x => persianDigits[x]);
}

// 1. Connection & Model Checking
async function checkOllamaStatus(autoStart = false) {
  statusText.textContent = 'در حال بررسی Ollama...';
  statusDot.className = 'status-dot';
  
  const online = await window.api.checkOllama();
  isOllamaOnline = online;

  if (online) {
    statusDot.className = 'status-dot online';
    statusText.textContent = 'سرویس Ollama متصل است';
    btnStartOllama.classList.add('hidden');
    await loadModels();
  } else {
    statusDot.className = 'status-dot';
    
    if (autoStart) {
      statusText.textContent = 'در حال باز کردن خودکار Ollama...';
      const started = await window.api.startOllama();
      if (started) {
        setTimeout(async () => {
          await checkOllamaStatus(false);
        }, 4000);
        return;
      }
    }
    
    statusText.textContent = 'سرویس Ollama بسته است';
    btnStartOllama.classList.remove('hidden');
    modelSelect.innerHTML = '<option value="">Ollama قطع است</option>';
    updateInputState();
  }
}

async function loadModels() {
  const models = await window.api.getModels();
  installedModels = models;
  
  if (models.length === 0) {
    modelSelect.innerHTML = '<option value="">هیچ مدلی یافت نشد! ابتدا مدل دانلود کنید</option>';
    updateInputState();
    return;
  }

  modelSelect.innerHTML = models.map(model => 
    `<option value="${model}">${model}</option>`
  ).join('');

  // Default Selection Logic
  const preferredModel = models.find(m => m.startsWith('llama3.2:3b')) ||
                          models.find(m => m.startsWith('llama3.2')) ||
                          models.find(m => m.includes('qwen')) ||
                          models[0];
                          
  if (preferredModel) {
    modelSelect.value = preferredModel;
  }
  
  updateInputState();
}

function updateInputState() {
  const hasText = chatInput.value.trim().length > 0;
  const hasModel = modelSelect.value !== '';
  btnSend.disabled = !(isOllamaOnline && hasText && hasModel);
}

// 2. Local File History Management
async function loadHistoryFromDisk() {
  history = await window.api.loadHistory();
  renderSidebar();
}

async function saveHistoryToDisk() {
  await window.api.saveHistory(history);
  renderSidebar();
}

function renderSidebar() {
  if (history.length === 0) {
    historyList.innerHTML = '<div class="history-empty">تاریخچه‌ای وجود ندارد</div>';
    return;
  }

  historyList.innerHTML = history.map(chat => {
    const isActive = chat.id === activeChatId ? 'active' : '';
    return `
      <div class="history-item ${isActive}" data-id="${chat.id}">
        <div class="history-item-content">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          <span class="history-item-title">${escapeHTML(chat.title)}</span>
        </div>
        <button class="btn-delete-history" data-id="${chat.id}" title="حذف گفتگو">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>
    `;
  }).join('');

  // Attach Sidebar Click Listeners
  document.querySelectorAll('.history-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.closest('.btn-delete-history')) return;
      const chatId = item.getAttribute('data-id');
      selectChat(chatId);
    });
  });

  // Attach Sidebar Delete Listeners
  document.querySelectorAll('.btn-delete-history').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const chatId = btn.getAttribute('data-id');
      deleteChat(chatId);
    });
  });
}

function selectChat(chatId) {
  activeChatId = chatId;
  renderSidebar();
  
  const activeChat = history.find(c => c.id === chatId);
  if (!activeChat || activeChat.messages.length === 0) {
    messagesList.innerHTML = '';
    welcomeScreen.classList.remove('hidden');
  } else {
    welcomeScreen.classList.add('hidden');
    // Restore Prompt Type toggle state
    setPromptType(activeChat.type || 'text');
    renderMessages(activeChat.messages);
  }
}

function createNewChat() {
  activeChatId = null;
  renderSidebar();
  messagesList.innerHTML = '';
  welcomeScreen.classList.remove('hidden');
  chatInput.value = '';
  chatInput.focus();
  setPromptType('text'); // Reset to default mode
  updateInputCharCount();
}

function deleteChat(chatId) {
  history = history.filter(c => c.id !== chatId);
  if (activeChatId === chatId) {
    activeChatId = null;
    messagesList.innerHTML = '';
    welcomeScreen.classList.remove('hidden');
  }
  saveHistoryToDisk();
}

// Manage Prompt Type Selector
function setPromptType(type) {
  activePromptType = type;
  if (type === 'image') {
    btnTypeImage.classList.add('active');
    btnTypeText.classList.remove('active');
  } else {
    btnTypeText.classList.add('active');
    btnTypeImage.classList.remove('active');
  }
}

btnTypeText.addEventListener('click', () => setPromptType('text'));
btnTypeImage.addEventListener('click', () => setPromptType('image'));

// 3. Render Message Bubbles & Cards
function renderMessages(messages) {
  messagesList.innerHTML = '';

  messages.forEach(msg => {
    const item = document.createElement('div');
    
    if (msg.role === 'user') {
      item.className = 'message-item user';
      item.innerHTML = `<div class="user-bubble">${escapeHTML(msg.content)}</div>`;
    } else if (msg.role === 'assistant') {
      item.className = 'message-item assistant';
      
      const content = msg.content;
      
      const copyBtnId = `copy-btn-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      item.innerHTML = `
        <div class="assistant-response-wrapper">
          <!-- Translation Card -->
          <div class="response-card">
            <div class="card-title-row">
              <div class="card-title-text">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                <span>English Prompt Translation</span>
              </div>
              <button id="${copyBtnId}" class="btn-icon-text btn-copy-prompt no-drag" dir="ltr">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                <span>Copy</span>
              </button>
            </div>
            <div class="translation-content-box">${escapeHTML(content.englishPrompt)}</div>
          </div>
        </div>
      `;

      setTimeout(() => {
        const copyBtn = document.getElementById(copyBtnId);
        if (copyBtn) {
          copyBtn.addEventListener('click', () => {
            const originalContent = copyBtn.innerHTML;
            navigator.clipboard.writeText(content.englishPrompt).then(() => {
              copyBtn.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                <span style="color: #10b981;">Copied!</span>
              `;
              setTimeout(() => {
                copyBtn.innerHTML = originalContent;
              }, 2000);
            });
          });
        }
      }, 0);
    }
    
    messagesList.appendChild(item);
  });

  chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
}

// 4. Send Message & Run Local AI Translation
async function sendMessage() {
  const text = chatInput.value.trim();
  const selectedModel = modelSelect.value;

  if (!text || !selectedModel || !isOllamaOnline) return;

  // Clear input area immediately
  chatInput.value = '';
  updateInputCharCount();
  welcomeScreen.classList.add('hidden');

  // Handle New Chat Generation
  if (activeChatId === null) {
    activeChatId = 'chat_' + Date.now();
    const chatTitle = text.length > 25 ? text.substring(0, 25) + '...' : text;
    history.unshift({
      id: activeChatId,
      title: chatTitle,
      type: activePromptType, // Save active prompt type for restoration
      timestamp: new Date().toISOString(),
      messages: []
    });
    renderSidebar();
  }

  const activeChat = history.find(c => c.id === activeChatId);
  if (!activeChat) return;

  // Append user message
  activeChat.messages.push({ role: 'user', content: text });
  renderMessages(activeChat.messages);

  // Append temporary Shimmer skeleton loader
  const skeleton = document.createElement('div');
  skeleton.className = 'message-item assistant temp-loader';
  skeleton.innerHTML = `
    <div class="assistant-response-wrapper">
      <div class="skeleton-card">
        <div class="skeleton-shimmer skeleton-title"></div>
        <div class="skeleton-shimmer skeleton-box"></div>
      </div>
      <div class="skeleton-card">
        <div class="skeleton-shimmer skeleton-title"></div>
        <div class="skeleton-shimmer skeleton-line"></div>
        <div class="skeleton-shimmer skeleton-line short"></div>
      </div>
    </div>
  `;
  messagesList.appendChild(skeleton);
  chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;

  // Disable inputs while generating
  chatInput.disabled = true;
  btnSend.disabled = true;

  // Call main IPC translate
  const result = await window.api.translate({
    prompt: text,
    model: selectedModel,
    promptType: activePromptType, // Send active prompt type to backend
    engine: activeEngine // Send selected engine
  });

  // Remove skeleton loader
  const tempLoader = document.querySelector('.temp-loader');
  if (tempLoader) tempLoader.remove();

  // Re-enable inputs
  chatInput.disabled = false;
  chatInput.focus();
  updateInputState();

  if (result.success) {
    activeChat.messages.push({ role: 'assistant', content: result.data });
  } else {
    // Generate clean looking error structure
    activeChat.messages.push({
      role: 'assistant',
      content: {
        englishPrompt: `خطا در ارتباط با مدل: ${result.error}`
      }
    });
  }

  // Refresh messages rendering and save updated history
  renderMessages(activeChat.messages);
  saveHistoryToDisk();
}

// Helper: escape HTML
function escapeHTML(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// 5. General Helpers & Event Listeners
function updateInputCharCount() {
  const count = chatInput.value.length;
  inputCharCount.textContent = `${toPersianDigits(count)} کاراکتر`;
  updateInputState();
}

chatInput.addEventListener('input', updateInputCharCount);

btnSend.addEventListener('click', sendMessage);

// Send message via Cmd+Enter or Ctrl+Enter
chatInput.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    e.preventDefault();
    if (!btnSend.disabled) {
      sendMessage();
    }
  }
});

btnNewChat.addEventListener('click', createNewChat);

btnRefreshStatus.addEventListener('click', () => {
  checkOllamaStatus(false);
});

btnStartOllama.addEventListener('click', () => {
  checkOllamaStatus(true);
});

// Collapsible Sidebar
btnToggleSidebar.addEventListener('click', () => {
  sidebar.classList.toggle('collapsed');
});

// Suggested Cards click action
document.querySelectorAll('.suggest-card').forEach(card => {
  card.addEventListener('click', () => {
    const prompt = card.getAttribute('data-prompt');
    const type = card.getAttribute('data-type') || 'text';
    
    // Automatically set the prompt type of suggestions
    setPromptType(type);
    
    chatInput.value = prompt;
    chatInput.focus();
    updateInputCharCount();
  });
});

// App Startup
document.addEventListener('DOMContentLoaded', () => {
  checkOllamaStatus(true);
  loadHistoryFromDisk();
  createNewChat();
});
