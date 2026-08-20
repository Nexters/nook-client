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

  it('처리 중이라도 폴링으로 먼저 온 썸네일이 있으면 그 사진을 딤 처리해 보여준다', () => {
    const { container } = render(
      <CollectionCard
        archive={{ ...BASE, processingState: 'processing', thumbnails: ['https://img/1.jpg'] }}
      />,
    );

    expect(container.querySelector('[data-slot="thumbnail"] img')).toHaveAttribute(
      'src',
      'https://img/1.jpg',
    );
    expect(container.querySelector('[data-slot="thumbnail-dim"]')).toBeInTheDocument();
    // 사진이 채워져도 아직 처리 중이라는 문구는 계속 남아야 한다.
    expect(screen.getByText('게시글 불러오는 중...')).toBeInTheDocument();
  });

  it('처리 중이고 썸네일도 아직 없으면 고스트만 보여준다 — 딤 없이', () => {
    const { container } = render(
      <CollectionCard archive={{ ...BASE, processingState: 'processing' }} />,
    );

    expect(container.querySelector('[data-slot="thumbnail-dim"]')).not.toBeInTheDocument();
  });

  it('처리에 실패했으면 실패 표시를 보여준다 — 남아 있는 썸네일도 고스트로 되돌린다', () => {
    const { container } = render(
      <CollectionCard
        archive={{ ...BASE, processingState: 'failed', thumbnails: ['https://img/1.jpg'] }}
      />,
    );

    expect(screen.getByText('불러오지 못했어요.')).toBeInTheDocument();
    expect(screen.queryByText('카페')).not.toBeInTheDocument();
    expect(screen.queryByText('3 Places')).not.toBeInTheDocument();
    expect(container.querySelector('[data-slot="thumbnail"] img')).not.toHaveAttribute(
      'src',
      'https://img/1.jpg',
    );
  });
});
