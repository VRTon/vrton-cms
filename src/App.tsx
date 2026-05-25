import { useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PublicLayout from './components/layout/PublicLayout';
import AdminShell from './components/layout/AdminShell';
import HomePage from './pages/HomePage';
import NotFoundPage from './pages/NotFoundPage';
import PageRenderer from './pages/PageRenderer';
import AdminPage from './pages/AdminPage';
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from './i18n/languages';

const IS_DEV = import.meta.env.DEV;

function App() {
  const location = useLocation();
  const { i18n } = useTranslation();

  useEffect(() => {
    const firstSegment = location.pathname.split('/').filter(Boolean)[0];
    const supportedCodes = new Set(SUPPORTED_LANGUAGES.map((lang) => lang.code));
    const lang = supportedCodes.has(firstSegment) ? firstSegment : DEFAULT_LANGUAGE;
    if (i18n.language !== lang) {
      i18n.changeLanguage(lang);
    }
  }, [i18n, location.pathname]);

  useEffect(() => {
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
  }, []);

  return (
    <Routes>
      {IS_DEV && (
        <Route element={<AdminShell />}>
          <Route path="/admin" element={<AdminPage />} />
        </Route>
      )}

      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/:lang" element={<HomePage />} />
        <Route path="/:lang/" element={<HomePage />} />
        <Route path="/:lang/:slug" element={<PageRenderer />} />
        <Route path="/:lang/:slug/" element={<PageRenderer />} />

        <Route path="/404.html" element={<NotFoundPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default App;