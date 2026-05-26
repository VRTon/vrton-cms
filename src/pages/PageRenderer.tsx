import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getPageContent } from '../content/pages';
import MarkdownContent from '../components/common/MarkdownContent';
import HomeBlocksRenderer from '../components/home/HomeBlocksRenderer';
import type { LanguageCode } from '../types';

function PageRenderer() {
  const { lang, slug } = useParams<{ lang?: string; slug: string }>();
  const { i18n } = useTranslation();

  const language = (lang || i18n.language || 'en').split('-')[0] as LanguageCode;
  const content = getPageContent(slug, language);

  if (!content) {
    return (
      <main className="legal-page">
        <div className="container">
          <h1>Content not found</h1>
          <p>Page &quot;{slug}&quot; not available in {language}.</p>
        </div>
      </main>
    );
  }

  if (Array.isArray(content.blocks) && content.blocks.length > 0) {
    return <HomeBlocksRenderer blocks={content.blocks} layout="page" title={content.meta.title} description={content.meta.description} />;
  }

  return (
    <main className="legal-page">
      <div className="container">
        <h1>{content.meta.title}</h1>
        {content.meta.description ? <p>{content.meta.description}</p> : null}
        <MarkdownContent markdown={content.markdown} splitByDivider sectionClassName="page-card" />
      </div>
    </main>
  );
}

export default PageRenderer;
