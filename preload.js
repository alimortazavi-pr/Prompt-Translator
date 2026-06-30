const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  checkOllama: () => ipcRenderer.invoke('check-ollama'),
  startOllama: () => ipcRenderer.invoke('start-ollama'),
  getModels: () => ipcRenderer.invoke('get-models'),
  translate: (data) => ipcRenderer.invoke('translate', data),
  loadHistory: () => ipcRenderer.invoke('load-history'),
  saveHistory: (historyData) => ipcRenderer.invoke('save-history', historyData)
});
