import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { act } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/shared/toast';
import { PrototypePlaceContextMenu } from './PrototypePlaceContextMenu';

vi.mock('@/shared/config/env', async (original) => {
  const actual = await original<typeof import('@/shared/config/env')>();
  return { env: { ...actual.env, localPrototype: true } };
});
const place = { id: '1', name: '오후의 커피', category: '카페', region: '성수동' };
function setup(shared = false) {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <PrototypePlaceContextMenu place={place} shared={shared}>
          <button type="button">장소 카드</button>
        </PrototypePlaceContextMenu>
      </ToastProvider>
    </MemoryRouter>,
  );
}
afterEach(() => vi.useRealTimers());
it('opens a menu on right click and supports cancelable mock deletion', async () => {
  setup();
  fireEvent.contextMenu(screen.getByText('장소 카드'), { clientX: 80, clientY: 200 });
  expect(await screen.findByRole('menuitem', { name: '공유하기' })).toBeInTheDocument();
  expect(screen.queryByText('오후의 커피')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('menuitem', { name: '아카이브에서 삭제' }));
  fireEvent.click(await screen.findByRole('button', { name: '삭제' }));
  await waitFor(() => expect(screen.queryByText('장소 카드')).not.toBeInTheDocument());
  fireEvent.click(await screen.findByRole('button', { name: '취소' }));
  expect(await screen.findByText('장소 카드')).toBeInTheDocument();
});
it('does not expose deletion for shared places', async () => {
  setup(true);
  fireEvent.contextMenu(screen.getByText('장소 카드'));
  expect(await screen.findByRole('menuitem', { name: '공유하기' })).toBeInTheDocument();
  expect(screen.queryByRole('menuitem', { name: '아카이브에서 삭제' })).not.toBeInTheDocument();
});
it('opens on mouse hold and cancels a hold when dragged', () => {
  vi.useFakeTimers();
  const { container } = setup();
  const trigger = container.querySelector('[data-prototype-place]');
  if (!trigger) throw new Error('missing trigger');
  fireEvent.pointerDown(trigger, { pointerType: 'mouse', button: 0, clientX: 20, clientY: 20 });
  fireEvent.pointerMove(trigger, { pointerType: 'mouse', clientX: 50, clientY: 20 });
  act(() => vi.advanceTimersByTime(700));
  expect(screen.queryByRole('menuitem')).not.toBeInTheDocument();
  fireEvent.pointerDown(trigger, { pointerType: 'mouse', button: 0, clientX: 20, clientY: 20 });
  act(() => vi.advanceTimersByTime(700));
  expect(screen.getByRole('menuitem', { name: '공유하기' })).toBeInTheDocument();
});
