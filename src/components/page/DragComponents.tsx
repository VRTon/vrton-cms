import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { getBlockIcon, getBlockLabel } from './constants';

interface SortableSectionItemRowProps {
  item: { _iid: string; type?: string }
  label: string
  onRemove: () => void
}

export function SortableSectionItemRow({ item, label, onRemove }: SortableSectionItemRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `subitem:${item._iid}`,
    data: { source: 'subitem', itemId: item._iid, type: item.type },
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="admin-subsection-item-header">
      <div className="admin-subsection-item-main">
        <button type="button" className="admin-icon-btn secondary" aria-label="Drag item" title="Drag item" {...attributes} {...listeners}>
          <i className="fa-solid fa-grip-vertical" aria-hidden="true" />
        </button>
        <strong>{label}</strong>
      </div>
      <div className="admin-subsection-item-actions">
        <button type="button" className="admin-icon-btn danger" aria-label="Delete item" title="Delete item" onClick={onRemove}>
          <i className="fa-solid fa-trash" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

interface CollapsedSectionItemDraggableProps {
  item: { _iid: string; type?: string }
}

export function CollapsedSectionItemDraggable({ item }: CollapsedSectionItemDraggableProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `subitem:${item._iid}`,
    data: { source: 'subitem', itemId: item._iid, type: item.type },
  });

  return (
    <div
      ref={setNodeRef}
      className={`admin-canvas-section-item ${isDragging ? 'is-dragging' : ''}`}
      {...listeners}
      {...attributes}
    >
      <i className={`fa-solid ${getBlockIcon(item.type)}`} aria-hidden="true" />
      <span>{getBlockLabel(item.type)}</span>
    </div>
  );
}

interface DraggableLibraryItemProps {
  entry: { type: string; icon: string; label: string }
}

export function DraggableLibraryItem({ entry }: DraggableLibraryItemProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `library:${entry.type}`,
    data: { source: 'library', type: entry.type },
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      className={`admin-library-item ${isDragging ? 'is-dragging' : ''}`}
      aria-label={`Drag ${entry.label} to canvas`}
      title={`Drag ${entry.label} to canvas`}
      onClick={(event) => {
        event.preventDefault();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
        }
      }}
      {...listeners}
      {...attributes}
    >
      <i className={`fa-solid ${entry.icon}`} aria-hidden="true" />
      <span>{entry.label}</span>
    </button>
  );
}

interface SectionItemsDropZoneProps {
  children: React.ReactNode
  dropId?: string
  emptyMessage?: string
  className?: string
}

export function SectionItemsDropZone({ children, dropId = 'section-items-dropzone', emptyMessage = '', className = '' }: SectionItemsDropZoneProps) {
  const { setNodeRef, isOver } = useDroppable({ id: dropId });
  return (
    <div ref={setNodeRef} className={`admin-section-items ${isOver ? 'is-over' : ''} ${className}`.trim()}>
      {emptyMessage ? <p className="admin-empty-state">{emptyMessage}</p> : null}
      {children}
    </div>
  );
}
