'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

const supabase = createClient(
  'https://xjzoabsuzbqxkriamqed.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhqem9hYnN1emJxeGtyaWFtcWVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNzYyNDcsImV4cCI6MjA5MDg1MjI0N30.gS2lG4W-f_4Vtsz7cYZK9PAX6pI8fdD0br7geqaae6E'
);

// ============================================================================
// CONSTANTES
// ============================================================================

const RADIO_KM = 1;
const MAX_CARACTERES = 200;
const MAX_NOTAS_GRATIS = 3;
const MAX_VIDEOS_DIA = 3;
const COOLDOWN_SEGUNDOS = 30;

// ============================================================================
// PALABRAS PROHIBIDAS
// ============================================================================

const PALABRAS_PROHIBIDAS = [
  'matar', 'matarte', 'matarlo', 'matarla', 'muerte', 'asesinar',
  'bomba', 'explotar', 'terrorista', 'balacera', 'disparo',
  'te voy a', 'vas a morir', 'se donde vives',
  'niño', 'niña', 'menor', 'cp', 'child',
  'cristal', 'heroina', 'fentanilo',
  'violar', 'violacion', 'secuestrar'
];

function containsProhibitedWords(text) {
  const lower = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return PALABRAS_PROHIBIDAS.some(p => lower.includes(p.normalize('NFD').replace(/[\u0300-\u036f]/g, '')));
}

function getCooldownRemaining() {
  const last = localStorage.getItem('fire_last_post');
  if (!last) return 0;
  const remaining = COOLDOWN_SEGUNDOS - (Date.now() - parseInt(last)) / 1000;
  return remaining > 0 ? Math.ceil(remaining) : 0;
}

function setLastPostTime() {
  localStorage.setItem('fire_last_post', Date.now().toString());
}

// ============================================================================
// IDENTIFICACIÓN
// ============================================================================

function getDeviceId() {
  if (typeof window === 'undefined') return 'server';
  const keys = ['fire_device_id', 'fire_did', 'fid'];
  let id = null;
  for (const k of keys) {
    const s = localStorage.getItem(k) || sessionStorage.getItem(k);
    if (s) { id = s; break; }
  }
  if (!id) id = 'device_' + crypto.randomUUID();
  keys.forEach(k => { localStorage.setItem(k, id); sessionStorage.setItem(k, id); });
  return id;
}

function generateFingerprint() {
  try {
    const c = [screen.width, screen.height, screen.colorDepth, navigator.language, 
               navigator.platform, navigator.hardwareConcurrency,
               Intl.DateTimeFormat().resolvedOptions().timeZone].join('|');
    let h = 0;
    for (let i = 0; i < c.length; i++) h = ((h << 5) - h) + c.charCodeAt(i) & 0xffffffff;
    return 'fp_' + Math.abs(h).toString(36);
  } catch { return 'fp_' + Date.now().toString(36); }
}

// ============================================================================
// UTILIDADES
// ============================================================================

function calculateDistanceKm(lat1, lng1, lat2, lng2) {
  if (!lat1 || !lng1 || !lat2 || !lng2) return 999;
  const R = 6371, dLat = (lat2-lat1)*Math.PI/180, dLng = (lng2-lng1)*Math.PI/180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function playFireSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.15);
  } catch {}
}

function playPublishSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.1);
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.3);
  } catch {}
}

function vibrate(ms = 40) { try { navigator.vibrate?.(ms); } catch {} }

function timeAgo(d) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return 'ahora';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h` : '1d';
}

// Calcula qué tan "quemada" está la nota (0 a 1) basado en tiempo
function getBurnLevel(createdAt) {
  const hoursElapsed = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
  if (hoursElapsed < 12) return 0;      // Fresca
  if (hoursElapsed < 17) return 0.3;    // Empezando a quemar
  if (hoursElapsed < 20) return 0.6;    // Quemándose
  if (hoursElapsed < 23) return 0.85;   // Casi cenizas
  return 1;                              // Por desaparecer
}

// Obtiene las horas restantes antes de que expire
function getHoursRemaining(createdAt) {
  const hoursElapsed = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
  return Math.max(0, Math.ceil(24 - hoursElapsed));
}

function isValidNoteText(t) {
  return /^[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ0-9\s.,;:!?¡¿'"()\-@#%&]+$/i.test(t) && t.trim().length > 0 && t.length <= MAX_CARACTERES;
}

// ============================================================================
// COMPONENTE PARTÍCULAS DE FUEGO
// ============================================================================

function FireParticles({ intensity = 1 }) {
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', pointerEvents: 'none', borderRadius: 16 }}>
      {[...Array(Math.min(intensity * 3, 12))].map((_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            bottom: -5,
            left: `${10 + Math.random() * 80}%`,
            width: 4 + Math.random() * 4,
            height: 4 + Math.random() * 4,
            background: `radial-gradient(circle, ${Math.random() > 0.5 ? '#FF6B35' : '#FFD700'} 0%, transparent 70%)`,
            borderRadius: '50%',
            animation: `sparkRise ${1.5 + Math.random()}s ease-out infinite`,
            animationDelay: `${Math.random() * 2}s`,
            opacity: 0.8,
          }}
        />
      ))}
    </div>
  );
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function FireNotesApp() {
  const [activeTab, setActiveTab] = useState('feed');
  const [currentScreen, setCurrentScreen] = useState('feed');
  const [notes, setNotes] = useState([]);
  const [myNotes, setMyNotes] = useState([]);
  const [noteText, setNoteText] = useState('');
  const [myReactions, setMyReactions] = useState(new Set());
  const [location, setLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState('loading');
  const [deviceId, setDeviceId] = useState('');
  const [fingerprint, setFingerprint] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);
  const [cooldownTime, setCooldownTime] = useState(0);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(null);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [showReportedToast, setShowReportedToast] = useState(false);
  const [notesUsedToday, setNotesUsedToday] = useState(0);
  const [videosWatchedToday, setVideosWatchedToday] = useState(0);
  const [extraNotesBought, setExtraNotesBought] = useState(0);
  const [hasUnlimitedToday, setHasUnlimitedToday] = useState(false);
  const [animatingNotes, setAnimatingNotes] = useState(new Set());
  
  const locationWatchRef = useRef(null);
  const cooldownRef = useRef(null);
  
  const totalAvailable = hasUnlimitedToday ? 999 : MAX_NOTAS_GRATIS + videosWatchedToday + extraNotesBought;
  const canPost = hasUnlimitedToday || notesUsedToday < totalAvailable;
  const remaining = totalAvailable - notesUsedToday;

  // ============================================================================
  // EFECTOS
  // ============================================================================
  
  useEffect(() => {
    setDeviceId(getDeviceId());
    setFingerprint(generateFingerprint());
    setCooldownTime(getCooldownRemaining());
    
    cooldownRef.current = setInterval(() => setCooldownTime(getCooldownRemaining()), 1000);
    
    if (!localStorage.getItem('fire_welcome_v3')) {
      setShowWelcomeModal(true);
      localStorage.setItem('fire_welcome_v3', 'true');
    }
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        p => { setLocation({ lat: p.coords.latitude, lng: p.coords.longitude }); setLocationStatus('ok'); },
        e => setLocationStatus(e.code === 1 ? 'denied' : 'error'),
        { enableHighAccuracy: true, timeout: 15000 }
      );
      locationWatchRef.current = navigator.geolocation.watchPosition(
        p => setLocation(prev => {
          const n = { lat: p.coords.latitude, lng: p.coords.longitude };
          if (!prev || calculateDistanceKm(prev.lat, prev.lng, n.lat, n.lng) * 1000 > 50) return n;
          return prev;
        }), () => {}, { enableHighAccuracy: true, timeout: 30000, maximumAge: 60000 }
      );
    } else setLocationStatus('error');
    
    return () => {
      if (locationWatchRef.current) navigator.geolocation.clearWatch(locationWatchRef.current);
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  useEffect(() => { if (location?.lat && deviceId) loadAllData(); }, [location, deviceId]);
  useEffect(() => {
    if (!location?.lat || !deviceId) return;
    const i = setInterval(loadNearbyNotes, 30000);
    return () => clearInterval(i);
  }, [location, deviceId]);

  // ============================================================================
  // CARGA DE DATOS
  // ============================================================================
  
  async function loadAllData() {
    setIsLoading(true);
    await Promise.all([loadNearbyNotes(), loadMyNotes(), loadUserState()]);
    setIsLoading(false);
  }

  async function loadNearbyNotes() {
    if (!location?.lat) return;
    try {
      const { data } = await supabase.from('pensamientos')
        .select('id, texto, latitud, longitud, fires, created_at, expires_at, device_id')
        .gt('expires_at', new Date().toISOString())
        .or('eliminado.is.null,eliminado.eq.false')
        .order('created_at', { ascending: false }).limit(200);
      
      const nearby = (data || [])
        .filter(n => calculateDistanceKm(location.lat, location.lng, n.latitud, n.longitud) <= RADIO_KM)
        .map(n => ({ ...n, distanceMeters: Math.round(calculateDistanceKm(location.lat, location.lng, n.latitud, n.longitud) * 1000) }));
      setNotes(nearby);
      
      const { data: r } = await supabase.from('reacciones').select('pensamiento_id').eq('device_id', deviceId);
      if (r) setMyReactions(new Set(r.map(x => x.pensamiento_id)));
    } catch (e) { console.error(e); }
  }

  async function loadMyNotes() {
    if (!deviceId) return;
    try {
      const { data } = await supabase.from('pensamientos')
        .select('id, texto, latitud, longitud, fires, created_at, expires_at')
        .eq('device_id', deviceId)
        .gt('expires_at', new Date().toISOString())
        .or('eliminado.is.null,eliminado.eq.false')
        .order('created_at', { ascending: false });
      setMyNotes(data || []);
    } catch (e) { console.error(e); }
  }

  async function loadUserState() {
    try {
      const { data } = await supabase.rpc('obtener_estado', { p_device_id: deviceId, p_fingerprint: fingerprint });
      if (data) {
        setNotesUsedToday(data.usados || 0);
        setVideosWatchedToday(data.videos || 0);
        setHasUnlimitedToday(data.ilimitado || false);
        setExtraNotesBought(data.extras || 0);
      }
    } catch (e) { console.error(e); }
  }

  // ============================================================================
  // ACCIONES
  // ============================================================================

  async function publishNote() {
    if (!location?.lat) { setErrorMessage('Necesitamos tu ubicación'); return; }
    const cd = getCooldownRemaining();
    if (cd > 0) { setErrorMessage(`Espera ${cd}s para publicar`); return; }
    if (!canPost) { setShowBuyModal(true); return; }
    if (!isValidNoteText(noteText)) { setErrorMessage('Solo letras, números y puntuación. Máx 200.'); return; }
    if (containsProhibitedWords(noteText)) { setErrorMessage('Contenido no permitido'); vibrate(100); return; }
    
    setIsSending(true); setErrorMessage('');
    
    try {
      const { data, error } = await supabase.rpc('publicar_pensamiento', {
        p_texto: noteText.trim(), p_lat: location.lat, p_lng: location.lng,
        p_device_id: deviceId, p_fingerprint: fingerprint
      });
      
      if (error || !data.ok) {
        setErrorMessage(data?.error || 'Error al publicar');
        if (data?.sin_notas) setShowBuyModal(true);
        setIsSending(false); return;
      }
      
      setLastPostTime(); setCooldownTime(COOLDOWN_SEGUNDOS);
      setIsAnimating(true); playPublishSound(); vibrate(80);
      setNotesUsedToday(data.usados);
      setNotes(prev => [{ ...data.nota, distanceMeters: 0 }, ...prev]);
      setMyNotes(prev => [data.nota, ...prev]);
      setNoteText('');
      
      setTimeout(() => {
        setIsAnimating(false);
        setShowSuccessToast(true);
        setTimeout(() => { setShowSuccessToast(false); setCurrentScreen('feed'); }, 1200);
      }, 400);
    } catch { setErrorMessage('Error de conexión'); }
    finally { setIsSending(false); }
  }

  async function toggleFire(noteId) {
    const liked = myReactions.has(noteId);
    playFireSound(); vibrate(25);
    
    // Animación de fuego
    setAnimatingNotes(prev => new Set([...prev, noteId]));
    setTimeout(() => setAnimatingNotes(prev => { const n = new Set(prev); n.delete(noteId); return n; }), 600);
    
    // Actualizar UI inmediatamente (optimista)
    const newReactions = new Set(myReactions);
    if (liked) {
      newReactions.delete(noteId);
    } else {
      newReactions.add(noteId);
    }
    setMyReactions(newReactions);
    
    // Actualizar contadores localmente
    const updateFires = prev => prev.map(n => 
      n.id === noteId ? { ...n, fires: Math.max(0, n.fires + (liked ? -1 : 1)) } : n
    );
    setNotes(updateFires);
    setMyNotes(updateFires);
    
    // Sincronizar con servidor
    try {
      console.log('Enviando toggle_fire:', { noteId, deviceId, liked });
      
      const { data, error } = await supabase.rpc('toggle_fire', { 
        p_pensamiento_id: noteId, 
        p_device_id: deviceId 
      });
      
      console.log('Respuesta toggle_fire:', { data, error });
      
      if (error) {
        console.error('Error en toggle_fire:', error);
        // Revertir si hay error
        setMyReactions(myReactions);
        const revertFires = prev => prev.map(n => 
          n.id === noteId ? { ...n, fires: Math.max(0, n.fires + (liked ? 1 : -1)) } : n
        );
        setNotes(revertFires);
        setMyNotes(revertFires);
        return;
      }
      
      // Actualizar con valor real del servidor
      if (data && typeof data.fires === 'number') {
        console.log('Actualizando fires a:', data.fires);
        setNotes(prev => prev.map(n => n.id === noteId ? { ...n, fires: data.fires } : n));
        setMyNotes(prev => prev.map(n => n.id === noteId ? { ...n, fires: data.fires } : n));
      }
    } catch (e) {
      console.error('Error de conexión en toggle_fire:', e);
    }
  }

  async function watchVideoForNote() {
    try {
      const { data } = await supabase.rpc('ver_video', { p_device_id: deviceId, p_fingerprint: fingerprint });
      if (data?.ok) { setVideosWatchedToday(data.videos); setShowBuyModal(false); vibrate(40); }
    } catch {}
  }

  async function purchaseNotes(type) {
    try {
      await supabase.from('compras').insert({ device_id: deviceId, tipo: type, fecha: new Date().toISOString().split('T')[0] });
      if (type === 'ilimitado') setHasUnlimitedToday(true);
      else setExtraNotesBought(prev => prev + 3);
      setShowBuyModal(false); vibrate(40);
    } catch {}
  }

  async function reportNote(noteId) {
    try {
      const { data, error } = await supabase.rpc('reportar_nota', { p_pensamiento_id: noteId, p_device_id: deviceId, p_razon: 'inapropiado' });
      if (error) { alert('Error: ' + error.message); return; }
      setShowReportModal(null); vibrate(25);
      if (data?.ok) {
        setShowReportedToast(true);
        setTimeout(() => setShowReportedToast(false), 2000);
        if (data.eliminado) { setNotes(p => p.filter(n => n.id !== noteId)); setMyNotes(p => p.filter(n => n.id !== noteId)); }
      }
    } catch { alert('Error de conexión'); }
  }

  // ============================================================================
  // FUNCIÓN PARA CALCULAR INTENSIDAD DE FUEGO
  // ============================================================================
  
  function getFireIntensity(fires) {
    if (fires >= 20) return 5;
    if (fires >= 10) return 4;
    if (fires >= 5) return 3;
    if (fires >= 2) return 2;
    return 1;
  }

  function getFireGradient(fires) {
    const i = getFireIntensity(fires);
    // Notas claras tipo papel que brillan más con más fuegos
    if (i >= 4) return 'linear-gradient(145deg, #FFF8E7 0%, #FFE4B5 50%, #FFD89B 100%)';
    if (i >= 3) return 'linear-gradient(145deg, #FFF8E7 0%, #FFECD2 50%, #FFE4B5 100%)';
    if (i >= 2) return 'linear-gradient(145deg, #FFFBF5 0%, #FFF5E6 50%, #FFECD2 100%)';
    return 'linear-gradient(145deg, #FFFDF9 0%, #FFF8F0 50%, #FFF5E6 100%)';
  }

  function getGlowStyle(fires) {
    const i = getFireIntensity(fires);
    if (i >= 5) return '0 8px 40px rgba(255,107,53,0.6), 0 0 60px rgba(255,60,0,0.4), 0 0 100px rgba(255,107,53,0.2)';
    if (i >= 4) return '0 6px 30px rgba(255,107,53,0.5), 0 0 50px rgba(255,60,0,0.3)';
    if (i >= 3) return '0 4px 25px rgba(255,140,66,0.4), 0 0 35px rgba(255,107,53,0.2)';
    if (i >= 2) return '0 4px 20px rgba(255,180,100,0.3)';
    return '0 4px 16px rgba(0,0,0,0.4), 0 2px 8px rgba(255,200,150,0.1)';
  }

  // ============================================================================
  // RENDER - UBICACIÓN DENEGADA
  // ============================================================================
  
  if (locationStatus === 'denied') {
    return (
      <div style={styles.container}>
        <div style={styles.centerContent}>
          <div style={{ fontSize: 72, marginBottom: 20 }}>📍</div>
          <h2 style={{ color: '#FF6B35', marginBottom: 12 }}>Activa tu ubicación</h2>
          <p style={{ color: '#888', marginBottom: 24, lineHeight: 1.6, maxWidth: 280, textAlign: 'center' }}>
            FIRE NOTES muestra notas a 1km de ti.
          </p>
          <button onClick={() => window.location.reload()} style={styles.primaryButton}>Reintentar</button>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER PRINCIPAL
  // ============================================================================
  
  const displayNotes = activeTab === 'feed' ? notes : myNotes;

  return (
    <div style={styles.container}>
      
      {/* ========== HEADER ========== */}
      <header style={styles.header}>
        <button onClick={() => setShowInfoModal(true)} style={styles.infoBtn}>
          <span style={{ fontSize: 16, fontWeight: 700 }}>?</span>
        </button>
        
        <div style={styles.logo}>
          <span style={styles.logoIcon}>🔥</span>
          <span style={styles.logoText}>FIRE</span>
          <span style={styles.logoNotes}>NOTES</span>
        </div>
        
        <div style={styles.notesIndicator}>
          {hasUnlimitedToday ? (
            <span style={{ color: '#FFD700', fontSize: 22, fontWeight: 800 }}>∞</span>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              {[...Array(3)].map((_, i) => (
                <span key={i} style={{ fontSize: 18, opacity: i < remaining ? 1 : 0.25, transition: 'all 0.3s' }}>
                  📝
                </span>
              ))}
              {remaining > 3 && <span style={{ color: '#FFD700', fontSize: 13, marginLeft: 4, fontWeight: 700 }}>+{remaining - 3}</span>}
            </div>
          )}
        </div>
      </header>

      {/* ========== TABS ========== */}
      {currentScreen === 'feed' && (
        <div style={styles.tabs}>
          <button onClick={() => setActiveTab('feed')} style={{ ...styles.tab, ...(activeTab === 'feed' ? styles.tabActive : {}) }}>
            <span style={{ marginRight: 6 }}>🌍</span>Cerca
          </button>
          <button onClick={() => setActiveTab('myNotes')} style={{ ...styles.tab, ...(activeTab === 'myNotes' ? styles.tabActive : {}) }}>
            <span style={{ marginRight: 6 }}>📝</span>Tuyas
            {myNotes.length > 0 && <span style={styles.tabBadge}>{myNotes.length}</span>}
          </button>
        </div>
      )}

      {/* ========== ZONA INDICATOR ========== */}
      {!isLoading && currentScreen === 'feed' && activeTab === 'feed' && (
        <div style={styles.zoneBar}>
          {notes.length === 0 && <span>❄️ Zona fría - sé el primero</span>}
          {notes.length > 0 && notes.length < 5 && <span>🌡️ {notes.length} nota{notes.length > 1 ? 's' : ''} cerca</span>}
          {notes.length >= 5 && notes.length < 15 && <span style={{ color: '#FF8C42' }}>🔥 ¡Zona activa! {notes.length} notas</span>}
          {notes.length >= 15 && <span style={{ color: '#FF6B35', fontWeight: 600 }}>🔥🔥🔥 ¡ZONA CALIENTE! {notes.length}</span>}
        </div>
      )}

      {/* ========== FEED ========== */}
      {currentScreen === 'feed' && (
        <main style={styles.feed}>
          {isLoading ? (
            <div style={styles.centerContent}>
              <div style={styles.spinner} />
              <p style={{ color: '#666', marginTop: 16 }}>Buscando notas...</p>
            </div>
          ) : displayNotes.length === 0 ? (
            <div style={styles.centerContent}>
              <div style={styles.emptyIcon}>🔥</div>
              <p style={{ color: '#666', marginTop: 8 }}>{activeTab === 'feed' ? 'No hay notas cerca' : 'No tienes notas'}</p>
              <p style={{ color: '#444', fontSize: 13 }}>{activeTab === 'feed' ? 'Sé el primero en encender esta zona' : 'Desaparecen en 24h'}</p>
            </div>
          ) : (
            <div style={styles.notesList}>
              {displayNotes.map((note, idx) => {
                const fires = note.fires || 0;
                const intensity = getFireIntensity(fires);
                const isLiked = myReactions.has(note.id);
                const isAnimatingFire = animatingNotes.has(note.id);
                const burnLevel = getBurnLevel(note.created_at);
                const hoursLeft = getHoursRemaining(note.created_at);
                const isLegendary = fires >= 50;
                const isPopular = fires >= 25 && fires < 50;
                const isBurning = burnLevel > 0.5;
                
                return (
                  <div
                    key={note.id}
                    style={{
                      ...styles.noteCard,
                      background: getFireGradient(fires),
                      boxShadow: getGlowStyle(fires),
                      borderColor: isBurning ? 'rgba(139,69,19,0.5)' : intensity >= 3 ? 'rgba(255,107,53,0.4)' : 'rgba(180,150,120,0.3)',
                      animation: `noteSlide 0.4s ease ${idx * 0.05}s both`,
                      opacity: 1 - (burnLevel * 0.25),
                      transform: isBurning ? `rotate(${(Math.random() - 0.5) * 2}deg)` : 'none',
                    }}
                  >
                    {/* Partículas de fuego para notas HOT */}
                    {intensity >= 4 && <FireParticles intensity={intensity} />}
                    
                    {/* Efecto de quemado en bordes */}
                    {isBurning && (
                      <div style={{
                        position: 'absolute',
                        top: 0, left: 0, right: 0, bottom: 0,
                        background: `radial-gradient(ellipse at ${burnLevel > 0.7 ? '100% 100%' : '100% 0%'}, rgba(139,69,19,${burnLevel * 0.4}) 0%, transparent 50%)`,
                        borderRadius: 16,
                        pointerEvents: 'none',
                        zIndex: 3,
                      }} />
                    )}
                    
                    {/* Líneas de papel */}
                    <div style={{
                      position: 'absolute',
                      top: 0, left: 0, right: 0, bottom: 0,
                      background: 'repeating-linear-gradient(transparent, transparent 27px, rgba(200,180,150,0.3) 27px, rgba(200,180,150,0.3) 28px)',
                      pointerEvents: 'none',
                      borderRadius: 16,
                    }} />
                    
                    {/* Badge LEGENDARIA */}
                    {isLegendary && (
                      <div style={{ ...styles.hotBadge, background: 'linear-gradient(135deg, #FFD700, #FFA500)', color: '#000' }}>
                        👑 LEGENDARIA
                      </div>
                    )}
                    
                    {/* Badge POPULAR */}
                    {isPopular && !isLegendary && (
                      <div style={{ ...styles.hotBadge, background: 'linear-gradient(135deg, #9C27B0, #E91E63)' }}>
                        ⭐ POPULAR
                      </div>
                    )}
                    
                    {/* Badge HOT */}
                    {intensity >= 4 && !isPopular && !isLegendary && (
                      <div style={styles.hotBadge}>
                        {intensity >= 5 ? '🔥 INFERNO' : '🔥 HOT'}
                      </div>
                    )}
                    
                    {/* Badge de tiempo restante */}
                    {isBurning && hoursLeft <= 6 && (
                      <div style={{
                        position: 'absolute',
                        bottom: 10,
                        left: 10,
                        background: 'rgba(139,69,19,0.8)',
                        padding: '3px 8px',
                        borderRadius: 10,
                        fontSize: 10,
                        color: '#FFF',
                        fontWeight: 600,
                        zIndex: 2,
                      }}>
                        ⏳ {hoursLeft}h restantes
                      </div>
                    )}
                    
                    {/* Texto de la nota */}
                    <p style={{
                      ...styles.noteText,
                      color: isBurning ? '#4A3728' : '#2D2016',
                      textShadow: intensity >= 3 ? '0 1px 2px rgba(255,255,255,0.3)' : 'none',
                    }}>
                      {note.texto}
                    </p>
                    
                    {/* Footer */}
                    <div style={styles.noteFooter}>
                      <span style={styles.noteMeta}>
                        {timeAgo(note.created_at)}
                        {activeTab === 'feed' && ` · ${note.distanceMeters}m`}
                      </span>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button onClick={() => setShowReportModal(note.id)} style={styles.reportBtn}>⚑</button>
                        
                        <button 
                          onClick={() => toggleFire(note.id)}
                          style={{
                            ...styles.fireBtn,
                            background: isLiked ? 'rgba(255,107,53,0.25)' : 'rgba(0,0,0,0.05)',
                            transform: isAnimatingFire ? 'scale(1.3)' : isLiked ? 'scale(1.1)' : 'scale(1)',
                            boxShadow: isLiked ? '0 0 15px rgba(255,107,53,0.4)' : 'none',
                          }}
                        >
                          <span style={{ 
                            fontSize: isLegendary ? 24 : intensity >= 4 ? 22 : 18,
                            filter: isLiked ? 'drop-shadow(0 0 8px rgba(255,107,53,0.8))' : 'none',
                            animation: isAnimatingFire ? 'firePulse 0.6s ease' : isLegendary ? 'fireFlicker 0.5s ease-in-out infinite' : intensity >= 4 ? 'fireFlicker 0.8s ease-in-out infinite' : 'none',
                          }}>{isLegendary ? '👑' : '🔥'}</span>
                          <span style={{ 
                            marginLeft: 6, 
                            fontWeight: 700, 
                            fontSize: 15,
                            color: isLegendary ? '#B8860B' : intensity >= 3 ? '#D84315' : '#5D4E37',
                          }}>{fires}</span>
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

      {/* ========== PANTALLA ESCRIBIR ========== */}
      {currentScreen === 'write' && (
        <main style={styles.writeScreen}>
          <div style={{ ...styles.writeCard, ...(isAnimating ? { animation: 'flyAway 0.4s ease forwards' } : {}) }}>
            <textarea
              value={noteText}
              onChange={e => e.target.value.length <= MAX_CARACTERES && setNoteText(e.target.value)}
              placeholder="¿Qué quieres soltar?"
              style={styles.textarea}
              autoFocus
            />
            <div style={styles.charCount}>
              <span style={{ color: noteText.length > 180 ? '#FF5252' : '#666' }}>{noteText.length}</span>
              <span style={{ color: '#444' }}>/{MAX_CARACTERES}</span>
            </div>
          </div>
          
          {errorMessage && <p style={styles.error}>{errorMessage}</p>}
          
          {cooldownTime > 0 && (
            <div style={styles.cooldownBar}>
              <span>⏱️</span> Podrás publicar en <strong>{cooldownTime}s</strong>
            </div>
          )}
          
          <button
            onClick={publishNote}
            disabled={isSending || !noteText.trim() || cooldownTime > 0}
            style={{ ...styles.primaryButton, opacity: isSending || !noteText.trim() || cooldownTime > 0 ? 0.5 : 1 }}
          >
            {isSending ? '...' : cooldownTime > 0 ? `Espera ${cooldownTime}s` : '🔥 SOLTAR'}
          </button>
          
          <button onClick={() => { setCurrentScreen('feed'); setErrorMessage(''); }} style={styles.ghostBtn}>
            Cancelar
          </button>
          
          <p style={{ color: '#444', fontSize: 12, textAlign: 'center', marginTop: 12 }}>
            📍 Se publica en tu ubicación actual
          </p>
        </main>
      )}

      {/* ========== FAB ========== */}
      {currentScreen === 'feed' && (
        <button
          onClick={() => canPost ? setCurrentScreen('write') : setShowBuyModal(true)}
          style={styles.fab}
        >
          <span style={{ fontSize: 28 }}>✏️</span>
        </button>
      )}

      {/* ========== TOASTS ========== */}
      {showSuccessToast && <div style={styles.toast}>🔥 ¡Nota soltada!</div>}
      {showReportedToast && <div style={{ ...styles.toast, background: 'linear-gradient(135deg, #2E7D32, #43A047)' }}>✓ Reportada</div>}

      {/* ========== MODAL COMPRAR ========== */}
      {showBuyModal && (
        <div style={styles.overlay} onClick={() => setShowBuyModal(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalIcon}>🔥</div>
            <h2 style={styles.modalTitle}>Sin notas</h2>
            <p style={styles.modalSub}>Consigue más:</p>
            
            {videosWatchedToday < MAX_VIDEOS_DIA && (
              <button onClick={watchVideoForNote} style={styles.optionBtn}>
                <span style={{ fontSize: 22 }}>🎬</span>
                <div>
                  <strong style={{ fontSize: 15 }}>Ver video</strong>
                  <small style={{ display: 'block', color: '#888', fontSize: 12 }}>+1 nota ({MAX_VIDEOS_DIA - videosWatchedToday} restantes)</small>
                </div>
              </button>
            )}
            
            <button onClick={() => purchaseNotes('extra3')} style={styles.optionBtn}>
              <span style={{ fontSize: 22 }}>🔥</span>
              <div>
                <strong style={{ fontSize: 15 }}>+3 notas</strong>
                <small style={{ display: 'block', color: '#888', fontSize: 12 }}>$9.99 MXN</small>
              </div>
            </button>
            
            {!hasUnlimitedToday && (
              <button onClick={() => purchaseNotes('ilimitado')} style={{ ...styles.optionBtn, borderColor: '#FFD700' }}>
                <span style={{ fontSize: 22 }}>∞</span>
                <div>
                  <strong style={{ fontSize: 15, color: '#FFD700' }}>Ilimitado hoy</strong>
                  <small style={{ display: 'block', color: '#888', fontSize: 12 }}>$29.99 MXN</small>
                </div>
              </button>
            )}
            
            <div style={styles.dividerLine}><span>o con crypto</span></div>
            
            <button onClick={() => purchaseNotes('extra3')} style={{ ...styles.optionBtn, borderColor: '#F7931A' }}>
              <span style={{ fontSize: 22 }}>₿</span>
              <div>
                <strong style={{ fontSize: 15, color: '#F7931A' }}>Bitcoin</strong>
                <small style={{ display: 'block', color: '#888', fontSize: 12 }}>Lightning Network</small>
              </div>
            </button>
            
            <button onClick={() => setShowBuyModal(false)} style={styles.ghostBtn}>Cerrar</button>
          </div>
        </div>
      )}

      {/* ========== MODAL REPORTAR ========== */}
      {showReportModal && (
        <div style={styles.overlay} onClick={() => setShowReportModal(null)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalIcon}>⚑</div>
            <h2 style={styles.modalTitle}>Reportar</h2>
            <p style={styles.modalSub}>¿Viola las reglas?</p>
            <button onClick={() => reportNote(showReportModal)} style={{ ...styles.primaryButton, background: '#C62828' }}>
              Sí, reportar
            </button>
            <button onClick={() => setShowReportModal(null)} style={styles.ghostBtn}>Cancelar</button>
            <p style={{ fontSize: 11, color: '#555', textAlign: 'center', marginTop: 12 }}>5+ reportes = eliminación</p>
          </div>
        </div>
      )}

      {/* ========== MODAL INFO ========== */}
      {showInfoModal && (
        <div style={styles.overlay} onClick={() => setShowInfoModal(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalIcon}>🔥</div>
            <h2 style={styles.modalTitle}>FIRE NOTES</h2>
            <p style={styles.modalSub}>Pensamientos anónimos cerca de ti</p>
            
            <div style={styles.rulesList}>
              <div style={styles.rule}><span>🎭</span> Eres 100% anónimo</div>
              <div style={styles.rule}><span>📍</span> Solo te leen a 1km de ti</div>
              <div style={styles.rule}><span>⏰</span> Todo desaparece en 24 horas</div>
              <div style={styles.rule}><span>🔥</span> Dale fuego a lo que te guste</div>
            </div>
            
            <div style={{
              marginTop: 20,
              padding: 16,
              borderRadius: 12,
              border: '2px solid #FFD700',
              background: 'linear-gradient(135deg, rgba(255,215,0,0.15) 0%, rgba(255,107,53,0.1) 100%)',
              textAlign: 'center'
            }}>
              <p style={{ fontWeight: 800, color: '#FFD700', margin: 0, fontSize: 15 }}>⚠️ IMPORTANTE ⚠️</p>
              <p style={{ fontSize: 14, color: '#FFF', margin: '10px 0 0 0', lineHeight: 1.6 }}>
                Nadie ve tu nombre, pero <span style={{ color: '#FF5252', fontWeight: 700 }}>no hagas cosas ilegales</span>.
              </p>
              <p style={{ fontSize: 12, color: '#999', margin: '6px 0 0 0' }}>
                Amenazas o acoso = cooperamos con la ley.
              </p>
            </div>
            
            <button onClick={() => { setShowInfoModal(false); setShowTermsModal(true); }} style={styles.linkBtn}>
              Ver términos
            </button>
            <button onClick={() => setShowInfoModal(false)} style={styles.ghostBtn}>Cerrar</button>
          </div>
        </div>
      )}

      {/* ========== MODAL TÉRMINOS ========== */}
      {showTermsModal && (
        <div style={styles.overlay} onClick={() => setShowTermsModal(false)}>
          <div style={{ ...styles.modal, maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>📜 Términos</h2>
            
            <div style={styles.termsContent}>
              <h4>EDAD</h4><p>Mínimo 13 años.</p>
              <h4>PROHIBIDO</h4><p>Amenazas, contenido de menores, violencia, acoso.</p>
              <h4>MODERACIÓN</h4><p>5+ reportes = eliminación automática.</p>
              <h4>DATOS</h4><p>Guardamos: ID dispositivo, IP, ubicación aproximada. NO guardamos: nombre, email, teléfono.</p>
              <h4>LEY</h4><p>Cooperamos con autoridades ante actividad ilegal. Jurisdicción: México.</p>
            </div>
            
            <div style={styles.termsFooter}>
              <p>Completos en: <strong>firenotesapp.com/legal</strong></p>
            </div>
            
            <button onClick={() => setShowTermsModal(false)} style={styles.primaryButton}>Entendido</button>
          </div>
        </div>
      )}

      {/* ========== MODAL BIENVENIDA ========== */}
      {showWelcomeModal && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <div style={{ fontSize: 48, textAlign: 'center', marginBottom: 16 }}>🔥</div>
            <h2 style={styles.modalTitle}>FIRE NOTES</h2>
            
            <div style={styles.welcomeList}>
              <div style={styles.welcomeItem}><span>📝</span> Escribe lo que piensas</div>
              <div style={styles.welcomeItem}><span>📍</span> Solo ven a 1km</div>
              <div style={styles.welcomeItem}><span>⏰</span> Desaparece en 24h</div>
              <div style={styles.welcomeItem}><span>🔥</span> Da fuego a lo bueno</div>
              <div style={styles.welcomeItem}><span>👤</span> 100% anónimo</div>
            </div>
            
            <button onClick={() => setShowWelcomeModal(false)} style={styles.primaryButton}>¡ENTENDIDO!</button>
          </div>
        </div>
      )}

      {/* ========== ESTILOS GLOBALES ========== */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #050505; }
        
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes noteSlide { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes flyAway { to { transform: translateY(-100px) scale(0.8) rotate(-5deg); opacity: 0; } }
        @keyframes fadeIn { from { opacity: 0; transform: translateX(-50%) translateY(-10px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
        @keyframes firePulse { 0% { transform: scale(1); } 50% { transform: scale(1.5); } 100% { transform: scale(1); } }
        @keyframes fireFlicker { 0%, 100% { transform: scale(1) rotate(0deg); } 25% { transform: scale(1.05) rotate(-2deg); } 75% { transform: scale(0.95) rotate(2deg); } }
        @keyframes sparkRise {
          0% { transform: translateY(0) scale(1); opacity: 0.8; }
          100% { transform: translateY(-60px) scale(0); opacity: 0; }
        }
        @keyframes glowPulse {
          0%, 100% { box-shadow: 0 0 30px rgba(255,107,53,0.4); }
          50% { box-shadow: 0 0 50px rgba(255,107,53,0.6); }
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// ESTILOS
// ============================================================================

const styles = {
  container: { minHeight: '100dvh', background: '#0a0a0a', color: '#FFF', fontFamily: '"Nunito", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', maxWidth: 480, margin: '0 auto' },
  
  centerContent: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: 24 },
  
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: 'linear-gradient(180deg, #0a0a0a 0%, #050505 100%)', position: 'sticky', top: 0, zIndex: 100, borderBottom: '1px solid #151515' },
  
  infoBtn: { width: 36, height: 36, borderRadius: '50%', border: '1px solid #333', background: 'rgba(255,107,53,0.1)', color: '#FF8C42', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  
  logo: { display: 'flex', alignItems: 'center', gap: 6 },
  logoIcon: { fontSize: 28, filter: 'drop-shadow(0 0 10px rgba(255,107,53,0.5))' },
  logoText: { fontSize: 24, fontWeight: 800, background: 'linear-gradient(135deg, #FF6B35 0%, #FF8C42 50%, #FFB347 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: 1 },
  logoNotes: { fontSize: 14, fontWeight: 600, color: '#FFF', letterSpacing: 2, marginLeft: 2 },
  
  notesIndicator: { minWidth: 60, display: 'flex', justifyContent: 'flex-end' },
  
  tabs: { display: 'flex', background: '#0a0a0a', borderBottom: '1px solid #151515' },
  tab: { flex: 1, padding: '14px 16px', background: 'transparent', border: 'none', color: '#555', fontSize: 14, fontWeight: 500, cursor: 'pointer', transition: '0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  tabActive: { color: '#FF8C42', borderBottom: '2px solid #FF6B35', marginBottom: -1 },
  tabBadge: { marginLeft: 6, background: 'rgba(255,107,53,0.2)', color: '#FF6B35', padding: '2px 8px', borderRadius: 10, fontSize: 12, fontWeight: 600 },
  
  zoneBar: { textAlign: 'center', padding: '10px 16px', fontSize: 13, color: '#666', background: 'rgba(255,107,53,0.02)', borderBottom: '1px solid #151515' },
  
  feed: { padding: '16px', paddingBottom: 100, minHeight: 'calc(100dvh - 140px)' },
  
  notesList: { display: 'flex', flexDirection: 'column', gap: 16 },
  
  noteCard: { position: 'relative', borderRadius: 16, padding: '20px', border: '1px solid', transition: 'all 0.3s ease', overflow: 'hidden' },
  
  hotBadge: { position: 'absolute', top: 10, right: 10, background: 'linear-gradient(135deg, #FF6B35, #E63946)', padding: '4px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', boxShadow: '0 2px 10px rgba(255,107,53,0.5)', color: '#FFF', zIndex: 2 },
  
  noteText: { color: '#2D2016', fontSize: 16, lineHeight: 1.6, margin: 0, wordBreak: 'break-word', position: 'relative', zIndex: 1, fontFamily: '"Nunito", "Comic Neue", -apple-system, sans-serif' },
  
  noteFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, position: 'relative', zIndex: 1 },
  
  noteMeta: { fontSize: 12, color: '#8B7355' },
  
  reportBtn: { background: 'transparent', border: 'none', fontSize: 14, color: '#A08060', cursor: 'pointer', padding: 4, opacity: 0.5 },
  
  fireBtn: { display: 'flex', alignItems: 'center', padding: '8px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', transition: 'all 0.2s ease' },
  
  writeScreen: { padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 16 },
  
  writeCard: { position: 'relative', background: 'linear-gradient(145deg, #0f0f0f 0%, #1a1a1a 100%)', borderRadius: 16, padding: 20, border: '1px solid #252525' },
  
  textarea: { width: '100%', minHeight: 160, background: 'transparent', border: 'none', outline: 'none', color: '#FFF', fontSize: 18, lineHeight: 1.6, resize: 'none', fontFamily: 'inherit' },
  
  charCount: { position: 'absolute', bottom: 12, right: 16, fontSize: 12, fontFamily: 'monospace' },
  
  error: { color: '#FF5252', textAlign: 'center', fontSize: 14 },
  
  cooldownBar: { textAlign: 'center', padding: 12, background: 'rgba(255,107,53,0.1)', borderRadius: 12, color: '#FF8C42', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 },
  
  primaryButton: { width: '100%', padding: 16, border: 'none', borderRadius: 14, background: 'linear-gradient(135deg, #FF6B35 0%, #E63946 100%)', color: '#FFF', fontSize: 17, fontWeight: 700, cursor: 'pointer', letterSpacing: 1, boxShadow: '0 4px 20px rgba(255,107,53,0.4)', transition: 'all 0.2s ease' },
  
  ghostBtn: { width: '100%', padding: 14, background: 'transparent', border: 'none', color: '#666', fontSize: 15, cursor: 'pointer', marginTop: 8 },
  
  fab: { position: 'fixed', bottom: 24, right: 24, width: 64, height: 64, borderRadius: '50%', border: 'none', background: 'linear-gradient(135deg, #FF6B35, #E63946)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 30px rgba(255,107,53,0.5)', zIndex: 99 },
  
  toast: { position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg, #FF6B35, #E63946)', color: '#FFF', padding: '12px 24px', borderRadius: 24, fontSize: 15, fontWeight: 600, zIndex: 200, boxShadow: '0 4px 30px rgba(0,0,0,0.5)', animation: 'fadeIn 0.3s ease' },
  
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 150, padding: 20, backdropFilter: 'blur(5px)' },
  
  modal: { background: '#0f0f0f', borderRadius: 20, padding: 28, maxWidth: 360, width: '100%', border: '1px solid #202020' },
  
  modalIcon: { fontSize: 40, textAlign: 'center', marginBottom: 8 },
  modalTitle: { fontSize: 22, fontWeight: 700, textAlign: 'center', color: '#FFF', margin: '0 0 4px 0' },
  modalSub: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 20 },
  
  optionBtn: { width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 14, border: '1px solid #252525', background: '#1a1a1a', cursor: 'pointer', marginBottom: 10, textAlign: 'left', color: '#FFF', transition: 'all 0.2s ease' },
  
  dividerLine: { display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '16px 0', color: '#444', fontSize: 12, gap: 12 },
  
  rulesList: { marginTop: 16 },
  rule: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', color: '#CCC', fontSize: 14 },
  
  warningBox: { marginTop: 20, padding: 16, borderRadius: 12, border: '1px solid rgba(255,215,0,0.3)', background: 'rgba(255,215,0,0.05)' },
  
  linkBtn: { display: 'block', background: 'none', border: 'none', color: '#666', fontSize: 13, textDecoration: 'underline', cursor: 'pointer', textAlign: 'center', width: '100%', marginTop: 16 },
  
  termsContent: { marginTop: 16, fontSize: 13, color: '#AAA', lineHeight: 1.7 },
  termsFooter: { marginTop: 20, padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 8, textAlign: 'center', fontSize: 12, color: '#666' },
  
  welcomeList: { marginTop: 16 },
  welcomeItem: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', fontSize: 15, color: '#CCC' },
  
  spinner: { width: 36, height: 36, border: '3px solid #1a1a1a', borderTopColor: '#FF6B35', borderRadius: '50%', animation: 'spin 1s linear infinite' },
  
  emptyIcon: { fontSize: 56, opacity: 0.3 },
};
