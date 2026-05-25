import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { DEFAULT_LANGUAGE } from '../i18n/languages';

function NotFoundPage() {
  const { t, i18n } = useTranslation();
  const language = (i18n.language || '').split('-')[0];
  const homePath = language && language !== DEFAULT_LANGUAGE ? `/${language}` : '/';

  return (
    <main className="legal-page">
      <div className="container">
        <h1>{t('errors.not_found.title')}</h1>
        <h2>{t('errors.not_found.headline')}</h2>
        <p>{t('errors.not_found.message')}</p>
        <Link className="btn btn-primary" to={homePath}>
          {t('errors.not_found.back_home')}
        </Link>
      </div>
    </main>
  );
}

export default NotFoundPage;