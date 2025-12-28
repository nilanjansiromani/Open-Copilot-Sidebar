# OpenCopilot - Firefox Version

This folder contains the Firefox compatible version of OpenCopilot.

## Installation

1. Open Firefox
2. Navigate to `about:debugging`
3. Click "This Firefox" in the left sidebar
4. Click "Load Temporary Add-on"
5. Select `manifest.json` from this `firefox` folder
6. The sidebar will be available via the extension icon

## Usage

- Click the extension icon to open the sidebar
- Use `Ctrl+Shift+O` (Mac: `Command+Shift+O`) to toggle the sidebar
- Use `Ctrl+Shift+K` (Mac: `Command+Shift+K`) to open settings

## Features

- Native Firefox Sidebar integration
- All features from the main extension
- Optimized for Firefox APIs
- Uses `browser.*` APIs with `chrome.*` fallback for compatibility

## Differences from Chrome Version

- Uses Firefox's `sidebarAction` API instead of `sidePanel`
- Uses `browser.*` namespace (with `chrome.*` fallback)
- Manifest structure optimized for Firefox
- Background script uses regular script (not service worker)

## Notes

- Firefox supports both `browser.*` and `chrome.*` APIs
- This version prioritizes `browser.*` for better Firefox compatibility
- All Firefox extension APIs are supported

For detailed usage instructions, see the main [README.md](../README.md) and [USER_GUIDE.md](../docs/USER_GUIDE.md).

