import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type SyntheticEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthSession } from '@/features/auth/session/AuthSessionProvider';
import { nativeBridge } from '@/native-bridge';
import { createPost, list as listGroups } from '@/shared/api/generated/endpoints.generated';
import { unwrapApiResponse } from '@/shared/api/response';
import { Icon16ArrowRight } from '@/shared/icons/NookIcons';
import { Button, Input } from '@/shared/ui';

function errorMessage(cause: unknown, fallback: string) {
  return cause instanceof Error ? cause.message : fallback;
}

// UT 참가자별 고정 access token. 개발 라우트에서만 노출된다.
// refresh token 은 발급하지 않아 만료되면 세션이 정리되고, 그때는 토큰을 새로 받아 교체한다.
export const UT_ACCOUNTS = [
  {
    name: '김윤영',
    token:
      'eyJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJub29rLWFwaSIsInN1YiI6IjEiLCJqdGkiOiJmNzcwNWRjZi1iZjE5LTQzMzctYWFiYy1kMWFiOWE3ZjRiZjgiLCJpYXQiOjE3ODUyNDU4MTcsImV4cCI6MTc4NzgzNzgxNywidG9rZW5fdHlwZSI6ImFjY2VzcyJ9.5GH6vu08z8YwH1VneIHR-rwQ7KQfXxq-T-qJrmD6tDM',
  },
  {
    name: '배서영',
    token:
      'eyJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJub29rLWFwaSIsInN1YiI6IjIiLCJqdGkiOiJiMTYzNWEwMi0zOWYyLTQ4YjktYTU0OC05NjQxOTkzNzBjZWQiLCJpYXQiOjE3ODUyNDU4MTcsImV4cCI6MTc4NzgzNzgxNywidG9rZW5fdHlwZSI6ImFjY2VzcyJ9.7rBji19yo2xJDcBVA18H7OK9NxuEuPNn_3GHUvTuGVY',
  },
  {
    name: '박찬형',
    token:
      'eyJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJub29rLWFwaSIsInN1YiI6IjMiLCJqdGkiOiJkN2ZjOGNhZi1kNDAyLTRhZmQtOTIzMC02NDNmMjBhMGNmM2UiLCJpYXQiOjE3ODUyNDU4MTcsImV4cCI6MTc4NzgzNzgxNywidG9rZW5fdHlwZSI6ImFjY2VzcyJ9.KciKQJHQ05Vkd6Hj0-sNbnPzlcyEoFFEULuLcsIDIFQ',
  },
  {
    name: '권기준',
    token:
      'eyJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJub29rLWFwaSIsInN1YiI6IjQiLCJqdGkiOiJjNGQwNGU2Ni0yMTMxLTQwNDMtOGFjNi01MTdhYzliM2I3YjMiLCJpYXQiOjE3ODUyNDU4MTcsImV4cCI6MTc4NzgzNzgxNywidG9rZW5fdHlwZSI6ImFjY2VzcyJ9.3oFARVA4vAYeoedgjBQ8Gr8Pn2bKG5fkEz6VjNGuU4I',
  },
  {
    name: '백도현',
    token:
      'eyJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJub29rLWFwaSIsInN1YiI6IjUiLCJqdGkiOiI3YTNiY2ZhYy0zYjJkLTRiZDYtYmFmOS0xNjA0N2ExNGJjYTUiLCJpYXQiOjE3ODUyNDU4MTcsImV4cCI6MTc4NzgzNzgxNywidG9rZW5fdHlwZSI6ImFjY2VzcyJ9.EqD442BjYxD6J7XrB14KKauZQ7ypty3CBr9RLwwcEgs',
  },
  {
    name: '문지우',
    token:
      'eyJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJub29rLWFwaSIsInN1YiI6IjYiLCJqdGkiOiIwYTQ1YWY3Ny02MWJhLTQwMWQtYWEzYi1lMTgyYzcyMzNlOWIiLCJpYXQiOjE3ODUyNDU4MTcsImV4cCI6MTc4NzgzNzgxNywidG9rZW5fdHlwZSI6ImFjY2VzcyJ9.tGj7oRvzOnK3AoKJFDEwy3Isb9vapX4yvCzujPZBDFc',
  },
  {
    name: '김태임',
    token:
      'eyJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJub29rLWFwaSIsInN1YiI6IjciLCJqdGkiOiIzZDU2NzAzNy05YzZlLTQ0MzYtODk2OS05NTc1ZDY2NThlOGMiLCJpYXQiOjE3ODUyNDU4MTcsImV4cCI6MTc4NzgzNzgxNywidG9rZW5fdHlwZSI6ImFjY2VzcyJ9.0OyuEAmjkd9kGRnGDbODiYlIoSEUfYAlhJk7uLIRS-E',
  },
] as const;

function DevTokenForm() {
  const session = useAuthSession();
  const [name, setName] = useState<string>(UT_ACCOUNTS[0].name);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const account = UT_ACCOUNTS.find((item) => item.name === name);
    if (!account || submitting) return;

    setSubmitting(true);
    setError(null);
    try {
      await session.establish(account.token, null);
    } catch (cause) {
      setError(errorMessage(cause, '세션을 저장하지 못했습니다.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="flex flex-1 flex-col" onSubmit={submit}>
      <label className="mb-2 text-b2 font-semibold text-gray-90" htmlFor="dev-account">
        테스트 계정
      </label>
      <select
        id="dev-account"
        value={name}
        onChange={(event) => setName(event.target.value)}
        className="h-13 w-full rounded-xl border border-gray-20 bg-gray-0 px-4 text-b2 text-gray-90 outline-none focus:border-gray-60"
      >
        {UT_ACCOUNTS.map((account) => (
          <option key={account.name} value={account.name}>
            {account.name}
          </option>
        ))}
      </select>

      {error ? (
        <p role="alert" className="mt-4 text-b2 font-medium text-error">
          {error}
        </p>
      ) : null}

      <div className="mt-auto pt-8">
        <Button type="submit" size="lg" fullWidth disabled={submitting}>
          {submitting ? '저장 중...' : '이 계정으로 로그인'}
        </Button>
      </div>
    </form>
  );
}

function DevPostCreator() {
  const session = useAuthSession();
  const queryClient = useQueryClient();
  const [url, setUrl] = useState('');
  const [memo, setMemo] = useState('');
  const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>([]);

  const groupsQuery = useQuery({
    queryKey: ['dev', 'groups'],
    queryFn: async () => unwrapApiResponse(await listGroups({ auth: 'required' })) ?? [],
  });

  const createPostMutation = useMutation({
    mutationFn: async () => {
      const response = await createPost(
        {
          url: url.trim(),
          memo: memo.trim() || null,
          groupIds: selectedGroupIds,
        },
        { auth: 'required' },
      );
      const post = unwrapApiResponse(response);
      if (!post) throw new Error('게시글 생성 응답이 비어 있습니다.');
      return post;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['dev', 'groups'] });
    },
  });

  const toggleGroup = (groupId: number) => {
    setSelectedGroupIds((current) =>
      current.includes(groupId)
        ? current.filter((selectedId) => selectedId !== groupId)
        : [...current, groupId],
    );
    createPostMutation.reset();
  };

  const submit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!url.trim() || createPostMutation.isPending) return;
    createPostMutation.mutate();
  };

  return (
    <div className="flex flex-1 flex-col gap-8">
      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-h4 font-bold text-gray-100">테스트 게시글 생성</h2>
          <button
            type="button"
            className="text-b3 font-semibold text-gray-60 underline underline-offset-4"
            onClick={() => void session.clear()}
          >
            세션 지우기
          </button>
        </div>
        <p className="text-b2 leading-6 text-gray-60">
          현재 토큰으로 아카이브를 조회하고 실제 게시글 생성 API를 호출합니다.
        </p>
      </section>

      <form className="flex flex-col gap-6" onSubmit={submit}>
        <fieldset>
          <legend className="mb-3 text-b2 font-semibold text-gray-90">
            아카이브 선택 <span className="font-medium text-gray-50">(다중 선택 가능)</span>
          </legend>

          {groupsQuery.isPending ? (
            <p className="text-b2 text-gray-60">아카이브 불러오는 중...</p>
          ) : null}
          {groupsQuery.isError ? (
            <div className="rounded-xl bg-error/10 p-4">
              <p role="alert" className="text-b2 font-medium text-error">
                {errorMessage(groupsQuery.error, '아카이브 목록을 불러오지 못했습니다.')}
              </p>
              <button
                type="button"
                className="mt-2 text-b3 font-semibold text-error underline"
                onClick={() => void groupsQuery.refetch()}
              >
                다시 불러오기
              </button>
            </div>
          ) : null}
          {groupsQuery.data?.length === 0 ? (
            <p className="rounded-xl bg-gray-10 p-4 text-b2 text-gray-60">
              생성된 아카이브가 없습니다.
            </p>
          ) : null}
          {groupsQuery.data && groupsQuery.data.length > 0 ? (
            <div className="flex flex-col gap-2">
              {groupsQuery.data.map((group) => (
                <label
                  key={group.id}
                  className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-20 p-4"
                >
                  <input
                    type="checkbox"
                    checked={selectedGroupIds.includes(group.id)}
                    onChange={() => toggleGroup(group.id)}
                    className="size-5 accent-gray-100"
                  />
                  <span className="min-w-0 flex-1 text-b2 font-semibold text-gray-90">
                    {group.name}
                  </span>
                  <span className="text-b3 text-gray-50">{group.postCount}개</span>
                </label>
              ))}
            </div>
          ) : null}
        </fieldset>

        <div>
          <label className="mb-2 block text-b2 font-semibold text-gray-90" htmlFor="dev-post-url">
            게시글 URL
          </label>
          <Input
            id="dev-post-url"
            type="url"
            value={url}
            onChange={(event) => {
              setUrl(event.target.value);
              createPostMutation.reset();
            }}
            onClear={() => setUrl('')}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="https://www.instagram.com/p/..."
          />
        </div>

        <div>
          <label className="mb-2 block text-b2 font-semibold text-gray-90" htmlFor="dev-post-memo">
            메모 <span className="font-medium text-gray-50">(선택, 최대 2000자)</span>
          </label>
          <textarea
            id="dev-post-memo"
            value={memo}
            maxLength={2000}
            onChange={(event) => {
              setMemo(event.target.value);
              createPostMutation.reset();
            }}
            className="min-h-32 w-full resize-y rounded-xl border border-gray-20 bg-gray-0 p-4 text-b2 text-gray-90 outline-none placeholder:text-gray-40 focus:border-gray-60"
            placeholder="게시글에 남길 메모를 입력해주세요"
          />
          <p className="mt-1 text-right text-b3 text-gray-50">{memo.length}/2000</p>
        </div>

        {createPostMutation.isError ? (
          <p role="alert" className="text-b2 font-medium text-error">
            {errorMessage(createPostMutation.error, '게시글을 생성하지 못했습니다.')}
          </p>
        ) : null}
        {createPostMutation.isSuccess ? (
          <div className="rounded-xl bg-gray-10 p-4 text-b2 leading-6 text-gray-80">
            생성 완료: postId <strong>{createPostMutation.data.postId}</strong> · 파싱 상태{' '}
            <strong>{createPostMutation.data.placeParsingStatus}</strong>
          </div>
        ) : null}

        <Button
          type="submit"
          size="lg"
          fullWidth
          disabled={!url.trim() || createPostMutation.isPending}
        >
          {createPostMutation.isPending ? '생성 중...' : '게시글 생성'}
        </Button>
      </form>
    </div>
  );
}

export function DevSessionPage() {
  const session = useAuthSession();

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[450px] flex-col bg-gray-0 px-4 py-8">
      <header className="mb-8">
        <div className="mb-2 flex items-center justify-between gap-4">
          <p className="text-b3 font-semibold text-gray-50">DEVELOPMENT ONLY</p>
          <Button asChild size="sm" variant="secondary">
            <Link to="/">
              앱으로 이동
              <Icon16ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </div>
        <h1 className="text-h2 font-bold text-gray-100">UT 테스트 도구</h1>
        <p className="mt-3 text-b2 leading-6 text-gray-60">
          {nativeBridge.isNative
            ? '입력한 토큰은 Native Session Vault에 저장합니다.'
            : '입력한 Access Token은 이 브라우저의 localStorage에 저장합니다.'}
        </p>
      </header>

      {session.status === 'authenticated' ? <DevPostCreator /> : <DevTokenForm />}
    </main>
  );
}
