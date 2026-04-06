'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

// ============================================================================
// CONFIGURACIÓN DE SUPABASE
// ============================================================================

const supabase = createClient(
  'https://xjzoabsuzbqxkriamqed.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhqem9hYnN1emJxeGtyaWFtcWVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNzYyNDcsImV4cCI6MjA5MDg1MjI0N30.gS2lG4W-f_4Vtsz7cYZK9PAX6pI8fdD0br7geqaae6E'
);

// ============================================================================
// CONSTANTES
// ============================================================================

const RADIO_KM = 1; // Radio de visibilidad de notas en kilómetros
const MAX_CARACTERES = 200; // Máximo de caracteres por nota
const MAX_NOTAS_GRATIS = 3; // Notas gratis por día
const MAX_VIDEOS_DIA = 3; // Máximo de videos por día para obtener notas extra

// ============================================================================
// FUNCIONES DE UTILIDAD - SONIDOS
// ============================================================================

/**
 * Reproduce un sonido "pop" al dar fuego a una nota
 */
function playFireSound() {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.frequency.setValueAtTime(500, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(150, audioContext.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.12, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.1);
  } catch (error) {
    // Silenciar errores de audio
  }
}

/**
 * Reproduce un sonido "whoosh" al publicar una nota
 */
function playPublishSound() {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(80, audioContext.currentTime + 0.3);
    
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (error) {
    // Silenciar errores de audio
  }
}

/**
 * Hace vibrar el dispositivo (si está soportado)
 */
function vibrate(milliseconds = 40) {
  try {
    if (navigator.vibrate) {
      navigator.vibrate(milliseconds);
    }
  } catch (error) {
    // Silenciar errores de vibración
  }
}

// ============================================================================
// FUNCIONES DE UTILIDAD - IDENTIFICACIÓN
// ============================================================================

/**
 * Obtiene o genera un ID único para el dispositivo
 */
function getDeviceId() {
  if (typeof window === 'undefined') return 'server';
  
  let deviceId = localStorage.getItem('fire_device_id') || sessionStorage.getItem('fire_device_id');
  
  if (!deviceId) {
    deviceId = 'device_' + crypto.randomUUID();
    localStorage.setItem('fire_device_id', deviceId);
    sessionStorage.setItem('fire_device_id', deviceId);
  }
  
  return deviceId;
}

/**
 * Genera un fingerprint básico del dispositivo
 */
function generateFingerprint() {
  try {
    const components = [
      screen.width,
      screen.height,
      navigator.language,
      Intl.DateTimeFormat().resolvedOptions().timeZone
    ].join('|');
    
    let hash = 0;
    for (let i = 0; i < components.length; i++) {
      hash = ((hash << 5) - hash) + components.charCodeAt(i);
      hash = hash & hash;
    }
    
    return 'fp_' + Math.abs(hash).toString(36);
  } catch (error) {
    return 'fp_unknown';
  }
}

// ============================================================================
// FUNCIONES DE UTILIDAD - GEOLOCALIZACIÓN
// ============================================================================

/**
 * Calcula la distancia en kilómetros entre dos puntos geográficos
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

// ============================================================================
// FUNCIONES DE UTILIDAD - FORMATO
// ============================================================================

/**
 * Convierte una fecha a formato "hace X tiempo"
 */
function timeAgo(dateString) {
  const minutes = Math.floor((Date.now() - new Date(dateString).getTime()) / 60000);
  
  if (minutes < 1) return 'ahora';
  if (minutes < 60) return `${minutes}m`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  
  return '1d';
}

/**
 * Calcula el porcentaje de "quemado" de una nota (0 a 1)
 */
function calculateBurnLevel(dateString) {
  const millisecondsInDay = 1000 * 60 * 60 * 24;
  const elapsed = Date.now() - new Date(dateString).getTime();
  return Math.min(elapsed / millisecondsInDay, 1);
}

/**
 * Valida el texto de una nota
 */
function isValidNoteText(text) {
  const validPattern = /^[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ0-9\s.,;:!?¡¿'"()\-@#%&]+$/i;
  return validPattern.test(text) && text.trim().length > 0 && text.length <= MAX_CARACTERES;
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function FireNotesApp() {
  
  // --------------------------------------------------------------------------
  // ESTADOS - Navegación
  // --------------------------------------------------------------------------
  
  const [activeTab, setActiveTab] = useState('feed'); // 'feed' o 'myNotes'
  const [currentScreen, setCurrentScreen] = useState('feed'); // 'feed' o 'write'
  
  // --------------------------------------------------------------------------
  // ESTADOS - Datos
  // --------------------------------------------------------------------------
  
  const [notes, setNotes] = useState([]);
  const [myNotes, setMyNotes] = useState([]);
  const [noteText, setNoteText] = useState('');
  const [myReactions, setMyReactions] = useState(new Set());
  
  // --------------------------------------------------------------------------
  // ESTADOS - Ubicación
  // --------------------------------------------------------------------------
  
  const [location, setLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState('loading'); // 'loading', 'ok', 'denied', 'error'
  
  // --------------------------------------------------------------------------
  // ESTADOS - Identificación
  // --------------------------------------------------------------------------
  
  const [deviceId, setDeviceId] = useState('');
  const [fingerprint, setFingerprint] = useState('');
  
  // --------------------------------------------------------------------------
  // ESTADOS - UI
  // --------------------------------------------------------------------------
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);
  
  // --------------------------------------------------------------------------
  // ESTADOS - Modales
  // --------------------------------------------------------------------------
  
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(null); // ID de la nota a reportar
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  
  // --------------------------------------------------------------------------
  // ESTADOS - Toasts
  // --------------------------------------------------------------------------
  
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [showReportedToast, setShowReportedToast] = useState(false);
  
  // --------------------------------------------------------------------------
  // ESTADOS - Límites de uso
  // --------------------------------------------------------------------------
  
  const [notesUsedToday, setNotesUsedToday] = useState(0);
  const [videosWatchedToday, setVideosWatchedToday] = useState(0);
  const [extraNotesBought, setExtraNotesBought] = useState(0);
  const [hasUnlimitedToday, setHasUnlimitedToday] = useState(false);
  
  // --------------------------------------------------------------------------
  // REFS
  // --------------------------------------------------------------------------
  
  const locationWatchRef = useRef(null);
  
  // --------------------------------------------------------------------------
  // CÁLCULOS DERIVADOS
  // --------------------------------------------------------------------------
  
  const totalNotesAvailable = hasUnlimitedToday 
    ? 999 
    : MAX_NOTAS_GRATIS + videosWatchedToday + extraNotesBought;
  
  const canPostNote = hasUnlimitedToday || notesUsedToday < totalNotesAvailable;
  
  const notesRemaining = totalNotesAvailable - notesUsedToday;

  // --------------------------------------------------------------------------
  // EFECTO - Inicialización
  // --------------------------------------------------------------------------
  
  useEffect(() => {
    // Configurar identificadores
    setDeviceId(getDeviceId());
    setFingerprint(generateFingerprint());
    
    // Mostrar bienvenida si es primera vez
    if (!localStorage.getItem('fire_welcome_shown_v1')) {
      setShowWelcomeModal(true);
      localStorage.setItem('fire_welcome_shown_v1', 'true');
    }
    
    // Configurar geolocalización
    if (navigator.geolocation) {
      // Obtener ubicación inicial
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setLocationStatus('ok');
        },
        (error) => {
          setLocationStatus(error.code === 1 ? 'denied' : 'error');
        },
        { enableHighAccuracy: true, timeout: 15000 }
      );
      
      // Observar cambios de ubicación
      locationWatchRef.current = navigator.geolocation.watchPosition(
        (position) => {
          setLocation(prevLocation => {
            // Solo actualizar si se movió más de 50 metros
            if (!prevLocation) {
              return { lat: position.coords.latitude, lng: position.coords.longitude };
            }
            
            const distanceMoved = calculateDistanceKm(
              prevLocation.lat, 
              prevLocation.lng, 
              position.coords.latitude, 
              position.coords.longitude
            ) * 1000;
            
            if (distanceMoved > 50) {
              return { lat: position.coords.latitude, lng: position.coords.longitude };
            }
            
            return prevLocation;
          });
        },
        () => {},
        { enableHighAccuracy: true, timeout: 30000, maximumAge: 60000 }
      );
    } else {
      setLocationStatus('error');
    }
    
    // Cleanup
    return () => {
      if (locationWatchRef.current) {
        navigator.geolocation.clearWatch(locationWatchRef.current);
      }
    };
  }, []);

  // --------------------------------------------------------------------------
  // EFECTO - Cargar datos cuando hay ubicación
  // --------------------------------------------------------------------------
  
  useEffect(() => {
    if (location?.lat && deviceId) {
      loadAllData();
    }
  }, [location, deviceId]);

  // --------------------------------------------------------------------------
  // EFECTO - Actualizar notas periódicamente
  // --------------------------------------------------------------------------
  
  useEffect(() => {
    if (!location?.lat || !deviceId) return;
    
    const interval = setInterval(loadNearbyNotes, 30000);
    
    return () => clearInterval(interval);
  }, [location, deviceId]);

  // --------------------------------------------------------------------------
  // FUNCIONES - Carga de datos
  // --------------------------------------------------------------------------
  
  /**
   * Carga todos los datos necesarios
   */
  async function loadAllData() {
    setIsLoading(true);
    
    await Promise.all([
      loadNearbyNotes(),
      loadMyNotes(),
      loadUserState()
    ]);
    
    setIsLoading(false);
  }

  /**
   * Carga las notas cercanas a la ubicación actual
   */
  async function loadNearbyNotes() {
    if (!location?.lat) return;
    
    try {
      // Obtener notas activas
      const { data: notesData } = await supabase
        .from('pensamientos')
        .select('id, texto, latitud, longitud, fires, created_at, expires_at, device_id')
        .gt('expires_at', new Date().toISOString())
        .or('eliminado.is.null,eliminado.eq.false')
        .order('created_at', { ascending: false })
        .limit(200);
      
      // Filtrar por distancia y agregar metros
      const nearbyNotes = (notesData || [])
        .filter(note => calculateDistanceKm(location.lat, location.lng, note.latitud, note.longitud) <= RADIO_KM)
        .map(note => ({
          ...note,
          distanceMeters: Math.round(calculateDistanceKm(location.lat, location.lng, note.latitud, note.longitud) * 1000)
        }));
      
      setNotes(nearbyNotes);
      
      // Cargar mis reacciones
      const { data: reactionsData } = await supabase
        .from('reacciones')
        .select('pensamiento_id')
        .eq('device_id', deviceId);
      
      if (reactionsData) {
        setMyReactions(new Set(reactionsData.map(r => r.pensamiento_id)));
      }
      
    } catch (error) {
      console.error('Error cargando notas:', error);
    }
  }

  /**
   * Carga mis propias notas
   */
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
      
    } catch (error) {
      console.error('Error cargando mis notas:', error);
    }
  }

  /**
   * Carga el estado del usuario (notas usadas, videos vistos, etc.)
   */
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
      
    } catch (error) {
      console.error('Error cargando estado:', error);
    }
  }

  // --------------------------------------------------------------------------
  // FUNCIONES - Acciones del usuario
  // --------------------------------------------------------------------------

  /**
   * Publica una nueva nota
   */
  async function publishNote() {
    // Validaciones
    if (!location?.lat) {
      setErrorMessage('Necesitamos tu ubicación para publicar');
      return;
    }
    
    if (!canPostNote) {
      setShowBuyModal(true);
      return;
    }
    
    if (!isValidNoteText(noteText)) {
      setErrorMessage('Solo letras, números y puntuación básica. Máximo 200 caracteres.');
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
        if (data?.sin_notas) {
          setShowBuyModal(true);
        }
        setIsSending(false);
        return;
      }
      
      // Éxito
      setIsAnimating(true);
      playPublishSound();
      vibrate(80);
      
      // Actualizar estados
      setNotesUsedToday(data.usados);
      setNotes(prev => [{ ...data.nota, distanceMeters: 0 }, ...prev]);
      setMyNotes(prev => [data.nota, ...prev]);
      setNoteText('');
      
      // Mostrar toast y volver al feed
      setTimeout(() => {
        setIsAnimating(false);
        setShowSuccessToast(true);
        setTimeout(() => {
          setShowSuccessToast(false);
          setCurrentScreen('feed');
        }, 1200);
      }, 400);
      
    } catch (error) {
      setErrorMessage('Error de conexión');
    } finally {
      setIsSending(false);
    }
  }

  /**
   * Da o quita fuego a una nota
   */
  async function toggleFire(noteId) {
    const alreadyLiked = myReactions.has(noteId);
    
    // Feedback inmediato
    playFireSound();
    vibrate(25);
    
    // Actualizar UI optimistamente
    setMyReactions(prev => {
      const next = new Set(prev);
      if (alreadyLiked) {
        next.delete(noteId);
      } else {
        next.add(noteId);
      }
      return next;
    });
    
    const updateNotes = (prevNotes) => prevNotes.map(note => {
      if (note.id === noteId) {
        return { ...note, fires: note.fires + (alreadyLiked ? -1 : 1) };
      }
      return note;
    });
    
    setNotes(updateNotes);
    setMyNotes(updateNotes);
    
    // Sincronizar con servidor
    try {
      const { data } = await supabase.rpc('toggle_fire', {
        p_pensamiento_id: noteId,
        p_device_id: deviceId
      });
      
      if (data?.fires !== undefined) {
        const syncNotes = (prevNotes) => prevNotes.map(note => {
          if (note.id === noteId) {
            return { ...note, fires: data.fires };
          }
          return note;
        });
        
        setNotes(syncNotes);
        setMyNotes(syncNotes);
      }
      
    } catch (error) {
      console.error('Error al dar fuego:', error);
    }
  }

  /**
   * Ve un video para obtener una nota extra
   */
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
      
    } catch (error) {
      console.error('Error al ver video:', error);
    }
  }

  /**
   * Compra notas extra
   */
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
      
    } catch (error) {
      console.error('Error al comprar:', error);
    }
  }

  /**
   * Reporta una nota
   */
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
      
      // Cerrar modal
      setShowReportModal(null);
      vibrate(25);
      
      // Mostrar confirmación si fue exitoso
      if (data?.ok) {
        setShowReportedToast(true);
        setTimeout(() => setShowReportedToast(false), 2000);
        
        // Si fue eliminada, quitarla de la lista
        if (data.eliminado) {
          setNotes(prev => prev.filter(n => n.id !== noteId));
          setMyNotes(prev => prev.filter(n => n.id !== noteId));
        }
      }
      
    } catch (error) {
      alert('Error de conexión');
    }
  }

  // --------------------------------------------------------------------------
  // RENDER - Pantalla de ubicación denegada
  // --------------------------------------------------------------------------
  
  if (locationStatus === 'denied') {
    return (
      <div style={styles.container}>
        <div style={styles.centerContent}>
          <div style={{ fontSize: '72px', marginBottom: '20px' }}>📍</div>
          <h2 style={{ color: '#FF6B35', marginBottom: '12px' }}>
            Activa tu ubicación
          </h2>
          <p style={{ color: '#999', marginBottom: '24px', lineHeight: 1.6, maxWidth: '280px' }}>
            FIRE NOTES muestra notas a 1km de ti. Sin ubicación no funciona.
          </p>
          <button onClick={() => location.reload()} style={styles.primaryButton}>
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // RENDER - Aplicación principal
  // --------------------------------------------------------------------------
  
  return (
    <div style={styles.container}>
      
      {/* ================================================================== */}
      {/* HEADER */}
      {/* ================================================================== */}
      
      <header style={styles.header}>
        {/* Botón de información */}
        <button 
          onClick={() => setShowInfoModal(true)} 
          style={styles.infoButton}
        >
          ?
        </button>
        
        {/* Logo */}
        <div style={styles.logoContainer}>
          <span style={{ fontSize: '26px' }}>🔥</span>
          <span style={styles.logoText}>FIRE</span>
          <span style={styles.logoSubtext}>NOTES</span>
        </div>
        
        {/* Contador de notas */}
        <div style={styles.notesCounter}>
          {hasUnlimitedToday ? (
            <span style={{ color: '#FFD700', fontSize: '20px', fontWeight: 700 }}>∞</span>
          ) : (
            <>
              {[...Array(3)].map((_, index) => (
                <span 
                  key={index} 
                  style={{ 
                    fontSize: '16px', 
                    opacity: index < notesRemaining ? 1 : 0.2, 
                    transition: '0.3s' 
                  }}
                >
                  {index < notesRemaining ? '📝' : '⬜'}
                </span>
              ))}
              {notesRemaining > 3 && (
                <span style={{ color: '#FFD700', fontSize: '12px', fontWeight: 700, marginLeft: 4 }}>
                  +{notesRemaining - 3}
                </span>
              )}
            </>
          )}
        </div>
      </header>

      {/* ================================================================== */}
      {/* TABS */}
      {/* ================================================================== */}
      
      {currentScreen === 'feed' && (
        <div style={styles.tabsContainer}>
          <button 
            onClick={() => setActiveTab('feed')} 
            style={{ 
              ...styles.tab, 
              ...(activeTab === 'feed' ? styles.tabActive : {}) 
            }}
          >
            🌍 Cerca de ti
          </button>
          <button 
            onClick={() => setActiveTab('myNotes')} 
            style={{ 
              ...styles.tab, 
              ...(activeTab === 'myNotes' ? styles.tabActive : {}) 
            }}
          >
            📝 Tus notas ({myNotes.length})
          </button>
        </div>
      )}

      {/* ================================================================== */}
      {/* INDICADOR DE ZONA */}
      {/* ================================================================== */}
      
      {!isLoading && currentScreen === 'feed' && activeTab === 'feed' && (
        <div style={styles.zoneIndicator}>
          {notes.length === 0 && '❄️ Zona fría - sé el primero'}
          {notes.length > 0 && notes.length < 5 && `🌡️ ${notes.length} nota${notes.length > 1 ? 's' : ''} cerca`}
          {notes.length >= 5 && notes.length < 15 && `🔥 ¡Zona activa! - ${notes.length} notas`}
          {notes.length >= 15 && (
            <span style={{ color: '#FF6B35' }}>
              🔥🔥🔥 ¡Zona caliente! - {notes.length} notas
            </span>
          )}
        </div>
      )}

      {/* ================================================================== */}
      {/* FEED DE NOTAS */}
      {/* ================================================================== */}
      
      {currentScreen === 'feed' && (
        <main style={styles.feedContainer}>
          {isLoading ? (
            // Estado de carga
            <div style={styles.centerContent}>
              <div style={styles.spinner}></div>
              <p style={{ color: '#666', marginTop: 16 }}>
                Buscando notas cerca de ti...
              </p>
            </div>
          ) : (activeTab === 'feed' ? notes : myNotes).length === 0 ? (
            // Sin notas
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
            // Lista de notas
            <div style={styles.notesGrid}>
              {(activeTab === 'feed' ? notes : myNotes).map((note, index) => {
                const burnLevel = calculateBurnLevel(note.created_at);
                const isHot = note.fires >= 10;
                const isLiked = myReactions.has(note.id);
                
                return (
                  <div 
                    key={note.id} 
                    style={{ 
                      ...styles.noteCard,
                      opacity: 1 - burnLevel * 0.25,
                      boxShadow: isHot 
                        ? '0 8px 32px rgba(0,0,0,0.4), 0 0 20px rgba(255,107,53,0.3)' 
                        : '0 4px 20px rgba(0,0,0,0.35)',
                      border: isHot 
                        ? '2px solid rgba(255,107,53,0.4)' 
                        : '1px solid rgba(255,255,255,0.05)',
                      animation: `noteAppear 0.35s ease ${index * 0.03}s both`,
                    }}
                  >
                    {/* Líneas de papel */}
                    <div style={styles.noteLines}></div>
                    
                    {/* Efecto de quemado */}
                    {burnLevel > 0.75 && <div style={styles.burnEffect}></div>}
                    
                    {/* Texto de la nota */}
                    <p style={styles.noteText}>{note.texto}</p>
                    
                    {/* Footer de la nota */}
                    <div style={styles.noteFooter}>
                      <span style={styles.noteTime}>
                        {timeAgo(note.created_at)}
                        {activeTab === 'feed' ? ` (${note.distanceMeters}m)` : ''}
                      </span>
                      
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        {/* Botón de reportar */}
                        <button 
                          onClick={() => setShowReportModal(note.id)} 
                          style={styles.reportButton}
                        >
                          ⚑
                        </button>
                        
                        {/* Botón de fuego */}
                        <button 
                          onClick={() => toggleFire(note.id)} 
                          style={{ 
                            ...styles.fireButton,
                            background: isLiked ? 'rgba(255,107,53,0.15)' : 'transparent',
                            transform: isLiked ? 'scale(1.1)' : 'scale(1)',
                          }}
                        >
                          <span style={{ animation: isHot ? 'flicker 0.5s infinite' : 'none' }}>
                            🔥
                          </span>
                          <span style={{ fontWeight: 600, marginLeft: 4 }}>
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

      {/* ================================================================== */}
      {/* PANTALLA DE ESCRIBIR */}
      {/* ================================================================== */}
      
      {currentScreen === 'write' && (
        <main style={styles.writeContainer}>
          {/* Papel para escribir */}
          <div 
            style={{ 
              ...styles.writePaper,
              ...(isAnimating ? { animation: 'flyUp 0.4s ease forwards' } : {})
            }}
          >
            <div style={styles.noteLines}></div>
            <textarea 
              value={noteText} 
              onChange={(e) => {
                if (e.target.value.length <= MAX_CARACTERES) {
                  setNoteText(e.target.value);
                }
              }} 
              placeholder="Suelta tu pensamiento..." 
              style={styles.textInput}
              autoFocus 
            />
            <div style={styles.charCounter}>
              <span style={{ color: noteText.length > 180 ? '#E63946' : '#8B7355' }}>
                {noteText.length}
              </span>
              /{MAX_CARACTERES}
            </div>
          </div>
          
          {/* Mensaje de error */}
          {errorMessage && (
            <p style={{ color: '#FF5252', textAlign: 'center', fontSize: 14 }}>
              {errorMessage}
            </p>
          )}
          
          {/* Botón de publicar */}
          <button 
            onClick={publishNote} 
            disabled={isSending || !noteText.trim()} 
            style={{ 
              ...styles.primaryButton, 
              opacity: isSending || !noteText.trim() ? 0.5 : 1 
            }}
          >
            {isSending ? 'Soltando...' : '🔥 SOLTAR'}
          </button>
          
          {/* Botón de cancelar */}
          <button 
            onClick={() => { 
              setCurrentScreen('feed'); 
              setErrorMessage(''); 
            }} 
            style={styles.ghostButton}
          >
            Cancelar
          </button>
          
          {/* Indicador de ubicación */}
          {location && (
            <p style={{ color: '#555', fontSize: 12, textAlign: 'center', marginTop: 8 }}>
              📍 Se publicará en tu ubicación actual
            </p>
          )}
        </main>
      )}

      {/* ================================================================== */}
      {/* FAB (Botón flotante) */}
      {/* ================================================================== */}
      
      {currentScreen === 'feed' && (
        <button 
          onClick={() => canPostNote ? setCurrentScreen('write') : setShowBuyModal(true)} 
          style={styles.fab}
        >
          ✏️
        </button>
      )}

      {/* ================================================================== */}
      {/* TOASTS */}
      {/* ================================================================== */}
      
      {showSuccessToast && (
        <div style={styles.toast}>
          🔥 ¡Nota soltada!
        </div>
      )}
      
      {showReportedToast && (
        <div style={{ ...styles.toast, background: 'rgba(76,175,80,0.95)' }}>
          ✓ Nota reportada
        </div>
      )}

      {/* ================================================================== */}
      {/* MODAL: COMPRAR NOTAS */}
      {/* ================================================================== */}
      
      {showBuyModal && (
        <div style={styles.overlay} onClick={() => setShowBuyModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>Se acabaron tus notas 🔥</h2>
            <p style={styles.modalSubtitle}>Consigue más para seguir soltando:</p>
            
            {/* Opción: Ver video */}
            {videosWatchedToday < MAX_VIDEOS_DIA && (
              <button onClick={watchVideoForNote} style={styles.buyOption}>
                <span style={styles.buyOptionIcon}>🎬</span>
                <div>
                  <strong>Ver un video</strong>
                  <p style={styles.buyOptionDesc}>
                    +1 nota gratis ({MAX_VIDEOS_DIA - videosWatchedToday} restantes hoy)
                  </p>
                </div>
              </button>
            )}
            
            {/* Opción: Comprar 3 notas */}
            <button onClick={() => purchaseNotes('extra3')} style={styles.buyOption}>
              <span style={styles.buyOptionIcon}>🔥</span>
              <div>
                <strong>+3 pensamientos</strong>
                <p style={styles.buyOptionDesc}>$9.99 MXN</p>
              </div>
            </button>
            
            {/* Opción: Ilimitado hoy */}
            {!hasUnlimitedToday && (
              <button onClick={() => purchaseNotes('ilimitado')} style={styles.buyOption}>
                <span style={styles.buyOptionIcon}>∞</span>
                <div>
                  <strong>Ilimitado hoy</strong>
                  <p style={styles.buyOptionDesc}>$29.99 MXN</p>
                </div>
              </button>
            )}
            
            {/* Separador */}
            <div style={styles.divider}>
              <span>o paga con</span>
            </div>
            
            {/* Opción: Crypto */}
            <button onClick={() => purchaseNotes('extra3')} style={{ ...styles.buyOption, borderColor: '#F7931A' }}>
              <span style={styles.buyOptionIcon}>₿</span>
              <div>
                <strong>Bitcoin / Crypto</strong>
                <p style={styles.buyOptionDesc}>+3 notas • Lightning Network</p>
              </div>
            </button>
            
            <button onClick={() => setShowBuyModal(false)} style={styles.ghostButton}>
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* MODAL: REPORTAR */}
      {/* ================================================================== */}
      
      {showReportModal && (
        <div style={styles.overlay} onClick={() => setShowReportModal(null)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>⚑ Reportar nota</h2>
            <p style={styles.modalSubtitle}>¿Esta nota viola las reglas?</p>
            
            <button 
              onClick={() => reportNote(showReportModal)} 
              style={{ ...styles.primaryButton, background: '#E53935' }}
            >
              Sí, reportar
            </button>
            
            <button onClick={() => setShowReportModal(null)} style={styles.ghostButton}>
              Cancelar
            </button>
            
            <p style={{ fontSize: 12, color: '#555', textAlign: 'center', marginTop: 12 }}>
              Si muchas personas reportan una nota, se oculta automáticamente.
            </p>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* MODAL: INFORMACIÓN */}
      {/* ================================================================== */}
      
      {showInfoModal && (
        <div style={styles.overlay} onClick={() => setShowInfoModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>🔥 FIRE NOTES</h2>
            <p style={{ textAlign: 'center', color: '#888', fontStyle: 'italic', marginBottom: 16 }}>
              Pensamientos anónimos que flotan a 1km
            </p>
            
            {/* Lo que SÍ puedes hacer */}
            <div style={styles.infoSection}>
              <h3 style={{ ...styles.infoTitle, color: '#4CAF50' }}>✅ Permitido</h3>
              <p style={styles.infoRule}>Decir lo que piensas sin filtro</p>
              <p style={styles.infoRule}>Quejarte de lo que sea</p>
              <p style={styles.infoRule}>Confesar algo (sin nombres)</p>
              <p style={styles.infoRule}>Dar tu opinión honesta</p>
            </div>
            
            {/* Lo que NO puedes hacer */}
            <div style={styles.infoSection}>
              <h3 style={{ ...styles.infoTitle, color: '#E53935' }}>❌ Prohibido</h3>
              <p style={styles.infoRule}>Amenazar a alguien con nombre</p>
              <p style={styles.infoRule}>Contenido de menores de edad</p>
              <p style={styles.infoRule}>Acosar a personas identificables</p>
            </div>
            
            {/* Advertencia importante */}
            <div style={styles.warningBox}>
              <p style={{ fontWeight: 'bold', textAlign: 'center', color: '#FFD700' }}>
                ⚠ IMPORTANTE
              </p>
              <p style={{ textAlign: 'center', fontWeight: 'bold', color: '#FFF', marginTop: 8 }}>
                Eres anónimo, pero NO invisible.
              </p>
              <p style={{ textAlign: 'center', fontSize: 13, color: '#AAA', marginTop: 8 }}>
                Guardamos registros técnicos. Actividad ilegal = cooperamos con autoridades.
              </p>
            </div>
            
            {/* Link a términos */}
            <button 
              onClick={() => { 
                setShowInfoModal(false); 
                setShowTermsModal(true); 
              }} 
              style={{ ...styles.linkButton, marginTop: 16 }}
            >
              Ver Términos y Privacidad
            </button>
            
            <button onClick={() => setShowInfoModal(false)} style={{ ...styles.ghostButton, marginTop: 12 }}>
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* MODAL: TÉRMINOS (RESUMEN LEGAL) */}
      {/* ================================================================== */}
      
      {showTermsModal && (
        <div style={styles.overlay} onClick={() => setShowTermsModal(false)}>
          <div 
            style={{ ...styles.modal, maxWidth: 420, maxHeight: '85vh', overflowY: 'auto' }} 
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={styles.modalTitle}>📜 Términos y Privacidad</h2>
            
            <div style={styles.legalContent}>
              
              <p style={styles.legalParagraph}>
                Al usar FIRE NOTES aceptas estos términos. Si no estás de acuerdo, no uses la App.
              </p>
              
              <h4 style={styles.legalHeading}>EDAD MÍNIMA</h4>
              <p style={styles.legalParagraph}>
                Debes tener al menos 13 años. Menores de 18 requieren permiso parental.
              </p>
              
              <h4 style={styles.legalHeading}>CONTENIDO PROHIBIDO</h4>
              <p style={styles.legalParagraph}>
                Amenazas identificables, contenido de menores, incitación a violencia, acoso, actividades ilegales.
              </p>
              
              <h4 style={styles.legalHeading}>MODERACIÓN</h4>
              <p style={styles.legalParagraph}>
                5+ reportes = eliminación automática. Nos reservamos el derecho de eliminar contenido sin previo aviso.
              </p>
              
              <h4 style={styles.legalHeading}>ANONIMATO Y LEY</h4>
              <p style={styles.legalParagraph}>
                <strong>Guardamos:</strong> ID de dispositivo, IP, ubicación aproximada.
                <br /><br />
                <strong>NO guardamos:</strong> Nombre, email, teléfono.
                <br /><br />
                Ante requerimientos legales, proporcionaremos información que permita identificar usuarios involucrados en actividades ilegales.
              </p>
              
              <h4 style={styles.legalHeading}>RESPONSABILIDAD</h4>
              <p style={styles.legalParagraph}>
                FIRE NOTES no es responsable por contenido de usuarios. La App es una plataforma neutral.
              </p>
              
              <h4 style={styles.legalHeading}>JURISDICCIÓN</h4>
              <p style={styles.legalParagraph}>
                Estos términos se rigen por las leyes de México. Disputas serán resueltas en tribunales de Ciudad de México.
              </p>
              
              <div style={styles.legalFooter}>
                <p>Términos completos: <strong>firenotesapp.com/legal</strong></p>
                <p>Contacto: <strong>legal@firenotesapp.com</strong></p>
              </div>
              
            </div>
            
            <button onClick={() => setShowTermsModal(false)} style={{ ...styles.primaryButton, marginTop: 16 }}>
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* MODAL: BIENVENIDA */}
      {/* ================================================================== */}
      
      {showWelcomeModal && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h2 style={styles.modalTitle}>¡Bienvenido a FIRE NOTES! 🔥</h2>
            
            <div style={{ padding: '16px 0' }}>
              <p style={{ ...styles.infoRule, borderBottom: 'none', padding: '12px 0' }}>
                📝 <strong>Escribe</strong> lo que piensas
              </p>
              <p style={{ ...styles.infoRule, borderBottom: 'none', padding: '12px 0' }}>
                📍 <strong>Solo ven</strong> personas a 1km de ti
              </p>
              <p style={{ ...styles.infoRule, borderBottom: 'none', padding: '12px 0' }}>
                ⏰ <strong>Desaparece</strong> en 24 horas
              </p>
              <p style={{ ...styles.infoRule, borderBottom: 'none', padding: '12px 0' }}>
                🔥 <strong>Da fuego</strong> a lo que te gusta
              </p>
              <p style={{ ...styles.infoRule, borderBottom: 'none', padding: '12px 0' }}>
                👤 <strong>100% anónimo</strong> - sin registro
              </p>
            </div>
            
            <button onClick={() => setShowWelcomeModal(false)} style={styles.primaryButton}>
              ¡Entendido!
            </button>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* ESTILOS CSS GLOBALES */}
      {/* ================================================================== */}
      
      <style jsx global>{`
        @keyframes spin { 
          to { transform: rotate(360deg); } 
        }
        
        @keyframes flicker { 
          0%, 100% { opacity: 1; } 
          50% { opacity: 0.7; } 
        }
        
        @keyframes flyUp { 
          to { 
            transform: translateY(-60px) rotate(-3deg) scale(0.9); 
            opacity: 0; 
          } 
        }
        
        @keyframes noteAppear { 
          from { 
            opacity: 0; 
            transform: scale(0.95) translateY(10px); 
          } 
          to { 
            opacity: 1; 
            transform: scale(1) translateY(0); 
          } 
        }
        
        @keyframes fadeIn { 
          from { 
            opacity: 0; 
            transform: translateX(-50%) translateY(-10px); 
          } 
          to { 
            opacity: 1; 
            transform: translateX(-50%) translateY(0); 
          } 
        }
        
        * { 
          box-sizing: border-box; 
          margin: 0; 
          padding: 0; 
        }
        
        body { 
          background: #000; 
        }
      `}</style>
      
    </div>
  );
}

// ============================================================================
// ESTILOS
// ============================================================================

const styles = {
  // --------------------------------------------------------------------------
  // Contenedor principal
  // --------------------------------------------------------------------------
  
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
  
  // --------------------------------------------------------------------------
  // Header
  // --------------------------------------------------------------------------
  
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
  
  logoContainer: { 
    display: 'flex', 
    alignItems: 'center', 
    gap: 8 
  },
  
  logoText: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    background: 'linear-gradient(135deg, #FF6B35, #E63946)', 
    WebkitBackgroundClip: 'text', 
    WebkitTextFillColor: 'transparent', 
    letterSpacing: 2 
  },
  
  logoSubtext: { 
    fontSize: 14, 
    fontWeight: 'normal', 
    color: '#FFF', 
    letterSpacing: 1, 
    opacity: 0.9 
  },
  
  notesCounter: { 
    display: 'flex', 
    alignItems: 'center', 
    gap: 2, 
    minWidth: 70, 
    justifyContent: 'flex-end' 
  },
  
  // --------------------------------------------------------------------------
  // Tabs
  // --------------------------------------------------------------------------
  
  tabsContainer: { 
    display: 'flex', 
    borderBottom: '1px solid #1a1a1a' 
  },
  
  tab: { 
    flex: 1, 
    padding: 12, 
    background: 'transparent', 
    border: 'none', 
    color: '#666', 
    fontSize: 14, 
    cursor: 'pointer', 
    transition: '0.2s' 
  },
  
  tabActive: { 
    color: '#FF6B35', 
    borderBottom: '2px solid #FF6B35', 
    marginBottom: -1 
  },
  
  // --------------------------------------------------------------------------
  // Indicador de zona
  // --------------------------------------------------------------------------
  
  zoneIndicator: { 
    textAlign: 'center', 
    padding: '10px 16px', 
    fontSize: 13, 
    color: '#777', 
    fontStyle: 'italic', 
    backgroundColor: 'rgba(255,255,255,0.02)', 
    borderBottom: '1px solid #1a1a1a' 
  },
  
  // --------------------------------------------------------------------------
  // Feed de notas
  // --------------------------------------------------------------------------
  
  feedContainer: { 
    padding: 16, 
    paddingBottom: 100, 
    minHeight: 'calc(100dvh - 140px)' 
  },
  
  notesGrid: { 
    display: 'flex', 
    flexDirection: 'column', 
    gap: 16 
  },
  
  // --------------------------------------------------------------------------
  // Tarjeta de nota
  // --------------------------------------------------------------------------
  
  noteCard: { 
    position: 'relative', 
    backgroundColor: '#F5E6D3', 
    borderRadius: 4, 
    padding: 20, 
    overflow: 'hidden', 
    transition: '0.3s' 
  },
  
  noteLines: { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0, 
    background: 'repeating-linear-gradient(0deg, transparent, transparent 28px, rgba(0,0,0,0.03) 28px, rgba(0,0,0,0.03) 29px)', 
    pointerEvents: 'none' 
  },
  
  burnEffect: { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0, 
    background: 'linear-gradient(135deg, transparent 85%, rgba(139,69,19,0.2) 100%)', 
    borderRadius: 4, 
    pointerEvents: 'none' 
  },
  
  noteText: { 
    color: '#2D2A26', 
    fontSize: 16, 
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
    marginTop: 12, 
    position: 'relative', 
    zIndex: 1 
  },
  
  noteTime: { 
    fontSize: 12, 
    color: '#8B7355' 
  },
  
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
    padding: '6px 10px', 
    borderRadius: 12, 
    color: '#2D2A26', 
    transition: '0.2s', 
    display: 'flex', 
    alignItems: 'center' 
  },
  
  // --------------------------------------------------------------------------
  // Pantalla de escribir
  // --------------------------------------------------------------------------
  
  writeContainer: { 
    padding: '24px 20px', 
    display: 'flex', 
    flexDirection: 'column', 
    gap: 20, 
    minHeight: 'calc(100dvh - 70px)' 
  },
  
  writePaper: { 
    position: 'relative', 
    backgroundColor: '#F5E6D3', 
    borderRadius: 4, 
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
  
  charCounter: { 
    position: 'absolute', 
    bottom: 8, 
    right: 12, 
    fontSize: 12, 
    color: '#8B7355', 
    fontFamily: 'monospace', 
    zIndex: 1 
  },
  
  // --------------------------------------------------------------------------
  // Botones
  // --------------------------------------------------------------------------
  
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
  
  // --------------------------------------------------------------------------
  // FAB (Botón flotante)
  // --------------------------------------------------------------------------
  
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
  
  // --------------------------------------------------------------------------
  // Toast
  // --------------------------------------------------------------------------
  
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
  
  // --------------------------------------------------------------------------
  // Modal / Overlay
  // --------------------------------------------------------------------------
  
  overlay: { 
    position: 'fixed', 
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0, 
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
  
  modalTitle: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    textAlign: 'center', 
    color: '#FFD700', 
    margin: '0 0 8px 0' 
  },
  
  modalSubtitle: { 
    fontSize: 14, 
    color: '#888', 
    textAlign: 'center', 
    marginBottom: 20, 
    fontStyle: 'italic' 
  },
  
  // --------------------------------------------------------------------------
  // Opciones de compra
  // --------------------------------------------------------------------------
  
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
  
  buyOptionIcon: { 
    fontSize: 28, 
    flexShrink: 0 
  },
  
  buyOptionDesc: { 
    fontSize: 13, 
    color: '#888', 
    margin: '4px 0 0 0' 
  },
  
  divider: { 
    display: 'flex', 
    alignItems: 'center', 
    gap: 12, 
    margin: '16px 0', 
    color: '#555', 
    fontSize: 12,
    justifyContent: 'center'
  },
  
  // --------------------------------------------------------------------------
  // Sección de información
  // --------------------------------------------------------------------------
  
  infoSection: { 
    marginTop: 16 
  },
  
  infoTitle: { 
    fontSize: 14, 
    fontWeight: 'bold', 
    marginBottom: 8 
  },
  
  infoRule: { 
    color: '#CCC', 
    fontSize: 14, 
    margin: 0, 
    padding: '6px 0', 
    borderBottom: '1px solid #1a1a1a' 
  },
  
  warningBox: { 
    marginTop: 16, 
    padding: 16, 
    borderRadius: 8, 
    border: '2px solid #FFD700', 
    backgroundColor: 'rgba(255,215,0,0.05)' 
  },
  
  // --------------------------------------------------------------------------
  // Contenido legal
  // --------------------------------------------------------------------------
  
  legalContent: { 
    marginTop: 16, 
    fontSize: 13, 
    color: '#AAA', 
    lineHeight: 1.7 
  },
  
  legalHeading: { 
    fontSize: 14, 
    color: '#FFD700', 
    fontWeight: 'bold', 
    marginBottom: 6, 
    marginTop: 16 
  },
  
  legalParagraph: {
    marginBottom: 8
  },
  
  legalFooter: {
    marginTop: 20,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 12,
    color: '#888'
  },
  
  // --------------------------------------------------------------------------
  // Spinner
  // --------------------------------------------------------------------------
  
  spinner: { 
    width: 32, 
    height: 32, 
    border: '3px solid #222', 
    borderTop: '3px solid #FF6B35', 
    borderRadius: '50%', 
    animation: 'spin 1s linear infinite' 
  },
};
