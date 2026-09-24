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

  try {
    await video.play();
    return true;
  } catch {
    // 저전력 모드나 사용자 제스처 정책으로 거절되면 커스텀 재생 버튼을 그대로 보여준다.
    return false;
  }
}

export { playInlineVideo };
