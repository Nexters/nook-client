import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { PrototypeWhatsNew } from './PrototypeWhatsNew';

vi.mock('@/shared/config/env', () => ({ env: { localPrototype: true } }));
vi.mock('@/features/whats-new/WhatsNewSheet', () => ({
  SAMPLE_WHATS_NEW: [],
  WhatsNewSheet: ({
    open,
    onOpenChange,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }) =>
    open ? (
      <button type="button" onClick={() => onOpenChange(false)}>
        업데이트 닫기
      </button>
    ) : null,
}));
afterEach(() => localStorage.removeItem('nook.prototype.whats-new.seen'));
function setup(path = '/map') {
  function Location() {
    return <output>{useLocation().search}</output>;
  }
  return render(
    <MemoryRouter initialEntries={[path]}>
      <PrototypeWhatsNew />
      <Location />
    </MemoryRouter>,
  );
}
it('opens a new version on map entry and remembers dismissing it', () => {
  const first = setup();
  expect(screen.getByRole('button', { name: '업데이트 닫기' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '업데이트 닫기' }));
  expect(screen.queryByRole('button')).toBeNull();
  expect(localStorage.getItem('nook.prototype.whats-new.seen')).toBe('1.4.0');
  first.unmount();
  setup();
  expect(screen.queryByRole('button')).toBeNull();
});
it('allows the QA link to replay an already seen version and removes only its parameter', () => {
  localStorage.setItem('nook.prototype.whats-new.seen', '1.4.0');
  setup('/archive?whatsNew=1&reminder=12');
  fireEvent.click(screen.getByRole('button', { name: '업데이트 닫기' }));
  expect(screen.getByRole('status')).toHaveTextContent('?reminder=12');
  expect(screen.queryByRole('button')).toBeNull();
});
