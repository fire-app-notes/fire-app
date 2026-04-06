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
const RADIO_KM = 1;
const MAX_NOTAS_GRATIS = 3;
const MAX_VIDEOS_DIA = 3;

// ============================================================
// DEVICE FINGERPRINT
// ============================================================
function generateFingerprint() {
  try {
    const components = [
      screen.width, screen.height, screen.colorDepth,
      navigator.language, navigator.languages?.join(','),
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      navigator.platform, navigator.hardwareConcurrency,
      navigator.maxTouchPoints, getCanvasFingerprint(),
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
    canvas.width = 200; canvas.height = 50;
    ctx.textBaseline = 'top'; ctx.font = '14px Arial';
    ctx.fillStyle = '#f60'; ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069'; ctx.fillText('FIRE🔥test', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)'; ctx.fillText('FIRE🔥test', 4, 17);
    return canvas.toDataURL().slice(-50);
  } catch (e) { return 'no-canvas'; }
}

// ============================================================
// DEVICE ID
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
    try { const val = source(); if (val) { id = val; break; } } catch (e) {}
  }
  if (!id) { id = 'dev_' + crypto.randomUUID(); }
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
function calcularDistanciaKm(lat1, lng1, lat2, lng2) {
  if (!lat1 || !lng1 || !lat2 || !lng2) return 999;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
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

function tiempoRestante(expiresAt) {
  const diffMs = new Date(expiresAt).getTime() - Date.now();
  if (diffMs <= 0) return 'expirando...';
  const diffHr = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMin = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  if (diffHr > 0) return `${diffHr}h ${diffMin}m`;
  return `${diffMin}m`;
}

function calcularQuemado(dateString) {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const horasVivida = diffMs / (1000 * 60 * 60);
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
  const [pantalla, setPantalla] = useState('feed'); // 'feed', 'escribir', 'misnotas'
  const [notas, setNotas] = useState([]);
  const [misNotas, setMisNotas] = useState([]); // NUEVO: Mis notas
  const [texto, setTexto] = useState('');
  const [ubicacion, setUbicacion] = useState(null);
  const [ubicacionStatus, setUbicacionStatus] = useState('obteniendo');
  const [deviceId, setDeviceId] = useState('');
  const [fingerprint, setFingerprint] = useState('');
  const [cargando, setCargando] = useState(true);
  const [cargandoMisNotas, setCargandoMisNotas] = useState(false);
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
  const puedeEscribir = tieneIlimitado || pensamientosUsados < totalDisponible;
  
  // Total de 🔥 en mis notas
  const totalFires = misNotas.reduce((sum, nota) => sum + (nota.fires || 0), 0);

  const watchIdRef = useRef(null);
  
  // ============================================================
  // INIT
  // ============================================================
  useEffect(() => {
    const id = getDeviceId();
    const fp = generateFingerprint();
    setDeviceId(id);
    setFingerprint(fp);

    if (navigator.geolocation) {
      setUbicacionStatus('obteniendo');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUbicacion({ 
            lat: pos.coords.latitude, 
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy 
          });
          setUbicacionStatus('ok');
        },
        (err) => {
          if (err.code === 1) setUbicacionStatus('denegado');
          else setUbicacionStatus('error');
        },
        { enableHighAccuracy: true, timeout: 15000 }
      );
      
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          setUbicacion(prev => {
            if (prev && prev.lat && prev.lng) {
              const dist = calcularDistanciaKm(prev.lat, prev.lng, pos.coords.latitude, pos.coords.longitude) * 1000;
              if (dist < 50) return prev;
            }
            return { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
          });
          setUbicacionStatus('ok');
        },
        () => {},
        { enableHighAccuracy: true, timeout: 30000, maximumAge: 60000 }
      );
    } else {
      setUbicacionStatus('error');
    }

    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

  useEffect(() => {
    if (ubicacion && ubicacion.lat && deviceId && fingerprint) {
      cargarTodo();
    }
  }, [ubicacion, deviceId, fingerprint]);

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
      await Promise.all([cargarNotas(), cargarEstado(), cargarMisNotas()]);
    } catch (e) {
      console.error('Load error:', e);
    } finally {
      setCargando(false);
    }
  };

  const cargarNotas = async () => {
    if (!ubicacion || !ubicacion.lat || !ubicacion.lng) return;
    
    try {
      const { data, error: dbError } = await supabase
        .from('pensamientos')
        .select('id, texto, latitud, longitud, fires, created_at, expires_at')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(200);
      
      if (dbError) return;
      
      const notasFiltradas = [];
      (data || []).forEach(nota => {
        if (!nota.latitud || !nota.longitud) return;
        const distancia = calcularDistanciaKm(ubicacion.lat, ubicacion.lng, nota.latitud, nota.longitud);
        if (distancia <= RADIO_KM) {
          notasFiltradas.push({
            ...nota, 
            distancia: distancia.toFixed(3),
            distanciaMetros: Math.round(distancia * 1000)
          });
        }
      });
      
      setNotas(notasFiltradas);
    } catch (e) {
      console.error('Error cargando notas:', e);
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

  // ============================================================
  // CARGAR MIS NOTAS - NUEVO
  // ============================================================
  const cargarMisNotas = async () => {
    if (!deviceId) return;
    
    setCargandoMisNotas(true);
    try {
      const { data, error: dbError } = await supabase
        .from('pensamientos')
        .select('id, texto, latitud, longitud, fires, created_at, expires_at, device_id')
        .eq('device_id', deviceId)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });
      
      if (dbError) {
        console.error('Error cargando mis notas:', dbError);
        return;
      }
      
      setMisNotas(data || []);
    } catch (e) {
      console.error('Error:', e);
    } finally {
      setCargandoMisNotas(false);
    }
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
      setError('Necesitamos tu ubicación para publicar.');
      return;
    }
    if (!puedeEscribir) { setMostrarModal(true); return; }
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

      if (err) { setError('Error de conexión: ' + err.message); setEnviando(false); return; }
      if (!data.ok) {
        setError(data.error);
        if (data.sin_notas) setMostrarModal(true);
        setEnviando(false);
        return;
      }

      setPensamientosUsados(data.usados);
      const nuevaNota = {...data.nota, distancia: '0.000', distanciaMetros: 0};
      setNotas((prev) => [nuevaNota, ...prev]);
      setMisNotas((prev) => [nuevaNota, ...prev]); // Agregar a mis notas también
      setTexto('');
      setMostrarExito(true);
      setTimeout(() => { setMostrarExito(false); setPantalla('feed'); }, 1500);
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

    setMisReacciones((prev) => {
      const next = new Set(prev);
      yaReaccione ? next.delete(notaId) : next.add(notaId);
      return next;
    });
    
    const updateFires = (notas) => notas.map((n) =>
      n.id === notaId ? { ...n, fires: n.fires + (yaReaccione ? -1 : 1) } : n
    );
    setNotas(updateFires);
    setMisNotas(updateFires);

    try {
      const { data } = await supabase.rpc('toggle_fire', {
        p_pensamiento_id: notaId,
        p_device_id: deviceId,
      });
      if (data && data.fires !== undefined) {
        const syncFires = (notas) => notas.map((n) => 
          n.id === notaId ? { ...n, fires: data.fires } : n
        );
        setNotas(syncFires);
        setMisNotas(syncFires);
      }
    } catch (e) {
      setMisReacciones((prev) => {
        const next = new Set(prev);
        yaReaccione ? next.add(notaId) : next.delete(notaId);
        return next;
      });
    }
  };

  // ============================================================
  // VER VIDEO / COMPRAR
  // ============================================================
  const verVideo = async () => {
    try {
      const { data, error: err } = await supabase.rpc('ver_video', {
        p_device_id: deviceId,
        p_fingerprint: fingerprint,
      });
      if (err) throw err;
      if (data.ok) { setVideosVistos(data.videos); setMostrarModal(false); }
      else setError(data.error);
    } catch (e) { setError('Error al procesar video.'); }
  };

  const comprar = async (tipo) => {
    try {
      const { error: err } = await supabase.from('compras').insert({
        device_id: deviceId, tipo: tipo,
        fecha: new Date().toISOString().split('T')[0],
      });
      if (!err) {
        if (tipo === 'ilimitado') setTieneIlimitado(true);
        else setExtrasComprados((prev) => prev + 3);
        setMostrarModal(false);
      }
    } catch (e) { setError('Error al procesar compra.'); }
  };

  // ============================================================
  // REPORTAR
  // ============================================================
  const reportarNota = async (notaId) => {
    console.log('🚨 Reportando nota:', notaId);
    try {
      const { data, error } = await supabase.rpc('reportar_nota', {
        p_pensamiento_id: notaId,
        p_device_id: deviceId,
        p_razon: 'contenido inapropiado',
      });
      
      console.log('📊 Respuesta reporte:', data, error);
      
      if (error) {
        console.error('❌ Error al reportar:', error.message);
        alert('Error al reportar. Intenta de nuevo.');
        return;
      }
      
      if (data?.ok) {
        // Cerrar modal
        setMostrarReporte(null);
        
        // Si la nota fue eliminada (5+ reportes), quitarla del feed
        if (data.eliminado || data.reportes >= 5) {
          setNotas((prev) => prev.filter((n) => n.id !== notaId));
          alert('Nota reportada y eliminada. Gracias por ayudar.');
        } else {
          alert('Nota reportada. Gracias por ayudar.');
        }
      } else if (data?.error) {
        alert(data.error);
        setMostrarReporte(null);
      }
    } catch (e) {
      console.error('❌ Error catch:', e);
      alert('Error al reportar. Intenta de nuevo.');
    }
  };

  // ============================================================
  // RENDER
  // ============================================================

  if (ubicacionStatus === 'denegado') {
    return (
      <div style={S.container}>
        <div style={S.ubicacionError}>
          <span style={{ fontSize: '64px', marginBottom: '20px' }}>📍</span>
          <h2 style={{ color: '#FFD700', marginBottom: '12px' }}>FIRE necesita tu ubicación</h2>
          <p style={{ color: '#AAA', marginBottom: '24px', lineHeight: '1.6' }}>
            Las notas solo son visibles a 1km de ti.<br/>Sin ubicación, no podemos mostrarte nada.
          </p>
          <button onClick={() => window.location.reload()} style={{...S.soltarBtn, maxWidth: '200px'}}>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* BOTÓN MIS NOTAS */}
          <button 
            onClick={() => { 
              if (pantalla === 'misnotas') {
                setPantalla('feed');
              } else {
                cargarMisNotas();
                setPantalla('misnotas');
              }
            }} 
            style={{
              ...S.misNotasBtn,
              backgroundColor: pantalla === 'misnotas' ? 'rgba(255,107,53,0.2)' : 'transparent',
            }}
          >
            <span>📝</span>
            {misNotas.length > 0 && (
              <span style={S.misNotasBadge}>{misNotas.length}</span>
            )}
          </button>
          {/* CONTADOR */}
          <div style={S.contadorWrap} onClick={() => setMostrarDebug(!mostrarDebug)}>
            {tieneIlimitado ? (
              <span style={S.contadorInfinito}>∞</span>
            ) : (
              <div style={S.contadorNotas}>
                {[...Array(MAX_NOTAS_GRATIS)].map((_, i) => {
                  const restantes = totalDisponible - pensamientosUsados;
                  const disponible = i < restantes;
                  return (
                    <span key={i} style={{
                      fontSize: '16px', opacity: disponible ? 1 : 0.2,
                      transition: 'all 0.4s ease',
                    }}>
                      {disponible ? '🔥' : '⚫'}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* DEBUG BAR */}
      {mostrarDebug && ubicacion && (
        <div style={S.debugBar}>
          📍 {ubicacion.lat.toFixed(5)}, {ubicacion.lng.toFixed(5)} | 
          ±{Math.round(ubicacion.accuracy || 0)}m | 
          📊 {notas.length} notas en {RADIO_KM}km
        </div>
      )}

      {/* ===== TAB BAR ===== */}
      <div style={S.tabBar}>
        <button 
          onClick={() => setPantalla('feed')} 
          style={{...S.tab, ...(pantalla === 'feed' ? S.tabActive : {})}}
        >
          🌍 Cerca de ti
        </button>
        <button 
          onClick={() => { cargarMisNotas(); setPantalla('misnotas'); }} 
          style={{...S.tab, ...(pantalla === 'misnotas' ? S.tabActive : {})}}
        >
          📝 Tus notas {misNotas.length > 0 && `(${misNotas.length})`}
        </button>
      </div>

      {/* ===== INDICADOR DE ZONA ===== */}
      {!cargando && pantalla === 'feed' && (
        <div style={S.zonaIndicador}>
          {notas.length === 0 ? (
            <span>❄️ Tu zona está fría - sé el primero</span>
          ) : notas.length < 5 ? (
            <span>🌡️ {notas.length} {notas.length === 1 ? 'nota' : 'notas'} cerca de ti</span>
          ) : (
            <span style={{ color: '#FF6B35' }}>🔥 ¡Zona activa! - {notas.length} notas</span>
          )}
        </div>
      )}

      {/* ===== STATS DE MIS NOTAS ===== */}
      {pantalla === 'misnotas' && !cargandoMisNotas && misNotas.length > 0 && (
        <div style={S.misNotasStats}>
          <div style={S.statItem}>
            <span style={S.statNumber}>{misNotas.length}</span>
            <span style={S.statLabel}>notas activas</span>
          </div>
          <div style={S.statDivider} />
          <div style={S.statItem}>
            <span style={S.statNumber}>{totalFires}</span>
            <span style={S.statLabel}>🔥 totales</span>
          </div>
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
                  <div key={nota.id} style={{
                    ...S.nota,
                    opacity: 1 - (quemado * 0.3),
                    boxShadow: estaArdiendo 
                      ? '2px 4px 12px rgba(0,0,0,0.4), 0 0 20px rgba(255,107,53,0.4)'
                      : '2px 4px 12px rgba(0,0,0,0.4)',
                  }}>
                    <div style={S.notaLines} />
                    <p style={S.notaTexto}>{nota.texto}</p>
                    <div style={S.notaFooter}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={S.notaTiempo}>{timeAgo(nota.created_at)}</span>
                        <span style={{ fontSize: '10px', color: '#AAA' }}>
                          ({nota.distanciaMetros || 0}m)
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button onClick={() => setMostrarReporte(nota.id)} style={S.reportBtn}>⚑</button>
                        <button onClick={() => hacerFire(nota.id)} style={{
                          ...S.fireBtn,
                          backgroundColor: tieneReaccion ? 'rgba(255,107,53,0.15)' : 'transparent',
                        }}>
                          🔥 <span style={{ marginLeft: '4px' }}>{nota.fires}</span>
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

      {/* ===== MIS NOTAS ===== */}
      {pantalla === 'misnotas' && (
        <main style={S.feed}>
          {cargandoMisNotas ? (
            <div style={S.empty}>
              <div style={S.spinner}></div>
              <p style={S.emptyText}>Cargando tus notas...</p>
            </div>
          ) : misNotas.length === 0 ? (
            <div style={S.empty}>
              <span style={{ fontSize: '48px', marginBottom: '8px' }}>📝</span>
              <p style={S.emptyText}>No tienes notas activas</p>
              <p style={S.emptySubtext}>Las notas desaparecen en 24 horas</p>
              <button 
                onClick={() => { setPantalla('escribir'); }}
                style={{...S.soltarBtn, maxWidth: '200px', marginTop: '16px'}}
              >
                Escribir nota
              </button>
            </div>
          ) : (
            <div style={S.notasGrid}>
              {misNotas.map((nota) => {
                const quemado = calcularQuemado(nota.created_at);
                const estaArdiendo = nota.fires >= 10;
                
                return (
                  <div key={nota.id} style={{
                    ...S.nota,
                    ...S.miNota,
                    opacity: 1 - (quemado * 0.2),
                  }}>
                    <div style={S.notaLines} />
                    {/* Badge de "Tu nota" */}
                    <div style={S.tuNotaBadge}>Tu nota</div>
                    <p style={S.notaTexto}>{nota.texto}</p>
                    <div style={S.notaFooter}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={S.notaTiempo}>{timeAgo(nota.created_at)}</span>
                        <span style={{ fontSize: '10px', color: '#E63946' }}>
                          ⏱ {tiempoRestante(nota.expires_at)} restante
                        </span>
                      </div>
                      <div style={{
                        ...S.fireCount,
                        backgroundColor: estaArdiendo ? 'rgba(255,107,53,0.2)' : 'rgba(0,0,0,0.05)',
                        border: estaArdiendo ? '2px solid #FF6B35' : '1px solid rgba(0,0,0,0.1)',
                      }}>
                        <span style={{ fontSize: estaArdiendo ? '24px' : '20px' }}>🔥</span>
                        <span style={{ 
                          fontSize: '18px', 
                          fontWeight: 'bold',
                          color: estaArdiendo ? '#FF6B35' : '#2D2A26',
                        }}>
                          {nota.fires}
                        </span>
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
              <span style={{ color: texto.length > 180 ? '#E63946' : '#8B7355' }}>{texto.length}</span>/200
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
      {(pantalla === 'feed' || pantalla === 'misnotas') && (
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

      {/* ===== TOASTS & MODALS ===== */}
      {mostrarExito && <div style={S.toast}>🔥 Pensamiento soltado</div>}

      {/* Modal: Sin notas */}
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
                  <p style={S.modalOptDesc}>+1 nota gratis ({3 - videosVistos} restantes)</p>
                </div>
              </button>
            )}

            <button onClick={() => comprar('extra3')} style={S.modalOpt}>
              <span style={S.modalOptIcon}>🔥</span>
              <div><strong>+3 pensamientos</strong><p style={S.modalOptDesc}>$9.99 MXN</p></div>
            </button>

            {!tieneIlimitado && (
              <button onClick={() => comprar('ilimitado')} style={S.modalOpt}>
                <span style={S.modalOptIcon}>∞</span>
                <div><strong>Ilimitado hoy</strong><p style={S.modalOptDesc}>$29.99 MXN</p></div>
              </button>
            )}

            <button onClick={() => setMostrarModal(false)} style={S.modalClose}>Cerrar</button>
          </div>
        </div>
      )}

      {/* Modal: Reportar */}
      {mostrarReporte && (
        <div style={S.overlay} onClick={() => setMostrarReporte(null)}>
          <div style={S.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={S.modalTitle}>⚑ Reportar nota</h2>
            <p style={S.modalSub}>¿Esta nota viola las reglas?</p>
            <button onClick={() => reportarNota(mostrarReporte)} style={S.reportConfirmBtn}>Sí, reportar</button>
            <button onClick={() => setMostrarReporte(null)} style={S.modalClose}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Modal: Info */}
      {mostrarInfo && (
        <div style={S.overlay} onClick={() => setMostrarInfo(false)}>
          <div style={S.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={S.modalTitle}>🔥 FIRE</h2>
            <p style={{ textAlign: 'center', color: '#888', fontStyle: 'italic', marginBottom: '16px' }}>
              Pensamientos anónimos a 1km
            </p>
            
            <div style={S.infoSection}>
              <h3 style={S.infoSectionTitle}>✅ Lo que SÍ puedes</h3>
              <p style={S.infoRule}>Decir lo que piensas sin filtro</p>
              <p style={S.infoRule}>Quejarte de lo que sea</p>
              <p style={S.infoRule}>Confesar algo (sin nombres)</p>
              <p style={S.infoRule}>Usar groserías normales</p>
            </div>

            <div style={S.infoSection}>
              <h3 style={{...S.infoSectionTitle, color: '#E63946'}}>❌ Lo que te BANEA</h3>
              <p style={S.infoRule}>Amenazar a alguien con nombre</p>
              <p style={S.infoRule}>Contenido de menores</p>
              <p style={S.infoRule}>Cosas ilegales en serio</p>
            </div>

            <div style={S.importantBox}>
              <p style={{ textAlign: 'center', fontWeight: 'bold', color: '#FFD700' }}>⚠ IMPORTANTE</p>
              <p style={{ textAlign: 'center', color: '#FFF' }}>Eres anónimo, pero NO invisible.</p>
              <p style={{ textAlign: 'center', fontSize: '12px', color: '#AAA' }}>
                Si haces algo ilegal, cooperamos con autoridades.
              </p>
            </div>

            <button 
              onClick={() => { setMostrarInfo(false); setMostrarTerminos(true); }}
              style={{ background: 'none', border: 'none', color: '#666', fontSize: '12px', textDecoration: 'underline', cursor: 'pointer', marginTop: '12px', width: '100%' }}
            >
              Términos y Privacidad
            </button>

            <button onClick={() => setMostrarInfo(false)} style={S.modalClose}>Cerrar</button>
          </div>
        </div>
      )}

      {/* Modal: Términos */}
      {mostrarTerminos && (
        <div style={S.overlay} onClick={() => setMostrarTerminos(false)}>
          <div style={{...S.modal, maxHeight: '80vh', overflowY: 'auto'}} onClick={(e) => e.stopPropagation()}>
            <h2 style={S.modalTitle}>Términos y Privacidad</h2>
            <div style={S.legalText}>
              <h3 style={S.legalTitle}>1. TÉRMINOS DE USO</h3>
              <p>FIRE es una plataforma de expresión anónima. No requiere registro. Cada nota es visible solo a 1km y desaparece en 24 horas.</p>
              <p><strong>Prohibido:</strong> Amenazas, contenido de menores, violencia, acoso, drogas/armas, actividades ilegales.</p>
              <p><strong>Consecuencias:</strong> 5+ reportes = nota eliminada. 3+ eliminaciones = suspensión. Actividad ilegal = cooperamos con autoridades.</p>
              
              <h3 style={{...S.legalTitle, marginTop: '16px'}}>2. PRIVACIDAD</h3>
              <p><strong>Recopilamos:</strong> ID anónimo, coordenadas aproximadas, IP (anti-abuso), huella del navegador.</p>
              <p><strong>NO recopilamos:</strong> nombre, email, teléfono, fotos.</p>
              <p><strong>Retención:</strong> Todo se borra en 24h. Logs de uso: 30 días máx.</p>
              <p><strong>Autoridades:</strong> Ante requerimiento legal válido, proporcionamos: IDs, IPs, timestamps, contenido relacionado.</p>
              <p style={{ marginTop: '12px', color: '#666', fontStyle: 'italic' }}>Última actualización: Abril 2026</p>
            </div>
            <button onClick={() => setMostrarTerminos(false)} style={S.modalClose}>Cerrar</button>
          </div>
        </div>
      )}
      
      <style jsx global>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateX(-50%) translateY(-10px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
        @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }
      `}</style>
    </div>
  );
}

// ============================================================
// STYLES
// ============================================================
const S = {
  container: {
    minHeight: '100dvh', backgroundColor: '#000', color: '#FFF',
    fontFamily: "'Georgia', serif", maxWidth: '480px', margin: '0 auto', position: 'relative',
  },
  ubicacionError: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', minHeight: '100dvh', padding: '24px', textAlign: 'center',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 16px', position: 'sticky', top: 0, zIndex: 100,
    backgroundColor: '#000', borderBottom: '1px solid #1a1a1a',
  },
  infoBtn: {
    width: '32px', height: '32px', borderRadius: '50%',
    border: '1px solid #333', background: 'transparent',
    color: '#888', fontSize: '14px', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  logoWrap: { display: 'flex', alignItems: 'center', gap: '6px' },
  logoText: {
    fontSize: '20px', fontWeight: 'bold',
    background: 'linear-gradient(135deg, #FF6B35, #E63946, #FFD700)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
    letterSpacing: '2px',
  },
  misNotasBtn: {
    width: '36px', height: '36px', borderRadius: '50%',
    border: '1px solid #333', background: 'transparent',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    position: 'relative', fontSize: '16px',
  },
  misNotasBadge: {
    position: 'absolute', top: '-4px', right: '-4px',
    backgroundColor: '#E63946', color: '#FFF',
    fontSize: '10px', fontWeight: 'bold',
    width: '16px', height: '16px', borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  contadorWrap: { display: 'flex', alignItems: 'center', cursor: 'pointer' },
  contadorNotas: { display: 'flex', alignItems: 'center', gap: '2px' },
  contadorInfinito: { fontSize: '20px', fontWeight: 'bold', color: '#FFD700' },
  debugBar: {
    backgroundColor: 'rgba(255,107,53,0.1)', borderBottom: '1px solid #333',
    padding: '4px 12px', fontSize: '9px', color: '#888', fontFamily: 'monospace', textAlign: 'center',
  },
  
  // TAB BAR
  tabBar: {
    display: 'flex', borderBottom: '1px solid #1a1a1a', backgroundColor: '#000',
  },
  tab: {
    flex: 1, padding: '12px', background: 'transparent', border: 'none',
    color: '#666', fontSize: '13px', cursor: 'pointer', fontFamily: "'Georgia', serif",
    borderBottom: '2px solid transparent', transition: 'all 0.2s',
  },
  tabActive: {
    color: '#FF6B35', borderBottomColor: '#FF6B35',
  },
  
  // STATS MIS NOTAS
  misNotasStats: {
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    padding: '16px', gap: '24px', backgroundColor: 'rgba(255,107,53,0.05)',
    borderBottom: '1px solid #1a1a1a',
  },
  statItem: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
  statNumber: { fontSize: '24px', fontWeight: 'bold', color: '#FFD700' },
  statLabel: { fontSize: '12px', color: '#888' },
  statDivider: { width: '1px', height: '32px', backgroundColor: '#333' },
  
  zonaIndicador: {
    textAlign: 'center', padding: '8px 16px', fontSize: '12px',
    color: '#777', fontStyle: 'italic', backgroundColor: 'rgba(255,255,255,0.02)',
    borderBottom: '1px solid #1a1a1a',
  },
  feed: { padding: '16px', paddingBottom: '100px', minHeight: 'calc(100dvh - 150px)' },
  empty: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', minHeight: '50vh', gap: '12px',
  },
  emptyText: { color: '#666', fontSize: '16px', fontStyle: 'italic', textAlign: 'center' },
  emptySubtext: { color: '#444', fontSize: '14px', textAlign: 'center' },
  spinner: {
    width: '32px', height: '32px',
    border: '3px solid #222', borderTop: '3px solid #FF6B35',
    borderRadius: '50%', animation: 'spin 1s linear infinite',
  },
  notasGrid: { display: 'flex', flexDirection: 'column', gap: '16px' },
  nota: {
    position: 'relative', backgroundColor: '#F5E6D3',
    borderRadius: '4px', padding: '16px',
    boxShadow: '2px 4px 12px rgba(0,0,0,0.4)', overflow: 'hidden',
  },
  miNota: {
    borderLeft: '4px solid #FF6B35',
  },
  tuNotaBadge: {
    position: 'absolute', top: '8px', right: '8px',
    backgroundColor: 'rgba(255,107,53,0.9)', color: '#FFF',
    fontSize: '10px', fontWeight: 'bold', padding: '2px 8px',
    borderRadius: '10px',
  },
  notaLines: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    background: 'repeating-linear-gradient(0deg, transparent, transparent 28px, rgba(0,0,0,0.03) 28px, rgba(0,0,0,0.03) 29px)',
    pointerEvents: 'none',
  },
  notaTexto: {
    color: '#2D2A26', fontSize: '15px', fontStyle: 'italic',
    lineHeight: '1.5', fontFamily: "'Georgia', serif",
    position: 'relative', zIndex: 1, margin: 0, wordBreak: 'break-word',
  },
  notaFooter: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginTop: '12px', position: 'relative', zIndex: 1,
  },
  notaTiempo: { fontSize: '11px', color: '#8B7355' },
  fireBtn: {
    background: 'transparent', border: 'none', fontSize: '14px',
    cursor: 'pointer', padding: '4px 8px', borderRadius: '12px',
    color: '#2D2A26', fontFamily: "'Georgia', serif",
    display: 'flex', alignItems: 'center',
  },
  fireCount: {
    display: 'flex', alignItems: 'center', gap: '6px',
    padding: '8px 12px', borderRadius: '12px',
  },
  reportBtn: {
    background: 'transparent', border: 'none', fontSize: '12px',
    cursor: 'pointer', padding: '4px', color: '#8B7355', opacity: 0.4,
  },
  escribir: {
    padding: '24px 20px', display: 'flex', flexDirection: 'column',
    gap: '20px', minHeight: 'calc(100dvh - 70px)',
  },
  papelEscribir: {
    position: 'relative', backgroundColor: '#F5E6D3',
    borderRadius: '4px', padding: '20px', minHeight: '180px',
    boxShadow: '2px 4px 12px rgba(0,0,0,0.4)',
  },
  textarea: {
    width: '100%', minHeight: '140px', background: 'transparent',
    border: 'none', outline: 'none', color: '#2D2A26',
    fontSize: '16px', fontStyle: 'italic', fontFamily: "'Georgia', serif",
    lineHeight: '28px', resize: 'none', position: 'relative', zIndex: 1,
  },
  charCount: {
    position: 'absolute', bottom: '8px', right: '12px',
    fontSize: '11px', color: '#8B7355', fontFamily: 'monospace', zIndex: 1,
  },
  soltarBtn: {
    width: '100%', padding: '14px', border: 'none', borderRadius: '12px',
    background: 'linear-gradient(135deg, #FF6B35, #E63946)',
    color: '#FFF', fontSize: '16px', fontWeight: 'bold',
    fontFamily: "'Georgia', serif", letterSpacing: '2px', cursor: 'pointer',
    boxShadow: '0 0 20px rgba(230,57,70,0.4)',
  },
  cancelBtn: {
    background: 'transparent', border: 'none', color: '#666',
    fontSize: '14px', cursor: 'pointer', fontFamily: "'Georgia', serif", padding: '8px',
  },
  errorText: { color: '#E63946', fontSize: '13px', textAlign: 'center', margin: 0 },
  fab: {
    position: 'fixed', bottom: '24px', right: '24px',
    width: '60px', height: '60px', borderRadius: '50%', border: 'none',
    background: 'linear-gradient(135deg, #FF6B35, #E63946)',
    fontSize: '24px', cursor: 'pointer',
    boxShadow: '0 4px 24px rgba(230,57,70,0.6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99,
  },
  toast: {
    position: 'fixed', top: '80px', left: '50%', transform: 'translateX(-50%)',
    backgroundColor: 'rgba(255,107,53,0.95)', color: '#FFF',
    padding: '12px 24px', borderRadius: '24px', fontSize: '14px',
    fontFamily: "'Georgia', serif", zIndex: 200,
    boxShadow: '0 4px 20px rgba(0,0,0,0.4)', animation: 'fadeIn 0.3s ease',
  },
  overlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 150, padding: '20px',
  },
  modal: {
    backgroundColor: '#111', borderRadius: '16px', padding: '24px',
    maxWidth: '360px', width: '100%', border: '1px solid #222',
  },
  modalTitle: {
    fontSize: '20px', fontWeight: 'bold', textAlign: 'center',
    color: '#FFD700', fontFamily: "'Georgia', serif", margin: '0 0 8px 0',
  },
  modalSub: { fontSize: '13px', color: '#888', textAlign: 'center', marginBottom: '16px' },
  modalOpt: {
    width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
    padding: '12px', borderRadius: '12px', border: '1px solid #333',
    background: '#1a1a1a', cursor: 'pointer', marginBottom: '10px',
    textAlign: 'left', color: '#FFF', fontFamily: "'Georgia', serif",
  },
  modalOptIcon: { fontSize: '24px', flexShrink: 0 },
  modalOptDesc: { fontSize: '12px', color: '#888', margin: '2px 0 0 0' },
  modalClose: {
    width: '100%', padding: '10px', borderRadius: '8px', border: 'none',
    background: 'transparent', color: '#666', fontSize: '14px',
    cursor: 'pointer', marginTop: '8px', fontFamily: "'Georgia', serif",
  },
  reportConfirmBtn: {
    width: '100%', padding: '12px', borderRadius: '12px', border: 'none',
    background: '#E63946', color: '#FFF', fontSize: '14px',
    fontWeight: 'bold', cursor: 'pointer', marginBottom: '8px',
  },
  infoSection: { marginTop: '12px' },
  infoSectionTitle: { fontSize: '13px', fontWeight: 'bold', color: '#4CAF50', marginBottom: '6px' },
  infoRule: {
    color: '#CCC', fontSize: '13px', margin: 0, padding: '4px 0',
    borderBottom: '1px solid #1a1a1a',
  },
  importantBox: {
    marginTop: '12px', padding: '12px', borderRadius: '8px',
    border: '2px solid #FFD700', backgroundColor: 'rgba(255,215,0,0.05)',
  },
  legalText: { marginTop: '12px', fontSize: '12px', color: '#AAA', lineHeight: '1.6' },
  legalTitle: { fontSize: '14px', color: '#FFD700', fontWeight: 'bold', marginBottom: '6px' },
};
