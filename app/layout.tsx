import type { Metadata } from 'next';
import './globals.css';
import SessionProvider from '@/components/SessionProvider';
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="fr">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body>
        <SessionProvider session={session}>
          <ServiceWorkerRegistration />
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
