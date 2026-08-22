import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Place } from '../types';
import { PlaceCard } from './PlaceCard';

const BASE: Place = { id: '1', name: '카페 온도', category: '카페' };

describe('PlaceCard', () => {
  it('기본 카드는 이름과 지역·카테고리를 보여준다', () => {
    render(<PlaceCard place={BASE} />);

    expect(screen.getByText('카페 온도')).toBeInTheDocument();
    expect(screen.queryByText('장소 정보 불러오는 중...')).not.toBeInTheDocument();
    expect(screen.queryByText('불러오지 못했어요.')).not.toBeInTheDocument();
  });

  it('thumbnailState 가 processing 이면 이름 대신 불러오는 중 문구와 도는 스피너를 보여준다', () => {
    const { container } = render(<PlaceCard place={{ ...BASE, thumbnailState: 'processing' }} />);

    expect(screen.getByText('장소 정보 불러오는 중...')).toBeInTheDocument();
    expect(screen.queryByText('카페 온도')).not.toBeInTheDocument();
    // 정지된 아이콘이 아니라 실제로 돌아야 한다(QA).
    expect(container.querySelector('svg.animate-spin')).toBeInTheDocument();
  });

  it('thumbnailState 가 failed 여도 이름과 카테고리는 그대로 보여준다', () => {
    render(<PlaceCard place={{ ...BASE, region: '서울', thumbnailState: 'failed' }} />);

    // 실패한 건 장소 사진뿐이라 텍스트는 정상 카드와 같아야 한다.
    expect(screen.getByText('카페 온도')).toBeInTheDocument();
    expect(screen.getByText('서울 • 카페')).toBeInTheDocument();
    expect(screen.queryByText('불러오지 못했어요.')).not.toBeInTheDocument();
  });
});
