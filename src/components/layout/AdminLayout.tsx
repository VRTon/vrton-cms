import React, { type ReactNode, useEffect } from 'react';
import '../../styles/admin.css';

interface AdminLayoutProps {
  children: ReactNode
}

function AdminLayout({ children }: AdminLayoutProps) {
  useEffect(() => {
    document.body.classList.add('admin-mode');
    return () => { document.body.classList.remove('admin-mode'); };
  }, []);

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <div className="admin-header-inner">
          <strong className="admin-header-title">madCMS Content Manager</strong>
          <div id="admin-header-actions" className="admin-header-actions" />
        </div>
      </header>

      <main className="admin-main" style={{ maxWidth: 1400, margin: '0 auto' }}>
        {children}
      </main>
    </div>
  );
}

export default AdminLayout;