import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import NavBar from './NavBar';
import Footer from './Footer';

function PublicLayout() {
  const location = useLocation();
  const hideShell = location.pathname === '/discord' || location.pathname === '/discord/' || location.pathname === '/discord.html';

  useEffect(() => {
    const hash = String(location.hash || '');
    if (!hash) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const id = decodeURIComponent(hash.replace(/^#/, ''));
    if (!id) {
      return;
    }

    let attempts = 0;
    let cancelled = false;

    const tryScroll = () => {
      if (cancelled) {
        return;
      }

      const target = document.getElementById(id);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }

      attempts += 1;
      if (attempts < 20) {
        window.setTimeout(tryScroll, 60);
      }
    };

    tryScroll();

    return () => {
      cancelled = true;
    };
  }, [location.pathname, location.hash]);

  return (
    <>
      {!hideShell && <NavBar />}
      <Outlet />
      {!hideShell && <Footer />}
    </>
  );
}

export default PublicLayout;
