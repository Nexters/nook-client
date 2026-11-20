/** Simulate iOS env() in the preview iframe without changing the application's native CSS. */
export function installPrototypeSafeAreas(frame: HTMLIFrameElement) {
  let observer: MutationObserver | null = null;
  let doc: Document | null = null;
  let keyboardVisible = false;
  const replaceInsets = (value: string) =>
    value.replace(/env\(safe-area-inset-(top|bottom)(?:\s*,[^)]*)?\)/g, 'var(--prototype-safe-$1)');
  const patchInline = (element: Element) => {
    const value = element.getAttribute('style');
    if (value?.includes('safe-area-inset-')) element.setAttribute('style', replaceInsets(value));
  };
  const patchRules = (rules: CSSRuleList) => {
    for (const rule of Array.from(rules)) {
      if ('style' in rule) {
        const style = (rule as CSSStyleRule).style;
        if (style.cssText.includes('safe-area-inset-'))
          style.cssText = replaceInsets(style.cssText);
      }
      if ('cssRules' in rule) patchRules((rule as CSSGroupingRule).cssRules);
    }
  };
  const patchSheets = () => {
    if (!doc) return;
    for (const sheet of Array.from(doc.styleSheets)) {
      try {
        patchRules(sheet.cssRules);
      } catch {
        /* External fonts do not contain app safe areas. */
      }
    }
  };
  const connect = () => {
    observer?.disconnect();
    doc = frame.contentDocument;
    if (!doc) return;
    doc.documentElement.style.setProperty('--prototype-safe-top', '54px');
    doc.documentElement.style.setProperty(
      '--prototype-safe-bottom',
      keyboardVisible ? '0px' : '20px',
    );
    patchSheets();
    doc.querySelectorAll('[style]').forEach(patchInline);
    observer = new MutationObserver((records) => {
      let sheetsChanged = false;
      for (const record of records) {
        if (record.type === 'attributes' && record.target.nodeType === 1)
          patchInline(record.target as Element);
        for (const added of Array.from(record.addedNodes)) {
          if (added.nodeType !== 1) continue;
          const element = added as Element;
          patchInline(element);
          element.querySelectorAll('[style]').forEach(patchInline);
          if (element.tagName === 'STYLE' || element.querySelector('style')) sheetsChanged = true;
        }
        if ((record.target as Element).tagName === 'STYLE') sheetsChanged = true;
      }
      if (sheetsChanged) patchSheets();
    });
    observer.observe(doc.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['style'],
    });
  };
  frame.addEventListener('load', connect);
  connect();
  return {
    keyboard(visible: boolean) {
      keyboardVisible = visible;
      doc?.documentElement.style.setProperty('--prototype-safe-bottom', visible ? '0px' : '20px');
    },
    dispose() {
      observer?.disconnect();
      frame.removeEventListener('load', connect);
    },
  };
}
