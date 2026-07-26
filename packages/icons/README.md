# @nook/icons

Web, iOS Share Extension, Android Share Target가 함께 쓰는 디자인 아이콘의 원본이다.

- `src/*.svg`만 직접 수정한다.
- `pnpm icons:generate`로 플랫폼 코드를 생성한다.
- 생성된 `NookIcons.*` 파일은 직접 수정하지 않는다.
- 아이콘별 `width`, `height`, `viewBox`와 path·circle의 fill/stroke, even-odd 채우기를 그대로 보존한다.
- `viewBox` 크기는 아이콘마다 달라도 된다.

앱 아이콘과 스플래시처럼 플랫폼 규격에 종속된 이미지, SVG 안에 비트맵을 포함한 이미지형
자산은 이 패키지에서 관리하지 않는다.
