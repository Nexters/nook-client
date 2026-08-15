import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Input } from '@/shared/ui';

/** 시안 Default/Focus/Typing/Filled 네 상태가 포커스·값 조합에서 파생되는지 확인한다. */
describe('Input', () => {
  function renderInput(props?: Partial<React.ComponentProps<typeof Input>>) {
    render(
      <Input
        aria-label="아카이브 이름"
        maxLength={20}
        onClear={() => {}}
        placeholder="새 아카이브명을 입력해주세요"
        {...props}
      />,
    );
    return screen.getByLabelText('아카이브 이름');
  }

  it('포커스가 없으면 값이 있든 없든 글자수·X 를 감춘다', () => {
    const input = renderInput({ defaultValue: '카페' });

    expect(screen.queryByText('2/20')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '입력 지우기' })).not.toBeInTheDocument();

    fireEvent.focus(input);
    fireEvent.blur(input);
    expect(screen.queryByText('2/20')).not.toBeInTheDocument();
  });

  it('포커스 중 값이 없으면 글자수만, 값이 있으면 X 도 함께 보인다', () => {
    const input = renderInput();

    fireEvent.focus(input);
    expect(screen.getByText('0/20')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '입력 지우기' })).not.toBeInTheDocument();

    fireEvent.change(input, { target: { value: '카페' } });
    expect(screen.getByText('2/20')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '입력 지우기' })).toBeInTheDocument();
  });

  it('X 를 눌러도 포커스가 빠지지 않아 onClear 가 실행된다', () => {
    const onClear = vi.fn();
    const input = renderInput({ onClear, defaultValue: '카페' });

    fireEvent.focus(input);
    const clear = screen.getByRole('button', { name: '입력 지우기' });
    // mousedown 기본 동작을 막아야 blur → 언마운트로 click 이 유실되지 않는다.
    expect(fireEvent.mouseDown(clear)).toBe(false);

    fireEvent.click(clear);
    expect(onClear).toHaveBeenCalledOnce();
  });
});
