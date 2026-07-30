import '@testing-library/jest-dom/vitest';

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
