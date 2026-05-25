import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../common/LanguageSwitcher';
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from '../../i18n/languages';
import { withBasePath } from '../../utils/assetPath';

const supportedCodes = new Set(SUPPORTED_LANGUAGES.map((lang) => lang.code));

function NavBar() {
  const { t, i18n } = useTranslation();
  const location = useLocation();

  const normalizedLanguage = i18n.language.split('-')[0];
  const activeLang = supportedCodes.has(normalizedLanguage) ? normalizedLanguage : DEFAULT_LANGUAGE;
  const rootPath = activeLang === DEFAULT_LANGUAGE ? '/' : `/${activeLang}/`;

  const getHashLink = (hash: string) => `${rootPath}${hash}`;
  const isExternalHref = (href: string) => /^https?:\/\//i.test(href);
  const localizeInternalHref = (href: string) => {
    if (!href) {
      return rootPath;
    }
    if (href.startsWith('#')) {
      return getHashLink(href);
    }
    if (!href.startsWith('/')) {
      return href;
    }
    if (activeLang === DEFAULT_LANGUAGE) {
      return href;
    }
    if (href === '/') {
      return rootPath;
    }
    if (href === `/${activeLang}` || href.startsWith(`/${activeLang}/`)) {
      return href;
    }
    return `/${activeLang}${href}`;
  };

  const pathSegments = location.pathname.split('/').filter(Boolean);
  const firstSegmentIsLang = pathSegments.length > 0 && supportedCodes.has(pathSegments[0]);
  const isHome = pathSegments.length === 0 || (firstSegmentIsLang && pathSegments.length === 1);
  const configuredLinks = t('nav.links', { returnObjects: true }) as unknown;
  const navLinks = Array.isArray(configuredLinks) && configuredLinks.length > 0
    ? configuredLinks as Array<{ label?: string; href?: string }>
    : [
      { label: t('nav.home'), href: '/' },
      { label: t('nav.events'), href: '#events' },
      { label: t('nav.faq'), href: '#faq' },
    ];

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to={rootPath} className="nav-logo">
          <img
            src={withBasePath('/logo.png')}
            alt="VRTon Logo"
            className="nav-logo-img"
            width="40"
            height="40"
          />
          <span className="nav-brand">{t('site.title')}</span>
        </Link>

        <ul className="nav-menu">
          {navLinks.map((entry, index) => {
            const label = String(entry.label || '').trim() || `Link ${index + 1}`;
            const href = String(entry.href || '').trim() || '/';
            const to = localizeInternalHref(href);
            const active = to === rootPath && isHome;

            if (isExternalHref(href)) {
              return (
                <li key={`nav-link-${index}`} className="nav-item">
                  <a href={href} target="_blank" rel="noopener noreferrer" className="nav-link">
                    {label}
                  </a>
                </li>
              );
            }

            return (
              <li key={`nav-link-${index}`} className="nav-item">
                <Link
                  to={to}
                  className={`nav-link ${active ? 'nav-link-active' : ''}`}
                  onClick={() => {
                    if (to === rootPath && isHome && !location.hash) {
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  }}
                >
                  {label}
                </Link>
              </li>
            );
          })}
          <li className="nav-item nav-lang-item">
            <LanguageSwitcher />
          </li>
        </ul>
      </div>
    </nav>
  );
}

export default NavBar;
