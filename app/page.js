'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

// ============================================================
// SUPABASE CLIENT
// ============================================================
const supabase = createClient(
  'https://xjzoabsuzbqxkriamqed.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhqem9hYnN1emJxeGtyaWFtcWVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNzYyNDcsImV4cCI6MjA5MDg1MjI0N30.gS2lG4W-f_4Vtsz7cYZK9PAX6pI8fdD0br7geqaae6E'
);

// ============================================================
// DEVICE FINGERPRINT
// ============================================================
// ¿Por qué esto? Si alguien borra localStorage, el device_id se pierde.
// El fingerprint usa características del navegador que NO se pueden borrar:
// tamaño de pantalla, zona horaria, idioma, canvas rendering, etc.
// Así aunque borren todo, los reconocemos.
// ============================================================

function generateFingerprint() {
  try {
    const components = [
      screen.width,
      screen.height,
      screen.colorDepth,
      navigator.language,
      navigator.languages?.join(','),
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      navigator.platform,
      navigator.hardwareConcurrency,
      navigator.maxTouchPoints,
      // Canvas fingerprint - cada dispositivo dibuja ligeramente diferente
      getCanvasFingerprint(),
    ];
    
    const raw = components.filter(Boolean).join('|');
    // Simple hash
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      const char = raw.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return 'fp_' + Math.abs(hash).toString(36);
  } catch (e) {
    return 'fp_unknown';
  }
}

function getCanvasFingerprint() {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 200;
    canvas.height = 50;
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('FIRE🔥test', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('FIRE🔥test', 4, 17);
    return canvas.toDataURL().slice(-50);
  } catch (e) {
    return 'no-canvas';
  }
}

// ============================================================
// DEVICE ID - Guardado en MÚLTIPLES lugares
// ============================================================
// Si borran uno, lo recuperamos de otro.
// localStorage, sessionStorage, cookie, indexedDB
// ============================================================

function getDeviceId() {
  if (typeof window === 'undefined') return 'server';
  
  // Intentar recuperar de múltiples fuentes
  const sources = [
    () => localStorage.getItem('fire_did'),
    () => sessionStorage.getItem('fire_did'),
    () => getCookie('fire_did'),
  ];
  
  let id = null;
  for (const source of sources) {
    try {
      const val = source();
      if (val) { id = val; break; }
    } catch (e) {}
  }
  
  // Si no hay en ningún lado, crear nuevo
  if (!id) {
    id = 'dev_' + crypto.randomUUID();
  }
  
  // Guardar en TODOS los lugares
  saveDeviceId(id);
  return id;
}

function saveDeviceId(id) {
  try { localStorage.setItem('fire_did', id); } catch (e) {}
  try { sessionStorage.setItem('fire_did', id); } catch (e) {}
  try { setCookie('fire_did', id, 365); } catch (e) {}
}

function setCookie(name, value, days) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${value};expires=${expires};path=/;SameSite=Strict`;
}

function getCookie(name) {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : null;
}

// ============================================================
// HELPERS
// ============================================================
function timeAgo(dateString) {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'ahora';
  if (diffMin < 60) return `hace ${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `hace ${diffHr}h`;
  return 'hace 1d';
}

function validarTexto(texto) {
  const regex = /^[a-zA-ZáéíóúüñÁÉÍÓÚÜÑàèìòùÀÈÌÒÙâêîôûÂÊÎÔÛäëïöüÄËÏÖÜçÇ\s.,;:!?¡¿'"()\-]+$/;
  return regex.test(texto) && texto.trim().length > 0 && texto.length <= 200;
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function FireApp() {
  // --- STATE ---
  const [pantalla, setPantalla] = useState('feed');
  const [notas, setNotas] = useState([]);
  const [texto, setTexto] = useState('');
  const [ubicacion, setUbicacion] = useState(null);
  const [deviceId, setDeviceId] = useState('');
  const [fingerprint, setFingerprint] = useState('');
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');


  // Daily usage
  const [pensamientosUsados, setPensamientosUsados] = useState(0);
  const [videosVistos, setVideosVistos] = useState(0);
  const [extrasComprados, setExtrasComprados] = useState(0);
  const [tieneIlimitado, setTieneIlimitado] = useState(false);

  // Modals
  const [mostrarModal, setMostrarModal] = useState(false);
  const [mostrarInfo, setMostrarInfo] = useState(false);
  const [mostrarExito, setMostrarExito] = useState(false);
  const [mostrarReporte, setMostrarReporte] = useState(null); // nota id
  const [mostrarTerminos, setMostrarTerminos] = useState(false);

  // Reactions
  const [misReacciones, setMisReacciones] = useState(new Set());

  // --- COMPUTED ---
  const totalDisponible = tieneIlimitado ? 999 : 3 + videosVistos + extrasComprados;
  const notasRestantes = tieneIlimitado ? '∞' : Math.max(0, totalDisponible - pensamientosUsados);
  const puedeEscribir = tieneIlimitado || pensamientosUsados < totalDisponible;

  // ============================================================
  // INIT
  // ============================================================
  useEffect(() => {
    const id = getDeviceId();
    const fp = generateFingerprint();
    setDeviceId(id);
    setFingerprint(fp);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUbicacion({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setUbicacion({ lat: 19.4326, lng: -99.1332 }),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setUbicacion({ lat: 19.4326, lng: -99.1332 });
    }
  }, []);

  useEffect(() => {
    if (ubicacion && deviceId && fingerprint) {
      cargarTodo();
    }
  }, [ubicacion, deviceId, fingerprint]);

  // Auto-refresh every 30s
  useEffect(() => {
    if (!ubicacion || !deviceId) return;
    const interval = setInterval(cargarNotas, 30000);
    return () => clearInterval(interval);
  }, [ubicacion, deviceId]);

  // ============================================================
  // LOAD DATA
  // ============================================================
  const cargarTodo = async () => {
    setCargando(true);
    try {
      await Promise.all([cargarNotas(), cargarEstado()]);
    } catch (e) {
      console.error('Load error:', e);
    } finally {
      setCargando(false);
    }
  };

  const cargarNotas = async () => {
    try {
      const { data, error: err } = await supabase.rpc('buscar_cercanos', {
        lat: ubicacion.lat,
        lng: ubicacion.lng,
        radio_km: 1,
      });
      if (err) throw err;
      setNotas(data || []);
    } catch (e) {
      console.error('Fetch notes error:', e);
      // Fallback directo (solo funciona si RLS permite SELECT)
      try {
        const { data } = await supabase
          .from('pensamientos')
          .select('id, texto, latitud, longitud, fires, created_at, expires_at')
          .gt('expires_at', new Date().toISOString())
          .eq('oculto', false)
          .order('created_at', { ascending: false })
          .limit(50);
        setNotas(data || []);
      } catch (e2) {
        console.error('Fallback failed:', e2);
      }
    }

    // Load reactions
    try {
      const { data: reacciones } = await supabase
        .from('reacciones')
        .select('pensamiento_id')
        .eq('device_id', deviceId);
      if (reacciones) {
        setMisReacciones(new Set(reacciones.map((r) => r.pensamiento_id)));
      }
    } catch (e) {}
  };

  const cargarEstado = async () => {
    try {
      const { data, error: err } = await supabase.rpc('obtener_estado', {
        p_device_id: deviceId,
        p_fingerprint: fingerprint,
      });
      if (err) throw err;
      if (data) {
        setPensamientosUsados(data.usados || 0);
        setVideosVistos(data.videos || 0);
        setTieneIlimitado(data.ilimitado || false);
        setExtrasComprados(data.extras || 0);
      }
    } catch (e) {
      console.error('Estado error:', e);
    }
  };

  // ============================================================
  // PUBLICAR - usa función del servidor (validación allá)
  // ============================================================
  const publicar = async () => {
    if (!puedeEscribir) {
      setMostrarModal(true);
      return;
    }
    if (!validarTexto(texto)) {
      setError('Solo letras y puntuación básica. Máximo 200 caracteres.');
      return;
    }

    setEnviando(true);
    setError('');

    try {
      const { data, error: err } = await supabase.rpc('publicar_pensamiento', {
        p_texto: texto.trim(),
        p_lat: ubicacion.lat,
        p_lng: ubicacion.lng,
        p_device_id: deviceId,
        p_fingerprint: fingerprint,
      });

      if (err) {
        setError('Error de conexión: ' + err.message);
        setEnviando(false);
        return;
      }

      if (!data.ok) {
        setError(data.error);
        if (data.sin_notas) setMostrarModal(true);
        setEnviando(false);
        return;
      }

      // Éxito
      setPensamientosUsados(data.usados);
      setNotas((prev) => [data.nota, ...prev]);
      setTexto('');
      setMostrarExito(true);
      setTimeout(() => {
        setMostrarExito(false);
        setPantalla('feed');
      }, 1500);
    } catch (e) {
      setError('Error inesperado. Intenta de nuevo.');
    } finally {
      setEnviando(false);
    }
  };

  // ============================================================
  // TOGGLE FIRE
  // ============================================================
  const hacerFire = async (notaId) => {
    const yaReaccione = misReacciones.has(notaId);

    // Optimistic UI
    setMisReacciones((prev) => {
      const next = new Set(prev);
      yaReaccione ? next.delete(notaId) : next.add(notaId);
      return next;
    });
    setNotas((prev) =>
      prev.map((n) =>
        n.id === notaId ? { ...n, fires: n.fires + (yaReaccione ? -1 : 1) } : n
      )
    );

    try {
      const { data } = await supabase.rpc('toggle_fire', {
        p_pensamiento_id: notaId,
        p_device_id: deviceId,
      });
      if (data && data.fires !== undefined) {
        setNotas((prev) =>
          prev.map((n) => (n.id === notaId ? { ...n, fires: data.fires } : n))
        );
      }
    } catch (e) {
      // Revert
      setMisReacciones((prev) => {
        const next = new Set(prev);
        yaReaccione ? next.add(notaId) : next.delete(notaId);
        return next;
      });
    }
  };

  // ============================================================
  // VER VIDEO
  // ============================================================
  const verVideo = async () => {
    try {
      // TODO: Integrar AdMob / Unity Ads aquí
      // Cuando integres ads reales, el video debe completarse
      // ANTES de llamar esta función.
      
      const { data, error: err } = await supabase.rpc('ver_video', {
        p_device_id: deviceId,
        p_fingerprint: fingerprint,
      });
      if (err) throw err;
      if (data.ok) {
        setVideosVistos(data.videos);
        setMostrarModal(false);
      } else {
        setError(data.error);
      }
    } catch (e) {
      setError('Error al procesar video.');
    }
  };

  // ============================================================
  // COMPRAR
  // ============================================================
  const comprar = async (tipo) => {
    // TODO: Integrar Stripe / RevenueCat aquí
    // La compra debe verificarse del lado del servidor ANTES de registrarla
    try {
      const { error: err } = await supabase.from('compras').insert({
        device_id: deviceId,
        tipo: tipo,
        fecha: new Date().toISOString().split('T')[0],
      });
      if (!err) {
        if (tipo === 'ilimitado') setTieneIlimitado(true);
        else setExtrasComprados((prev) => prev + 3);
        setMostrarModal(false);
      }
    } catch (e) {
      setError('Error al procesar compra.');
    }
  };

  // ============================================================
  // REPORTAR
  // ============================================================
  const reportarNota = async (notaId) => {
    try {
      const { data } = await supabase.rpc('reportar_nota', {
        p_pensamiento_id: notaId,
        p_device_id: deviceId,
        p_razon: 'contenido inapropiado',
      });
      if (data?.ok) {
        setMostrarReporte(null);
        // Si tiene 5+ reportes, remover del feed local
        if (data.reportes >= 10) {
          setNotas((prev) => prev.filter((n) => n.id !== notaId));
        }
      }
    } catch (e) {
      console.error('Report error:', e);
    }
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div style={S.container}>
      {/* ===== HEADER ===== */}
      <header style={S.header}>
        <button onClick={() => setMostrarInfo(true)} style={S.infoBtn}>?</button>
        <div style={S.logoWrap}>
          <span style={{ fontSize: '28px' }}>🔥</span>
          <span style={S.logoText}>FIRE</span>
        </div>
        <div style={S.contador}>{notasRestantes}</div>
      </header>

      {/* ===== FEED ===== */}
      {pantalla === 'feed' && (
        <main style={S.feed}>
          {cargando ? (
            <div style={S.empty}>
              <div style={S.spinner} />
              <p style={S.emptyText}>Buscando notas cerca...</p>
            </div>
          ) : notas.length === 0 ? (
            <div style={S.empty}>
              <span style={{ fontSize: '48px' }}>🔥</span>
              <p style={S.emptyText}>No hay notas cerca de ti.</p>
              <p style={S.emptySubtext}>Sé el primero en soltar un pensamiento.</p>
            </div>
          ) : (
            <div style={S.notasGrid}>
              {notas.map((nota, i) => (
                <div 
                  key={nota.id} 
                  style={{
                    ...S.nota,
                    transform: `rotate(${(i % 2 === 0 ? 1 : -1) * (0.5 + (i % 3) * 0.5)}deg)`,
                  }}
                >
                  <div style={S.notaLines} />
                  <p style={S.notaTexto}>{nota.texto}</p>
                  <div style={S.notaFooter}>
                    <span style={S.notaTiempo}>{timeAgo(nota.created_at)}</span>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button
                        onClick={() => setMostrarReporte(nota.id)}
                        style={S.reportBtn}
                        title="Reportar"
                      >
                        ⚑
                      </button>
                      <button
                        onClick={() => hacerFire(nota.id)}
                        style={{
                          ...S.fireBtn,
                          opacity: misReacciones.has(nota.id) ? 1 : 0.5,
                          transform: misReacciones.has(nota.id) ? 'scale(1.1)' : 'scale(1)',
                        }}
                      >
                        🔥 {nota.fires || 0}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      )}

      {/* ===== ESCRIBIR ===== */}
      {pantalla === 'escribir' && (
        <main style={S.escribir}>
          <div style={S.papelEscribir}>
            <div style={S.notaLines} />
            <textarea
              value={texto}
              onChange={(e) => e.target.value.length <= 200 && setTexto(e.target.value)}
              placeholder="Suelta tu pensamiento..."
              style={S.textarea}
              autoFocus
              maxLength={200}
            />
            <div style={S.charCount}>
              <span style={{ color: texto.length > 180 ? '#E63946' : '#8B7355' }}>
                {texto.length}
              </span>/200
            </div>
          </div>

          {error && <p style={S.errorText}>{error}</p>}

          <button
            onClick={publicar}
            disabled={enviando || !texto.trim()}
            style={{ ...S.soltarBtn, opacity: enviando || !texto.trim() ? 0.5 : 1 }}
          >
            {enviando ? 'Soltando...' : '🔥 SOLTAR'}
          </button>

          <button onClick={() => { setPantalla('feed'); setError(''); }} style={S.cancelBtn}>
            Cancelar
          </button>
        </main>
      )}

      {/* ===== FAB ===== */}
      {pantalla === 'feed' && (
        <button
          onClick={() => {
            if (!puedeEscribir) setMostrarModal(true);
            else { setError(''); setPantalla('escribir'); }
          }}
          style={S.fab}
        >
          ✏️
        </button>
      )}

      {/* ===== SUCCESS TOAST ===== */}
      {mostrarExito && <div style={S.toast}>🔥 Pensamiento soltado</div>}

      {/* ===== MODAL: SIN NOTAS ===== */}
      {mostrarModal && (
        <div style={S.overlay} onClick={() => setMostrarModal(false)}>
          <div style={S.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={S.modalTitle}>Se acabaron tus notas 🔥</h2>
            <p style={S.modalSub}>Consigue más para seguir soltando:</p>

            {videosVistos < 3 && (
              <button onClick={verVideo} style={S.modalOpt}>
                <span style={S.modalOptIcon}>🎬</span>
                <div>
                  <strong>Ver un video</strong>
                  <p style={S.modalOptDesc}>+1 nota gratis ({3 - videosVistos} restantes hoy)</p>
                </div>
              </button>
            )}

            <button onClick={() => comprar('extra3')} style={S.modalOpt}>
              <span style={S.modalOptIcon}>🔥</span>
              <div>
                <strong>+3 pensamientos</strong>
                <p style={S.modalOptDesc}>$9.99 MXN</p>
              </div>
            </button>

            {!tieneIlimitado && (
              <button onClick={() => comprar('ilimitado')} style={S.modalOpt}>
                <span style={S.modalOptIcon}>∞</span>
                <div>
                  <strong>Ilimitado hoy</strong>
                  <p style={S.modalOptDesc}>$29.99 MXN</p>
                </div>
              </button>
            )}

            <button onClick={() => setMostrarModal(false)} style={S.modalClose}>Cerrar</button>
          </div>
        </div>
      )}

      {/* ===== MODAL: REPORTAR ===== */}
      {mostrarReporte && (
        <div style={S.overlay} onClick={() => setMostrarReporte(null)}>
          <div style={S.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={S.modalTitle}>⚑ Reportar nota</h2>
            <p style={S.modalSub}>¿Esta nota viola las reglas?</p>
            
            <button onClick={() => reportarNota(mostrarReporte)} style={S.reportConfirmBtn}>
              Sí, reportar
            </button>
            <button onClick={() => setMostrarReporte(null)} style={S.modalClose}>
              Cancelar
            </button>
            
            <p style={{ fontSize: '12px', color: '#555', textAlign: 'center', marginTop: '12px' }}>
              Si muchas personas reportan una nota, se oculta.
              {'\n'}Nadie es baneado. Tu libertad está protegida.
            </p>
          </div>
        </div>
      )}

      {/* ===== MODAL: INFO / REGLAS ===== */}
      {mostrarInfo && (
        <div style={S.overlay} onClick={() => setMostrarInfo(false)}>
          <div style={S.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={S.modalTitle}>🔥 FIRE</h2>
            
            <div style={S.infoSection}>
              <h3 style={S.infoSectionTitle}>Lo que SÍ puedes hacer</h3>
              <p style={S.infoRule}>Decir lo que piensas sin filtro</p>
              <p style={S.infoRule}>Quejarte de lo que sea</p>
              <p style={S.infoRule}>Confesar algo (sin nombres)</p>
              <p style={S.infoRule}>Usar groserías normales</p>
              <p style={S.infoRule}>Dar tu opinión honesta</p>
            </div>

            <div style={S.infoSection}>
              <h3 style={{...S.infoSectionTitle, color: '#E63946'}}>Lo que te BANEA</h3>
              <p style={S.infoRule}>Amenazar a alguien con nombre</p>
              <p style={S.infoRule}>Contenido de menores de edad</p>
              <p style={S.infoRule}>Cosas ilegales en serio</p>
              <p style={S.infoRule}>Acosar a personas identificables</p>
            </div>

            <div style={S.importantBox}>
              <p style={{ fontWeight: 'bold', textAlign: 'center', marginBottom: '4px', color: '#FFD700' }}>
                ⚠ IMPORTANTE ⚠
              </p>
              <p style={{ textAlign: 'center', fontWeight: 'bold', color: '#FFF' }}>
                Eres anónimo, pero NO invisible.
              </p>
              <p style={{ textAlign: 'center', fontSize: '13px', color: '#AAA' }}>
                Si haces algo ilegal, cooperamos con las autoridades.
              </p>
            </div>

            <div style={{ marginTop: '16px', textAlign: 'center' }}>
              <button 
                onClick={() => { setMostrarInfo(false); setMostrarTerminos(true); }}
                style={{ background: 'none', border: 'none', color: '#666', fontSize: '12px', textDecoration: 'underline', cursor: 'pointer' }}
              >
                Términos de uso y Privacidad
              </button>
            </div>

            <button onClick={() => setMostrarInfo(false)} style={S.modalClose}>Cerrar</button>
          </div>
        </div>
      )}

      {/* ===== MODAL: TÉRMINOS Y PRIVACIDAD ===== */}
      {mostrarTerminos && (
        <div style={S.overlay} onClick={() => setMostrarTerminos(false)}>
          <div style={{...S.modal, maxHeight: '80vh', overflowY: 'auto'}} onClick={(e) => e.stopPropagation()}>
            <h2 style={S.modalTitle}>Términos y Privacidad</h2>
            
            <div style={S.legalText}>
              <h3 style={S.legalTitle}>Términos de Uso</h3>
              <p>Al usar FIRE aceptas estas condiciones:</p>
              <p>FIRE es una plataforma de expresión anónima. No requiere registro ni datos personales. Cada pensamiento publicado es visible solo para personas dentro de un radio de un kilómetro y desaparece automáticamente después de veinticuatro horas.</p>
              <p><strong>Contenido prohibido:</strong> Amenazas directas o indirectas contra personas identificables. Cualquier contenido sexual que involucre menores de edad. Incitación a la violencia. Acoso dirigido a personas identificables. Venta o promoción de sustancias ilegales o armas. Cualquier actividad ilegal.</p>
              <p><strong>Consecuencias:</strong> Las notas que reciban cinco o más reportes serán eliminadas automáticamente. Los dispositivos con tres o más notas eliminadas serán suspendidos temporalmente. En caso de actividad ilegal, nos reservamos el derecho de cooperar con las autoridades competentes proporcionando la información técnica disponible, que puede incluir identificadores de dispositivo, direcciones IP y marcas de tiempo.</p>
              <p><strong>Monetización:</strong> Tres pensamientos gratuitos por día. Posibilidad de obtener pensamientos adicionales mediante visualización de anuncios en video o compras dentro de la aplicación. Los precios están sujetos a cambios.</p>
              <p><strong>Exención de responsabilidad:</strong> FIRE no se hace responsable del contenido publicado por los usuarios. Nos reservamos el derecho de eliminar cualquier contenido y suspender el acceso a cualquier dispositivo sin previo aviso.</p>

              <h3 style={{...S.legalTitle, marginTop: '20px'}}>Aviso de Privacidad</h3>
              <p>En cumplimiento con la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP) de México:</p>
              <p><strong>Datos que recopilamos:</strong> Identificador anónimo del dispositivo (generado automáticamente, no vinculado a tu identidad). Coordenadas geográficas aproximadas (solo para determinar la ubicación de la nota). Dirección IP (para prevención de abuso). Huella digital del navegador (para prevención de abuso). No recopilamos: nombre, correo electrónico, número de teléfono, fotografías ni ningún dato personal identificable.</p>
              <p><strong>Uso de los datos:</strong> Mostrar notas cercanas a tu ubicación. Controlar el límite diario de publicaciones. Prevenir abuso y spam. Cumplir con requerimientos legales si aplica.</p>
              <p><strong>Retención:</strong> Los pensamientos y datos asociados se eliminan automáticamente después de veinticuatro horas. Los registros de uso diario se mantienen por un máximo de treinta días. Los registros de baneos se mantienen mientras la suspensión esté activa.</p>
              <p><strong>Derechos ARCO:</strong> Puedes ejercer tus derechos de Acceso, Rectificación, Cancelación y Oposición contactándonos. Dado que no recopilamos datos personales identificables, la mayoría de estos derechos se cumplen por diseño.</p>
              <p><strong>Contacto:</strong> Para ejercer tus derechos ARCO o cualquier consulta sobre privacidad, contáctanos en el correo electrónico disponible en nuestra página de la tienda de aplicaciones.</p>
            </div>

            <button onClick={() => setMostrarTerminos(false)} style={S.modalClose}>Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// STYLES
// ============================================================
const S = {
  container: {
    minHeight: '100dvh',
    backgroundColor: '#000',
    color: '#FFF',
    fontFamily: "'Georgia', serif",
    maxWidth: '480px',
    margin: '0 auto',
    position: 'relative',
  },
  
  // HEADER
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    backgroundColor: '#000',
    borderBottom: '1px solid #1a1a1a',
  },
  infoBtn: {
    width: '36px', height: '36px', borderRadius: '50%',
    border: '1px solid #333', background: 'transparent',
    color: '#888', fontSize: '16px', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: "'Georgia', serif",
  },
  logoWrap: { display: 'flex', alignItems: 'center', gap: '8px' },
  logoText: {
    fontSize: '24px', fontWeight: 'bold',
    background: 'linear-gradient(135deg, #FF6B35, #E63946, #FFD700)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
    letterSpacing: '3px',
  },
  contador: {
    fontSize: '20px', fontWeight: 'bold', color: '#FFD700',
    minWidth: '24px', textAlign: 'center',
  },

  // FEED
  feed: { padding: '16px', paddingBottom: '100px', minHeight: 'calc(100dvh - 70px)' },
  empty: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', minHeight: '60vh', gap: '12px',
  },
  emptyText: { color: '#666', fontSize: '16px', fontStyle: 'italic', textAlign: 'center' },
  emptySubtext: { color: '#444', fontSize: '14px', fontStyle: 'italic', textAlign: 'center' },
  spinner: {
    width: '32px', height: '32px',
    border: '3px solid #222', borderTop: '3px solid #FF6B35',
    borderRadius: '50%', animation: 'spin 1s linear infinite',
  },

  // NOTAS
  notasGrid: { display: 'flex', flexDirection: 'column', gap: '16px' },
  nota: {
    position: 'relative', backgroundColor: '#F5E6D3',
    borderRadius: '4px', padding: '20px',
    boxShadow: '2px 4px 12px rgba(0,0,0,0.4)', overflow: 'hidden',
  },
  notaLines: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    background: 'repeating-linear-gradient(0deg, transparent, transparent 28px, rgba(0,0,0,0.03) 28px, rgba(0,0,0,0.03) 29px)',
    pointerEvents: 'none',
  },
  notaTexto: {
    color: '#2D2A26', fontSize: '16px', fontStyle: 'italic',
    lineHeight: '1.6', fontFamily: "'Georgia', serif",
    position: 'relative', zIndex: 1, margin: 0, wordBreak: 'break-word',
  },
  notaFooter: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginTop: '12px', position: 'relative', zIndex: 1,
  },
  notaTiempo: { fontSize: '12px', color: '#8B7355' },
  fireBtn: {
    background: 'transparent', border: 'none', fontSize: '16px',
    cursor: 'pointer', padding: '4px 8px', borderRadius: '12px',
    color: '#2D2A26', fontFamily: "'Georgia', serif", transition: 'all 0.2s',
  },
  reportBtn: {
    background: 'transparent', border: 'none', fontSize: '14px',
    cursor: 'pointer', padding: '4px', color: '#8B7355',
    opacity: 0.4, transition: 'opacity 0.2s',
  },

  // ESCRIBIR
  escribir: {
    padding: '24px 20px', display: 'flex', flexDirection: 'column',
    gap: '20px', minHeight: 'calc(100dvh - 70px)',
  },
  papelEscribir: {
    position: 'relative', backgroundColor: '#F5E6D3',
    borderRadius: '4px', padding: '24px', minHeight: '200px',
    boxShadow: '2px 4px 12px rgba(0,0,0,0.4)',
  },
  textarea: {
    width: '100%', minHeight: '150px', background: 'transparent',
    border: 'none', outline: 'none', color: '#2D2A26',
    fontSize: '18px', fontStyle: 'italic', fontFamily: "'Georgia', serif",
    lineHeight: '29px', resize: 'none', position: 'relative', zIndex: 1,
  },
  charCount: {
    position: 'absolute', bottom: '8px', right: '12px',
    fontSize: '12px', color: '#8B7355', fontFamily: 'monospace', zIndex: 1,
  },
  soltarBtn: {
    width: '100%', padding: '16px', border: 'none', borderRadius: '12px',
    background: 'linear-gradient(135deg, #FF6B35, #E63946)',
    color: '#FFF', fontSize: '18px', fontWeight: 'bold',
    fontFamily: "'Georgia', serif", letterSpacing: '2px', cursor: 'pointer',
    boxShadow: '0 0 20px rgba(230,57,70,0.4)', transition: 'opacity 0.2s',
  },
  cancelBtn: {
    background: 'transparent', border: 'none', color: '#666',
    fontSize: '16px', cursor: 'pointer', fontFamily: "'Georgia', serif", padding: '8px',
  },
  errorText: { color: '#E63946', fontSize: '14px', textAlign: 'center', margin: 0 },

  // FAB
  fab: {
    position: 'fixed', bottom: '24px', right: '24px',
    width: '60px', height: '60px', borderRadius: '50%', border: 'none',
    background: 'linear-gradient(135deg, #FF6B35, #E63946)',
    fontSize: '24px', cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(230,57,70,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99,
  },
  toast: {
    position: 'fixed', top: '80px', left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: 'rgba(255,107,53,0.95)', color: '#FFF',
    padding: '12px 24px', borderRadius: '24px', fontSize: '16px',
    fontFamily: "'Georgia', serif", zIndex: 200,
    boxShadow: '0 4px 20px rgba(0,0,0,0.4)', animation: 'fadeIn 0.3s ease',
  },

  // OVERLAY & MODAL
  overlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 150, padding: '20px',
  },
  modal: {
    backgroundColor: '#111', borderRadius: '16px', padding: '28px',
    maxWidth: '380px', width: '100%', border: '1px solid #222',
  },
  modalTitle: {
    fontSize: '22px', fontWeight: 'bold', textAlign: 'center',
    color: '#FFD700', fontFamily: "'Georgia', serif", margin: '0 0 8px 0',
  },
  modalSub: {
    fontSize: '14px', color: '#888', textAlign: 'center',
    marginBottom: '20px', fontStyle: 'italic',
  },
  modalOpt: {
    width: '100%', display: 'flex', alignItems: 'center', gap: '16px',
    padding: '16px', borderRadius: '12px', border: '1px solid #333',
    background: '#1a1a1a', cursor: 'pointer', marginBottom: '12px',
    textAlign: 'left', color: '#FFF', fontFamily: "'Georgia', serif",
  },
  modalOptIcon: { fontSize: '28px', flexShrink: 0 },
  modalOptDesc: { fontSize: '13px', color: '#888', margin: '4px 0 0 0' },
  modalClose: {
    width: '100%', padding: '12px', borderRadius: '8px', border: 'none',
    background: 'transparent', color: '#666', fontSize: '16px',
    cursor: 'pointer', marginTop: '8px', fontFamily: "'Georgia', serif",
  },
  reportConfirmBtn: {
    width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
    background: '#E63946', color: '#FFF', fontSize: '16px',
    fontWeight: 'bold', cursor: 'pointer', marginBottom: '8px',
    fontFamily: "'Georgia', serif",
  },

  // INFO
  infoSection: { marginTop: '16px' },
  infoSectionTitle: {
    fontSize: '14px', fontWeight: 'bold', color: '#4CAF50',
    marginBottom: '8px', fontFamily: "'Georgia', serif",
  },
  infoRule: {
    color: '#CCC', fontSize: '14px', margin: 0, padding: '6px 0',
    borderBottom: '1px solid #1a1a1a', fontFamily: "'Georgia', serif",
  },
  importantBox: {
    marginTop: '16px', padding: '16px', borderRadius: '8px',
    border: '2px solid #FFD700', backgroundColor: 'rgba(255,215,0,0.05)',
  },

  // LEGAL
  legalText: {
    marginTop: '16px', fontSize: '13px', color: '#AAA',
    lineHeight: '1.7', fontFamily: "'Georgia', serif",
  },
  legalTitle: {
    fontSize: '16px', color: '#FFD700', fontWeight: 'bold', marginBottom: '8px',
  },

};



