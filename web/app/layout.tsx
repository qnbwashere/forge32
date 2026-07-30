import type { Metadata, Viewport } from 'next';
import '@fontsource/barlow-condensed/600.css';
import '@fontsource/barlow-condensed/700.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'FORGE32 — ESP32 IDE',
  description:
    'Download FORGE32 for macOS or Windows. Write, compile, flash and monitor ESP32 boards with the toolchain already inside.',
  openGraph: {
    title: 'FORGE32 — ESP32 IDE',
    description: 'Write, compile, flash and monitor ESP32 boards. Toolchain included.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#10161c',
};

// A gold pad on dark soldermask, same as the pin rail.
const favicon =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='5' fill='%2310161c'/%3E%3Ccircle cx='16' cy='16' r='8' fill='none' stroke='%23d9a441' stroke-width='4'/%3E%3C/svg%3E";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href={favicon} />
      </head>
      <body>{children}</body>
    </html>
  );
}
