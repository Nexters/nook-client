import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { ArchiveViewFilterSheet } from './ArchiveViewFilterSheet';

it('keeps draft choices until Apply and resets them after dismissing', () => {
  const apply = vi.fn();
  const close = vi.fn();
  const value = { view: 'grid', sort: 'LATEST' } as const;
  const { rerender } = render(
    <ArchiveViewFilterSheet open onOpenChange={close} value={value} onApply={apply} />,
  );
  expect(screen.getByRole('radio', { name: '기본형' })).toBeChecked();
  fireEvent.click(screen.getByRole('radio', { name: '리스트형' }));
  fireEvent.click(screen.getByRole('radio', { name: '오래된순' }));
  expect(apply).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: '적용하기' }));
  expect(apply).toHaveBeenCalledWith({ view: 'list', sort: 'OLDEST' });
  rerender(
    <ArchiveViewFilterSheet open={false} onOpenChange={close} value={value} onApply={apply} />,
  );
  rerender(<ArchiveViewFilterSheet open onOpenChange={close} value={value} onApply={apply} />);
  expect(screen.getByRole('radio', { name: '기본형' })).toBeChecked();
  expect(screen.getByRole('radio', { name: '최신순' })).toBeChecked();
});
