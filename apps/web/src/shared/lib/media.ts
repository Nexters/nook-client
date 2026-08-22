/**
 * URL 하나로 영상 여부를 판별한다.
 *
 * 서버가 미디어 타입을 함께 주는 응답도 있지만(`SavedPostMediaResponse.type`),
 * 그룹 카드의 `thumbnailUrls` 처럼 URL 만 내려오는 응답도 있다. 렌더 시점에 항상
 * 쓸 수 있는 단서는 URL 뿐이라 판별을 여기 한 곳으로 모은다.
 *
 * 확장자 뒤에 쿼리(`?`)·프래그먼트(`#`)가 붙는 CDN URL 이 많아 끝만 보지 않는다.
 */
// ponytail: 확장자 없는 CDN URL 은 이미지로 판단한다. 오탐이 보이면 서버 `type` 을
// 화면 모델(`Post.images` → `{ url, type }[]`)까지 내려보내고 여기는 폴백으로 둔다.
const VIDEO_EXTENSION = /\.(mp4|mov|m4v|webm)(?:$|[?#])/i;

export function isVideoUrl(url?: string): boolean {
  return !!url && VIDEO_EXTENSION.test(url);
}
