import { createPrototypeData } from './local-prototype-data';

export const prototypeScenarios = [
  { id: 'multi-tags', label: '여러 장 · 태그 있음', photos: 6, tags: true },
  { id: 'multi-empty', label: '여러 장 · 태그 없음', photos: 6, tags: false },
  { id: 'single-tags', label: '한 장 · 태그 있음', photos: 1, tags: true },
  { id: 'single-empty', label: '한 장 · 태그 없음', photos: 1, tags: false },
  { id: 'none-tags', label: '이미지 없음 · 태그 있음', photos: 0, tags: true },
  { id: 'none-empty', label: '이미지 없음 · 태그 없음', photos: 0, tags: false },
] as const;

/** 플로팅 카드 장수 — 여러 장이면 첫 장소가 검색 결과('성수')에 들어가 좌우로 넘길 수 있다. */
export const prototypeCardModes = [
  { id: 'multi', label: '여러 장 · 좌우 스와이프' },
  { id: 'single', label: '한 장 · 검색 결과 밖' },
] as const;
export type PrototypeCardMode = (typeof prototypeCardModes)[number]['id'];

export function getPrototypeCardMode(): PrototypeCardMode {
  const id = new URLSearchParams(window.location.search).get('prototypeCards');
  return id === 'single' ? 'single' : 'multi';
}

export function getPrototypeScenario() {
  const id = new URLSearchParams(window.location.search).get('prototypeCase');
  return prototypeScenarios.find((scenario) => scenario.id === id) ?? null;
}

export function createPrototypeScenarioData(id: string, cards: PrototypeCardMode = 'multi') {
  const data = createPrototypeData();
  const scenario = prototypeScenarios.find((item) => item.id === id);
  const place = data.places[0];
  if (!scenario || !place) return data;
  const images = data.places
    .slice(0, 6)
    .flatMap((item) => (item.thumbnailUrl ? [item.thumbnailUrl] : []));
  place.name = '퍼머넌트해비탯';
  place.category = '카페';
  // 지도 검색어는 '성수' — 주소에 넣으면 검색 결과 첫 장이 되고, 빼면 결과 밖 단일 카드가 된다.
  place.address = cards === 'multi' ? '서울 성동구 성수이로 9 4층' : '서울 성동구 서울숲7길 9 4층';
  place.tags = scenario.tags ? ['조용한', '정갈한', '혼밥', '친절한'] : [];
  place.photoUrls = images.slice(0, scenario.photos);
  place.thumbnailUrl = scenario.photos > 0 ? images[0] : null;
  for (const post of data.posts) {
    post.places = post.places.map((item) => (item.id === place.id ? { ...item, ...place } : item));
  }
  return data;
}
