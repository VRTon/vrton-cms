import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SocialIcons from '../common/SocialIcons';
import { useLanguagePath } from '../../hooks/useLanguagePath';

interface QuickLink {
  label?: string
  href?: string
  external?: boolean
}

function Footer() {
  const { t } = useTranslation();
  const { localizePath } = useLanguagePath();
  const configuredQuickLinks = t('footer.quick_links_items', { returnObjects: true, defaultValue: [] }) as QuickLink[] | unknown[];
  const quickLinks: QuickLink[] = Array.isArray(configuredQuickLinks) && configuredQuickLinks.length > 0
    ? configuredQuickLinks
    : [
      { label: t('footer.terms'), href: '/legal/terms/', external: false },
      { label: t('footer.code_of_conduct'), href: '/legal/code-of-conduct/', external: false },
      { label: t('footer.volunteering'), href: '/legal/volunteering/', external: false },
    ];

  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-content">
          <div className="footer-section">
            <h3 className="footer-title">{t('footer.title')}</h3>
            <p className="footer-text">{t('footer.text')}</p>
          </div>

          <div className="footer-section">
            <h4 className="footer-heading">{t('footer.quick_links')}</h4>
            <ul className="footer-links">
              {quickLinks.map((entry, index) => {
                const href = String(entry?.href || '').trim();
                const label = String(entry?.label || '').trim();
                const isExternal = Boolean(entry?.external) || /^https?:\/\//i.test(href);
                if (!href || !label) {
                  return null;
                }
                return (
                  <li key={`footer-link-${index}`}>
                    {isExternal ? (
                      <a href={href} className="footer-link" target="_blank" rel="noopener noreferrer">{label}</a>
                    ) : (
                      <Link to={localizePath(href)} className="footer-link">{label}</Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="footer-section">
            <h4 className="footer-heading">{t('footer.connect')}</h4>
            <SocialIcons />
          </div>
        </div>

        <div className="footer-bottom">
          <p className="footer-copyright">
            &copy; 2026 {t('footer.title')}. {t('footer.rights')}
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;