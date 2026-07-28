# @nook/api-contracts

서버 OpenAPI 명세와 Web Orval 생성 환경을 관리한다.

- `openapi/`: 커밋하는 OpenAPI 스냅샷
- `orval.config.ts`: Fetch client, 모델, mutator 출력 설정
- `scripts/`: 명세 다운로드와 드리프트 검사
- `apps/web/src/shared/api/generated/`: 커밋하는 Orval 생성 코드. 직접 수정하지 않는다.

생성 방식과 운영 규칙은 `docs/[NOOK-56] 01.OpenAPI_스키마_DTO.md`, 서버 수정 요청은
`docs/[NOOK-56] 02.Swagger_서버_전달_항목.md`에서 관리한다.

```bash
pnpm api:refresh
pnpm api:fetch
pnpm api:generate
pnpm api:check
pnpm api:check:remote
```

명세가 변경되면 `pnpm api:refresh` 한 번으로 스냅샷, DTO, API 함수를 재생성하고 결과를 함께
커밋한다. CI는 개발 서버 명세, 커밋된 스냅샷, Orval 생성 코드가 서로 일치하는지 검사한다.
