export const metadata = {
  title: 'FIRE 🔥',
  description: 'Pensamientos anónimos cerca de ti',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="theme-color" content="#000000" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🔥</text></svg>" />
      </head>
      <body style={{ margin: 0, padding: 0, backgroundColor: '#000' }}>
        {children}
      </body>
    </html>
  );
}
