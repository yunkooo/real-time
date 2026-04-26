# Real-time

<p align="center">
  <img src="./assets/icons/icon.svg" alt="Real-time icon" width="120" height="120" />
</p>

영상 플랫폼에서 현재 배속 기준으로 실제 남은 시간을 보여주는 Chrome 확장프로그램입니다.

영상 플랫폼의 기본 시간 표시는 보통 원본 영상 시간을 기준으로 표시됩니다. 하지만 `1.5x`, `2x`처럼 배속을 바꿔서 보고 있다면 실제로 남은 시간은 더 짧습니다.

Real-time은 현재 재생 배속을 반영해서 실제로 몇 분이 남았는지 영상 좌측 상단의 작은 box로 보여줍니다.

```text
Speed  2x
Time   15:00
```

## 현재 지원 사이트

<table align="center">
  <tr>
    <td align="center"><a href="https://www.youtube.com/"><img src="https://www.gstatic.com/marketing-cms/assets/images/08/25/fffdc76145f28be3a1ca63859c4a/external-logo-core-1.png%3Dn-w1860-h1047-fcrop64%3D1%2C00000000ffffffff-rw" width="82" alt="YouTube"></a></td>
    <td align="center"><a href="https://vimeo.com/"><img src="./assets/icons/vimeo_logo.svg" width="82" alt="Vimeo"></a></td>
    <td align="center"><a href="https://www.udemy.com/"><img src="./assets/icons/udemy.log.svg" width="82" alt="Udemy"></a></td>
  </tr>
  <tr>
    <td align="center"><a href="https://www.inflearn.com/"><img src="./assets/icons/inflearn_logo.svg" width="82" alt="Inflearn"></a></td>
    <td align="center"><a href="https://www.ebsi.co.kr/"><img src="./assets/icons/ebsi_logo.svg" width="82" alt="EBSi"></a></td>
    <td align="center"><a href="https://mid.ebs.co.kr/"><img src="./assets/icons/ebsMid_logo.svg" width="82" alt="EBS 중학"></a></td>
  </tr>
  <tr>
    <td align="center"><a href="https://www.kmooc.kr/"><img src="./assets/icons/kmooc_logo.svg" width="82" alt="K-MOOC"></a></td>
    <td align="center"></td>
    <td align="center"></td>
  </tr>
</table>

## 지원 구조

Real-time은 사이트별로 정해진 위치에 마우스를 올렸을 때 box를 표시합니다. 해당 위치를 찾지 못하거나 마우스를 올려도 표시할 수 없는 상태라면 현재 재생 중인 `video`를 기준으로 좌측 상단에 항상 표시합니다.

<table align="center">
  <tr>
    <th align="center">사이트</th>
    <th align="center">기본 표시 조건</th>
    <th align="center">fallback</th>
  </tr>
  <tr>
    <td align="center">YouTube</td>
    <td align="center">시간 표시 위치</td>
    <td align="center">영상 좌측 상단 always-on</td>
  </tr>
  <tr>
    <td align="center">Vimeo</td>
    <td align="center">동영상 진행 바</td>
    <td align="center">영상 좌측 상단 always-on</td>
  </tr>
  <tr>
    <td align="center">Udemy</td>
    <td align="center">시간 표시 위치</td>
    <td align="center">영상 좌측 상단 always-on</td>
  </tr>
  <tr>
    <td align="center">Inflearn</td>
    <td align="center">동영상 진행 바</td>
    <td align="center">영상 좌측 상단 always-on</td>
  </tr>
  <tr>
    <td align="center">EBSi</td>
    <td align="center">배속 설정 박스</td>
    <td align="center">영상 좌측 상단 always-on</td>
  </tr>
  <tr>
    <td align="center">EBS 중학</td>
    <td align="center">배속 표시 위치</td>
    <td align="center">영상 좌측 상단 always-on</td>
  </tr>
  <tr>
    <td align="center">K-MOOC</td>
    <td align="center">영상 프레임 안에서 마우스 움직임</td>
    <td align="center">영상 좌측 상단 always-on</td>
  </tr>
</table>

## 주요 기능

- 현재 배속 기준 실제 남은 시간 표시
- 사이트별 지정 위치에 마우스를 올렸을 때 우선 표시하고, 필요하면 영상 좌측 상단에 fallback 표시
- popup에서 기능 on/off 가능
- 영상 재생을 직접 조작하지 않는 읽기 전용 동작

## 사용 방법

1. 지원되는 영상 플랫폼에서 영상을 엽니다.
2. 원하는 배속으로 영상을 재생합니다.
3. 사이트별 지정 위치에 마우스를 올려 현재 배속과 실제 남은 시간을 확인합니다.

지정 위치를 찾지 못하거나 마우스를 올려도 표시할 수 없는 경우에는 영상 좌측 상단에 box가 항상 표시됩니다.

## 표시되는 정보

- `Speed`: 현재 재생 배속
- `Time`: 현재 배속 기준 실제 남은 시간

예를 들어 원본 기준으로 30분이 남았고 현재 배속이 `2x`라면 `Time`은 약 15분으로 표시됩니다.

시간은 1시간 미만이면 `15:00`처럼 표시되고, 1시간 이상이면 `1:05:00`처럼 표시됩니다.

## 설치 방법

1. Chrome에서 `chrome://extensions`를 엽니다.
2. `Developer mode`를 켭니다.
3. `Load unpacked`를 클릭합니다.
4. 이 프로젝트 폴더를 선택합니다.
5. 열려 있던 영상 페이지를 새로고침합니다.

## 동작 방식

Real-time은 현재 페이지의 video에서 다음 값을 읽어 실제 남은 시간을 계산합니다.

- 현재 재생 시간
- 전체 영상 길이
- 현재 재생 배속

계산 방식은 간단합니다.

```text
실제 남은 시간 = (전체 영상 길이 - 현재 재생 시간) / 현재 배속
```

## 문제가 있을 때

- 확장프로그램을 수정했다면 `chrome://extensions`에서 reload합니다.
- 이미 열려 있던 영상 페이지는 새로고침합니다.
- popup에서 Real-time 기능이 켜져 있는지 확인합니다.

## 참고

- 영상 재생, 일시정지, 배속 설정을 직접 바꾸지 않습니다.
- 현재 Chrome 권한은 설정 저장을 위한 `storage`만 사용합니다.

## 개인정보처리방침

- Privacy Policy: https://yunkooo.github.io/real-time/privacy.html
- Real-time은 popup의 on/off 설정을 저장하기 위해 Chrome `storage` 권한만 사용합니다.
- 영상의 현재 재생 시간, 전체 길이, 재생 배속은 실제 남은 시간을 계산하기 위해 브라우저 안에서만 읽고, 서버로 전송하거나 저장하지 않습니다.
