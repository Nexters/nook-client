import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PlaceInfo } from './PlaceInfo';

/**
 * 상호작용은 `fireEvent` 로만 쓴다 — `@testing-library/user-event` 는 미설치이고
 * 여기 필요한 건 click/change/keyDown/blur 뿐이라 새 의존성을 들일 이유가 없다.
 */
function startEditing(trigger = '수정') {
  fireEvent.click(screen.getByRole('button', { name: trigger }));
  return screen.getByRole('textbox', { name: '메모' });
}

/** 메모가 없을 때는 "수정" 버튼이 없고 안내 문구 자체가 작성 진입점이다. */
const EMPTY_TRIGGER = '메모를 남겨보세요';

describe('PlaceInfo 메모 인라인 편집', () => {
  it('"수정"을 누르면 입력으로 바뀌고 Enter 로 저장한다', () => {
    const onMemoChange = vi.fn();
    render(<PlaceInfo memo="지우랑 가면 좋겠다" onMemoChange={onMemoChange} />);

    const input = startEditing();
    fireEvent.change(input, { target: { value: '혼자 가도 좋음' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onMemoChange).toHaveBeenCalledWith('혼자 가도 좋음');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('바깥을 클릭하면(blur) 저장한다', () => {
    const onMemoChange = vi.fn();
    render(<PlaceInfo memo="" onMemoChange={onMemoChange} />);

    const input = startEditing(EMPTY_TRIGGER);
    fireEvent.change(input, { target: { value: '새 메모' } });
    fireEvent.blur(input);

    expect(onMemoChange).toHaveBeenCalledWith('새 메모');
  });

  it('Esc 로 취소하면 저장하지 않고 원래 값이 남는다', () => {
    const onMemoChange = vi.fn();
    render(<PlaceInfo memo="원래 메모" onMemoChange={onMemoChange} />);

    const input = startEditing();
    fireEvent.change(input, { target: { value: '덧붙임' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    // Esc 직후 브라우저에서 뒤따를 수 있는 blur 가 저장을 되살리면 안 된다.
    fireEvent.blur(input);

    expect(onMemoChange).not.toHaveBeenCalled();
    expect(screen.getByText('원래 메모')).toBeInTheDocument();
  });

  it('값이 그대로면 저장 콜백을 부르지 않는다', () => {
    const onMemoChange = vi.fn();
    render(<PlaceInfo memo="그대로" onMemoChange={onMemoChange} />);

    fireEvent.keyDown(startEditing(), { key: 'Enter' });

    expect(onMemoChange).not.toHaveBeenCalled();
  });

  it('앞뒤 공백은 잘라서 저장한다', () => {
    const onMemoChange = vi.fn();
    render(<PlaceInfo memo="" onMemoChange={onMemoChange} />);

    const input = startEditing(EMPTY_TRIGGER);
    fireEvent.change(input, { target: { value: '  공백 있음  ' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onMemoChange).toHaveBeenCalledWith('공백 있음');
  });

  it('메모가 없으면 "수정" 버튼 없이 안내 문구를 눌러 작성한다', () => {
    render(<PlaceInfo memo="" onMemoChange={vi.fn()} />);

    expect(screen.queryByRole('button', { name: '수정' })).not.toBeInTheDocument();
    expect(startEditing(EMPTY_TRIGGER)).toBeInTheDocument();
  });

  it('onMemoChange 가 없으면 읽기 전용이다', () => {
    render(<PlaceInfo memo="읽기 전용" />);
    expect(screen.queryByRole('button', { name: '수정' })).not.toBeInTheDocument();
  });

  it('메모도 없고 편집도 불가하면 메모 줄을 렌더하지 않는다', () => {
    render(<PlaceInfo address="서울 성동구" />);

    expect(screen.getByText('서울 성동구')).toBeInTheDocument();
    expect(screen.queryByText('메모를 남겨보세요')).not.toBeInTheDocument();
  });

  it('주소·영업시간이 없으면 그 줄은 렌더하지 않는다', () => {
    const { rerender } = render(
      <PlaceInfo address="서울 성동구" businessStatus="영업중" memo="메모만" />,
    );
    // 주소·영업시간·메모 세 줄 → 아이콘 3개 + 주소 줄 우측의 펼침 화살표
    expect(screen.getAllByRole('presentation', { hidden: true })).toHaveLength(4);

    rerender(<PlaceInfo memo="메모만" />);
    // 메모 줄만 남는다
    expect(screen.getAllByRole('presentation', { hidden: true })).toHaveLength(1);
    expect(screen.queryByText('영업중')).not.toBeInTheDocument();
  });
});

describe('PlaceInfo 주소 줄', () => {
  it('거리가 있으면 주소 앞에 붙인다', () => {
    render(<PlaceInfo address="서울 성동구 서울숲7길 9 4층" distance="4.6km" />);
    expect(screen.getByText('4.6km · 서울 성동구 서울숲7길 9 4층')).toBeInTheDocument();
  });

  it('복사 버튼은 onAddressCopied 를 넘겼을 때만 생기고, 주소를 클립보드에 쓴 뒤 알린다', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    const onAddressCopied = vi.fn();

    const { rerender } = render(<PlaceInfo address="서울 성동구" />);
    expect(screen.queryByRole('button', { name: '주소 복사' })).not.toBeInTheDocument();

    rerender(<PlaceInfo address="서울 성동구" onAddressCopied={onAddressCopied} />);
    fireEvent.click(screen.getByRole('button', { name: '주소 복사' }));

    await vi.waitFor(() => expect(onAddressCopied).toHaveBeenCalled());
    expect(writeText).toHaveBeenCalledWith('서울 성동구');
    vi.unstubAllGlobals();
  });
});
