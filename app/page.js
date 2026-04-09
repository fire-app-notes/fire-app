'use client';
import { useState, useEffect, useRef } from 'react';

// ============================================================
// FIRE NOTES — LANDING PAGE
// firenotesapp.com
// ============================================================

const COLORS = {
  bg: '#0A0A12',
  bgAlt: '#111122',
  card: '#161630',
  orange: '#FF6B35',
  orangeGlow: '#FF8C5A',
  purple: '#9B59B6',
  purpleLight: '#BB8FCE',
  gold: '#FFD700',
  white: '#FFFFFF',
  gray: '#8892B0',
  grayLight: '#A0AEC0',
  cream: '#FDF6E3',
  noteText: '#2D2A26',
};

export default function LandingPage() {
  const [scrollY, setScrollY] = useState(0);
  const [visibleSections, setVisibleSections] = useState(new Set());
  const [menuOpen, setMenuOpen] = useState(false);
  const observerRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Intersection observer for fade-in animations
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleSections((prev) => new Set([...prev, entry.target.id]));
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -50px 0px' }
    );

    document.querySelectorAll('[data-animate]').forEach((el) => {
      observerRef.current.observe(el);
    });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      observerRef.current?.disconnect();
    };
  }, []);

  const isVisible = (id) => visibleSections.has(id);

  const scrollTo = (id) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div style={{ backgroundColor: COLORS.bg, color: COLORS.white, minHeight: '100vh', overflowX: 'hidden' }}>

      {/* ===== NAV ===== */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        padding: '16px 24px',
        backgroundColor: scrollY > 50 ? 'rgba(10,10,18,0.95)' : 'transparent',
        backdropFilter: scrollY > 50 ? 'blur(20px)' : 'none',
        transition: 'all 0.3s ease',
        borderBottom: scrollY > 50 ? '1px solid rgba(155,89,182,0.15)' : '1px solid transparent',
      }}>
        <div style={{
          maxWidth: '1100px', margin: '0 auto',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '28px' }}>🔥</span>
            <span style={{ fontSize: '20px', fontWeight: '700', color: COLORS.orange, letterSpacing: '1px' }}>FIRE</span>
            <span style={{ fontSize: '20px', fontWeight: '700', color: COLORS.white, letterSpacing: '1px' }}>NOTES</span>
          </div>

          {/* Desktop nav */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '32px',
          }} className="desktop-nav">
            <a onClick={() => scrollTo('como-funciona')} style={navLinkStyle}>Cómo funciona</a>
            <a onClick={() => scrollTo('features')} style={navLinkStyle}>Características</a>
            <a onClick={() => scrollTo('privacidad')} style={navLinkStyle}>Privacidad</a>
            <a href="/app" style={{
              padding: '10px 24px', borderRadius: '24px',
              background: `linear-gradient(135deg, ${COLORS.orange}, ${COLORS.purple})`,
              color: COLORS.white, fontWeight: '600', fontSize: '14px',
              textDecoration: 'none', transition: 'transform 0.2s, box-shadow 0.2s',
              boxShadow: '0 4px 20px rgba(155,89,182,0.4)',
            }}>
              Abrir App
            </a>
          </div>

          {/* Mobile hamburger */}
          <button onClick={() => setMenuOpen(!menuOpen)} className="mobile-menu-btn" style={{
            display: 'none', background: 'transparent', border: 'none',
            color: COLORS.white, fontSize: '24px', cursor: 'pointer', padding: '8px',
          }}>
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="mobile-menu" style={{
            position: 'absolute', top: '100%', left: 0, right: 0,
            backgroundColor: 'rgba(10,10,18,0.98)', backdropFilter: 'blur(20px)',
            padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px',
            borderBottom: `1px solid ${COLORS.card}`,
          }}>
            <a onClick={() => scrollTo('como-funciona')} style={{ ...navLinkStyle, fontSize: '18px' }}>Cómo funciona</a>
            <a onClick={() => scrollTo('features')} style={{ ...navLinkStyle, fontSize: '18px' }}>Características</a>
            <a onClick={() => scrollTo('privacidad')} style={{ ...navLinkStyle, fontSize: '18px' }}>Privacidad</a>
            <a href="/app" style={{
              padding: '14px 28px', borderRadius: '24px', textAlign: 'center',
              background: `linear-gradient(135deg, ${COLORS.orange}, ${COLORS.purple})`,
              color: COLORS.white, fontWeight: '600', fontSize: '16px', textDecoration: 'none',
            }}>
              Abrir App
            </a>
          </div>
        )}
      </nav>

      {/* ===== HERO ===== */}
      <section style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', padding: '120px 24px 80px',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Ambient glow */}
        <div style={{
          position: 'absolute', top: '-200px', left: '50%', transform: 'translateX(-50%)',
          width: '600px', height: '600px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,107,53,0.12) 0%, rgba(155,89,182,0.08) 40%, transparent 70%)',
          pointerEvents: 'none', filter: 'blur(60px)',
        }} />

        {/* Floating particles */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
          {[...Array(12)].map((_, i) => (
            <div key={i} style={{
              position: 'absolute',
              left: `${10 + (i * 7.5) % 85}%`,
              top: `${15 + (i * 13) % 70}%`,
              fontSize: `${10 + (i % 4) * 4}px`,
              opacity: 0.06 + (i % 3) * 0.03,
              animation: `float${i % 3} ${8 + i * 1.5}s ease-in-out infinite`,
              animationDelay: `${i * 0.7}s`,
            }}>
              🔥
            </div>
          ))}
        </div>

        {/* Logo */}
        <div style={{
          width: '120px', height: '120px', marginBottom: '32px',
          borderRadius: '28px', overflow: 'hidden',
          boxShadow: '0 8px 40px rgba(255,107,53,0.3), 0 0 80px rgba(155,89,182,0.15)',
          animation: 'heroLogo 1s ease-out',
          position: 'relative', zIndex: 1,
        }}>
          <img src="/icon-512.png" alt="Fire Notes" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>

        <h1 style={{
          fontSize: 'clamp(36px, 8vw, 64px)', fontWeight: '800',
          lineHeight: 1.1, marginBottom: '24px', position: 'relative', zIndex: 1,
          animation: 'heroText 1s ease-out 0.2s both',
        }}>
          <span style={{ color: COLORS.orange }}>Pensamientos</span>
          <br />
          <span style={{ color: COLORS.white }}>anónimos cerca de ti</span>
        </h1>

        <p style={{
          fontSize: 'clamp(16px, 3.5vw, 20px)', color: COLORS.grayLight,
          maxWidth: '520px', lineHeight: 1.7, marginBottom: '16px',
          position: 'relative', zIndex: 1,
          animation: 'heroText 1s ease-out 0.4s both',
        }}>
          Suelta lo que piensas. Solo las personas a <strong style={{ color: COLORS.orange }}>1km</strong> de ti pueden leerlo. En <strong style={{ color: COLORS.purple }}>24 horas</strong> desaparece todo.
        </p>

        <p style={{
          fontSize: '18px', fontStyle: 'italic', color: COLORS.gold,
          marginBottom: '40px', position: 'relative', zIndex: 1,
          animation: 'heroText 1s ease-out 0.5s both',
          letterSpacing: '0.5px',
        }}>
          "Sin cara, sin filtro, solo tus palabras."
        </p>

        <div style={{
          display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center',
          position: 'relative', zIndex: 1,
          animation: 'heroText 1s ease-out 0.6s both',
        }}>
          <a href="/app" style={{
            padding: '16px 40px', borderRadius: '28px',
            background: `linear-gradient(135deg, ${COLORS.orange}, ${COLORS.purple})`,
            color: COLORS.white, fontWeight: '700', fontSize: '18px',
            textDecoration: 'none', transition: 'transform 0.2s, box-shadow 0.2s',
            boxShadow: '0 6px 30px rgba(155,89,182,0.5)',
            display: 'flex', alignItems: 'center', gap: '10px',
          }}>
            🔥 Abrir Fire Notes
          </a>
        </div>

        {/* Scroll indicator */}
        <div style={{
          position: 'absolute', bottom: '32px', left: '50%', transform: 'translateX(-50%)',
          animation: 'bounce 2s ease infinite', opacity: 0.4,
          fontSize: '24px', color: COLORS.gray,
        }}>
          ↓
        </div>
      </section>

      {/* ===== CÓMO FUNCIONA ===== */}
      <section id="como-funciona" data-animate style={{
        padding: '100px 24px', maxWidth: '1100px', margin: '0 auto',
        opacity: isVisible('como-funciona') ? 1 : 0,
        transform: isVisible('como-funciona') ? 'translateY(0)' : 'translateY(40px)',
        transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>
        <h2 style={sectionTitleStyle}>Cómo funciona</h2>
        <p style={sectionSubStyle}>Tres pasos. Cero cuentas. Cero datos.</p>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '32px', marginTop: '60px',
        }}>
          {[
            { icon: '📍', step: '01', title: 'Llega a cualquier lugar', desc: 'Un bar, un concierto, tu universidad, un parque. Abre Fire Notes y tu GPS te ubica al instante.' },
            { icon: '✏️', step: '02', title: 'Suelta tu pensamiento', desc: 'Escribe lo que quieras. Recomendaciones, confesiones, quejas, el bochinche del barrio. Todo anónimo.' },
            { icon: '🔥', step: '03', title: 'Conecta con fuegos', desc: 'Las personas a menos de 1km leen tu nota. Si conecta, recibe fuegos. En 24 horas, desaparece todo.' },
          ].map((item, i) => (
            <div key={i} style={{
              padding: '36px 28px', borderRadius: '20px',
              backgroundColor: COLORS.card,
              border: '1px solid rgba(155,89,182,0.1)',
              position: 'relative', overflow: 'hidden',
              transition: 'transform 0.3s, box-shadow 0.3s',
              transitionDelay: `${i * 0.15}s`,
              opacity: isVisible('como-funciona') ? 1 : 0,
              transform: isVisible('como-funciona') ? 'translateY(0)' : 'translateY(30px)',
            }}>
              <span style={{
                position: 'absolute', top: '16px', right: '20px',
                fontSize: '48px', fontWeight: '900', color: 'rgba(255,107,53,0.06)',
                lineHeight: 1,
              }}>{item.step}</span>
              <span style={{ fontSize: '40px', display: 'block', marginBottom: '16px' }}>{item.icon}</span>
              <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '10px', color: COLORS.white }}>{item.title}</h3>
              <p style={{ fontSize: '15px', lineHeight: 1.7, color: COLORS.grayLight, margin: 0 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== DEMO NOTE ===== */}
      <section style={{
        padding: '60px 24px 100px', maxWidth: '500px', margin: '0 auto', textAlign: 'center',
      }}>
        <div id="demo-note" data-animate style={{
          opacity: isVisible('demo-note') ? 1 : 0,
          transform: isVisible('demo-note') ? 'translateY(0) rotate(-1deg)' : 'translateY(30px)',
          transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
          <div style={{
            backgroundColor: COLORS.cream, borderRadius: '12px', padding: '24px',
            position: 'relative', overflow: 'hidden',
            boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
            transform: 'rotate(-1deg)',
          }}>
            {/* Notebook lines */}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'repeating-linear-gradient(0deg, transparent, transparent 27px, rgba(0,0,0,0.04) 27px, rgba(0,0,0,0.04) 28px)',
              pointerEvents: 'none',
            }} />
            <p style={{
              color: COLORS.noteText, fontSize: '17px', lineHeight: '28px',
              position: 'relative', zIndex: 1, margin: 0, textAlign: 'left',
            }}>
              El café de la esquina tiene los mejores chilaquiles de toda la colonia y nadie lo sabe 🫡
            </p>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginTop: '16px', position: 'relative', zIndex: 1,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: '#8B7355' }}>3m</span>
                <span style={{
                  fontSize: '11px', color: '#A0937D',
                  backgroundColor: 'rgba(0,0,0,0.05)', padding: '2px 6px', borderRadius: '8px',
                }}>120m</span>
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                border: '1.5px solid rgba(255,107,53,0.3)', borderRadius: '20px',
                padding: '6px 14px', backgroundColor: 'rgba(255,107,53,0.1)',
              }}>
                <span style={{ fontSize: '16px' }}>🔥</span>
                <span style={{ fontWeight: '700', color: COLORS.orange, fontSize: '15px' }}>47</span>
              </div>
            </div>
          </div>
          <p style={{ fontSize: '13px', color: COLORS.gray, marginTop: '20px', fontStyle: 'italic' }}>
            Una nota real. Sin nombre. Sin perfil. Solo la verdad.
          </p>
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <section id="features" data-animate style={{
        padding: '100px 24px', maxWidth: '1100px', margin: '0 auto',
        opacity: isVisible('features') ? 1 : 0,
        transform: isVisible('features') ? 'translateY(0)' : 'translateY(40px)',
        transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>
        <h2 style={sectionTitleStyle}>Lo que hace especial a Fire Notes</h2>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '20px', marginTop: '60px',
        }}>
          {[
            { icon: '👤', title: 'Anónimo de verdad', desc: 'Sin registro, sin email, sin nombre. Nadie sabe quién eres. Punto.' },
            { icon: '📍', title: 'Hiperlocal', desc: 'Solo ves notas a 1km máximo. Lo que pasa aquí, se queda aquí.' },
            { icon: '⏱', title: 'Todo desaparece', desc: '24 horas y se acabó. Sin historial público, sin rastro, sin capturas eternas.' },
            { icon: '🔥', title: 'Solo fuegos', desc: 'Nada de likes ni corazones. Si conectas, recibes fuego. Genuino.' },
            { icon: '🛡️', title: 'Moderado con IA', desc: 'Puedes decir groserías pero no amenazas. La IA protege la comunidad sin censura innecesaria.' },
            { icon: '🏅', title: 'Medallas', desc: 'Chispa, Fogata, Incendio, Volcán, Estrella. Tu historial de impacto anónimo.' },
          ].map((item, i) => (
            <div key={i} style={{
              padding: '28px 24px', borderRadius: '16px',
              backgroundColor: COLORS.bgAlt,
              border: '1px solid rgba(155,89,182,0.08)',
              transition: 'all 0.6s ease',
              transitionDelay: `${i * 0.1}s`,
              opacity: isVisible('features') ? 1 : 0,
              transform: isVisible('features') ? 'translateY(0)' : 'translateY(20px)',
            }}>
              <span style={{ fontSize: '32px', display: 'block', marginBottom: '12px' }}>{item.icon}</span>
              <h3 style={{ fontSize: '17px', fontWeight: '700', marginBottom: '8px', color: COLORS.white }}>{item.title}</h3>
              <p style={{ fontSize: '14px', lineHeight: 1.6, color: COLORS.gray, margin: 0 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== SOCIAL PROOF / SCENARIOS ===== */}
      <section id="escenarios" data-animate style={{
        padding: '80px 24px', textAlign: 'center',
        backgroundColor: COLORS.bgAlt,
        opacity: isVisible('escenarios') ? 1 : 0,
        transform: isVisible('escenarios') ? 'translateY(0)' : 'translateY(40px)',
        transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={sectionTitleStyle}>¿Dónde usarías Fire Notes?</h2>
          <div style={{
            display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '12px', marginTop: '40px',
          }}>
            {[
              '🎵 En un concierto', '🏫 En tu universidad', '🍺 En el bar',
              '✈️ En el aeropuerto', '🏖️ En la playa', '🎭 En un evento',
              '🏟️ En el estadio', '☕ En una cafetería', '🚇 En el metro',
              '🏥 En la sala de espera', '🎪 En un festival', '🏘️ En tu colonia',
            ].map((scenario, i) => (
              <span key={i} style={{
                padding: '12px 20px', borderRadius: '24px',
                backgroundColor: COLORS.card,
                border: '1px solid rgba(155,89,182,0.1)',
                fontSize: '15px', color: COLORS.grayLight,
                transition: 'all 0.4s ease',
                transitionDelay: `${i * 0.05}s`,
                opacity: isVisible('escenarios') ? 1 : 0,
              }}>
                {scenario}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA CENTRAL ===== */}
      <section style={{
        padding: '100px 24px', textAlign: 'center', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at center, rgba(255,107,53,0.08) 0%, transparent 60%)',
          pointerEvents: 'none',
        }} />
        <div id="cta" data-animate style={{
          position: 'relative', zIndex: 1,
          opacity: isVisible('cta') ? 1 : 0,
          transform: isVisible('cta') ? 'translateY(0)' : 'translateY(30px)',
          transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
          <span style={{ fontSize: '64px', display: 'block', marginBottom: '24px' }}>🔥</span>
          <h2 style={{
            fontSize: 'clamp(28px, 6vw, 44px)', fontWeight: '800',
            lineHeight: 1.2, marginBottom: '16px',
          }}>
            ¿Qué se dice cerca de ti<br />
            <span style={{ color: COLORS.orange }}>en este momento?</span>
          </h2>
          <p style={{ fontSize: '18px', color: COLORS.grayLight, marginBottom: '40px', maxWidth: '480px', margin: '0 auto 40px' }}>
            Abre Fire Notes y descúbrelo. Sin registro, sin datos, 100% anónimo.
          </p>
          <a href="/app" style={{
            display: 'inline-flex', alignItems: 'center', gap: '10px',
            padding: '18px 48px', borderRadius: '28px',
            background: `linear-gradient(135deg, ${COLORS.orange}, ${COLORS.purple})`,
            color: COLORS.white, fontWeight: '700', fontSize: '20px',
            textDecoration: 'none',
            boxShadow: '0 8px 40px rgba(155,89,182,0.5)',
          }}>
            🔥 Entrar ahora
          </a>
          <p style={{ fontSize: '13px', color: COLORS.gray, marginTop: '16px' }}>
            Funciona en cualquier navegador. Nada que instalar.
          </p>
        </div>
      </section>

      {/* ===== PRIVACIDAD ===== */}
      <section id="privacidad" data-animate style={{
        padding: '100px 24px', backgroundColor: COLORS.bgAlt,
        opacity: isVisible('privacidad') ? 1 : 0,
        transform: isVisible('privacidad') ? 'translateY(0)' : 'translateY(40px)',
        transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={sectionTitleStyle}>Privacidad y Términos</h2>
          <p style={{ ...sectionSubStyle, marginBottom: '40px' }}>
            Tu privacidad es nuestra prioridad. Así funciona:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {[
              {
                title: '¿Qué guardamos?',
                content: 'Un identificador anónimo de tu dispositivo, la ubicación aproximada de tus notas y tu dirección IP (solo para prevenir abuso). Nada más.',
              },
              {
                title: '¿Qué NO guardamos?',
                content: 'Tu nombre, email, teléfono, fotos, contactos ni ningún dato personal identificable. No tienes cuenta, no tienes perfil.',
              },
              {
                title: '¿Cuánto tiempo se guardan los datos?',
                content: 'Las notas desaparecen del feed a las 24 horas. Los registros técnicos (para seguridad y requerimientos legales) se retienen máximo 30 días y después se eliminan permanentemente.',
              },
              {
                title: '¿Cooperan con autoridades?',
                content: 'Eres anónimo pero NO invisible. Ante un requerimiento legal válido, proporcionamos los identificadores anónimos, IPs y contenido relacionado con la investigación. No toleramos amenazas, contenido de menores ni actividades ilegales.',
              },
              {
                title: '¿Qué está prohibido?',
                content: 'Amenazas con nombres propios, contenido sexual de menores, incitación a la violencia, venta de drogas/armas y cualquier actividad ilegal. La moderación con IA filtra automáticamente. 5 reportes de la comunidad = nota eliminada.',
              },
              {
                title: '¿Qué SÍ puedes hacer?',
                content: 'Expresarte libremente. Quejas, confesiones, recomendaciones, opiniones, groserías incluidas. Fire Notes es un espacio de expresión genuina, no una red social más.',
              },
            ].map((item, i) => (
              <div key={i} style={{
                padding: '24px', borderRadius: '16px',
                backgroundColor: COLORS.card,
                border: '1px solid rgba(155,89,182,0.08)',
              }}>
                <h3 style={{ fontSize: '17px', fontWeight: '700', color: COLORS.gold, marginBottom: '8px' }}>{item.title}</h3>
                <p style={{ fontSize: '15px', lineHeight: 1.7, color: COLORS.grayLight, margin: 0 }}>{item.content}</p>
              </div>
            ))}
          </div>

          <p style={{
            textAlign: 'center', fontSize: '13px', color: COLORS.gray,
            marginTop: '32px', fontStyle: 'italic',
          }}>
            Última actualización: Abril 2026 · Contacto: hola@firenotesapp.com
          </p>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer style={{
        padding: '60px 24px 40px', textAlign: 'center',
        borderTop: `1px solid ${COLORS.card}`,
      }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '20px' }}>
            <span style={{ fontSize: '24px' }}>🔥</span>
            <span style={{ fontSize: '18px', fontWeight: '700', color: COLORS.orange }}>FIRE</span>
            <span style={{ fontSize: '18px', fontWeight: '700' }}>NOTES</span>
          </div>

          <p style={{ fontSize: '14px', color: COLORS.gray, lineHeight: 1.6, marginBottom: '24px' }}>
            Pensamientos anónimos cerca de ti. Sin cara, sin filtro, solo tus palabras.
          </p>

          {/* Social links */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '32px' }}>
            {[
              { label: 'TikTok', url: 'https://tiktok.com/@firenotesapp' },
              { label: 'Instagram', url: 'https://instagram.com/firenotesapp' },
              { label: 'X', url: 'https://x.com/firenotesapp' },
            ].map((social) => (
              <a key={social.label} href={social.url} target="_blank" rel="noopener noreferrer" style={{
                padding: '10px 20px', borderRadius: '24px',
                backgroundColor: COLORS.card, color: COLORS.grayLight,
                textDecoration: 'none', fontSize: '14px', fontWeight: '500',
                border: '1px solid rgba(155,89,182,0.1)',
                transition: 'all 0.2s',
              }}>
                {social.label}
              </a>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginBottom: '24px' }}>
            <a onClick={() => scrollTo('privacidad')} style={{ fontSize: '13px', color: COLORS.gray, cursor: 'pointer', textDecoration: 'underline' }}>
              Política de Privacidad
            </a>
            <a href="/app" style={{ fontSize: '13px', color: COLORS.gray, textDecoration: 'underline' }}>
              Abrir App
            </a>
          </div>

          <p style={{ fontSize: '12px', color: COLORS.grayLight, opacity: 0.4 }}>
            © {new Date().getFullYear()} Fire Notes. Hecho en México 🇲🇽
          </p>
        </div>
      </footer>

      {/* ===== GLOBAL STYLES ===== */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,700;0,9..40,800;1,9..40,400&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        html { scroll-behavior: smooth; }

        body {
          font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
          background: ${COLORS.bg};
          -webkit-font-smoothing: antialiased;
        }

        @keyframes heroLogo {
          from { opacity: 0; transform: scale(0.8) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes heroText {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(8px); }
        }
        @keyframes float0 {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(10deg); }
        }
        @keyframes float1 {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-30px) rotate(-8deg); }
        }
        @keyframes float2 {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(5deg); }
        }

        /* Responsive */
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .mobile-menu-btn { display: block !important; }
        }
        @media (min-width: 769px) {
          .mobile-menu { display: none !important; }
        }

        /* Hover effects for desktop */
        @media (hover: hover) {
          a:hover { opacity: 0.9; }
        }

        ::selection {
          background: rgba(255, 107, 53, 0.3);
          color: white;
        }
      `}</style>
    </div>
  );
}

// ============================================================
// SHARED STYLES
// ============================================================
const navLinkStyle = {
  color: COLORS.grayLight,
  textDecoration: 'none',
  fontSize: '14px',
  fontWeight: '500',
  cursor: 'pointer',
  transition: 'color 0.2s',
};

const sectionTitleStyle = {
  fontSize: 'clamp(28px, 5vw, 40px)',
  fontWeight: '800',
  textAlign: 'center',
  marginBottom: '12px',
  color: COLORS.white,
};

const sectionSubStyle = {
  fontSize: '16px',
  color: COLORS.gray,
  textAlign: 'center',
  maxWidth: '500px',
  margin: '0 auto',
};
