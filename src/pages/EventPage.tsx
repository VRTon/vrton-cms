import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Carousel from '../components/home/Carousel';
import HomeBlocksRenderer from '../components/home/HomeBlocksRenderer';
import { getPageContent } from '../content/pages';
import type { LanguageCode } from '../types';
import NotFoundPage from './NotFoundPage';
import { parseEventYear, prepareEventPageBlocks } from './eventPageModel';

interface EventPageProps {
  language: LanguageCode
}

function EventPage({ language }: EventPageProps) {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useTranslation();
  const year = parseEventYear(slug);
  const content = year && slug ? getPageContent(slug, language) : null;

  if (!content || content.meta.kind !== 'event') {
    return <NotFoundPage />;
  }

  const { carouselItems, remainingBlocks } = prepareEventPageBlocks(content.blocks || []);

  return (
    <main className="event-page">
      <div className="container event-page-container">
        <header className="event-page-header">
          <h1>{content.meta.title}</h1>
          {content.meta.description ? <p>{content.meta.description}</p> : null}
        </header>

        <section className="event-page-media" aria-label={t('event_page.gallery_label', { year })}>
          {carouselItems.length > 0 ? (
            <div className="event-page-carousel">
              <Carousel events={carouselItems} year={year} />
            </div>
          ) : (
            <div className="event-page-placeholder" role="status">
              {t('event_page.no_photos')}
            </div>
          )}
        </section>

        {remainingBlocks.length > 0 ? (
          <div className="event-page-blocks">
            <HomeBlocksRenderer blocks={remainingBlocks} />
          </div>
        ) : null}
      </div>
    </main>
  );
}

export default EventPage;
