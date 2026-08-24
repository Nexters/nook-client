import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SelectedPinMarker } from './SelectedPinMarker';

/** 두 번째 svg(글리프)의 path — 첫 번째 svg 는 물방울 도형이라 건너뛴다. */
function glyphPath(container: HTMLElement) {
  const path = container.querySelectorAll('svg')[1]?.querySelector('path');
  expect(path).not.toBeNull();
  return path as SVGPathElement;
}

describe('SelectedPinMarker', () => {
  it('카테고리마다 다른 글리프를 그린다', () => {
    const cafe = render(<SelectedPinMarker color="blue" category="카페" />);
    const park = render(<SelectedPinMarker color="blue" category="공원" />);

    expect(glyphPath(cafe.container).getAttribute('d')).not.toBe(
      glyphPath(park.container).getAttribute('d'),
    );
  });

  it('서버 값 "음식점"은 "식당" 글리프로 그린다', () => {
    const restaurant = render(<SelectedPinMarker color="blue" category="식당" />);
    const server = render(<SelectedPinMarker color="blue" category="음식점" />);

    expect(glyphPath(server.container).getAttribute('d')).toBe(
      glyphPath(restaurant.container).getAttribute('d'),
    );
  });

  it('모르는 카테고리와 미지정은 "기타" 글리프로 그린다', () => {
    const etc = render(<SelectedPinMarker color="blue" category="기타" />);
    const unknown = render(<SelectedPinMarker color="blue" category="노래방" />);
    const missing = render(<SelectedPinMarker color="blue" />);

    const etcD = glyphPath(etc.container).getAttribute('d');
    expect(glyphPath(unknown.container).getAttribute('d')).toBe(etcD);
    expect(glyphPath(missing.container).getAttribute('d')).toBe(etcD);
  });

  // 시안 SVG 가 evenodd 인 글리프는 규칙이 빠지면 속이 메워진 실루엣으로 그려진다.
  it('빵집·술집 글리프는 evenodd 채움 규칙을 유지한다', () => {
    for (const category of ['빵집', '술집']) {
      const { container } = render(<SelectedPinMarker color="blue" category={category} />);
      expect(glyphPath(container).getAttribute('fill-rule')).toBe('evenodd');
    }
  });
});
