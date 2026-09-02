import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://kanesuan.github.io/gelephu-gis-viewer/'),
  title: 'IDC Development Map · Gelephu',
  description: 'Interactive planning and development GIS viewer for Gelephu, Bhutan.',
  openGraph: {
    title: 'IDC Development Map',
    description: 'Explore planning and development GIS data for Gelephu, Bhutan.',
    url: 'https://kanesuan.github.io/gelephu-gis-viewer/',
    siteName: 'IDC Development Map',
    images: [{ url: 'og.png', width: 1200, height: 630, alt: 'IDC Development Map · Gelephu, Bhutan' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'IDC Development Map',
    description: 'Explore planning and development GIS data for Gelephu, Bhutan.',
    images: ['og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
