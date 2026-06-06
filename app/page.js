'use client';
import { useState, useEffect, useRef } from 'react';

const COLORS = {
  bg: '#0A0A12', bgAlt: '#111122', card: '#161630',
  orange: '#FF6B35', orangeGlow: '#FF8C5A', purple: '#9B59B6',
  purpleLight: '#BB8FCE', gold: '#FFD700', white: '#FFFFFF',
  gray: '#8892B0', grayLight: '#A0AEC0', cream: '#FDF6E3', noteText: '#2D2A26',
};

export default function LandingPage() {
  const [scrollY, setScrollY] = useState(0);
  const [visibleSections, setVisibleSections] = useState(new Set());
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeNote, setActiveNote] = useState(0);
  const observerRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setVisibleSections((prev) => new Set([...prev, entry.target.id]));
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -50px 0px' }
    );
    setTimeout(() => {
      document.querySelectorAll('[data-animate]').forEach((el) => observerRef.current?.observe(el));
    }, 100);
    return () => { window.removeEventListener('scroll', handleScroll); observerRef.current?.disconnect(); };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setActiveNote((prev) => (prev + 1) % exampleNotes.length), 5000);
    return () => clearInterval(interval);
  }, []);

  const isVisible = (id) => visibleSections.has(id);
  const scrollTo = (id) => { setMenuOpen(false); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); };

  // estado: 'normal' | 'ardiendo' (popular, super incendiada) | 'cenizas' (muriendo por tiempo)
  // medal: '🌟' (estrella/joya) | '🌋' (volcan) | null
  const exampleNotes = [
    { text: 'El café de la esquina tiene los mejores chilaquiles de toda la colonia y nadie lo sabe 🫡', fires: 47, time: '3m', dist: '120m', medal: null, estado: 'normal' },
    { text: 'La chica que trabaja en la librería de Coyoacán tiene la sonrisa más bonita que he visto en mi vida', fires: 134, time: '18m', dist: '340m', medal: null, estado: 'ardiendo' },
    { text: 'Llevo 3 años viviendo aquí y hoy por primera vez un vecino me dijo buenos días. Casi lloro.', fires: 89, time: '23h', dist: '90m', medal: null, estado: 'cenizas' },
    { text: 'A los tacos del señor de la plaza NO le pongan la salsa verde. Confíen en mí. 💀', fires: 203, time: '1h', dist: '200m', medal: null, estado: 'normal' },
    { text: 'Hoy me senté en esta banca a llorar y un señor que ni conozco se sentó a mi lado sin decir nada. A veces el silencio es el abrazo más fuerte.', fires: 12847, time: '6h', dist: '30m', medal: '🌟', estado: 'normal' },
    { text: 'Estoy en este concierto solo porque me dejaron y saben qué? La estoy pasando mejor que nunca 🔥', fires: 312, time: '8m', dist: '50m', medal: null, estado: 'ardiendo' },
    { text: 'Le acabo de decir a mi jefe que renuncio. Estoy temblando pero sonriendo. No hay vuelta atrás.', fires: 178, time: '2m', dist: '400m', medal: null, estado: 'normal' },
    { text: 'Este atardecer desde el mirador de Valle de Bravo es de las cosas más bonitas que he visto. Si estás aquí arriba, mira al cielo ahorita.', fires: 1453, time: '20m', dist: '150m', medal: '🌋', estado: 'normal' },
  ];

  const navLinkStyle = { color: COLORS.grayLight, textDecoration: 'none', fontSize: '14px', fontWeight: '500', cursor: 'pointer' };

  // ====== Helper de estilo por nota (joya / volcan / ardiendo / cenizas / normal) ======
  const getNotaVisual = (note) => {
    const esJoya = note.medal === '🌟';
    const esVolcan = note.medal === '🌋';
    const ardiendo = note.estado === 'ardiendo';
    const cenizas = note.estado === 'cenizas';

    let bg = COLORS.cream;
    let texto = COLORS.noteText;
    let borde = 'none';
    let shadow = '0 8px 40px rgba(0,0,0,0.4)';
    let lineas = true;

    if (esJoya) {
      bg = '#2D1B4E'; texto = '#FFFFFF'; borde = '2px solid #FFD700'; lineas = false;
      shadow = '0 0 20px rgba(255, 215, 0, 0.4), 0 0 40px rgba(255, 215, 0, 0.2), 0 8px 40px rgba(0,0,0,0.5)';
    } else if (esVolcan) {
      bg = '#1a1a2e'; texto = '#FFFFFF'; borde = '2px solid #FF6B35'; lineas = false;
      shadow = '0 0 15px rgba(255, 107, 53, 0.4), 0 8px 40px rgba(0,0,0,0.4)';
    } else if (cenizas) {
      bg = 'radial-gradient(130% 95% at 50% 120%, #1c0d05, #3a1a08 32%, #5a2e12 62%, #6b3a18 88%)';
      texto = '#FFE8D6'; borde = '2px solid #7a3b15'; lineas = false;
      shadow = '0 0 22px rgba(160,60,15,0.55), 0 8px 40px rgba(0,0,0,0.5)';
    } else if (ardiendo) {
      bg = COLORS.cream; texto = COLORS.noteText; borde = '2px solid #FF4500'; lineas = true;
      shadow = '0 0 24px rgba(255,69,0,0.55), 0 0 48px rgba(255,69,0,0.3), 0 8px 40px rgba(0,0,0,0.4)';
    }

    return { esJoya, esVolcan, ardiendo, cenizas, bg, texto, borde, shadow, lineas };
  };

  return (
    <div style={{ backgroundColor: COLORS.bg, color: COLORS.white, minHeight: '100vh', overflowX: 'hidden' }}>

      {/* NAV */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, padding: '16px 24px',
        backgroundColor: scrollY > 50 ? 'rgba(10,10,18,0.95)' : 'transparent',
        backdropFilter: scrollY > 50 ? 'blur(20px)' : 'none',
        transition: 'all 0.3s ease',
        borderBottom: scrollY > 50 ? '1px solid rgba(155,89,182,0.15)' : '1px solid transparent',
      }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '28px' }}>🔥</span>
            <span style={{ fontSize: '20px', fontWeight: '700', color: COLORS.orange, letterSpacing: '1px' }}>FIRE</span>
            <span style={{ fontSize: '20px', fontWeight: '700', color: COLORS.white, letterSpacing: '1px' }}>NOTES</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }} className="desktop-nav">
            <a onClick={() => scrollTo('como-funciona')} style={navLinkStyle}>Cómo funciona</a>
            <a onClick={() => scrollTo('donde')} style={navLinkStyle}>Dónde usarla</a>
            <a onClick={() => scrollTo('privacidad')} style={navLinkStyle}>Privacidad</a>
            <a href="/app" style={{ padding: '10px 24px', borderRadius: '24px', background: `linear-gradient(135deg, ${COLORS.orange}, ${COLORS.purple})`, color: COLORS.white, fontWeight: '600', fontSize: '14px', textDecoration: 'none', boxShadow: '0 4px 20px rgba(155,89,182,0.4)' }}>Abrir App</a>
          </div>
          <button onClick={() => setMenuOpen(!menuOpen)} className="mobile-menu-btn" style={{ display: 'none', background: 'transparent', border: 'none', color: COLORS.white, fontSize: '24px', cursor: 'pointer', padding: '8px' }}>
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
        {menuOpen && (
          <div className="mobile-menu" style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'rgba(10,10,18,0.98)', backdropFilter: 'blur(20px)', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', borderBottom: `1px solid ${COLORS.card}` }}>
            <a onClick={() => scrollTo('como-funciona')} style={{ ...navLinkStyle, fontSize: '18px' }}>Cómo funciona</a>
            <a onClick={() => scrollTo('donde')} style={{ ...navLinkStyle, fontSize: '18px' }}>Dónde usarla</a>
            <a onClick={() => scrollTo('privacidad')} style={{ ...navLinkStyle, fontSize: '18px' }}>Privacidad</a>
            <a href="/app" style={{ padding: '14px 28px', borderRadius: '24px', textAlign: 'center', background: `linear-gradient(135deg, ${COLORS.orange}, ${COLORS.purple})`, color: COLORS.white, fontWeight: '600', fontSize: '16px', textDecoration: 'none' }}>Abrir App</a>
          </div>
        )}
      </nav>

      {/* HERO */}
      <section style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '120px 24px 80px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-200px', left: '50%', transform: 'translateX(-50%)', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,107,53,0.12) 0%, rgba(155,89,182,0.08) 40%, transparent 70%)', pointerEvents: 'none', filter: 'blur(60px)' }} />
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
          {[...Array(12)].map((_, i) => (
            <div key={i} style={{ position: 'absolute', left: `${10 + (i * 7.5) % 85}%`, top: `${15 + (i * 13) % 70}%`, fontSize: `${10 + (i % 4) * 4}px`, opacity: 0.06 + (i % 3) * 0.03, animation: `float${i % 3} ${8 + i * 1.5}s ease-in-out infinite`, animationDelay: `${i * 0.7}s` }}>🔥</div>
          ))}
        </div>

        <div style={{ width: '120px', height: '120px', marginBottom: '32px', borderRadius: '28px', overflow: 'hidden', boxShadow: '0 8px 40px rgba(255,107,53,0.3), 0 0 80px rgba(155,89,182,0.15)', animation: 'heroLogo 1s ease-out', position: 'relative', zIndex: 1 }}>
          <img src="/icon-512.png" alt="Fire Notes" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>

        <h1 style={{ fontSize: 'clamp(36px, 8vw, 64px)', fontWeight: '800', lineHeight: 1.1, marginBottom: '24px', position: 'relative', zIndex: 1, animation: 'heroText 1s ease-out 0.2s both' }}>
          <span style={{ color: COLORS.white }}>Suelta lo que piensas.</span><br />
          <span style={{ color: COLORS.orange }}>Nadie sabe quién eres.</span>
        </h1>

        <p style={{ fontSize: 'clamp(16px, 3.5vw, 20px)', color: COLORS.grayLight, maxWidth: '540px', lineHeight: 1.7, marginBottom: '20px', position: 'relative', zIndex: 1, animation: 'heroText 1s ease-out 0.4s both' }}>
          Pensamientos anónimos que flotan donde los escribes. Solo las personas a <strong style={{ color: COLORS.orange }}>1km de esa nota</strong> pueden leerla. En <strong style={{ color: COLORS.purple }}>24 horas</strong> desaparece todo. Solo queda lo que piensas en este momento.
        </p>

        <p style={{ fontSize: '18px', fontStyle: 'italic', color: COLORS.gold, marginBottom: '40px', position: 'relative', zIndex: 1, animation: 'heroText 1s ease-out 0.5s both', letterSpacing: '0.5px' }}>
          "Sin cara, sin filtro, solo tus palabras."
        </p>

        <a href="/app" style={{ padding: '16px 40px', borderRadius: '28px', background: `linear-gradient(135deg, ${COLORS.orange}, ${COLORS.purple})`, color: COLORS.white, fontWeight: '700', fontSize: '18px', textDecoration: 'none', boxShadow: '0 6px 30px rgba(155,89,182,0.5)', display: 'inline-flex', alignItems: 'center', gap: '10px', position: 'relative', zIndex: 1, animation: 'heroText 1s ease-out 0.6s both' }}>
          🔥 Abrir Fire Notes
        </a>

        <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', position: 'relative', zIndex: 1, animation: 'heroText 1s ease-out 0.7s both' }}>
          <p style={{ fontSize: '13px', color: COLORS.gray }}>
            Disponible en tu navegador. Sin descargas.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '24px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <span style={{ fontSize: '18px' }}>▶️</span>
            <span style={{ fontSize: '13px', color: COLORS.grayLight, fontWeight: '500', letterSpacing: '0.5px' }}>PRÓXIMAMENTE EN GOOGLE PLAY</span>
          </div>
        </div>

        <div style={{ position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', animation: 'bounce 2s ease infinite', opacity: 0.4, fontSize: '24px', color: COLORS.gray }}>↓</div>
      </section>

      {/* CÓMO FUNCIONA */}
      <section id="como-funciona" data-animate style={{ padding: '60px 24px', maxWidth: '1100px', margin: '0 auto', opacity: isVisible('como-funciona') ? 1 : 0, transform: isVisible('como-funciona') ? 'translateY(0)' : 'translateY(40px)', transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)' }}>
        <h2 style={sectionTitleStyle}>Cómo funciona</h2>
        <p style={sectionSubStyle}>Tres pasos. Cero cuentas. Cero datos.</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '32px', marginTop: '60px' }}>
          {[
            { icon: '📍', step: '01', title: 'Tu nota se queda flotando ahí', desc: 'Escribes algo y tu pensamiento se queda flotando justo donde lo soltaste. Cualquier persona que pase por ahí o esté a menos de 1km puede leerlo. Como dejar un mensaje invisible en el aire que solo los de cerca pueden ver.' },
            { icon: '✏️', step: '02', title: 'Di lo que de verdad piensas', desc: 'Recomienda ese lugar que nadie conoce. Confiesa lo que nunca te atreves a decir con tu nombre. Opina del lugar donde estás. Desahógate. Enamórate. Quéjate. Suelta lo que quieras.' },
            { icon: '🔥', step: '03', title: 'Conecta con fuegos', desc: 'Cuando tu nota recibe fuegos no es porque les gustó tu foto o tu nombre. Es porque lo que escribiste conectó de verdad. Eso hace cada fuego algo genuino.' },
          ].map((item, i) => (
            <div key={i} style={{ padding: '36px 28px', borderRadius: '20px', backgroundColor: COLORS.card, border: '1px solid rgba(155,89,182,0.1)', position: 'relative', overflow: 'hidden', transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)', transitionDelay: `${i * 0.15}s`, opacity: isVisible('como-funciona') ? 1 : 0, transform: isVisible('como-funciona') ? 'translateY(0)' : 'translateY(30px)' }}>
              <span style={{ position: 'absolute', top: '16px', right: '20px', fontSize: '48px', fontWeight: '900', color: 'rgba(255,107,53,0.06)', lineHeight: 1 }}>{item.step}</span>
              <span style={{ fontSize: '40px', display: 'block', marginBottom: '16px' }}>{item.icon}</span>
              <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '10px', color: COLORS.white }}>{item.title}</h3>
              <p style={{ fontSize: '15px', lineHeight: 1.7, color: COLORS.grayLight, margin: 0 }}>{item.desc}</p>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: '40px', display: 'flex', justifyContent: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '14px 28px', borderRadius: '32px', backgroundColor: COLORS.card, border: '1px solid rgba(155,89,182,0.15)' }}>
            <span style={{ fontSize: '22px' }}>⏱</span>
            <span style={{ fontSize: '15px', color: COLORS.grayLight }}>Las personas a menos de 1km de cada nota pueden leerla. En <strong style={{ color: COLORS.orange }}>24 horas</strong> desaparece todo.</span>
          </div>
        </div>
      </section>

      {/* LO QUE LE DA VIDA AL FUEGO (nuevo bloque explicativo del feeling) */}
      <section id="fuego" data-animate style={{ padding: '40px 24px 20px', maxWidth: '1100px', margin: '0 auto', opacity: isVisible('fuego') ? 1 : 0, transform: isVisible('fuego') ? 'translateY(0)' : 'translateY(40px)', transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)' }}>
        <h2 style={sectionTitleStyle}>Las notas están vivas</h2>
        <p style={{ ...sectionSubStyle, marginBottom: '48px' }}>El tiempo las consume. Los fuegos las encienden. Las mejores brillan como joyas.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
          {[
            { emoji: '📝', title: 'Recién escrita', desc: 'Papel limpio. Tu pensamiento acaba de aterrizar en el mapa.', color: 'rgba(155,89,182,0.15)' },
            { emoji: '🔥', title: 'En llamas', desc: 'Cuando recibe muchos fuegos, la nota arde viva: brilla naranja, llamea. Conectó.', color: 'rgba(255,69,0,0.18)' },
            { emoji: '💨', title: 'Volviéndose cenizas', desc: 'Mientras se acerca a las 24h, el papel se carboniza y suelta humo. Está por desaparecer para siempre.', color: 'rgba(120,40,10,0.25)' },
            { emoji: '👑', title: 'La joya de la zona', desc: 'La nota #1 con más fuegos se vuelve una joya dorada con corona. La mejor de tu área.', color: 'rgba(255,215,0,0.18)' },
          ].map((item, i) => (
            <div key={i} style={{ padding: '28px 22px', borderRadius: '18px', backgroundColor: COLORS.bgAlt, border: '1px solid rgba(155,89,182,0.1)', boxShadow: `inset 0 0 30px ${item.color}`, transition: 'all 0.6s ease', transitionDelay: `${i * 0.1}s`, opacity: isVisible('fuego') ? 1 : 0, transform: isVisible('fuego') ? 'translateY(0)' : 'translateY(20px)' }}>
              <span style={{ fontSize: '36px', display: 'block', marginBottom: '12px' }}>{item.emoji}</span>
              <h3 style={{ fontSize: '17px', fontWeight: '700', marginBottom: '8px', color: COLORS.white }}>{item.title}</h3>
              <p style={{ fontSize: '14px', lineHeight: 1.6, color: COLORS.gray, margin: 0 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* NOTAS DE EJEMPLO */}
      <section style={{ padding: '40px 24px 100px', maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
        <div id="demo-note" data-animate style={{ opacity: isVisible('demo-note') ? 1 : 0, transform: isVisible('demo-note') ? 'translateY(0)' : 'translateY(30px)', transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)' }}>
          <h2 style={{ fontSize: '24px', fontWeight: '800', textAlign: 'center', marginBottom: '8px', color: COLORS.white }}>Esto se ve en Fire Notes</h2>
          <p style={{ fontSize: '14px', color: COLORS.gray, marginBottom: '32px' }}>Notas reales. Sin nombre. Sin perfil. Solo lo que alguien quiso decir.</p>

          <div style={{ position: 'relative', minHeight: '220px' }}>
            {exampleNotes.map((note, i) => {
              const v = getNotaVisual(note);
              const activa = i === activeNote;
              return (
                <div key={i} style={{
                  position: activa ? 'relative' : 'absolute', top: 0, left: 0, right: 0,
                  background: v.bg, backgroundColor: typeof v.bg === 'string' && v.bg.startsWith('#') ? v.bg : undefined,
                  borderRadius: '12px', padding: '24px', overflow: 'hidden',
                  boxShadow: v.shadow,
                  transform: activa ? 'rotate(-1deg) scale(1)' : 'rotate(-1deg) scale(0.95)',
                  opacity: activa ? (v.cenizas ? 0.94 : 1) : 0, transition: 'all 0.5s ease',
                  pointerEvents: activa ? 'auto' : 'none',
                  border: v.borde,
                  animation: activa ? (v.esJoya ? 'jewelL 2.6s ease-in-out infinite' : v.ardiendo ? 'infernoL 0.9s ease-in-out infinite' : v.cenizas ? 'dyingL 1.8s ease-in-out infinite' : 'none') : 'none',
                }}>
                  {/* Líneas de cuaderno (papel claro) */}
                  {v.lineas && <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(0deg, transparent, transparent 27px, rgba(0,0,0,0.04) 27px, rgba(0,0,0,0.04) 28px)', pointerEvents: 'none' }} />}

                  {/* Carbonizado de orillas (cenizas) */}
                  {v.cenizas && (
                    <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
                      background: 'radial-gradient(circle at 100% 0%, rgba(0,0,0,0.55), transparent 34%), radial-gradient(circle at 0% 0%, rgba(0,0,0,0.5), transparent 32%), radial-gradient(circle at 100% 100%, rgba(0,0,0,0.45), transparent 30%), radial-gradient(circle at 0% 100%, rgba(0,0,0,0.4), transparent 28%)' }} />
                  )}

                  {/* Llamas lamiendo desde abajo (ardiendo / cenizas) */}
                  {(v.ardiendo || v.cenizas) && (
                    <div className="fnFlames" style={{
                      position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 2, pointerEvents: 'none',
                      height: v.ardiendo ? '46px' : '42px',
                      opacity: v.ardiendo ? 0.82 : 0.7,
                      background: v.ardiendo
                        ? 'linear-gradient(to top, #FFD000, #FF4500 42%, #FF6B35 72%, transparent)'
                        : 'linear-gradient(to top, #FF5500, #C9450F 45%, #8a3a18 78%, transparent)',
                    }} />
                  )}

                  {/* Humo (cenizas) */}
                  {v.cenizas && (
                    <>
                      <div className="fnSmoke" style={{ left: '32%', animationDelay: '0s' }} />
                      <div className="fnSmoke" style={{ left: '56%', animationDelay: '0.7s' }} />
                      <div className="fnSmoke" style={{ left: '72%', animationDelay: '1.3s' }} />
                    </>
                  )}

                  {/* Badge corona/medalla (joya y volcán) */}
                  {note.medal && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '10px', position: 'relative', zIndex: 5 }}>
                      {v.esJoya && <span className="fnCrownL" style={{ fontSize: '16px' }}>👑</span>}
                      <span style={{ fontSize: '24px', filter: v.esJoya ? 'drop-shadow(0 0 8px gold)' : 'drop-shadow(0 0 4px #FF6B35)', animation: 'pulse 2s ease infinite' }}>{note.medal}</span>
                      <span style={{ fontSize: '11px', fontWeight: '700', color: v.esJoya ? '#FFD700' : '#FF6B35', letterSpacing: '1.5px' }}>
                        {v.esJoya ? 'ESTRELLA DORADA' : 'VOLCÁN'}
                      </span>
                      {v.esJoya && <span className="fnCrownL" style={{ fontSize: '16px' }}>👑</span>}
                    </div>
                  )}

                  {/* Badge esquina: EN LLAMAS (ardiendo) o tiempo (cenizas) */}
                  {v.ardiendo && !note.medal && (
                    <div style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 10, fontSize: '10px', backgroundColor: '#FF4500', color: '#fff', padding: '3px 9px', borderRadius: '8px', fontWeight: '700', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      🔥 EN LLAMAS
                    </div>
                  )}
                  {v.cenizas && (
                    <div style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 10, fontSize: '10px', backgroundColor: '#FF4500', color: '#fff', padding: '3px 9px', borderRadius: '8px', fontWeight: '700', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      💨 POR DESAPARECER
                    </div>
                  )}

                  <p style={{ color: v.texto, fontSize: (note.medal || v.ardiendo) ? '17px' : '16px', lineHeight: '28px', fontWeight: (note.medal || v.ardiendo) ? '500' : '400', position: 'relative', zIndex: 3, margin: 0, textAlign: 'left' }}>{note.text}</p>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', position: 'relative', zIndex: 3 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '12px', color: note.medal ? '#A0AEC0' : v.cenizas ? '#FFB347' : v.ardiendo ? '#C24A1F' : '#8B7355', fontWeight: v.cenizas ? '600' : '400' }}>
                        {note.time}{v.cenizas && ' · 💨'}
                      </span>
                      <span style={{ fontSize: '11px', color: note.medal ? '#A0AEC0' : v.cenizas ? '#FFD0B0' : '#A0937D', backgroundColor: note.medal ? 'rgba(255,255,255,0.1)' : v.cenizas ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', padding: '2px 6px', borderRadius: '8px' }}>{note.dist}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', border: v.esJoya ? '1.5px solid rgba(255,215,0,0.4)' : v.ardiendo ? '1.5px solid rgba(255,69,0,0.5)' : '1.5px solid rgba(255,107,53,0.3)', borderRadius: '20px', padding: '6px 14px', backgroundColor: v.esJoya ? 'rgba(255,215,0,0.15)' : v.ardiendo ? 'rgba(255,69,0,0.15)' : 'rgba(255,107,53,0.1)' }}>
                      <span style={{ fontSize: '16px' }}>🔥</span>
                      <span style={{ fontWeight: '700', color: v.esJoya ? COLORS.gold : v.ardiendo ? '#FF4500' : COLORS.orange, fontSize: '15px' }}>{note.fires.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '24px' }}>
            {exampleNotes.map((_, i) => (
              <button key={i} onClick={() => setActiveNote(i)} style={{ width: i === activeNote ? '24px' : '8px', height: '8px', borderRadius: '4px', border: 'none', cursor: 'pointer', backgroundColor: i === activeNote ? COLORS.orange : COLORS.card, transition: 'all 0.3s ease' }} />
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" data-animate style={{ padding: '80px 24px', maxWidth: '1100px', margin: '0 auto', opacity: isVisible('features') ? 1 : 0, transform: isVisible('features') ? 'translateY(0)' : 'translateY(40px)', transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)' }}>
        <h2 style={sectionTitleStyle}>Lo que hace especial a Fire Notes</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginTop: '60px' }}>
          {[
            { icon: '👤', title: 'Anónimo de verdad', desc: 'Sin registro, sin email, sin nombre. Nadie sabe quién eres. Punto.' },
            { icon: '📍', title: 'Hiperlocal', desc: 'Solo ves notas a 1km de donde fueron escritas. Lo que pasa aquí, se queda aquí.' },
            { icon: '⏱', title: 'Todo desaparece', desc: '24 horas y se acabó. Sin historial público, sin rastro.' },
            { icon: '🔥', title: 'Solo fuegos', desc: 'Nada de likes ni corazones. Si conectas, recibes fuego. Genuino.' },
            { icon: '🛡️', title: 'Moderado con IA', desc: 'Puedes decir groserías pero no amenazas. La IA protege sin censura innecesaria.' },
            { icon: '🏅', title: 'Medallas', desc: 'Chispa, Fogata, Incendio, Volcán, Estrella. Tu historial de impacto anónimo.' },
          ].map((item, i) => (
            <div key={i} style={{ padding: '28px 24px', borderRadius: '16px', backgroundColor: COLORS.bgAlt, border: '1px solid rgba(155,89,182,0.08)', transition: 'all 0.6s ease', transitionDelay: `${i * 0.1}s`, opacity: isVisible('features') ? 1 : 0, transform: isVisible('features') ? 'translateY(0)' : 'translateY(20px)' }}>
              <span style={{ fontSize: '32px', display: 'block', marginBottom: '12px' }}>{item.icon}</span>
              <h3 style={{ fontSize: '17px', fontWeight: '700', marginBottom: '8px', color: COLORS.white }}>{item.title}</h3>
              <p style={{ fontSize: '14px', lineHeight: 1.6, color: COLORS.gray, margin: 0 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* DÓNDE USARLA */}
      <section id="donde" data-animate style={{ padding: '100px 24px', backgroundColor: COLORS.bgAlt, opacity: isVisible('donde') ? 1 : 0, transform: isVisible('donde') ? 'translateY(0)' : 'translateY(40px)', transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={sectionTitleStyle}>Ábrela donde sea</h2>
          <p style={{ ...sectionSubStyle, marginBottom: '48px' }}>Llegas a cualquier lugar, abres Fire Notes y descubres lo que la gente piensa, siente y recomienda ahí. Todo anónimo. Todo temporal.</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
            {[
              { emoji: '🏘️', place: 'Tu colonia', sub: 'La voz de tu barrio' },
              { emoji: '🍸', place: 'Bares', sub: 'Ricos los tragos de aquí' },
              { emoji: '🪩', place: 'Antros', sub: 'Buen DJ, buena vibra' },
              { emoji: '🎵', place: 'Conciertos', sub: 'La vibra en tiempo real' },
              { emoji: '🏫', place: 'Universidades', sub: 'Lo que se siente en el campus' },
              { emoji: '🍔', place: 'Restaurantes', sub: 'Opiniones honestas' },
              { emoji: '🏖️', place: 'Pueblos mágicos', sub: 'Tips de quien ya estuvo ahí' },
              { emoji: '🏟️', place: 'El estadio', sub: 'Pasión sin filtro' },
              { emoji: '☕', place: 'Cafeterías', sub: 'Pensamientos con café' },
              { emoji: '🌳', place: 'El parque', sub: 'Pensamientos al aire libre' },
              { emoji: '🚇', place: 'El metro', sub: 'Historias en movimiento' },
              { emoji: '🎭', place: 'Festivales', sub: 'La fiesta por dentro' },
              { emoji: '🏥', place: 'Salas de espera', sub: 'Desahogos reales' },
              { emoji: '✈️', place: 'Aeropuertos', sub: 'Pensamientos antes de volar' },
              { emoji: '🛒', place: 'Plazas', sub: 'Reviews de verdad' },
              { emoji: '🏋️', place: 'El gym', sub: 'Motivación anónima' },
              { emoji: '🎬', place: 'El cine', sub: '¿Valió la pena?' },
              { emoji: '🏠', place: 'Tu casa', sub: 'Lo que sientes a solas' },
              { emoji: '🎓', place: 'La prepa', sub: 'Lo que nadie dice en clase' },
              { emoji: '🌊', place: 'La playa', sub: 'Confesiones frente al mar' },
            ].map((item, i) => (
              <div key={i} style={{ padding: '20px 16px', borderRadius: '16px', backgroundColor: COLORS.card, border: '1px solid rgba(155,89,182,0.08)', transition: 'all 0.4s ease', transitionDelay: `${i * 0.03}s`, opacity: isVisible('donde') ? 1 : 0, transform: isVisible('donde') ? 'translateY(0) scale(1)' : 'translateY(15px) scale(0.95)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '6px' }}>
                <span style={{ fontSize: '32px' }}>{item.emoji}</span>
                <span style={{ fontSize: '14px', fontWeight: '700', color: COLORS.white }}>{item.place}</span>
                <span style={{ fontSize: '11px', color: COLORS.gray }}>{item.sub}</span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '48px', padding: '24px 32px', borderRadius: '20px', border: `1px solid ${COLORS.orange}30`, background: `linear-gradient(135deg, rgba(255,107,53,0.05), rgba(155,89,182,0.05))` }}>
            <p style={{ fontSize: '17px', color: COLORS.grayLight, lineHeight: 1.7, margin: 0 }}>
              🔥 Imagínate llegar a un lugar nuevo que no conoces, abrir Fire Notes, y leer lo que la gente ha dejado flotando en las últimas 24 horas. <strong style={{ color: COLORS.orange }}>Recomendaciones, confesiones, lo que sienten en un concierto, lo que piensan de un lugar.</strong> Todo anónimo, todo temporal, todo genuino.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '100px 24px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(255,107,53,0.08) 0%, transparent 60%)', pointerEvents: 'none' }} />
        <div id="cta" data-animate style={{ position: 'relative', zIndex: 1, opacity: isVisible('cta') ? 1 : 0, transform: isVisible('cta') ? 'translateY(0)' : 'translateY(30px)', transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)' }}>
          <span style={{ fontSize: '64px', display: 'block', marginBottom: '24px' }}>🔥</span>
          <h2 style={{ fontSize: 'clamp(28px, 6vw, 44px)', fontWeight: '800', lineHeight: 1.2, marginBottom: '16px' }}>
            ¿Qué se dice cerca de ti<br /><span style={{ color: COLORS.orange }}>en este momento?</span>
          </h2>
          <p style={{ fontSize: '17px', color: COLORS.grayLight, marginBottom: '40px', maxWidth: '480px', margin: '0 auto 40px', lineHeight: 1.7 }}>
            Abre Fire Notes y descúbrelo. Sin registro, sin datos, 100% anónimo. Suelta lo que piensas y deja tu marca invisible.
          </p>
          <a href="/app" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '18px 48px', borderRadius: '28px', background: `linear-gradient(135deg, ${COLORS.orange}, ${COLORS.purple})`, color: COLORS.white, fontWeight: '700', fontSize: '20px', textDecoration: 'none', boxShadow: '0 8px 40px rgba(155,89,182,0.5)' }}>
            🔥 Entrar ahora
          </a>
          <p style={{ fontSize: '13px', color: COLORS.gray, marginTop: '16px' }}>Funciona en cualquier navegador. Nada que instalar.</p>
        </div>
      </section>

      {/* PRIVACIDAD */}
      <section id="privacidad" data-animate style={{ padding: '100px 24px', backgroundColor: COLORS.bgAlt, opacity: isVisible('privacidad') ? 1 : 0, transform: isVisible('privacidad') ? 'translateY(0)' : 'translateY(40px)', transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={sectionTitleStyle}>Privacidad y Términos</h2>
          <p style={{ ...sectionSubStyle, marginBottom: '40px' }}>Tu privacidad es nuestra prioridad.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {[
              { title: '¿Qué guardamos?', content: 'Un identificador anónimo de tu dispositivo, la ubicación aproximada de tus notas y tu dirección IP (solo para prevenir abuso). Nada más.' },
              { title: '¿Qué NO guardamos?', content: 'Tu nombre, email, teléfono, fotos, contactos ni ningún dato personal identificable. No tienes cuenta, no tienes perfil.' },
              { title: '¿Cuánto tiempo se guardan los datos?', content: 'Las notas desaparecen del feed a las 24 horas. Los registros técnicos se retienen máximo 30 días y después se eliminan permanentemente.' },
              { title: '¿Cooperan con autoridades?', content: 'Eres anónimo pero NO invisible. Ante un requerimiento legal válido, proporcionamos los identificadores anónimos, IPs y contenido relacionado.' },
              { title: '¿Qué está prohibido?', content: 'Amenazas con nombres propios, contenido sexual de menores, incitación a la violencia, venta de drogas/armas. La moderación con IA filtra automáticamente. 5 reportes = nota eliminada.' },
              { title: '¿Qué SÍ puedes hacer?', content: 'Expresarte libremente. Quejas, confesiones, recomendaciones, opiniones, groserías incluidas. Fire Notes es un espacio de expresión genuina.' },
            ].map((item, i) => (
              <div key={i} style={{ padding: '24px', borderRadius: '16px', backgroundColor: COLORS.card, border: '1px solid rgba(155,89,182,0.08)' }}>
                <h3 style={{ fontSize: '17px', fontWeight: '700', color: COLORS.gold, marginBottom: '8px' }}>{item.title}</h3>
                <p style={{ fontSize: '15px', lineHeight: 1.7, color: COLORS.grayLight, margin: 0 }}>{item.content}</p>
              </div>
            ))}
          </div>
          <p style={{ textAlign: 'center', fontSize: '13px', color: COLORS.gray, marginTop: '32px', fontStyle: 'italic' }}>Última actualización: Junio 2026 · Contacto: team@firenotesapp.com</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ padding: '60px 24px 40px', textAlign: 'center', borderTop: `1px solid ${COLORS.card}` }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '20px' }}>
            <span style={{ fontSize: '24px' }}>🔥</span>
            <span style={{ fontSize: '18px', fontWeight: '700', color: COLORS.orange }}>FIRE</span>
            <span style={{ fontSize: '18px', fontWeight: '700' }}>NOTES</span>
          </div>
          <p style={{ fontSize: '14px', color: COLORS.gray, lineHeight: 1.6, marginBottom: '24px' }}>Pensamientos anónimos cerca de ti. Sin cara, sin filtro, solo tus palabras.</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '32px' }}>
            {[
              { label: 'TikTok', url: 'https://tiktok.com/@firenotesapp' },
              { label: 'Instagram', url: 'https://instagram.com/firenotesapp' },
              { label: 'X', url: 'https://x.com/firenotesapp' },
            ].map((s) => (
              <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer" style={{ padding: '10px 20px', borderRadius: '24px', backgroundColor: COLORS.card, color: COLORS.grayLight, textDecoration: 'none', fontSize: '14px', fontWeight: '500', border: '1px solid rgba(155,89,182,0.1)' }}>{s.label}</a>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginBottom: '24px' }}>
            <a onClick={() => scrollTo('privacidad')} style={{ fontSize: '13px', color: COLORS.gray, cursor: 'pointer', textDecoration: 'underline' }}>Política de Privacidad</a>
            <a href="/app" style={{ fontSize: '13px', color: COLORS.gray, textDecoration: 'underline' }}>Abrir App</a>
          </div>
          <p style={{ fontSize: '12px', color: COLORS.grayLight, opacity: 0.4 }}>© {new Date().getFullYear()} Fire Notes. Hecho en México 🇲🇽</p>
        </div>
      </footer>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,700;0,9..40,800;1,9..40,400&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif; background: ${COLORS.bg}; -webkit-font-smoothing: antialiased; }
        @keyframes heroLogo { from { opacity: 0; transform: scale(0.8) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes heroText { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes bounce { 0%, 100% { transform: translateX(-50%) translateY(0); } 50% { transform: translateX(-50%) translateY(8px); } }
        @keyframes float0 { 0%, 100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-20px) rotate(10deg); } }
        @keyframes float1 { 0%, 100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-30px) rotate(-8deg); } }
        @keyframes float2 { 0%, 100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-15px) rotate(5deg); } }
        @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }

        /* ===== FUEGO 2.0 (landing) ===== */
        @keyframes infernoL {
          0%, 100% { box-shadow: 0 0 24px rgba(255,69,0,0.55), 0 0 48px rgba(255,69,0,0.3), 0 8px 40px rgba(0,0,0,0.4); transform: rotate(-1deg) scale(1); }
          50%      { box-shadow: 0 0 38px rgba(255,69,0,0.85), 0 0 72px rgba(255,80,0,0.45), 0 8px 40px rgba(0,0,0,0.4); transform: rotate(-1deg) scale(1.012); }
        }
        @keyframes dyingL {
          0%, 100% { box-shadow: 0 0 18px rgba(120,40,10,0.5), 0 8px 40px rgba(0,0,0,0.5); }
          50%      { box-shadow: 0 0 28px rgba(160,60,15,0.65), 0 8px 40px rgba(0,0,0,0.5); }
        }
        @keyframes jewelL {
          0%, 100% { box-shadow: 0 0 20px rgba(255,215,0,0.5), 0 0 42px rgba(255,215,0,0.22), 0 8px 40px rgba(0,0,0,0.5); }
          50%      { box-shadow: 0 0 30px rgba(255,215,0,0.75), 0 0 64px rgba(255,215,0,0.35), 0 8px 40px rgba(0,0,0,0.5); }
        }
        @keyframes flameDanceL {
          0%   { transform: scaleY(0.85) translateX(0); opacity: .55; }
          50%  { transform: scaleY(1.12) translateX(-1px); opacity: .9; }
          100% { transform: scaleY(0.92) translateX(1px); opacity: .65; }
        }
        @keyframes smokeRiseL {
          0%   { transform: translateY(0) scale(1); opacity: 0; }
          25%  { opacity: .3; }
          100% { transform: translateY(-32px) scale(1.6); opacity: 0; }
        }
        @keyframes crownShineL {
          0%, 100% { filter: drop-shadow(0 0 4px rgba(255,215,0,0.6)); }
          50%      { filter: drop-shadow(0 0 10px rgba(255,215,0,0.95)); }
        }
        .fnFlames {
          clip-path: polygon(0 100%, 6% 55%, 13% 90%, 22% 40%, 31% 85%, 40% 50%, 50% 80%, 60% 45%, 70% 85%, 80% 48%, 89% 88%, 96% 58%, 100% 100%);
          transform-origin: bottom center;
          animation: flameDanceL 0.5s ease-in-out infinite alternate;
          border-radius: 0 0 12px 12px;
        }
        .fnSmoke {
          position: absolute; bottom: 40px; width: 9px; height: 9px; border-radius: 50%;
          background: rgba(170,170,170,0.45); filter: blur(3px); pointer-events: none; z-index: 4;
          animation: smokeRiseL 2.6s ease-out infinite;
        }
        .fnCrownL { animation: crownShineL 2s ease-in-out infinite; }

        @media (max-width: 768px) { .desktop-nav { display: none !important; } .mobile-menu-btn { display: block !important; } }
        @media (min-width: 769px) { .mobile-menu { display: none !important; } }
        ::selection { background: rgba(255, 107, 53, 0.3); color: white; }
      `}</style>
    </div>
  );
}

const sectionTitleStyle = { fontSize: 'clamp(28px, 5vw, 40px)', fontWeight: '800', textAlign: 'center', marginBottom: '12px', color: '#FFFFFF' };
const sectionSubStyle = { fontSize: '16px', color: '#8892B0', textAlign: 'center', maxWidth: '500px', margin: '0 auto' };
