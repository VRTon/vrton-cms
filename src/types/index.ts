export type LanguageCode = 'en' | 'es'

export interface Language {
  code: LanguageCode
  label: string
  flag: string
}

export interface PageMeta {
  title: string
  description?: string
  status: string
  updatedAt: string
  kind?: string
  seo?: Record<string, string>
}

export interface PageContent {
  slug: string
  lang: LanguageCode
  meta: PageMeta
  markdown: string
  blocks?: Block[]
}

export type BlockType =
  | 'hero'
  | 'events'
  | 'faq'
  | 'section'
  | 'gallery'
  | 'accordion'
  | 'schedule'
  | 'richText'
  | 'spacer'
  | 'divider'
  | 'cta'
  | 'videoEmbed'
  | 'image'
  | 'quote'

export interface BaseBlock {
  _cid?: string
  type: BlockType
}

export interface HeroBlock extends BaseBlock {
  type: 'hero'
  title?: string
  subtitle?: string
  attendText?: string
  volunteerText?: string
  sponsorText?: string
  volunteerUrl?: string
  sponsorUrl?: string
  showVrchatBadge?: boolean
  showSocial?: boolean
}

export interface EventItem {
  src: string
  alt: string
}

export interface CollaboratorItem {
  src: string
  alt: string
}

export interface EventsBlock extends BaseBlock {
  type: 'events'
  title?: string
  yearsData?: Record<string, EventItem[]>
  meta?: Record<string, { amount: string; collaborators: CollaboratorItem[] }>
}

export interface FAQItem {
  question: string
  answer_html: string
}

export interface FAQBlock extends BaseBlock {
  type: 'faq'
  leftItems?: FAQItem[]
  rightItems?: FAQItem[]
  title?: string
}

export interface Item {
  src?: string
  alt?: string
  caption?: string
  href?: string
  text?: string
  title?: string
  description?: string
}

export interface Column {
  _colid: string
  width?: number
  items: Item[]
}

export interface Row {
  _rid: string
  columns: Column[]
}

export interface SectionBlock extends BaseBlock {
  type: 'section'
  title?: string
  description?: string
  rows?: Row[]
  items?: Item[]
}

export interface GalleryBlock extends BaseBlock {
  type: 'gallery'
  items?: Item[]
  columns?: number
}

export interface AccordionItem {
  title: string
  markdown: string
}

export interface AccordionBlock extends BaseBlock {
  type: 'accordion'
  items?: AccordionItem[]
  title?: string
}

export interface ScheduleItem {
  time: string
  title: string
  details?: string
}

export interface ScheduleBlock extends BaseBlock {
  type: 'schedule'
  title?: string
  items?: ScheduleItem[]
}

export interface RichTextBlock extends BaseBlock {
  type: 'richText'
  markdown?: string
}

export interface SpacerBlock extends BaseBlock {
  type: 'spacer'
  height?: string
}

export interface DividerBlock extends BaseBlock {
  type: 'divider'
  style?: string
}

export interface CTABlock extends BaseBlock {
  type: 'cta'
  title?: string
  description?: string
  items?: Item[]
}

export interface VideoEmbedBlock extends BaseBlock {
  type: 'videoEmbed'
  url?: string
  title?: string
}

export interface ImageBlock extends BaseBlock {
  type: 'image'
  src?: string
  alt?: string
  caption?: string
}

export interface QuoteBlock extends BaseBlock {
  type: 'quote'
  text?: string
  author?: string
}

export type Block =
  | HeroBlock
  | EventsBlock
  | FAQBlock
  | SectionBlock
  | GalleryBlock
  | AccordionBlock
  | ScheduleBlock
  | RichTextBlock
  | SpacerBlock
  | DividerBlock
  | CTABlock
  | VideoEmbedBlock
  | ImageBlock
  | QuoteBlock

export interface PageLoader {
  (_slug: string, _lang: LanguageCode): PageContent | null
  // eslint-disable-next-line no-unused-vars
  hasPageSlug?: (slug: string) => boolean
}

export type UploadKind = 'images' | 'videos'

export interface AssetUploadPayload {
  path: string
  dataUrl: string
}

export interface AssetUploadResult {
  ok?: boolean
  publicPath?: string
  error?: string
  status?: number
}

export interface ParsedAssetResult {
  relativePath: string
  mimeType: string
  buffer: Buffer
  isImageTarget: boolean
  isVideoTarget: boolean
  error?: never
}

export interface AssetParseError {
  error: string
  status: number
  relativePath?: never
  mimeType?: never
  buffer?: never
  isImageTarget?: never
  isVideoTarget?: never
}

export type AssetParseResult = ParsedAssetResult | AssetParseError

export interface DragItem {
  id: string
  type: 'block' | 'row' | 'column' | 'item'
}

export interface BlockChange {
  type: 'add' | 'remove' | 'update' | 'move'
  path: (string | number)[]
  previousValue?: unknown
  newValue?: unknown
}