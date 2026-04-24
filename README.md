# Real-time

Real-time은 유튜브 영상을 현재 배속 기준으로 볼 때, 실제로 얼마나 시간이 남았는지 보여주는 Chrome 확장프로그램입니다.

## 개요

유튜브의 기본 시간 표시는 영상 원본 시간을 기준으로 표시됩니다. 예를 들어 30분짜리 영상을 `1.5x`로 보고 있다면, 실제로 끝까지 보는 데 걸리는 시간은 30분보다 짧습니다.

Real-time은 유튜브의 재생 동작을 바꾸지 않고, 현재 배속을 반영한 실제 남은 시간을 작게 보여줍니다.

유튜브 기본 시간 표시 영역에 마우스를 올리면 다음과 같은 패널이 나타납니다.

```text
Adjusted time
Speed       1.5x
Real time   8:39
```

## 주요 기능

- 유튜브 기본 시간 표시 영역에 hover하면 작은 패널을 보여줍니다.
- 현재 배속 기준으로 실제 남은 시간을 계산합니다.
- 확장프로그램 popup의 `Real-time` 토글로 기능을 켜고 끌 수 있습니다.
- popup은 기기 라이트/다크 모드에 맞춰 색상이 바뀝니다.
- 유튜브 플레이어 컨트롤이 자동으로 사라지면 hover 패널도 함께 사라집니다.
- 유튜브 시간 표시 옆에 항상 보이는 별도 컨트롤을 추가하지 않습니다.

## 동작 방식

content script는 현재 활성화된 유튜브 video에서 다음 값을 읽습니다.

- `playbackRate`
- `currentTime`
- `duration`

실제 남은 시간은 아래 방식으로 계산합니다.

```text
실제 남은 시간 = (duration - currentTime) / playbackRate
```

가능하면 유튜브 player의 재생 속도를 먼저 읽고, 없으면 video element의 `playbackRate`를 사용합니다. 유튜브 UI가 갱신되는 순간 일시적으로 `1x`처럼 보이는 것을 줄이기 위해 마지막으로 확인한 유효한 배속을 짧게 캐시합니다.

## 로컬 설치

1. Chrome에서 `chrome://extensions`를 엽니다.
2. `Developer mode`를 켭니다.
3. `Load unpacked`를 클릭합니다.
4. `/Users/koo/Desktop/dev/vedioSpeedTime` 폴더를 선택합니다.
5. 파일을 수정한 뒤에는 확장프로그램을 reload합니다.

## 사용 방법

1. 유튜브 영상을 엽니다.
2. 유튜브 기본 시간 표시 영역에 마우스를 올립니다.
3. `Adjusted time` 패널에서 현재 배속과 실제 남은 시간을 확인합니다.
4. 기능을 끄거나 켜려면 확장프로그램 popup의 `Real-time` 토글을 사용합니다.

## 프로젝트 구조

- `manifest.json`: Chrome MV3 메타데이터, 권한, popup, 유튜브 content script 등록 정보
- `content.js`: 활성 유튜브 영상을 찾고, 실제 남은 시간을 계산하며, hover 패널을 렌더링하는 핵심 로직
- `styles.css`: 유튜브 페이지에 주입되는 hover 패널 스타일
- `popup.html`: 확장프로그램 popup 마크업
- `popup.js`: `chrome.storage.sync`를 사용하는 popup 토글 로직
- `popup.css`: popup 레이아웃, 토글 스타일, 라이트/다크 모드 색상

## 수동 테스트 체크리스트

현재 별도 빌드 단계나 자동 테스트는 없습니다. 변경 후 아래 순서로 확인합니다.

1. `chrome://extensions`에서 unpacked extension을 reload합니다.
2. 유튜브 영상을 엽니다.
3. 기본 시간 표시 옆에 항상 보이는 추가 컨트롤이 생기지 않는지 확인합니다.
4. 기본 시간 표시 영역에 hover했을 때 패널이 나타나는지 확인합니다.
5. 배속을 변경했을 때 `Speed`와 `Real time` 값이 갱신되는지 확인합니다.
6. 유튜브 컨트롤이 자동으로 사라질 때 패널도 함께 사라지는지 확인합니다.
7. popup의 `Real-time` 토글을 껐다 켰을 때 새로고침 없이 반영되는지 확인합니다.
8. 기기의 라이트/다크 모드에서 popup 색상이 자연스럽게 바뀌는지 확인합니다.

## 참고 사항

- 현재는 유튜브 전용 Chrome MV3 확장프로그램입니다.
- 이 확장프로그램은 재생 동작을 읽기만 합니다.
- `play()`, `pause()`, `setPlaybackRate()`를 호출하지 않습니다.
- 클릭이나 키보드 이벤트를 만들어 유튜브 컨트롤을 조작하지 않습니다.
- 플레이리스트, 자동재생, 탐색바, 재생 속도를 제어하지 않습니다.
- 현재 사용하는 Chrome 권한은 popup on/off 설정 저장을 위한 `storage`뿐입니다.
