import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, test } from 'vitest';
import { UiComponentsPage } from './UiComponentsPage';

test('UiComponentsPage 가 런타임 오류 없이 렌더된다', () => {
  render(
    <MemoryRouter initialEntries={['/dev/ui']}>
      <UiComponentsPage />
    </MemoryRouter>,
  );
  expect(screen.getByRole('heading', { level: 1, name: 'UI Components' })).toBeInTheDocument();
  // 새로 추가한 섹션들이 실제로 붙었는지
  for (const title of ['Carousel (캐러셀)', 'Avatar (Img/Profile)', 'Thumbnail', 'Header']) {
    expect(screen.getByRole('heading', { level: 2, name: title })).toBeInTheDocument();
  }
});
