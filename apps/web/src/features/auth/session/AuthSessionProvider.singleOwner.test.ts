import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourceRoot = path.resolve(import.meta.dirname, '../../..');

async function sourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) return sourceFiles(full);
      if (!/\.tsx?$/.test(entry.name) || /\.test\.tsx?$/.test(entry.name)) return [];
      return [full];
    }),
  );
  return files.flat();
}

describe('access token provider 소유권', () => {
  // 등록처가 둘이면 나중에 평가되는 모듈이 이겨서 세션 토큰이 조용히 무시된다.
  // 실제로 main.tsx 의 레거시 등록이 AuthSessionProvider 를 덮어써 /dev/ut 가 깨졌다.
  it('apiClient.setAccessTokenProvider 는 AuthSessionProvider 한 곳에서만 호출한다', async () => {
    const files = await sourceFiles(sourceRoot);
    const callers: string[] = [];

    for (const file of files) {
      const source = await readFile(file, 'utf8');
      // 클래스 정의(shared/api/http.ts)는 호출이 아니라 선언이라 제외된다.
      if (/\.setAccessTokenProvider\(/.test(source)) {
        callers.push(path.relative(sourceRoot, file));
      }
    }

    expect(callers).toEqual(['features/auth/session/AuthSessionProvider.tsx']);
  });
});
