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
const COOLDOWN_SEGUNDOS = 30; // Cooldown entre publicaciones

// ============================================================================
// LISTA NEGRA DE PALABRAS (Backup mientras configuramos IA)
// ============================================================================

const PALABRAS_PROHIBIDAS = [
  // Violencia
  'matar', 'matarte', 'matarlo', 'matarla', 'matarlos', 'muerte', 'muerto', 'asesinar', 'asesinato',
  'bomba', 'explotar', 'explosion', 'terrorista', 'terrorismo', 'balacera', 'disparo', 'disparar',
  // Amenazas
  'te voy a', 'voy a matarte', 'vas a morir', 'te busco', 'se donde vives', 'te encuentro',
  // Sexual con menores
  'niño', 'niña', 'menor', 'cp', 'child', 'kids',
  // Drogas pesadas
  'cristal', 'meta', 'heroina', 'fentanilo', 'crack',
  // Otros
  'violar', 'violacion', 'secuestrar', 'secuestro'
];

// ============================================================================
// FUNCIONES DE SEGURIDAD
// ============================================================================

/**
 * Verifica si el texto contiene palabras prohibidas
 */
function containsProhibitedWords(text) {
  const textoLower = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  for (const palabra of PALABRAS_PROHIBIDAS) {
    const palabraNorm = palabra.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (textoLower.includes(palabraNorm)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Obtiene el tiempo restante de cooldown
 */
function getCooldownRemaining() {
  const lastPost = localStorage.getItem('fire_last_post');
  if (!lastPost) return 0;
  
  const elapsed = (Date.now() - parseInt(lastPost)) / 1000;
  const remaining = COOLDOWN_SEGUNDOS - elapsed;
  
  return remaining > 0 ? Math.ceil(remaining) : 0;
}

/**
 * Registra el tiempo de publicación
 */
function setLastPostTime() {
  localStorage.setItem('fire_last_post', Date.now().toString());
}

// ============================================================================
// FUNCIONES DE IDENTIFICACIÓN (MEJORADAS)
// ============================================================================

/**
 * Obtiene o genera un ID único para el dispositivo
 * COMPATIBLE con versiones anteriores
 */
function getDeviceId() {
  if (typeof window === 'undefined') return 'server';
  
  // Buscar en todas las posibles keys anteriores para compatibilidad
  const possibleKeys = ['fire_device_id', 'fire_did', 'fid'];
  let deviceId = null;
  
  for (const key of possibleKeys) {
    const stored = localStorage.getItem(key) || sessionStorage.getItem(key);
    if (stored) {
      deviceId = stored;
      break;
    }
  }
  
  // Si no existe, crear uno nuevo
  if (!deviceId) {
    deviceId = 'device_' + crypto.randomUUID();
  }
  
  // Guardar en todas las keys para compatibilidad futura
  for (const key of possibleKeys) {
    localStorage.setItem(key, deviceId);
    sessionStorage.setItem(key, deviceId);
  }
  
  return deviceId;
}

/**
 * Genera un fingerprint más robusto del dispositivo
 */
function generateFingerprint() {
  try {
    const components = [
      // Pantalla
      screen.width,
      screen.height,
      screen.colorDepth,
      screen.pixelDepth,
      window.devicePixelRatio,
      
      // Navegador
      navigator.language,
      navigator.languages?.join(','),
      navigator.platform,
      navigator.hardwareConcurrency,
      navigator.maxTouchPoints,
      
      // Timezone
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      new Date().getTimezoneOffset(),
      
      // Canvas fingerprint básico
      getCanvasFingerprint(),
      
      // WebGL
      getWebGLFingerprint(),
    ].filter(Boolean).join('|');
    
    // Generar hash
    let hash = 0;
    for (let i = 0; i < components.length; i++) {
      const char = components.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    return 'fp_' + Math.abs(hash).toString(36) + '_' + components.length;
  } catch (error) {
    return 'fp_fallback_' + Date.now().toString(36);
  }
}

/**
 * Genera fingerprint de canvas
 */
function getCanvasFingerprint() {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Fire Notes 🔥', 2, 2);
    return canvas.toDataURL().slice(-50);
  } catch {
    return 'no-canvas';
  }
}

/**
 * Genera fingerprint de WebGL
 */
function getWebGLFingerprint() {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return 'no-webgl';
    
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (!debugInfo) return 'webgl-basic';
    
    const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
    
    return (vendor + renderer).slice(0, 50);
  } catch {
    return 'no-webgl';
  }
}

// ============================================================================
// FUNCIONES DE UBICACIÓN
// ============================================================================

/**
 * Calcula la distancia en kilómetros entre dos puntos
 */
function calculateDistanceKm(lat1, lng1, lat2, lng2) {
  if (!lat1 || !lng1 || !lat2 || !lng2) return 999;
  
  const EARTH_RADIUS_KM = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  
  const a = Math.sin(dLat / 2) ** 2 + 
            Math.cos(lat1 * Math.PI / 180) * 
            Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLng / 2) ** 2;
  
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Detecta si la ubicación cambió de forma sospechosa (teletransportación)
 */
function isLocationSuspicious(newLat, newLng, lastLat, lastLng, lastTime) {
  if (!lastLat || !lastLng || !lastTime) return false;
  
  const distanceKm = calculateDistanceKm(lastLat, lastLng, newLat, newLng);
  const timeHours = (Date.now() - lastTime) / (1000 * 60 * 60);
  
  // Velocidad en km/h
  const speedKmh = distanceKm / timeHours;
  
  // Si "viajó" a más de 500 km/h, es sospechoso (avión normal ~900, pero damos margen)
  // Pero si el tiempo es muy corto y la distancia es grande, definitivamente es fake
  if (timeHours < 0.1 && distanceKm > 10) { // Menos de 6 min y más de 10km
    return true;
  }
  
  if (speedKmh > 1000) { // Más rápido que un avión comercial
    return true;
  }
  
  return false;
}

// ============================================================================
// FUNCIONES DE UTILIDAD
// ============================================================================

/**
 * Reproduce sonido de fuego
 */
function playFireSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.frequency.setValueAtTime(500, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  } catch (e) {}
}

/**
 * Reproduce sonido de publicación
 */
function playPublishSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch (e) {}
}

/**
 * Vibración
 */
function vibrate(ms = 40) {
  try { navigator.vibrate?.(ms); } catch (e) {}
}

/**
 * Formato de tiempo relativo
 */
function timeAgo(dateString) {
  const minutes = Math.floor((Date.now() - new Date(dateString).getTime()) / 60000);
  if (minutes < 1) return 'ahora';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours}h` : '1d';
}

/**
 * Calcula nivel de "quemado" (0 a 1)
 */
function calculateBurnLevel(dateString) {
  const elapsed = Date.now() - new Date(dateString).getTime();
  return Math.min(elapsed / (1000 * 60 * 60 * 24), 1);
}

/**
 * Valida texto de nota
 */
function isValidNoteText(text) {
  const pattern = /^[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ0-9\s.,;:!?¡¿'"()\-@#%&]+$/i;
  return pattern.test(text) && text.trim().length > 0 && text.length <= MAX_CARACTERES;
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function FireNotesApp() {
  
  // Estados - Navegación
  const [activeTab, setActiveTab] = useState('feed');
  const [currentScreen, setCurrentScreen] = useState('feed');
  
  // Estados - Datos
  const [notes, setNotes] = useState([]);
  const [myNotes, setMyNotes] = useState([]);
  const [noteText, setNoteText] = useState('');
  const [myReactions, setMyReactions] = useState(new Set());
  
  // Estados - Ubicación
  const [location, setLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState('loading');
  const [lastLocation, setLastLocation] = useState(null);
  const [lastLocationTime, setLastLocationTime] = useState(null);
  
  // Estados - Identificación
  const [deviceId, setDeviceId] = useState('');
  const [fingerprint, setFingerprint] = useState('');
  
  // Estados - UI
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);
  const [cooldownTime, setCooldownTime] = useState(0);
  
  // Estados - Modales
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(null);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  
  // Estados - Toasts
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [showReportedToast, setShowReportedToast] = useState(false);
  
  // Estados - Límites
  const [notesUsedToday, setNotesUsedToday] = useState(0);
  const [videosWatchedToday, setVideosWatchedToday] = useState(0);
  const [extraNotesBought, setExtraNotesBought] = useState(0);
  const [hasUnlimitedToday, setHasUnlimitedToday] = useState(false);
  
  // Refs
  const locationWatchRef = useRef(null);
  const cooldownIntervalRef = useRef(null);
  
  // Cálculos derivados
  const totalNotesAvailable = hasUnlimitedToday ? 999 : MAX_NOTAS_GRATIS + videosWatchedToday + extraNotesBought;
  const canPostNote = hasUnlimitedToday || notesUsedToday < totalNotesAvailable;
  const notesRemaining = totalNotesAvailable - notesUsedToday;

  // ============================================================================
  // EFECTOS
  // ============================================================================
  
  useEffect(() => {
    // Inicializar identificadores
    setDeviceId(getDeviceId());
    setFingerprint(generateFingerprint());
    
    // Verificar cooldown inicial
    setCooldownTime(getCooldownRemaining());
    
    // Iniciar intervalo de cooldown
    cooldownIntervalRef.current = setInterval(() => {
      setCooldownTime(getCooldownRemaining());
    }, 1000);
    
    // Bienvenida primera vez
    if (!localStorage.getItem('fire_welcome_v2')) {
      setShowWelcomeModal(true);
      localStorage.setItem('fire_welcome_v2', 'true');
    }
    
    // Cargar última ubicación conocida
    const savedLoc = localStorage.getItem('fire_last_location');
    const savedTime = localStorage.getItem('fire_last_location_time');
    if (savedLoc && savedTime) {
      try {
        const loc = JSON.parse(savedLoc);
        setLastLocation(loc);
        setLastLocationTime(parseInt(savedTime));
      } catch (e) {}
    }
    
    // Geolocalización
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          
          // Verificar si la ubicación es sospechosa
          if (lastLocation && isLocationSuspicious(newLoc.lat, newLoc.lng, lastLocation.lat, lastLocation.lng, lastLocationTime)) {
            console.warn('Ubicación sospechosa detectada');
            // Aún permitimos, pero podríamos registrar esto en el backend
          }
          
          setLocation(newLoc);
          setLocationStatus('ok');
          
          // Guardar para detectar teletransportación
          localStorage.setItem('fire_last_location', JSON.stringify(newLoc));
          localStorage.setItem('fire_last_location_time', Date.now().toString());
        },
        (err) => setLocationStatus(err.code === 1 ? 'denied' : 'error'),
        { enableHighAccuracy: true, timeout: 15000 }
      );
      
      locationWatchRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          setLocation(prev => {
            const newLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            if (!prev || calculateDistanceKm(prev.lat, prev.lng, newLoc.lat, newLoc.lng) * 1000 > 50) {
              localStorage.setItem('fire_last_location', JSON.stringify(newLoc));
              localStorage.setItem('fire_last_location_time', Date.now().toString());
              return newLoc;
            }
            return prev;
          });
        },
        () => {},
        { enableHighAccuracy: true, timeout: 30000, maximumAge: 60000 }
      );
    } else {
      setLocationStatus('error');
    }
    
    return () => {
      if (locationWatchRef.current) navigator.geolocation.clearWatch(locationWatchRef.current);
      if (cooldownIntervalRef.current) clearInterval(cooldownIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (location?.lat && deviceId) loadAllData();
  }, [location, deviceId]);

  useEffect(() => {
    if (!location?.lat || !deviceId) return;
    const interval = setInterval(loadNearbyNotes, 30000);
    return () => clearInterval(interval);
  }, [location, deviceId]);

  // ============================================================================
  // FUNCIONES DE CARGA
  // ============================================================================
  
  async function loadAllData() {
    setIsLoading(true);
    await Promise.all([loadNearbyNotes(), loadMyNotes(), loadUserState()]);
    setIsLoading(false);
  }

  async function loadNearbyNotes() {
    if (!location?.lat) return;
    
    try {
      const { data } = await supabase
        .from('pensamientos')
        .select('id, texto, latitud, longitud, fires, created_at, expires_at, device_id')
        .gt('expires_at', new Date().toISOString())
        .or('eliminado.is.null,eliminado.eq.false')
        .order('created_at', { ascending: false })
        .limit(200);
      
      const nearby = (data || [])
        .filter(n => calculateDistanceKm(location.lat, location.lng, n.latitud, n.longitud) <= RADIO_KM)
        .map(n => ({
          ...n,
          distanceMeters: Math.round(calculateDistanceKm(location.lat, location.lng, n.latitud, n.longitud) * 1000)
        }));
      
      setNotes(nearby);
      
      const { data: reactions } = await supabase
        .from('reacciones')
        .select('pensamiento_id')
        .eq('device_id', deviceId);
      
      if (reactions) {
        setMyReactions(new Set(reactions.map(r => r.pensamiento_id)));
      }
    } catch (e) {
      console.error('Error cargando notas:', e);
    }
  }

  async function loadMyNotes() {
    if (!deviceId) return;
    
    try {
      const { data } = await supabase
        .from('pensamientos')
        .select('id, texto, latitud, longitud, fires, created_at, expires_at')
        .eq('device_id', deviceId)
        .gt('expires_at', new Date().toISOString())
        .or('eliminado.is.null,eliminado.eq.false')
        .order('created_at', { ascending: false });
      
      setMyNotes(data || []);
    } catch (e) {
      console.error('Error cargando mis notas:', e);
    }
  }

  async function loadUserState() {
    try {
      const { data } = await supabase.rpc('obtener_estado', {
        p_device_id: deviceId,
        p_fingerprint: fingerprint
      });
      
      if (data) {
        setNotesUsedToday(data.usados || 0);
        setVideosWatchedToday(data.videos || 0);
        setHasUnlimitedToday(data.ilimitado || false);
        setExtraNotesBought(data.extras || 0);
      }
    } catch (e) {
      console.error('Error cargando estado:', e);
    }
  }

  // ============================================================================
  // FUNCIONES DE ACCIÓN
  // ============================================================================

  async function publishNote() {
    // Validar ubicación
    if (!location?.lat) {
      setErrorMessage('Necesitamos tu ubicación para publicar');
      return;
    }
    
    // Validar cooldown
    const remaining = getCooldownRemaining();
    if (remaining > 0) {
      setErrorMessage(`Espera ${remaining} segundos para publicar otra nota`);
      return;
    }
    
    // Validar notas disponibles
    if (!canPostNote) {
      setShowBuyModal(true);
      return;
    }
    
    // Validar texto
    if (!isValidNoteText(noteText)) {
      setErrorMessage('Solo letras, números y puntuación. Máx 200 caracteres.');
      return;
    }
    
    // Validar palabras prohibidas
    if (containsProhibitedWords(noteText)) {
      setErrorMessage('Tu nota contiene contenido no permitido. Por favor, modifícala.');
      vibrate(100);
      return;
    }
    
    setIsSending(true);
    setErrorMessage('');
    
    try {
      const { data, error } = await supabase.rpc('publicar_pensamiento', {
        p_texto: noteText.trim(),
        p_lat: location.lat,
        p_lng: location.lng,
        p_device_id: deviceId,
        p_fingerprint: fingerprint
      });
      
      if (error || !data.ok) {
        setErrorMessage(data?.error || 'Error al publicar');
        if (data?.sin_notas) setShowBuyModal(true);
        setIsSending(false);
        return;
      }
      
      // Éxito - registrar tiempo para cooldown
      setLastPostTime();
      setCooldownTime(COOLDOWN_SEGUNDOS);
      
      setIsAnimating(true);
      playPublishSound();
      vibrate(80);
      
      setNotesUsedToday(data.usados);
      setNotes(prev => [{ ...data.nota, distanceMeters: 0 }, ...prev]);
      setMyNotes(prev => [data.nota, ...prev]);
      setNoteText('');
      
      setTimeout(() => {
        setIsAnimating(false);
        setShowSuccessToast(true);
        setTimeout(() => {
          setShowSuccessToast(false);
          setCurrentScreen('feed');
        }, 1200);
      }, 400);
      
    } catch (e) {
      setErrorMessage('Error de conexión');
    } finally {
      setIsSending(false);
    }
  }

  async function toggleFire(noteId) {
    const alreadyLiked = myReactions.has(noteId);
    playFireSound();
    vibrate(25);
    
    setMyReactions(prev => {
      const next = new Set(prev);
      alreadyLiked ? next.delete(noteId) : next.add(noteId);
      return next;
    });
    
    const update = prev => prev.map(n => 
      n.id === noteId ? { ...n, fires: n.fires + (alreadyLiked ? -1 : 1) } : n
    );
    setNotes(update);
    setMyNotes(update);
    
    try {
      const { data } = await supabase.rpc('toggle_fire', {
        p_pensamiento_id: noteId,
        p_device_id: deviceId
      });
      
      if (data?.fires !== undefined) {
        const sync = prev => prev.map(n => n.id === noteId ? { ...n, fires: data.fires } : n);
        setNotes(sync);
        setMyNotes(sync);
      }
    } catch (e) {}
  }

  async function watchVideoForNote() {
    try {
      const { data } = await supabase.rpc('ver_video', {
        p_device_id: deviceId,
        p_fingerprint: fingerprint
      });
      
      if (data?.ok) {
        setVideosWatchedToday(data.videos);
        setShowBuyModal(false);
        vibrate(40);
      }
    } catch (e) {}
  }

  async function purchaseNotes(type) {
    try {
      await supabase.from('compras').insert({
        device_id: deviceId,
        tipo: type,
        fecha: new Date().toISOString().split('T')[0]
      });
      
      if (type === 'ilimitado') {
        setHasUnlimitedToday(true);
      } else {
        setExtraNotesBought(prev => prev + 3);
      }
      
      setShowBuyModal(false);
      vibrate(40);
    } catch (e) {}
  }

  async function reportNote(noteId) {
    try {
      const { data, error } = await supabase.rpc('reportar_nota', {
        p_pensamiento_id: noteId,
        p_device_id: deviceId,
        p_razon: 'inapropiado'
      });
      
      if (error) {
        alert('Error: ' + error.message);
        return;
      }
      
      setShowReportModal(null);
      vibrate(25);
      
      if (data?.ok) {
        setShowReportedToast(true);
        setTimeout(() => setShowReportedToast(false), 2000);
        
        if (data.eliminado) {
          setNotes(prev => prev.filter(n => n.id !== noteId));
          setMyNotes(prev => prev.filter(n => n.id !== noteId));
        }
      }
    } catch (e) {
      alert('Error de conexión');
    }
  }

  // ============================================================================
  // RENDER - Ubicación denegada
  // ============================================================================
  
  if (locationStatus === 'denied') {
    return (
      <div style={styles.container}>
        <div style={styles.centerContent}>
          <div style={{ fontSize: 72, marginBottom: 20 }}>📍</div>
          <h2 style={{ color: '#FF6B35', marginBottom: 12 }}>Activa tu ubicación</h2>
          <p style={{ color: '#999', marginBottom: 24, lineHeight: 1.6, maxWidth: 280 }}>
            FIRE NOTES muestra notas a 1km de ti. Sin ubicación no funciona.
          </p>
          <button onClick={() => location.reload()} style={styles.primaryButton}>
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER - App Principal
  // ============================================================================
  
  return (
    <div style={styles.container}>
      
      {/* HEADER */}
      <header style={styles.header}>
        <button onClick={() => setShowInfoModal(true)} style={styles.infoButton}>?</button>
        
        <div style={styles.logoContainer}>
          <span style={{ fontSize: 26 }}>🔥</span>
          <span style={styles.logoText}>FIRE</span>
          <span style={styles.logoSubtext}>NOTES</span>
        </div>
        
        <div style={styles.notesCounter}>
          {hasUnlimitedToday ? (
            <span style={{ color: '#FFD700', fontSize: 20, fontWeight: 700 }}>∞</span>
          ) : (
            <>
              {[...Array(3)].map((_, i) => (
                <span key={i} style={{ fontSize: 16, opacity: i < notesRemaining ? 1 : 0.2, transition: '0.3s' }}>
                  {i < notesRemaining ? '📝' : '⬜'}
                </span>
              ))}
              {notesRemaining > 3 && (
                <span style={{ color: '#FFD700', fontSize: 12, fontWeight: 700, marginLeft: 4 }}>
                  +{notesRemaining - 3}
                </span>
              )}
            </>
          )}
        </div>
      </header>

      {/* TABS */}
      {currentScreen === 'feed' && (
        <div style={styles.tabsContainer}>
          <button 
            onClick={() => setActiveTab('feed')} 
            style={{ ...styles.tab, ...(activeTab === 'feed' ? styles.tabActive : {}) }}
          >
            🌍 Cerca de ti
          </button>
          <button 
            onClick={() => setActiveTab('myNotes')} 
            style={{ ...styles.tab, ...(activeTab === 'myNotes' ? styles.tabActive : {}) }}
          >
            📝 Tus notas ({myNotes.length})
          </button>
        </div>
      )}

      {/* INDICADOR DE ZONA */}
      {!isLoading && currentScreen === 'feed' && activeTab === 'feed' && (
        <div style={styles.zoneIndicator}>
          {notes.length === 0 && '❄️ Zona fría - sé el primero'}
          {notes.length > 0 && notes.length < 5 && `🌡️ ${notes.length} nota${notes.length > 1 ? 's' : ''} cerca`}
          {notes.length >= 5 && notes.length < 15 && `🔥 ¡Zona activa! - ${notes.length} notas`}
          {notes.length >= 15 && <span style={{ color: '#FF6B35' }}>🔥🔥🔥 ¡Zona caliente! - {notes.length} notas</span>}
        </div>
      )}

      {/* FEED */}
      {currentScreen === 'feed' && (
        <main style={styles.feedContainer}>
          {isLoading ? (
            <div style={styles.centerContent}>
              <div style={styles.spinner}></div>
              <p style={{ color: '#666', marginTop: 16 }}>Buscando notas cerca de ti...</p>
            </div>
          ) : (activeTab === 'feed' ? notes : myNotes).length === 0 ? (
            <div style={styles.centerContent}>
              <div style={{ fontSize: 52 }}>🔥</div>
              <p style={{ color: '#888', marginTop: 12 }}>
                {activeTab === 'feed' ? 'No hay notas cerca de ti' : 'No tienes notas activas'}
              </p>
              <p style={{ color: '#555', fontSize: 14 }}>
                {activeTab === 'feed' ? 'Sé el primero en soltar un pensamiento' : 'Tus notas desaparecen en 24 horas'}
              </p>
            </div>
          ) : (
            <div style={styles.notesGrid}>
              {(activeTab === 'feed' ? notes : myNotes).map((note, index) => {
                const burnLevel = calculateBurnLevel(note.created_at);
                const isHot = note.fires >= 10;
                const isMediumHot = note.fires >= 5 && note.fires < 10;
                const isLiked = myReactions.has(note.id);
                
                return (
                  <div 
                    key={note.id} 
                    style={{ 
                      ...styles.noteCard,
                      opacity: 1 - burnLevel * 0.25,
                      boxShadow: isHot 
                        ? '0 8px 32px rgba(255,107,53,0.4), 0 0 30px rgba(255,107,53,0.2), inset 0 0 20px rgba(255,107,53,0.05)'
                        : isMediumHot 
                          ? '0 6px 24px rgba(255,152,0,0.3), 0 0 15px rgba(255,152,0,0.1)'
                          : '0 4px 20px rgba(0,0,0,0.35)',
                      border: isHot 
                        ? '2px solid rgba(255,107,53,0.5)' 
                        : isMediumHot 
                          ? '1px solid rgba(255,152,0,0.3)'
                          : '1px solid rgba(255,255,255,0.05)',
                      animation: `noteAppear 0.4s ease ${index * 0.04}s both`,
                      transform: isHot ? 'scale(1.02)' : 'scale(1)',
                    }}
                  >
                    {/* Efecto de brillo para notas calientes */}
                    {isHot && <div style={styles.hotGlow}></div>}
                    
                    {/* Líneas de papel */}
                    <div style={styles.noteLines}></div>
                    
                    {/* Indicador de popularidad */}
                    {isHot && (
                      <div style={styles.hotBadge}>
                        🔥 HOT
                      </div>
                    )}
                    
                    {/* Efecto de quemado */}
                    {burnLevel > 0.75 && <div style={styles.burnEffect}></div>}
                    
                    {/* Texto */}
                    <p style={styles.noteText}>{note.texto}</p>
                    
                    {/* Footer */}
                    <div style={styles.noteFooter}>
                      <span style={styles.noteTime}>
                        {timeAgo(note.created_at)}
                        {activeTab === 'feed' ? ` · ${note.distanceMeters}m` : ''}
                      </span>
                      
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <button onClick={() => setShowReportModal(note.id)} style={styles.reportButton}>
                          ⚑
                        </button>
                        
                        <button 
                          onClick={() => toggleFire(note.id)} 
                          style={{ 
                            ...styles.fireButton,
                            background: isLiked ? 'rgba(255,107,53,0.2)' : 'transparent',
                            transform: isLiked ? 'scale(1.15)' : 'scale(1)',
                            boxShadow: isLiked ? '0 0 10px rgba(255,107,53,0.3)' : 'none',
                          }}
                        >
                          <span style={{ 
                            animation: isHot ? 'flicker 0.4s infinite' : 'none',
                            fontSize: isHot ? 20 : 16,
                          }}>
                            🔥
                          </span>
                          <span style={{ fontWeight: 700, marginLeft: 4, color: isHot ? '#FF6B35' : '#2D2A26' }}>
                            {note.fires}
                          </span>
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

      {/* PANTALLA ESCRIBIR */}
      {currentScreen === 'write' && (
        <main style={styles.writeContainer}>
          <div style={{ ...styles.writePaper, ...(isAnimating ? { animation: 'flyUp 0.4s ease forwards' } : {}) }}>
            <div style={styles.noteLines}></div>
            <textarea 
              value={noteText} 
              onChange={(e) => e.target.value.length <= MAX_CARACTERES && setNoteText(e.target.value)} 
              placeholder="Suelta tu pensamiento..." 
              style={styles.textInput}
              autoFocus 
            />
            <div style={styles.charCounter}>
              <span style={{ color: noteText.length > 180 ? '#E63946' : '#8B7355' }}>
                {noteText.length}
              </span>/{MAX_CARACTERES}
            </div>
          </div>
          
          {errorMessage && (
            <p style={{ color: '#FF5252', textAlign: 'center', fontSize: 14, padding: '0 10px' }}>
              {errorMessage}
            </p>
          )}
          
          {/* Indicador de cooldown */}
          {cooldownTime > 0 && (
            <div style={styles.cooldownIndicator}>
              ⏱️ Podrás publicar en {cooldownTime}s
            </div>
          )}
          
          <button 
            onClick={publishNote} 
            disabled={isSending || !noteText.trim() || cooldownTime > 0} 
            style={{ 
              ...styles.primaryButton, 
              opacity: isSending || !noteText.trim() || cooldownTime > 0 ? 0.5 : 1 
            }}
          >
            {isSending ? 'Soltando...' : cooldownTime > 0 ? `Espera ${cooldownTime}s` : '🔥 SOLTAR'}
          </button>
          
          <button onClick={() => { setCurrentScreen('feed'); setErrorMessage(''); }} style={styles.ghostButton}>
            Cancelar
          </button>
          
          {location && (
            <p style={{ color: '#555', fontSize: 12, textAlign: 'center', marginTop: 8 }}>
              📍 Se publicará en tu ubicación actual
            </p>
          )}
        </main>
      )}

      {/* FAB */}
      {currentScreen === 'feed' && (
        <button 
          onClick={() => canPostNote ? setCurrentScreen('write') : setShowBuyModal(true)} 
          style={styles.fab}
        >
          ✏️
        </button>
      )}

      {/* TOASTS */}
      {showSuccessToast && <div style={styles.toast}>🔥 ¡Nota soltada!</div>}
      {showReportedToast && <div style={{ ...styles.toast, background: 'rgba(76,175,80,0.95)' }}>✓ Nota reportada</div>}

      {/* MODAL: COMPRAR */}
      {showBuyModal && (
        <div style={styles.overlay} onClick={() => setShowBuyModal(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>Se acabaron tus notas 🔥</h2>
            <p style={styles.modalSubtitle}>Consigue más para seguir soltando:</p>
            
            {videosWatchedToday < MAX_VIDEOS_DIA && (
              <button onClick={watchVideoForNote} style={styles.buyOption}>
                <span style={styles.buyOptionIcon}>🎬</span>
                <div>
                  <strong>Ver un video</strong>
                  <p style={styles.buyOptionDesc}>+1 nota gratis ({MAX_VIDEOS_DIA - videosWatchedToday} restantes)</p>
                </div>
              </button>
            )}
            
            <button onClick={() => purchaseNotes('extra3')} style={styles.buyOption}>
              <span style={styles.buyOptionIcon}>🔥</span>
              <div>
                <strong>+3 pensamientos</strong>
                <p style={styles.buyOptionDesc}>$9.99 MXN</p>
              </div>
            </button>
            
            {!hasUnlimitedToday && (
              <button onClick={() => purchaseNotes('ilimitado')} style={styles.buyOption}>
                <span style={styles.buyOptionIcon}>∞</span>
                <div>
                  <strong>Ilimitado hoy</strong>
                  <p style={styles.buyOptionDesc}>$29.99 MXN</p>
                </div>
              </button>
            )}
            
            <div style={styles.divider}><span>o paga con</span></div>
            
            <button onClick={() => purchaseNotes('extra3')} style={{ ...styles.buyOption, borderColor: '#F7931A' }}>
              <span style={styles.buyOptionIcon}>₿</span>
              <div>
                <strong>Bitcoin / Crypto</strong>
                <p style={styles.buyOptionDesc}>+3 notas · Lightning Network</p>
              </div>
            </button>
            
            <button onClick={() => setShowBuyModal(false)} style={styles.ghostButton}>Cerrar</button>
          </div>
        </div>
      )}

      {/* MODAL: REPORTAR */}
      {showReportModal && (
        <div style={styles.overlay} onClick={() => setShowReportModal(null)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>⚑ Reportar nota</h2>
            <p style={styles.modalSubtitle}>¿Esta nota viola las reglas?</p>
            <button onClick={() => reportNote(showReportModal)} style={{ ...styles.primaryButton, background: '#E53935' }}>
              Sí, reportar
            </button>
            <button onClick={() => setShowReportModal(null)} style={styles.ghostButton}>Cancelar</button>
            <p style={{ fontSize: 12, color: '#555', textAlign: 'center', marginTop: 12 }}>
              5+ reportes = eliminación automática
            </p>
          </div>
        </div>
      )}

      {/* MODAL: INFO */}
      {showInfoModal && (
        <div style={styles.overlay} onClick={() => setShowInfoModal(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>🔥 FIRE NOTES</h2>
            <p style={{ textAlign: 'center', color: '#888', fontStyle: 'italic', marginBottom: 16 }}>
              Pensamientos anónimos que flotan a 1km
            </p>
            
            <div style={styles.infoSection}>
              <h3 style={{ ...styles.infoTitle, color: '#4CAF50' }}>✅ Permitido</h3>
              <p style={styles.infoRule}>Decir lo que piensas sin filtro</p>
              <p style={styles.infoRule}>Quejarte de lo que sea</p>
              <p style={styles.infoRule}>Confesar algo (sin nombres)</p>
              <p style={styles.infoRule}>Dar tu opinión honesta</p>
            </div>
            
            <div style={styles.infoSection}>
              <h3 style={{ ...styles.infoTitle, color: '#E53935' }}>❌ Prohibido</h3>
              <p style={styles.infoRule}>Amenazar a alguien con nombre</p>
              <p style={styles.infoRule}>Contenido de menores de edad</p>
              <p style={styles.infoRule}>Acosar a personas identificables</p>
            </div>
            
            <div style={styles.warningBox}>
              <p style={{ fontWeight: 'bold', textAlign: 'center', color: '#FFD700' }}>⚠ IMPORTANTE</p>
              <p style={{ textAlign: 'center', fontWeight: 'bold', color: '#FFF', marginTop: 8 }}>
                Eres anónimo, pero NO invisible.
              </p>
              <p style={{ textAlign: 'center', fontSize: 13, color: '#AAA', marginTop: 8 }}>
                Guardamos registros técnicos. Actividad ilegal = cooperamos con autoridades.
              </p>
            </div>
            
            <button onClick={() => { setShowInfoModal(false); setShowTermsModal(true); }} style={{ ...styles.linkButton, marginTop: 16 }}>
              Ver Términos y Privacidad
            </button>
            
            <button onClick={() => setShowInfoModal(false)} style={{ ...styles.ghostButton, marginTop: 12 }}>Cerrar</button>
          </div>
        </div>
      )}

      {/* MODAL: TÉRMINOS */}
      {showTermsModal && (
        <div style={styles.overlay} onClick={() => setShowTermsModal(false)}>
          <div style={{ ...styles.modal, maxWidth: 420, maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>📜 Términos y Privacidad</h2>
            
            <div style={styles.legalContent}>
              <p>Al usar FIRE NOTES aceptas estos términos.</p>
              
              <h4 style={styles.legalHeading}>EDAD MÍNIMA</h4>
              <p>Debes tener al menos 13 años.</p>
              
              <h4 style={styles.legalHeading}>PROHIBIDO</h4>
              <p>Amenazas, contenido de menores, incitación a violencia, acoso identificable.</p>
              
              <h4 style={styles.legalHeading}>MODERACIÓN</h4>
              <p>5+ reportes = eliminación. Contenido ilegal = eliminación inmediata.</p>
              
              <h4 style={styles.legalHeading}>DATOS</h4>
              <p><strong>Guardamos:</strong> ID dispositivo, IP, ubicación aproximada.</p>
              <p><strong>NO guardamos:</strong> Nombre, email, teléfono.</p>
              
              <h4 style={styles.legalHeading}>LEY</h4>
              <p>Ante actividad ilegal, cooperamos con autoridades. Jurisdicción: México.</p>
              
              <div style={styles.legalFooter}>
                <p>Términos completos: <strong>firenotesapp.com/legal</strong></p>
              </div>
            </div>
            
            <button onClick={() => setShowTermsModal(false)} style={{ ...styles.primaryButton, marginTop: 16 }}>Entendido</button>
          </div>
        </div>
      )}

      {/* MODAL: BIENVENIDA */}
      {showWelcomeModal && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h2 style={styles.modalTitle}>¡Bienvenido a FIRE NOTES! 🔥</h2>
            
            <div style={{ padding: '16px 0' }}>
              <p style={{ ...styles.infoRule, borderBottom: 'none', padding: '12px 0' }}>📝 <strong>Escribe</strong> lo que piensas</p>
              <p style={{ ...styles.infoRule, borderBottom: 'none', padding: '12px 0' }}>📍 <strong>Solo ven</strong> personas a 1km</p>
              <p style={{ ...styles.infoRule, borderBottom: 'none', padding: '12px 0' }}>⏰ <strong>Desaparece</strong> en 24 horas</p>
              <p style={{ ...styles.infoRule, borderBottom: 'none', padding: '12px 0' }}>🔥 <strong>Da fuego</strong> a lo que te gusta</p>
              <p style={{ ...styles.infoRule, borderBottom: 'none', padding: '12px 0' }}>👤 <strong>100% anónimo</strong></p>
            </div>
            
            <button onClick={() => setShowWelcomeModal(false)} style={styles.primaryButton}>¡Entendido!</button>
          </div>
        </div>
      )}

      {/* CSS */}
      <style jsx global>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes flicker { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.8; transform: scale(1.1); } }
        @keyframes flyUp { to { transform: translateY(-60px) rotate(-3deg) scale(0.9); opacity: 0; } }
        @keyframes noteAppear { from { opacity: 0; transform: scale(0.95) translateY(15px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateX(-50%) translateY(-10px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
        @keyframes glow { 0%, 100% { box-shadow: 0 0 20px rgba(255,107,53,0.3); } 50% { box-shadow: 0 0 30px rgba(255,107,53,0.5); } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #000; }
      `}</style>
      
    </div>
  );
}

// ============================================================================
// ESTILOS
// ============================================================================

const styles = {
  container: { 
    minHeight: '100dvh', 
    backgroundColor: '#000', 
    color: '#FFF', 
    fontFamily: "'Georgia', serif", 
    maxWidth: 480, 
    margin: '0 auto', 
    position: 'relative' 
  },
  
  centerContent: { 
    display: 'flex', 
    flexDirection: 'column', 
    alignItems: 'center', 
    justifyContent: 'center', 
    minHeight: '60vh', 
    padding: 24, 
    textAlign: 'center' 
  },
  
  header: { 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    padding: '16px 20px', 
    position: 'sticky', 
    top: 0, 
    zIndex: 100, 
    backgroundColor: '#000', 
    borderBottom: '1px solid #1a1a1a' 
  },
  
  infoButton: { 
    width: 36, 
    height: 36, 
    borderRadius: '50%', 
    border: '1px solid #333', 
    background: 'transparent', 
    color: '#888', 
    fontSize: 16, 
    cursor: 'pointer', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  
  logoContainer: { display: 'flex', alignItems: 'center', gap: 8 },
  
  logoText: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    background: 'linear-gradient(135deg, #FF6B35, #E63946)', 
    WebkitBackgroundClip: 'text', 
    WebkitTextFillColor: 'transparent', 
    letterSpacing: 2 
  },
  
  logoSubtext: { fontSize: 14, fontWeight: 'normal', color: '#FFF', letterSpacing: 1, opacity: 0.9 },
  
  notesCounter: { display: 'flex', alignItems: 'center', gap: 2, minWidth: 70, justifyContent: 'flex-end' },
  
  tabsContainer: { display: 'flex', borderBottom: '1px solid #1a1a1a' },
  
  tab: { flex: 1, padding: 12, background: 'transparent', border: 'none', color: '#666', fontSize: 14, cursor: 'pointer', transition: '0.2s' },
  
  tabActive: { color: '#FF6B35', borderBottom: '2px solid #FF6B35', marginBottom: -1 },
  
  zoneIndicator: { 
    textAlign: 'center', 
    padding: '10px 16px', 
    fontSize: 13, 
    color: '#777', 
    fontStyle: 'italic', 
    backgroundColor: 'rgba(255,255,255,0.02)', 
    borderBottom: '1px solid #1a1a1a' 
  },
  
  feedContainer: { padding: 16, paddingBottom: 100, minHeight: 'calc(100dvh - 140px)' },
  
  notesGrid: { display: 'flex', flexDirection: 'column', gap: 18 },
  
  noteCard: { 
    position: 'relative', 
    backgroundColor: '#F5E6D3', 
    borderRadius: 6, 
    padding: '22px 20px 18px', 
    overflow: 'hidden', 
    transition: 'all 0.3s ease' 
  },
  
  hotGlow: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    background: 'linear-gradient(45deg, rgba(255,107,53,0.3), rgba(230,57,70,0.3), rgba(255,107,53,0.3))',
    borderRadius: 8,
    zIndex: -1,
    animation: 'glow 2s ease-in-out infinite',
  },
  
  hotBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    background: 'linear-gradient(135deg, #FF6B35, #E63946)',
    color: '#FFF',
    padding: '3px 8px',
    borderRadius: 10,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  
  noteLines: { 
    position: 'absolute', 
    top: 0, left: 0, right: 0, bottom: 0, 
    background: 'repeating-linear-gradient(0deg, transparent, transparent 28px, rgba(0,0,0,0.03) 28px, rgba(0,0,0,0.03) 29px)', 
    pointerEvents: 'none' 
  },
  
  burnEffect: { 
    position: 'absolute', 
    top: 0, left: 0, right: 0, bottom: 0, 
    background: 'linear-gradient(135deg, transparent 85%, rgba(139,69,19,0.2) 100%)', 
    borderRadius: 6, 
    pointerEvents: 'none' 
  },
  
  noteText: { 
    color: '#2D2A26', 
    fontSize: 17, 
    fontStyle: 'italic', 
    lineHeight: 1.6, 
    position: 'relative', 
    zIndex: 1, 
    margin: 0, 
    wordBreak: 'break-word' 
  },
  
  noteFooter: { 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginTop: 14, 
    position: 'relative', 
    zIndex: 1 
  },
  
  noteTime: { fontSize: 12, color: '#8B7355' },
  
  reportButton: { 
    background: 'transparent', 
    border: 'none', 
    fontSize: 14, 
    cursor: 'pointer', 
    padding: 4, 
    color: '#8B7355', 
    opacity: 0.4 
  },
  
  fireButton: { 
    background: 'transparent', 
    border: 'none', 
    fontSize: 16, 
    cursor: 'pointer', 
    padding: '6px 12px', 
    borderRadius: 14, 
    color: '#2D2A26', 
    transition: 'all 0.2s ease', 
    display: 'flex', 
    alignItems: 'center' 
  },
  
  writeContainer: { padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 16 },
  
  writePaper: { 
    position: 'relative', 
    backgroundColor: '#F5E6D3', 
    borderRadius: 6, 
    padding: 24, 
    minHeight: 200, 
    boxShadow: '2px 4px 12px rgba(0,0,0,0.4)' 
  },
  
  textInput: { 
    width: '100%', 
    minHeight: 150, 
    background: 'transparent', 
    border: 'none', 
    outline: 'none', 
    color: '#2D2A26', 
    fontSize: 18, 
    fontStyle: 'italic', 
    fontFamily: "'Georgia', serif", 
    lineHeight: '29px', 
    resize: 'none', 
    position: 'relative', 
    zIndex: 1 
  },
  
  charCounter: { position: 'absolute', bottom: 8, right: 12, fontSize: 12, fontFamily: 'monospace', zIndex: 1 },
  
  cooldownIndicator: {
    textAlign: 'center',
    padding: '10px',
    backgroundColor: 'rgba(255,107,53,0.1)',
    borderRadius: 8,
    color: '#FF6B35',
    fontSize: 14,
  },
  
  primaryButton: { 
    width: '100%', 
    padding: 16, 
    border: 'none', 
    borderRadius: 12, 
    background: 'linear-gradient(135deg, #FF6B35, #E63946)', 
    color: '#FFF', 
    fontSize: 18, 
    fontWeight: 'bold', 
    fontFamily: "'Georgia', serif", 
    letterSpacing: 2, 
    cursor: 'pointer', 
    boxShadow: '0 0 20px rgba(230,57,70,0.4)' 
  },
  
  ghostButton: { 
    width: '100%', 
    padding: 12, 
    background: 'transparent', 
    border: 'none', 
    color: '#666', 
    fontSize: 16, 
    cursor: 'pointer', 
    marginTop: 8 
  },
  
  linkButton: { 
    display: 'block', 
    background: 'none', 
    border: 'none', 
    color: '#666', 
    fontSize: 12, 
    textDecoration: 'underline', 
    cursor: 'pointer', 
    textAlign: 'center', 
    width: '100%' 
  },
  
  fab: { 
    position: 'fixed', 
    bottom: 24, 
    right: 24, 
    width: 64, 
    height: 64, 
    borderRadius: '50%', 
    border: 'none', 
    background: 'linear-gradient(135deg, #FF6B35, #E63946)', 
    fontSize: 26, 
    cursor: 'pointer', 
    boxShadow: '0 4px 24px rgba(230,57,70,0.6)', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    zIndex: 99 
  },
  
  toast: { 
    position: 'fixed', 
    top: 80, 
    left: '50%', 
    transform: 'translateX(-50%)', 
    backgroundColor: 'rgba(255,107,53,0.95)', 
    color: '#FFF', 
    padding: '12px 24px', 
    borderRadius: 24, 
    fontSize: 16, 
    zIndex: 200, 
    boxShadow: '0 4px 20px rgba(0,0,0,0.4)', 
    animation: 'fadeIn 0.3s ease' 
  },
  
  overlay: { 
    position: 'fixed', 
    top: 0, left: 0, right: 0, bottom: 0, 
    backgroundColor: 'rgba(0,0,0,0.85)', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    zIndex: 150, 
    padding: 20 
  },
  
  modal: { 
    backgroundColor: '#111', 
    borderRadius: 16, 
    padding: 28, 
    maxWidth: 380, 
    width: '100%', 
    border: '1px solid #222' 
  },
  
  modalTitle: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', color: '#FFD700', margin: '0 0 8px 0' },
  
  modalSubtitle: { fontSize: 14, color: '#888', textAlign: 'center', marginBottom: 20, fontStyle: 'italic' },
  
  buyOption: { 
    width: '100%', 
    display: 'flex', 
    alignItems: 'center', 
    gap: 16, 
    padding: 16, 
    borderRadius: 12, 
    border: '1px solid #333', 
    background: '#1a1a1a', 
    cursor: 'pointer', 
    marginBottom: 12, 
    textAlign: 'left', 
    color: '#FFF' 
  },
  
  buyOptionIcon: { fontSize: 28, flexShrink: 0 },
  
  buyOptionDesc: { fontSize: 13, color: '#888', margin: '4px 0 0 0' },
  
  divider: { display: 'flex', alignItems: 'center', gap: 12, margin: '16px 0', color: '#555', fontSize: 12, justifyContent: 'center' },
  
  infoSection: { marginTop: 16 },
  
  infoTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 8 },
  
  infoRule: { color: '#CCC', fontSize: 14, margin: 0, padding: '6px 0', borderBottom: '1px solid #1a1a1a' },
  
  warningBox: { marginTop: 16, padding: 16, borderRadius: 8, border: '2px solid #FFD700', backgroundColor: 'rgba(255,215,0,0.05)' },
  
  legalContent: { marginTop: 16, fontSize: 13, color: '#AAA', lineHeight: 1.7 },
  
  legalHeading: { fontSize: 14, color: '#FFD700', fontWeight: 'bold', marginBottom: 6, marginTop: 16 },
  
  legalFooter: { marginTop: 20, padding: 12, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 8, textAlign: 'center', fontSize: 12, color: '#888' },
  
  spinner: { width: 32, height: 32, border: '3px solid #222', borderTop: '3px solid #FF6B35', borderRadius: '50%', animation: 'spin 1s linear infinite' },
};
