import filterIcon from '@/assets/images/archive-filter.svg';
import deleteIcon from '@/assets/images/archive-menu/delete.svg';
import editIcon from '@/assets/images/archive-menu/edit.svg';
import selectIcon from '@/assets/images/archive-menu/select.svg';
import shareIcon from '@/assets/images/archive-menu/share.svg';
import { MoreMenu, type MoreMenuItem } from '@/shared/ui';

/** Figma `아카이브 상세 > 더보기 메뉴`(138:5298) — 소유·공유 여부에 따라 항목만 고른다. */
export type ArchiveDetailMenuProps =
  | {
      kind: 'owned';
      onFilter?: () => void;
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
      onFilter?: () => void;
      onRemove: () => void;
    };

function ArchiveDetailMenu(props: ArchiveDetailMenuProps) {
  const items: MoreMenuItem[] =
    props.kind === 'owned'
      ? [
          { label: '아카이브 편집', icon: <img src={editIcon} alt="" />, onSelect: props.onEdit },
          {
            label: '아카이브 공유',
            icon: (
              <span className="relative size-4 shrink-0">
                <img src={shareIcon} alt="" className="absolute left-0 top-[-0.67px]" />
              </span>
            ),
            onSelect: props.onShare,
          },
          ...(props.onSelectDelete
            ? [
                {
                  label: '선택 편집',
                  icon: <img src={selectIcon} alt="" />,
                  onSelect: props.onSelectDelete,
                },
              ]
            : []),
          ...(props.onFilter
            ? [
                {
                  label: '아카이브 필터',
                  icon: (
                    <span className="grid size-4 place-items-center">
                      <img src={filterIcon} alt="" />
                    </span>
                  ),
                  onSelect: props.onFilter,
                },
              ]
            : []),
          {
            label: '아카이브 삭제',
            icon: <img src={deleteIcon} alt="" />,
            onSelect: props.onDelete,
            destructive: true,
          },
        ]
      : [
          ...(props.onFilter
            ? [
                {
                  label: '아카이브 필터',
                  icon: (
                    <span className="grid size-4 place-items-center">
                      <img src={filterIcon} alt="" />
                    </span>
                  ),
                  onSelect: props.onFilter,
                },
              ]
            : []),
          {
            label: '내 목록에서 제거',
            icon: <img src={deleteIcon} alt="" />,
            onSelect: props.onRemove,
            destructive: true,
          },
        ];

  return (
    <MoreMenu
      items={items}
      triggerClassName="grid h-10 w-11 place-items-center rounded-lg bg-gray-10 [&_svg]:size-4"
      menuClassName="mt-4"
    />
  );
}

export { ArchiveDetailMenu };
