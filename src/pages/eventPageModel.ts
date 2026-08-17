import type { Block, EventItem, GalleryBlock } from '../types';

const EVENT_SLUG_PATTERN = /^vrton-(\d{4})$/;

export function parseEventYear(slug?: string): string | null {
  const match = EVENT_SLUG_PATTERN.exec(slug || '');
  return match?.[1] || null;
}

export function prepareEventPageBlocks(blocks: Block[] = []): {
  carouselItems: EventItem[]
  remainingBlocks: Block[]
} {
  const galleryIndex = blocks.findIndex((block) => block?.type === 'gallery');
  if (galleryIndex < 0) {
    return { carouselItems: [], remainingBlocks: [...blocks] };
  }

  const gallery = blocks[galleryIndex] as GalleryBlock;
  const carouselItems = (Array.isArray(gallery.items) ? gallery.items : [])
    .filter((item) => typeof item?.src === 'string' && item.src.trim().length > 0)
    .map((item) => ({ src: item.src || '', alt: item.alt || '' }));

  return {
    carouselItems,
    remainingBlocks: blocks.filter((_, index) => index !== galleryIndex),
  };
}
