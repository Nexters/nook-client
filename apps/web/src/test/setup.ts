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
