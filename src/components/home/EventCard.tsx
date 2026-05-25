import React from 'react';
import type { EventItem } from '../../types';

interface EventCardProps {
  event: EventItem
  index: number
  year: string
}

function EventCard({ event }: EventCardProps) {
  return (
    <div className="event-card" data-year={event.src}>
      <img
        src={event.src}
        alt={event.alt}
        loading="lazy"
      />
    </div>
  );
}

export default EventCard;