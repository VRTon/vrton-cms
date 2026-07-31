import { useState } from 'react';
import type {
  ItineraryActivity,
  ItineraryBlock,
  ItineraryColumnId,
  ItineraryRow,
} from '../../types';
import { fileToDataUrl, optimizeImageForUpload } from '../page/upload';
import {
  createEmptyItineraryActivity,
  createEmptyItineraryRow,
  ITINERARY_COLUMN_IDS,
  ITINERARY_ICON_OPTIONS,
  normalizeItineraryBlock,
} from './itineraryModel';

interface ItineraryEditorProps {
  block: ItineraryBlock
  onChange: (_field: 'title' | 'columns' | 'rows', _value: unknown) => void
}

function imageExtension(file: File): string {
  if (file.type === 'image/png') {
    return 'png';
  }
  if (file.type === 'image/webp') {
    return 'webp';
  }
  return 'jpg';
}

export default function ItineraryEditor({ block, onChange }: ItineraryEditorProps) {
  const normalized = normalizeItineraryBlock(block, { preserveEditableWhitespace: true });
  const [uploadingCell, setUploadingCell] = useState('');
  const [uploadError, setUploadError] = useState('');

  const updateRow = (rowIndex: number, updater: (_row: ItineraryRow) => ItineraryRow) => {
    const rows = [...normalized.rows];
    rows[rowIndex] = updater(rows[rowIndex]);
    onChange('rows', rows);
  };

  const updateActivity = (
    rowIndex: number,
    columnId: ItineraryColumnId,
    updater: (_activity: ItineraryActivity) => ItineraryActivity,
  ) => {
    updateRow(rowIndex, (row) => ({
      ...row,
      activities: {
        ...row.activities,
        [columnId]: updater(row.activities[columnId] || createEmptyItineraryActivity()),
      },
    }));
  };

  const uploadImage = async (rowIndex: number, columnId: ItineraryColumnId, file: File) => {
    const cellKey = `${rowIndex}-${columnId}`;
    setUploadingCell(cellKey);
    setUploadError('');
    try {
      const optimized = await optimizeImageForUpload(file);
      const dataUrl = await fileToDataUrl(optimized);
      const fileName = `itinerary-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${imageExtension(optimized)}`;
      const uploadPath = `uploads/images/itinerary/${fileName}`;
      const response = await fetch('/__admin/api/assets/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: uploadPath, dataUrl }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || 'Upload failed');
      }
      updateActivity(rowIndex, columnId, (activity) => ({
        ...activity,
        image: payload.publicPath || `/${uploadPath}`,
      }));
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setUploadingCell('');
    }
  };

  return (
    <div className="admin-itinerary-editor">
      <section className="admin-hero-panel">
        <div className="admin-hero-panel-head">
          <strong>Itinerary settings</strong>
          <button
            type="button"
            className="admin-btn secondary"
            onClick={() => onChange('rows', [...normalized.rows, createEmptyItineraryRow()])}
          >
            <i className="fa-solid fa-plus" aria-hidden="true" />
            Add time row
          </button>
        </div>
        <div className="admin-field">
          <label>Optional block title</label>
          <input
            className="admin-input"
            value={normalized.title || ''}
            onChange={(event) => onChange('title', event.target.value)}
          />
        </div>
        <div className="admin-itinerary-columns">
          {normalized.columns.map((column, columnIndex) => (
            <div className="admin-field" key={column.id}>
              <label>{column.id === 'main' ? 'Main column label' : 'Party column label'}</label>
              <input
                className="admin-input"
                value={column.label}
                onChange={(event) => {
                  const columns = [...normalized.columns] as ItineraryBlock['columns'];
                  columns[columnIndex] = { ...column, label: event.target.value };
                  onChange('columns', columns);
                }}
              />
            </div>
          ))}
        </div>
        {uploadError ? <p className="admin-error">{uploadError}</p> : null}
      </section>

      <section className="admin-itinerary-rows">
        {normalized.rows.length === 0 ? (
          <p className="admin-note">Add a time row to start building the itinerary.</p>
        ) : null}
        {normalized.rows.map((row, rowIndex) => (
          <article className="admin-itinerary-row" key={`${rowIndex}-${row.startTime}`}>
            <header className="admin-itinerary-row-head">
              <strong>Time row #{rowIndex + 1}</strong>
              <div className="admin-actions">
                <button
                  type="button"
                  className="admin-icon-btn secondary"
                  title="Move row up"
                  disabled={rowIndex === 0}
                  onClick={() => {
                    const rows = [...normalized.rows];
                    const [moved] = rows.splice(rowIndex, 1);
                    rows.splice(rowIndex - 1, 0, moved);
                    onChange('rows', rows);
                  }}
                >
                  <i className="fa-solid fa-arrow-up" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="admin-icon-btn secondary"
                  title="Move row down"
                  disabled={rowIndex === normalized.rows.length - 1}
                  onClick={() => {
                    const rows = [...normalized.rows];
                    const [moved] = rows.splice(rowIndex, 1);
                    rows.splice(rowIndex + 1, 0, moved);
                    onChange('rows', rows);
                  }}
                >
                  <i className="fa-solid fa-arrow-down" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="admin-icon-btn danger"
                  title="Remove row"
                  onClick={() => onChange('rows', normalized.rows.filter((_, index) => index !== rowIndex))}
                >
                  <i className="fa-solid fa-trash" aria-hidden="true" />
                </button>
              </div>
            </header>

            <div className="admin-itinerary-time-fields">
              <div className="admin-field">
                <label>Start time</label>
                <input
                  className="admin-input"
                  type="time"
                  value={row.startTime}
                  onChange={(event) => updateRow(rowIndex, (current) => ({
                    ...current,
                    startTime: event.target.value,
                  }))}
                />
              </div>
              <div className="admin-field">
                <label>End time</label>
                <input
                  className="admin-input"
                  type="time"
                  value={row.endTime}
                  onChange={(event) => updateRow(rowIndex, (current) => ({
                    ...current,
                    endTime: event.target.value,
                  }))}
                />
              </div>
            </div>

            <h4 className="admin-itinerary-columns-label">Columns</h4>

            <div className="admin-itinerary-activities">
              {ITINERARY_COLUMN_IDS.map((columnId) => {
                const activity = row.activities[columnId];
                const cellKey = `${rowIndex}-${columnId}`;
                return (
                  <section className={`admin-itinerary-activity admin-itinerary-activity-${columnId}`} key={columnId}>
                    <div className="admin-itinerary-activity-head">
                      <strong>{normalized.columns.find((column) => column.id === columnId)?.label}</strong>
                      <label className="admin-hero-toggle">
                        <input
                          type="checkbox"
                          checked={Boolean(activity)}
                          onChange={(event) => updateRow(rowIndex, (current) => ({
                            ...current,
                            activities: {
                              ...current.activities,
                              [columnId]: event.target.checked ? createEmptyItineraryActivity() : null,
                            },
                          }))}
                        />
                        <span>Has activity</span>
                      </label>
                    </div>

                    {activity ? (
                      <div className="admin-itinerary-activity-fields">
                        <input
                          className="admin-input"
                          placeholder="Activity title"
                          value={activity.title}
                          onChange={(event) => updateActivity(rowIndex, columnId, (current) => ({
                            ...current,
                            title: event.target.value,
                          }))}
                        />
                        <textarea
                          className="admin-textarea"
                          placeholder="Description"
                          value={activity.description}
                          onChange={(event) => updateActivity(rowIndex, columnId, (current) => ({
                            ...current,
                            description: event.target.value,
                          }))}
                        />
                        <input
                          className="admin-input"
                          placeholder="Speaker (optional)"
                          value={activity.speaker || ''}
                          onChange={(event) => updateActivity(rowIndex, columnId, (current) => ({
                            ...current,
                            speaker: event.target.value,
                          }))}
                        />
                        <select
                          className="admin-select"
                          value={activity.icon || 'welcome'}
                          onChange={(event) => updateActivity(rowIndex, columnId, (current) => ({
                            ...current,
                            icon: event.target.value as ItineraryActivity['icon'],
                          }))}
                        >
                          {ITINERARY_ICON_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                        <input
                          className="admin-input"
                          placeholder="Image URL (optional)"
                          value={activity.image || ''}
                          onChange={(event) => updateActivity(rowIndex, columnId, (current) => ({
                            ...current,
                            image: event.target.value,
                          }))}
                        />
                        <input
                          className="admin-input"
                          placeholder="Image alt text"
                          value={activity.imageAlt || ''}
                          required={Boolean(activity.image)}
                          aria-invalid={Boolean(activity.image && !activity.imageAlt)}
                          onChange={(event) => updateActivity(rowIndex, columnId, (current) => ({
                            ...current,
                            imageAlt: event.target.value,
                          }))}
                        />
                        <label className="admin-btn secondary admin-itinerary-upload">
                          <i className="fa-solid fa-upload" aria-hidden="true" />
                          {uploadingCell === cellKey ? 'Uploading…' : 'Upload image'}
                          <input
                            type="file"
                            accept="image/*"
                            disabled={Boolean(uploadingCell)}
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              if (file) {
                                void uploadImage(rowIndex, columnId, file);
                              }
                              event.target.value = '';
                            }}
                          />
                        </label>
                      </div>
                    ) : null}
                  </section>
                );
              })}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
