import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Place } from '../types';
import { PlaceCard } from './PlaceCard';

const BASE: Place = { id: '1', name: '카페 온도', category: '카페' };

describe('PlaceCard', () => {
  it('기본 카드는 이름을 보여주고 로딩/실패 표시가 없다', () => {
    render(<PlaceCard place={BASE} />);

    expect(screen.getByText('카페 온도')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('thumbnailState 가 processing 이면 로딩 스피너를 보여주고 이름은 그대로 보인다', () => {
    render(<PlaceCard place={{ ...BASE, thumbnailState: 'processing' }} />);

    expect(screen.getByRole('status', { name: '처리 중' })).toBeInTheDocument();
    expect(screen.getByText('카페 온도')).toBeInTheDocument();
  });

  it('thumbnailState 가 failed 면 실패 표시를 보여주고 이름은 그대로 보인다', () => {
    render(<PlaceCard place={{ ...BASE, thumbnailState: 'failed' }} />);

    expect(screen.getByRole('status', { name: '처리 실패' })).toBeInTheDocument();
    expect(screen.getByText('카페 온도')).toBeInTheDocument();
  });
});
