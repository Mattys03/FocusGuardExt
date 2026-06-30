# FocusGuard - Productivity Chrome Extension

<div align="center">
  <a href="https://github.com/Mattys03/FocusGuardExt/releases/latest">
    <img src="https://img.shields.io/badge/📦_Download_Release-4285F4?style=for-the-badge&logo=googlechrome" alt="Download Release" />
  </a>
</div>

![Platform](https://img.shields.io/badge/Platform-Google%20Chrome-blue)
![Tech](https://img.shields.io/badge/Tech-Manifest%20V3%20%7C%20JavaScript-green)
![License](https://img.shields.io/badge/License-MIT-purple)

**FocusGuard** is a robust Google Chrome extension built on Manifest V3. It is designed to block distractions and help users maintain deep focus during work sessions by leveraging background service workers, content scripts, and real-time DOM manipulation.

## 🚀 Features

- **Distraction Blocking:** Intercepts navigation to time-wasting sites.
- **Manifest V3 Architecture:** Built using the latest, most secure, and performant extension standards required by the Chrome Web Store.
- **Service Workers:** Uses background workers for low memory footprint and efficient event listening.
- **DOM Injection:** Uses content scripts and CSS injection to modify distracting elements on the fly.
- **Popup UI:** Clean and responsive popup interface for managing focus sessions and blocked domains.

## 🛠️ Architecture

- **`manifest.json`**: The heart of the extension, configured for Manifest V3 permissions (`declarativeNetRequest`, `storage`, `activeTab`, etc.).
- **`background.js`**: The service worker handling URL matching, storage state, and alarm triggers.
- **`content.js` & `content.css`**: Injected directly into web pages to enforce focus limits and visual changes.
- **`popup/`**: The HTML/JS/CSS files that render when the extension icon is clicked.

## 📦 Installation (Developer Mode)

1. Clone the repository:
   ```cmd
   git clone https://github.com/yourusername/FocusGuardExt.git
   cd FocusGuardExt
   ```
2. Open Google Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** in the top right corner.
4. Click **Load unpacked** and select the `FocusGuardExt` directory.
5. The extension will now appear in your browser toolbar.

## 📝 License

Distributed under the MIT License. See `LICENSE` for more information.
