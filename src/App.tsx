import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PublicLayout from './components/layout/PublicLayout';
import AdminShell from './components/layout/AdminShell';
import HomePage from './pages/HomePage';
import NotFoundPage from './pages/NotFoundPage';
import PageRenderer from './pages/PageRenderer';
import AdminPage from './pages/AdminPage';
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from './i18n/languages';
import { useAccessibilityMode } from './hooks/useAccessibility.ts';

type LegalSection = 'terms' | 'code-of-conduct' | 'volunteering';

const legacyLegalRoutes: Array<{ path: string; section: LegalSection }> = [
  { path: '/legal/terms', section: 'terms' },
  { path: '/legal/code-of-conduct', section: 'code-of-conduct' },
  { path: '/legal/volunteering', section: 'volunteering' },
  { path: '/legal-terms', section: 'terms' },
  { path: '/legal-code-of-conduct', section: 'code-of-conduct' },
  { path: '/legal-volunteering', section: 'volunteering' },
];

function LegacyLegalRedirect({
  section,
  language = 'es',
  localized = false,
}: {
  section: LegalSection;
  language?: 'es' | 'en';
  localized?: boolean;
}) {
  const anchors: Record<'es' | 'en', Record<LegalSection, string>> = {
    es: { terms: 'terminos', 'code-of-conduct': 'normas', volunteering: 'voluntariado' },
    en: { terms: 'terms', 'code-of-conduct': 'code-of-conduct', volunteering: 'volunteering' },
  };
  const basePath = localized ? `/${language}/legal` : '/legal';
  return <Navigate replace to={`${basePath}#${anchors[language][section]}`} />;
}

const IS_DEV = import.meta.env.DEV;

function App() {
  const location = useLocation();
  const { i18n } = useTranslation();
  const reduceMotion = useAccessibilityMode();

  useEffect(() => {
    const firstSegment = location.pathname.split('/').filter(Boolean)[0];
    const supportedCodes = new Set(SUPPORTED_LANGUAGES.map((lang) => lang.code));
    const lang = supportedCodes.has(firstSegment) ? firstSegment : DEFAULT_LANGUAGE;
    if (i18n.language !== lang) {
      i18n.changeLanguage(lang);
    }
  }, [i18n, location.pathname]);

  useEffect(() => {
    // CP7: en modo accesible los botones no hacen ripple. El efecto se inyecta
    // por JS, asi que apagarlo desde CSS no alcanza; hay que no registrarlo.
    if (reduceMotion) {
      return undefined;
    }

    const styleId = 'vrton-ripple-keyframes';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        @keyframes ripple {
          to {
            width: 300px;
            height: 300px;
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(style);
    }

    const handleClick = (event) => {
      const target = event.target.closest('.btn');
      if (!target) {
        return;
      }

      const ripple = document.createElement('span');
      ripple.style.position = 'absolute';
      ripple.style.borderRadius = '50%';
      ripple.style.background = 'rgba(255, 255, 255, 0.6)';
      ripple.style.width = '20px';
      ripple.style.height = '20px';
      ripple.style.transform = 'translate(-50%, -50%)';
      ripple.style.animation = 'ripple 0.6s ease-out';
      ripple.style.pointerEvents = 'none';

      const rect = target.getBoundingClientRect();
      ripple.style.left = `${event.clientX - rect.left}px`;
      ripple.style.top = `${event.clientY - rect.top}px`;

      target.appendChild(ripple);
      window.setTimeout(() => ripple.remove(), 600);
    };

    document.addEventListener('click', handleClick);
    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, [reduceMotion]);

  return (
    <Routes>
      {IS_DEV && (
        <Route element={<AdminShell />}>
          <Route path="/admin" element={<AdminPage />} />
        </Route>
      )}

      <Route element={<PublicLayout />}>
        {legacyLegalRoutes.map((route) => (
          <Route
            key={route.path}
            path={route.path}
            element={<LegacyLegalRedirect section={route.section} />}
          />
        ))}
        {SUPPORTED_LANGUAGES.flatMap((language) => legacyLegalRoutes.map((route) => (
          <Route
            key={`/${language.code}${route.path}`}
            path={`/${language.code}${route.path}`}
            element={<LegacyLegalRedirect section={route.section} language={language.code} localized />}
          />
        )))}
        <Route path="/" element={<HomePage />} />
        {SUPPORTED_LANGUAGES.map((language) => (
          <Route key={language.code} path={`/${language.code}`} element={<HomePage />} />
        ))}
        <Route path="/:slug" element={<PageRenderer />} />
        <Route path="/:lang/:slug" element={<PageRenderer />} />

        <Route path="/404.html" element={<NotFoundPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default App;
