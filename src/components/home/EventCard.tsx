import React from 'react';
import type { EventItem } from '../../types';
import { withBasePath } from '../../utils/assetPath';

interface EventCardProps {
  event: EventItem
  index: number
  year: string
}

function EventCard({ event }: EventCardProps) {
  return (
    <div className="event-card" data-year={event.src}>
      <img
        src={withBasePath(event.src)}
        alt={event.alt}
        loading="lazy"
      />
    </div>
  );
}

export default EventCard;
