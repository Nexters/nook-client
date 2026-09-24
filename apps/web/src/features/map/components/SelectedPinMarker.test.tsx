import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { PlaceCategoryGroup } from '@/features/map/types';
import { SelectedPinMarker } from './SelectedPinMarker';

const GROUPS: PlaceCategoryGroup[] = [
  'CAFE',
  'SHOPPING',
  'RESTAURANT',
  'BAKERY',
  'BAR',
  'LODGING',
  'TOURISM',
  'ETC',
];

/** 두 번째 svg 가 글리프다(첫 번째는 물방울). */
function glyphOf(container: HTMLElement) {
  const svg = container.querySelectorAll('svg')[1];
  return { svg, path: svg?.querySelector('path') };
}

describe('SelectedPinMarker', () => {
  it('카테고리 그룹마다 다른 글리프를 그린다', () => {
    const paths = GROUPS.map((categoryGroup) => {
      const { container } = render(
        <SelectedPinMarker color="blue" categoryGroup={categoryGroup} />,
      );
      return glyphOf(container).path?.getAttribute('d');
    });

    expect(new Set(paths).size).toBe(GROUPS.length);
  });

  it('카테고리가 없거나 모르는 값이면 기타 글리프로 떨어진다', () => {
    const etc = glyphOf(
      render(<SelectedPinMarker color="blue" categoryGroup="ETC" />).container,
    ).path?.getAttribute('d');
    const missing = glyphOf(render(<SelectedPinMarker color="blue" />).container).path;
    const unknown = glyphOf(
      render(<SelectedPinMarker color="blue" categoryGroup={'PARK' as PlaceCategoryGroup} />)
        .container,
    ).path;

    expect(missing?.getAttribute('d')).toBe(etc);
    expect(unknown?.getAttribute('d')).toBe(etc);
  });

  it('구멍이 있는 글리프는 evenodd 를 유지한다', () => {
    const { container } = render(<SelectedPinMarker color="blue" categoryGroup="BAKERY" />);

    expect(glyphOf(container).path).toHaveAttribute('fill-rule', 'evenodd');
  });
});
