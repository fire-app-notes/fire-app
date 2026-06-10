// Ruta: app/layout.js
import './globals.css';

const SITE_URL = 'https://firenotesapp.com';

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'Fire Notes 🔥 — Pensamientos anónimos cerca de ti',
  description: 'Suelta lo que piensas. Nadie sabe quién eres. Notas anónimas que flotan a 1km de ti y desaparecen en 24 horas. Sin cara, sin filtro, solo tus palabras.',
  manifest: '/manifest.json',
  applicationName: 'Fire Notes',
  keywords: ['notas anónimas', 'pensamientos anónimos', 'hiperlocal', 'anónimo', 'fire notes', 'confesiones'],
  authors: [{ name: 'Fire Notes' }],
  alternates: { canonical: '/' },

  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'FIRE',
  },

  icons: {
    icon: '/icon-192.png',
    apple: '/icon-192.png',
  },

  // ===== Open Graph (lo que se ve al compartir en WhatsApp, FB, etc.) =====
  openGraph: {
    type: 'website',
    locale: 'es_MX',
    url: SITE_URL,
    siteName: 'Fire Notes',
    title: 'Fire Notes 🔥 — Pensamientos anónimos cerca de ti',
    description: 'Suelta lo que piensas. Nadie sabe quién eres. Notas anónimas que flotan a 1km de ti y desaparecen en 24 horas.',
    images: [
      {
        // Ideal: sube un og-image.png de 1200x630 a /public y cámbialo aquí a '/og-image.png'.
        // Por ahora usamos el ícono que ya existe para que el preview funcione desde hoy.
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Fire Notes — Pensamientos anónimos cerca de ti',
      },
    ],
  },

  // ===== Twitter / X Card =====
  twitter: {
    card: 'summary_large_image',
    site: '@firenotesapp',
    creator: '@firenotesapp',
    title: 'Fire Notes 🔥 — Pensamientos anónimos cerca de ti',
    description: 'Suelta lo que piensas. Nadie sabe quién eres. A 1km de ti, 24 horas y desaparece.',
    images: ['/og-image.png'],
  },
};

// En Next 14 el viewport y themeColor van en su propio export (evita warnings de build)
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0D0D15',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
