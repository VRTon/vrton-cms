import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { withBasePath } from '../../utils/assetPath';
import type {
  ItineraryActivity,
  ItineraryBlock as ItineraryBlockType,
  ItineraryColumnId,
  ItineraryRow,
} from '../../types';
import {
  getItineraryDescriptionPreview,
  getItineraryIconClass,
  ITINERARY_COLUMN_IDS,
  normalizeItineraryBlock,
} from './itineraryModel';
import './itinerary.css';

interface ItineraryBlockProps {
  block: ItineraryBlockType
}

interface ActiveActivity {
  activity: ItineraryActivity
  row: ItineraryRow
  columnId: ItineraryColumnId
}

function formatTime(row: ItineraryRow): string {
  return `${row.startTime || '--:--'} – ${row.endTime || '--:--'}`;
}

export default function ItineraryBlock({ block }: ItineraryBlockProps) {
  const { t } = useTranslation();
  const normalized = normalizeItineraryBlock(block);
  const [active, setActive] = useState<ActiveActivity | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  const closeModal = useCallback(() => {
    setActive(null);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!active) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeModal();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) {
        return;
      }

      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )).filter((element) => !element.hasAttribute('disabled'));
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [active, closeModal]);

  const openActivity = (
    activity: ItineraryActivity,
    row: ItineraryRow,
    columnId: ItineraryColumnId,
    trigger: HTMLButtonElement,
  ) => {
    triggerRef.current = trigger;
    setActive({ activity, row, columnId });
  };

  const renderActivity = (
    activity: ItineraryActivity | null,
    row: ItineraryRow,
    columnId: ItineraryColumnId,
    key: string,
  ) => {
    if (!activity) {
      return <div key={key} className="itinerary-empty-cell" aria-hidden="true" />;
    }
    const descriptionPreview = getItineraryDescriptionPreview(activity.description);

    return (
      <button
        key={key}
        type="button"
        className={`itinerary-activity itinerary-activity-${columnId}`}
        aria-label={`${activity.title}, ${formatTime(row)}`}
        onClick={(event) => openActivity(activity, row, columnId, event.currentTarget)}
      >
        <span className="itinerary-activity-icon" aria-hidden="true">
          <i className={`fa-solid ${getItineraryIconClass(activity.icon)}`} />
        </span>
        <span className="itinerary-activity-copy">
          <strong>{activity.title || t('itinerary.untitled', 'Activity')}</strong>
          {descriptionPreview ? <span>{descriptionPreview}</span> : null}
        </span>
      </button>
    );
  };

  if (normalized.rows.length === 0) {
    return null;
  }

  return (
    <section className="itinerary-block" aria-label={normalized.title || t('itinerary.schedule', 'Activity schedule')}>
      {normalized.title ? <h2 className="itinerary-block-title">{normalized.title}</h2> : null}

      <div className="itinerary-legend" aria-hidden="true">
        {normalized.columns.map((column) => (
          <span key={column.id} className={`itinerary-legend-item itinerary-legend-${column.id}`}>
            {column.label}
          </span>
        ))}
      </div>

      <div className="itinerary-desktop">
        <table className="itinerary-table">
          <thead>
            <tr>
              <th scope="col">{t('itinerary.time', 'Time')}</th>
              {normalized.columns.map((column) => (
                <th key={column.id} scope="col" className={`itinerary-heading-${column.id}`}>{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {normalized.rows.map((row, rowIndex) => (
              <tr key={`${row.startTime}-${row.endTime}-${rowIndex}`}>
                <th scope="row" className="itinerary-time">{formatTime(row)}</th>
                {ITINERARY_COLUMN_IDS.map((columnId) => (
                  <td key={columnId}>
                    {renderActivity(row.activities[columnId], row, columnId, `desktop-${rowIndex}-${columnId}`)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="itinerary-mobile">
        {normalized.columns.map((column) => (
          <section key={column.id} className={`itinerary-mobile-instance itinerary-mobile-${column.id}`}>
            <h3>{column.label}</h3>
            <div className="itinerary-mobile-rows">
              {normalized.rows.map((row, rowIndex) => (
                <div className="itinerary-mobile-row" key={`${column.id}-${row.startTime}-${rowIndex}`}>
                  <div className="itinerary-time">{formatTime(row)}</div>
                  {renderActivity(row.activities[column.id], row, column.id, `mobile-${rowIndex}-${column.id}`)}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {active ? (
        <div
          className="itinerary-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >
          <div
            ref={dialogRef}
            className={`itinerary-modal itinerary-modal-${active.columnId}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
          >
            <button
              ref={closeRef}
              type="button"
              className="itinerary-modal-close"
              aria-label={t('itinerary.close', 'Close')}
              onClick={closeModal}
            >
              <i className="fa-solid fa-xmark" aria-hidden="true" />
            </button>
            {active.activity.image ? (
              <img
                className="itinerary-modal-image"
                src={withBasePath(active.activity.image)}
                alt={active.activity.imageAlt || active.activity.title}
              />
            ) : null}
            <div className="itinerary-modal-heading">
              <span className="itinerary-activity-icon" aria-hidden="true">
                <i className={`fa-solid ${getItineraryIconClass(active.activity.icon)}`} />
              </span>
              <div>
                <p className="itinerary-modal-time">{formatTime(active.row)}</p>
                <h2 id={titleId}>{active.activity.title || t('itinerary.untitled', 'Activity')}</h2>
              </div>
            </div>
            <p id={descriptionId} className="itinerary-modal-description">
              {active.activity.description}
            </p>
            {active.activity.speaker ? (
              <p className="itinerary-modal-speaker">
                <strong>{t('itinerary.speaker', 'Speaker')}:</strong> {active.activity.speaker}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
