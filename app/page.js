'use client';
import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

// ============================================================
// 🔥 FIRE NOTES - APP COMPLETA
// ============================================================

const supabase = createClient(
  'https://xjzoabsuzbqxkriamqed.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhqem9hYnN1emJxeGtyaWFtcWVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNzYyNDcsImV4cCI6MjA5MDg1MjI0N30.gS2lG4W-f_4Vtsz7cYZK9PAX6pI8fdD0br7geqaae6E'
);

const RADIO_KM = 1;
const MAX_NOTAS_GRATIS = 3;

// ============================================================
// SONIDO DE FUEGO (Web Audio API - sin archivos)
// ============================================================
function playFireSound() {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const duration = 0.15;
    const sampleRate = audioContext.sampleRate;
    const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < buffer.length; i++) {
      const decay = 1 - (i / buffer.length);
      data[i] = (Math.random() * 2 - 1) * decay * 0.3;
    }
    
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    
    const filter = audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1000;
    
    const gainNode = audioContext.createGain();
    gainNode.gain.value = 0.2;
    
    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioContext.destination);
    source.start();
  } catch (e) {}
}

function playWhooshSound() {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const duration = 0.3;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + duration);
    
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
  } catch (e) {}
}

// ============================================================
// VIBRACIÓN
// ============================================================
function vibrar(pattern = 50) {
  try {
    if (navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  } catch (e) {}
}

// ============================================================
// DEVICE FINGERPRINT & ID
// ============================================================
function generateFingerprint() {
  try {
    const components = [
      screen.width, screen.height, screen.colorDepth,
      navigator.language, navigator.languages?.join(','),
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      navigator.platform, navigator.hardwareConcurrency, navigator.maxTouchPoints,
    ];
    const raw = components.filter(Boolean).join('|');
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      hash = ((hash << 5) - hash) + raw.charCodeAt(i);
      hash = hash & hash;
    }
    return 'fp_' + Math.abs(hash).toString(36);
  } catch (e) {
    return 'fp_unknown';
  }
}

function getDeviceId() {
  if (typeof window === 'undefined') return 'server';
  let id = localStorage.getItem('fire_did') || sessionStorage.getItem('fire_did');
  if (!id) {
    id = 'dev_' + crypto.randomUUID();
    localStorage.setItem('fire_did', id);
    sessionStorage.setItem('fire_did', id);
  }
  return id;
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
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
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

function calcularQuemado(dateString) {
  const diffMs = Date.now() - new Date(dateString).getTime();
  return Math.min(diffMs / (1000 * 60 * 60 * 24), 1);
}

function validarTexto(texto) {
  const regex = /^[a-zA-ZáéíóúüñÁÉÍÓÚÜÑàèìòùÀÈÌÒÙâêîôûÂÊÎÔÛäëïöüÄËÏÖÜçÇ\s.,;:!?¡¿'"()\-]+$/;
  return regex.test(texto) && texto.trim().length > 0 && texto.length <= 200;
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function FireNotesApp() {
  const [tab, setTab] = useState('feed');
  const [pantalla, setPantalla] = useState('feed');
  const [notas, setNotas] = useState([]);
  const [misNotas, setMisNotas] = useState([]);
  const [texto, setTexto] = useState('');
  const [ubicacion, setUbicacion] = useState(null);
  const [ubicacionStatus, setUbicacionStatus] = useState('obteniendo');
  const [deviceId, setDeviceId] = useState('');
  const [fingerprint, setFingerprint] = useState('');
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  const [pensamientosUsados, setPensamientosUsados] = useState(0);
  const [videosVistos, setVideosVistos] = useState(0);
  const [extrasComprados, setExtrasComprados] = useState(0);
  const [tieneIlimitado, setTieneIlimitado] = useState(false);

  const [mostrarModal, setMostrarModal] = useState(false);
  const [mostrarInfo, setMostrarInfo] = useState(false);
  const [mostrarExito, setMostrarExito] = useState(false);
  const [mostrarReporte, setMostrarReporte] = useState(null);
  const [mostrarTerminos, setMostrarTerminos] = useState(false);
  const [mostrarOnboarding, setMostrarOnboarding] = useState(false);

  const [misReacciones, setMisReacciones] = useState(new Set());
  const [animandoNota, setAnimandoNota] = useState(false);

  const watchIdRef = useRef(null);

  const totalDisponible = tieneIlimitado ? 999 : 3 + videosVistos + extrasComprados;
  const puedeEscribir = tieneIlimitado || pensamientosUsados < totalDisponible;

  // ============================================================
  // INIT
  // ============================================================
  useEffect(() => {
    const id = getDeviceId();
    const fp = generateFingerprint();
    setDeviceId(id);
    setFingerprint(fp);

    const yaVioOnboarding = localStorage.getItem('fire_onboarding');
    if (!yaVioOnboarding) {
      setMostrarOnboarding(true);
      localStorage.setItem('fire_onboarding', 'true');
    }

    if (navigator.geolocation) {
      setUbicacionStatus('obteniendo');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUbicacion({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
          setUbicacionStatus('ok');
        },
        (err) => {
          setUbicacionStatus(err.code === 1 ? 'denegado' : 'error');
        },
        { enableHighAccuracy: true, timeout: 15000 }
      );

      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          setUbicacion(prev => {
            if (prev?.lat && calcularDistanciaKm(prev.lat, prev.lng, pos.coords.latitude, pos.coords.longitude) * 1000 < 50) return prev;
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

    return () => { if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current); };
  }, []);

  useEffect(() => {
    if (ubicacion?.lat && deviceId && fingerprint) cargarTodo();
  }, [ubicacion, deviceId, fingerprint]);

  useEffect(() => {
    if (!ubicacion?.lat || !deviceId) return;
    const interval = setInterval(cargarNotas, 30000);
    return () => clearInterval(interval);
  }, [ubicacion, deviceId]);

  // ============================================================
  // LOAD DATA
  // ============================================================
  const cargarTodo = async () => {
    setCargando(true);
    await Promise.all([cargarNotas(), cargarMisNotas(), cargarEstado()]);
    setCargando(false);
  };

  const cargarNotas = async () => {
    if (!ubicacion?.lat) return;
    try {
      const { data } = await supabase
        .from('pensamientos')
        .select('id, texto, latitud, longitud, fires, created_at, expires_at, device_id')
        .gt('expires_at', new Date().toISOString())
        .or('eliminado.is.null,eliminado.eq.false')
        .order('created_at', { ascending: false })
        .limit(200);

      const filtradas = (data || []).filter(n => {
        const dist = calcularDistanciaKm(ubicacion.lat, ubicacion.lng, n.latitud, n.longitud);
        return dist <= RADIO_KM;
      }).map(n => ({
        ...n,
        distanciaMetros: Math.round(calcularDistanciaKm(ubicacion.lat, ubicacion.lng, n.latitud, n.longitud) * 1000)
      }));

      setNotas(filtradas);
    } catch (e) {}

    try {
      const { data: reacciones } = await supabase.from('reacciones').select('pensamiento_id').eq('device_id', deviceId);
      if (reacciones) setMisReacciones(new Set(reacciones.map(r => r.pensamiento_id)));
    } catch (e) {}
  };

  const cargarMisNotas = async () => {
    if (!deviceId) return;
    try {
      const { data } = await supabase
        .from('pensamientos')
        .select('id, texto, latitud, longitud, fires, created_at, expires_at')
        .eq('device_id', deviceId)
        .gt('expires_at', new Date().toISOString())
        .or('eliminado.is.null,eliminado.eq.false')
        .order('created_at', { ascending: false });
      
      setMisNotas(data || []);
    } catch (e) {}
  };

  const cargarEstado = async () => {
    try {
      const { data } = await supabase.rpc('obtener_estado', { p_device_id: deviceId, p_fingerprint: fingerprint });
      if (data) {
        setPensamientosUsados(data.usados || 0);
        setVideosVistos(data.videos || 0);
        setTieneIlimitado(data.ilimitado || false);
        setExtrasComprados(data.extras || 0);
      }
    } catch (e) {}
  };

  // ============================================================
  // PUBLICAR
  // ============================================================
  const publicar = async () => {
    if (!ubicacion?.lat) {
      setError('Necesitamos tu ubicación para publicar.');
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

    try {
      const { data, error: err } = await supabase.rpc('publicar_pensamiento', {
        p_texto: texto.trim(),
        p_lat: ubicacion.lat,
        p_lng: ubicacion.lng,
        p_device_id: deviceId,
        p_fingerprint: fingerprint,
      });

      if (err || !data.ok) {
        setError(data?.error || 'Error de conexión');
        if (data?.sin_notas) setMostrarModal(true);
        setEnviando(false);
        return;
      }

      setAnimandoNota(true);
      playWhooshSound();
      vibrar(100);

      setPensamientosUsados(data.usados);
      setNotas(prev => [{ ...data.nota, distanciaMetros: 0 }, ...prev]);
      setMisNotas(prev => [data.nota, ...prev]);
      setTexto('');
      
      setTimeout(() => {
        setAnimandoNota(false);
        setMostrarExito(true);
        setTimeout(() => {
          setMostrarExito(false);
          setPantalla('feed');
        }, 1200);
      }, 500);

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

    playFireSound();
    vibrar(30);

    setMisReacciones(prev => {
      const next = new Set(prev);
      yaReaccione ? next.delete(notaId) : next.add(notaId);
      return next;
    });
    
    const updateNotas = (prev) => prev.map(n => n.id === notaId ? { ...n, fires: n.fires + (yaReaccione ? -1 : 1) } : n);
    setNotas(updateNotas);
    setMisNotas(updateNotas);

    try {
      const { data } = await supabase.rpc('toggle_fire', { p_pensamiento_id: notaId, p_device_id: deviceId });
      if (data?.fires !== undefined) {
        const updateFires = (prev) => prev.map(n => n.id === notaId ? { ...n, fires: data.fires } : n);
        setNotas(updateFires);
        setMisNotas(updateFires);
      }
    } catch (e) {
      setMisReacciones(prev => {
        const next = new Set(prev);
        yaReaccione ? next.add(notaId) : next.delete(notaId);
        return next;
      });
    }
  };

  const verVideo = async () => {
    try {
      const { data } = await supabase.rpc('ver_video', { p_device_id: deviceId, p_fingerprint: fingerprint });
      if (data?.ok) {
        setVideosVistos(data.videos);
        setMostrarModal(false);
        vibrar(50);
      } else {
        setError(data?.error || 'Error');
      }
    } catch (e) {
      setError('Error al procesar video.');
    }
  };

  const comprar = async (tipo) => {
    try {
      await supabase.from('compras').insert({ device_id: deviceId, tipo, fecha: new Date().toISOString().split('T')[0] });
      if (tipo === 'ilimitado') setTieneIlimitado(true);
      else setExtrasComprados(prev => prev + 3);
      setMostrarModal(false);
      vibrar(50);
    } catch (e) {
      setError('Error al procesar compra.');
    }
  };

  const reportarNota = async (notaId) => {
    try {
      const { data } = await supabase.rpc('reportar_nota', { p_pensamiento_id: notaId, p_device_id: deviceId, p_razon: 'contenido inapropiado' });
      if (data?.ok) {
        setMostrarReporte(null);
        vibrar(30);
        alert(data.eliminado ? 'Nota eliminada por múltiples reportes.' : 'Nota reportada. Gracias.');
        if (data.eliminado) {
          setNotas(prev => prev.filter(n => n.id !== notaId));
          setMisNotas(prev => prev.filter(n => n.id !== notaId));
        }
      }
    } catch (e) {
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
          <h2 style={{ color: '#FFD700', marginBottom: '12px' }}>FIRE NOTES necesita tu ubicación</h2>
          <p style={{ color: '#AAA', marginBottom: '24px', lineHeight: '1.6' }}>
            Las notas solo son visibles a 1km de ti.<br/>Sin ubicación, no podemos mostrarte nada.
          </p>
          <button onClick={() => window.location.reload()} style={{ ...S.soltarBtn, maxWidth: '200px' }}>Reintentar</button>
        </div>
      </div>
    );
  }

  return (
    <div style={S.container}>
      {/* HEADER */}
      <header style={S.header}>
        <button onClick={() => setMostrarInfo(true)} style={S.infoBtn}>?</button>
        <div style={S.logoWrap}>
          <span style={{ fontSize: '28px' }}>🔥</span>
          <div style={S.logoTextWrap}>
            <span style={S.logoFire}>FIRE</span>
            <span style={S.logoNotes}>NOTES</span>
          </div>
        </div>
        <div style={S.contadorWrap}>
          {tieneIlimitado ? (
            <span style={S.contadorInfinito}>∞</span>
          ) : (
            <div style={S.contadorNotas}>
              {[...Array(MAX_NOTAS_GRATIS)].map((_, i) => {
                const restantes = totalDisponible - pensamientosUsados;
                const disponible = i < restantes;
                return (
                  <span key={i} style={{
                    fontSize: '18px', opacity: disponible ? 1 : 0.2,
                    transition: 'all 0.4s ease', transform: disponible ? 'scale(1)' : 'scale(0.7)',
                  }}>{disponible ? '📝' : '⬜'}</span>
                );
              })}
              {(totalDisponible - pensamientosUsados) > MAX_NOTAS_GRATIS && (
                <span style={S.contadorExtra}>+{(totalDisponible - pensamientosUsados) - MAX_NOTAS_GRATIS}</span>
              )}
            </div>
          )}
        </div>
      </header>

      {/* TABS */}
      {pantalla === 'feed' && (
        <div style={S.tabs}>
          <button onClick={() => setTab('feed')} style={{ ...S.tab, ...(tab === 'feed' ? S.tabActive : {}) }}>🌍 Cerca de ti</button>
          <button onClick={() => setTab('misNotas')} style={{ ...S.tab, ...(tab === 'misNotas' ? S.tabActive : {}) }}>📝 Tus notas ({misNotas.length})</button>
        </div>
      )}

      {/* ZONA */}
      {!cargando && pantalla === 'feed' && tab === 'feed' && (
        <div style={S.zonaIndicador}>
          {notas.length === 0 ? '❄️ Tu zona está fría - sé el primero' :
           notas.length < 5 ? `🌡️ ${notas.length} nota${notas.length > 1 ? 's' : ''} cerca de ti` :
           notas.length < 15 ? `🔥 ¡Zona activa! - ${notas.length} notas` :
           <span style={{ color: '#FF6B35' }}>🔥🔥🔥 ¡Zona caliente! - {notas.length} notas</span>}
        </div>
      )}

      {/* FEED */}
      {pantalla === 'feed' && (
        <main style={S.feed}>
          {cargando ? (
            <div style={S.empty}><div style={S.spinner}></div><p style={S.emptyText}>Buscando notas cerca de ti...</p></div>
          ) : (
            <>
              {(tab === 'feed' ? notas : misNotas).length === 0 ? (
                <div style={S.empty}>
                  <span style={{ fontSize: '48px', marginBottom: '8px' }}>🔥</span>
                  <p style={S.emptyText}>{tab === 'feed' ? 'No hay notas cerca de ti' : 'No tienes notas activas'}</p>
                  <p style={S.emptySubtext}>{tab === 'feed' ? 'Sé el primero en soltar un pensamiento' : 'Tus notas desaparecen en 24 horas'}</p>
                </div>
              ) : (
                <div style={S.notasGrid}>
                  {(tab === 'feed' ? notas : misNotas).map(nota => {
                    const quemado = calcularQuemado(nota.created_at);
                    const estaArdiendo = nota.fires >= 10;
                    const tieneReaccion = misReacciones.has(nota.id);
                    return (
                      <div key={nota.id} style={{
                        ...S.nota, opacity: 1 - (quemado * 0.3),
                        boxShadow: estaArdiendo ? '2px 4px 12px rgba(0,0,0,0.4), 0 0 20px rgba(255,107,53,0.4)' : '2px 4px 12px rgba(0,0,0,0.4)',
                        border: estaArdiendo ? '2px solid rgba(255,107,53,0.5)' : 'none',
                      }}>
                        <div style={S.notaLines} />
                        {quemado > 0.7 && <div style={S.notaQuemada} />}
                        <p style={S.notaTexto}>{nota.texto}</p>
                        <div style={S.notaFooter}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={S.notaTiempo}>{timeAgo(nota.created_at)}</span>
                            {tab === 'feed' && <span style={{ fontSize: '10px', color: '#AAA' }}>({nota.distanciaMetros || 0}m)</span>}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button onClick={() => setMostrarReporte(nota.id)} style={S.reportBtn}>⚑</button>
                            <button onClick={() => hacerFire(nota.id)} style={{
                              ...S.fireBtn, transform: tieneReaccion ? 'scale(1.1)' : 'scale(1)',
                              backgroundColor: tieneReaccion ? 'rgba(255,107,53,0.15)' : 'transparent',
                            }}>
                              <span style={{ animation: estaArdiendo ? 'flicker 0.5s infinite' : 'none' }}>🔥</span>
                              <span style={{ marginLeft: '4px' }}>{nota.fires}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </main>
      )}

      {/* ESCRIBIR */}
      {pantalla === 'escribir' && (
        <main style={S.escribir}>
          <div style={{ ...S.papelEscribir, ...(animandoNota ? S.papelAnimando : {}) }}>
            <div style={S.notaLines} />
            <textarea value={texto} onChange={(e) => e.target.value.length <= 200 && setTexto(e.target.value)} placeholder="Suelta tu pensamiento..." style={S.textarea} autoFocus maxLength={200} />
            <div style={S.charCount}><span style={{ color: texto.length > 180 ? '#E63946' : '#8B7355' }}>{texto.length}</span>/200</div>
          </div>
          {error && <p style={S.errorText}>{error}</p>}
          <button onClick={publicar} disabled={enviando || !texto.trim()} style={{ ...S.soltarBtn, opacity: enviando || !texto.trim() ? 0.5 : 1 }}>{enviando ? 'Soltando...' : '🔥 SOLTAR'}</button>
          <button onClick={() => { setPantalla('feed'); setError(''); }} style={S.cancelBtn}>Cancelar</button>
          {ubicacion && <p style={{ color: '#555', fontSize: '12px', textAlign: 'center', marginTop: '8px' }}>📍 Se publicará en tu ubicación actual</p>}
        </main>
      )}

      {/* FAB */}
      {pantalla === 'feed' && (<button onClick={() => puedeEscribir ? setPantalla('escribir') : setMostrarModal(true)} style={S.fab}>✏️</button>)}

      {/* TOAST */}
      {mostrarExito && <div style={S.toast}>🔥 ¡Nota soltada!</div>}

      {/* MODAL: SIN NOTAS */}
      {mostrarModal && (
        <div style={S.overlay} onClick={() => setMostrarModal(false)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <h2 style={S.modalTitle}>Se acabaron tus notas 🔥</h2>
            <p style={S.modalSub}>Consigue más para seguir soltando:</p>
            {videosVistos < 3 && (
              <button onClick={verVideo} style={S.modalOpt}>
                <span style={S.modalOptIcon}>🎬</span>
                <div><strong>Ver un video</strong><p style={S.modalOptDesc}>+1 nota gratis ({3 - videosVistos} restantes hoy)</p></div>
              </button>
            )}
            <button onClick={() => comprar('extra3')} style={S.modalOpt}><span style={S.modalOptIcon}>🔥</span><div><strong>+3 pensamientos</strong><p style={S.modalOptDesc}>$9.99 MXN</p></div></button>
            {!tieneIlimitado && (<button onClick={() => comprar('ilimitado')} style={S.modalOpt}><span style={S.modalOptIcon}>∞</span><div><strong>Ilimitado hoy</strong><p style={S.modalOptDesc}>$29.99 MXN</p></div></button>)}
            <button onClick={() => setMostrarModal(false)} style={S.modalClose}>Cerrar</button>
          </div>
        </div>
      )}

      {/* MODAL: REPORTAR */}
      {mostrarReporte && (
        <div style={S.overlay} onClick={() => setMostrarReporte(null)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <h2 style={S.modalTitle}>⚑ Reportar nota</h2>
            <p style={S.modalSub}>¿Esta nota viola las reglas?</p>
            <button onClick={() => reportarNota(mostrarReporte)} style={S.reportConfirmBtn}>Sí, reportar</button>
            <button onClick={() => setMostrarReporte(null)} style={S.modalClose}>Cancelar</button>
            <p style={{ fontSize: '12px', color: '#555', textAlign: 'center', marginTop: '12px' }}>Si muchas personas reportan una nota, se oculta automáticamente.</p>
          </div>
        </div>
      )}

      {/* MODAL: INFO */}
      {mostrarInfo && (
        <div style={S.overlay} onClick={() => setMostrarInfo(false)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <h2 style={S.modalTitle}>🔥 FIRE NOTES</h2>
            <p style={{ textAlign: 'center', color: '#888', fontStyle: 'italic', marginBottom: '16px' }}>Pensamientos anónimos que flotan a 1km</p>
            <div style={S.infoSection}>
              <h3 style={S.infoSectionTitle}>✅ Lo que SÍ puedes hacer</h3>
              <p style={S.infoRule}>Decir lo que piensas sin filtro</p>
              <p style={S.infoRule}>Quejarte de lo que sea</p>
              <p style={S.infoRule}>Confesar algo (sin nombres)</p>
              <p style={S.infoRule}>Dar tu opinión honesta</p>
            </div>
            <div style={S.infoSection}>
              <h3 style={{ ...S.infoSectionTitle, color: '#E63946' }}>❌ Lo que te BANEA</h3>
              <p style={S.infoRule}>Amenazar a alguien con nombre</p>
              <p style={S.infoRule}>Contenido de menores de edad</p>
              <p style={S.infoRule}>Acosar a personas identificables</p>
            </div>
            <div style={S.importantBox}>
              <p style={{ fontWeight: 'bold', textAlign: 'center', color: '#FFD700' }}>⚠ IMPORTANTE ⚠</p>
              <p style={{ textAlign: 'center', fontWeight: 'bold', color: '#FFF' }}>Eres anónimo, pero NO invisible.</p>
              <p style={{ textAlign: 'center', fontSize: '13px', color: '#AAA' }}>Si haces algo ilegal, cooperamos con las autoridades.</p>
            </div>
            <div style={{ marginTop: '16px', textAlign: 'center' }}>
              <button onClick={() => { setMostrarInfo(false); setMostrarTerminos(true); }} style={{ background: 'none', border: 'none', color: '#666', fontSize: '12px', textDecoration: 'underline', cursor: 'pointer' }}>Términos de uso y Privacidad</button>
            </div>
            <button onClick={() => setMostrarInfo(false)} style={S.modalClose}>Cerrar</button>
          </div>
        </div>
      )}

      {/* MODAL: TÉRMINOS */}
      {mostrarTerminos && (
        <div style={S.overlay} onClick={() => setMostrarTerminos(false)}>
          <div style={{ ...S.modal, maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <h2 style={S.modalTitle}>Términos y Privacidad</h2>
            <div style={S.legalText}>
              <h3 style={S.legalTitle}>1. TÉRMINOS DE USO</h3>
              <p>FIRE NOTES es una plataforma de expresión anónima. No requiere registro. Cada nota es visible solo para personas dentro de 1km y desaparece en 24 horas.</p>
              <p><strong>Contenido prohibido:</strong> Amenazas, contenido de menores, incitación a violencia, acoso identificable, actividades ilegales.</p>
              <p><strong>Consecuencias:</strong> 5+ reportes = nota eliminada. Actividad ilegal = cooperación con autoridades.</p>
              <h3 style={{ ...S.legalTitle, marginTop: '20px' }}>2. PRIVACIDAD</h3>
              <p><strong>Recopilamos:</strong> ID anónimo del dispositivo, ubicación aproximada, IP (prevención de abuso).</p>
              <p><strong>NO recopilamos:</strong> Nombre, email, teléfono, fotos.</p>
              <p><strong>Retención:</strong> Todo se elimina en 24 horas automáticamente.</p>
            </div>
            <button onClick={() => setMostrarTerminos(false)} style={S.modalClose}>Cerrar</button>
          </div>
        </div>
      )}

      {/* MODAL: ONBOARDING */}
      {mostrarOnboarding && (
        <div style={S.overlay}>
          <div style={S.modal}>
            <h2 style={S.modalTitle}>¡Bienvenido a FIRE NOTES! 🔥</h2>
            <div style={{ padding: '16px 0' }}>
              <p style={{ ...S.infoRule, borderBottom: 'none', padding: '12px 0' }}>📝 <strong>Escribe</strong> lo que piensas</p>
              <p style={{ ...S.infoRule, borderBottom: 'none', padding: '12px 0' }}>📍 <strong>Solo ven</strong> personas a 1km de ti</p>
              <p style={{ ...S.infoRule, borderBottom: 'none', padding: '12px 0' }}>⏰ <strong>Desaparece</strong> en 24 horas</p>
              <p style={{ ...S.infoRule, borderBottom: 'none', padding: '12px 0' }}>🔥 <strong>Da fuego</strong> a lo que te gusta</p>
              <p style={{ ...S.infoRule, borderBottom: 'none', padding: '12px 0' }}>👤 <strong>100% anónimo</strong> - sin registro</p>
            </div>
            <button onClick={() => setMostrarOnboarding(false)} style={S.soltarBtn}>¡Entendido!</button>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateX(-50%) translateY(-10px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
        @keyframes flicker { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
        @keyframes flyUp { 0% { transform: translateY(0) scale(1); opacity: 1; } 100% { transform: translateY(-100px) scale(0.8); opacity: 0; } }
      `}</style>
    </div>
  );
}

// ============================================================
// STYLES
// ============================================================
const S = {
  container: { minHeight: '100dvh', backgroundColor: '#000', color: '#FFF', fontFamily: "'Georgia', serif", maxWidth: '480px', margin: '0 auto', position: 'relative' },
  ubicacionError: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', padding: '24px', textAlign: 'center' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', position: 'sticky', top: 0, zIndex: 100, backgroundColor: '#000', borderBottom: '1px solid #1a1a1a' },
  infoBtn: { width: '36px', height: '36px', borderRadius: '50%', border: '1px solid #333', background: 'transparent', color: '#888', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  logoWrap: { display: 'flex', alignItems: 'center', gap: '8px' },
  logoTextWrap: { display: 'flex', alignItems: 'baseline', gap: '6px' },
  logoFire: { fontSize: '24px', fontWeight: 'bold', background: 'linear-gradient(135deg, #FF6B35, #E63946)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '2px' },
  logoNotes: { fontSize: '14px', fontWeight: 'normal', color: '#FFFFFF', letterSpacing: '1px', opacity: 0.9 },
  contadorWrap: { display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '70px' },
  contadorNotas: { display: 'flex', alignItems: 'center', gap: '2px' },
  contadorExtra: { fontSize: '12px', color: '#FFD700', marginLeft: '4px', fontWeight: 'bold' },
  contadorInfinito: { fontSize: '24px', fontWeight: 'bold', color: '#FFD700' },
  tabs: { display: 'flex', borderBottom: '1px solid #1a1a1a' },
  tab: { flex: 1, padding: '12px', background: 'transparent', border: 'none', color: '#666', fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s' },
  tabActive: { color: '#FF6B35', borderBottom: '2px solid #FF6B35', marginBottom: '-1px' },
  zonaIndicador: { textAlign: 'center', padding: '10px 16px', fontSize: '13px', color: '#777', fontStyle: 'italic', backgroundColor: 'rgba(255,255,255,0.02)', borderBottom: '1px solid #1a1a1a' },
  feed: { padding: '16px', paddingBottom: '100px', minHeight: 'calc(100dvh - 140px)' },
  empty: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: '12px' },
  emptyText: { color: '#666', fontSize: '16px', fontStyle: 'italic', textAlign: 'center' },
  emptySubtext: { color: '#444', fontSize: '14px', fontStyle: 'italic', textAlign: 'center' },
  spinner: { width: '32px', height: '32px', border: '3px solid #222', borderTop: '3px solid #FF6B35', borderRadius: '50%', animation: 'spin 1s linear infinite' },
  notasGrid: { display: 'flex', flexDirection: 'column', gap: '16px' },
  nota: { position: 'relative', backgroundColor: '#F5E6D3', borderRadius: '4px', padding: '20px', boxShadow: '2px 4px 12px rgba(0,0,0,0.4)', overflow: 'hidden', transition: 'all 0.3s ease' },
  notaLines: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'repeating-linear-gradient(0deg, transparent, transparent 28px, rgba(0,0,0,0.03) 28px, rgba(0,0,0,0.03) 29px)', pointerEvents: 'none' },
  notaQuemada: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(135deg, transparent 85%, rgba(139,69,19,0.2) 100%)', borderRadius: '4px', pointerEvents: 'none' },
  notaTexto: { color: '#2D2A26', fontSize: '16px', fontStyle: 'italic', lineHeight: '1.6', position: 'relative', zIndex: 1, margin: 0, wordBreak: 'break-word' },
  notaFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', position: 'relative', zIndex: 1 },
  notaTiempo: { fontSize: '12px', color: '#8B7355' },
  fireBtn: { background: 'transparent', border: 'none', fontSize: '16px', cursor: 'pointer', padding: '6px 10px', borderRadius: '12px', color: '#2D2A26', transition: 'all 0.2s', display: 'flex', alignItems: 'center' },
  reportBtn: { background: 'transparent', border: 'none', fontSize: '14px', cursor: 'pointer', padding: '4px', color: '#8B7355', opacity: 0.4 },
  escribir: { padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '20px', minHeight: 'calc(100dvh - 70px)' },
  papelEscribir: { position: 'relative', backgroundColor: '#F5E6D3', borderRadius: '4px', padding: '24px', minHeight: '200px', boxShadow: '2px 4px 12px rgba(0,0,0,0.4)', transition: 'all 0.5s ease' },
  papelAnimando: { animation: 'flyUp 0.5s ease-out forwards' },
  textarea: { width: '100%', minHeight: '150px', background: 'transparent', border: 'none', outline: 'none', color: '#2D2A26', fontSize: '18px', fontStyle: 'italic', fontFamily: "'Georgia', serif", lineHeight: '29px', resize: 'none', position: 'relative', zIndex: 1 },
  charCount: { position: 'absolute', bottom: '8px', right: '12px', fontSize: '12px', color: '#8B7355', fontFamily: 'monospace', zIndex: 1 },
  soltarBtn: { width: '100%', padding: '16px', border: 'none', borderRadius: '12px', background: 'linear-gradient(135deg, #FF6B35, #E63946)', color: '#FFF', fontSize: '18px', fontWeight: 'bold', fontFamily: "'Georgia', serif", letterSpacing: '2px', cursor: 'pointer', boxShadow: '0 0 20px rgba(230,57,70,0.4)', transition: 'all 0.2s' },
  cancelBtn: { background: 'transparent', border: 'none', color: '#666', fontSize: '16px', cursor: 'pointer', padding: '8px' },
  errorText: { color: '#E63946', fontSize: '14px', textAlign: 'center', margin: 0 },
  fab: { position: 'fixed', bottom: '24px', right: '24px', width: '64px', height: '64px', borderRadius: '50%', border: 'none', background: 'linear-gradient(135deg, #FF6B35, #E63946)', fontSize: '26px', cursor: 'pointer', boxShadow: '0 4px 24px rgba(230,57,70,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99 },
  toast: { position: 'fixed', top: '80px', left: '50%', transform: 'translateX(-50%)', backgroundColor: 'rgba(255,107,53,0.95)', color: '#FFF', padding: '12px 24px', borderRadius: '24px', fontSize: '16px', zIndex: 200, boxShadow: '0 4px 20px rgba(0,0,0,0.4)', animation: 'fadeIn 0.3s ease' },
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 150, padding: '20px' },
  modal: { backgroundColor: '#111', borderRadius: '16px', padding: '28px', maxWidth: '380px', width: '100%', border: '1px solid #222' },
  modalTitle: { fontSize: '22px', fontWeight: 'bold', textAlign: 'center', color: '#FFD700', margin: '0 0 8px 0' },
  modalSub: { fontSize: '14px', color: '#888', textAlign: 'center', marginBottom: '20px', fontStyle: 'italic' },
  modalOpt: { width: '100%', display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', borderRadius: '12px', border: '1px solid #333', background: '#1a1a1a', cursor: 'pointer', marginBottom: '12px', textAlign: 'left', color: '#FFF' },
  modalOptIcon: { fontSize: '28px', flexShrink: 0 },
  modalOptDesc: { fontSize: '13px', color: '#888', margin: '4px 0 0 0' },
  modalClose: { width: '100%', padding: '12px', borderRadius: '8px', border: 'none', background: 'transparent', color: '#666', fontSize: '16px', cursor: 'pointer', marginTop: '8px' },
  reportConfirmBtn: { width: '100%', padding: '14px', borderRadius: '12px', border: 'none', background: '#E63946', color: '#FFF', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '8px' },
  infoSection: { marginTop: '16px' },
  infoSectionTitle: { fontSize: '14px', fontWeight: 'bold', color: '#4CAF50', marginBottom: '8px' },
  infoRule: { color: '#CCC', fontSize: '14px', margin: 0, padding: '6px 0', borderBottom: '1px solid #1a1a1a' },
  importantBox: { marginTop: '16px', padding: '16px', borderRadius: '8px', border: '2px solid #FFD700', backgroundColor: 'rgba(255,215,0,0.05)' },
  legalText: { marginTop: '16px', fontSize: '13px', color: '#AAA', lineHeight: '1.7' },
  legalTitle: { fontSize: '16px', color: '#FFD700', fontWeight: 'bold', marginBottom: '8px' },
};
