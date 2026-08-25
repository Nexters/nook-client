/** iPadOS의 데스크톱 UA까지 포함해 iOS WebKit 환경인지 판별한다. */
function isIOSWebKit(): boolean {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

/**
 * iOS가 네이티브 전체화면 플레이어로 넘기지 않고 현재 레이아웃에서 재생할 수 있는지 확인한다.
 * 다른 브라우저는 표준 `playsinline`을 따르므로 iOS에서만 WebKit 미디어 쿼리로 제한한다.
 */
function canPlayInline(): boolean {
  if (!isIOSWebKit()) return true;
  return window.matchMedia?.('(-webkit-video-playable-inline)').matches ?? false;
}

/**
 * 인라인 속성과 음소거 상태를 재생보다 먼저 적용한다. 선언형 `autoPlay` 대신 순서를 명시해
 * WebView가 네이티브 전체화면 presentation을 먼저 선택하지 않게 한다.
 */
async function playInlineVideo(video: HTMLVideoElement, muted: boolean): Promise<boolean> {
  video.playsInline = true;
  video.setAttribute('playsinline', '');
  // iOS 10 이전 SDK로 링크된 WebKit 셸을 위한 레거시 호환 속성.
  video.setAttribute('webkit-playsinline', '');
  video.muted = muted;

  // 지원하지 않는 환경에서 play()를 부르면 iOS 네이티브 전체화면 플레이어가 열릴 수 있다.
  if (!canPlayInline()) return false;

  try {
    await video.play();
    return true;
  } catch {
    // 저전력 모드나 사용자 제스처 정책으로 거절되면 커스텀 재생 버튼을 그대로 보여준다.
    return false;
  }
}

export { playInlineVideo };
