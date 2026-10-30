<div align="center">

# ⚡ WinPulse Studio
**Next-Gen Windows Productivity Analytics & Native Auto Clicker**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform: Windows](https://img.shields.io/badge/Platform-Windows%2010%20%7C%2011-0078d4.svg?logo=windows)](https://github.com/tatv-dev/winpulse-studio)
[![Electron](https://img.shields.io/badge/Electron-29.0.0-47848F.svg?logo=electron)](https://www.electronjs.org/)

*A lightweight, privacy-first desktop telemetry engine designed to track daily keyboard & mouse interactions, estimate active screen time & calories, and deliver blazing-fast native auto-clicking for Windows.*

</div>

---

## ✨ Features

- 📊 **Productivity Telemetry**: Real-time counters for Copy/Paste, clicks, scroll, and mouse movement distance (m/km).
- ⏱️ **Active Screen Time & Calories**: Automatically tracks active working time (with smart idle detection) and estimates energetic expenditure (kcal).
- ⚡ **Native Hardware Auto Clicker**: Low-latency Windows `user32.dll` simulation with customizable speed (down to 10ms), fixed/cursor positioning, and anti-bot jitter.
- 📄 **100% Offline PDF to Word Converter**: Fast and private conversion of `.pdf` documents to `.docx` format directly on the device with zero cloud dependency.
- ⌨️ **Global Hotkeys**: Control the auto-clicker anywhere on Windows using custom shortcuts (Default: `F6` to Start/Stop, `F7` to pick coordinates).
- 🛡️ **Privacy-First**: 100% offline and local storage (`%APPDATA%/winpulse`). Zero keylogging or cloud telemetry.
- 🌐 **Bilingual UI**: Seamless instant toggle between **Tiếng Việt** and **English**.

---

## 🚀 Quick Start

### Development
```bash
git clone https://github.com/tatv-dev/winpulse-studio.git
cd winpulse-studio
npm install
npm run dev
```

### Build Executables
```bash
# Build Installer (.exe) & Portable (.exe)
npm run build

# Build Portable only
npm run build:portable
```
*Binaries are saved to the `dist/` directory.*

---

## 📄 License

Distributed under the **MIT License**. Created with ❤️ by **Hexgy** ([tatv-dev](https://github.com/tatv-dev)).

