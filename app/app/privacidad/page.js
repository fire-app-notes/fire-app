// Ruta: app/privacidad/page.js
// URL pública dedicada: https://firenotesapp.com/privacidad
// (Google Play exige una URL propia de política de privacidad, no un ancla #privacidad)

const COLORS = {
  bg: '#0A0A12', bgAlt: '#111122', card: '#161630',
  orange: '#FF6B35', purple: '#9B59B6',
  gold: '#FFD700', white: '#FFFFFF',
  gray: '#8892B0', grayLight: '#A0AEC0',
};

export const metadata = {
  title: 'Privacidad y Términos · Fire Notes',
  description: 'Política de privacidad y términos de uso de Fire Notes. Anónimo de verdad: sin nombre, sin email, sin perfiles.',
  alternates: { canonical: '/privacidad' },
};

const bloques = [
  { title: '¿Qué guardamos?', content: 'Un identificador anónimo de tu dispositivo, la ubicación aproximada de tus notas y tu dirección IP (solo para prevenir abuso). Nada más.' },
  { title: '¿Qué NO guardamos?', content: 'Tu nombre, email, teléfono, fotos, contactos ni ningún dato personal identificable. No tienes cuenta, no tienes perfil.' },
  { title: '¿Cuánto tiempo se guardan los datos?', content: 'Las notas desaparecen del feed a las 24 horas. Por seguridad y para cumplir requerimientos legales, los datos se conservan hasta 30 días y después se eliminan permanentemente de nuestros sistemas.' },
  { title: '¿Cooperan con autoridades?', content: 'Eres anónimo pero NO invisible. Ante un requerimiento legal válido, proporcionamos los identificadores anónimos, IPs y contenido relacionado.' },
  { title: '¿Qué está prohibido?', content: 'Amenazas con nombres propios, contenido sexual de menores, incitación a la violencia, venta de drogas/armas. La moderación con IA filtra automáticamente. 5 reportes = nota eliminada.' },
  { title: '¿Qué SÍ puedes hacer?', content: 'Expresarte libremente. Quejas, confesiones, recomendaciones, opiniones, groserías incluidas. Fire Notes es un espacio de expresión genuina.' },
  { title: 'Pagos', content: 'Las compras de notas extra se realizan únicamente en el sitio web firenotesapp.com a través de Stripe (tarjeta u OXXO). No almacenamos datos de tu tarjeta; los procesa Stripe de forma segura.' },
  { title: 'Menores de edad', content: 'Fire Notes no está dirigido a menores de 13 años. No recopilamos conscientemente datos de menores.' },
];

export default function PrivacidadPage() {
  return (
    <div style={{ backgroundColor: COLORS.bg, color: COLORS.white, minHeight: '100vh', fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif" }}>
      {/* NAV simple */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, padding: '16px 24px', backgroundColor: 'rgba(10,10,18,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(155,89,182,0.15)' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
            <span style={{ fontSize: '26px' }}>🔥</span>
            <span style={{ fontSize: '19px', fontWeight: '700', color: COLORS.orange, letterSpacing: '1px' }}>FIRE</span>
            <span style={{ fontSize: '19px', fontWeight: '700', color: COLORS.white, letterSpacing: '1px' }}>NOTES</span>
          </a>
          <a href="/" style={{ fontSize: '14px', color: COLORS.grayLight, textDecoration: 'none' }}>← Inicio</a>
        </div>
      </nav>

      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '60px 24px 100px' }}>
        <h1 style={{ fontSize: 'clamp(28px, 5vw, 40px)', fontWeight: '800', marginBottom: '12px', color: COLORS.white }}>
          Privacidad y Términos
        </h1>
        <p style={{ fontSize: '16px', color: COLORS.gray, marginBottom: '40px' }}>
          Tu privacidad es nuestra prioridad. Esto es todo lo que necesitas saber, sin letras chiquitas.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {bloques.map((item, i) => (
            <section key={i} style={{ padding: '24px', borderRadius: '16px', backgroundColor: COLORS.card, border: '1px solid rgba(155,89,182,0.08)' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: COLORS.gold, marginBottom: '8px' }}>{item.title}</h2>
              <p style={{ fontSize: '15px', lineHeight: 1.7, color: COLORS.grayLight, margin: 0 }}>{item.content}</p>
            </section>
          ))}
        </div>

        <div style={{ marginTop: '40px', padding: '24px', borderRadius: '16px', border: `1px solid ${COLORS.orange}30`, background: 'linear-gradient(135deg, rgba(255,107,53,0.05), rgba(155,89,182,0.05))' }}>
          <p style={{ fontSize: '15px', color: COLORS.grayLight, lineHeight: 1.7, margin: 0 }}>
            ⚠️ <strong style={{ color: COLORS.white }}>Importante:</strong> Eres anónimo pero NO invisible. Fire Notes existe para expresarte con libertad, no para hacer daño. Si usas la plataforma para algo ilegal, cooperaremos con las autoridades.
          </p>
        </div>

        <p style={{ textAlign: 'center', fontSize: '13px', color: COLORS.gray, marginTop: '40px', fontStyle: 'italic' }}>
          Última actualización: Junio 2026 · Contacto: team@firenotesapp.com
        </p>

        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <a href="/app" style={{ display: 'inline-block', padding: '14px 32px', borderRadius: '24px', background: `linear-gradient(135deg, ${COLORS.orange}, ${COLORS.purple})`, color: COLORS.white, fontWeight: '700', fontSize: '15px', textDecoration: 'none' }}>
            🔥 Abrir Fire Notes
          </a>
        </div>
      </main>
    </div>
  );
}
