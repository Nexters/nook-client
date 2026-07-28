import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type SyntheticEvent, useState } from 'react';
import { useAuthSession } from '@/features/auth/session/AuthSessionProvider';
import { nativeBridge } from '@/native-bridge';
import { createPost, list as listGroups } from '@/shared/api/generated/endpoints.generated';
import { unwrapApiResponse } from '@/shared/api/response';
import { Button, Input } from '@/shared/ui';

function errorMessage(cause: unknown, fallback: string) {
  return cause instanceof Error ? cause.message : fallback;
}

function DevTokenForm() {
  const session = useAuthSession();
  const [accessToken, setAccessToken] = useState('');
  const [refreshToken, setRefreshToken] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedAccessToken = accessToken.trim();
    if (!normalizedAccessToken || submitting) return;

    setSubmitting(true);
    setError(null);
    try {
      await session.establish(normalizedAccessToken, refreshToken.trim() || null);
      setAccessToken('');
      setRefreshToken('');
    } catch (cause) {
      setError(errorMessage(cause, '세션을 저장하지 못했습니다.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="flex flex-1 flex-col" onSubmit={submit}>
      <label className="mb-2 text-b2 font-semibold text-gray-90" htmlFor="dev-access-token">
        Access Token
      </label>
      <Input
        id="dev-access-token"
        type="password"
        value={accessToken}
        onChange={(event) => setAccessToken(event.target.value)}
        onClear={() => setAccessToken('')}
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        placeholder="Access Token을 입력해주세요"
      />

      {nativeBridge.isNative ? (
        <>
          <label
            className="mb-2 mt-5 text-b2 font-semibold text-gray-90"
            htmlFor="dev-refresh-token"
          >
            Refresh Token <span className="font-medium text-gray-50">(선택)</span>
          </label>
          <Input
            id="dev-refresh-token"
            type="password"
            value={refreshToken}
            onChange={(event) => setRefreshToken(event.target.value)}
            onClear={() => setRefreshToken('')}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="무기한 토큰이면 비워두세요"
          />
        </>
      ) : null}

      {error ? (
        <p role="alert" className="mt-4 text-b2 font-medium text-error">
          {error}
        </p>
      ) : null}

      <div className="mt-auto pt-8">
        <Button type="submit" size="lg" fullWidth disabled={!accessToken.trim() || submitting}>
          {submitting ? '저장 중...' : '이 토큰으로 로그인'}
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
          areGroupIdsPositive: selectedGroupIds.every((groupId) => groupId > 0),
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
          현재 토큰으로 그룹을 조회하고 실제 게시글 생성 API를 호출합니다.
        </p>
      </section>

      <form className="flex flex-col gap-6" onSubmit={submit}>
        <fieldset>
          <legend className="mb-3 text-b2 font-semibold text-gray-90">
            그룹 선택 <span className="font-medium text-gray-50">(다중 선택 가능)</span>
          </legend>

          {groupsQuery.isPending ? (
            <p className="text-b2 text-gray-60">그룹 불러오는 중...</p>
          ) : null}
          {groupsQuery.isError ? (
            <div className="rounded-xl bg-error/10 p-4">
              <p role="alert" className="text-b2 font-medium text-error">
                {errorMessage(groupsQuery.error, '그룹 목록을 불러오지 못했습니다.')}
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
              생성된 그룹이 없습니다.
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
        <p className="mb-2 text-b3 font-semibold text-gray-50">DEVELOPMENT ONLY</p>
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
