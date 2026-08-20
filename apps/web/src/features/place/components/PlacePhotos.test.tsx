import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PlacePhotos } from './PlacePhotos';

describe('PlacePhotos', () => {
  it('사진이 없으면 아무것도 그리지 않는다 — 빈 회색 프레임으로 자리를 잡지 않는다', () => {
    const { container } = render(<PlacePhotos photos={[]} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('한 장이면 사진 태그 없이 그 사진만 보여준다', () => {
    render(<PlacePhotos photos={['https://img/1.jpg']} onPhotoClick={() => {}} />);

    expect(screen.getByRole('button', { name: '1번째 사진 크게 보기' })).toBeInTheDocument();
    expect(screen.queryByText('1/1')).not.toBeInTheDocument();
  });

  it('여러 장이면 우상단에 몇 번째인지 붙는다', () => {
    render(<PlacePhotos photos={['https://img/1.jpg', 'https://img/2.jpg']} />);

    expect(screen.getByText('1/2')).toBeInTheDocument();
  });
});
