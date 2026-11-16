import type { ApiRequestInit } from '@/shared/api/http';
import { createPrototypeData, type PrototypeData } from './local-prototype-data';
import {
  createPrototypeScenarioData,
  getPrototypeCardMode,
  getPrototypeScenario,
} from './prototype-scenarios';

const STORAGE_KEY = 'nook.local-prototype.v1';
const storageKey = () => {
  const scenario = getPrototypeScenario();
  return scenario ? `${STORAGE_KEY}.${scenario.id}.${getPrototypeCardMode()}` : STORAGE_KEY;
};

function read(): PrototypeData {
  try {
    const value = localStorage.getItem(storageKey());
    if (value) {
      const parsed = JSON.parse(value) as PrototypeData;
      if (
        Array.isArray(parsed.groups) &&
        Array.isArray(parsed.places) &&
        Array.isArray(parsed.posts) &&
        parsed.profile
      )
        if (parsed.dataVersion !== 2) {
          const seed = createPrototypeData();
          for (const place of parsed.places) {
            const fresh = seed.places.find((item) => item.id === place.id);
            if (fresh)
              Object.assign(place, {
                latitude: fresh.latitude,
                longitude: fresh.longitude,
                address: fresh.address,
              });
          }
          for (const post of parsed.posts) {
            for (const place of post.places) {
              const fresh = parsed.places.find((item) => item.id === place.id);
              if (fresh)
                Object.assign(place, {
                  latitude: fresh.latitude,
                  longitude: fresh.longitude,
                  address: fresh.address,
                });
            }
          }
          parsed.dataVersion = 2;
          localStorage.setItem(storageKey(), JSON.stringify(parsed));
        }
      return parsed;
    }
  } catch {
    /* 잘못된 로컬 데이터는 새 샘플로 복구한다. */
  }
  const scenario = getPrototypeScenario();
  return scenario
    ? createPrototypeScenarioData(scenario.id, getPrototypeCardMode())
    : createPrototypeData();
}

function page<T>(items: T[], params: URLSearchParams) {
  const current = Math.max(0, Number(params.get('page')) || 0);
  const size = Math.max(1, Math.min(100, Number(params.get('size')) || 20));
  return {
    items: items.slice(current * size, (current + 1) * size),
    page: current,
    size,
    totalElements: items.length,
    totalPages: Math.ceil(items.length / size),
    hasNext: (current + 1) * size < items.length,
    ownerNickname: '문지우',
  };
}

/** Every request in local mode ends here; unsupported routes never reach the backend. */
export async function localPrototypeRequest(
  url: string,
  options: ApiRequestInit = {},
): Promise<{ resultType: 'SUCCESS'; success: unknown }> {
  const { pathname, searchParams: params } = new URL(url, 'http://local.prototype');
  let path = pathname.replace(/^\/api\/v1/, '');
  // 공유 링크도 같은 로컬 아카이브·게시물로 연결한다.
  const shared = path.match(/^\/api\/public\/v1\/groups\/local-(\d+)(.*)$/);
  if (shared) {
    const suffix = shared[2] ?? '';
    path =
      /^\/posts\/\d+$/.test(suffix) || /^\/places\/\d+$/.test(suffix)
        ? suffix
        : `/groups/${shared[1]}${suffix}`;
  }
  const method = (options.method ?? 'GET').toUpperCase();
  const body = typeof options.body === 'string' ? JSON.parse(options.body) : {};
  const db = read();
  const success = (value: unknown) => {
    if (method !== 'GET') localStorage.setItem(storageKey(), JSON.stringify(db));
    return { resultType: 'SUCCESS' as const, success: value };
  };
  const summaries = () =>
    db.groups.map((group) => {
      const posts = db.posts.filter((post) => post.groups.some((item) => item.id === group.id));
      return {
        ...group,
        postCount: posts.length,
        thumbnailUrls: posts
          .flatMap((post) => post.media.slice(0, 1).map((media) => media.thumbnailUrl ?? media.url))
          .slice(0, 3),
      };
    });
  const postGroups = (ids: number[]) =>
    db.groups
      .filter((group) => ids.includes(group.id))
      .map(({ id, name, color }) => ({ id, name, color }));
  const groupIds = params.has('groupIds')
    ? params.getAll('groupIds').flatMap((ids) => ids.split(',').map(Number))
    : null;
  const selectedPosts = db.posts.filter(
    (post) => groupIds === null || post.groups.some((group) => groupIds.includes(group.id)),
  );
  const selectedPlaceIds = new Set(
    selectedPosts.flatMap((post) => post.places.map((place) => place.id)),
  );
  const selectedPlaces = db.places.filter((place) => selectedPlaceIds.has(place.id));
  const recent = (place: PrototypeData['places'][number]) => ({
    ...place,
    city: place.address.split(' ')[2] ?? '서울',
    accessType: 'OWNED',
  });
  const postSummary = (post: PrototypeData['posts'][number]) => ({
    ...post,
    placeCount: post.places.length,
    representativeMedia: post.media[0] ?? null,
  });

  if (path === '/api/public/v1/app-version-policy') return success({ updateType: 'NONE' });
  if (/^\/shared-groups\/local-\d+$/.test(path)) return success(null);
  if (path === '/groups' || path === '/groups/owned') {
    if (method === 'GET') return success(summaries());
    if (method === 'POST') {
      const group = {
        id: Math.max(0, ...db.groups.map((item) => item.id)) + 1,
        name: String(body.name ?? ''),
        color: String(body.color ?? 'GRAY'),
        description: body.description ?? null,
        accessType: 'OWNED' as const,
        postCount: 0,
        subscriberCount: 0,
        subscriberPreview: [],
        thumbnailUrls: [],
      };
      db.groups.push(group);
      return success(group);
    }
  }
  const groupMatch = path.match(/^\/groups\/(\d+)(?:\/(places|posts|subscribers|share-link))?$/);
  if (groupMatch) {
    const id = Number(groupMatch[1]);
    const group = db.groups.find((item) => item.id === id);
    if (!group) throw new Error('아카이브를 찾을 수 없어요.');
    const posts = db.posts.filter((post) => post.groups.some((item) => item.id === id));
    const placeIds = new Set(posts.flatMap((post) => post.places.map((place) => place.id)));
    if (groupMatch[2] === 'posts' && method === 'GET')
      return success(page(posts.map(postSummary), params));
    if (groupMatch[2] === 'places' && method === 'GET')
      return success(page(db.places.filter((place) => placeIds.has(place.id)).map(recent), params));
    if (groupMatch[2] === 'subscribers' && method === 'GET') return success(page([], params));
    if (groupMatch[2] === 'share-link') return success({ token: `local-${id}` });
    if (!groupMatch[2]) {
      if (method === 'GET') return success(summaries().find((item) => item.id === id));
      if (method === 'PATCH' || method === 'PUT') {
        if (typeof body.name === 'string') group.name = body.name;
        if (typeof body.color === 'string') group.color = body.color;
        if ('description' in body) group.description = body.description;
        for (const post of posts) post.groups = postGroups(post.groups.map((item) => item.id));
        return success(group);
      }
      if (method === 'DELETE') {
        db.groups = db.groups.filter((item) => item.id !== id);
        for (const post of posts) post.groups = post.groups.filter((item) => item.id !== id);
        return success(null);
      }
    }
  }
  if (path === '/places/map' && method === 'GET') {
    return success(
      selectedPlaces
        .filter(
          (place) =>
            place.bookmarked &&
            (!params.has('northLatitude') ||
              place.latitude <= Number(params.get('northLatitude'))) &&
            (!params.has('southLatitude') ||
              place.latitude >= Number(params.get('southLatitude'))) &&
            (!params.has('eastLongitude') ||
              place.longitude <= Number(params.get('eastLongitude'))) &&
            (!params.has('westLongitude') ||
              place.longitude >= Number(params.get('westLongitude'))),
        )
        .map((place) => ({
          ...recent(place),
          color:
            db.groups.find((group) =>
              selectedPosts.some(
                (post) =>
                  post.places.some((item) => item.id === place.id) &&
                  post.groups.some((item) => item.id === group.id),
              ),
            )?.color ?? 'GRAY',
        })),
    );
  }
  if (path === '/places/recent' && method === 'GET') {
    let places = selectedPlaces.map(recent);
    if (params.get('sort') === 'OLDEST') places = places.reverse();
    if (params.get('sort') === 'NEAREST') {
      const distance = (place: (typeof places)[number]) =>
        (place.latitude - Number(params.get('latitude'))) ** 2 +
        (place.longitude - Number(params.get('longitude'))) ** 2;
      places.sort((a, b) => distance(a) - distance(b));
    }
    const offset = Math.max(0, Number(params.get('cursor')) || 0);
    const size = Math.max(1, Math.min(100, Number(params.get('size')) || 20));
    const hasNext = offset + size < places.length;
    return success({
      items: places.slice(offset, offset + size),
      totalCount: places.length,
      hasNext,
      nextCursor: hasNext ? String(offset + size) : null,
    });
  }
  if ((path === '/places/saved/search' || path === '/places/search') && method === 'GET') {
    const query = (params.get('query') ?? '').toLowerCase();
    let places = selectedPlaces.filter((place) =>
      `${place.name} ${place.address} ${place.category}`.toLowerCase().includes(query),
    );
    if (params.has('groupId')) {
      const ids = new Set(
        db.posts
          .filter((post) => post.groups.some((group) => group.id === Number(params.get('groupId'))))
          .flatMap((post) => post.places.map((place) => place.id)),
      );
      places = places.filter((place) => ids.has(place.id));
    }
    return success({
      ...page(
        places.map((place) => ({
          ...place,
          existingPlaceId: place.id,
          selectionToken: `local-${place.id}`,
        })),
        params,
      ),
      groups: summaries(),
    });
  }
  const placeMatch = path.match(/^\/places\/(\d+)(?:\/(bookmark|memo|posts))?$/);
  if (placeMatch) {
    const place = db.places.find((item) => item.id === Number(placeMatch[1]));
    if (!place) throw new Error('장소를 찾을 수 없어요.');
    const posts = db.posts.filter((post) => post.places.some((item) => item.id === place.id));
    if (method === 'GET') {
      const items = posts.map((post) => ({ ...postSummary(post), groups: post.groups }));
      return success(
        placeMatch[2] === 'posts' ? page(items, params) : { ...place, posts: page(items, params) },
      );
    }
    if (method === 'PATCH' && (placeMatch[2] === 'memo' || placeMatch[2] === 'bookmark')) {
      if (placeMatch[2] === 'memo') place.memo = body.memo;
      else place.bookmarked = Boolean(body.bookmarked);
      for (const post of posts)
        post.places = post.places.map((item) =>
          item.id === place.id ? { ...item, memo: place.memo, bookmarked: place.bookmarked } : item,
        );
      return success(place);
    }
  }
  if (path === '/posts/groups' && method === 'PUT') {
    for (const post of db.posts.filter((item) => body.postIds?.includes(item.postId)))
      post.groups = postGroups(body.groupIds ?? []);
    return success(null);
  }
  if (path === '/posts' && method === 'GET')
    return success(page(db.posts.map(postSummary), params));
  const postMatch = path.match(
    /^\/posts\/(\d+)(?:\/(memo|groups|place-parsing|places)(?:\/(\d+))?)?$/,
  );
  if (postMatch) {
    const post = db.posts.find((item) => item.postId === Number(postMatch[1]));
    if (!post) throw new Error('게시물을 찾을 수 없어요.');
    if (method === 'POST' && postMatch[2] === 'places') {
      const place = db.places.find((item) => `local-${item.id}` === body.selectionToken);
      if (!place) throw new Error('장소를 찾을 수 없어요.');
      if (!post.places.some((item) => item.id === place.id))
        post.places.push({ ...place, sequence: post.places.length });
      return success({ placeId: place.id });
    }
    if (method === 'GET')
      return success(postMatch[2] === 'place-parsing' ? { ...post, failureReason: null } : post);
    if (postMatch[2] === 'memo' && method === 'PATCH') {
      post.memo = body.memo;
      return success(post);
    }
    if (postMatch[2] === 'groups' && method === 'PUT') {
      post.groups = postGroups(body.groupIds ?? []);
      return success(post);
    }
    if (method === 'DELETE') {
      if (postMatch[2] === 'places')
        post.places = post.places.filter((place) => place.id !== Number(postMatch[3]));
      else db.posts = db.posts.filter((item) => item.postId !== post.postId);
      return success(null);
    }
  }
  if (path === '/members/me') {
    if (method === 'GET') return success(db.profile);
    if (method === 'PATCH') {
      Object.assign(db.profile, body);
      return success(db.profile);
    }
  }
  if (path === '/me/place-connection-reminder')
    return success({ enabled: false, showBanner: false, unlinkedPostCount: 0 });
  if (path === '/me/push-preferences') return success({ postProcessingEnabled: false });
  if (path === '/onboarding/events' || path === '/auth/logout') return success(null);
  throw new Error(`로컬 목 모드에서 지원하지 않는 요청입니다: ${method} ${path}`);
}
