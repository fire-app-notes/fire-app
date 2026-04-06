'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://xjzoabsuzbqxkriamqed.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhqem9hYnN1emJxeGtyaWFtcWVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNzYyNDcsImV4cCI6MjA5MDg1MjI0N30.gS2lG4W-f_4Vtsz7cYZK9PAX6pI8fdD0br7geqaae6E'
);

const RADIO_KM = 1;
const MAX_CARACTERES = 200;
const MAX_NOTAS_GRATIS = 3;
const MAX_VIDEOS_DIA = 3;

function playFireSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch (e) {}
}

function playPublishSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  } catch (e) {}
}

function vibrate(ms = 50) {
  try { navigator.vibrate?.(ms); } catch (e) {}
}

function getDeviceId() {
  if (typeof window === 'undefined') return 'server';
  let id = localStorage.getItem('fire_device_id');
  if (!id) {
    id = 'device_' + crypto.randomUUID();
    localStorage.setItem('fire_device_id', id);
  }
  return id;
}

function generateFingerprint() {
  try {
    const c = [screen.width, screen.height, navigator.language, Intl.DateTimeFormat().resolvedOptions().timeZone].join('|');
    let h = 0;
    for (let i = 0; i < c.length; i++) h = ((h << 5) - h) + c.charCodeAt(i) & 0xffffffff;
    return 'fp_' + Math.abs(h).toString(36);
  } catch (e) { return 'fp_unknown'; }
}

function calculateDistanceKm(lat1, lng1, lat2, lng2) {
  if (!lat1 || !lng1 || !lat2 || !lng2) return 999;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function timeAgo(d) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return 'ahora';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h` : '1d';
}

function isValidNoteText(t) {
  return /^[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ0-9\s.,;:!?¡¿'"()\-@#%&]+$/i.test(t) && t.trim().length > 0 && t.length <= MAX_CARACTERES;
}

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
  
  const locationWatchRef = useRef(null);
  const totalAvailable = hasUnlimitedToday ? 999 : MAX_NOTAS_GRATIS + videosWatchedToday + extraNotesBought;
  const canPost = hasUnlimitedToday || notesUsedToday < totalAvailable;
  const remaining = totalAvailable - notesUsedToday;

  useEffect(() => {
    setDeviceId(getDeviceId());
    setFingerprint(generateFingerprint());
    if (!localStorage.getItem('fire_welcome_v2')) {
      setShowWelcomeModal(true);
      localStorage.setItem('fire_welcome_v2', 'true');
    }
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        p => { setLocation({ lat: p.coords.latitude, lng: p.coords.longitude }); setLocationStatus('ok'); },
        e => setLocationStatus(e.code === 1 ? 'denied' : 'error'),
        { enableHighAccuracy: true, timeout: 15000 }
      );
      locationWatchRef.current = navigator.geolocation.watchPosition(
        p => setLocation(prev => {
          if (!prev) return { lat: p.coords.latitude, lng: p.coords.longitude };
          if (calculateDistanceKm(prev.lat, prev.lng, p.coords.latitude, p.coords.longitude) * 1000 > 50) {
            return { lat: p.coords.latitude, lng: p.coords.longitude };
          }
          return prev;
        }), () => {}, { enableHighAccuracy: true, timeout: 30000, maximumAge: 60000 }
      );
    } else setLocationStatus('error');
    return () => { if (locationWatchRef.current) navigator.geolocation.clearWatch(locationWatchRef.current); };
  }, []);

  useEffect(() => { if (location?.lat && deviceId) loadAllData(); }, [location, deviceId]);
  useEffect(() => {
    if (!location?.lat || !deviceId) return;
    const i = setInterval(loadNearbyNotes, 30000);
    return () => clearInterval(i);
  }, [location, deviceId]);

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
        .eq('eliminado', false)
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
        .eq('eliminado', false)
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

  async function publishNote() {
    if (!location?.lat) { setErrorMessage('Necesitamos tu ubicación'); return; }
    if (!canPost) { setShowBuyModal(true); return; }
    if (!isValidNoteText(noteText)) { setErrorMessage('Solo letras, números y puntuación. Máx 200.'); return; }
    setIsSending(true);
    setErrorMessage('');
    try {
      const { data, error } = await supabase.rpc('publicar_pensamiento', {
        p_texto: noteText.trim(), p_lat: location.lat, p_lng: location.lng, p_device_id: deviceId, p_fingerprint: fingerprint
      });
      if (error || !data.ok) {
        setErrorMessage(data?.error || 'Error al publicar');
        if (data?.sin_notas) setShowBuyModal(true);
        setIsSending(false);
        return;
      }
      setIsAnimating(true);
      playPublishSound();
      vibrate(100);
      setNotesUsedToday(data.usados);
      setNotes(prev => [{ ...data.nota, distanceMeters: 0 }, ...prev]);
      setMyNotes(prev => [data.nota, ...prev]);
      setNoteText('');
      setTimeout(() => {
        setIsAnimating(false);
        setShowSuccessToast(true);
        setTimeout(() => { setShowSuccessToast(false); setCurrentScreen('feed'); }, 1500);
      }, 500);
    } catch (e) { setErrorMessage('Error de conexión'); }
    finally { setIsSending(false); }
  }

  async function toggleFire(noteId) {
    const liked = myReactions.has(noteId);
    playFireSound();
    vibrate(30);
    setMyReactions(prev => {
      const next = new Set(prev);
      liked ? next.delete(noteId) : next.add(noteId);
      return next;
    });
    const update = prev => prev.map(n => n.id === noteId ? { ...n, fires: Math.max(0, n.fires + (liked ? -1 : 1)) } : n);
    setNotes(update);
    setMyNotes(update);
    try {
      const { data } = await supabase.rpc('toggle_fire', { p_pensamiento_id: noteId, p_device_id: deviceId });
      if (data?.fires !== undefined) {
        const sync = prev => prev.map(n => n.id === noteId ? { ...n, fires: data.fires } : n);
        setNotes(sync);
        setMyNotes(sync);
      }
    } catch (e) { console.error(e); }
  }

  async function watchVideoForNote() {
    try {
      const { data } = await supabase.rpc('ver_video', { p_device_id: deviceId, p_fingerprint: fingerprint });
      if (data?.ok) { setVideosWatchedToday(data.videos); setShowBuyModal(false); vibrate(50); }
    } catch (e) { console.error(e); }
  }

  async function purchaseNotes(type) {
    try {
      await supabase.from('compras').insert({ device_id: deviceId, tipo: type, fecha: new Date().toISOString().split('T')[0] });
      if (type === 'ilimitado') setHasUnlimitedToday(true);
      else setExtraNotesBought(prev => prev + 3);
      setShowBuyModal(false);
      vibrate(50);
    } catch (e) { console.error(e); }
  }

  async function reportNote(noteId) {
    try {
      const { data, error } = await supabase.rpc('reportar_nota', { p_pensamiento_id: noteId, p_device_id: deviceId, p_razon: 'inapropiado' });
      if (error) { alert('Error: ' + error.message); return; }
      setShowReportModal(null);
      vibrate(30);
      if (data?.ok) {
        setShowReportedToast(true);
        setTimeout(() => setShowReportedToast(false), 2000);
        if (data.eliminado) {
          setNotes(prev => prev.filter(n => n.id !== noteId));
          setMyNotes(prev => prev.filter(n => n.id !== noteId));
        }
      }
    } catch (e) { alert('Error de conexión'); }
  }

  if (locationStatus === 'denied') {
    return (
      <div style={styles.container}>
        <div style={styles.centerContent}>
          <div style={{ fontSize: 80, marginBottom: 24 }}>📍</div>
          <h2 style={{ color: '#FFD700', marginBottom: 16, fontSize: 24 }}>Activa tu ubicación</h2>
          <p style={{ color: '#A0A0A0', marginBottom: 32, lineHeight: 1.7, maxWidth: 300, textAlign: 'center' }}>
            FIRE NOTES muestra notas a 1km de ti. Sin ubicación no funciona.
          </p>
          <button onClick={() => window.location.reload()} style={styles.primaryButton}>🔄 Reintentar</button>
        </div>
      </div>
    );
  }

  const displayNotes = activeTab === 'feed' ? notes : myNotes;

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <button onClick={() => setShowInfoModal(true)} style={styles.headerButton}>
          <span style={{ fontSize: 20 }}>❓</span>
        </button>
        <div style={styles.logoContainer}>
          <span style={{ fontSize: 32 }}>🔥</span>
          <span style={styles.logoText}>FIRE</span>
        </div>
        <div style={styles.notesCounter}>
          {hasUnlimitedToday ? (
            <span style={{ color: '#FFD700', fontSize: 24, fontWeight: 800 }}>∞</span>
          ) : (
            <div style={{ display: 'flex', gap: 4 }}>
              {[...Array(3)].map((_, i) => (
                <span key={i} style={{ fontSize: 18, opacity: i < remaining ? 1 : 0.3 }}>🔥</span>
              ))}
              {remaining > 3 && <span style={{ color: '#FFD700', fontSize: 14, fontWeight: 700 }}>+{remaining - 3}</span>}
            </div>
          )}
        </div>
      </header>

      {currentScreen === 'feed' && (
        <div style={styles.tabsContainer}>
          <button onClick={() => setActiveTab('feed')} style={{ ...styles.tab, ...(activeTab === 'feed' ? styles.tabActive : {}) }}>
            🌍 Cerca
          </button>
          <button onClick={() => setActiveTab('myNotes')} style={{ ...styles.tab, ...(activeTab === 'myNotes' ? styles.tabActive : {}) }}>
            🔥 Mis notas ({myNotes.length})
          </button>
        </div>
      )}

      {!isLoading && currentScreen === 'feed' && activeTab === 'feed' && (
        <div style={styles.zoneIndicator}>
          {notes.length === 0 && '❄️ Zona fría - ¡sé el primero!'}
          {notes.length > 0 && notes.length < 5 && `🔥 ${notes.length} nota${notes.length > 1 ? 's' : ''} cerca`}
          {notes.length >= 5 && notes.length < 15 && `🔥🔥 ¡Zona activa! ${notes.length} notas`}
          {notes.length >= 15 && <span style={{ color: '#FFD700' }}>🔥🔥🔥 ¡ZONA EN LLAMAS! {notes.length} notas</span>}
        </div>
      )}

      {currentScreen === 'feed' && (
        <main style={styles.feedContainer}>
          {isLoading ? (
            <div style={styles.centerContent}>
              <div style={styles.spinner}></div>
              <p style={{ color: '#888', marginTop: 20, fontSize: 16 }}>Buscando fuego cerca...</p>
            </div>
          ) : displayNotes.length === 0 ? (
            <div style={styles.centerContent}>
              <div style={{ fontSize: 64, marginBottom: 16 }}>🔥</div>
              <p style={{ color: '#888', fontSize: 18 }}>{activeTab === 'feed' ? 'No hay notas cerca' : 'No tienes notas activas'}</p>
              <p style={{ color: '#666', fontSize: 14, marginTop: 8 }}>{activeTab === 'feed' ? '¡Sé el primero en encender esta zona!' : 'Tus notas duran 24 horas'}</p>
            </div>
          ) : (
            <div style={styles.notesGrid}>
              {displayNotes.map((note, idx) => {
                const isHot = note.fires >= 10;
                const isOnFire = note.fires >= 25;
                const isLegendary = note.fires >= 50;
                const isLiked = myReactions.has(note.id);
                return (
                  <div key={note.id} style={{
                    ...styles.noteCard,
                    background: isLegendary ? 'linear-gradient(135deg, #2D1B4E 0%, #1A1A2E 100%)' : isOnFire ? 'linear-gradient(135deg, #2E1A47 0%, #1A1A2E 100%)' : isHot ? 'linear-gradient(135deg, #252538 0%, #1A1A2E 100%)' : '#1E1E2E',
                    borderColor: isLegendary ? '#FFD700' : isOnFire ? '#9B59B6' : isHot ? '#8E44AD' : '#2D2D44',
                    animation: `noteAppear 0.4s ease ${idx * 0.05}s both`,
                  }}>
                    {isLegendary && <div style={styles.badgeLegendary}>👑 LEGENDARIA</div>}
                    {isOnFire && !isLegendary && <div style={styles.badgeOnFire}>🔥 EN LLAMAS</div>}
                    {isHot && !isOnFire && <div style={styles.badgeHot}>⭐ POPULAR</div>}
                    <p style={styles.noteText}>{note.texto}</p>
                    <div style={styles.noteFooter}>
                      <span style={styles.noteTime}>{timeAgo(note.created_at)} • {activeTab === 'feed' ? `${note.distanceMeters}m` : ''}</span>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <button onClick={() => setShowReportModal(note.id)} style={styles.reportButton}>🚩</button>
                        <button onClick={() => toggleFire(note.id)} style={{
                          ...styles.fireButton,
                          background: isLiked ? 'linear-gradient(135deg, #9B59B6 0%, #8E44AD 100%)' : 'rgba(155, 89, 182, 0.2)',
                          transform: isLiked ? 'scale(1.05)' : 'scale(1)',
                          boxShadow: isLiked ? '0 0 20px rgba(155, 89, 182, 0.5)' : 'none',
                        }}>
                          <span style={{ fontSize: 22 }}>🔥</span>
                          <span style={{ fontWeight: 700, marginLeft: 8, fontSize: 18 }}>{note.fires}</span>
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

      {currentScreen === 'write' && (
        <main style={styles.writeContainer}>
          <div style={{ ...styles.writePaper, ...(isAnimating ? { animation: 'flyUp 0.5s ease forwards' } : {}) }}>
            <textarea value={noteText} onChange={e => e.target.value.length <= MAX_CARACTERES && setNoteText(e.target.value)} placeholder="¿Qué quieres soltar? 🔥" style={styles.textInput} autoFocus />
            <div style={styles.charCounter}><span style={{ color: noteText.length > 180 ? '#E74C3C' : '#888' }}>{noteText.length}</span>/{MAX_CARACTERES}</div>
          </div>
          {errorMessage && <p style={{ color: '#E74C3C', textAlign: 'center', fontSize: 14, marginTop: 12 }}>{errorMessage}</p>}
          <button onClick={publishNote} disabled={isSending || !noteText.trim()} style={{ ...styles.primaryButton, opacity: isSending || !noteText.trim() ? 0.5 : 1, marginTop: 24 }}>
            {isSending ? '🔥 Soltando...' : '🔥 SOLTAR PENSAMIENTO'}
          </button>
          <button onClick={() => { setCurrentScreen('feed'); setErrorMessage(''); }} style={styles.secondaryButton}>Cancelar</button>
          <p style={{ color: '#666', fontSize: 13, textAlign: 'center', marginTop: 16 }}>📍 Visible a 1km • ⏰ Desaparece en 24h</p>
        </main>
      )}

      {currentScreen === 'feed' && <button onClick={() => canPost ? setCurrentScreen('write') : setShowBuyModal(true)} style={styles.fab}>✏️</button>}

      {showSuccessToast && <div style={styles.toast}>🔥 ¡Nota soltada!</div>}
      {showReportedToast && <div style={{ ...styles.toast, background: 'linear-gradient(135deg, #27AE60 0%, #2ECC71 100%)' }}>✅ Nota reportada</div>}

      {showBuyModal && (
        <div style={styles.overlay} onClick={() => setShowBuyModal(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>🔥 ¿Más fuego?</h2>
            <p style={styles.modalSubtitle}>Se acabaron tus notas de hoy</p>
            {videosWatchedToday < MAX_VIDEOS_DIA && (
              <button onClick={watchVideoForNote} style={styles.buyOption}>
                <span style={{ fontSize: 32 }}>🎬</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>Ver un video</div>
                  <div style={{ color: '#888', fontSize: 13 }}>+1 nota gratis ({MAX_VIDEOS_DIA - videosWatchedToday} restantes)</div>
                </div>
              </button>
            )}
            <button onClick={() => purchaseNotes('extra3')} style={styles.buyOption}>
              <span style={{ fontSize: 32 }}>🔥</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 16 }}>+3 notas</div>
                <div style={{ color: '#FFD700', fontSize: 14 }}>$9.99 MXN</div>
              </div>
            </button>
            {!hasUnlimitedToday && (
              <button onClick={() => purchaseNotes('ilimitado')} style={{ ...styles.buyOption, borderColor: '#FFD700' }}>
                <span style={{ fontSize: 32 }}>👑</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 16, color: '#FFD700' }}>ILIMITADO HOY</div>
                  <div style={{ color: '#FFD700', fontSize: 14 }}>$29.99 MXN</div>
                </div>
              </button>
            )}
            <button onClick={() => setShowBuyModal(false)} style={styles.secondaryButton}>Cerrar</button>
          </div>
        </div>
      )}

      {showReportModal && (
        <div style={styles.overlay} onClick={() => setShowReportModal(null)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>🚩 Reportar</h2>
            <p style={styles.modalSubtitle}>¿Esta nota viola las reglas?</p>
            <button onClick={() => reportNote(showReportModal)} style={{ ...styles.primaryButton, background: 'linear-gradient(135deg, #E74C3C 0%, #C0392B 100%)' }}>Sí, reportar</button>
            <button onClick={() => setShowReportModal(null)} style={styles.secondaryButton}>Cancelar</button>
            <p style={{ fontSize: 12, color: '#666', textAlign: 'center', marginTop: 16 }}>5 reportes = eliminación automática</p>
          </div>
        </div>
      )}

      {showInfoModal && (
        <div style={styles.overlay} onClick={() => setShowInfoModal(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 48, textAlign: 'center', marginBottom: 16 }}>🔥</div>
            <h2 style={{ ...styles.modalTitle, fontSize: 28 }}>FIRE NOTES</h2>
            <p style={{ textAlign: 'center', color: '#888', marginBottom: 24 }}>Pensamientos anónimos a 1km de ti</p>
            <div style={styles.infoItem}><span style={{ fontSize: 24 }}>🎭</span><span>100% anónimo</span></div>
            <div style={styles.infoItem}><span style={{ fontSize: 24 }}>📍</span><span>Solo a 1km de ti</span></div>
            <div style={styles.infoItem}><span style={{ fontSize: 24 }}>⏰</span><span>Desaparece en 24h</span></div>
            <div style={styles.infoItem}><span style={{ fontSize: 24 }}>🔥</span><span>Dale fuego a lo que te guste</span></div>
            <div style={styles.warningBox}>
              <p style={{ fontWeight: 700, color: '#FFD700', marginBottom: 8 }}>⚠️ OJO</p>
              <p style={{ color: '#CCC', fontSize: 13, lineHeight: 1.6 }}>Eres anónimo pero NO invisible. Guardamos registros. Nada ilegal.</p>
            </div>
            <button onClick={() => { setShowInfoModal(false); setShowTermsModal(true); }} style={{ ...styles.secondaryButton, marginTop: 16, fontSize: 13 }}>Ver términos y privacidad</button>
            <button onClick={() => setShowInfoModal(false)} style={styles.primaryButton}>¡Entendido!</button>
          </div>
        </div>
      )}

      {showTermsModal && (
        <div style={styles.overlay} onClick={() => setShowTermsModal(false)}>
          <div style={{ ...styles.modal, maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>📜 Términos</h2>
            <div style={{ color: '#AAA', fontSize: 13, lineHeight: 1.8 }}>
              <p><strong style={{ color: '#FFD700' }}>Edad:</strong> Mínimo 13 años.</p>
              <p><strong style={{ color: '#FFD700' }}>Prohibido:</strong> Amenazas, contenido de menores, acoso, ilegalidades.</p>
              <p><strong style={{ color: '#FFD700' }}>Moderación:</strong> 5+ reportes = eliminación automática.</p>
              <p><strong style={{ color: '#FFD700' }}>Datos:</strong> Guardamos ID dispositivo, IP, ubicación aprox. NO nombre, email, teléfono.</p>
              <p><strong style={{ color: '#FFD700' }}>Ley:</strong> Cooperamos con autoridades ante actividad ilegal.</p>
              <p><strong style={{ color: '#FFD700' }}>Jurisdicción:</strong> México.</p>
            </div>
            <button onClick={() => setShowTermsModal(false)} style={{ ...styles.primaryButton, marginTop: 24 }}>Entendido</button>
          </div>
        </div>
      )}

      {showWelcomeModal && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <div style={{ fontSize: 64, textAlign: 'center', marginBottom: 16 }}>🔥</div>
            <h2 style={{ ...styles.modalTitle, fontSize: 28 }}>¡Bienvenido!</h2>
            <div style={{ marginTop: 24 }}>
              <div style={styles.welcomeItem}>📝 Escribe lo que piensas</div>
              <div style={styles.welcomeItem}>📍 Solo te leen a 1km</div>
              <div style={styles.welcomeItem}>⏰ Desaparece en 24h</div>
              <div style={styles.welcomeItem}>🔥 Dale fuego a lo que te guste</div>
              <div style={styles.welcomeItem}>🎭 100% anónimo</div>
            </div>
            <button onClick={() => setShowWelcomeModal(false)} style={{ ...styles.primaryButton, marginTop: 32 }}>🔥 ¡EMPEZAR!</button>
          </div>
        </div>
      )}

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes flyUp { to { transform: translateY(-100px) scale(0.8); opacity: 0; } }
        @keyframes noteAppear { from { opacity: 0; transform: translateY(20px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes fadeIn { from { opacity: 0; transform: translate(-50%, -20px); } to { opacity: 1; transform: translate(-50%, 0); } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0D0D15; }
      `}</style>
    </div>
  );
}

const styles = {
  container: { minHeight: '100dvh', backgroundColor: '#0D0D15', color: '#FFF', fontFamily: "'Inter', sans-serif", maxWidth: 500, margin: '0 auto', position: 'relative' },
  centerContent: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: 24, textAlign: 'center' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', position: 'sticky', top: 0, zIndex: 100, background: 'linear-gradient(180deg, #0D0D15 0%, rgba(13,13,21,0.95) 100%)', backdropFilter: 'blur(10px)' },
  headerButton: { width: 44, height: 44, borderRadius: 12, border: '2px solid #2D2D44', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  logoContainer: { display: 'flex', alignItems: 'center', gap: 8 },
  logoText: { fontSize: 28, fontWeight: 800, background: 'linear-gradient(135deg, #9B59B6 0%, #FFD700 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: 2 },
  notesCounter: { minWidth: 80, display: 'flex', justifyContent: 'flex-end' },
  tabsContainer: { display: 'flex', padding: '8px 16px', gap: 8 },
  tab: { flex: 1, padding: '14px 16px', background: '#1A1A2E', border: 'none', borderRadius: 12, color: '#666', fontSize: 15, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' },
  tabActive: { color: '#FFF', background: 'linear-gradient(135deg, #9B59B6 0%, #8E44AD 100%)' },
  zoneIndicator: { textAlign: 'center', padding: '12px 16px', fontSize: 14, color: '#888', fontWeight: 500 },
  feedContainer: { padding: 16, paddingBottom: 100 },
  notesGrid: { display: 'flex', flexDirection: 'column', gap: 16 },
  noteCard: { position: 'relative', borderRadius: 16, padding: 20, border: '2px solid', transition: 'all 0.3s' },
  badgeLegendary: { position: 'absolute', top: -10, right: 16, background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)', color: '#000', padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700 },
  badgeOnFire: { position: 'absolute', top: -10, right: 16, background: 'linear-gradient(135deg, #9B59B6 0%, #8E44AD 100%)', color: '#FFF', padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700 },
  badgeHot: { position: 'absolute', top: -10, right: 16, background: '#2D2D44', color: '#FFD700', padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700 },
  noteText: { color: '#FFF', fontSize: 17, lineHeight: 1.6, margin: '8px 0 16px 0', wordBreak: 'break-word' },
  noteFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  noteTime: { fontSize: 13, color: '#666' },
  reportButton: { background: 'transparent', border: 'none', fontSize: 16, cursor: 'pointer', padding: 8, opacity: 0.5 },
  fireButton: { display: 'flex', alignItems: 'center', padding: '10px 16px', borderRadius: 50, border: 'none', cursor: 'pointer', transition: 'all 0.2s', color: '#FFF' },
  writeContainer: { padding: 24, minHeight: 'calc(100dvh - 70px)', display: 'flex', flexDirection: 'column' },
  writePaper: { background: '#1A1A2E', borderRadius: 16, padding: 20, border: '2px solid #2D2D44', position: 'relative' },
  textInput: { width: '100%', minHeight: 180, background: 'transparent', border: 'none', outline: 'none', color: '#FFF', fontSize: 18, fontFamily: "'Inter', sans-serif", lineHeight: 1.6, resize: 'none' },
  charCounter: { position: 'absolute', bottom: 12, right: 16, fontSize: 13, color: '#666', fontFamily: 'monospace' },
  primaryButton: { width: '100%', padding: 18, border: 'none', borderRadius: 14, background: 'linear-gradient(135deg, #9B59B6 0%, #8E44AD 100%)', color: '#FFF', fontSize: 17, fontWeight: 700, fontFamily: "'Inter', sans-serif", cursor: 'pointer', boxShadow: '0 4px 24px rgba(155, 89, 182, 0.4)', marginTop: 12 },
  secondaryButton: { width: '100%', padding: 16, background: 'transparent', border: '2px solid #2D2D44', borderRadius: 14, color: '#888', fontSize: 16, fontWeight: 600, cursor: 'pointer', marginTop: 12 },
  fab: { position: 'fixed', bottom: 24, right: 24, width: 70, height: 70, borderRadius: 20, border: 'none', background: 'linear-gradient(135deg, #9B59B6 0%, #8E44AD 100%)', fontSize: 28, cursor: 'pointer', boxShadow: '0 8px 32px rgba(155, 89, 182, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99 },
  toast: { position: 'fixed', top: 100, left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg, #9B59B6 0%, #8E44AD 100%)', color: '#FFF', padding: '14px 28px', borderRadius: 50, fontSize: 16, fontWeight: 600, zIndex: 200, boxShadow: '0 8px 32px rgba(0,0,0,0.3)', animation: 'fadeIn 0.3s ease' },
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 150, padding: 24 },
  modal: { backgroundColor: '#1A1A2E', borderRadius: 24, padding: 28, maxWidth: 400, width: '100%', border: '2px solid #2D2D44' },
  modalTitle: { fontSize: 24, fontWeight: 700, textAlign: 'center', color: '#FFF', marginBottom: 8 },
  modalSubtitle: { fontSize: 15, color: '#888', textAlign: 'center', marginBottom: 24 },
  buyOption: { width: '100%', display: 'flex', alignItems: 'center', gap: 16, padding: 18, borderRadius: 14, border: '2px solid #2D2D44', background: '#0D0D15', cursor: 'pointer', marginBottom: 12, textAlign: 'left', color: '#FFF', transition: 'all 0.2s' },
  infoItem: { display: 'flex', alignItems: 'center', gap: 16, padding: '12px 0', borderBottom: '1px solid #2D2D44', fontSize: 15, color: '#CCC' },
  welcomeItem: { padding: '14px 0', borderBottom: '1px solid #2D2D44', fontSize: 16, color: '#CCC' },
  warningBox: { marginTop: 24, padding: 20, borderRadius: 14, border: '2px solid #FFD700', background: 'rgba(255,215,0,0.05)', textAlign: 'center' },
  spinner: { width: 48, height: 48, border: '4px solid #2D2D44', borderTop: '4px solid #9B59B6', borderRadius: '50%', animation: 'spin 1s linear infinite' },
};
