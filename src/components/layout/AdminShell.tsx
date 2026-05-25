import React from 'react';
import { Outlet } from 'react-router-dom';
import AdminLayout from './AdminLayout';

function AdminShell() {
  return (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  );
}

export default AdminShell;