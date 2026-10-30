import { useParams } from 'react-router-dom';
import { useArchiveSubscribers, useArchives } from './api/queries';
import { ArchiveSubscriberList } from './components/ArchiveSubscriberList';

/** `/archive/:archiveId/subscribers` — 내 아카이브·공유받은 아카이브의 추가한 사람. */
export function ArchiveSubscribersPage() {
  const { archiveId: archiveIdParam } = useParams();
  const archiveId = archiveIdParam ? Number(archiveIdParam) : undefined;
  const { data: archives } = useArchives();
  const archive = archives?.find((item) => item.id === archiveId);
  const query = useArchiveSubscribers(Number.isFinite(archiveId) ? archiveId : undefined);

  return <ArchiveSubscriberList archiveName={archive?.name} query={query} />;
}
