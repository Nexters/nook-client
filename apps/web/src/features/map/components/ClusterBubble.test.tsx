import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ClusterBubble } from './ClusterBubble';

// 지도 인스턴스 없이 렌더하기 위한 최소 대역 — 오버레이는 자식을 그대로 그리는 역할만 한다.
vi.mock('react-naver-maps', () => ({
  CustomOverlay: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('ClusterBubble', () => {
  it('개수를 보여주고 누르면 콜백이 실행된다', async () => {
    const onClick = vi.fn();
    render(<ClusterBubble lat={37} lng={127} count={29} onClick={onClick} />);

    const button = screen.getByRole('button', { name: /29곳/ });
    expect(button).toHaveTextContent('29');

    button.click();
    expect(onClick).toHaveBeenCalledOnce();
  });
});
