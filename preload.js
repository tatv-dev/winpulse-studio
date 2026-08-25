const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getStats: () => ipcRenderer.invoke('get-stats'),
  recordPaste: () => ipcRenderer.invoke('record-paste'),
  recordMouse: (type) => ipcRenderer.invoke('record-mouse', type),
  resetToday: () => ipcRenderer.invoke('reset-today'),
  getDataPath: () => ipcRenderer.invoke('get-data-path'),
  onStatsUpdate: (cb) => ipcRenderer.on('stats-update', (_e, data) => cb(data)),
  windowMinimize: () => ipcRenderer.send('window-minimize'),
  windowMaximize: () => ipcRenderer.send('window-maximize'),
  windowClose: () => ipcRenderer.send('window-close'),
  windowQuit: () => ipcRenderer.send('window-quit'),
});
