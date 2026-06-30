const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs').promises;

let mainWindow;
const historyPath = path.join(__dirname, 'history.json');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 750,
    minWidth: 850,
    minHeight: 650,
    show: false,
    backgroundColor: '#070714',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile('index.html');

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC Handlers

// 1. Check if Ollama is running
ipcMain.handle('check-ollama', async () => {
  try {
    const res = await fetch('http://127.0.0.1:11434/api/tags', { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch (e) {
    return false;
  }
});

// 2. Start Ollama
ipcMain.handle('start-ollama', async () => {
  return new Promise((resolve) => {
    if (process.platform === 'darwin') {
      exec('open -a Ollama', (err) => {
        if (err) {
          console.error('Failed to open Ollama app:', err);
          exec('ollama serve &', (err2) => {
            resolve(!err2);
          });
        } else {
          resolve(true);
        }
      });
    } else {
      const cmd = process.platform === 'win32' ? 'start ollama serve' : 'ollama serve &';
      exec(cmd, (err) => {
        resolve(!err);
      });
    }
  });
});

// 3. Fetch installed Ollama models
ipcMain.handle('get-models', async () => {
  try {
    const res = await fetch('http://127.0.0.1:11434/api/tags', { signal: AbortSignal.timeout(2000) });
    if (res.ok) {
      const data = await res.json();
      if (data.models && Array.isArray(data.models)) {
        return data.models.map(m => m.name);
      }
    }
    return [];
  } catch (e) {
    console.error('Error fetching models:', e);
    return [];
  }
});

// 4. Load Chat History
ipcMain.handle('load-history', async () => {
  try {
    await fs.access(historyPath);
    const data = await fs.readFile(historyPath, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
});

// 5. Save Chat History
ipcMain.handle('save-history', async (event, historyData) => {
  try {
    await fs.writeFile(historyPath, JSON.stringify(historyData, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('Failed to save history:', e);
    return false;
  }
});

// 6. Translate Prompt (JSON output, mode-specific)
ipcMain.handle('translate', async (event, { prompt, model, promptType }) => {
  // 1. Define prompts based on type (Image vs. Text/Code)
  const imageSystemPrompt = `
You are an expert English translator and prompt engineer specialized in text-to-image AI systems (such as Midjourney, Stable Diffusion, and DALL-E).
Your job is to translate Persian prompts into highly optimized English descriptive prompts.

Guidelines for Image Mode:
- Translate all core nouns, adjectives, and settings accurately. Do not omit any elements of the scene.
- Convert instructions into rich, descriptive, and comma-separated tags instead of long narrative conversational sentences. E.g., instead of "I want you to paint a picture of a cat...", use "A detailed digital painting of a cat...".
- Append professional design, styling, camera/lens, lighting, or resolution modifiers where relevant to enhance visual quality (e.g. "detailed painting", "cinematic lighting", "8k", "artstation style").
- Ensure NO hallucinations. Do not introduce requirements or elements not requested in the Persian text.

Translation Hints & Glossary for Persian to English (MUST USE):
- "الاما" -> "Ollama" (the local LLM server/application).
- "الاما بسته بود" -> "Ollama was closed / not running".
- "پرامپت" -> "prompt".
- "لوکال" -> "local / offline".
- "شیک" -> "elegant / stylish / chic".
- "کدنویسی" -> "coding".
- "بسته بودن سرویس" -> "closed / not running / offline".

You MUST respond ONLY with a valid JSON object matching this schema:
{
  "englishPrompt": "The optimized English image prompt (comma-separated descriptive words and phrases)"
}

Ensure the JSON is valid and written in UTF-8. Do not add markdown backticks (like \`\`\`json) in the response. Only output raw JSON.
`;

  const textSystemPrompt = `
You are a strict, literal, and highly precise Persian to English translator. Your sole purpose is to translate the user's Persian text into English with 100% fidelity.

CRITICAL INSTRUCTIONS - READ CAREFULLY:
1. TRANSLATE EVERY SINGLE DETAIL: Do NOT summarize. Do NOT skip any sentence, idea, constraint, or feature. Every single requirement mentioned in the Persian text MUST exist in your English translation.
2. PRESERVE THE EXACT TONE & PERSON: If the user writes in the first person (e.g., "I want..."), translate it as "I want...". Do not change it to a command (e.g., "Create...").
3. DO NOT ACT AS AN AI ASSISTANT: Do NOT answer the user's prompt. You are only a translator.
4. NO HALLUCINATIONS: Do not add anything that was not in the original text.

Example:
User: میخوام یه اپ تحت دسکتاپ برام بنویسی که فک کنم بهترین گزینه با الکترون باشه میخوام پرامپت فارسیمو بهش بدم و به انگلیسی تبدیل کنه کاملا میخوام لوکال باشه روی سیستم ollama دارم و فک کنم با همون بشه کارو انجام داد یا اگه ایده دیگه داری بگو خیلی ساده باشه ولی شیک و حرفه ای باشه یسری چیزارو هم رعایت کن مثلا اگه الاما بسته بود خودت باز کنی یا چیز های دیگه که لازمه
Translation: I want you to write a desktop app for me, which I think Electron would be the best option for. I want to give it my Persian prompt and have it converted to English. I want it to be completely local. I have Ollama on my system and I think it can be done with that, or if you have any other ideas, tell me. It should be very simple but elegant and professional. Also, observe some things, for example, if Ollama is closed, open it yourself, or other necessary things.

You MUST respond ONLY with a valid JSON object matching this schema:
{
  "englishPrompt": "The FULL, complete, and exact English translation of the Persian text without omitting any detail."
}
`;

  const systemPrompt = promptType === 'image' ? imageSystemPrompt : textSystemPrompt;

  try {
    const response = await fetch('http://127.0.0.1:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model || 'llama3.2:3b',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        format: 'json',
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama returned status ${response.status}`);
    }

    const data = await response.json();
    const contentText = data.message?.content;

    if (!contentText) {
      throw new Error("Empty response from Ollama");
    }

    let cleanedText = contentText.trim();
    if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```(json)?/, '');
      cleanedText = cleanedText.replace(/```$/, '');
      cleanedText = cleanedText.trim();
    }

    const parsedJSON = JSON.parse(cleanedText);
    return { success: true, data: parsedJSON };
  } catch (err) {
    console.error('Translation error:', err);
    return { success: false, error: err.message };
  }
});
