import { useParams } from 'react-router-dom';
import { ArchiveSubscriberList } from '@/features/archive/components/ArchiveSubscriberList';
import { useSharedArchive, useSharedArchiveSubscribers } from './api/queries';

/** `/shared/:token/subscribers` — 공유 링크 열람자가 보는 추가한 사람. */
export function SharedArchiveSubscribersPage() {
  const { token = '' } = useParams();
  const { data: archive } = useSharedArchive(token);
  const query = useSharedArchiveSubscribers(token);

  return <ArchiveSubscriberList archiveName={archive?.name} query={query} />;
}
