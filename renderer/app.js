/* ═══════════════════════════════════════════════════════════════
   WinPulse – Renderer Logic
   Unified Dashboard + Native Auto Clicker Engine + Bilingual i18n
═══════════════════════════════════════════════════════════════ */

'use strict';

// ─── State & Charts Instances ────────────────────────────────────────────────
let currentLang = localStorage.getItem('winpulse_lang') || 'vi';
let currentPage = 'dashboard';
let statsCache = null;
let trendChartInstance = null;
let distributionChartInstance = null;
let mouseBarChartInstance = null;
let isAutoClickRunning = false;
let currentAutoClickKey = localStorage.getItem('winpulse_ac_hotkey') || 'F6';

// ─── Localization Engine ──────────────────────────────────────────────────────
function t(key) {
  const dict = translations[currentLang] || translations.vi;
  return dict[key] || key;
}

function setLanguage(lang) {
  if (lang !== 'vi' && lang !== 'en') return;
  currentLang = lang;
  localStorage.setItem('winpulse_lang', lang);

  // Update UI text nodes with data-i18n
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    if (key && translations[currentLang][key]) {
      el.textContent = translations[currentLang][key];
    }
  });

  // Update input placeholders with data-i18n-placeholder
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.dataset.i18nPlaceholder;
    if (key && translations[currentLang][key]) {
      el.placeholder = translations[currentLang][key];
    }
  });

  // Update button active state
  document.getElementById('btn-lang-vi')?.classList.toggle('active', lang === 'vi');
  document.getElementById('btn-lang-en')?.classList.toggle('active', lang === 'en');
  document.getElementById('pill-lang-vi')?.classList.toggle('active', lang === 'vi');
  document.getElementById('pill-lang-en')?.classList.toggle('active', lang === 'en');

  // Update Auto Clicker button text state
  updateAutoClickUI(isAutoClickRunning);

  // Re-render charts with new localized labels
  if (statsCache) {
    renderAll(statsCache);
  }
}

// ─── Initialization on Start ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setLanguage(currentLang);
});
setLanguage(currentLang);

// ─── Initialize Lucide Icons ───────────────────────────────────────────────────
function refreshIcons() {
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

// ─── Navigation ──────────────────────────────────────────────────────────────
document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    const page = btn.dataset.page;
    navigateTo(page);
  });
});

function navigateTo(page) {
  currentPage = page;
  document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.page === page));
  document.querySelectorAll('.page').forEach(p => p.classList.toggle('active', p.id === `page-${page}`));
  if (statsCache) renderAll(statsCache);
  refreshIcons();
}

// ─── Language Switcher Events ─────────────────────────────────────────────────
document.getElementById('btn-lang-vi')?.addEventListener('click', () => setLanguage('vi'));
document.getElementById('btn-lang-en')?.addEventListener('click', () => setLanguage('en'));
document.getElementById('pill-lang-vi')?.addEventListener('click', () => setLanguage('vi'));
document.getElementById('pill-lang-en')?.addEventListener('click', () => setLanguage('en'));

// ─── Titlebar controls ───────────────────────────────────────────────────────
document.getElementById('btn-minimize').addEventListener('click', () => window.api.windowMinimize());
document.getElementById('btn-maximize').addEventListener('click', () => window.api.windowMaximize());
document.getElementById('btn-close').addEventListener('click',    () => window.api.windowClose());

// ─── Quit ─────────────────────────────────────────────────────────────────────
document.getElementById('btn-quit').addEventListener('click', () => {
  if (confirm(t('quit_confirm'))) {
    window.api.windowQuit();
  }
});

// ─── Data path ───────────────────────────────────────────────────────────────
window.api.getDataPath().then(p => {
  document.getElementById('data-path-label').textContent = p;
});

// ─── Live stats update from main process ─────────────────────────────────────
window.api.onStatsUpdate(data => {
  statsCache = data;
  renderAll(data);
});

// ─── Auto Clicker Form Interactivity ──────────────────────────────────────────
// Radio card selection (Mouse buttons)
document.querySelectorAll('.radio-card').forEach(card => {
  card.addEventListener('click', () => {
    document.querySelectorAll('.radio-card').forEach(c => c.classList.remove('active'));
    card.classList.add('active');
    const radio = card.querySelector('input[type="radio"]');
    if (radio) radio.checked = true;
  });
});

// Stepper buttons (+/- interval)
const intervalInput = document.getElementById('ac-interval');
document.getElementById('btn-interval-dec')?.addEventListener('click', () => {
  if (!intervalInput) return;
  const cur = Number(intervalInput.value) || 100;
  intervalInput.value = Math.max(10, cur - 10);
  updatePresetActive(intervalInput.value);
});
document.getElementById('btn-interval-inc')?.addEventListener('click', () => {
  if (!intervalInput) return;
  const cur = Number(intervalInput.value) || 100;
  intervalInput.value = Math.min(60000, cur + 10);
  updatePresetActive(intervalInput.value);
});
intervalInput?.addEventListener('input', () => {
  updatePresetActive(intervalInput.value);
});

// Speed presets chips
document.querySelectorAll('.preset-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    const val = chip.dataset.val;
    if (intervalInput && val) {
      intervalInput.value = val;
      updatePresetActive(val);
    }
  });
});

function updatePresetActive(val) {
  document.querySelectorAll('.preset-chip').forEach(chip => {
    chip.classList.toggle('active', chip.dataset.val === String(val));
  });
}

// Repeat rows toggle
document.querySelectorAll('.repeat-row').forEach(row => {
  row.addEventListener('click', () => {
    document.querySelectorAll('.repeat-row').forEach(r => r.classList.remove('active'));
    row.classList.add('active');
    const radio = row.querySelector('input[type="radio"]');
    if (radio) {
      radio.checked = true;
      const isCustom = radio.value === 'custom';
      const countInput = document.getElementById('ac-repeat-count');
      if (countInput) countInput.disabled = !isCustom;
    }
  });
});

// Toggle Start / Stop
document.getElementById('btn-toggle-autoclick')?.addEventListener('click', toggleAutoClick);

// Position radio toggle (Cursor vs Fixed)
document.querySelectorAll('input[name="ac-pos-type"]').forEach(radio => {
  radio.addEventListener('change', () => {
    const isFixed = radio.value === 'fixed';
    document.getElementById('pos-row-cursor')?.classList.toggle('active', !isFixed);
    document.getElementById('pos-row-fixed')?.classList.toggle('active', isFixed);
    const panel = document.getElementById('fixed-coord-panel');
    if (panel) panel.classList.toggle('hidden', !isFixed);
  });
});

// Pick coordinate button & global event
document.getElementById('btn-pick-coord')?.addEventListener('click', async () => {
  const pos = await window.api.getCursorPos();
  if (pos) {
    applyPickedCoordinate(pos);
  }
});

function applyPickedCoordinate(pos) {
  const xInput = document.getElementById('ac-pos-x');
  const yInput = document.getElementById('ac-pos-y');
  if (xInput && yInput) {
    xInput.value = pos.x;
    yInput.value = pos.y;
    showToast(`Đã lấy tọa độ: (${pos.x}, ${pos.y})`);
  }
}

// Receive F7 pick coord event from main process
window.api.onTriggerPickCoord(pos => {
  applyPickedCoordinate(pos);
});

async function toggleAutoClick() {
  if (isAutoClickRunning) {
    await window.api.stopAutoClick();
  } else {
    const interval = Number(document.getElementById('ac-interval')?.value) || 100;
    const selectedBtn = document.querySelector('input[name="ac-button"]:checked')?.value || 'left';
    const repeatType = document.querySelector('input[name="ac-repeat-type"]:checked')?.value || 'infinite';
    const repeatCount = repeatType === 'custom' ? (Number(document.getElementById('ac-repeat-count')?.value) || 100) : 0;
    const posType = document.querySelector('input[name="ac-pos-type"]:checked')?.value || 'cursor';
    const useFixedPos = posType === 'fixed';
    const posX = Number(document.getElementById('ac-pos-x')?.value) || 0;
    const posY = Number(document.getElementById('ac-pos-y')?.value) || 0;
    const useJitter = !!document.getElementById('ac-use-jitter')?.checked;

    await window.api.startAutoClick({
      interval: interval,
      clickType: selectedBtn,
      repeatCount: repeatCount,
      useFixedPos: useFixedPos,
      posX: posX,
      posY: posY,
      useJitter: useJitter
    });
  }
}

// Update Auto Clicker UI elements
function updateAutoClickUI(running, count = 0) {
  isAutoClickRunning = running;
  const statusText = document.getElementById('ac-status-text');
  const pulseDot = document.getElementById('ac-pulse-dot');
  const btn = document.getElementById('btn-toggle-autoclick');
  const btnText = document.getElementById('ac-btn-text');
  const btnIcon = document.getElementById('ac-btn-icon');
  const countDisplay = document.getElementById('ac-count-display');
  const hotkeyHint = document.querySelector('[data-i18n="ac_hotkey_hint"]');
  const currentBadge = document.getElementById('current-hotkey-badge');

  if (currentBadge) currentBadge.textContent = currentAutoClickKey;
  if (hotkeyHint) {
    hotkeyHint.textContent = t('ac_hotkey_hint').replace('{key}', currentAutoClickKey);
  }

  // Update quick hotkey buttons active state
  document.querySelectorAll('.hotkey-quick-btn').forEach(qb => {
    qb.classList.toggle('active', qb.dataset.key === currentAutoClickKey);
  });

  if (countDisplay) {
    countDisplay.textContent = count.toLocaleString();
  }

  if (running) {
    if (statusText) statusText.textContent = t('ac_status_running');
    if (pulseDot) pulseDot.classList.add('running');
    if (btn) {
      btn.className = 'btn btn-danger btn-lg';
    }
    if (btnText) btnText.textContent = t('ac_btn_stop').replace('{key}', currentAutoClickKey);
    if (btnIcon) btnIcon.setAttribute('data-lucide', 'square');
  } else {
    if (statusText) statusText.textContent = t('ac_status_stopped');
    if (pulseDot) pulseDot.classList.remove('running');
    if (btn) {
      btn.className = 'btn btn-primary btn-lg';
    }
    if (btnText) btnText.textContent = t('ac_btn_start').replace('{key}', currentAutoClickKey);
    if (btnIcon) btnIcon.setAttribute('data-lucide', 'play');
  }
  refreshIcons();
}

// ─── Hotkey Configuration Handler ───────────────────────────────────────────
async function applyAutoClickHotkey(key) {
  if (!key) return;
  const msgEl = document.getElementById('hotkey-status-msg');
  const res = await window.api.setAutoClickHotkey(key);
  if (res && res.success) {
    currentAutoClickKey = res.hotkey;
    localStorage.setItem('winpulse_ac_hotkey', currentAutoClickKey);
    if (msgEl) {
      msgEl.textContent = t('hotkey_saved_success');
      msgEl.className = 'hotkey-status-msg success';
      setTimeout(() => { if (msgEl) msgEl.textContent = ''; }, 3000);
    }
    updateAutoClickUI(isAutoClickRunning);
  } else {
    if (msgEl) {
      msgEl.textContent = (res && res.error) || 'Không thể đăng ký phím tắt';
      msgEl.className = 'hotkey-status-msg error';
    }
  }
}

// Quick hotkey buttons click
document.querySelectorAll('.hotkey-quick-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const key = btn.dataset.key;
    applyAutoClickHotkey(key);
  });
});

// Custom hotkey recorder input
const customHotkeyInput = document.getElementById('custom-hotkey-input');
const btnSaveHotkey = document.getElementById('btn-save-hotkey');

if (customHotkeyInput) {
  customHotkeyInput.addEventListener('focus', () => {
    customHotkeyInput.classList.add('recording');
    customHotkeyInput.value = t('hotkey_press_key_hint');
  });

  customHotkeyInput.addEventListener('blur', () => {
    customHotkeyInput.classList.remove('recording');
    if (customHotkeyInput.value === t('hotkey_press_key_hint')) {
      customHotkeyInput.value = '';
    }
  });

  customHotkeyInput.addEventListener('keydown', (e) => {
    e.preventDefault();
    let key = e.key;

    // Ignore pure modifier keys
    if (['Control', 'Shift', 'Alt', 'Meta'].includes(key)) return;

    if (key.startsWith('Arrow')) key = key.replace('Arrow', '');
    if (key.length === 1) key = key.toUpperCase();

    const parts = [];
    if (e.ctrlKey) parts.push('CommandOrControl');
    if (e.altKey) parts.push('Alt');
    if (e.shiftKey) parts.push('Shift');
    parts.push(key);

    const shortcutStr = parts.join('+');
    customHotkeyInput.value = shortcutStr;
  });
}

btnSaveHotkey?.addEventListener('click', () => {
  const val = customHotkeyInput?.value?.trim();
  if (val && val !== t('hotkey_press_key_hint')) {
    applyAutoClickHotkey(val);
  }
});

// Load saved hotkey on startup
(async function initHotkey() {
  const saved = localStorage.getItem('winpulse_ac_hotkey');
  if (saved) {
    await applyAutoClickHotkey(saved);
  } else {
    const current = await window.api.getAutoClickHotkey();
    if (current) {
      currentAutoClickKey = current;
      updateAutoClickUI(false);
    }
  }
})();

// Receive Auto Clicker status updates from main process
window.api.onAutoClickStatus(data => {
  updateAutoClickUI(data.running, data.count || 0);
});

// Global hotkey triggered
window.api.onTriggerAutoClickToggle(() => {
  toggleAutoClick();
});

// ─── Initial load ─────────────────────────────────────────────────────────────
(async () => {
  setLanguage(currentLang);
  refreshIcons();
  const data = await window.api.getStats();
  statsCache = data;
  renderAll(data);

  const acStatus = await window.api.getAutoClickStatus();
  updateAutoClickUI(acStatus?.running || false);
})();

// ─── Render All ───────────────────────────────────────────────────────────────
function renderAll(data) {
  renderDashboard(data);
  renderHistory(data);
  refreshIcons();
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function renderDashboard(data) {
  const { today, history, allTime } = data;

  // Date header
  const now = new Date();
  const locale = currentLang === 'vi' ? 'vi-VN' : 'en-US';
  document.getElementById('dash-date').textContent =
    now.toLocaleDateString(locale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // Top Metrics Ribbon
  const copyVal     = today.copy || 0;
  const pasteVal    = today.paste || 0;
  const leftVal     = today.leftClick || 0;
  const rightVal    = today.rightClick || 0;
  const middleVal   = today.middleClick || 0;
  const clicksVal   = leftVal + rightVal + middleVal;
  const scrollVal   = today.scroll || 0;
  const distanceVal = today.distanceMeters || 0;
  const todayTotal  = copyVal + pasteVal + clicksVal + scrollVal;

  animateCount('today-copy', copyVal);
  animateCount('today-paste', pasteVal);
  animateCount('today-clicks', clicksVal);
  animateCount('today-scroll', scrollVal);
  animateCount('today-distance', distanceVal);

  // Summary section
  const clipTotal = copyVal + pasteVal;
  const copyPct = clipTotal > 0 ? Math.round((copyVal / clipTotal) * 100) : 50;
  const pastePct = clipTotal > 0 ? (100 - copyPct) : 50;

  document.getElementById('summary-ratio').textContent =
    clipTotal > 0
      ? `${copyVal} ${t('label_copy')} (${copyPct}%) / ${pasteVal} ${t('label_paste')} (${pastePct}%)`
      : t('summary_no_cp');
  document.getElementById('ratio-copy-bar').style.width = copyPct + '%';
  document.getElementById('ratio-paste-bar').style.width = pastePct + '%';

  document.getElementById('total-today-actions').textContent = todayTotal.toLocaleString();
  document.getElementById('total-alltime-actions').textContent = (allTime.totalActions || 0).toLocaleString();

  // Render Chart.js Visualizations
  renderTrendChart(history);
  renderDistributionChart(copyVal, pasteVal, clicksVal, scrollVal);
  renderMouseBarChart(leftVal, rightVal, middleVal, scrollVal);
}

// ─── Chart Colors Helper (Read directly from CSS Design Tokens) ───────────────
function getChartColors() {
  const rootStyle = getComputedStyle(document.documentElement);
  const getToken = (name, fallback) => rootStyle.getPropertyValue(name).trim() || fallback;

  return {
    copy: getToken('--accent-copy', '#25aceb'),
    paste: getToken('--accent-paste', '#3aa5ed'),
    clicks: getToken('--accent-clicks', '#21dda2'),
    scroll: getToken('--accent-scroll', '#0284c7'),
    amber: getToken('--accent-amber', '#d97706'),
    primary: getToken('--primary', '#36cefc'),
    textPrimary: getToken('--text-primary', '#0f172a'),
    textSecondary: getToken('--text-secondary', '#475569'),
    textMuted: getToken('--text-muted', '#94a3b8'),
    border: getToken('--border', '#e2e8f0'),
    bgSubtle: getToken('--bg-subtle', '#f1f5f9')
  };
}

// ─── Chart 1: Trend Chart (7-Day Interaction Trends) ─────────────────────────
function renderTrendChart(history) {
  const canvas = document.getElementById('trendChart');
  if (!canvas || typeof Chart === 'undefined') return;

  const colors = getChartColors();
  const labels = history.map(d => formatDayShort(d.date));
  const copyData = history.map(d => d.copy || 0);
  const pasteData = history.map(d => d.paste || 0);
  const clicksData = history.map(d => (d.leftClick || 0) + (d.rightClick || 0) + (d.middleClick || 0));

  if (trendChartInstance) {
    trendChartInstance.data.labels = labels;
    trendChartInstance.data.datasets[0].label = t('label_copy');
    trendChartInstance.data.datasets[0].data = copyData;
    trendChartInstance.data.datasets[0].borderColor = colors.copy;
    trendChartInstance.data.datasets[1].label = t('label_paste');
    trendChartInstance.data.datasets[1].data = pasteData;
    trendChartInstance.data.datasets[1].borderColor = colors.paste;
    trendChartInstance.data.datasets[2].label = t('label_clicks');
    trendChartInstance.data.datasets[2].data = clicksData;
    trendChartInstance.data.datasets[2].borderColor = colors.clicks;
    trendChartInstance.update();
    return;
  }

  const ctx = canvas.getContext('2d');
  trendChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: t('label_copy'),
          data: copyData,
          borderColor: colors.copy,
          backgroundColor: 'rgba(37, 172, 235, 0.08)',
          tension: 0.35,
          fill: true,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
        {
          label: t('label_paste'),
          data: pasteData,
          borderColor: colors.paste,
          backgroundColor: 'rgba(58, 165, 237, 0.08)',
          tension: 0.35,
          fill: true,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
        {
          label: t('label_clicks'),
          data: clicksData,
          borderColor: colors.clicks,
          backgroundColor: 'rgba(33, 221, 162, 0.08)',
          tension: 0.35,
          fill: true,
          pointRadius: 4,
          pointHoverRadius: 6,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: {
            boxWidth: 12,
            font: { family: "'Inter', sans-serif", size: 11 },
            color: colors.textSecondary
          }
        },
        tooltip: {
          padding: 8,
          backgroundColor: colors.textPrimary,
          titleFont: { family: "'Inter', sans-serif", size: 11 },
          bodyFont: { family: "'JetBrains Mono', monospace", size: 11 },
          cornerRadius: 6
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { font: { family: "'JetBrains Mono', monospace", size: 10 }, color: colors.textMuted }
        },
        y: {
          beginAtZero: true,
          grid: { color: colors.bgSubtle },
          ticks: { font: { family: "'JetBrains Mono', monospace", size: 10 }, color: colors.textMuted }
        }
      }
    }
  });
}

// ─── Chart 2: Distribution Doughnut Chart (Action Breakdown) ─────────────────
function renderDistributionChart(copy, paste, clicks, scroll) {
  const canvas = document.getElementById('distributionChart');
  if (!canvas || typeof Chart === 'undefined') return;

  const colors = getChartColors();
  const total = copy + paste + clicks + scroll;
  const dataValues = total > 0 ? [copy, paste, clicks, scroll] : [1, 1, 1, 1];
  const labels = [t('label_copy'), t('label_paste'), t('label_clicks'), t('label_scroll')];
  const backgroundColors = total > 0
    ? [colors.copy, colors.paste, colors.clicks, colors.scroll]
    : [colors.border, colors.border, colors.border, colors.border];

  if (distributionChartInstance) {
    distributionChartInstance.data.labels = labels;
    distributionChartInstance.data.datasets[0].data = dataValues;
    distributionChartInstance.data.datasets[0].backgroundColor = backgroundColors;
    distributionChartInstance.update();
    return;
  }

  const ctx = canvas.getContext('2d');
  distributionChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: dataValues,
        backgroundColor: backgroundColors,
        borderWidth: 2,
        borderColor: '#ffffff',
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '68%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            boxWidth: 10,
            font: { family: "'Inter', sans-serif", size: 11 },
            color: colors.textSecondary
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              if (total === 0) return ` ${t('no_data')}`;
              const val = context.raw || 0;
              const pct = Math.round((val / total) * 100);
              return ` ${context.label}: ${val.toLocaleString()} (${pct}%)`;
            }
          }
        }
      }
    }
  });
}

// ─── Chart 3: Horizontal Bar Chart (Mouse & Scroll Breakdown) ────────────────
function renderMouseBarChart(left, right, middle, scroll) {
  const canvas = document.getElementById('mouseBarChart');
  if (!canvas || typeof Chart === 'undefined') return;

  const colors = getChartColors();
  const labels = [t('label_left_click'), t('label_right_click'), t('label_middle_click'), t('label_scroll_action')];
  const dataValues = [left, right, middle, scroll];
  const barColors = [colors.copy, colors.paste, colors.amber, colors.clicks];

  if (mouseBarChartInstance) {
    mouseBarChartInstance.data.labels = labels;
    mouseBarChartInstance.data.datasets[0].data = dataValues;
    mouseBarChartInstance.data.datasets[0].backgroundColor = barColors;
    mouseBarChartInstance.update();
    return;
  }

  const ctx = canvas.getContext('2d');
  mouseBarChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: t('th_total'),
        data: dataValues,
        backgroundColor: barColors,
        borderRadius: 4,
        barThickness: 16
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: colors.textPrimary,
          titleFont: { family: "'Inter', sans-serif", size: 11 },
          bodyFont: { family: "'JetBrains Mono', monospace", size: 11 },
          cornerRadius: 6
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          grid: { color: colors.bgSubtle },
          ticks: { font: { family: "'JetBrains Mono', monospace", size: 10 }, color: colors.textMuted }
        },
        y: {
          grid: { display: false },
          ticks: { font: { family: "'Inter', sans-serif", size: 11 }, color: colors.textSecondary }
        }
      }
    }
  });
}

// ── History page ───────────────────────────────────────────────────────────────
function renderHistory(data) {
  const { history } = data;
  const todayKey = new Date().toISOString().slice(0, 10);
  const tbody = document.getElementById('history-tbody');

  if (!history || history.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="loading-cell">${t('no_history')}</td></tr>`;
    return;
  }

  tbody.innerHTML = [...history].reverse().map(day => {
    const copy     = day.copy || 0;
    const paste    = day.paste || 0;
    const left     = day.leftClick || 0;
    const right    = day.rightClick || 0;
    const middle   = day.middleClick || 0;
    const scroll   = day.scroll || 0;
    const distance = (day.distanceMeters || 0) + ' m';
    const total    = copy + paste + left + right + middle + scroll;
    const isToday  = day.date === todayKey;

    return `<tr class="${isToday ? 'today-row' : ''}">
      <td class="td-date">
        <span>${formatDateLabel(day.date)}</span>
        ${isToday ? `<span class="today-badge">${t('today_badge')}</span>` : ''}
      </td>
      <td class="td-copy">${copy.toLocaleString()}</td>
      <td class="td-paste">${paste.toLocaleString()}</td>
      <td>${left.toLocaleString()}</td>
      <td>${right.toLocaleString()}</td>
      <td>${middle.toLocaleString()}</td>
      <td>${scroll.toLocaleString()}</td>
      <td>${distance}</td>
      <td class="td-total">${total.toLocaleString()}</td>
    </tr>`;
  }).join('');
}

// ─── Export Handlers ──────────────────────────────────────────────────────────
async function triggerExport(format) {
  const res = await window.api.exportData(format);
  if (res && res.success) {
    showToast(t('export_success'));
  } else if (res && !res.canceled) {
    showToast(t('export_fail'));
  }
}

document.getElementById('btn-export-csv')?.addEventListener('click', () => triggerExport('csv'));
document.getElementById('btn-export-json')?.addEventListener('click', () => triggerExport('json'));
document.getElementById('btn-settings-export-csv')?.addEventListener('click', () => triggerExport('csv'));
document.getElementById('btn-settings-export-json')?.addEventListener('click', () => triggerExport('json'));

// ─── Auto-Start with Windows ──────────────────────────────────────────────────
const autoStartToggle = document.getElementById('toggle-autostart');
if (autoStartToggle) {
  window.api.getAutoStart().then(enabled => {
    autoStartToggle.checked = enabled;
  });

  autoStartToggle.addEventListener('change', async () => {
    const newState = await window.api.setAutoStart(autoStartToggle.checked);
    autoStartToggle.checked = newState;
    showToast(newState ? 'Đã bật tự khởi động' : 'Đã tắt tự khởi động');
  });
}

// ─── System Tray Minimize Toggle ──────────────────────────────────────────────
const trayToggle = document.getElementById('toggle-tray');
if (trayToggle) {
  window.api.getMinimizeToTray().then(enabled => {
    trayToggle.checked = enabled;
  });

  trayToggle.addEventListener('change', async () => {
    const newState = await window.api.setMinimizeToTray(trayToggle.checked);
    trayToggle.checked = newState;
    showToast(newState ? 'Đã bật thu nhỏ vào khay' : 'Đã tắt thu nhỏ vào khay');
  });
}

// ─── Open Data Folder ─────────────────────────────────────────────────────────
document.getElementById('btn-open-data')?.addEventListener('click', async () => {
  await window.api.openDataFolder();
});



// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDateLabel(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const locale = currentLang === 'vi' ? 'vi-VN' : 'en-US';
  return d.toLocaleDateString(locale, { weekday: 'short', day: '2-digit', month: '2-digit' });
}

function formatDayShort(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  const diff = Math.round((today - d) / 86400000);
  if (diff === 0) return currentLang === 'vi' ? 'Hôm nay' : 'Today';
  if (diff === 1) return currentLang === 'vi' ? 'Hôm qua' : 'Yesterday';
  const locale = currentLang === 'vi' ? 'vi-VN' : 'en-US';
  return d.toLocaleDateString(locale, { day: '2-digit', month: '2-digit' });
}

// Animate counter
const prevValues = {};
function animateCount(id, newVal) {
  const el = document.getElementById(id);
  if (!el) return;
  const oldVal = prevValues[id] ?? 0;
  if (newVal !== oldVal) {
    el.textContent = newVal.toLocaleString();
    prevValues[id] = newVal;
  }
}

// ─── Toast notification ───────────────────────────────────────────────────────
function showToast(msg) {
  const existing = document.getElementById('__toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = '__toast';
  
  toast.innerHTML = `<i data-lucide="check-circle-2" class="icon-sm" style="color: #059669;"></i><span>${msg}</span>`;
  
  Object.assign(toast.style, {
    position: 'fixed',
    bottom: '24px',
    left: '50%',
    transform: 'translateX(-50%) translateY(12px)',
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    color: '#0f172a',
    padding: '10px 18px',
    borderRadius: '8px',
    fontSize: '12.5px',
    fontWeight: '500',
    zIndex: '9999',
    opacity: '0',
    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
    fontFamily: "'Inter', sans-serif",
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.05)',
    whiteSpace: 'nowrap',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  });
  document.body.appendChild(toast);
  refreshIcons();

  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
  });

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(12px)';
    setTimeout(() => toast.remove(), 250);
  }, 2500);
}
