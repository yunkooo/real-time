# YouTube Real-Time Cost

Chrome extension that shows how much real time is left on a YouTube video based on the current playback speed.

## What It Shows

On YouTube, the extension adds a compact pill near the default time display:

```text
2x · 5:48 남음
```

Hover or click the pill to see:

- 현재 배속
- 현실 남은 시간
- 현실 전체 소요
- 영상 원본 길이

## Load In Chrome

1. Open `chrome://extensions`.
2. Turn on Developer mode.
3. Click `Load unpacked`.
4. Select this folder: `/Users/koo/Desktop/dev/vedioSpeedTime`.

The extension popup has one setting: `배속 기준 남은 시간 표시`.

## Project Structure

- `manifest.json`: Chrome extension metadata, permissions, and YouTube content script registration
- `content.js`: Main YouTube page logic for finding the active video, calculating real-time duration, and rendering the pill/panel UI
- `styles.css`: Styles injected into YouTube pages
- `popup.html`: Extension popup markup
- `popup.js`: Popup setting behavior using `chrome.storage.sync`
- `popup.css`: Popup styling

## Manual Check

There is no build or automated test script yet. After changing the extension:

1. Open `chrome://extensions`.
2. Click reload on this unpacked extension.
3. Open a YouTube video page.
4. Check that the pill appears near the default time display.
5. Change playback speed and confirm the remaining time updates.
6. Hover or click the pill and confirm the detail panel opens.
7. Toggle `배속 기준 남은 시간 표시` in the popup and confirm the YouTube UI updates.
