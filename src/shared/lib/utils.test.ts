import { describe, expect, it } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
  it('타이포 토큰(text-b1)이 글자 색(text-gray-0)을 덮어쓰지 않는다', () => {
    // tailwind-merge 가 text-b1 을 색으로 오분류하면 text-gray-0 이 사라져
    // 버튼 라벨이 검정으로 렌더된다. 회귀 방지용.
    const result = cn('text-gray-0', 'text-b1');
    expect(result).toContain('text-gray-0');
    expect(result).toContain('text-b1');
  });

  it('같은 그룹끼리는 정상적으로 뒤 클래스가 이긴다', () => {
    expect(cn('text-b1', 'text-b2')).toBe('text-b2');
    expect(cn('text-gray-0', 'text-gray-70')).toBe('text-gray-70');
    expect(cn('bg-gray-10', 'bg-yellow')).toBe('bg-yellow');
  });

  it('모노 타이포 조합(font-mono + text-e2 + 색)이 모두 살아남는다', () => {
    expect(cn('font-mono text-e2 text-gray-70')).toBe('font-mono text-e2 text-gray-70');
  });
});
