import type { Metadata } from 'next';
import { Geist, Geist_Mono, Newsreader } from 'next/font/google';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });
const newsreader = Newsreader({
  variable: '--font-newsreader',
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  style: ['normal', 'italic'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Kavas Consultancy — Custom Software & Applied AI',
  description:
    'We build the software — and train the models — your business runs on. Custom systems and applied AI, engineered end-to-end by a senior team and owned entirely by you.',
  openGraph: {
    title: 'Kavas Consultancy',
    description: 'Custom software and applied AI, built end-to-end and owned by you.',
    url: 'https://kavasconsultancy.com',
    siteName: 'Kavas Consultancy',
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kavas Consultancy — Custom Software & Applied AI',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${newsreader.variable} antialiased`}
    >
      <body>{children}</body>
    </html>
  );
}
