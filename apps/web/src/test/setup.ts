import '@testing-library/jest-dom/vitest';

// vaul(Drawer)이 콘텐츠 높이 측정에 ResizeObserver 를 쓰는데 jsdom 에는 없다.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
