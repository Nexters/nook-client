import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
// '@/' alias 가 Vitest 에서도 해석되는지 함께 검증한다.
import { HomePage } from '@/features/home/HomePage';

describe('HomePage', () => {
  it('제목과 상태를 렌더한다', () => {
    render(<HomePage />);
    expect(screen.getByRole('heading', { name: 'nook' })).toBeInTheDocument();
    // jsdom 은 웹 플랫폼이므로 네이티브가 아니어야 한다.
    expect(screen.getByText('아니오 (웹)')).toBeInTheDocument();
  });
});
