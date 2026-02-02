# YouTube Shorts Auto-Scroller

A modern Chrome extension that automatically scrolls to the next YouTube Short when the current video ends, providing a hands-free viewing experience.

## ✨ Features

- **Auto-scroll functionality** - Automatically advances to next Short when video ends
- **Modern floating button** - Sleek circular design with glass morphism effect
- **Draggable interface** - Move the button anywhere on screen
- **Smart click detection** - Prevents accidental toggles while dragging
- **Position memory** - Remembers button position across sessions
- **Background operation** - Limited functionality when tab is in background
- **Multi-language support** - Works with YouTube in different languages

## 🎮 How to Use

1. **Install the extension** and go to YouTube Shorts
2. **Click the floating button** to start/stop auto-scrolling
3. **Drag the button** to reposition it anywhere on screen
4. **Use extension popup** to reset button position to default

## 🔧 Installation

### From Source
1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (top right toggle)
4. Click "Load unpacked" and select the extension folder
5. Navigate to YouTube Shorts and enjoy!

### Files Structure
```
youtube-shorts-auto-scroller/
├── manifest.json          # Extension configuration
├── content.js            # Main functionality
├── popup.html           # Settings interface
├── popup.js             # Settings logic
├── icon16.png           # Extension icon (16x16)
├── icon48.png           # Extension icon (48x48)
├── icon128.png          # Extension icon (128x128)
└── README.md            # This file
```

## 🎨 Button States

- **⚫ Dark Circle + Play Icon** - Auto-scroll is OFF
- **🟢 Green Circle + Pause Icon** - Auto-scroll is ON
- **Hover Effect** - Button scales up with enhanced glow

## ⚙️ Settings

Click the extension icon in Chrome toolbar to access:
- **Reset Button Position** - Moves button back to default location

## 🛠️ Quick Fixes

### Reset Button Position (Console Method)
If the button gets stuck or positioned off-screen:
1. Open browser console (F12)
2. Run: `localStorage.removeItem('yt-shorts-auto-scroll-btn-pos');`
3. Refresh the page

### Troubleshooting
- **Button not appearing**: Make sure you're on a YouTube Shorts page (`/shorts/`)
- **Auto-scroll not working**: Check if videos are actually playing (not paused)
- **Background operation**: Limited functionality when tab is not active (browser limitation)

## 🌐 Browser Compatibility

- **Chrome** - Full support (Manifest V3)
- **Edge** - Should work (Chromium-based)
- **Firefox** - Requires manifest conversion
- **Safari** - Not supported

## 🔒 Permissions

- `storage` - Save button position preferences
- `scripting` - Inject functionality into YouTube pages
- `activeTab` - Access current tab for settings

## 🚀 Background Operation

**✅ Works:**
- When YouTube tab is in background but browser window is open
- When browser window is behind other windows

**❌ Limited/Won't work:**
- When browser is minimized to taskbar
- When computer is locked or sleeping
- On mobile browsers (different limitations)

## 🎯 Technical Details

### How It Works
1. **Video Detection** - Monitors `ytd-reel-video-renderer video` elements
2. **Progress Tracking** - Uses `timeupdate` events to detect when video is near end
3. **Navigation** - Clicks "Next" button or uses keyboard shortcut (J key)
4. **SPA Handling** - Monitors URL changes for YouTube's single-page app navigation

### Auto-Scroll Trigger
- Activates when **1 second or less** remains in video
- Only triggers if video is **playing** (not paused)
- Includes **multiple language support** for "Next" button detection

## 🔄 Version History

### v1.3 (Current)
- Modern circular button design with glass morphism
- Enhanced drag handling with click prevention
- Improved background operation
- Better error handling and logging
- Settings popup with position reset

### v1.2
- Added draggable button functionality
- Position memory across sessions
- SPA navigation support

### v1.1
- Initial auto-scroll functionality
- Basic button interface

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