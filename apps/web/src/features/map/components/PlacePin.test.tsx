import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PlacePin } from './PlacePin';

// 지도 인스턴스 없이 렌더하기 위한 최소 대역 — 오버레이는 자식을 그대로 그리는 역할만 한다.
vi.mock('react-naver-maps', () => ({
  CustomOverlay: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('PlacePin', () => {
  it('선택 + 썸네일이 있을 때만 사진 말풍선으로 바뀐다', () => {
    // 사진은 장식이라 alt="" (이름은 버튼 aria-label 이 갖는다) — role 이 아닌 태그로 찾는다.
    const { container, rerender } = render(
      <PlacePin
        lat={37}
        lng={127}
        name="퍼머넌트해비탯"
        color="blue"
        thumbnail="https://x/a.jpg"
      />,
    );
    // 선택되지 않았으면 썸네일이 있어도 기존 사각 핀이다.
    expect(container.querySelector('img')).toBeNull();

    rerender(
      <PlacePin
        lat={37}
        lng={127}
        name="퍼머넌트해비탯"
        color="blue"
        thumbnail="https://x/a.jpg"
        selected
      />,
    );
    expect(container.querySelector('img')).toHaveAttribute('src', 'https://x/a.jpg');

    // 썸네일이 없는 선택 상태는 사각 핀을 유지한다.
    rerender(<PlacePin lat={37} lng={127} name="퍼머넌트해비탯" color="blue" selected />);
    expect(container.querySelector('img')).toBeNull();
  });
});
