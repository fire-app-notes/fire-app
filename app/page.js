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
// CONSTANTES DE LA APP
// ============================================================
const RADIO_KM = 1; // Radio fijo de 1 km - NO CAMBIAR
const MAX_NOTAS_GRATIS = 3;
const MAX_VIDEOS_DIA = 3;

// ============================================================
// DEVICE FINGERPRINT
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
      getCanvasFingerprint(),
    ];
    
    const raw = components.filter(Boolean).join('|');
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      const char = raw.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
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
function getDeviceId() {
  if (typeof window === 'undefined') return 'server';
  
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
  
  if (!id) {
    id = 'dev_' + crypto.randomUUID();
  }
  
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

// Calcular distancia entre dos puntos usando fórmula Haversine
function calcularDistanciaKm(lat1, lng1, lat2, lng2) {
  // Validar que todos los parámetros sean números válidos
  if (!lat1 || !lng1 || !lat2 || !lng2) {
    console.error('❌ Coordenadas inválidas:', { lat1, lng1, lat2, lng2 });
    return 999; // Retornar distancia muy grande para excluir
  }
  
  const R = 6371; // Radio de la Tierra en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distancia = R * c;
  
  return distancia;
}

function timeAgo(dateString) {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'ahora';
  if (diffMin < 60) return `hace ${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `hace ${diffHr}h`;
  return 'hace 1d';
}

// Calcular qué tan "quemada" está la nota (para efectos visuales)
function calcularQuemado(dateString) {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const horasVivida = diffMs / (1000 * 60 * 60);
  // De 0 a 1, donde 1 = muy quemada (cerca de 24h)
  return Math.min(horasVivida / 24, 1);
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
  const [ubicacionStatus, setUbicacionStatus] = useState('obteniendo'); // 'obteniendo', 'ok', 'error', 'denegado'
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
  const [mostrarReporte, setMostrarReporte] = useState(null);
  const [mostrarTerminos, setMostrarTerminos] = useState(false);
  const [mostrarDebug, setMostrarDebug] = useState(false);

  // Reactions
  const [misReacciones, setMisReacciones] = useState(new Set());

  // --- COMPUTED ---
  const totalDisponible = tieneIlimitado ? 999 : 3 + videosVistos + extrasComprados;
  const notasRestantes = tieneIlimitado ? '∞' : Math.max(0, totalDisponible - pensamientosUsados);
  const puedeEscribir = tieneIlimitado || pensamientosUsados < totalDisponible;

  // Ref para el watchId de geolocalización
  const watchIdRef = useRef(null);
  
  // ============================================================
  // INIT - UBICACIÓN EN TIEMPO REAL
  // ============================================================
  useEffect(() => {
    const id = getDeviceId();
    const fp = generateFingerprint();
    setDeviceId(id);
    setFingerprint(fp);

    if (navigator.geolocation) {
      setUbicacionStatus('obteniendo');
      
      // PRIMERO: Obtener ubicación rápida
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          console.log('📍 Ubicación inicial:', pos.coords.latitude, pos.coords.longitude);
          console.log('📍 Precisión:', pos.coords.accuracy, 'metros');
          setUbicacion({ 
            lat: pos.coords.latitude, 
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy 
          });
          setUbicacionStatus('ok');
        },
        (err) => {
          console.log('⚠️ Error ubicación:', err.code, err.message);
          if (err.code === 1) {
            // Usuario denegó permiso
            setUbicacionStatus('denegado');
          } else {
            setUbicacionStatus('error');
          }
          // NO usar ubicación por defecto - mostrar error al usuario
        },
        { enableHighAccuracy: true, timeout: 15000 }
      );
      
      // SEGUNDO: Monitorear cambios de ubicación EN TIEMPO REAL
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const newLat = pos.coords.latitude;
          const newLng = pos.coords.longitude;
          
          setUbicacion(prev => {
            // Solo actualizar si se movió más de 50 metros
            if (prev && prev.lat && prev.lng) {
              const distancia = calcularDistanciaKm(prev.lat, prev.lng, newLat, newLng) * 1000;
              if (distancia < 50) return prev;
              console.log(`📍 Ubicación actualizada! Movimiento: ${distancia.toFixed(0)}m`);
            }
            return { lat: newLat, lng: newLng, accuracy: pos.coords.accuracy };
          });
          setUbicacionStatus('ok');
        },
        (err) => console.log('⚠️ Error watchPosition:', err.message),
        { 
          enableHighAccuracy: true, 
          timeout: 30000,
          maximumAge: 60000
        }
      );
    } else {
      setUbicacionStatus('error');
    }

    // Cleanup
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (ubicacion && ubicacion.lat && ubicacion.lng && deviceId && fingerprint) {
      cargarTodo();
    }
  }, [ubicacion, deviceId, fingerprint]);

  // Auto-refresh every 30s
  useEffect(() => {
    if (!ubicacion || !ubicacion.lat || !deviceId) return;
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
    if (!ubicacion || !ubicacion.lat || !ubicacion.lng) {
      console.log('⚠️ No hay ubicación válida, no se cargan notas');
      return;
    }
    
    console.log(`\n🔍 ====== CARGANDO NOTAS ======`);
    console.log(`📍 Mi ubicación: (${ubicacion.lat.toFixed(6)}, ${ubicacion.lng.toFixed(6)})`);
    console.log(`🎯 Radio de búsqueda: ${RADIO_KM}km`);
    
    try {
      const { data, error: dbError } = await supabase
        .from('pensamientos')
        .select('id, texto, latitud, longitud, fires, created_at, expires_at')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(200);
      
      if (dbError) {
        console.error('❌ Error DB:', dbError.message);
        return;
      }
      
      console.log(`📊 Total notas en DB (no expiradas): ${data?.length || 0}`);
      
      // FILTRAR ESTRICTAMENTE POR DISTANCIA
      const notasFiltradas = [];
      const notasExcluidas = [];
      
      (data || []).forEach(nota => {
        // Verificar que la nota tenga coordenadas válidas
        if (!nota.latitud || !nota.longitud) {
          console.log(`   ⚠️ Nota sin coordenadas: "${nota.texto.substring(0,20)}..."`);
          return;
        }
        
        const distancia = calcularDistanciaKm(
          ubicacion.lat, 
          ubicacion.lng, 
          nota.latitud, 
          nota.longitud
        );
        
        // CRÍTICO: Solo incluir si está a EXACTAMENTE 1km o menos
        if (distancia <= RADIO_KM) {
          notasFiltradas.push({
            ...nota, 
            distancia: distancia.toFixed(3),
            distanciaMetros: Math.round(distancia * 1000)
          });
          console.log(`   ✅ INCLUIDA (${distancia.toFixed(3)}km): "${nota.texto.substring(0,30)}..."`);
        } else {
          notasExcluidas.push({
            texto: nota.texto.substring(0, 30),
            distancia: distancia.toFixed(3)
          });
        }
      });
      
      // Mostrar resumen de excluidas
      if (notasExcluidas.length > 0) {
        console.log(`\n❌ NOTAS EXCLUIDAS (> ${RADIO_KM}km):`);
        notasExcluidas.forEach(n => {
          console.log(`   - "${n.texto}..." a ${n.distancia}km`);
        });
      }
      
      console.log(`\n🎯 RESULTADO: ${notasFiltradas.length} notas dentro de ${RADIO_KM}km`);
      console.log(`============================\n`);
      
      setNotas(notasFiltradas);
      
    } catch (e) {
      console.error('❌ Error cargando notas:', e);
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
  // PUBLICAR
  // ============================================================
  const publicar = async () => {
    if (!ubicacion || !ubicacion.lat || !ubicacion.lng) {
      setError('Necesitamos tu ubicación para publicar. Permite el acceso en tu navegador.');
      return;
    }
    
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

    console.log(`📝 Publicando nota en: (${ubicacion.lat.toFixed(6)}, ${ubicacion.lng.toFixed(6)})`);

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

      // Éxito - agregar distancia 0 porque es nuestra propia nota
      setPensamientosUsados(data.usados);
      setNotas((prev) => [{...data.nota, distancia: '0.000', distanciaMetros: 0}, ...prev]);
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

  // Si no hay ubicación o fue denegada, mostrar pantalla de error
  if (ubicacionStatus === 'denegado') {
    return (
      <div style={S.container}>
        <div style={S.ubicacionError}>
          <span style={{ fontSize: '64px', marginBottom: '20px' }}>📍</span>
          <h2 style={{ color: '#FFD700', marginBottom: '12px' }}>FIRE necesita tu ubicación</h2>
          <p style={{ color: '#AAA', marginBottom: '24px', lineHeight: '1.6' }}>
            Las notas solo son visibles a 1km de ti.
            <br/>Sin ubicación, no podemos mostrarte nada.
          </p>
          <p style={{ color: '#888', fontSize: '14px', marginBottom: '20px' }}>
            Permite el acceso a ubicación en la configuración de tu navegador.
          </p>
          <button 
            onClick={() => window.location.reload()} 
            style={{...S.soltarBtn, maxWidth: '200px'}}
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={S.container}>
      {/* ===== HEADER ===== */}
      <header style={S.header}>
        <button onClick={() => setMostrarInfo(true)} style={S.infoBtn}>?</button>
        <div style={S.logoWrap}>
          <span style={{ fontSize: '28px' }}>🔥</span>
          <span style={S.logoText}>FIRE</span>
        </div>
        {/* CONTADOR VISUAL CON NOTITAS */}
        <div style={S.contadorWrap} onClick={() => setMostrarDebug(!mostrarDebug)}>
          {tieneIlimitado ? (
            <span style={S.contadorInfinito}>∞</span>
          ) : (
            <div style={S.contadorNotas}>
              {[...Array(MAX_NOTAS_GRATIS)].map((_, i) => {
                const restantes = totalDisponible - pensamientosUsados;
                const disponible = i < restantes;
                const esUltima = i === restantes - 1 && restantes > 0;
                return (
                  <span 
                    key={i} 
                    style={{
                      fontSize: '18px',
                      opacity: disponible ? 1 : 0.2,
                      transition: 'all 0.4s ease',
                      transform: disponible ? 'scale(1)' : 'scale(0.7)',
                      animation: esUltima ? 'pulse 1.5s infinite' : 'none',
                    }}
                  >
                    {disponible ? '📝' : '⬜'}
                  </span>
                );
              })}
              {/* Mostrar extras */}
              {(totalDisponible - pensamientosUsados) > MAX_NOTAS_GRATIS && (
                <span style={S.contadorExtra}>
                  +{(totalDisponible - pensamientosUsados) - MAX_NOTAS_GRATIS}
                </span>
              )}
            </div>
          )}
        </div>
      </header>

      {/* ===== DEBUG INFO (tap en contador para mostrar) ===== */}
      {mostrarDebug && ubicacion && (
        <div style={S.debugBar}>
          <span>📍 {ubicacion.lat.toFixed(5)}, {ubicacion.lng.toFixed(5)}</span>
          <span> | </span>
          <span>±{Math.round(ubicacion.accuracy || 0)}m</span>
          <span> | </span>
          <span>📊 {notas.length} notas en {RADIO_KM}km</span>
        </div>
      )}

      {/* ===== INDICADOR DE ZONA ===== */}
      {!cargando && pantalla === 'feed' && (
        <div style={S.zonaIndicador}>
          {ubicacionStatus === 'obteniendo' ? (
            <span>📍 Obteniendo ubicación...</span>
          ) : notas.length === 0 ? (
            <span>❄️ Tu zona está fría - sé el primero en escribir</span>
          ) : notas.length < 5 ? (
            <span>🌡️ {notas.length} {notas.length === 1 ? 'nota cerca de ti' : 'notas cerca de ti'}</span>
          ) : notas.length < 15 ? (
            <span>🔥 Tu zona está tibia - {notas.length} notas</span>
          ) : (
            <span style={{ color: '#FF6B35' }}>🔥🔥🔥 ¡Zona caliente! - {notas.length} notas</span>
          )}
        </div>
      )}

      {/* ===== FEED ===== */}
      {pantalla === 'feed' && (
        <main style={S.feed}>
          {cargando ? (
            <div style={S.empty}>
              <div style={S.spinner}></div>
              <p style={S.emptyText}>Buscando notas cerca de ti...</p>
            </div>
          ) : notas.length === 0 ? (
            <div style={S.empty}>
              <span style={{ fontSize: '48px', marginBottom: '8px' }}>🔥</span>
              <p style={S.emptyText}>No hay notas cerca de ti</p>
              <p style={S.emptySubtext}>Sé el primero en soltar un pensamiento</p>
            </div>
          ) : (
            <div style={S.notasGrid}>
              {notas.map((nota) => {
                const quemado = calcularQuemado(nota.created_at);
                const estaArdiendo = nota.fires >= 10;
                const tieneReaccion = misReacciones.has(nota.id);
                
                return (
                  <div 
                    key={nota.id} 
                    style={{
                      ...S.nota,
                      // Efecto de quemado según antigüedad
                      opacity: 1 - (quemado * 0.3),
                      // Borde brillante si está ardiendo
                      boxShadow: estaArdiendo 
                        ? '2px 4px 12px rgba(0,0,0,0.4), 0 0 20px rgba(255,107,53,0.4)'
                        : '2px 4px 12px rgba(0,0,0,0.4)',
                      border: estaArdiendo ? '2px solid rgba(255,107,53,0.5)' : 'none',
                    }}
                  >
                    {/* Líneas del papel */}
                    <div style={S.notaLines} />
                    
                    {/* Efecto de bordes quemados */}
                    {quemado > 0.7 && (
                      <div style={{
                        position: 'absolute',
                        top: 0, left: 0, right: 0, bottom: 0,
                        background: 'linear-gradient(135deg, transparent 85%, rgba(139,69,19,0.2) 100%)',
                        borderRadius: '4px',
                        pointerEvents: 'none',
                      }} />
                    )}
                    
                    {/* Texto */}
                    <p style={S.notaTexto}>{nota.texto}</p>
                    
                    {/* Footer */}
                    <div style={S.notaFooter}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={S.notaTiempo}>{timeAgo(nota.created_at)}</span>
                        {/* Mostrar distancia */}
                        <span style={{ fontSize: '10px', color: '#AAA' }}>
                          ({nota.distanciaMetros || 0}m)
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {/* Reportar */}
                        <button
                          onClick={() => setMostrarReporte(nota.id)}
                          style={S.reportBtn}
                        >
                          ⚑
                        </button>
                        {/* Fire */}
                        <button
                          onClick={() => hacerFire(nota.id)}
                          style={{
                            ...S.fireBtn,
                            transform: tieneReaccion ? 'scale(1.1)' : 'scale(1)',
                            backgroundColor: tieneReaccion ? 'rgba(255,107,53,0.1)' : 'transparent',
                          }}
                        >
                          <span style={{ 
                            display: 'inline-block',
                            animation: estaArdiendo ? 'flicker 0.5s infinite' : 'none',
                          }}>
                            🔥
                          </span>
                          <span style={{ marginLeft: '4px' }}>{nota.fires}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
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
          
          {/* Mostrar ubicación donde se publicará */}
          {ubicacion && (
            <p style={{ color: '#555', fontSize: '12px', textAlign: 'center', marginTop: '8px' }}>
              📍 Se publicará en tu ubicación actual
            </p>
          )}
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
            <p style={{ textAlign: 'center', color: '#888', fontStyle: 'italic', marginBottom: '16px' }}>
              Pensamientos anónimos que flotan a 1km
            </p>
            
            <div style={S.infoSection}>
              <h3 style={S.infoSectionTitle}>✅ Lo que SÍ puedes hacer</h3>
              <p style={S.infoRule}>Decir lo que piensas sin filtro</p>
              <p style={S.infoRule}>Quejarte de lo que sea</p>
              <p style={S.infoRule}>Confesar algo (sin nombres)</p>
              <p style={S.infoRule}>Usar groserías normales</p>
              <p style={S.infoRule}>Dar tu opinión honesta</p>
            </div>

            <div style={S.infoSection}>
              <h3 style={{...S.infoSectionTitle, color: '#E63946'}}>❌ Lo que te BANEA</h3>
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
              <h3 style={S.legalTitle}>1. TÉRMINOS DE USO</h3>
              <p>Al usar FIRE aceptas estas condiciones:</p>
              <p>FIRE es una plataforma de expresión anónima. No requiere registro ni datos personales. Cada pensamiento publicado es visible solo para personas dentro de un radio de un kilómetro y desaparece automáticamente después de veinticuatro horas.</p>
              
              <p><strong>1.1 Contenido prohibido:</strong></p>
              <p>• Amenazas directas o indirectas contra personas identificables</p>
              <p>• Cualquier contenido sexual que involucre menores de edad</p>
              <p>• Incitación a la violencia</p>
              <p>• Acoso dirigido a personas identificables</p>
              <p>• Venta o promoción de sustancias ilegales o armas</p>
              <p>• Cualquier actividad ilegal</p>
              
              <p><strong>1.2 Consecuencias:</strong></p>
              <p>• Las notas que reciban cinco o más reportes serán eliminadas automáticamente</p>
              <p>• Los dispositivos con tres o más notas eliminadas serán suspendidos temporalmente</p>
              <p>• En caso de actividad ilegal, nos reservamos el derecho de cooperar con las autoridades competentes proporcionando la información técnica disponible</p>
              
              <p><strong>1.3 Monetización:</strong></p>
              <p>• Tres pensamientos gratuitos por día</p>
              <p>• Posibilidad de obtener pensamientos adicionales mediante visualización de anuncios en video o compras dentro de la aplicación</p>
              <p>• Los precios están sujetos a cambios</p>
              
              <p><strong>1.4 Exención de responsabilidad:</strong></p>
              <p>FIRE no se hace responsable del contenido publicado por los usuarios. Nos reservamos el derecho de eliminar cualquier contenido y suspender el acceso a cualquier dispositivo sin previo aviso.</p>

              <h3 style={{...S.legalTitle, marginTop: '24px'}}>2. AVISO DE PRIVACIDAD</h3>
              <p>En cumplimiento con la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP) de México:</p>
              
              <p><strong>2.1 Datos que recopilamos:</strong></p>
              <p>• Identificador anónimo del dispositivo (generado automáticamente, no vinculado a tu identidad)</p>
              <p>• Coordenadas geográficas aproximadas (solo para determinar la ubicación de la nota)</p>
              <p>• Dirección IP (para prevención de abuso)</p>
              <p>• Huella digital del navegador (para prevención de abuso)</p>
              
              <p><strong>No recopilamos:</strong> nombre, correo electrónico, número de teléfono, fotografías ni ningún dato personal identificable.</p>
              
              <p><strong>2.2 Uso de los datos:</strong></p>
              <p>• Mostrar notas cercanas a tu ubicación</p>
              <p>• Controlar el límite diario de publicaciones</p>
              <p>• Prevenir abuso y spam</p>
              <p>• Cumplir con requerimientos legales si aplica</p>
              
              <p><strong>2.3 Retención:</strong></p>
              <p>• Los pensamientos y datos asociados se eliminan automáticamente después de veinticuatro horas</p>
              <p>• Los registros de uso diario se mantienen por un máximo de treinta días</p>
              <p>• Los registros de baneos se mantienen mientras la suspensión esté activa</p>
              
              <p><strong>2.4 Derechos ARCO:</strong></p>
              <p>Puedes ejercer tus derechos de Acceso, Rectificación, Cancelación y Oposición contactándonos. Dado que no recopilamos datos personales identificables, la mayoría de estos derechos se cumplen por diseño.</p>
              
              <p><strong>2.5 Cooperación con autoridades:</strong></p>
              <p>En caso de recibir un requerimiento legal válido (orden judicial, investigación criminal, etc.), podemos proporcionar a las autoridades competentes:</p>
              <p>• Identificadores de dispositivo</p>
              <p>• Direcciones IP</p>
              <p>• Marcas de tiempo</p>
              <p>• Contenido de las notas relacionadas</p>
              <p>• Cualquier información técnica que pueda ayudar en la investigación</p>
              
              <p><strong>2.6 Contacto:</strong></p>
              <p>Para ejercer tus derechos ARCO o cualquier consulta sobre privacidad, contáctanos en el correo electrónico disponible en nuestra página de la tienda de aplicaciones.</p>
              
              <p style={{ marginTop: '20px', fontStyle: 'italic', color: '#888' }}>
                Última actualización: Abril 2026
              </p>
            </div>

            <button onClick={() => setMostrarTerminos(false)} style={S.modalClose}>Cerrar</button>
          </div>
        </div>
      )}
      
      {/* ===== CSS ANIMATIONS ===== */}
      <style jsx global>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateX(-50%) translateY(-10px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.2); }
        }
        @keyframes flicker {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
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
  
  // UBICACIÓN ERROR
  ubicacionError: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100dvh',
    padding: '24px',
    textAlign: 'center',
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
  
  // CONTADOR VISUAL
  contadorWrap: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    minWidth: '70px', cursor: 'pointer',
  },
  contadorNotas: {
    display: 'flex', alignItems: 'center', gap: '2px',
  },
  contadorExtra: {
    fontSize: '12px', 
    color: '#FFD700', 
    marginLeft: '4px',
    fontWeight: 'bold',
    textShadow: '0 0 8px rgba(255,215,0,0.5)',
  },
  contadorInfinito: {
    fontSize: '24px', fontWeight: 'bold', color: '#FFD700',
    textShadow: '0 0 10px rgba(255, 215, 0, 0.5)',
  },
  
  // DEBUG BAR
  debugBar: {
    backgroundColor: 'rgba(255,107,53,0.1)',
    borderBottom: '1px solid #333',
    padding: '6px 12px',
    fontSize: '10px',
    color: '#888',
    fontFamily: 'monospace',
    textAlign: 'center',
  },
  
  // INDICADOR DE ZONA
  zonaIndicador: {
    textAlign: 'center',
    padding: '10px 16px',
    fontSize: '13px',
    color: '#777',
    fontStyle: 'italic',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderBottom: '1px solid #1a1a1a',
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
    transition: 'all 0.3s ease',
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
    width: '64px', height: '64px', borderRadius: '50%', border: 'none',
    background: 'linear-gradient(135deg, #FF6B35, #E63946)',
    fontSize: '26px', cursor: 'pointer',
    boxShadow: '0 4px 24px rgba(230,57,70,0.6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99,
    transition: 'transform 0.2s ease',
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
