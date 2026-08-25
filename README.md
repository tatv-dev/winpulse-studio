<div align="center">

# ⚡ WinPulse Studio
### **Next-Gen Windows Productivity Analytics & Native Auto Clicker**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform: Windows](https://img.shields.io/badge/Platform-Windows%2010%20%7C%2011-0078d4.svg?logo=windows)](https://github.com/tatv-dev/winpulse-studio)
[![Electron](https://img.shields.io/badge/Electron-29.0.0-47848F.svg?logo=electron)](https://www.electronjs.org/)
[![Status](https://img.shields.io/badge/Status-Active%20%7C%20Production-success.svg)](#)

*A lightweight, privacy-first desktop telemetry engine designed to track daily keyboard & mouse interactions, calculate copy/paste productivity ratios, and deliver blazing-fast native auto-clicking for Windows.*

[Overview](#-overview) • [Key Features](#-key-features) • [Native Auto Clicker](#-native-auto-clicker) • [Architecture](#-architecture) • [Getting Started](#-getting-started) • [Building EXE](#-building-installer--portable-exe) • [Privacy & Security](#-privacy--security)

---

</div>

## 📌 Overview

**WinPulse Studio** is a unified Windows desktop application built with Electron and native Windows APIs (`user32.dll` and `uiohook-napi`). It continuously measures productivity metrics—including keystroke frequency, clipboard operations (Copy & Paste), mouse clicks (Left, Right, Middle), and scroll activity—while operating 100% locally with zero cloud telemetry.

In addition to telemetry analysis, WinPulse Studio integrates a **Hardware-Level Native Auto Clicker** with customizable global hotkeys, microsecond-accurate intervals, and background execution capabilities.

---

## ✨ Key Features

### 📊 Real-Time Productivity Telemetry & Analytics
- **Clipboard Dynamics**: Tracks daily `Ctrl+C` (Copy) and `Ctrl+V` (Paste) counts and automatically computes your daily **Copy/Paste Productivity Ratio**.
- **Mouse Travel Distance Tracker**: Passive global Euclidean mouse movement calculation measuring daily distance in **Meters (m)** and **Kilometers (km)**.
- **Interactive Multi-Action Charts**: Dynamic visualizations powered by Chart.js (7-Day Trends, Action Composition Doughnut, and Mouse Breakdown Horizontal Bar).
- **Zero-Config History Log & Export**: Persistent daily historical tables with **1-click CSV / JSON Export** for Excel and long-term archiving.

### ⚡ Native Windows Auto Clicker (Hardware-Level)
- **Hardware-Level Precision**: Leverages Windows native `user32.dll` `mouse_event` & `SetCursorPos` API for millisecond-level responsiveness.
- **Customizable Target Location**: Supports clicking at the **Current Cursor Position** or at **Fixed Screen Coordinates (X, Y)** with a 1-click **Coord Picker (F7)**.
- **Anti-Bot Random Jitter**: Optional $\pm 15\%$ interval variation to simulate human-like click cadence.
- **Customizable Global Hotkeys**: Trigger or halt clicks anywhere across Windows using single function keys (`F5`–`F12`) or custom keyboard combinations (`Ctrl+Shift+...`).
- **Flexible Trigger Controls**: Supports Left, Right, and Middle mouse buttons with infinite or fixed-count repeat loops.
- **Compact Stepper Interface**: Ergonomic interval selector with instant speed presets (`20ms`, `100ms`, `500ms`, `1s`).

### 🛡️ System Tray & Windows Integration
- **Auto-Start with Windows**: Native toggle switch to launch WinPulse Studio automatically on system boot.
- **Background Execution**: Minimize to system tray on close to ensure non-intrusive, continuous tracking.
- **Single-Click Tray Toggle**: Quick show/hide toggle directly from the Windows notification area.

### 🌐 Minimalist & Bilingual Interface
- **Keyword-Driven UI**: Clean, clutter-free design with concise terms and zero fluff.
- **Instant Language Switcher**: Seamless 1-click toggle between **English** and **Tiếng Việt** across the entire UI.

---

## 🎯 Native Auto Clicker Utility

```
+-------------------------------------------------------------+
|  [⚡ Ready to Start]                    Executed: 1,420     |
|  Hotkey: F6 (Start / Stop)                                  |
+-------------------------------------------------------------+
|  Interval (ms): [ 100 ] [-][+]                              |
|  Presets: [20ms] [100ms] [500ms] [1s]                       |
|                                                             |
|  Click Location: (●) Current Cursor  (○) Fixed Point (X,Y)  |
|  [X: 960] [Y: 540] [ 🎯 Pick Point (F7) ]                   |
|                                                             |
|  [✓] Random Jitter (±15% Anti-Bot Delay Variation)          |
|                                                             |
|  Mouse Button:   (●) Left   (○) Right   (○) Middle          |
|  Repeat:         (●) Infinite (○) Limit [ 500 ] times       |
|                                                             |
|  [ ▶ Start Auto Clicker (F6) ]                              |
+-------------------------------------------------------------+
```

---

## 🏗️ Architecture & Technology Stack

| Layer | Technology / API | Purpose |
| :--- | :--- | :--- |
| **Framework** | Electron 29 | Cross-platform desktop runtime with sandboxed IPC |
| **Input Monitor** | `uiohook-napi` | Global passive keyboard & mouse hook |
| **Click Engine** | Windows `user32.dll` | Ultra-fast native mouse simulation |
| **Data Viz** | Chart.js | Real-time trend and distribution rendering |
| **Design System**| CSS Design Tokens | Theme-driven modular UI with consistent color variables |
| **Packaging** | `electron-builder` | NSIS installer and standalone portable executables |

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18.0.0 or higher recommended)
- npm or pnpm
- Windows 10 / 11 (x64 / arm64)

### Installation & Development Run

1. **Clone the repository:**
   ```bash
   git clone https://github.com/tatv-dev/winpulse-studio.git
   cd winpulse-studio
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start in development mode (with DevTools):**
   ```bash
   npm run dev
   ```

4. **Start in standard mode:**
   ```bash
   npm run start
   ```

---

## 📦 Building Installer & Portable EXE

WinPulse Studio uses `electron-builder` to package high-performance Windows binaries:

### 1. Build Installer (NSIS Setup) + Portable EXE
```bash
npm run build
```
*Outputs to `dist/WinPulse Studio Setup 1.3.1.exe` and `dist/WinPulse Studio 1.3.1.exe`.*

### 2. Build Standalone Portable EXE Only
```bash
npm run build:portable
```

### 3. Unpacked Directory for Instant Testing
```bash
npm run build:dir
```
*Outputs unpacked folder to `dist/win-unpacked/WinPulse Studio.exe`.*

---

## 🔒 Privacy & Security

- **100% Local Processing**: All telemetry data and stats are stored exclusively in `%APPDATA%/winpulse/stats.json`.
- **No Keystroke Logging**: Only generic counters (`copy`, `paste`) and passive modifier states are recorded. Typed text, passwords, and sensitive inputs are **never** captured, stored, or transmitted.
- **No Network Requests**: The application makes zero outbound connections.

---

## 📄 License

Distributed under the **MIT License**. See [LICENSE](LICENSE) for more details.

---

<div align="center">

Made with ❤️ by [tatv-dev](https://github.com/tatv-dev) • Empowering Windows Productivity

</div>
