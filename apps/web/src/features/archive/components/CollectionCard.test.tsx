import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { CollectionSummary } from '../types';
import { CollectionCard } from './CollectionCard';

const BASE: CollectionSummary = { name: '카페', placeCount: 3 };

describe('CollectionCard', () => {
  it('정상 처리된 카드는 이름과 장소 수를 보여준다', () => {
    render(<CollectionCard archive={BASE} />);

    expect(screen.getByText('카페')).toBeInTheDocument();
    expect(screen.getByText('3 Places')).toBeInTheDocument();
  });

  it('처리 중이면 이름/장소 수 대신 로딩 표시를 보여준다', () => {
    render(<CollectionCard archive={{ ...BASE, processingState: 'processing' }} />);

    expect(screen.getByText('게시글 불러오는 중...')).toBeInTheDocument();
    expect(screen.queryByText('카페')).not.toBeInTheDocument();
    expect(screen.queryByText('3 Places')).not.toBeInTheDocument();
  });

  it('처리에 실패했으면 실패 표시를 보여준다', () => {
    render(<CollectionCard archive={{ ...BASE, processingState: 'failed' }} />);

    expect(screen.getByText('불러오지 못했어요.')).toBeInTheDocument();
    expect(screen.queryByText('카페')).not.toBeInTheDocument();
    expect(screen.queryByText('3 Places')).not.toBeInTheDocument();
  });
});
