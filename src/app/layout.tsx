import './globals.css';

import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { AppShell } from '../components/shell/AppShell.tsx';

export interface RootLayoutProps {
  children: React.ReactNode;
}

export const metadata: Metadata = {
  title: 'CS2 Analyzer',
  description: 'Plataforma analítica e replayer tático 2D para Counter-Strike 2',
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="bg-[#0B0E0F] text-white antialiased min-h-screen">
        <Suspense fallback={<div className="h-screen w-screen bg-[#0B0E0F]" />}>
          <AppShell>{children}</AppShell>
        </Suspense>
      </body>
    </html>
  );
}
