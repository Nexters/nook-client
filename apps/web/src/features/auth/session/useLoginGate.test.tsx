import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { useLoginGate } from '@/features/auth/session/useLoginGate';

const auth = vi.hoisted(() => ({ authenticated: false }));

vi.mock('@/features/auth/session/AuthSessionProvider', () => ({
  useIsAuthenticated: () => auth.authenticated,
}));

function Screen({ onRun }: { onRun: () => void }) {
  const { gate, wall } = useLoginGate();
  const location = useLocation();

  return (
    <>
      <span data-testid="location">{`${location.pathname}${location.search}`}</span>
      <button type="button" onClick={() => gate('아카이브를 만들려면 로그인이 필요해요', onRun)}>
        새 아카이브
      </button>
      {wall}
    </>
  );
}

function renderScreen(onRun = vi.fn()) {
  render(
    <MemoryRouter initialEntries={['/archive?tab=1']}>
      <Routes>
        <Route path="/archive" element={<Screen onRun={onRun} />} />
        <Route path="/login" element={<p>로그인 화면</p>} />
      </Routes>
    </MemoryRouter>,
  );
  return onRun;
}

describe('useLoginGate', () => {
  it('로그인한 사용자는 월 없이 동작이 그대로 실행된다', () => {
    auth.authenticated = true;
    const onRun = renderScreen();

    fireEvent.click(screen.getByRole('button', { name: '새 아카이브' }));

    expect(onRun).toHaveBeenCalledOnce();
    expect(screen.queryByText('로그인하시겠어요?')).not.toBeInTheDocument();
  });

  it('게스트는 동작 대신 진입점에 맞는 문구의 월을 본다', () => {
    auth.authenticated = false;
    const onRun = renderScreen();

    fireEvent.click(screen.getByRole('button', { name: '새 아카이브' }));

    expect(onRun).not.toHaveBeenCalled();
    expect(screen.getByText('로그인하시겠어요?')).toBeInTheDocument();
    expect(screen.getByText('아카이브를 만들려면 로그인이 필요해요')).toBeInTheDocument();
  });

  it('취소하면 화면을 옮기지 않고 그 자리에 남는다', () => {
    auth.authenticated = false;
    renderScreen();

    fireEvent.click(screen.getByRole('button', { name: '새 아카이브' }));
    fireEvent.click(screen.getByRole('button', { name: '취소' }));

    expect(screen.queryByText('로그인하시겠어요?')).not.toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/archive?tab=1');
  });

  it('로그인하기를 누르면 돌아올 자리를 들고 로그인 화면으로 간다', () => {
    auth.authenticated = false;
    renderScreen();

    fireEvent.click(screen.getByRole('button', { name: '새 아카이브' }));
    fireEvent.click(screen.getByRole('button', { name: '로그인하기' }));

    expect(screen.getByText('로그인 화면')).toBeInTheDocument();
  });
});
