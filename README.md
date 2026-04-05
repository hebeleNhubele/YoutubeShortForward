# YouTube Shorts Auto-Scroller

Chrome extension for hands-free YouTube Shorts viewing. It adds a floating Start/Stop button and automatically moves to the next Short when the current one ends.

## Features

- Auto-advance to next Short near video end
- Draggable floating control button
- Drag threshold to prevent accidental click/toggle while moving the button
- Button position persisted with localStorage
- SPA-aware behavior for YouTube navigation changes
- Multi-language "Next" button detection
- Popup action to reset button position

## Installation

1. Download or clone this repository.
2. Open Chrome and go to `chrome://extensions/`.
3. Enable Developer mode.
4. Click Load unpacked.
5. Select the repository folder.

## Usage

1. Open YouTube Shorts.
2. Click the floating button to Start/Stop auto-scroll.
3. Drag the button to reposition.
4. Use the extension popup and click Reset Button Position when needed.

## Project Structure

```
youtube-shorts-auto-scroller/
├── manifest.json
├── content.js
├── background.js
├── popup.html
├── popup.js
├── icon16.png
├── icon48.png
├── icon128.png
└── README.md
```

## Permissions

- `alarms`: background scheduling support
- `scripting`: script injection and tab execution
- `tabs`: query and target YouTube tabs
- `host_permissions` on `*://*.youtube.com/*`: run on YouTube pages including SPA transitions

## Troubleshooting

- Button not visible: make sure the URL is a Shorts route (`/shorts/...`).
- Position lost/off-screen: use popup Reset Button Position.
- If behavior looks stale after local code edits: reload the extension from `chrome://extensions/`.

## Technical Notes

- The content script handles button UI, drag behavior, and end-of-video detection.
- The background service worker supports startup/install injection and alarm-based helpers.
- A duplicate-injection guard prevents multiple initializations in the same tab.

## Version History

### v2.1 (Current)

- Fixed SPA entry issue where button could fail to appear without manual refresh
- Registered background service worker in manifest
- Added `alarms`, `scripting`, and `tabs` permissions
- Expanded matching from `/shorts/*` to `*://*.youtube.com/*` for SPA consistency
- Added startup/install injection for already-open YouTube tabs
- Added duplicate content-script initialization guard
- Resolved popup HTML merge-conflict leftovers

### v2.0

- Refactor toward service-worker-assisted scheduling architecture
- Improved matching and fallback logic for advancing Shorts

## 🤝 Contributing

Feel free to submit issues, feature requests, or pull requests!

### Potential Improvements
- Support for other platforms (TikTok, Instagram, Twitter)
- Customizable timing settings
- Keyboard shortcuts
- Dark/light theme options

## 📄 License

MIT License - Feel free to modify and distribute

## 👨‍💻 Author

Created by Abdullah Anbar

---

**Enjoy hands-free YouTube Shorts browsing! 🎬**