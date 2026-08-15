import { Popup } from '@/shared/ui';
import type { PlaceDeletion } from '../lib/usePlaceDeletion';

/**
 * 장소 삭제 확인 모달. `usePlaceDeletion` 이 들고 있는 대상이 있을 때만 뜬다 —
 * 이 모달을 거치지 않고 삭제가 실행되는 경로는 없다.
 *
 * 문구를 화면마다 쓰지 않고 여기서 소유해 지도·게시물 상세가 같은 말을 쓰게 한다.
 */
export function PlaceDeletePopup({ deletion }: { deletion: PlaceDeletion }) {
  return (
    <Popup
      open={deletion.pendingPlace !== null}
      onClose={deletion.cancelDelete}
      title="장소를 삭제하시겠어요?"
      description={
        <>
          삭제하면 지도와 저장한 공간에서
          <br />이 장소가 사라져요.
        </>
      }
      confirmLabel="삭제하기"
      variant="warning"
      onConfirm={deletion.confirmDelete}
    />
  );
}
