import type { PlaceParsingResult } from '../api';

/**
 * `fetchPlaceParsing`(../api.ts) 과 동일 계약(성공 resolve / HTTP 실패 reject)의 목데이터.
 * 백엔드가 붙으면 `useRelatedPlaces` 의 queryFn 을 `fetchPlaceParsing` 으로 바꾸는
 * 것으로 교체가 끝난다.
 */

/** 실제 파싱 API 의 응답 지연을 흉내내는 값. 테스트에서는 `waitFor` 로 기다린다. */
const MOCK_DELAY_MS = 300;

function success(postId: number, places: PlaceParsingResult['places']): PlaceParsingResult {
  return { postId, placeParsingStatus: 'SUCCESS', failureReason: null, places };
}

const PLACES: PlaceParsingResult['places'] = [
  {
    id: 1,
    provider: 'kakao',
    externalPlaceId: 'kakao-place-1',
    name: '아이소',
    address: '경기 용인시 처인구 양지읍 은이로 72',
    latitude: 37.2,
    longitude: 127.2,
    category: '카페',
    phoneNumber: null,
    // 시안: 앞의 두 장소만 파란 북마크(저장됨)
    bookmarked: true,
  },
  {
    id: 2,
    provider: 'kakao',
    externalPlaceId: 'kakao-place-2',
    name: '퍼머넌트해비탯',
    address: '경기 용인시 처인구 양지읍 은이로 72',
    latitude: 37.2,
    longitude: 127.2,
    category: '카페',
    phoneNumber: null,
    bookmarked: true,
  },
  {
    id: 3,
    provider: 'kakao',
    externalPlaceId: 'kakao-place-3',
    name: '탐석과 사랑',
    address: '경기 용인시 처인구 양지읍 은이로 72',
    latitude: 37.2,
    longitude: 127.2,
    category: '카페',
    phoneNumber: null,
    bookmarked: false,
  },
];

/** post-4 폴링 데모용 호출 카운터 — 첫 응답은 PENDING, 다음 폴링에서 SUCCESS. */
let post4CallCount = 0;

export function getMockPlaceParsing(postId: string | undefined): Promise<PlaceParsingResult> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      switch (postId) {
        case 'post-1':
          return resolve(success(1, PLACES));
        // 시안 `연관 장소 X` — 파싱은 성공했지만 매칭된 장소가 없는 게시물.
        case 'post-2':
          return resolve(success(2, []));
        // 시안 `게시물 상세_직접 입력` 실패 케이스 — 파싱 자체가 실패한 게시물.
        case 'post-3':
          return resolve({
            postId: 3,
            placeParsingStatus: 'FAILED',
            failureReason: '게시물에서 위치 정보를 찾지 못했어요',
            places: [],
          });
        // 파싱 진행 중 — PENDING 을 한 번 준 뒤 다음 폴링에서 SUCCESS (폴링 데모).
        case 'post-4': {
          post4CallCount += 1;
          return resolve(
            post4CallCount < 2
              ? { postId: 4, placeParsingStatus: 'PENDING', failureReason: null, places: [] }
              : success(4, PLACES),
          );
        }
        // 모르는 게시물 — HTTP 실패(404 등)를 흉내낸다.
        default:
          return reject(new Error(`연관 장소 파싱 조회 실패: ${postId ?? '(postId 없음)'}`));
      }
    }, MOCK_DELAY_MS);
  });
}
