export function prototypeRemotePage(path: string) {
  if (path === '/archive' || path.startsWith('/archive/')) return 'archive';
  if (path === '/map' || path.startsWith('/map/')) return 'map';
  return null;
}

/** Tracks iframe SPA navigation as well as full page loads. */
export function attachPrototypeRemote(
  frame: HTMLIFrameElement,
  remote: HTMLElement,
  onPage: (page: 'archive' | 'map' | null) => void,
) {
  let observer: MutationObserver | undefined;
  let cleanup: (() => void) | undefined;
  function attach() {
    observer?.disconnect();
    cleanup?.();
    const win = frame.contentWindow;
    if (!win || !frame.contentDocument?.body) return;
    let previous: string | undefined;
    const update = () => {
      const path = win.location.pathname;
      if (path === previous) return;
      previous = path;
      const page = prototypeRemotePage(path);
      remote.querySelectorAll<HTMLElement>('[data-page]').forEach((section) => {
        section.hidden = section.dataset.page !== page;
      });
      remote.hidden = page === null;
      onPage(page);
    };
    observer = new MutationObserver(update);
    observer.observe(frame.contentDocument.body, { childList: true, subtree: true });
    win.addEventListener('popstate', update);
    cleanup = () => win.removeEventListener('popstate', update);
    update();
  }
  frame.addEventListener('load', attach);
  if (frame.contentDocument?.readyState === 'complete') attach();
  return () => {
    frame.removeEventListener('load', attach);
    observer?.disconnect();
    cleanup?.();
  };
}
