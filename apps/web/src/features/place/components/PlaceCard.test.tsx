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

  it('thumbnailState 가 processing 이면 이름 대신 불러오는 중 문구를 보여준다', () => {
    render(<PlaceCard place={{ ...BASE, thumbnailState: 'processing' }} />);

    expect(screen.getByText('장소 정보 불러오는 중...')).toBeInTheDocument();
    expect(screen.queryByText('카페 온도')).not.toBeInTheDocument();
  });

  it('thumbnailState 가 failed 면 이름 대신 실패 문구를 보여준다', () => {
    render(<PlaceCard place={{ ...BASE, thumbnailState: 'failed' }} />);

    expect(screen.getByText('불러오지 못했어요.')).toBeInTheDocument();
    expect(screen.queryByText('카페 온도')).not.toBeInTheDocument();
  });
});
