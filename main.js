const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, globalShortcut, clipboard, nativeTheme } = require('electron');
const path = require('path');
const fs = require('fs');

// ─── Data persistence ──────────────────────────────────────────────────────────
const DATA_DIR = path.join(app.getPath('userData'), 'count-tool');
const DATA_FILE = path.join(DATA_DIR, 'stats.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function loadData() {
  ensureDataDir();
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    }
  } catch (e) {}
  return {};
}

function saveData(data) {
  ensureDataDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function getOrCreateToday(data) {
  const key = getTodayKey();
  if (!data[key]) {
    data[key] = { copy: 0, paste: 0, date: key, sessions: [] };
  }
  return data[key];
}

// ─── State ─────────────────────────────────────────────────────────────────────
let mainWindow = null;
let tray = null;
let statsData = loadData();
let lastClipboardContent = '';
let clipboardPollInterval = null;

// ─── Clipboard polling (cross-platform) ───────────────────────────────────────
function startClipboardMonitor() {
  lastClipboardContent = clipboard.readText();

  clipboardPollInterval = setInterval(() => {
    const current = clipboard.readText();
    if (current !== lastClipboardContent && current.length > 0) {
      lastClipboardContent = current;
      recordCopy();
    }
  }, 500);
}

function stopClipboardMonitor() {
  if (clipboardPollInterval) {
    clearInterval(clipboardPollInterval);
    clipboardPollInterval = null;
  }
}

function recordCopy() {
  const today = getOrCreateToday(statsData);
  today.copy += 1;
  today.lastCopy = new Date().toISOString();
  saveData(statsData);
  broadcastStats();
}

function recordPaste() {
  const today = getOrCreateToday(statsData);
  today.paste += 1;
  today.lastPaste = new Date().toISOString();
  saveData(statsData);
  broadcastStats();
}

function broadcastStats() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('stats-update', buildStatsPayload());
  }
}

function buildStatsPayload() {
  const todayKey = getTodayKey();
  const today = statsData[todayKey] || { copy: 0, paste: 0, date: todayKey };
  // Build last 7 days history
  const history = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    history.push({ date: key, ...(statsData[key] || { copy: 0, paste: 0 }) });
  }
  return { today, history, allTime: computeAllTime() };
}

function computeAllTime() {
  let totalCopy = 0, totalPaste = 0;
  for (const day of Object.values(statsData)) {
    totalCopy += day.copy || 0;
    totalPaste += day.paste || 0;
  }
  return { copy: totalCopy, paste: totalPaste };
}

// ─── Window ────────────────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 620,
    minWidth: 780,
    minHeight: 520,
    frame: false,
    transparent: false,
    backgroundColor: '#f8fafc',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
    show: false,
    titleBarStyle: 'hidden',
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Dev tools in dev mode
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
}

// ─── Tray ──────────────────────────────────────────────────────────────────────
function createTray() {
  // Use a simple inline icon
  const iconPath = path.join(__dirname, 'assets', 'tray-icon.png');
  const icon = fs.existsSync(iconPath)
    ? nativeImage.createFromPath(iconPath)
    : nativeImage.createEmpty();

  tray = new Tray(icon.isEmpty() ? nativeImage.createFromDataURL(TRAY_ICON_DATA) : icon);
  tray.setToolTip('Count Tool');

  const menu = Menu.buildFromTemplate([
    { label: 'Mở Count Tool', click: () => { if (mainWindow) mainWindow.show(); else createWindow(); } },
    { type: 'separator' },
    { label: 'Thoát', click: () => app.quit() },
  ]);
  tray.setContextMenu(menu);
  tray.on('double-click', () => { if (mainWindow) mainWindow.show(); else createWindow(); });
}

// ─── IPC handlers ──────────────────────────────────────────────────────────────
ipcMain.handle('get-stats', () => buildStatsPayload());

ipcMain.handle('record-paste', () => {
  recordPaste();
  return buildStatsPayload();
});

ipcMain.handle('reset-today', () => {
  const key = getTodayKey();
  statsData[key] = { copy: 0, paste: 0, date: key };
  saveData(statsData);
  return buildStatsPayload();
});

ipcMain.handle('get-data-path', () => DATA_FILE);

ipcMain.on('window-minimize', () => mainWindow?.minimize());
ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize();
  else mainWindow?.maximize();
});
ipcMain.on('window-close', () => mainWindow?.hide());
ipcMain.on('window-quit', () => app.quit());

// ─── App lifecycle ─────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  nativeTheme.themeSource = 'light';
  createWindow();
  createTray();
  startClipboardMonitor();

  // Register global Ctrl+V shortcut to track paste
  globalShortcut.register('CommandOrControl+V', () => {
    recordPaste();
    // Let the OS handle actual paste
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  stopClipboardMonitor();
});

app.on('window-all-closed', (e) => {
  // Keep app alive in tray on Windows
  e.preventDefault();
});

app.on('activate', () => {
  if (!mainWindow) createWindow();
});

// Minimal base64 tray icon (16x16 transparent PNG)
const TRAY_ICON_DATA = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH4QUJCiozp5YUTQAAAB1pVFh0Q29tbWVudAAAAAAAQ3JlYXRlZCB3aXRoIEdJTVBkLmUHAAAA/UlEQVQ4y62TMUoDQRSGv5ndiLuaBBEPYGFhb2FhIXgAC8HKQ3gAL+AN7K0sLCwEwcLCzsJCsLCwEBTEJpvd2Z15FjOBkE02iX3w4DH/e+/NzBNG0g4RkQE4d851wB6okHQBzIEJcChJ0r3yfQS2gJOUcgww87kMWAN2ABFxBNwBD8AwpUzAGzABusAdcB8RJ8BrRCgAT8BbSsm/0Kd1MAIOQKH0XgAtwHREvAf2QFhSkwL3QBeqJoIELABWYAUwhOqoLgKANAAnFcCTxgAZwNcBQAD4AxAiAmFNgAZAHXgzgFcAk4vwBvgDEZQQwANw2AgQA6MBK4AuA6vAHNAB1ysgAAAABJRU5ErkJggg==';
