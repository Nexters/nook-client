---
allowed-tools: Bash(git:*), Bash(gh:*), Bash(pnpm:*), Bash(date:*), Bash(ls:*), Bash(cat:*), Read, Write
description: OpenAPI 스냅샷을 main 기준으로 갱신해 PR 올리고, 현재 브랜치에도 반영
---

## Context

- 현재 브랜치: !`git branch --show-current`
- 작업 트리 상태: !`git status --short`
- API 산출물 변경 여부: !`git status --short -- packages/api-contracts apps/web/src/shared/api/generated`

## Task

dev 서버의 OpenAPI 문서가 바뀌면 CI(`pnpm api:check:remote`)가 깨진다.
갱신 PR은 **main 기준**으로 올리고, 지금 작업 중인 브랜치에도 같은 결과를 즉시 반영한다.

### 0. 사전 확인

API 산출물(`packages/api-contracts/openapi`, `apps/web/src/shared/api/generated`)에
**커밋되지 않은 변경이 이미 있으면 중단하고 사용자에게 알린다.** 덮어쓰면 안 된다.

### 1. main 기준 워크트리에서 갱신

브랜치명은 **`chore/api-refresh` 로 고정한다.** 날짜를 붙이면 실행할 때마다 PR이
새로 생겨 같은 파일을 건드리는 PR이 쌓인다. 고정하면 항상 PR 하나만 유지된다.

```bash
git fetch origin --quiet
BRANCH="chore/api-refresh"
WT="../nook-client-api-refresh"
# -B: 브랜치가 이미 있어도 최신 main 기준으로 다시 만든다
git worktree add -B "$BRANCH" "$WT" origin/main
cd "$WT" && pnpm install --frozen-lockfile && pnpm api:refresh
```

> 워크트리는 node_modules가 없어 `pnpm install`이 필요하다.
> main의 orval 설정으로 생성해야 PR 산출물이 정확하다.
>
> 이 파일들은 100% 생성물이라 기존 브랜치와 **병합할 이유가 없다.**
> 항상 최신 main 위에서 다시 생성하는 것이 옳다.

### 2. 변경이 없으면 여기서 종료

`git status --short`가 비어 있으면 이미 최신이다.
**PR을 만들지 말고** 워크트리를 정리한 뒤 "이미 최신" 이라고 보고한다.
열린 `chore/api-refresh` PR이 이미 있다면, 그 PR이 불필요해졌을 수 있으니 함께 알린다.

### 3. 커밋 · 푸시 · PR

```bash
git add packages/api-contracts/openapi apps/web/src/shared/api/generated
git commit -m "chore(api): OpenAPI 스냅샷·생성 코드 최신화"
# 브랜치를 main 기준으로 다시 만들었으므로 강제 푸시가 정상 경로다.
# --force-with-lease: 내가 모르는 새 커밋이 원격에 있으면 거부한다
git push --force-with-lease -u origin "$BRANCH"
```

푸시가 거부되면 **덮어쓰지 말고 중단**한 뒤 사용자에게 알린다.
(다른 사람이 동시에 실행했을 수 있다)

PR은 **이미 열려 있으면 새로 만들지 않는다.** 푸시만으로 내용이 갱신된다.

```bash
gh pr list --head chore/api-refresh --state open
```

없을 때만 생성한다. 제목은 커밋 제목과 동일하게 하고,
본문은 `.github/PULL_REQUEST_TEMPLATE.md` 형식을 따른다.
`2. 작업 내용`에는 **실제로 바뀐 엔드포인트·모델을 diff에서 읽어 구체적으로** 적는다.
(예: `DELETE /api/v1/posts/{postId}` 추가) — "최신화함" 같은 뭉뚱그린 표현 금지.

이미 열린 PR을 갱신한 경우, 본문의 `2. 작업 내용`도 현재 diff 기준으로 다시 쓴다.

### 4. 현재 브랜치에 반영

원래 저장소로 돌아와, **현재 브랜치가 main이 아니면** 같은 갱신을 수행한다.

```bash
pnpm api:refresh
pnpm api:check:remote   # CI 와 동일한 검사로 확인
```

산출물은 **커밋하지 않고 미커밋 상태로 둔다.** 사용자가 자기 브랜치의 커밋 시점을 정한다.
현재 브랜치가 main이면 이 단계를 건너뛴다 (PR이 처리한다).

### 5. 워크트리 정리

```bash
git worktree remove "$WT"
```

실패하더라도 워크트리는 반드시 정리한다.

### 보고 형식

- 바뀐 API가 무엇인지 (엔드포인트·모델 단위로)
- PR 링크와 **새로 만든 것인지 기존 PR을 갱신한 것인지**
- 현재 브랜치에 반영된 파일과 **미커밋 상태라는 점**
- 소셜 인증 등 진행 중인 작업의 계약이 바뀌었다면 **영향 여부를 반드시 짚는다**
