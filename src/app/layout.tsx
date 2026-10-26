import './globals.css';

import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { AppShell } from '../components/shell/AppShell.tsx';

export interface RootLayoutProps {
  children: React.ReactNode;
}

export const metadata: Metadata = {
  title: 'CS2 Analyzer // Tactical HUD',
  description: 'Plataforma analítica e replayer tático 2D para Counter-Strike 2',
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="pt-BR" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700;800&family=Chakra+Petch:wght@700;800&family=Oxanium:wght@700;800&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
          rel="stylesheet"
        />
      </head>
      <body className="bg-surface font-body-md text-on-surface antialiased selection:bg-primary-container selection:text-on-primary-container min-h-screen">
        <Suspense fallback={<div className="h-screen w-screen bg-[#10131a]" />}>
          <AppShell>{children}</AppShell>
        </Suspense>
      </body>
    </html>
  );
}
