"use client";

import React from 'react';
import { Box } from '@mui/material';
import Sidebar from './Sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { redirect, usePathname } from 'next/navigation';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();

  // Não aplica o layout na página de login
  if (pathname === '/login') return <>{children}</>;

  // Se não estiver logado e não estiver carregando, manda pro login
  if (!loading && !user) {
    redirect('/login');
  }

  return (
    <Box sx={{ display: 'flex' }}>
      <Sidebar />
      <Box component="main" sx={{ flexGrow: 1, p: 3, bgcolor: 'background.default', minHeight: '100vh' }}>
        {children}
      </Box>
    </Box>
  );
}