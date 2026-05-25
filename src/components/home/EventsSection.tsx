import React from 'react';
import { useTranslation } from 'react-i18next';
import Carousel from './Carousel';
import { EVENTS_DEFAULT_DATA, EVENTS_DEFAULT_META, buildDefaultEventsRows } from './defaultHomeContent';
import type { EventItem, CollaboratorItem } from '../../types';
import { withBasePath } from '../../utils/assetPath';

interface CollaboratorEntry {
  id?: string
  src?: string
  name?: string
  href?: string
}

interface EventsSectionConfig {
  title?: string
  rows?: EventRow[]
  collaboratorsCatalog?: CollaboratorEntry[]
}

interface EventRow {
  year: string
  amount?: string
  events?: EventItem[]
  collaborators?: CollaboratorItem[]
  collaboratorIds?: string[]
}

function EventsSection({ config = {} }: { config?: EventsSectionConfig }) {
  const { t } = useTranslation();
  const title = config.title || t('home.events.title');
  const configuredRows = Array.isArray(config.rows) ? config.rows : [];
  const defaultRows = buildDefaultEventsRows();
  const rows = configuredRows.length > 0 ? configuredRows : defaultRows;

  return (
    <section className="events-section" id="events">
      <div className="container">
        <h2 className="section-title">{title}</h2>

        <div className="events-container">
          {rows
            .slice()
            .sort((a, b) => Number(b.year) - Number(a.year))
            .map((row, index) => {
              const year = String(row.year || '');
              const events = Array.isArray(row.events) && row.events.length > 0
                ? row.events
                : (EVENTS_DEFAULT_DATA[year] || []);
              const fallbackMeta = EVENTS_DEFAULT_META[year] || { amount: '', collaborators: [] };
              const amount = row.amount || fallbackMeta.amount || '';
              const catalog = Array.isArray(config.collaboratorsCatalog) ? config.collaboratorsCatalog : [];
              const collaboratorsFromIds = Array.isArray(row.collaboratorIds)
                ? row.collaboratorIds
                  .map((id) => catalog.find((entry) => entry.id === id))
                  .filter((entry): entry is CollaboratorEntry => Boolean(entry))
                  .map((entry) => ({ src: entry.src || '', alt: entry.name || '', href: entry.href || '' }))
                : [];
              const collaborators = collaboratorsFromIds.length > 0
                ? collaboratorsFromIds
                : (Array.isArray(row.collaborators) && row.collaborators.length > 0
                  ? row.collaborators
                  : (fallbackMeta.collaborators || []));
              const sideClass = index % 2 === 0 ? 'event-left' : 'event-right';
              return (
                <div key={year} className={`event-card ${sideClass}`}>
                  <Carousel events={events} year={year} />

                  <div className="event-info">
                    <h3 className="event-title">VRTon {year}</h3>
                    <p className="event-goal">
                      {t('home.events.goal_reached')}: <span className="amount">{amount}</span>
                    </p>
                  </div>

                  <div className="event-collaborators">
                    {collaborators.map((collab) => (
                      collab.href
                        ? (
                            <a key={`${year}-${collab.alt}`} href={collab.href} target="_blank" rel="noopener noreferrer" aria-label={collab.alt || 'Collaborator'}>
                            <img src={withBasePath(collab.src)} alt={collab.alt} className="collab-logo" loading="lazy" />
                          </a>
                        )
                        : <img key={`${year}-${collab.alt}`} src={withBasePath(collab.src)} alt={collab.alt} className="collab-logo" loading="lazy" />
                    ))}
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </section>
  );
}

export default EventsSection;
