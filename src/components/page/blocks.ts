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
    hero: {
      type: 'hero',
      title: '',
      subtitle: '',
      attendText: '',
      volunteerText: '',
      sponsorText: '',
      volunteerUrl: '',
      sponsorUrl: '',
      showVrchatBadge: true,
      showSocial: true,
      buttons: [],
    },
    events: { type: 'events', title: '', rows: [], collaboratorsCatalog: [] },
    faq: { type: 'faq', title: '', leftItems: [], rightItems: [] },
    gallery: {
      type: 'gallery',
      items: [],
    },
    accordion: {
      type: 'accordion',
      items: [],
    },
    schedule: {
      type: 'schedule',
      title: '',
      items: [],
    },
    heading: { type: 'heading', level: 2, text: '' },
    text: { type: 'text', markdown: '' },
    image: { type: 'image', src: '', alt: '', caption: '' },
    video: { type: 'video', src: '', poster: '', controls: true, autoplay: false, muted: false, loop: false },
    youtube: { type: 'youtube', url: '', title: '' },
    button: { type: 'button', label: '', href: '', newTab: false },
    links: {
      type: 'links',
      items: [],
    },
    section: {
      type: 'section',
      rows: [createDefaultSectionRow()],
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
