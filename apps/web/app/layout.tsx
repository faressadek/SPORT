import type { Metadata, Viewport } from 'next';
import { ToastProvider } from '@sport/ui';
import '@fontsource-variable/big-shoulders/standard.css';
import '@fontsource/barlow/latin-400.css';
import '@fontsource/barlow/latin-500.css';
import '@fontsource/barlow/latin-600.css';
import '@fontsource/barlow/latin-700.css';
import '@fontsource-variable/noto-kufi-arabic';
import './globals.css';

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
