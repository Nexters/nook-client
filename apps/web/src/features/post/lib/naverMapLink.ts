/**
 * 검색한 장소를 네이버 지도에서 여는 웹 링크.
 *
 * 검색 응답엔 네이버 place id 가 없어 검색 URL 로만 연결한다 — 동명 업체와 헷갈리지
 * 않도록 "주소 + 상호"를 검색어로 쓴다. `https` 링크라 웹은 새 탭, 네이티브 셸은
 * 현재 내비게이션 정책(http/https → 외부 오픈) 그대로 시스템 브라우저로 열린다.
 * 네이버지도 앱을 바로 여는 `nmap://` 스킴은 셸이 차단해서 별도 셸 릴리즈 전엔 못 쓴다.
 */
export function buildNaverMapSearchUrl(place: { name: string; address?: string }): string {
  const query = [place.address, place.name].filter(Boolean).join(' ');
  return `https://map.naver.com/p/search/${encodeURIComponent(query)}`;
}
