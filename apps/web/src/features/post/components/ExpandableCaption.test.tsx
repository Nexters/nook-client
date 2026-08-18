import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ExpandableCaption } from './ExpandableCaption';

const CAPTION = '초록뷰가 아름다운 카페 공간';

describe('ExpandableCaption', () => {
  it('접혀 있을 땐 본문이 버튼이 아니고 "더보기"로만 펼친다', () => {
    render(<ExpandableCaption caption={CAPTION} />);

    expect(screen.queryByRole('button', { name: CAPTION })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '더보기' }));
    expect(screen.getByRole('button', { name: '접기' })).toBeInTheDocument();
  });

  it('펼친 뒤에는 본문을 눌러도 접힌다', () => {
    render(<ExpandableCaption caption={CAPTION} />);

    fireEvent.click(screen.getByRole('button', { name: '더보기' }));
    fireEvent.click(screen.getByRole('button', { name: CAPTION }));

    expect(screen.getByRole('button', { name: '더보기' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: CAPTION })).not.toBeInTheDocument();
  });

  it('본문 텍스트를 고르는 중이면 눌러도 접히지 않는다', () => {
    render(<ExpandableCaption caption={CAPTION} />);

    fireEvent.click(screen.getByRole('button', { name: '더보기' }));
    const body = screen.getByRole('button', { name: CAPTION });

    const range = document.createRange();
    range.selectNodeContents(body);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    fireEvent.click(body);

    expect(screen.getByRole('button', { name: '접기' })).toBeInTheDocument();
    selection?.removeAllRanges();
  });

  it('"접기" 버튼으로도 접힌다', () => {
    render(<ExpandableCaption caption={CAPTION} />);

    fireEvent.click(screen.getByRole('button', { name: '더보기' }));
    fireEvent.click(screen.getByRole('button', { name: '접기' }));

    expect(screen.getByRole('button', { name: '더보기' })).toBeInTheDocument();
  });
});
