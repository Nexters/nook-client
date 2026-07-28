import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { PlaceDirectInputDrawer } from './PlaceDirectInputDrawer';

describe('PlaceDirectInputDrawer', () => {
  it('열려 있으면 검색 인풋을 보여준다', () => {
    render(<PlaceDirectInputDrawer open onOpenChange={() => {}} onPlaceConfirmed={() => {}} />);

    expect(screen.getByPlaceholderText('장소명을 입력해주세요')).toBeInTheDocument();
  });

  it('검색어를 입력하면 이름이 일치하는 장소 목록이 뜬다', () => {
    render(<PlaceDirectInputDrawer open onOpenChange={() => {}} onPlaceConfirmed={() => {}} />);

    fireEvent.change(screen.getByPlaceholderText('장소명을 입력해주세요'), {
      target: { value: '앤미' },
    });

    expect(screen.getByText('앤미용실')).toBeInTheDocument();
  });

  it('일치하는 장소가 없으면 목록을 보여주지 않는다', () => {
    render(<PlaceDirectInputDrawer open onOpenChange={() => {}} onPlaceConfirmed={() => {}} />);

    fireEvent.change(screen.getByPlaceholderText('장소명을 입력해주세요'), {
      target: { value: '존재하지않는장소' },
    });

    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('검색 결과를 누르면 장소 상세로 전환된다', () => {
    render(<PlaceDirectInputDrawer open onOpenChange={() => {}} onPlaceConfirmed={() => {}} />);

    fireEvent.change(screen.getByPlaceholderText('장소명을 입력해주세요'), {
      target: { value: '앤미' },
    });
    fireEvent.click(screen.getByText('앤미용실'));

    expect(screen.getByText('서울대입구역 2번 출구')).toBeInTheDocument();
  });

  it('상세에서 게시물을 누르면 이미지 뷰어가 뜬다', () => {
    // PostImageViewer 의 Header 가 BackButton(공용, useNavigate 를 무조건 호출)을 쓰므로
    // 이 테스트만 Router 컨텍스트가 필요하다 — 다른 테스트들은 PostImageViewer 를 렌더하지 않는다.
    render(
      <MemoryRouter>
        <PlaceDirectInputDrawer open onOpenChange={() => {}} onPlaceConfirmed={() => {}} />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByPlaceholderText('장소명을 입력해주세요'), {
      target: { value: '앤미' },
    });
    fireEvent.click(screen.getByText('앤미'));
    const [firstThumbnail] = screen.getAllByRole('button', { name: '게시물 크게 보기' });
    if (!firstThumbnail) throw new Error('게시물 썸네일을 찾지 못했다.');
    fireEvent.click(firstThumbnail);

    expect(screen.getByRole('button', { name: '뒤로 가기' })).toBeInTheDocument();
  });

  it('상세에서 "추가하기"를 누르면 onPlaceConfirmed 가 해당 장소로 호출된다', () => {
    const onPlaceConfirmed = vi.fn();
    render(
      <PlaceDirectInputDrawer open onOpenChange={() => {}} onPlaceConfirmed={onPlaceConfirmed} />,
    );

    fireEvent.change(screen.getByPlaceholderText('장소명을 입력해주세요'), {
      target: { value: '앤미' },
    });
    fireEvent.click(screen.getByText('앤미'));
    // Drawer(vaul→Radix Dialog)가 열려 있으면 Radix 가 이 형제 버튼을 aria-hidden 처리한다
    // (컴포넌트 주석 참고) — 실제 브라우저에서는 pointer-events-auto 덕에 눌리지만, RTL 의
    // 기본 getByRole 은 접근성 트리에서 숨겨진 요소를 제외하므로 hidden:true 로 포함시킨다.
    fireEvent.click(screen.getByRole('button', { name: '추가하기', hidden: true }));

    expect(onPlaceConfirmed).toHaveBeenCalledWith(expect.objectContaining({ id: 'search-1' }));
  });

  it('부모가 open 을 false 로 바꿔 닫으면 다시 열었을 때 검색 목록부터 다시 보여준다', () => {
    const { rerender } = render(
      <PlaceDirectInputDrawer open onOpenChange={() => {}} onPlaceConfirmed={() => {}} />,
    );
    fireEvent.change(screen.getByPlaceholderText('장소명을 입력해주세요'), {
      target: { value: '앤미' },
    });
    fireEvent.click(screen.getByText('앤미'));
    expect(screen.getByText('서울대입구역 2번 출구')).toBeInTheDocument();

    rerender(
      <PlaceDirectInputDrawer open={false} onOpenChange={() => {}} onPlaceConfirmed={() => {}} />,
    );
    rerender(<PlaceDirectInputDrawer open onOpenChange={() => {}} onPlaceConfirmed={() => {}} />);

    expect(screen.getByPlaceholderText('장소명을 입력해주세요')).toBeInTheDocument();
    expect(screen.queryByText('서울대입구역 2번 출구')).not.toBeInTheDocument();
  });

  it('게시물 이미지 뷰어가 열려 있는 동안은 "추가하기" 바를 보여주지 않는다', () => {
    render(
      <MemoryRouter>
        <PlaceDirectInputDrawer open onOpenChange={() => {}} onPlaceConfirmed={() => {}} />
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByPlaceholderText('장소명을 입력해주세요'), {
      target: { value: '앤미' },
    });
    fireEvent.click(screen.getByText('앤미'));
    expect(screen.getByRole('button', { name: '추가하기', hidden: true })).toBeInTheDocument();

    const [firstThumbnail] = screen.getAllByRole('button', { name: '게시물 크게 보기' });
    if (!firstThumbnail) throw new Error('게시물 썸네일을 찾지 못했다.');
    fireEvent.click(firstThumbnail);

    expect(
      screen.queryByRole('button', { name: '추가하기', hidden: true }),
    ).not.toBeInTheDocument();
  });
});
