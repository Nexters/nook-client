type TextField = HTMLInputElement | HTMLTextAreaElement;

/** Same-origin preview only: render a sample keyboard, never install in the application. */
export function attachPrototypeKeyboard(
  frame: HTMLIFrameElement,
  keyboard: HTMLElement,
  onVisibleChange: (visible: boolean) => void,
) {
  let field: TextField | null = null;
  let doc: Document | null = null;
  let korean = false;
  let numbers = false;
  let shifted = false;
  keyboard.hidden = true;
  keyboard.setAttribute('role', 'group');
  keyboard.setAttribute('aria-label', '프로토타입 샘플 키보드');

  const close = () => {
    field = null;
    keyboard.hidden = true;
    onVisibleChange(false);
  };
  const key = (label: string, action?: string, value?: string) => {
    const button = keyboard.ownerDocument.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.tabIndex = -1;
    if (action) button.dataset.action = action;
    else button.dataset.key = value ?? label;
    return button;
  };
  const paint = () => {
    keyboard.replaceChildren();
    const caption = keyboard.ownerDocument.createElement('div');
    caption.className = 'keyboard-caption';
    caption.textContent = '샘플 키보드 · PC 키보드로도 입력할 수 있어요';
    keyboard.append(caption);
    const rows = numbers
      ? ['1234567890', '-/:;()₩&@"', ".,?!'"]
      : korean
        ? ['ㅂㅈㄷㄱㅅㅛㅕㅑㅐㅔ', 'ㅁㄴㅇㄹㅎㅗㅓㅏㅣ', 'ㅋㅌㅊㅍㅠㅜㅡ']
        : ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
    rows.forEach((letters, index) => {
      const row = keyboard.ownerDocument.createElement('div');
      row.className = 'keyboard-row';
      if (index === 2) row.append(key('⇧', 'shift'));
      for (const letter of letters) row.append(key(shifted ? letter.toUpperCase() : letter));
      if (index === 2) row.append(key('⌫', 'delete'));
      keyboard.append(row);
    });
    const bottom = keyboard.ownerDocument.createElement('div');
    bottom.className = 'keyboard-row keyboard-bottom';
    bottom.append(
      key(numbers ? 'ABC' : '123', 'numbers'),
      key(korean ? 'ABC' : '한/영', 'language'),
      key('space', 'space'),
      key('검색', 'done'),
    );
    keyboard.append(bottom);
    const bar = keyboard.ownerDocument.createElement('div');
    bar.className = 'keyboard-home-indicator';
    keyboard.append(bar);
  };
  const isTextField = (target: EventTarget | null): target is TextField => {
    const element = target as HTMLElement | null;
    return Boolean(
      element &&
        (element.tagName === 'TEXTAREA' ||
          (element.tagName === 'INPUT' &&
            !['button', 'checkbox', 'radio', 'file', 'submit', 'range', 'color'].includes(
              (element as HTMLInputElement).type,
            ))),
    );
  };
  const focus = (event: FocusEvent) => {
    if (!isTextField(event.target) || event.target.readOnly || event.target.disabled) return;
    field = event.target;
    keyboard.hidden = false;
    onVisibleChange(true);
  };
  const blur = (event: FocusEvent) => {
    if (isTextField(event.relatedTarget)) return;
    close();
  };
  const connect = () => {
    doc?.removeEventListener('focusin', focus);
    doc?.removeEventListener('focusout', blur);
    close();
    try {
      doc = frame.contentDocument;
    } catch {
      doc = null;
    }
    doc?.addEventListener('focusin', focus);
    doc?.addEventListener('focusout', blur);
    if (isTextField(doc?.activeElement ?? null))
      focus({ target: doc?.activeElement } as unknown as FocusEvent);
  };
  const keepFocus = (event: PointerEvent) => event.preventDefault();
  const press = (event: MouseEvent) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button');
    if (!button || !field) return;
    const action = button.dataset.action;
    if (action === 'done') {
      field.blur();
      close();
      return;
    }
    if (action === 'language') {
      korean = !korean;
      numbers = false;
      paint();
      return;
    }
    if (action === 'numbers') {
      numbers = !numbers;
      paint();
      return;
    }
    if (action === 'shift') {
      shifted = !shifted;
      paint();
      return;
    }
    const input = field;
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? start;
    const deleting = action === 'delete';
    const from = deleting && start === end ? Math.max(0, start - 1) : start;
    const insertion = deleting ? '' : action === 'space' ? ' ' : (button.dataset.key ?? '');
    const next = input.value.slice(0, from) + insertion + input.value.slice(end);
    const view = input.ownerDocument.defaultView;
    if (!view) return;
    // Use the native setter so React's value tracker sees the subsequent input event.
    const prototype = Object.getPrototypeOf(input);
    Object.getOwnPropertyDescriptor(prototype, 'value')?.set?.call(input, next);
    input.dispatchEvent(new view.Event('input', { bubbles: true }));
    input.setSelectionRange(from + insertion.length, from + insertion.length);
  };
  paint();
  keyboard.addEventListener('pointerdown', keepFocus);
  keyboard.addEventListener('click', press);
  frame.addEventListener('load', connect);
  connect();
  return () => {
    doc?.removeEventListener('focusin', focus);
    doc?.removeEventListener('focusout', blur);
    frame.removeEventListener('load', connect);
    keyboard.removeEventListener('pointerdown', keepFocus);
    keyboard.removeEventListener('click', press);
    close();
  };
}
