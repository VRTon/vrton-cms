import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Hero from '../components/home/Hero';
import EventsSection from '../components/home/EventsSection';
import FAQSection from '../components/home/FAQSection';
import MarkdownContent from '../components/common/MarkdownContent';
import HomeBlocksRenderer from '../components/home/HomeBlocksRenderer';
import { getPageContent, hasPageSlug } from '../content/pages';
import type { LanguageCode } from '../types';

function HomePage() {
  const { i18n } = useTranslation();
  const language = (i18n.language || '').split('-')[0] as LanguageCode;
  const hasMarkdownHome = hasPageSlug('home');
  const homeMarkdown = hasMarkdownHome ? getPageContent('home', language) : null;

  useEffect(() => {
    if (hasMarkdownHome) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' },
    );

    const animatedElements = document.querySelectorAll('.event-card, .faq-item');
    animatedElements.forEach((el) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(30px)';
      el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
      observer.observe(el);
    });

    const onScroll = () => {
      const heroBackground = document.querySelector('.hero-background') as HTMLElement | null;
      const scrolled = window.pageYOffset;
      if (heroBackground && scrolled < window.innerHeight) {
        heroBackground.style.transform = `translateY(${scrolled * 0.5}px)`;
      }
    };

    window.addEventListener('scroll', onScroll);

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', onScroll);
    };
  }, [hasMarkdownHome]);

  if (homeMarkdown) {
    if (Array.isArray(homeMarkdown.blocks) && homeMarkdown.blocks.length > 0) {
      return <HomeBlocksRenderer blocks={homeMarkdown.blocks} />;
    }

    return (
      <main className="legal-page">
        <div className="container">
          <h1>{homeMarkdown.meta.title}</h1>
          {homeMarkdown.meta.description ? <p>{homeMarkdown.meta.description}</p> : null}
          <MarkdownContent markdown={homeMarkdown.markdown} splitByDivider sectionClassName="page-card" />
        </div>
      </main>
    );
  }

  return (
    <>
      <Hero />
      <EventsSection />
      <FAQSection />
    </>
  );
}

export default HomePage;