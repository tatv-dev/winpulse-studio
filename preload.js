const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getStats: () => ipcRenderer.invoke('get-stats'),
  recordPaste: () => ipcRenderer.invoke('record-paste'),
  recordMouse: (type) => ipcRenderer.invoke('record-mouse', type),
  resetToday: () => ipcRenderer.invoke('reset-today'),
  getDataPath: () => ipcRenderer.invoke('get-data-path'),
  onStatsUpdate: (cb) => ipcRenderer.on('stats-update', (_e, data) => cb(data)),
  
  // Auto Clicker APIs
  startAutoClick: (options) => ipcRenderer.invoke('start-autoclick', options),
  stopAutoClick: () => ipcRenderer.invoke('stop-autoclick'),
  getAutoClickStatus: () => ipcRenderer.invoke('get-autoclick-status'),
  getAutoClickHotkey: () => ipcRenderer.invoke('get-autoclick-hotkey'),
  setAutoClickHotkey: (key) => ipcRenderer.invoke('set-autoclick-hotkey', key),
  onAutoClickStatus: (cb) => ipcRenderer.on('autoclick-status', (_e, data) => cb(data)),
  onTriggerAutoClickToggle: (cb) => ipcRenderer.on('trigger-autoclick-toggle', () => cb()),
  getCursorPos: () => ipcRenderer.invoke('get-cursor-pos'),
  onTriggerPickCoord: (cb) => ipcRenderer.on('trigger-pick-coord', (_e, pos) => cb(pos)),

  // Auto Start & Export APIs
  getAutoStart: () => ipcRenderer.invoke('get-auto-start'),
  setAutoStart: (enable) => ipcRenderer.invoke('set-auto-start', enable),
  getMinimizeToTray: () => ipcRenderer.invoke('get-minimize-to-tray'),
  setMinimizeToTray: (enable) => ipcRenderer.invoke('set-minimize-to-tray', enable),
  openDataFolder: () => ipcRenderer.invoke('open-data-folder'),
  exportData: (format) => ipcRenderer.invoke('export-data', format),

  windowMinimize: () => ipcRenderer.send('window-minimize'),
  windowMaximize: () => ipcRenderer.send('window-maximize'),
  windowClose: () => ipcRenderer.send('window-close'),
  windowQuit: () => ipcRenderer.send('window-quit'),
});

