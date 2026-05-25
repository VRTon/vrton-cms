import React, { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '../common/Button';
import SocialIcons from '../common/SocialIcons';

const FlyingHeartsBackground = lazy(() => import('./FlyingHeartsBackground'));

interface HeroConfig {
  title?: string
  subtitle?: string
  attendText?: string
  volunteerText?: string
  sponsorText?: string
  volunteerUrl?: string
  sponsorUrl?: string
  showVrchatBadge?: boolean
  showSocial?: boolean
  buttons?: Array<{
    label?: string
    href?: string
    variant?: 'primary' | 'accent'
    external?: boolean
  }>
}

interface HeroProps {
  config?: HeroConfig
}

function Hero({ config = {} }: HeroProps) {
  const { t } = useTranslation();

  const title = config.title || t('home.hero.title');
  const subtitle = config.subtitle || t('home.hero.subtitle');
  const attendText = config.attendText || t('home.hero.attend');
  const volunteerText = config.volunteerText || t('home.hero.volunteer');
  const sponsorText = config.sponsorText || t('home.hero.sponsor');
  const volunteerUrl = config.volunteerUrl || 'https://docs.google.com/forms/d/e/1FAIpQLSd7f-826J4-Ca9-QZ9GRjV9-HMOqhsM8yF1M65bfwb5ZfliwA/viewform?usp=header';
  const sponsorUrl = config.sponsorUrl || 'https://docs.google.com/forms/d/e/1FAIpQLSd7f-826J4-Ca9-QZ9GRjV9-HMOqhsM8yF1M65bfwb5ZfliwA/viewform?usp=header';
  const showVrchatBadge = config.showVrchatBadge !== false;
  const showSocial = config.showSocial !== false;

  const dynamicButtons = Array.isArray(config.buttons) && config.buttons.length > 0
    ? config.buttons
      .filter((button) => Boolean(button?.label) && Boolean(button?.href))
      .map((button, index) => ({
        label: String(button.label || ''),
        href: String(button.href || '/'),
        variant: button.variant === 'primary' || button.variant === 'accent'
          ? button.variant
          : (index === 0 ? 'primary' : 'accent'),
        external: typeof button.external === 'boolean'
          ? button.external
          : !String(button.href || '').startsWith('/'),
      }))
    : [
      { label: attendText, href: '/discord/', variant: 'primary' as const, external: false },
      { label: volunteerText, href: volunteerUrl, variant: 'accent' as const, external: true },
      { label: sponsorText, href: sponsorUrl, variant: 'accent' as const, external: true },
    ];

  return (
    <header className="hero-section" id="home">
      <div className="hero-background" />
      <Suspense fallback={null}>
        <FlyingHeartsBackground />
      </Suspense>
      <div className="hero-content">
        <div className="logo-container">
          <img
            src="/logo.png"
            alt="VRTon Logo"
            className="logo"
            width="540"
            height="540"
            fetchPriority="high"
          />
        </div>

        <div className="hero-text">
          <h1 className="hero-title">{title}</h1>
          <h2 className="hero-subtitle">{subtitle}</h2>

          <div className="action-buttons">
            {dynamicButtons.map((button, index) => (
              <Button
                key={`${button.label}-${button.href}-${index}`}
                href={button.href}
                variant={button.variant}
                external={button.external}
              >
                {button.label}
              </Button>
            ))}
          </div>

          <div className="bottom-section">
            {showVrchatBadge ? (
              <div className="vrchat-badge">
                <img
                  src="/vrchat-placeholder.png"
                  alt={t('home.hero.vrchat_alt')}
                  className="vrchat-img"
                  loading="lazy"
                />
              </div>
            ) : null}

            {showSocial ? (
              <SocialIcons variant="hero" />
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Hero;
