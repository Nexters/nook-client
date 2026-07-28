import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PlaceDirectInputDrawer } from './PlaceDirectInputDrawer';

describe('PlaceDirectInputDrawer', () => {
  it('열려 있으면 검색 인풋을 보여준다', () => {
    render(<PlaceDirectInputDrawer open onOpenChange={() => {}} />);

    expect(screen.getByPlaceholderText('장소명을 입력해주세요')).toBeInTheDocument();
  });

  it('검색어를 입력하면 이름이 일치하는 장소 목록이 뜬다', () => {
    render(<PlaceDirectInputDrawer open onOpenChange={() => {}} />);

    fireEvent.change(screen.getByPlaceholderText('장소명을 입력해주세요'), {
      target: { value: '앤미' },
    });

    expect(screen.getByText('앤미용실')).toBeInTheDocument();
  });

  it('일치하는 장소가 없으면 목록을 보여주지 않는다', () => {
    render(<PlaceDirectInputDrawer open onOpenChange={() => {}} />);

    fireEvent.change(screen.getByPlaceholderText('장소명을 입력해주세요'), {
      target: { value: '존재하지않는장소' },
    });

    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
});
