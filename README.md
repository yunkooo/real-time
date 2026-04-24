# Real-time

Chrome extension that shows real remaining time on a YouTube video based on the current playback speed.

## What It Shows

On YouTube, hover the default time display to see:

- 현재 배속
- 현실 남은 시간

## Load In Chrome

1. Open `chrome://extensions`.
2. Turn on Developer mode.
3. Click `Load unpacked`.
4. Select the cloned repository folder.

The extension popup has one setting: `Real-time`.

## Project Structure

- `manifest.json`: Chrome extension metadata, permissions, and YouTube content script registration
- `content.js`: Main YouTube page logic for finding the active video, calculating real-time remaining duration, and rendering the hover panel UI
- `styles.css`: Styles injected into YouTube pages
- `popup.html`: Extension popup markup
- `popup.js`: Popup setting behavior using `chrome.storage.sync`
- `popup.css`: Popup styling

## Manual Check

There is no build or automated test script yet. After changing the extension:

1. Open `chrome://extensions`.
2. Click reload on this unpacked extension.
3. Open a YouTube video page.
4. Check that no extra pill appears near the default time display.
5. Hover the default time display and confirm the detail panel opens.
6. Change playback speed and confirm the remaining time updates.
7. Toggle `Real-time` in the popup and confirm the YouTube UI updates.
