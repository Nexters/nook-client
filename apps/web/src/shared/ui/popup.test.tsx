import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Popup } from './popup';

describe('Popup', () => {
  it('기본은 취소·확인 두 버튼이고 ESC 로 닫힌다', () => {
    const onClose = vi.fn();
    render(<Popup open onClose={onClose} title="제목" cancelLabel="취소" confirmLabel="확인" />);

    expect(screen.getByRole('button', { name: '취소' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '확인' })).toBeInTheDocument();

    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('cancelLabel 이 null 이면 취소 버튼 없이 확인 버튼만 그린다', () => {
    render(
      <Popup
        open
        onClose={() => undefined}
        title="제목"
        cancelLabel={null}
        confirmLabel="업데이트하기"
      />,
    );

    expect(screen.getByRole('button', { name: '업데이트하기' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '취소' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('dismissible 이 false 면 ESC 로도, 확인 버튼으로도 닫히지 않는다', () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();
    render(
      <Popup
        open
        dismissible={false}
        onClose={onClose}
        onConfirm={onConfirm}
        title="제목"
        cancelLabel={null}
        confirmLabel="업데이트하기"
      />,
    );

    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: '업데이트하기' }));

    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: '업데이트하기' })).toBeInTheDocument();
  });
});
