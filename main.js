const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, globalShortcut, clipboard, nativeTheme, dialog, screen, shell } = require('electron');
const { uIOhook, UiohookKey } = require('uiohook-napi');
const path = require('path');
const fs = require('fs');

// ─── Single Instance Lock ─────────────────────────────────────────────────────
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// ─── Set App Identity on Windows ──────────────────────────────────────────────
app.name = 'WinPulse Studio';
if (process.platform === 'win32') {
  app.setAppUserModelId('com.tatv.winpulse');
}

// ─── Data persistence ──────────────────────────────────────────────────────────
const DATA_DIR = path.join(app.getPath('userData'), 'winpulse');
const DATA_FILE = path.join(DATA_DIR, 'stats.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadSettings() {
  ensureDataDir();
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
    }
  } catch (e) {}
  return { minimizeToTray: true };
}

function saveSettings(settings) {
  ensureDataDir();
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
}

let appSettings = loadSettings();

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
      distancePx: 0,
      distanceMeters: 0,
    };
  }
  // Ensure fields exist for backward compatibility
  data[key].copy = data[key].copy || 0;
  data[key].paste = data[key].paste || 0;
  data[key].leftClick = data[key].leftClick || 0;
  data[key].rightClick = data[key].rightClick || 0;
  data[key].middleClick = data[key].middleClick || 0;
  data[key].scroll = data[key].scroll || 0;
  data[key].distancePx = data[key].distancePx || 0;
  data[key].distanceMeters = data[key].distanceMeters || 0;
  return data[key];
}

// ─── State ─────────────────────────────────────────────────────────────────────
let mainWindow = null;
let tray = null;
let statsData = loadData();
let lastClipboardContent = '';
let clipboardPollInterval = null;
let ctrlPressed = false;

// Mouse distance tracking state
let lastMouseX = null;
let lastMouseY = null;
let mouseDistanceBatchPx = 0;
let lastDistanceSaveTime = Date.now();
const METERS_PER_PIXEL = 0.0002645833; // standard ~96 DPI (1px ≈ 0.26458 mm)

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

  // Global mouse move for distance tracking
  uIOhook.on('mousemove', (e) => {
    if (lastMouseX !== null && lastMouseY !== null) {
      const dx = e.x - lastMouseX;
      const dy = e.y - lastMouseY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      // Filter out spurious jumps/disconnects (> 3000px in 1 event)
      if (dist > 0 && dist < 3000) {
        mouseDistanceBatchPx += dist;
      }
    }
    lastMouseX = e.x;
    lastMouseY = e.y;

    // Batch distance flush every 1 second to avoid excessive disk I/O
    const now = Date.now();
    if (now - lastDistanceSaveTime > 1000 && mouseDistanceBatchPx > 0) {
      recordMouseDistance(mouseDistanceBatchPx);
      mouseDistanceBatchPx = 0;
      lastDistanceSaveTime = now;
    }
  });

  try {
    uIOhook.start();
  } catch (err) {
    console.error('Failed to start uIOhook:', err);
  }
}

function recordMouseDistance(px) {
  const today = getOrCreateToday(statsData);
  today.distancePx = Math.round((today.distancePx || 0) + px);
  today.distanceMeters = Number(((today.distancePx || 0) * METERS_PER_PIXEL).toFixed(1));
  saveData(statsData);
  broadcastStats();
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
      distancePx: dayData.distancePx || 0,
      distanceMeters: dayData.distanceMeters || 0,
    });
  }
  return { today, history, allTime: computeAllTime() };
}

function computeAllTime() {
  let totalCopy = 0, totalPaste = 0, totalLeft = 0, totalRight = 0, totalMiddle = 0, totalScroll = 0, totalMeters = 0;
  for (const day of Object.values(statsData)) {
    totalCopy += day.copy || 0;
    totalPaste += day.paste || 0;
    totalLeft += day.leftClick || 0;
    totalRight += day.rightClick || 0;
    totalMiddle += day.middleClick || 0;
    totalScroll += day.scroll || 0;
    totalMeters += day.distanceMeters || 0;
  }
  return {
    copy: totalCopy,
    paste: totalPaste,
    leftClick: totalLeft,
    rightClick: totalRight,
    middleClick: totalMiddle,
    scroll: totalScroll,
    distanceMeters: Number(totalMeters.toFixed(1)),
    totalActions: totalCopy + totalPaste + totalLeft + totalRight + totalMiddle + totalScroll,
  };
}

// ─── Window ────────────────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 980,
    height: 690,
    minWidth: 860,
    minHeight: 580,
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

  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      if (appSettings.minimizeToTray) {
        e.preventDefault();
        mainWindow.hide();
        return false;
      } else {
        app.isQuitting = true;
        app.quit();
      }
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
}

// ─── Tray ──────────────────────────────────────────────────────────────────────
function getTrayIcon() {
  const iconPath = path.join(__dirname, 'assets', 'tray-icon.png');
  if (fs.existsSync(iconPath)) {
    return nativeImage.createFromPath(iconPath);
  }
  return nativeImage.createFromDataURL(TRAY_ICON_DATA);
}

function createTray() {
  try {
    const icon = getTrayIcon();
    tray = new Tray(icon);
    tray.setToolTip('WinPulse Studio');

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Mở WinPulse Studio',
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
          } else {
            createWindow();
          }
        }
      },
      { type: 'separator' },
      {
        label: 'Thoát',
        click: () => {
          app.isQuitting = true;
          app.quit();
        }
      }
    ]);

    tray.setContextMenu(contextMenu);

    tray.on('click', () => {
      if (!mainWindow) {
        createWindow();
      } else if (mainWindow.isVisible()) {
        if (mainWindow.isFocused()) {
          mainWindow.hide();
        } else {
          mainWindow.focus();
        }
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    });

    tray.on('double-click', () => {
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
      } else {
        createWindow();
      }
    });
  } catch (err) {
    console.error('Failed to create tray:', err);
  }
}

// ─── Auto Clicker Engine (Windows Native user32 mouse_event + SetCursorPos) ────
let autoClickTimeout = null;
let isAutoClicking = false;
const { exec } = require('child_process');

function startNativeAutoClick(options) {
  if (isAutoClicking) return;
  const baseInterval = Math.max(Number(options.interval) || 100, 10);
  const clickType = options.clickType || 'left'; // 'left', 'right', 'middle', 'double'
  const repeatCount = Number(options.repeatCount) || 0; // 0 = infinite
  const useFixedPos = !!options.useFixedPos;
  const posX = Number(options.posX) || 0;
  const posY = Number(options.posY) || 0;
  const useJitter = !!options.useJitter;
  let executedCount = 0;

  isAutoClicking = true;
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('autoclick-status', { running: true, count: executedCount });
  }

  // Windows mouse_event flags:
  // LEFTDOWN = 0x02, LEFTUP = 0x04
  // RIGHTDOWN = 0x08, RIGHTUP = 0x10
  // MIDDLEDOWN = 0x20, MIDDLEUP = 0x40
  let dwDown = '0x02';
  let dwUp = '0x04';
  if (clickType === 'right') {
    dwDown = '0x08';
    dwUp = '0x10';
  } else if (clickType === 'middle') {
    dwDown = '0x20';
    dwUp = '0x40';
  }

  const scriptParts = [
    `Add-Type -MemberDefinition '[DllImport("user32.dll")] public static extern void mouse_event(int flags, int dx, int dy, int cButtons, int extraInfo); [DllImport("user32.dll")] public static extern bool SetCursorPos(int X, int Y);' -Name U32 -Namespace Win32;`
  ];
  if (useFixedPos) {
    scriptParts.push(`[Win32.U32]::SetCursorPos(${posX}, ${posY});`);
  }
  scriptParts.push(`[Win32.U32]::mouse_event(${dwDown}, 0, 0, 0, 0);`);
  scriptParts.push(`[Win32.U32]::mouse_event(${dwUp}, 0, 0, 0, 0);`);
  const triggerClickScript = scriptParts.join(' ');

  function scheduleNextClick() {
    if (!isAutoClicking) return;

    // Calculate interval with random jitter (±15% variation)
    let currentDelay = baseInterval;
    if (useJitter && baseInterval >= 20) {
      const jitterRange = Math.round(baseInterval * 0.15);
      const randomOffset = Math.floor(Math.random() * (jitterRange * 2 + 1)) - jitterRange;
      currentDelay = Math.max(10, baseInterval + randomOffset);
    }

    autoClickTimeout = setTimeout(() => {
      if (!isAutoClicking) return;

      exec(`powershell -NoProfile -NonInteractive -Command "${triggerClickScript}"`, (err) => {
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
      } else {
        scheduleNextClick();
      }
    }, currentDelay);
  }

  scheduleNextClick();
}

function stopNativeAutoClick() {
  if (autoClickTimeout) {
    clearTimeout(autoClickTimeout);
    autoClickTimeout = null;
  }
  isAutoClicking = false;
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('autoclick-status', { running: false });
  }
}

// Global hotkeys
let currentAutoClickHotkey = 'F6';
let pickCoordHotkey = 'F7';

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
      globalShortcut.register(currentAutoClickHotkey, () => {
        if (isAutoClicking) stopNativeAutoClick();
        else if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('trigger-autoclick-toggle');
      });
      return { success: false, error: 'Không thể đăng ký phím tắt này' };
    }
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function registerPickCoordShortcut() {
  try {
    globalShortcut.register(pickCoordHotkey, () => {
      const pos = screen.getCursorScreenPoint();
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('trigger-pick-coord', pos);
      }
    });
  } catch (e) {}
}

// ─── Export Data (CSV & JSON) ─────────────────────────────────────────────────
async function handleExportData(format) {
  try {
    const defaultFilename = `winpulse_stats_${getTodayKey()}.${format}`;
    const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
      title: format === 'csv' ? 'Xuất dữ liệu CSV' : 'Xuất dữ liệu JSON',
      defaultPath: path.join(app.getPath('downloads'), defaultFilename),
      filters: format === 'csv'
        ? [{ name: 'CSV Files', extensions: ['csv'] }]
        : [{ name: 'JSON Files', extensions: ['json'] }]
    });

    if (canceled || !filePath) return { success: false, canceled: true };

    if (format === 'json') {
      fs.writeFileSync(filePath, JSON.stringify(statsData, null, 2), 'utf-8');
    } else if (format === 'csv') {
      const headers = ['Date', 'Copy', 'Paste', 'LeftClick', 'RightClick', 'MiddleClick', 'Scroll', 'Distance_Meters', 'TotalActions'];
      const rows = [headers.join(',')];
      const sortedKeys = Object.keys(statsData).sort().reverse();
      for (const key of sortedKeys) {
        const d = statsData[key] || {};
        const copy = d.copy || 0;
        const paste = d.paste || 0;
        const left = d.leftClick || 0;
        const right = d.rightClick || 0;
        const middle = d.middleClick || 0;
        const scroll = d.scroll || 0;
        const dist = d.distanceMeters || 0;
        const total = copy + paste + left + right + middle + scroll;
        rows.push([key, copy, paste, left, right, middle, scroll, dist, total].join(','));
      }
      fs.writeFileSync(filePath, rows.join('\n'), 'utf-8');
    }
    return { success: true, filePath };
  } catch (err) {
    return { success: false, error: err.message };
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

ipcMain.handle('get-autoclick-hotkey', () => currentAutoClickHotkey);
ipcMain.handle('set-autoclick-hotkey', (_e, key) => registerAutoClickShortcut(key));

// ─── Windows Startup Shortcut Helper (.lnk in Startup folder) ────────────────
const { execSync } = require('child_process');
const STARTUP_DIR = path.join(app.getPath('appData'), 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup');
const SHORTCUT_PATH = path.join(STARTUP_DIR, 'WinPulse Studio.lnk');

function getWindowsAutoStart() {
  return fs.existsSync(SHORTCUT_PATH);
}

function setWindowsAutoStart(enable) {
  try {
    if (enable) {
      const targetPath = process.execPath;
      const targetArgs = app.isPackaged ? '--hidden' : path.resolve('.');
      const iconPath = path.resolve('assets/icon.png');
      const workingDir = path.resolve('.');

      const vbsFile = path.join(app.getPath('temp'), 'mk_winpulse_lnk.vbs');
      const vbs = [
        'Set WshShell = CreateObject("WScript.Shell")',
        'Set Shortcut = WshShell.CreateShortcut("' + SHORTCUT_PATH + '")',
        'Shortcut.TargetPath = "' + targetPath + '"',
        'Shortcut.Arguments = "' + targetArgs + '"',
        'Shortcut.WorkingDirectory = "' + workingDir + '"',
        'Shortcut.Description = "WinPulse Studio"',
        'Shortcut.IconLocation = "' + iconPath + ',0"',
        'Shortcut.Save'
      ].join('\r\n');

      fs.writeFileSync(vbsFile, vbs, 'ascii');
      execSync('cscript //nologo "' + vbsFile + '"');
      try { fs.unlinkSync(vbsFile); } catch (e) {}

      // Remove any legacy registry entries
      exec(`reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "WinPulse Studio" /f`, () => {});
      return true;
    } else {
      if (fs.existsSync(SHORTCUT_PATH)) {
        fs.unlinkSync(SHORTCUT_PATH);
      }
      exec(`reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "WinPulse Studio" /f`, () => {});
      return false;
    }
  } catch (err) {
    console.error('Error setting auto start shortcut:', err);
    return fs.existsSync(SHORTCUT_PATH);
  }
}

ipcMain.handle('get-auto-start', () => {
  return getWindowsAutoStart();
});

ipcMain.handle('set-auto-start', (_e, enable) => {
  return setWindowsAutoStart(enable);
});

ipcMain.handle('get-minimize-to-tray', () => {
  return appSettings.minimizeToTray !== false;
});

ipcMain.handle('set-minimize-to-tray', (_e, enable) => {
  appSettings.minimizeToTray = !!enable;
  saveSettings(appSettings);
  return appSettings.minimizeToTray;
});

ipcMain.handle('open-data-folder', async () => {
  ensureDataDir();
  await shell.openPath(DATA_DIR);
  return { success: true };
});

ipcMain.handle('export-data', (_e, format) => handleExportData(format));

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
    distancePx: 0,
    distanceMeters: 0,
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
ipcMain.on('window-close', () => {
  if (appSettings.minimizeToTray) {
    mainWindow?.hide();
  } else {
    app.isQuitting = true;
    app.quit();
  }
});
ipcMain.on('window-quit', () => {
  app.isQuitting = true;
  app.quit();
});

// ─── App lifecycle ─────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  nativeTheme.themeSource = 'light';
  createWindow();
  createTray();
  startClipboardMonitor();
  setupGlobalInputHook();
  registerAutoClickShortcut();
  registerPickCoordShortcut();
});

app.on('will-quit', () => {
  if (mouseDistanceBatchPx > 0) {
    recordMouseDistance(mouseDistanceBatchPx);
    mouseDistanceBatchPx = 0;
  }
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

