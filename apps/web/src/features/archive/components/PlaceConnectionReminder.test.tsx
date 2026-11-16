import { fireEvent, render, screen } from '@testing-library/react';
import { act } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { PlaceConnectionReminderCard } from './PlaceConnectionReminder';

const callbacks = () => ({ onDismiss: vi.fn(), onDisable: vi.fn(), onView: vi.fn() });
describe('place connection reminder design', () => {
  it.each([1, 2, 3, 12])('shows %i posts with up to three thumbnails', (count) => {
    render(
      <PlaceConnectionReminderCard
        count={count}
        thumbnails={['/1.png', '/2.png', '/3.png']}
        {...callbacks()}
      />,
    );
    expect(screen.getByText(`${count}개`)).toBeInTheDocument();
    expect(screen.getAllByRole('img')).toHaveLength(Math.min(count, 3));
    if (count > 3) expect(screen.getByText(`+${count - 3}`)).toBeInTheDocument();
  });
  it('supports the text-only design and keeps dismiss, opt-out and view distinct', () => {
    const actions = callbacks();
    render(<PlaceConnectionReminderCard count={2} thumbnails={[]} {...actions} />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '미연결 게시물 안내 닫기' }));
    fireEvent.click(screen.getByRole('button', { name: '다시 보지 않음' }));
    fireEvent.click(screen.getByRole('button', { name: '게시물 보기' }));
    expect(actions.onDismiss).toHaveBeenCalledOnce();
    expect(actions.onDisable).toHaveBeenCalledOnce();
    expect(actions.onView).toHaveBeenCalledOnce();
  });
  it('hides the banner when the count is zero', () => {
    render(<PlaceConnectionReminderCard count={0} thumbnails={[]} {...callbacks()} />);
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
  });
});

it('starts as text and expands the photo region after the reading pause', () => {
  vi.useFakeTimers();
  const { container, unmount } = render(
    <PlaceConnectionReminderCard count={2} thumbnails={['/1.png', '/2.png']} {...callbacks()} />,
  );
  expect(container.querySelector('.reminder-reveal')).toHaveAttribute('data-revealed', 'false');
  screen.getAllByRole('img').forEach((image) => {
    fireEvent.load(image);
  });
  act(() => vi.advanceTimersByTime(899));
  expect(container.querySelector('.reminder-reveal')).toHaveAttribute('data-revealed', 'false');
  act(() => vi.advanceTimersByTime(1));
  expect(container.querySelector('.reminder-reveal')).toHaveAttribute('data-revealed', 'true');
  unmount();
  vi.useRealTimers();
});

it('waits for slow photos before unfolding instead of popping them into an open banner', () => {
  vi.useFakeTimers();
  const { container, unmount } = render(
    <PlaceConnectionReminderCard count={2} thumbnails={['/1.png', '/2.png']} {...callbacks()} />,
  );
  act(() => vi.advanceTimersByTime(900));
  expect(container.querySelector('.reminder-reveal')).toHaveAttribute('data-revealed', 'false');
  fireEvent.load(screen.getByAltText('미연결 게시물 1'));
  expect(container.querySelector('.reminder-reveal')).toHaveAttribute('data-revealed', 'false');
  fireEvent.load(screen.getByAltText('미연결 게시물 2'));
  expect(container.querySelector('.reminder-reveal')).toHaveAttribute('data-revealed', 'true');
  unmount();
  vi.useRealTimers();
});
