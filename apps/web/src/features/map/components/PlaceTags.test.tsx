import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PlaceTags } from './PlaceTags';

afterEach(() => vi.restoreAllMocks());

describe('Drawer 태그 펼치기', () => {
  it('한 줄을 넘칠 때 펼치고 다시 접을 수 있다', () => {
    vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(54);
    render(<PlaceTags tags={['조용한', '커피가 맛있는', '작업하기 좋은']} />);
    const toggle = screen.getByRole('button', { name: '태그 펼치기' });
    const region = document.getElementById(toggle.getAttribute('aria-controls') ?? '');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(region).toHaveClass('max-h-6');
    fireEvent.click(toggle);
    expect(screen.getByRole('button', { name: '태그 접기' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(region).not.toHaveClass('max-h-6');
    fireEvent.click(toggle);
    expect(region).toHaveClass('max-h-6');
  });

  it('한 줄이면 펼치기 버튼을 표시하지 않는다', () => {
    vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(24);
    render(<PlaceTags tags={['조용한']} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
