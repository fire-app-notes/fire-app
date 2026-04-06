'use client';
import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

// ============================================================
// 🔥 FIRE NOTES - CON AMBIENTE Y VISUAL MEJORADO
// ============================================================

const supabase = createClient(
  'https://xjzoabsuzbqxkriamqed.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhqem9hYnN1emJxeGtyaWFtcWVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNzYyNDcsImV4cCI6MjA5MDg1MjI0N30.gS2lG4W-f_4Vtsz7cYZK9PAX6pI8fdD0br7geqaae6E'
);

const RADIO_KM = 1;
const MAX_NOTAS_GRATIS = 3;

// Colores de notas tipo post-it
const COLORES_NOTAS = [
  { bg: '#FFF9C4', shadow: 'rgba(255,235,59,0.3)' },  // Amarillo
  { bg: '#FFCDD2', shadow: 'rgba(244,67,54,0.2)' },   // Rosa
  { bg: '#B3E5FC', shadow: 'rgba(3,169,244,0.2)' },   // Azul
  { bg: '#C8E6C9', shadow: 'rgba(76,175,80,0.2)' },   // Verde
  { bg: '#F5E6D3', shadow: 'rgba(121,85,72,0.2)' },   // Beige clásico
  { bg: '#E1BEE7', shadow: 'rgba(156,39,176,0.2)' },  // Morado
  { bg: '#FFE0B2', shadow: 'rgba(255,152,0,0.2)' },   // Naranja
];

// ============================================================
// SONIDO AMBIENTE - CREPITAR DE FUEGO
// ============================================================
class FireAmbience {
  constructor() {
    this.audioContext = null;
    this.isPlaying = false;
    this.nodes = [];
  }

  start() {
    if (this.isPlaying) return;
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.isPlaying = true;
      this.createCrackle();
    } catch (e) {}
  }

  createCrackle() {
    if (!this.isPlaying || !this.audioContext) return;

    const now = this.audioContext.currentTime;
    
    // Crear un "crack" individual
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();

    // Ruido tipo crepitar
    const bufferSize = this.audioContext.sampleRate * 0.1;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
    }

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;

    filter.type = 'lowpass';
    filter.frequency.value = 800 + Math.random() * 400;

    gainNode.gain.setValueAtTime(0.03 + Math.random() * 0.02, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    source.start(now);
    source.stop(now + 0.1);

    // Siguiente crack en intervalo random
    if (this.isPlaying) {
      setTimeout(() => this.createCrackle(), 50 + Math.random() * 150);
    }
  }

  stop() {
    this.isPlaying = false;
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  toggle() {
    if (this.isPlaying) {
      this.stop();
      return false;
    } else {
      this.start();
      return true;
    }
  }
}

let fireAmbience = null;

// ============================================================
// SONIDO DE FIRE (al dar like) - MEJORADO
// ============================================================
function playFireSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    
    // Sonido más satisfactorio tipo "pop" + fuego
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.15);
    
    filter.type = 'lowpass';
    filter.frequency.value = 1500;
    
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.15);

    // Agregar un poco de "crackle"
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < buffer.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / buffer.length, 3) * 0.3;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.1;
    noise.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start();
  } catch (e) {}
}

function playWhooshSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(500, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.4);
    
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch (e) {}
}

function vibrar(pattern = 50) {
  try { navigator.vibrate && navigator.vibrate(pattern); } catch (e) {}
}

// ============================================================
// HELPERS
// ============================================================
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

function generateFingerprint() {
  try {
    const c = [screen.width, screen.height, screen.colorDepth, navigator.language, Intl.DateTimeFormat().resolvedOptions().timeZone, navigator.platform, navigator.hardwareConcurrency];
    let h = 0;
    const s = c.join('|');
    for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h = h & h; }
    return 'fp_' + Math.abs(h).toString(36);
  } catch (e) { return 'fp_unknown'; }
}

function calcularDistanciaKm(lat1, lng1, lat2, lng2) {
  if (!lat1 || !lng1 || !lat2 || !lng2) return 999;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng/2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function timeAgo(dateString) {
  const m = Math.floor((Date.now() - new Date(dateString).getTime()) / 60000);
  if (m < 1) return 'ahora';
  if (m < 60) return `hace ${m}m`;
  const h = Math.floor(m / 60);
  return h < 24 ? `hace ${h}h` : 'hace 1d';
}

function calcularQuemado(dateString) {
  return Math.min((Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60 * 24), 1);
}

function validarTexto(texto) {
  return /^[a-zA-ZáéíóúüñÁÉÍÓÚÜÑàèìòùÀÈÌÒÙâêîôûÂÊÎÔÛäëïöüÄËÏÖÜçÇ0-9\s.,;:!?¡¿'"()\-@#]+$/.test(texto) && texto.trim().length > 0 && texto.length <= 200;
}

function getColorForNote(id) {
  // Color consistente basado en el ID de la nota
  const hash = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return COLORES_NOTAS[hash % COLORES_NOTAS.length];
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
  const [sonidoAmbiente, setSonidoAmbiente] = useState(false);

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

    fireAmbience = new FireAmbience();

    const yaVioOnboarding = localStorage.getItem('fire_onboarding_v2');
    if (!yaVioOnboarding) {
      setMostrarOnboarding(true);
      localStorage.setItem('fire_onboarding_v2', 'true');
    }

    if (navigator.geolocation) {
      setUbicacionStatus('obteniendo');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUbicacion({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setUbicacionStatus('ok');
        },
        (err) => setUbicacionStatus(err.code === 1 ? 'denegado' : 'error'),
        { enableHighAccuracy: true, timeout: 15000 }
      );

      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          setUbicacion(prev => {
            if (prev?.lat && calcularDistanciaKm(prev.lat, prev.lng, pos.coords.latitude, pos.coords.longitude) * 1000 < 50) return prev;
            return { lat: pos.coords.latitude, lng: pos.coords.longitude };
          });
        },
        () => {},
        { enableHighAccuracy: true, timeout: 30000, maximumAge: 60000 }
      );
    } else {
      setUbicacionStatus('error');
    }

    return () => {
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
      if (fireAmbience) fireAmbience.stop();
    };
  }, []);

  useEffect(() => {
    if (ubicacion?.lat && deviceId) cargarTodo();
  }, [ubicacion, deviceId]);

  useEffect(() => {
    if (!ubicacion?.lat || !deviceId) return;
    const interval = setInterval(cargarNotas, 30000);
    return () => clearInterval(interval);
  }, [ubicacion, deviceId]);

  const toggleSonidoAmbiente = () => {
    if (fireAmbience) {
      const isOn = fireAmbience.toggle();
      setSonidoAmbiente(isOn);
    }
  };

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

      const filtradas = (data || []).filter(n => calcularDistanciaKm(ubicacion.lat, ubicacion.lng, n.latitud, n.longitud) <= RADIO_KM)
        .map(n => ({ ...n, distanciaMetros: Math.round(calcularDistanciaKm(ubicacion.lat, ubicacion.lng, n.latitud, n.longitud) * 1000) }));

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
  // ACTIONS
  // ============================================================
  const publicar = async () => {
    if (!ubicacion?.lat) { setError('Necesitamos tu ubicación.'); return; }
    if (!puedeEscribir) { setMostrarModal(true); return; }
    if (!validarTexto(texto)) { setError('Solo letras, números y puntuación. Máx 200.'); return; }

    setEnviando(true);
    setError('');

    try {
      const { data, error: err } = await supabase.rpc('publicar_pensamiento', {
        p_texto: texto.trim(), p_lat: ubicacion.lat, p_lng: ubicacion.lng, p_device_id: deviceId, p_fingerprint: fingerprint,
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
        setTimeout(() => { setMostrarExito(false); setPantalla('feed'); }, 1200);
      }, 500);
    } catch (e) {
      setError('Error inesperado.');
    } finally {
      setEnviando(false);
    }
  };

  const hacerFire = async (notaId) => {
    const yaReaccione = misReacciones.has(notaId);
    playFireSound();
    vibrar(30);

    setMisReacciones(prev => {
      const next = new Set(prev);
      yaReaccione ? next.delete(notaId) : next.add(notaId);
      return next;
    });
    
    const update = (prev) => prev.map(n => n.id === notaId ? { ...n, fires: n.fires + (yaReaccione ? -1 : 1) } : n);
    setNotas(update);
    setMisNotas(update);

    try {
      const { data } = await supabase.rpc('toggle_fire', { p_pensamiento_id: notaId, p_device_id: deviceId });
      if (data?.fires !== undefined) {
        const updateFires = (prev) => prev.map(n => n.id === notaId ? { ...n, fires: data.fires } : n);
        setNotas(updateFires);
        setMisNotas(updateFires);
      }
    } catch (e) {}
  };

  const verVideo = async () => {
    try {
      const { data } = await supabase.rpc('ver_video', { p_device_id: deviceId, p_fingerprint: fingerprint });
      if (data?.ok) { setVideosVistos(data.videos); setMostrarModal(false); vibrar(50); }
    } catch (e) {}
  };

  const comprar = async (tipo) => {
    try {
      await supabase.from('compras').insert({ device_id: deviceId, tipo, fecha: new Date().toISOString().split('T')[0] });
      if (tipo === 'ilimitado') setTieneIlimitado(true);
      else setExtrasComprados(prev => prev + 3);
      setMostrarModal(false);
      vibrar(50);
    } catch (e) {}
  };

  const reportarNota = async (notaId) => {
    try {
      const { data } = await supabase.rpc('reportar_nota', { p_pensamiento_id: notaId, p_device_id: deviceId, p_razon: 'contenido inapropiado' });
      if (data?.ok) {
        setMostrarReporte(null);
        vibrar(30);
        if (data.eliminado) {
          setNotas(prev => prev.filter(n => n.id !== notaId));
          setMisNotas(prev => prev.filter(n => n.id !== notaId));
        }
      }
    } catch (e) {}
  };

  // ============================================================
  // RENDER
  // ============================================================
  if (ubicacionStatus === 'denegado') {
    return (
      <div style={S.container}>
        <div style={S.centrado}>
          <span style={{ fontSize: '64px', marginBottom: '20px' }}>📍</span>
          <h2 style={{ color: '#FFD700', marginBottom: '12px' }}>FIRE NOTES necesita tu ubicación</h2>
          <p style={{ color: '#AAA', marginBottom: '24px', lineHeight: '1.6' }}>Las notas solo son visibles a 1km de ti.</p>
          <button onClick={() => window.location.reload()} style={S.btnPrimario}>Reintentar</button>
        </div>
      </div>
    );
  }

  return (
    <div style={S.container}>
      {/* HEADER */}
      <header style={S.header}>
        <button onClick={() => setMostrarInfo(true)} style={S.btnCirculo}>?</button>
        <div style={S.logoWrap}>
          <span style={{ fontSize: '28px' }}>🔥</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span style={S.logoFire}>FIRE</span>
            <span style={S.logoNotes}>NOTES</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={toggleSonidoAmbiente} style={{ ...S.btnCirculo, fontSize: '14px', color: sonidoAmbiente ? '#FF6B35' : '#555' }}>
            {sonidoAmbiente ? '🔊' : '🔇'}
          </button>
          <div style={S.contadorNotas}>
            {tieneIlimitado ? <span style={S.infinito}>∞</span> : (
              <>
                {[...Array(MAX_NOTAS_GRATIS)].map((_, i) => {
                  const restantes = totalDisponible - pensamientosUsados;
                  return <span key={i} style={{ fontSize: '16px', opacity: i < restantes ? 1 : 0.2, transition: 'all 0.3s' }}>{i < restantes ? '📝' : '⬜'}</span>;
                })}
                {(totalDisponible - pensamientosUsados) > 3 && <span style={S.extra}>+{(totalDisponible - pensamientosUsados) - 3}</span>}
              </>
            )}
          </div>
        </div>
      </header>

      {/* TABS */}
      {pantalla === 'feed' && (
        <div style={S.tabs}>
          <button onClick={() => setTab('feed')} style={{ ...S.tab, ...(tab === 'feed' ? S.tabActivo : {}) }}>🌍 Cerca de ti</button>
          <button onClick={() => setTab('misNotas')} style={{ ...S.tab, ...(tab === 'misNotas' ? S.tabActivo : {}) }}>📝 Tus notas ({misNotas.length})</button>
        </div>
      )}

      {/* ZONA */}
      {!cargando && pantalla === 'feed' && tab === 'feed' && (
        <div style={S.zona}>
          {notas.length === 0 ? '❄️ Tu zona está fría - sé el primero' :
           notas.length < 5 ? `🌡️ ${notas.length} nota${notas.length > 1 ? 's' : ''} cerca` :
           notas.length < 15 ? `🔥 ¡Zona activa! - ${notas.length} notas` :
           <span style={{ color: '#FF6B35' }}>🔥🔥🔥 ¡Zona caliente! - {notas.length} notas</span>}
        </div>
      )}

      {/* FEED */}
      {pantalla === 'feed' && (
        <main style={S.feed}>
          {cargando ? (
            <div style={S.centrado}><div style={S.spinner}></div><p style={{ color: '#666', marginTop: '12px' }}>Buscando notas...</p></div>
          ) : (tab === 'feed' ? notas : misNotas).length === 0 ? (
            <div style={S.centrado}>
              <span style={{ fontSize: '48px' }}>🔥</span>
              <p style={{ color: '#666', marginTop: '12px' }}>{tab === 'feed' ? 'No hay notas cerca' : 'No tienes notas activas'}</p>
              <p style={{ color: '#444', fontSize: '14px' }}>{tab === 'feed' ? 'Sé el primero en soltar un pensamiento' : 'Desaparecen en 24 horas'}</p>
            </div>
          ) : (
            <div style={S.notasGrid}>
              {(tab === 'feed' ? notas : misNotas).map((nota, index) => {
                const color = getColorForNote(nota.id);
                const quemado = calcularQuemado(nota.created_at);
                const ardiendo = nota.fires >= 10;
                const reaccionado = misReacciones.has(nota.id);

                return (
                  <div key={nota.id} style={{
                    ...S.nota,
                    backgroundColor: color.bg,
                    boxShadow: ardiendo 
                      ? `4px 6px 20px ${color.shadow}, 0 0 30px rgba(255,107,53,0.5)` 
                      : `4px 6px 16px ${color.shadow}`,
                    opacity: 1 - (quemado * 0.25),
                    animation: `noteIn 0.4s ease ${index * 0.05}s both`,
                    border: ardiendo ? '2px solid rgba(255,107,53,0.6)' : 'none',
                  }}>
                    {/* Esquina doblada */}
                    <div style={S.esquinaDoblada}></div>
                    
                    {/* Pin decorativo */}
                    <div style={S.pin}>📌</div>

                    {/* Efecto quemado */}
                    {quemado > 0.7 && <div style={S.efectoQuemado} />}

                    {/* Texto */}
                    <p style={S.notaTexto}>{nota.texto}</p>

                    {/* Footer */}
                    <div style={S.notaFooter}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={S.tiempo}>{timeAgo(nota.created_at)}</span>
                        {tab === 'feed' && <span style={{ fontSize: '10px', color: '#999' }}>• {nota.distanciaMetros}m</span>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button onClick={() => setMostrarReporte(nota.id)} style={S.btnReporte}>⚑</button>
                        <button onClick={() => hacerFire(nota.id)} style={{
                          ...S.btnFire,
                          transform: reaccionado ? 'scale(1.15)' : 'scale(1)',
                          background: reaccionado ? 'rgba(255,107,53,0.2)' : 'rgba(0,0,0,0.05)',
                        }}>
                          <span style={{ animation: ardiendo ? 'flicker 0.3s infinite' : 'none' }}>🔥</span>
                          <span style={{ marginLeft: '4px', fontWeight: 'bold' }}>{nota.fires}</span>
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

      {/* ESCRIBIR */}
      {pantalla === 'escribir' && (
        <main style={S.escribir}>
          <div style={{ ...S.papelEscribir, ...(animandoNota ? { animation: 'flyUp 0.5s ease-out forwards' } : {}) }}>
            <div style={S.pin}>📌</div>
            <textarea value={texto} onChange={(e) => e.target.value.length <= 200 && setTexto(e.target.value)} placeholder="Suelta tu pensamiento..." style={S.textarea} autoFocus maxLength={200} />
            <div style={S.contador}><span style={{ color: texto.length > 180 ? '#E63946' : '#999' }}>{texto.length}</span>/200</div>
          </div>
          {error && <p style={{ color: '#E63946', textAlign: 'center' }}>{error}</p>}
          <button onClick={publicar} disabled={enviando || !texto.trim()} style={{ ...S.btnPrimario, opacity: enviando || !texto.trim() ? 0.5 : 1 }}>
            {enviando ? 'Soltando...' : '🔥 SOLTAR'}
          </button>
          <button onClick={() => { setPantalla('feed'); setError(''); }} style={S.btnSecundario}>Cancelar</button>
        </main>
      )}

      {/* FAB */}
      {pantalla === 'feed' && <button onClick={() => puedeEscribir ? setPantalla('escribir') : setMostrarModal(true)} style={S.fab}>✏️</button>}

      {/* TOAST */}
      {mostrarExito && <div style={S.toast}>🔥 ¡Nota soltada!</div>}

      {/* MODALS */}
      {mostrarModal && (
        <div style={S.overlay} onClick={() => setMostrarModal(false)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <h2 style={S.modalTitulo}>Se acabaron tus notas 🔥</h2>
            <p style={S.modalSub}>Consigue más:</p>
            {videosVistos < 3 && (
              <button onClick={verVideo} style={S.modalOpcion}>
                <span style={{ fontSize: '24px' }}>🎬</span>
                <div><strong>Ver un video</strong><p style={{ color: '#888', fontSize: '13px', margin: '4px 0 0' }}>+1 nota ({3 - videosVistos} restantes)</p></div>
              </button>
            )}
            <button onClick={() => comprar('extra3')} style={S.modalOpcion}>
              <span style={{ fontSize: '24px' }}>🔥</span>
              <div><strong>+3 notas</strong><p style={{ color: '#888', fontSize: '13px', margin: '4px 0 0' }}>$9.99 MXN</p></div>
            </button>
            {!tieneIlimitado && (
              <button onClick={() => comprar('ilimitado')} style={S.modalOpcion}>
                <span style={{ fontSize: '24px' }}>∞</span>
                <div><strong>Ilimitado hoy</strong><p style={{ color: '#888', fontSize: '13px', margin: '4px 0 0' }}>$29.99 MXN</p></div>
              </button>
            )}
            <button onClick={() => setMostrarModal(false)} style={S.btnSecundario}>Cerrar</button>
          </div>
        </div>
      )}

      {mostrarReporte && (
        <div style={S.overlay} onClick={() => setMostrarReporte(null)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <h2 style={S.modalTitulo}>⚑ Reportar</h2>
            <p style={S.modalSub}>¿Viola las reglas?</p>
            <button onClick={() => reportarNota(mostrarReporte)} style={{ ...S.btnPrimario, background: '#E63946' }}>Sí, reportar</button>
            <button onClick={() => setMostrarReporte(null)} style={S.btnSecundario}>Cancelar</button>
          </div>
        </div>
      )}

      {mostrarInfo && (
        <div style={S.overlay} onClick={() => setMostrarInfo(false)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <h2 style={S.modalTitulo}>🔥 FIRE NOTES</h2>
            <p style={{ textAlign: 'center', color: '#888', fontStyle: 'italic' }}>Pensamientos anónimos a 1km</p>
            <div style={{ marginTop: '16px' }}>
              <p style={S.regla}><span style={{ color: '#4CAF50' }}>✅</span> Decir lo que piensas</p>
              <p style={S.regla}><span style={{ color: '#4CAF50' }}>✅</span> Quejarte de lo que sea</p>
              <p style={S.regla}><span style={{ color: '#4CAF50' }}>✅</span> Confesar (sin nombres)</p>
              <p style={S.regla}><span style={{ color: '#E63946' }}>❌</span> Amenazas con nombres</p>
              <p style={S.regla}><span style={{ color: '#E63946' }}>❌</span> Contenido de menores</p>
              <p style={S.regla}><span style={{ color: '#E63946' }}>❌</span> Acoso identificable</p>
            </div>
            <div style={S.aviso}>
              <p style={{ fontWeight: 'bold', color: '#FFD700', textAlign: 'center' }}>⚠ Eres anónimo, no invisible</p>
              <p style={{ fontSize: '12px', color: '#AAA', textAlign: 'center' }}>Actividad ilegal = cooperamos con autoridades</p>
            </div>
            <button onClick={() => { setMostrarInfo(false); setMostrarTerminos(true); }} style={{ background: 'none', border: 'none', color: '#666', fontSize: '12px', textDecoration: 'underline', cursor: 'pointer', marginTop: '12px' }}>Términos y Privacidad</button>
            <button onClick={() => setMostrarInfo(false)} style={S.btnSecundario}>Cerrar</button>
          </div>
        </div>
      )}

      {mostrarTerminos && (
        <div style={S.overlay} onClick={() => setMostrarTerminos(false)}>
          <div style={{ ...S.modal, maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <h2 style={S.modalTitulo}>Términos</h2>
            <div style={{ fontSize: '13px', color: '#AAA', lineHeight: '1.7' }}>
              <p><strong style={{ color: '#FFD700' }}>USO:</strong> Plataforma anónima. Notas visibles a 1km, desaparecen en 24h.</p>
              <p><strong style={{ color: '#FFD700' }}>PROHIBIDO:</strong> Amenazas, menores, violencia, acoso, ilegalidad.</p>
              <p><strong style={{ color: '#FFD700' }}>PRIVACIDAD:</strong> Solo guardamos ID anónimo, ubicación aprox, IP. Nada personal.</p>
            </div>
            <button onClick={() => setMostrarTerminos(false)} style={S.btnSecundario}>Cerrar</button>
          </div>
        </div>
      )}

      {mostrarOnboarding && (
        <div style={S.overlay}>
          <div style={S.modal}>
            <h2 style={S.modalTitulo}>¡Bienvenido! 🔥</h2>
            <div style={{ padding: '16px 0' }}>
              <p style={S.regla}>📝 <strong>Escribe</strong> lo que piensas</p>
              <p style={S.regla}>📍 <strong>Solo ven</strong> personas a 1km</p>
              <p style={S.regla}>⏰ <strong>Desaparece</strong> en 24 horas</p>
              <p style={S.regla}>🔥 <strong>Da fuego</strong> a lo que te gusta</p>
              <p style={S.regla}>🔊 <strong>Activa el sonido</strong> ambiente</p>
            </div>
            <button onClick={() => setMostrarOnboarding(false)} style={S.btnPrimario}>¡Entendido!</button>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes flicker { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.8; transform: scale(1.1); } }
        @keyframes flyUp { to { transform: translateY(-80px) scale(0.8) rotate(-5deg); opacity: 0; } }
        @keyframes noteIn { from { opacity: 0; transform: translateY(20px) rotate(-2deg); } to { opacity: 1; transform: translateY(0) rotate(0); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateX(-50%) translateY(-10px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
        * { box-sizing: border-box; }
        body { margin: 0; background: #000; }
      `}</style>
    </div>
  );
}

// ============================================================
// STYLES
// ============================================================
const S = {
  container: { minHeight: '100dvh', backgroundColor: '#0a0a0a', color: '#FFF', fontFamily: "'Segoe UI', system-ui, sans-serif", maxWidth: '480px', margin: '0 auto', position: 'relative' },
  centrado: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: '24px', textAlign: 'center' },
  
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', position: 'sticky', top: 0, zIndex: 100, backgroundColor: 'rgba(10,10,10,0.95)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #1a1a1a' },
  logoWrap: { display: 'flex', alignItems: 'center', gap: '8px' },
  logoFire: { fontSize: '22px', fontWeight: '800', background: 'linear-gradient(135deg, #FF6B35, #E63946)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '1px' },
  logoNotes: { fontSize: '13px', color: '#FFF', opacity: 0.85, fontWeight: '500' },
  
  btnCirculo: { width: '36px', height: '36px', borderRadius: '50%', border: '1px solid #333', background: 'transparent', color: '#888', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  contadorNotas: { display: 'flex', alignItems: 'center', gap: '3px' },
  infinito: { fontSize: '22px', fontWeight: 'bold', color: '#FFD700' },
  extra: { fontSize: '11px', color: '#FFD700', fontWeight: 'bold', marginLeft: '2px' },

  tabs: { display: 'flex', borderBottom: '1px solid #1a1a1a' },
  tab: { flex: 1, padding: '12px', background: 'transparent', border: 'none', color: '#666', fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s' },
  tabActivo: { color: '#FF6B35', borderBottom: '2px solid #FF6B35' },

  zona: { textAlign: 'center', padding: '10px 16px', fontSize: '13px', color: '#777', fontStyle: 'italic', background: 'rgba(255,255,255,0.02)' },

  feed: { padding: '16px', paddingBottom: '100px', minHeight: 'calc(100dvh - 140px)' },
  notasGrid: { display: 'flex', flexDirection: 'column', gap: '16px' },

  nota: { position: 'relative', borderRadius: '3px', padding: '20px 18px 14px', transition: 'all 0.3s ease', transformOrigin: 'top left' },
  esquinaDoblada: { position: 'absolute', top: 0, right: 0, width: '0', height: '0', borderStyle: 'solid', borderWidth: '0 25px 25px 0', borderColor: 'transparent rgba(0,0,0,0.1) transparent transparent' },
  pin: { position: 'absolute', top: '-8px', left: '50%', transform: 'translateX(-50%)', fontSize: '16px', zIndex: 2 },
  efectoQuemado: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '30%', background: 'linear-gradient(to top, rgba(139,69,19,0.15), transparent)', borderRadius: '0 0 3px 3px', pointerEvents: 'none' },
  notaTexto: { color: '#2D2A26', fontSize: '16px', fontFamily: "'Comic Sans MS', 'Chalkboard SE', cursive", lineHeight: '1.55', margin: '8px 0 12px', wordBreak: 'break-word', position: 'relative', zIndex: 1 },
  notaFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 },
  tiempo: { fontSize: '11px', color: '#888' },
  btnReporte: { background: 'none', border: 'none', fontSize: '14px', cursor: 'pointer', color: '#999', opacity: 0.5, padding: '4px' },
  btnFire: { display: 'flex', alignItems: 'center', border: 'none', fontSize: '15px', cursor: 'pointer', padding: '6px 10px', borderRadius: '16px', color: '#333', transition: 'all 0.2s' },

  escribir: { padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', minHeight: 'calc(100dvh - 70px)' },
  papelEscribir: { position: 'relative', backgroundColor: '#FFF9C4', borderRadius: '3px', padding: '28px 20px 20px', minHeight: '200px', boxShadow: '4px 6px 20px rgba(255,235,59,0.3)' },
  textarea: { width: '100%', minHeight: '150px', background: 'transparent', border: 'none', outline: 'none', color: '#2D2A26', fontSize: '18px', fontFamily: "'Comic Sans MS', 'Chalkboard SE', cursive", lineHeight: '1.5', resize: 'none' },
  contador: { position: 'absolute', bottom: '8px', right: '12px', fontSize: '12px', color: '#999', fontFamily: 'monospace' },

  btnPrimario: { width: '100%', padding: '16px', border: 'none', borderRadius: '12px', background: 'linear-gradient(135deg, #FF6B35, #E63946)', color: '#FFF', fontSize: '17px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 20px rgba(230,57,70,0.4)' },
  btnSecundario: { width: '100%', padding: '12px', background: 'transparent', border: 'none', color: '#666', fontSize: '15px', cursor: 'pointer', marginTop: '8px' },

  fab: { position: 'fixed', bottom: '24px', right: '24px', width: '60px', height: '60px', borderRadius: '50%', border: 'none', background: 'linear-gradient(135deg, #FF6B35, #E63946)', fontSize: '24px', cursor: 'pointer', boxShadow: '0 4px 24px rgba(230,57,70,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99 },
  toast: { position: 'fixed', top: '80px', left: '50%', transform: 'translateX(-50%)', backgroundColor: 'rgba(255,107,53,0.95)', color: '#FFF', padding: '12px 24px', borderRadius: '24px', fontSize: '15px', zIndex: 200, boxShadow: '0 4px 20px rgba(0,0,0,0.3)', animation: 'fadeIn 0.3s ease' },

  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 150, padding: '20px' },
  modal: { backgroundColor: '#111', borderRadius: '16px', padding: '24px', maxWidth: '360px', width: '100%', border: '1px solid #222' },
  modalTitulo: { fontSize: '20px', fontWeight: 'bold', textAlign: 'center', color: '#FFD700', margin: '0 0 8px' },
  modalSub: { fontSize: '14px', color: '#888', textAlign: 'center', marginBottom: '16px' },
  modalOpcion: { width: '100%', display: 'flex', alignItems: 'center', gap: '14px', padding: '14px', borderRadius: '12px', border: '1px solid #333', background: '#1a1a1a', cursor: 'pointer', marginBottom: '10px', textAlign: 'left', color: '#FFF' },

  regla: { color: '#CCC', fontSize: '14px', padding: '8px 0', borderBottom: '1px solid #1a1a1a', margin: 0 },
  aviso: { marginTop: '16px', padding: '14px', borderRadius: '8px', border: '1px solid #FFD700', background: 'rgba(255,215,0,0.05)' },

  spinner: { width: '32px', height: '32px', border: '3px solid #222', borderTop: '3px solid #FF6B35', borderRadius: '50%', animation: 'spin 1s linear infinite' },
};
