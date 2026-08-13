import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PlacePin } from './PlacePin';

// 지도 인스턴스 없이 렌더하기 위한 최소 대역 — 오버레이는 자식을 그대로 그리는 역할만 한다.
vi.mock('react-naver-maps', () => ({
  CustomOverlay: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('PlacePin', () => {
  it('기본 상태는 장소 사진 핀이다', () => {
    // 사진은 장식이라 alt="" (이름은 버튼 aria-label 이 갖는다) — role 이 아닌 태그로 찾는다.
    const { container } = render(
      <PlacePin
        lat={37}
        lng={127}
        name="퍼머넌트해비탯"
        color="blue"
        thumbnail="https://x/a.jpg"
      />,
    );

    expect(container.querySelector('img')).toHaveAttribute('src', 'https://x/a.jpg');
    expect(screen.getByRole('button', { name: '퍼머넌트해비탯' })).toBeInTheDocument();
  });

  it('썸네일이 없으면 빈 썸네일 고스트로 대체한다', () => {
    const { container } = render(
      <PlacePin lat={37} lng={127} name="퍼머넌트해비탯" color="blue" />,
    );

    const image = container.querySelector('img');
    expect(image).not.toBeNull();
    expect(image).not.toHaveAttribute('src', '');
  });

  it('선택되면 사진 대신 물방울 마커를 그린다', () => {
    const { container, rerender } = render(
      <PlacePin
        lat={37}
        lng={127}
        name="퍼머넌트해비탯"
        color="blue"
        thumbnail="https://x/a.jpg"
      />,
    );
    expect(container.querySelector('svg')).toBeNull();

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
    // 선택 상태에서는 썸네일이 있어도 사진을 쓰지 않는다.
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelectorAll('svg')).toHaveLength(2); // 물방울 + 글리프
  });

  it('물방울은 그룹 색상을 따르고, 밝은 색 위에서는 글리프를 어둡게 뒤집는다', () => {
    const { container, rerender } = render(
      <PlacePin lat={37} lng={127} name="장소" color="purple" selected />,
    );
    const [shape, glyph] = [...container.querySelectorAll('svg')];
    expect(shape).toHaveClass('text-purple');
    expect(glyph).toHaveClass('text-gray-0');

    // yellow 는 흰 글리프가 안 보일 만큼 밝다(L* 86).
    rerender(<PlacePin lat={37} lng={127} name="장소" color="yellow" selected />);
    const [lightShape, lightGlyph] = [...container.querySelectorAll('svg')];
    expect(lightShape).toHaveClass('text-yellow');
    expect(lightGlyph).toHaveClass('text-gray-100');
  });
});
