import { getBlockIcon, getBlockLabel } from './constants';

interface LibraryDragGhostProps {
  entry?: { icon?: string; label?: string }
}

export function LibraryDragGhost({ entry }: LibraryDragGhostProps) {
  if (!entry) {
    return null;
  }

  return (
    <div className="admin-library-ghost">
      <i className={`fa-solid ${entry.icon}`} aria-hidden="true" />
      <span>{entry.label}</span>
    </div>
  );
}

interface SubitemDragGhostProps {
  active?: { type?: string; icon?: string }
}

export function SubitemDragGhost({ active }: SubitemDragGhostProps) {
  if (!active) {
    return null;
  }

  return (
    <div className="admin-library-ghost">
      <i className={`fa-solid ${active.icon || getBlockIcon(active.type)}`} aria-hidden="true" />
      <span>{getBlockLabel(active.type)}</span>
    </div>
  );
}

export function SectionDragGhost() {
  return (
    <div className="admin-library-ghost">
      <i className="fa-solid fa-folder-tree" aria-hidden="true" />
      <span>Section</span>
    </div>
  );
}

export function RowDragGhost() {
  return (
    <div className="admin-library-ghost">
      <i className="fa-solid fa-grip-lines" aria-hidden="true" />
      <span>Row</span>
    </div>
  );
}

export function ColumnDragGhost() {
  return (
    <div className="admin-library-ghost">
      <i className="fa-solid fa-table-columns" aria-hidden="true" />
      <span>Column</span>
    </div>
  );
}