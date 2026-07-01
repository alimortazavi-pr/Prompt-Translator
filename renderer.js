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
const directionSelect = document.getElementById('direction-select');
const ollamaModelContainer = document.getElementById('ollama-model-container');
const statusContainer = document.querySelector('.status-container');

// State Variables
let isOllamaOnline = false;
let installedModels = [];
let history = [];
let activeChatId = null;
let activePromptType = 'text';
let activeEngine = 'google';
let activeDirection = 'fa-to-en';

// Persian digit formatter
const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
function toPersianDigits(num) {
  return num.toString().replace(/\d/g, x => persianDigits[x]);
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

// ─── Engine & UI State ───────────────────────────────────────────────────────

function updateInputState() {
  const hasText = chatInput.value.trim().length > 0;
  if (activeEngine === 'google') {
    // Google mode: only need text to send
    btnSend.disabled = !hasText;
  } else {
    // Ollama mode: need online + text + a selected model
    const hasModel = modelSelect.value !== '';
    btnSend.disabled = !(isOllamaOnline && hasText && hasModel);
  }
}

function applyEngineUI() {
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
  updateInputState();
}

engineSelect.addEventListener('change', (e) => {
  activeEngine = e.target.value;
  applyEngineUI();
});

directionSelect.addEventListener('change', (e) => {
  activeDirection = e.target.value;
  if (activeDirection === 'fa-to-en') {
    chatInput.placeholder = 'پرامپت خود را به فارسی بنویسید... (مثلا: پیاده‌سازی چک کردن وضعیت پورت در نودجی‌اس)';
    chatInput.style.direction = 'rtl';
    chatInput.style.textAlign = 'right';
  } else {
    chatInput.placeholder = 'Write your prompt in English... (e.g., Implement port status check in Node.js)';
    chatInput.style.direction = 'ltr';
    chatInput.style.textAlign = 'left';
  }
});

// ─── Ollama Status & Models ──────────────────────────────────────────────────

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

  const preferredModel = models.find(m => m.startsWith('llama3.2:3b')) ||
                         models.find(m => m.startsWith('llama3.2')) ||
                         models.find(m => m.includes('qwen')) ||
                         models[0];

  if (preferredModel) {
    modelSelect.value = preferredModel;
  }

  updateInputState();
}

// ─── History Management ──────────────────────────────────────────────────────

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

  document.querySelectorAll('.history-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.closest('.btn-delete-history')) return;
      selectChat(item.getAttribute('data-id'));
    });
  });

  document.querySelectorAll('.btn-delete-history').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteChat(btn.getAttribute('data-id'));
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
  setPromptType('text');
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

// ─── Prompt Type ─────────────────────────────────────────────────────────────

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

// ─── Render Messages ─────────────────────────────────────────────────────────

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
          <div class="response-card">
            <div class="card-title-row">
              <div class="card-title-text">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                <span>Prompt Translation</span>
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
              setTimeout(() => { copyBtn.innerHTML = originalContent; }, 2000);
            });
          });
        }
      }, 0);
    }

    messagesList.appendChild(item);
  });

  chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
}

// ─── Send Message ─────────────────────────────────────────────────────────────

async function sendMessage() {
  const text = chatInput.value.trim();

  // Guard: need text; in Ollama mode also need online status + model
  if (!text) return;
  if (activeEngine === 'ollama' && (!isOllamaOnline || !modelSelect.value)) return;

  const selectedModel = activeEngine === 'ollama' ? modelSelect.value : '';

  chatInput.value = '';
  updateInputCharCount();
  welcomeScreen.classList.add('hidden');

  if (activeChatId === null) {
    activeChatId = 'chat_' + Date.now();
    const chatTitle = text.length > 25 ? text.substring(0, 25) + '...' : text;
    history.unshift({
      id: activeChatId,
      title: chatTitle,
      type: activePromptType,
      timestamp: new Date().toISOString(),
      messages: []
    });
    renderSidebar();
  }

  const activeChat = history.find(c => c.id === activeChatId);
  if (!activeChat) return;

  activeChat.messages.push({ role: 'user', content: text });
  renderMessages(activeChat.messages);

  // Skeleton loader
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

  chatInput.disabled = true;
  btnSend.disabled = true;

  const result = await window.api.translate({
    prompt: text,
    model: selectedModel,
    promptType: activePromptType,
    engine: activeEngine,
    direction: activeDirection
  });

  const tempLoader = document.querySelector('.temp-loader');
  if (tempLoader) tempLoader.remove();

  chatInput.disabled = false;
  chatInput.focus();
  updateInputState();

  if (result.success) {
    activeChat.messages.push({ role: 'assistant', content: result.data });
  } else {
    activeChat.messages.push({
      role: 'assistant',
      content: { englishPrompt: `خطا: ${result.error}` }
    });
  }

  renderMessages(activeChat.messages);
  saveHistoryToDisk();
}

// ─── Input Helpers ────────────────────────────────────────────────────────────

function updateInputCharCount() {
  const count = chatInput.value.length;
  inputCharCount.textContent = `${toPersianDigits(count)} کاراکتر`;
  updateInputState();
}

chatInput.addEventListener('input', updateInputCharCount);

btnSend.addEventListener('click', sendMessage);

chatInput.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    e.preventDefault();
    if (!btnSend.disabled) sendMessage();
  }
});

btnNewChat.addEventListener('click', createNewChat);
btnRefreshStatus.addEventListener('click', () => checkOllamaStatus(false));
btnStartOllama.addEventListener('click', () => checkOllamaStatus(true));

btnToggleSidebar.addEventListener('click', () => {
  sidebar.classList.toggle('collapsed');
});

// Suggested Cards
document.querySelectorAll('.suggest-card').forEach(card => {
  card.addEventListener('click', () => {
    const prompt = card.getAttribute('data-prompt');
    const type = card.getAttribute('data-type') || 'text';
    setPromptType(type);
    chatInput.value = prompt;
    chatInput.focus();
    updateInputCharCount();
  });
});

// ─── Word Tooltip Translation ─────────────────────────────────────────────────

const tooltip = document.getElementById('translation-tooltip');
let tooltipTimer = null;

function showTooltip(x, y, html) {
  tooltip.innerHTML = html;
  tooltip.style.left = `${x + 12}px`;
  tooltip.style.top = `${y + 12}px`;
  tooltip.style.display = 'block';
}

function hideTooltip() {
  tooltip.style.display = 'none';
  tooltip.innerHTML = '';
  if (tooltipTimer) {
    clearTimeout(tooltipTimer);
    tooltipTimer = null;
  }
}

const spinnerHtml = `<div class="spinner" style="width:16px;height:16px;border:2px solid var(--text-muted);border-top-color:var(--primary-color);border-radius:50%;animation:spin 0.8s linear infinite;"></div>`;

if (!document.getElementById('spinner-keyframes')) {
  const style = document.createElement('style');
  style.id = 'spinner-keyframes';
  style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
  document.head.appendChild(style);
}

document.addEventListener('mouseup', async (e) => {
  const sel = window.getSelection();
  const text = sel ? sel.toString().trim() : '';
  if (!text || /\s/.test(text)) return; // single word only

  // Tooltip always translates in the OPPOSITE direction of main mode
  // fa-to-en main → tooltip shows Persian meaning of English word (en-to-fa)
  // en-to-fa main → tooltip shows English meaning of Persian word (fa-to-en)
  const tooltipDirection = activeDirection === 'fa-to-en' ? 'en-to-fa' : 'fa-to-en';

  showTooltip(e.pageX, e.pageY, spinnerHtml);

  try {
    const result = await window.api.translate({
      prompt: text,
      model: modelSelect.value || '',
      promptType: 'text',
      engine: activeEngine,
      direction: tooltipDirection,
    });
    if (result.success) {
      const translated = typeof result.data === 'object' ? result.data.englishPrompt : result.data;
      const isRtl = tooltipDirection === 'fa-to-en' ? false : true;
      showTooltip(e.pageX, e.pageY, `<span style="direction:${isRtl ? 'rtl' : 'ltr'};">${escapeHTML(translated)}</span>`);
    } else {
      showTooltip(e.pageX, e.pageY, `<span style="color:var(--status-offline);">❌ ترجمه نشد</span>`);
    }
  } catch (err) {
    showTooltip(e.pageX, e.pageY, `<span style="color:var(--status-offline);">❌ خطا</span>`);
  }
});

document.addEventListener('click', (e) => {
  if (!tooltip.contains(e.target)) hideTooltip();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') hideTooltip();
});

// ─── App Startup ──────────────────────────────────────────────────────────────
// DOM is already ready (script is at end of body), call init directly
applyEngineUI();
loadHistoryFromDisk();
createNewChat();
