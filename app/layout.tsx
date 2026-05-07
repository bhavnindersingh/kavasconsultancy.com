import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Kavas Consultancy — Custom Software for Modern Businesses',
  description:
    'We build custom software for modern businesses — websites, dashboards, analytics, payroll, SEO, marketing — across industries. Built end-to-end by 4 engineers and 2 designers.',
  openGraph: {
    title: 'Kavas Consultancy',
    description: 'Custom software, end-to-end, across industries.',
    url: 'https://kavasconsultancy.com',
    siteName: 'Kavas Consultancy',
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kavas Consultancy — Custom Software for Modern Businesses',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <body>{children}</body>
    </html>
  );
}
