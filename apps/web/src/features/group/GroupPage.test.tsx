import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { BottomMenuVisibilityProvider } from '@/app/bottom-menu-visibility';
import { GroupDetailPage } from '@/features/group/GroupDetailPage';
import { GroupFormPage } from '@/features/group/GroupFormPage';
import { GroupPage } from '@/features/group/GroupPage';

function renderGroupRoutes(initialPath: string) {
  const wrapper = (children: ReactNode) => (
    <BottomMenuVisibilityProvider value={{ hidden: false, setHidden: () => {} }}>
      {children}
    </BottomMenuVisibilityProvider>
  );

  return render(
    wrapper(
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/group" element={<GroupPage />} />
          <Route path="/group/new" element={<GroupFormPage mode="create" />} />
          <Route path="/group/:groupId" element={<GroupDetailPage />} />
          <Route path="/group/:groupId/edit" element={<GroupFormPage mode="edit" />} />
        </Routes>
      </MemoryRouter>,
    ),
  );
}

describe('그룹 화면', () => {
  it('목록에서 그룹을 누르면 상세로 이동한다', () => {
    renderGroupRoutes('/group');

    fireEvent.click(screen.getByRole('button', { name: /카페/ }));

    expect(screen.getByRole('heading', { name: '카페' })).toBeInTheDocument();
    expect(screen.getByText('114 Places')).toBeInTheDocument();
  });

  it('새 그룹 생성은 이름이 비면 만들기 버튼이 비활성화된다', () => {
    renderGroupRoutes('/group/new');

    const submit = screen.getByRole('button', { name: '그룹 만들기' });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByLabelText('그룹 이름'), { target: { value: '토요일 모임' } });
    expect(submit).toBeEnabled();
  });

  it('그룹 편집은 기존 이름을 채우고 삭제 확인 팝업을 띄운다', () => {
    renderGroupRoutes('/group/cafe/edit');

    expect(screen.getByLabelText('그룹 이름')).toHaveValue('카페');

    fireEvent.click(screen.getByRole('button', { name: '그룹 삭제' }));
    expect(screen.getByText('그룹을 삭제하시겠어요?')).toBeInTheDocument();
  });
});
