import React from 'react';
import Hero from './Hero';
import EventsSection from './EventsSection';
import FAQSection from './FAQSection';
import MarkdownContent from '../common/MarkdownContent';
import { getYouTubeEmbedUrl } from '../../utils/mediaEmbeds';
import { withBasePath } from '../../utils/assetPath';
import type {
  Block,
  Item,
  Row,
  Column,
  GalleryBlock as GalleryBlockType,
  AccordionBlock as AccordionBlockType,
  ScheduleBlock as ScheduleBlockType,
  SectionBlock as SectionBlockType,
} from '../../types';

interface GalleryBlockProps {
  block: GalleryBlockType
}

function GalleryBlock({ block }: GalleryBlockProps) {
  const items = Array.isArray(block.items) ? block.items.filter((item) => item?.src) : [];
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="content-gallery" role="list">
      {items.map((item, index) => (
        <figure key={`gallery-item-${index}`} className="content-gallery-item" role="listitem">
          <img src={withBasePath(item.src || '')} alt={item.alt || ''} loading="lazy" />
          {item.caption ? <figcaption>{item.caption}</figcaption> : null}
        </figure>
      ))}
    </div>
  );
}

interface AccordionBlockProps {
  block: AccordionBlockType
}

function AccordionBlock({ block }: AccordionBlockProps) {
  const items = Array.isArray(block.items) ? block.items : [];
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="content-accordion">
      {items.map((item, index) => (
        <details key={`accordion-item-${index}`} className="content-accordion-item">
          <summary>{item.title || `Item ${index + 1}`}</summary>
          <div className="content-accordion-body">
            <MarkdownContent markdown={item.markdown || ''} />
          </div>
        </details>
      ))}
    </div>
  );
}

interface ScheduleBlockProps {
  block: ScheduleBlockType
}

function ScheduleBlock({ block }: ScheduleBlockProps) {
  const items = Array.isArray(block.items) ? block.items : [];
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="content-schedule">
      {block.title ? <h3>{block.title}</h3> : null}
      <ul>
        {items.map((item, index) => (
          <li key={`schedule-item-${index}`}>
            <div className="content-schedule-time">{item.time || '--:--'}</div>
            <div className="content-schedule-main">
              <strong>{item.title || `Event ${index + 1}`}</strong>
              {item.details ? <p>{item.details}</p> : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

interface SectionBlockProps {
  block: SectionBlockType
  inline?: boolean
}

function SectionBlock({ block, inline = false }: SectionBlockProps) {
  const rows = Array.isArray(block.rows) && block.rows.length > 0
    ? block.rows
    : [{ columns: [{ items: Array.isArray(block.items) ? block.items : [] }] }] as Row[];

  return (
    <section className="section-block">
      {block.title ? <h2 className="section-block-title">{block.title}</h2> : null}
      {block.description ? <p className="section-block-description">{block.description}</p> : null}
      <div className="section-block-rows">
        {rows.map((row, rowIndex) => {
          const columns = Array.isArray(row.columns) && row.columns.length > 0
            ? row.columns
            : [{ items: [] }] as Column[];

          return (
            <div
              key={row._rid || `row-${rowIndex}`}
              className="section-block-row"
              style={{
                gridTemplateColumns: columns
                  .map((column) => `${Math.max(1, Number(column.width) || 12)}fr`)
                  .join(' '),
              }}
            >
              {columns.map((column, columnIndex) => {
                const items = Array.isArray(column.items) ? column.items : [];
                return (
                  <div key={column._colid || `column-${columnIndex}`} className="section-block-column">
                    <div className="section-block-items">
                      {items.map((item, itemIndex) => (
                        <BasicBlock key={`${item.type || 'item'}-${itemIndex}`} block={item as Block} inline={inline} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </section>
  );
}

interface BasicBlockProps {
  block: Block
  inline?: boolean
}

function BasicBlock({ block, inline = false }: BasicBlockProps) {
  const blockType = block.type;

  if (blockType === 'heading') {
    const level = Math.min(6, Math.max(1, Number((block as { level?: number }).level) || 2));
    const Tag = `h${level}` as keyof JSX.IntrinsicElements;
    return <Tag>{(block as { text?: string }).text || ''}</Tag>;
  }

  if (blockType === 'text' || blockType === 'markdown') {
    if (inline) {
      return <MarkdownContent markdown={(block as { markdown?: string }).markdown || ''} splitByDivider sectionClassName="page-card" />;
    }
    return <MarkdownContent markdown={(block as { markdown?: string }).markdown || ''} />;
  }

  if (blockType === 'image') {
    return (
      <figure style={{ margin: 0 }}>
        <img
          src={withBasePath((block as { src?: string }).src || '')}
          alt={(block as { alt?: string }).alt || ''}
          style={{ width: '100%', height: 'auto', borderRadius: 12 }}
        />
        {(block as { caption?: string }).caption
          ? <figcaption style={{ marginTop: 8 }}>{(block as { caption?: string }).caption}</figcaption>
          : null}
      </figure>
    );
  }

  if (blockType === 'video') {
    // eslint-disable-next-line max-len
    const videoBlock = block as { src?: string; poster?: string; controls?: boolean; autoplay?: boolean; muted?: boolean; loop?: boolean };
    return (
      <figure style={{ margin: 0 }}>
        <video
          src={withBasePath(videoBlock.src || '')}
          poster={videoBlock.poster ? withBasePath(videoBlock.poster) : undefined}
          controls={videoBlock.controls !== false}
          autoPlay={Boolean(videoBlock.autoplay)}
          muted={Boolean(videoBlock.muted)}
          loop={Boolean(videoBlock.loop)}
          playsInline
          style={{ width: '100%', borderRadius: 12, background: '#000' }}
        />
      </figure>
    );
  }

  if (blockType === 'youtube') {
    const ytBlock = block as { url?: string; title?: string };
    const embedUrl = getYouTubeEmbedUrl(ytBlock.url || '');
    if (!embedUrl) {
      return null;
    }
    return (
      <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', borderRadius: 12, overflow: 'hidden', background: '#000' }}>
        <iframe
          src={embedUrl}
          title={ytBlock.title || 'YouTube video'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
        />
      </div>
    );
  }

  if (blockType === 'button') {
    const btnBlock = block as { href?: string; label?: string; newTab?: boolean };
    return (
      <a className="cta-button" href={btnBlock.href || '/'} target={btnBlock.newTab ? '_blank' : undefined} rel={btnBlock.newTab ? 'noopener noreferrer' : undefined}>
        {btnBlock.label || 'Open link'}
      </a>
    );
  }

  if (blockType === 'links') {
    const linksBlock = block as { items?: Item[] };
    const items = Array.isArray(linksBlock.items) ? linksBlock.items.filter((item) => item?.href) : [];
    if (items.length === 0) {
      return null;
    }
    return (
      <ul>
        {items.map((item, index) => (
          <li key={`links-item-${index}`}>
            <a href={item.href} target="_blank" rel="noopener noreferrer">{item.label || item.href}</a>
          </li>
        ))}
      </ul>
    );
  }

  if (blockType === 'divider') {
    const divBlock = block as { style?: string };
    const borderStyle = divBlock.style === 'dashed' ? 'dashed' : divBlock.style === 'dots' ? 'dotted' : 'solid';
    return <hr style={{ border: 'none', borderTop: `2px ${borderStyle} #d1d5db`, margin: inline ? '0.75rem 0' : 0 }} />;
  }

  if (blockType === 'section') {
    return <SectionBlock block={block as SectionBlockType} inline={inline} />;
  }

  if (blockType === 'gallery') {
    return <GalleryBlock block={block as GalleryBlockType} />;
  }

  if (blockType === 'accordion') {
    return <AccordionBlock block={block as AccordionBlockType} />;
  }

  if (blockType === 'schedule') {
    return <ScheduleBlock block={block as ScheduleBlockType} />;
  }

  if (blockType === 'spacer') {
    const spacerBlock = block as { height?: string | number };
    return <div style={{ height: Math.max(8, Number(spacerBlock.height) || 40) }} aria-hidden="true" />;
  }

  return null;
}

function renderHomeBlock(block: Block, index: number) {
  const key = `${block.type || 'block'}-${index}`;

  if (block.type === 'hero') {
    return <Hero key={key} config={block} />;
  }

  if (block.type === 'events') {
    return <EventsSection key={key} config={block} />;
  }

  if (block.type === 'faq') {
    return <FAQSection key={key} config={block} />;
  }

  if (['heading', 'text', 'markdown', 'image', 'video', 'youtube', 'button', 'links', 'section', 'divider', 'spacer', 'gallery', 'accordion', 'schedule'].includes(block.type)) {
    return <BasicBlock key={key} block={block} />;
  }

  return null;
}

function renderPageBlock(block: Block, index: number) {
  const key = `${block.type || 'block'}-${index}`;
  if (['heading', 'text', 'markdown', 'image', 'video', 'youtube', 'button', 'links', 'section', 'divider', 'spacer', 'gallery', 'accordion', 'schedule'].includes(block.type)) {
    return <BasicBlock key={key} block={block} inline />;
  }

  return null;
}

interface HomeBlocksRendererProps {
  blocks: Block[]
  layout?: 'home' | 'page'
  title?: string
  description?: string
}

function HomeBlocksRenderer({ blocks, layout = 'home', title, description }: HomeBlocksRendererProps) {
  if (!Array.isArray(blocks) || blocks.length === 0) {
    return null;
  }

  const sectionHasOnlyTextItems = (block: Block) => {
    if (block?.type !== 'section') {
      return false;
    }
    const sectionBlock = block as SectionBlockType;
    const rows = Array.isArray(sectionBlock.rows) ? sectionBlock.rows : [];
    if (rows.length === 0) {
      return false;
    }

    for (const row of rows) {
      const columns = Array.isArray(row.columns) ? row.columns : [];
      if (columns.length === 0) {
        return false;
      }
      for (const column of columns) {
        const items = Array.isArray(column.items) ? column.items : [];
        if (items.length === 0) {
          return false;
        }
        for (const item of items) {
          if (!['text', 'markdown'].includes(item?.type)) {
            return false;
          }
        }
      }
    }

    return true;
  };

  const hasOnlyTextBlocks = blocks.every((block) => ['text', 'markdown'].includes(block?.type) || sectionHasOnlyTextItems(block));

  if (layout === 'page') {
    return (
      <main className="legal-page">
        <div className="container">
          {title ? <h1>{title}</h1> : null}
          {description ? <p>{description}</p> : null}
          <section className={`page-blocks-stack ${hasOnlyTextBlocks ? 'page-blocks-stack-cards' : ''}`.trim()}>
            {blocks.map((block, index) => renderPageBlock(block, index))}
          </section>
        </div>
      </main>
    );
  }

  return (
    <>
      {blocks.map((block, index) => {
        return renderHomeBlock(block, index);
      })}
    </>
  );
}

export default HomeBlocksRenderer;
