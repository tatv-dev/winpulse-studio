/* ═══════════════════════════════════════════════════════════════
   Count Tool – Renderer App Logic
   Light Mode & Lucide Icons Integration
═══════════════════════════════════════════════════════════════ */

'use strict';

// ─── State ───────────────────────────────────────────────────────────────────
let currentPage = 'dashboard';
let statsCache = null;

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

// ─── Titlebar controls ───────────────────────────────────────────────────────
document.getElementById('btn-minimize').addEventListener('click', () => window.api.windowMinimize());
document.getElementById('btn-maximize').addEventListener('click', () => window.api.windowMaximize());
document.getElementById('btn-close').addEventListener('click',    () => window.api.windowClose());

// ─── Reset today ─────────────────────────────────────────────────────────────
document.getElementById('btn-reset-today').addEventListener('click', async () => {
  if (!confirm('Bạn có chắc muốn đặt lại dữ liệu ngày hôm nay? Thao tác này không thể hoàn tác.')) return;
  const data = await window.api.resetToday();
  statsCache = data;
  renderAll(data);
  showToast('Đã đặt lại dữ liệu ngày hôm nay thành công');
});

// ─── Quit ─────────────────────────────────────────────────────────────────────
document.getElementById('btn-quit').addEventListener('click', () => {
  if (confirm('Thoát ứng dụng Count Tool? Tiến trình theo dõi sẽ dừng lại.')) {
    window.api.windowQuit();
  }
});

// ─── Data path ───────────────────────────────────────────────────────────────
window.api.getDataPath().then(p => {
  document.getElementById('data-path-label').textContent = p;
});

// ─── Live stats update ───────────────────────────────────────────────────────
window.api.onStatsUpdate(data => {
  statsCache = data;
  renderAll(data);
});

// ─── Initial load ─────────────────────────────────────────────────────────────
(async () => {
  refreshIcons();
  const data = await window.api.getStats();
  statsCache = data;
  renderAll(data);
})();

// ─── Render ───────────────────────────────────────────────────────────────────
function renderAll(data) {
  renderDashboard(data);
  renderClipboard(data);
  renderHistory(data);
  refreshIcons();
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function renderDashboard(data) {
  const { today, history, allTime } = data;

  // Date header
  const now = new Date();
  document.getElementById('dash-date').textContent =
    now.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // Stat cards
  animateCount('today-copy', today.copy ?? 0);
  animateCount('today-paste', today.paste ?? 0);
  animateCount('today-total', (today.copy ?? 0) + (today.paste ?? 0));
  animateCount('alltime-total', (allTime.copy ?? 0) + (allTime.paste ?? 0));

  document.getElementById('last-copy-time').textContent = today.lastCopy
    ? `Lần cuối: ${formatTime(today.lastCopy)}` : 'Chưa có thao tác';
  document.getElementById('last-paste-time').textContent = today.lastPaste
    ? `Lần cuối: ${formatTime(today.lastPaste)}` : 'Chưa có thao tác';

  const total = (today.copy ?? 0) + (today.paste ?? 0);
  document.getElementById('copy-paste-ratio').textContent =
    total > 0 ? `Tỷ lệ Copy/Paste: ${today.copy} / ${today.paste}` : 'Chưa có dữ liệu';
  document.getElementById('alltime-breakdown').textContent =
    `${allTime.copy.toLocaleString()} copy · ${allTime.paste.toLocaleString()} paste`;

  // Bar chart
  renderBarChart(history, today.date);
}

// ── Clipboard page ────────────────────────────────────────────────────────────
function renderClipboard(data) {
  const { today } = data;
  const copy  = today.copy ?? 0;
  const paste = today.paste ?? 0;
  const total = copy + paste;

  document.getElementById('clip-copy').textContent = copy.toLocaleString();
  document.getElementById('clip-paste').textContent = paste.toLocaleString();

  const copyPct  = total > 0 ? Math.round((copy / total) * 100) : 50;
  const pastePct = total > 0 ? (100 - copyPct) : 50;

  document.getElementById('progress-copy').style.width  = copyPct + '%';
  document.getElementById('progress-paste').style.width = pastePct + '%';
  document.getElementById('progress-pct').textContent   = `${copyPct}% / ${pastePct}%`;
}

// ── History page ───────────────────────────────────────────────────────────────
function renderHistory(data) {
  const { history } = data;
  const todayKey = new Date().toISOString().slice(0, 10);
  const tbody = document.getElementById('history-tbody');

  if (!history || history.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="loading-cell">Chưa có dữ liệu lịch sử</td></tr>';
    return;
  }

  tbody.innerHTML = [...history].reverse().map(day => {
    const copy  = day.copy ?? 0;
    const paste = day.paste ?? 0;
    const total = copy + paste;
    const ratio = total > 0 ? `${Math.round((copy / total) * 100)}% Copy` : '—';
    const isToday = day.date === todayKey;

    return `<tr class="${isToday ? 'today-row' : ''}">
      <td class="td-date">
        <span>${formatDateLabel(day.date)}</span>
        ${isToday ? '<span class="today-badge">Hôm nay</span>' : ''}
      </td>
      <td class="td-copy">${copy.toLocaleString()}</td>
      <td class="td-paste">${paste.toLocaleString()}</td>
      <td class="td-total">${total.toLocaleString()}</td>
      <td class="td-ratio">${ratio}</td>
    </tr>`;
  }).join('');
}

// ─── Bar Chart ───────────────────────────────────────────────────────────────
function renderBarChart(history, todayKey) {
  const chart = document.getElementById('bar-chart');
  const maxVal = Math.max(...history.flatMap(d => [d.copy ?? 0, d.paste ?? 0]), 1);
  const MAX_PX = 115;

  chart.innerHTML = history.map(day => {
    const copy  = day.copy ?? 0;
    const paste = day.paste ?? 0;
    const copyH  = Math.max(Math.round((copy  / maxVal) * MAX_PX), 3);
    const pasteH = Math.max(Math.round((paste / maxVal) * MAX_PX), 3);
    const isToday = day.date === todayKey;
    const label = formatDayShort(day.date);

    return `<div class="bar-group">
      <div class="bar-pair">
        <div class="bar copy-bar ${isToday ? 'today' : ''}"
             style="height:${copyH}px"
             data-val="Copy: ${copy}" title="Copy: ${copy}"></div>
        <div class="bar paste-bar ${isToday ? 'today' : ''}"
             style="height:${pasteH}px"
             data-val="Paste: ${paste}" title="Paste: ${paste}"></div>
      </div>
      <div class="bar-label ${isToday ? 'today-label' : ''}">${label}</div>
    </div>`;
  }).join('');
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatDateLabel(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' });
}

function formatDayShort(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  const diff = Math.round((today - d) / 86400000);
  if (diff === 0) return 'Hôm nay';
  if (diff === 1) return 'Hôm qua';
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

// Animate counter with bump
const prevValues = {};
function animateCount(id, newVal) {
  const el = document.getElementById(id);
  if (!el) return;
  const oldVal = prevValues[id] ?? 0;
  if (newVal !== oldVal) {
    el.textContent = newVal.toLocaleString();
    el.classList.remove('bump');
    void el.offsetWidth; // reflow
    el.classList.add('bump');
    setTimeout(() => el.classList.remove('bump'), 250);
    prevValues[id] = newVal;
  }
}

// ─── Toast notification ───────────────────────────────────────────────────────
function showToast(msg) {
  const existing = document.getElementById('__toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = '__toast';
  
  // Icon and text without any emojis
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
