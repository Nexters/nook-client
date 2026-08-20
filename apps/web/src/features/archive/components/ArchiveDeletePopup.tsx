import { useNavigate } from 'react-router-dom';
import { capturePostHogEvent } from '@/lib/posthog';
import { useToast } from '@/shared/toast';
import { Popup } from '@/shared/ui';
import { useDeleteArchive } from '../api/queries';
import type { Archive } from '../types';

export interface ArchiveDeletePopupProps {
  open: boolean;
  onClose: () => void;
  archive: Pick<Archive, 'id' | 'name'>;
}

/**
 * 더보기 메뉴·아카이브 편집 두 진입 경로가 이 팝업 하나를 공유한다(NOOK-230) —
 * 문구·삭제 요청·성공 후 이동이 갈라지지 않도록 한곳에서만 관리한다.
 */
export function ArchiveDeletePopup({ open, onClose, archive }: ArchiveDeletePopupProps) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const deleteArchive = useDeleteArchive();

  return (
    <Popup
      open={open}
      onClose={onClose}
      title="아카이브를 삭제하시겠어요?"
      description={
        <>
          아카이브를 삭제하면 아카이브에 포함된
          <br />
          게시물도 모두 삭제돼요.
        </>
      }
      confirmLabel="삭제하기"
      variant="warning"
      onConfirm={() =>
        deleteArchive.mutate(archive.id, {
          onSuccess: () => {
            capturePostHogEvent('archive_deleted', { archive_id: archive.id });
            navigate('/archive', { replace: true });
            showToast({ variant: 'simple', title: `"${archive.name}" 아카이브가 삭제 됐어요.` });
          },
          onError: () => showToast({ variant: 'simple', title: '아카이브를 삭제하지 못했어요' }),
        })
      }
    />
  );
}
