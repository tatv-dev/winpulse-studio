const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, globalShortcut, clipboard, nativeTheme } = require('electron');
const { uIOhook, UiohookKey } = require('uiohook-napi');
const path = require('path');
const fs = require('fs');

// ─── Data persistence ──────────────────────────────────────────────────────────
const DATA_DIR = path.join(app.getPath('userData'), 'winpulse');
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
    data[key] = {
      date: key,
      copy: 0,
      paste: 0,
      leftClick: 0,
      rightClick: 0,
      middleClick: 0,
      scroll: 0,
    };
  }
  // Ensure fields exist for backward compatibility
  data[key].copy = data[key].copy || 0;
  data[key].paste = data[key].paste || 0;
  data[key].leftClick = data[key].leftClick || 0;
  data[key].rightClick = data[key].rightClick || 0;
  data[key].middleClick = data[key].middleClick || 0;
  data[key].scroll = data[key].scroll || 0;
  return data[key];
}

// ─── State ─────────────────────────────────────────────────────────────────────
let mainWindow = null;
let tray = null;
let statsData = loadData();
let lastClipboardContent = '';
let clipboardPollInterval = null;
let ctrlPressed = false;

// ─── Passive Global Input Monitor (uiohook) ───────────────────────────────────
function setupGlobalInputHook() {
  uIOhook.on('keydown', (e) => {
    if (e.keycode === UiohookKey.Ctrl || e.keycode === UiohookKey.CtrlRight) {
      ctrlPressed = true;
    } else if (e.keycode === UiohookKey.V && ctrlPressed) {
      recordPaste();
    }
  });

  uIOhook.on('keyup', (e) => {
    if (e.keycode === UiohookKey.Ctrl || e.keycode === UiohookKey.CtrlRight) {
      ctrlPressed = false;
    }
  });

  try {
    uIOhook.start();
  } catch (err) {
    console.error('Failed to start uIOhook:', err);
  }
}

// ─── Clipboard polling ────────────────────────────────────────────────────────
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

function recordMouseAction(type) {
  const today = getOrCreateToday(statsData);
  if (type === 'left') {
    today.leftClick = (today.leftClick || 0) + 1;
    today.lastLeftClick = new Date().toISOString();
  } else if (type === 'right') {
    today.rightClick = (today.rightClick || 0) + 1;
    today.lastRightClick = new Date().toISOString();
  } else if (type === 'middle') {
    today.middleClick = (today.middleClick || 0) + 1;
    today.lastMiddleClick = new Date().toISOString();
  } else if (type === 'scroll') {
    today.scroll = (today.scroll || 0) + 1;
    today.lastScroll = new Date().toISOString();
  }
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
  const today = getOrCreateToday(statsData);
  
  // Build last 7 days history
  const history = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const dayData = statsData[key] || {};
    history.push({
      date: key,
      copy: dayData.copy || 0,
      paste: dayData.paste || 0,
      leftClick: dayData.leftClick || 0,
      rightClick: dayData.rightClick || 0,
      middleClick: dayData.middleClick || 0,
      scroll: dayData.scroll || 0,
    });
  }
  return { today, history, allTime: computeAllTime() };
}

function computeAllTime() {
  let totalCopy = 0, totalPaste = 0, totalLeft = 0, totalRight = 0, totalMiddle = 0, totalScroll = 0;
  for (const day of Object.values(statsData)) {
    totalCopy += day.copy || 0;
    totalPaste += day.paste || 0;
    totalLeft += day.leftClick || 0;
    totalRight += day.rightClick || 0;
    totalMiddle += day.middleClick || 0;
    totalScroll += day.scroll || 0;
  }
  return {
    copy: totalCopy,
    paste: totalPaste,
    leftClick: totalLeft,
    rightClick: totalRight,
    middleClick: totalMiddle,
    scroll: totalScroll,
    totalActions: totalCopy + totalPaste + totalLeft + totalRight + totalMiddle + totalScroll,
  };
}

// ─── Window ────────────────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 960,
    height: 660,
    minWidth: 840,
    minHeight: 560,
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

  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
}

// ─── Tray ──────────────────────────────────────────────────────────────────────
function createTray() {
  const iconPath = path.join(__dirname, 'assets', 'tray-icon.png');
  const icon = fs.existsSync(iconPath)
    ? nativeImage.createFromPath(iconPath)
    : nativeImage.createEmpty();

  tray = new Tray(icon.isEmpty() ? nativeImage.createFromDataURL(TRAY_ICON_DATA) : icon);
  tray.setToolTip('WinPulse - Thống kê & Thao tác Windows');

  const menu = Menu.buildFromTemplate([
    { label: 'Mở WinPulse', click: () => { if (mainWindow) mainWindow.show(); else createWindow(); } },
    { type: 'separator' },
    { label: 'Thoát', click: () => app.quit() },
  ]);
  tray.setContextMenu(menu);
  tray.on('double-click', () => { if (mainWindow) mainWindow.show(); else createWindow(); });
}

// ─── Auto Clicker Engine (Windows native via user32 mouse_event) ──────────────
let autoClickInterval = null;
let isAutoClicking = false;

// We use PowerShell with user32.dll mouse_event for ultra-fast native Windows mouse clicks
const { exec, spawn } = require('child_process');

function startNativeAutoClick(options) {
  if (isAutoClicking) return;
  const intervalMs = Math.max(Number(options.interval) || 100, 10);
  const clickType = options.clickType || 'left'; // 'left', 'right', 'middle', 'double'
  const repeatCount = Number(options.repeatCount) || 0; // 0 = infinite
  let executedCount = 0;

  isAutoClicking = true;
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('autoclick-status', { running: true, count: executedCount });
  }

  // Windows mouse_event flags:
  // LEFTDOWN = 0x02, LEFTUP = 0x04
  // RIGHTDOWN = 0x08, RIGHTUP = 0x10
  // MIDDLEDOWN = 0x20, MIDDLEUP = 0x40
  let dwFlags = '0x02, 0x04'; // default left
  if (clickType === 'right') dwFlags = '0x08, 0x10';
  else if (clickType === 'middle') dwFlags = '0x20, 0x40';

  const triggerClickScript = `
    Add-Type -MemberDefinition '[DllImport("user32.dll")] public static extern void mouse_event(int flags, int dx, int dy, int cButtons, int extraInfo);' -Name U32 -Namespace Win32;
    [Win32.U32]::mouse_event(${dwFlags.split(',')[0]}, 0, 0, 0, 0);
    [Win32.U32]::mouse_event(${dwFlags.split(',')[1]}, 0, 0, 0, 0);
  `;

  autoClickInterval = setInterval(() => {
    if (!isAutoClicking) return;

    // Send click event via PowerShell command inline
    exec(`powershell -NoProfile -NonInteractive -Command "${triggerClickScript.replace(/\n/g, ' ')}"`, (err) => {
      if (err) return;
    });

    // Record stats
    if (clickType === 'left' || clickType === 'double') recordMouseAction('left');
    else if (clickType === 'right') recordMouseAction('right');
    else if (clickType === 'middle') recordMouseAction('middle');

    executedCount++;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('autoclick-status', { running: true, count: executedCount });
    }

    if (repeatCount > 0 && executedCount >= repeatCount) {
      stopNativeAutoClick();
    }
  }, intervalMs);
}

function stopNativeAutoClick() {
  if (autoClickInterval) {
    clearInterval(autoClickInterval);
    autoClickInterval = null;
  }
  isAutoClicking = false;
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('autoclick-status', { running: false });
  }
}

// Global hotkey to toggle auto-clicker anywhere in Windows
let currentAutoClickHotkey = 'F6';

function registerAutoClickShortcut(newHotkey) {
  const hotkeyToRegister = newHotkey || currentAutoClickHotkey;
  try {
    if (globalShortcut.isRegistered(currentAutoClickHotkey)) {
      globalShortcut.unregister(currentAutoClickHotkey);
    }
    const success = globalShortcut.register(hotkeyToRegister, () => {
      if (isAutoClicking) {
        stopNativeAutoClick();
      } else {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('trigger-autoclick-toggle');
        }
      }
    });
    if (success) {
      currentAutoClickHotkey = hotkeyToRegister;
      return { success: true, hotkey: currentAutoClickHotkey };
    } else {
      // Re-register old hotkey if new fails
      globalShortcut.register(currentAutoClickHotkey, () => {
        if (isAutoClicking) stopNativeAutoClick();
        else if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('trigger-autoclick-toggle');
      });
      return { success: false, error: 'Không thể đăng ký phím tắt này (có thể bị xung đột với hệ điều hành)' };
    }
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ─── IPC handlers ──────────────────────────────────────────────────────────────
ipcMain.handle('get-stats', () => buildStatsPayload());

ipcMain.handle('record-paste', () => {
  recordPaste();
  return buildStatsPayload();
});

ipcMain.handle('record-mouse', (_e, type) => {
  recordMouseAction(type);
  return buildStatsPayload();
});

ipcMain.handle('start-autoclick', (_e, options) => {
  startNativeAutoClick(options);
  return { success: true };
});

ipcMain.handle('stop-autoclick', () => {
  stopNativeAutoClick();
  return { success: true };
});

ipcMain.handle('get-autoclick-status', () => {
  return { running: isAutoClicking, hotkey: currentAutoClickHotkey };
});

ipcMain.handle('get-autoclick-hotkey', () => {
  return currentAutoClickHotkey;
});

ipcMain.handle('set-autoclick-hotkey', (_e, key) => {
  return registerAutoClickShortcut(key);
});

ipcMain.handle('reset-today', () => {
  const key = getTodayKey();
  statsData[key] = {
    date: key,
    copy: 0,
    paste: 0,
    leftClick: 0,
    rightClick: 0,
    middleClick: 0,
    scroll: 0,
  };
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
  setupGlobalInputHook();
  registerAutoClickShortcut();
});

app.on('will-quit', () => {
  try {
    uIOhook.stop();
  } catch (e) {}
  globalShortcut.unregisterAll();
  stopClipboardMonitor();
});

app.on('window-all-closed', (e) => {
  e.preventDefault();
});

app.on('activate', () => {
  if (!mainWindow) createWindow();
});

// Minimal base64 tray icon
const TRAY_ICON_DATA = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH4QUJCiozp5YUTQAAAB1pVFh0Q29tbWVudAAAAAAAQ3JlYXRlZCB3aXRoIEdJTVBkLmUHAAAA/UlEQVQ4y62TMUoDQRSGv5ndiLuaBBEPYGFhb2FhIXgAC8HKQ3gAL+AN7K0sLCwEwcLCzsJCsLCwEBTEJpvd2Z15FjOBkE02iX3w4DH/e+/NzBNG0g4RkQE4d851wB6okHQBzIEJcChJ0r3yfQS2gJOUcgww87kMWAN2ABFxBNwBD8AwpUzAGzABusAdcB8RJ8BrRCgAT8BbSsm/0Kd1MAIOQKH0XgAtwHREvAf2QFhSkwL3QBeqJoIELABWYAUwhOqoLgKANAAnFcCTxgAZwNcBQAD4AxAiAmFNgAZAHXgzgFcAk4vwBvgDEZQQwANw2AgQA6MBK4AuA6vAHNAB1ysgAAAABJRU5ErkJggg==';
