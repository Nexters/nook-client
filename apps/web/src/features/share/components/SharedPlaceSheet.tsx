import { useNavigate } from 'react-router-dom';
import { ArchiveEmpty } from '@/features/archive/components/ArchiveEmpty';
import { PlaceInfo, PlacePhotos } from '@/features/place';
import { buildNaverMapSearchUrl } from '@/features/place/lib/naverMapLink';
import { formatBusinessHours, formatBusinessStatus } from '@/features/place/lib/opening-hours';
import { Badge, Drawer, DrawerContent, DrawerTitle, Thumbnail } from '@/shared/ui';
import { useSharedPlaceDetail } from '../api/queries';
import { shareErrorMessage } from '../lib/shareError';

/**
 * 공유 아카이브 안의 장소 상세 — `MapPage`의 `PlaceDetail`(지도 핀 상세)과 같은 결을
 * 따르되 읽기 전용이다. 공유자의 북마크·메모 편집 UI는 노출하지 않는다(계획의 전역 제약).
 *
 * 열림/닫힘은 `SharedArchivePage`가 소유한 `?placeId=` 쿼리 파라미터가 결정한다 —
 * 이 컴포넌트는 `placeId` 가 있는 동안만 마운트되고, 닫히면 언마운트된다.
 */
export function SharedPlaceSheet({
  token,
  placeId,
  onClose,
}: {
  token: string;
  placeId: number;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const { data: place, isError, error } = useSharedPlaceDetail(token, placeId);

  return (
    <Drawer open onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerTitle className="sr-only">장소 상세</DrawerTitle>
        <div className="flex w-full flex-col gap-3 overflow-y-auto px-4 pb-6">
          {isError ? (
            <ArchiveEmpty message={shareErrorMessage(error)} />
          ) : place ? (
            <>
              <div className="flex w-full flex-col gap-1">
                <div className="flex min-w-0 items-center gap-2">
                  <p className="min-w-0 truncate text-h1 font-semibold text-gray-100">
                    {place.name}
                  </p>
                  {place.category ? (
                    <p className="shrink-0 text-b2 text-gray-80">{place.category}</p>
                  ) : null}
                </div>
                {place.tags.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 py-2">
                    {place.tags.map((tag) => (
                      <Badge key={tag} variant="label">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <PlacePhotos photos={place.photos} />

              <PlaceInfo
                address={place.address}
                mapHref={buildNaverMapSearchUrl(place)}
                businessStatus={formatBusinessStatus(place.openNow)}
                businessHours={formatBusinessHours(place.openingHours)}
                memo={place.memo}
                className="mb-4"
              />

              {place.posts.length > 0 ? (
                <div className="flex w-full flex-col gap-3">
                  <p className="text-b1 font-semibold text-gray-100">저장한 게시물</p>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-5">
                    {place.posts.map((post) => (
                      <button
                        key={post.id}
                        type="button"
                        onClick={() => navigate(`/shared/${token}/post/${post.id}`)}
                        className="flex w-full flex-col items-start gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-100 focus-visible:ring-offset-2"
                      >
                        <Thumbnail
                          src={post.thumbnail}
                          alt=""
                          className="aspect-[167/208] h-auto w-full"
                        />
                        <p className="line-clamp-2 text-b3 font-semibold text-gray-90">
                          {post.title}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
