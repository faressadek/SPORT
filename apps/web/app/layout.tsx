import type { Metadata, Viewport } from 'next';
import { Barlow, Big_Shoulders, Noto_Kufi_Arabic } from 'next/font/google';
import { ToastProvider } from '@sport/ui';
import './globals.css';

const scoreboard = Big_Shoulders({
  subsets: ['latin'],
  axes: ['opsz'],
  variable: '--font-scoreboard',
  adjustFontFallback: false,
  display: 'swap',
});
const barlow = Barlow({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-barlow',
  display: 'swap',
});
const kufi = Noto_Kufi_Arabic({
  subsets: ['arabic'],
  weight: ['400', '600', '800'],
  variable: '--font-kufi',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'SPORT', template: '%s | SPORT' },
  description: 'Book courts, coaches, gyms and academies in Alexandria.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#0d3a28' },
    { media: '(prefers-color-scheme: dark)', color: '#06170f' },
  ],
};

// Applies a saved theme before paint so dark mode doesn't flash.
const themeScript = `try{var t=localStorage.getItem('sport-theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      dir="ltr"
      suppressHydrationWarning
      className={`${scoreboard.variable} ${barlow.variable} ${kufi.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
