# Real-time

Real-time은 영상 플랫폼에서 현재 배속 기준으로 실제 시간이 얼마나 남았는지 보여주는 Chrome 확장프로그램입니다.

## 개요

영상 플랫폼의 기본 시간 표시는 보통 영상 원본 시간을 기준으로 표시됩니다. 예를 들어 30분짜리 영상을 `1.5x`로 보고 있다면, 실제로 끝까지 보는 데 걸리는 시간은 30분보다 짧습니다.

Real-time은 재생 동작을 바꾸지 않고, 현재 배속을 반영한 실제 남은 시간을 작게 보여줍니다.

YouTube에서는 기본 시간 표시 영역에 마우스를 올리면 다음과 같은 패널이 나타납니다. Vimeo와 범용 video adapter에서는 영상 하단 progress bar 영역에 마우스를 올리면 영상 좌측 상단에서 같은 패널을 확인할 수 있습니다.

```text
Adjusted time
Speed       1.5x
Real time   8:39
```

## 주요 기능

- YouTube 기본 시간 표시 영역에 hover하면 작은 패널을 보여줍니다.
- Vimeo와 범용 video player에서는 progress bar 영역 hover 시 영상 좌측 상단 패널을 보여줍니다.
- 현재 배속 기준으로 실제 남은 시간을 계산합니다.
- 확장프로그램 popup의 `Real-time` 토글로 기능을 켜고 끌 수 있습니다.
- popup은 기기 라이트/다크 모드에 맞춰 색상이 바뀝니다.
- YouTube 플레이어 컨트롤이 자동으로 사라지면 hover 패널도 함께 사라집니다.
- YouTube 시간 표시 옆에 항상 보이는 별도 컨트롤을 추가하지 않습니다.

## 동작 방식

content script는 현재 활성화된 video에서 다음 값을 읽습니다.

- `playbackRate`
- `currentTime`
- `duration`

실제 남은 시간은 아래 방식으로 계산합니다.

```text
실제 남은 시간 = (duration - currentTime) / playbackRate
```

YouTube에서는 가능하면 player의 재생 속도를 먼저 읽고, 없으면 video element의 `playbackRate`를 사용합니다. Vimeo와 범용 video adapter에서는 video element의 `playbackRate`를 사용합니다. UI가 갱신되는 순간 일시적으로 `1x`처럼 보이는 것을 줄이기 위해 마지막으로 확인한 유효한 배속을 짧게 캐시합니다.

## 지원 구조

Real-time은 플랫폼별 adapter와 범용 video adapter를 함께 사용합니다.

- YouTube adapter: YouTube 기본 시간 표시 영역을 hover 대상으로 사용합니다.
- Vimeo adapter: Vimeo progress bar container를 hover 대상으로 사용하고, 패널은 영상 좌측 상단에 표시합니다.
- Generic video adapter: 사이트 전용 selector가 없을 때 `<video>` 하단 progress bar 영역에 overlay를 만들고, 패널은 영상 좌측 상단에 표시합니다.

Chrome content script는 `manifest.json`에 등록된 도메인에서만 실행됩니다. 현재 등록된 도메인은 YouTube와 Vimeo이며, 다른 비디오 사이트를 지원하려면 해당 도메인을 `matches`에 추가해서 범용 video adapter가 실행되도록 합니다.

## 로컬 설치

1. Chrome에서 `chrome://extensions`를 엽니다.
2. `Developer mode`를 켭니다.
3. `Load unpacked`를 클릭합니다.
4. `/Users/koo/Desktop/dev/vedioSpeedTime` 폴더를 선택합니다.
5. 파일을 수정한 뒤에는 확장프로그램을 reload합니다.

## 사용 방법

1. 유튜브 영상을 엽니다.
2. YouTube에서는 기본 시간 표시 영역에, Vimeo에서는 영상 하단 hover 영역에 마우스를 올립니다.
3. `Adjusted time` 패널에서 현재 배속과 실제 남은 시간을 확인합니다.
4. 기능을 끄거나 켜려면 확장프로그램 popup의 `Real-time` 토글을 사용합니다.

## 프로젝트 구조

- `manifest.json`: Chrome MV3 메타데이터, 권한, popup, content script 주입 순서
- `content-utils.js`: 시간 포맷, 활성 video 탐색, overlay trigger 생성 같은 공통 유틸
- `content-panel.js`: hover 패널 생성, 내용 렌더링, 위치 계산, 표시/숨김 처리
- `content.js`: 설정, 이벤트 listener, observer, adapter 선택을 담당하는 실행 흐름
- `adapters/youtube.js`: YouTube 시간 표시 영역과 player 배속 읽기 로직
- `adapters/vimeo.js`: Vimeo progress bar container와 fallback overlay 로직
- `adapters/generic.js`: 사이트 전용 selector 없이 `<video>` 위치 기준 overlay를 사용하는 범용 adapter
- `styles.css`: 영상 페이지에 주입되는 hover 패널과 video overlay hover 영역 스타일
- `popup.html`: 확장프로그램 popup 마크업
- `popup.js`: `chrome.storage.sync`를 사용하는 popup 토글 로직
- `popup.css`: popup 레이아웃, 토글 스타일, 라이트/다크 모드 색상

## 수동 테스트 체크리스트

현재 별도 빌드 단계나 자동 테스트는 없습니다. 변경 후 아래 순서로 확인합니다.

1. `chrome://extensions`에서 unpacked extension을 reload합니다.
2. YouTube 영상을 엽니다.
3. 기본 시간 표시 옆에 항상 보이는 추가 컨트롤이 생기지 않는지 확인합니다.
4. 기본 시간 표시 영역에 hover했을 때 패널이 나타나는지 확인합니다.
5. 배속을 변경했을 때 `Speed`와 `Real time` 값이 갱신되는지 확인합니다.
6. YouTube 컨트롤이 자동으로 사라질 때 패널도 함께 사라지는지 확인합니다.
7. popup의 `Real-time` 토글을 껐다 켰을 때 새로고침 없이 반영되는지 확인합니다.
8. 기기의 라이트/다크 모드에서 popup 색상이 자연스럽게 바뀌는지 확인합니다.
9. Vimeo 영상과 `player.vimeo.com` embed에서 progress bar 영역에 마우스를 올렸을 때 영상 좌측 상단에 패널이 나타나는지 확인합니다.
10. 새 도메인을 `manifest.json`에 추가했다면 해당 사이트의 HTML video에서 하단 progress bar 영역 진입 시 영상 좌측 상단에 패널이 나타나는지 확인합니다.

## 참고 사항

- 현재 `manifest.json`에는 YouTube와 Vimeo 도메인이 등록되어 있습니다.
- 다른 비디오 사이트는 도메인을 `matches`에 추가한 뒤 범용 video adapter로 확장합니다.
- 이 확장프로그램은 재생 동작을 읽기만 합니다.
- `play()`, `pause()`, `setPlaybackRate()`를 호출하지 않습니다.
- 클릭이나 키보드 이벤트를 만들어 유튜브 컨트롤을 조작하지 않습니다.
- 플레이리스트, 자동재생, 탐색바, 재생 속도를 제어하지 않습니다.
- 현재 사용하는 Chrome 권한은 popup on/off 설정 저장을 위한 `storage`뿐입니다.
