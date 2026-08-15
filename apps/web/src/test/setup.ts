import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

/**
 * lottie-react(→ lottie-web)는 모듈 로드 시점에 `document.readyState` 를 100ms 마다 다시
 * 확인하는 타이머를 걸고, jsdom 에서는 그게 끝나지 않는다. 테스트 환경이 먼저 정리되면
 * 남은 타이머가 사라진 `document` 를 건드려 `ReferenceError` 를 던지는데, 이건 특정 테스트가
 * 아니라 그 순간 실행 중이던 파일에 붙어 unhandled error 로 뜬다 — 전부 통과해도 vitest 가
 * exit 1 을 내고 CI 가 간헐적으로 빨개진다(재현율 약 1/5).
 *
 * 테스트에서 실제 애니메이션 재생을 검증하지 않으므로 플레이어째로 대체해 lottie-web 을
 * 아예 로드하지 않는다. 실제 재생을 봐야 하면 `/dev/ui` 나 실기기에서 확인한다.
 */
vi.mock('lottie-react', () => ({ default: () => null }));

// 무한 스크롤 sentinel 이 IntersectionObserver 를 쓰는데 jsdom 에는 없다.
// 테스트에서는 관찰만 무시한다(교차 콜백은 발생하지 않음).
if (typeof globalThis.IntersectionObserver === 'undefined') {
  globalThis.IntersectionObserver = class IntersectionObserver {
    readonly root = null;
    readonly rootMargin = '';
    readonly thresholds: ReadonlyArray<number> = [];
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  };
}

// vaul(Drawer)이 콘텐츠 높이 측정에 ResizeObserver 를 쓰는데 jsdom 에는 없다.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// lottie-web 이 로드 시점에 canvas 지원 여부를 확인하는데, jsdom 의 getContext 는 항상
// null 을 반환해 그 확인 코드가 그대로 죽는다 — 2d 컨텍스트를 흉내낸 no-op 스텁으로 우회한다.
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = (() => ({
    fillRect: () => {},
    clearRect: () => {},
    getImageData: () => ({ data: [] }),
    putImageData: () => {},
    createImageData: () => [],
    setTransform: () => {},
    drawImage: () => {},
    save: () => {},
    restore: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    closePath: () => {},
    stroke: () => {},
    translate: () => {},
    scale: () => {},
    rotate: () => {},
    arc: () => {},
    fill: () => {},
    measureText: () => ({ width: 0 }),
    transform: () => {},
    rect: () => {},
    clip: () => {},
    // biome-ignore lint/suspicious/noExplicitAny: jsdom 이 CanvasRenderingContext2D 를 지원하지 않아 실제 타입을 만들 수 없다.
  })) as any;
}

// jsdom 에는 레이아웃이 없어 Element.scrollTo 도 없다(window 쪽만 있다).
// 스크롤 스냅으로 만든 스와이프 행처럼 스크롤 위치를 직접 되돌리는 코드가 있어 no-op 으로 채운다.
if (typeof Element !== 'undefined' && !Element.prototype.scrollTo) {
  Element.prototype.scrollTo = () => {};
}
