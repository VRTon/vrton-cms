import { makeId, makeItemId } from './ids';
import { createDefaultSectionRow } from './utils';

export interface BlockDefaults {
  hero: Record<string, unknown>
  events: Record<string, unknown>
  faq: Record<string, unknown>
  gallery: Record<string, unknown>
  accordion: Record<string, unknown>
  schedule: Record<string, unknown>
  heading: Record<string, unknown>
  text: Record<string, unknown>
  image: Record<string, unknown>
  video: Record<string, unknown>
  youtube: Record<string, unknown>
  button: Record<string, unknown>
  links: Record<string, unknown>
  section: Record<string, unknown>
  divider: Record<string, unknown>
  spacer: Record<string, unknown>
}

export function createDefaultBlock(type: string): Record<string, unknown> & { _cid: string } {
  const defaults: BlockDefaults = {
    hero: { type: 'hero', showVrchatBadge: true, showSocial: true },
    events: { type: 'events' },
    faq: { type: 'faq' },
    gallery: {
      type: 'gallery',
      items: [
        { src: '', alt: 'Gallery image 1', caption: '' },
        { src: '', alt: 'Gallery image 2', caption: '' },
      ],
    },
    accordion: {
      type: 'accordion',
      items: [
        { title: 'Accordion item 1', markdown: 'Write details for this item.' },
        { title: 'Accordion item 2', markdown: 'Write more details here.' },
      ],
    },
    schedule: {
      type: 'schedule',
      title: 'Day Schedule',
      items: [
        { time: '09:00', title: 'Opening', details: 'Welcome and intro.' },
        { time: '10:00', title: 'Main Session', details: 'Main event content.' },
      ],
    },
    heading: { type: 'heading', level: 2, text: 'Section title' },
    text: { type: 'text', markdown: 'Write your content here.' },
    image: { type: 'image', src: '', alt: '', caption: '' },
    video: { type: 'video', src: '', poster: '', controls: true, autoplay: false, muted: false, loop: false },
    youtube: { type: 'youtube', url: '', title: '' },
    button: { type: 'button', label: 'Open link', href: '/', newTab: false },
    links: {
      type: 'links',
      items: [
        { label: 'Website', href: '/' },
        { label: 'Discord', href: 'https://discord.gg/' },
      ],
    },
    section: {
      type: 'section',
      rows: [createDefaultSectionRow([{ type: 'text', markdown: 'Write section content here.', _iid: makeItemId() }])],
    },
    divider: { type: 'divider', style: 'line' },
    spacer: { type: 'spacer', height: 40 },
  };

  return { ...(defaults[type] || defaults.text), _cid: makeId() } as Record<string, unknown> & { _cid: string };
}

export function createSectionItem(type: string): Record<string, unknown> & { _iid: string } {
  const item = createDefaultBlock(type);
  if (item.type === 'section') {
    return { type: 'text', markdown: '', _iid: makeItemId() } as Record<string, unknown> & { _iid: string };
  }
  return { ...item, _iid: makeItemId() } as Record<string, unknown> & { _iid: string };
}

export function isContainerBlock(block: { type?: string } | null | undefined): boolean {
  return block?.type === 'section';
}

export function isInlineComponentType(type: string): boolean {
  return [
    'heading', 'text', 'image', 'video', 'youtube', 'button', 'links',
    'divider', 'spacer', 'gallery', 'accordion', 'schedule',
  ].includes(type);
}