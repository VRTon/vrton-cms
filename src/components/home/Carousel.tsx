import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { EventItem } from '../../types';
import { withBasePath } from '../../utils/assetPath';
import { useAccessibilityMode } from '../../hooks/useAccessibility.ts';

interface CarouselProps {
  events: EventItem[]
  year: string
}

const SLIDE_TRANSITION_MS = 1100;

function Carousel({ events, year }: CarouselProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [previousSlide, setPreviousSlide] = useState<number | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionDirection, setTransitionDirection] = useState<'next' | 'prev'>('next');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transitionTimeoutRef = useRef<number | null>(null);
  const totalSlides = events.length;
  const reduceMotion = useAccessibilityMode();

  const goToSlide = useCallback((index: number, direction: 'next' | 'prev') => {
    if (!totalSlides) {
      return;
    }

    const nextIndex = ((index % totalSlides) + totalSlides) % totalSlides;
    if (nextIndex === currentSlide) {
      return;
    }

    if (transitionTimeoutRef.current) {
      window.clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = null;
    }

    // CP8: en modo accesible la imagen cambia de golpe. El barrido dura 1100ms
    // y es de los movimientos mas grandes de la pagina.
    if (reduceMotion) {
      setPreviousSlide(null);
      setCurrentSlide(nextIndex);
      setIsTransitioning(false);
      return;
    }

    setTransitionDirection(direction);
    setPreviousSlide(currentSlide);
    setCurrentSlide(nextIndex);
    setIsTransitioning(true);

    transitionTimeoutRef.current = window.setTimeout(() => {
      setIsTransitioning(false);
      setPreviousSlide(null);
      transitionTimeoutRef.current = null;
    }, SLIDE_TRANSITION_MS);
  }, [currentSlide, totalSlides, reduceMotion]);

  useEffect(() => {
    // El avance automatico es movimiento que el usuario no pidio, asi que en
    // modo accesible queda solo la navegacion manual.
    if (totalSlides < 2 || isPaused || reduceMotion) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      return undefined;
    }

    intervalRef.current = setInterval(() => {
      goToSlide(currentSlide + 1, 'next');
    }, 5000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPaused, currentSlide, goToSlide, totalSlides, reduceMotion]);

  useEffect(() => {
    if (currentSlide >= totalSlides && totalSlides > 0) {
      setCurrentSlide(0);
      setPreviousSlide(null);
      setIsTransitioning(false);
    }
  }, [currentSlide, totalSlides]);

  useEffect(() => {
    if (!totalSlides) {
      setCurrentSlide(0);
      setPreviousSlide(null);
      setIsTransitioning(false);
    }
  }, [totalSlides]);

  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) {
        window.clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, []);

  const nextSlide = () => goToSlide(currentSlide + 1, 'next');
  const prevSlide = () => goToSlide(currentSlide - 1, 'prev');

  if (!totalSlides) {
    return null;
  }

  return (
    <div
      className="carousel"
      data-carousel={year}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="carousel-inner">
        {events.map((event, index) => (
          <div
            key={index}
            className={`carousel-item ${index === currentSlide ? 'active' : ''} ${isTransitioning && index === currentSlide ? `carousel-item-in dir-${transitionDirection}` : ''} ${isTransitioning && index === previousSlide ? `active carousel-item-out dir-${transitionDirection}` : ''}`}
          >
            <img src={withBasePath(event.src)} alt={event.alt} loading="lazy" />
          </div>
        ))}
      </div>

      <button className="carousel-btn prev" onClick={prevSlide} type="button" aria-label={`Previous slide (${year})`}>
        <i className="fas fa-chevron-left" />
      </button>
      <button className="carousel-btn next" onClick={nextSlide} type="button" aria-label={`Next slide (${year})`}>
        <i className="fas fa-chevron-right" />
      </button>

      <div className="carousel-indicators">
        {events.map((_, index) => (
          <span
            key={index}
            className={`indicator ${index === currentSlide ? 'active' : ''}`}
            onClick={() => goToSlide(index, index > currentSlide ? 'next' : 'prev')}
            aria-label={`Go to slide ${index + 1}`}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                goToSlide(index, index > currentSlide ? 'next' : 'prev');
              }
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default Carousel;
