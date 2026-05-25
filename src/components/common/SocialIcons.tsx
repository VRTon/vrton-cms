import { useTranslation } from 'react-i18next';

interface SocialLink {
  id: string
  name: string
  href: string
  icon: string
  className: string
}

export const socialLinks: SocialLink[] = [
  {
    id: 'discord',
    name: 'Discord',
    href: 'https://discord.gg/AR72D2nfpp',
    icon: 'fa-discord',
    className: 'discord',
  },
  {
    id: 'vrchat',
    name: 'VRChat',
    href: 'https://vrc.group/VRTON.0659',
    icon: 'fa-vr-cardboard',
    className: 'vrchat',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    href: 'https://www.instagram.com/vrtonof/',
    icon: 'fa-instagram',
    className: 'instagram',
  },
  {
    id: 'x',
    name: 'X',
    href: 'https://x.com/vrtonof',
    icon: 'x-brand',
    className: 'twitter',
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    href: 'https://www.tiktok.com/@vrtonoficial',
    icon: 'fa-tiktok',
    className: 'tiktok',
  },
  {
    id: 'youtube',
    name: 'YouTube',
    href: 'https://www.youtube.com/@VRTonOficial',
    icon: 'fa-youtube',
    className: 'youtube',
  },
  {
    id: 'twitch',
    name: 'Twitch',
    href: 'https://www.twitch.tv/vrtonof',
    icon: 'fa-twitch',
    className: 'twitch',
  },
];

type SocialIconsVariant = 'footer' | 'hero'

interface SocialIconsProps {
  variant?: SocialIconsVariant
}

function SocialIcons({ variant = 'footer' }: SocialIconsProps) {
  const { t } = useTranslation();
  const configuredLinks = t('social.links', { returnObjects: true, defaultValue: [] }) as SocialLink[] | unknown[];
  const links: SocialLink[] = Array.isArray(configuredLinks) && configuredLinks.length > 0
    ? configuredLinks
      .map((entry, index) => {
        const entryObj = entry as SocialLink | null;
        const fallback = socialLinks.find((preset) => preset.id === entryObj?.id) || null;
        return {
          id: String(entryObj?.id || '').trim() || `social-${index + 1}`,
          name: String(entryObj?.name || '').trim() || fallback?.name || 'Social',
          href: String(entryObj?.href || '').trim() || fallback?.href || '',
          icon: String(entryObj?.icon || '').trim() || fallback?.icon || 'fa-link',
          className: String(entryObj?.className || '').trim() || fallback?.className || 'custom',
        };
      })
      .filter((entry) => Boolean(entry.href))
    : socialLinks;

  const renderIcon = (icon: string) => {
    if (icon === 'x-brand') {
      const size = variant === 'hero' ? 18 : 16;
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false">
          <path
            fill="currentColor"
            d="M18.9 2H22l-6.77 7.74L23.2 22h-6.26l-4.9-6.72L6.16 22H3.05l7.24-8.28L.8 2h6.42l4.43 6.08L18.9 2zm-1.1 18h1.73L6.28 3.9H4.42L17.8 20z"
          />
        </svg>
      );
    }

    return <i className={`${icon.startsWith('fa-vr') ? 'fas' : 'fab'} ${icon}`} aria-hidden="true" />;
  };

  const wrapperClassName = variant === 'hero' ? 'social-icons' : 'footer-social';
  const itemClassNamePrefix = variant === 'hero' ? 'social-icon' : 'footer-social-icon';

  return (
    <div className={wrapperClassName}>
      {links.map((social) => (
        <a
          key={social.id}
          href={social.href}
          className={`${itemClassNamePrefix} ${social.className}`}
          aria-label={social.name}
          title={social.name}
          target="_blank"
          rel="noopener noreferrer"
        >
          {renderIcon(social.icon)}
          <span className="sr-only">{social.name}</span>
        </a>
      ))}
    </div>
  );
}

export default SocialIcons;