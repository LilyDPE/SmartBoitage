import type { Metadata } from 'next';
import './globals.css';
import { useEffect } from 'react';

export const metadata: Metadata = {
  title: 'SmartBoitage PRO',
  description: 'Application professionnelle de gestion de tournées de distribution',
  manifest: '/manifest.json',
  themeColor: '#3388ff',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'SmartBoitage PRO',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body>
        <ServiceWorkerRegistration />
        {children}
      </body>
    </html>
  );
}

// Service Worker Registration Component
function ServiceWorkerRegistration() {
  if (typeof window !== 'undefined') {
    useEffect(() => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker
          .register('/service-worker.js')
          .then((registration) => {
            console.log('Service Worker registered:', registration);
          })
          .catch((error) => {
            console.error('Service Worker registration failed:', error);
          });
      }
    }, []);
  }

  return null;
}
