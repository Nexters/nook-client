import { Icon16CheckCircle, Icon16Pen, Icon16Share, Icon16Trash } from '@/shared/icons/NookIcons';
import { MoreMenu, type MoreMenuItem } from '@/shared/ui';

/** Figma `아카이브 상세 > 더보기 메뉴`(138:5298) — 소유·공유 여부에 따라 항목만 고른다. */
export type ArchiveDetailMenuProps =
  | {
      kind: 'owned';
      onEdit: () => void;
      onShare: () => void;
      /**
       * 선택 삭제 — 게시물 다중 선택 모드로 전환한다.
       * 넘기지 않으면 항목 자체가 빠진다(장소 탭처럼 지울 수 없는 화면).
       */
      onSelectDelete?: () => void;
      onDelete: () => void;
    }
  | {
      /** 공유받은(SHARED) 아카이브 — 읽기 전용이라 제거만 가능하다. */
      kind: 'shared';
      onRemove: () => void;
    };

function ArchiveDetailMenu(props: ArchiveDetailMenuProps) {
  const items: MoreMenuItem[] =
    props.kind === 'owned'
      ? [
          { label: '아카이브 편집', icon: <Icon16Pen />, onSelect: props.onEdit },
          { label: '아카이브 공유', icon: <Icon16Share />, onSelect: props.onShare },
          ...(props.onSelectDelete
            ? [{ label: '선택 삭제', icon: <Icon16CheckCircle />, onSelect: props.onSelectDelete }]
            : []),
          {
            label: '아카이브 삭제',
            icon: <Icon16Trash />,
            onSelect: props.onDelete,
            destructive: true,
          },
        ]
      : [
          {
            label: '내 목록에서 제거',
            icon: <Icon16Trash />,
            onSelect: props.onRemove,
            destructive: true,
          },
        ];

  return <MoreMenu items={items} />;
}

export { ArchiveDetailMenu };
