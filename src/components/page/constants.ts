export const API_PREFIX = '/__admin/api/content';
export const API_ASSETS_PREFIX = '/__admin/api/assets';

export const PREVIEW_WIDTHS = {
  desktop: 1280,
  tablet: 834,
  mobile: 390,
};

export const ADMIN_LANGUAGE_OPTIONS = [
  { key: 'es', label: 'ES' },
  { key: 'en', label: 'EN' },
];

export interface BlockLibraryEntry {
  type: string
  label: string
  icon: string
  category: string
}

export const BLOCK_LIBRARY: BlockLibraryEntry[] = [
  { type: 'hero', label: 'Hero', icon: 'fa-flag', category: 'structure' },
  { type: 'events', label: 'Events', icon: 'fa-calendar-days', category: 'structure' },
  { type: 'faq', label: 'FAQ', icon: 'fa-circle-question', category: 'structure' },
  { type: 'gallery', label: 'Gallery', icon: 'fa-images', category: 'media' },
  { type: 'accordion', label: 'Accordion', icon: 'fa-rectangle-list', category: 'content' },
  { type: 'schedule', label: 'Schedule', icon: 'fa-clock', category: 'content' },
  { type: 'heading', label: 'Heading', icon: 'fa-heading', category: 'content' },
  { type: 'text', label: 'Text', icon: 'fa-align-left', category: 'content' },
  { type: 'image', label: 'Image', icon: 'fa-image', category: 'media' },
  { type: 'video', label: 'Video', icon: 'fa-film', category: 'media' },
  { type: 'youtube', label: 'YouTube', icon: 'fa-brands fa-youtube', category: 'media' },
  { type: 'button', label: 'Button', icon: 'fa-link', category: 'actions' },
  { type: 'links', label: 'Links', icon: 'fa-list-ul', category: 'actions' },
  { type: 'section', label: 'Section', icon: 'fa-folder-tree', category: 'structure' },
  { type: 'divider', label: 'Divider', icon: 'fa-minus', category: 'structure' },
  { type: 'spacer', label: 'Spacer', icon: 'fa-arrows-up-down', category: 'structure' },
];

export const BLOCK_CATEGORIES = [
  { key: 'structure', label: 'Structure' },
  { key: 'content', label: 'Content' },
  { key: 'media', label: 'Media' },
  { key: 'actions', label: 'Actions' },
];

export const BASIC_BLOCK_TYPES = new Set([
  'gallery', 'accordion', 'schedule', 'heading', 'text',
  'image', 'video', 'youtube', 'button', 'links',
  'section', 'divider', 'spacer',
]);

export const BLOCK_ICON_BY_TYPE = Object.fromEntries(
  BLOCK_LIBRARY.map((entry) => [entry.type, entry.icon]),
);

export const BLOCK_LABEL_BY_TYPE = Object.fromEntries(
  BLOCK_LIBRARY.map((entry) => [entry.type, entry.label]),
);

export interface SocialLinkPreset {
  id: string
  name: string
  href: string
  icon: string
  className: string
}

export const SOCIAL_LINK_PRESETS: SocialLinkPreset[] = [
  { id: 'discord', name: 'Discord', href: 'https://discord.gg/AR72D2nfpp', icon: 'fa-discord', className: 'discord' },
  { id: 'vrchat', name: 'VRChat', href: 'https://vrc.group/VRTON.0659', icon: 'fa-vr-cardboard', className: 'vrchat' },
  { id: 'instagram', name: 'Instagram', href: 'https://www.instagram.com/vrtonof/', icon: 'fa-instagram', className: 'instagram' },
  { id: 'x', name: 'X', href: 'https://x.com/vrtonof', icon: 'x-brand', className: 'twitter' },
  { id: 'tiktok', name: 'TikTok', href: 'https://www.tiktok.com/@vrtonoficial', icon: 'fa-tiktok', className: 'tiktok' },
  { id: 'youtube', name: 'YouTube', href: 'https://www.youtube.com/@VRTonOficial', icon: 'fa-youtube', className: 'youtube' },
  { id: 'twitch', name: 'Twitch', href: 'https://www.twitch.tv/vrtonof', icon: 'fa-twitch', className: 'twitch' },
];

export const SOCIAL_ICON_BY_CLASS = Object.fromEntries(
  SOCIAL_LINK_PRESETS.map((entry) => [entry.className, entry.icon]),
);

export function getBlockIcon(type: string): string {
  const normalizedType = type === 'markdown' ? 'text' : type;
  return BLOCK_ICON_BY_TYPE[normalizedType] || 'fa-square';
}

export function getBlockLabel(type: string): string {
  const normalizedType = type === 'markdown' ? 'text' : type;
  return BLOCK_LABEL_BY_TYPE[normalizedType] || String(normalizedType || 'Block');
}