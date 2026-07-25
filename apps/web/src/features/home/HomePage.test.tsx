import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
// '@/' alias 가 Vitest 에서도 해석되는지 함께 검증한다.
import { HomePage } from '@/features/home/HomePage';

describe('HomePage', () => {
  it('제목을 렌더한다', () => {
    render(<HomePage />);
    expect(screen.getByRole('heading', { name: 'nook' })).toBeInTheDocument();
  });
});
