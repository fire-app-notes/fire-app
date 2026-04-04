'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://vjzoabsuzbqxkriamqed.supabase.co',
  'sb_publishable_yQKCNJT5hrCvWQIAsk1Yig_9GKZHgaY'
);

const getDeviceId = () => {
  if (typeof window === 'undefined') return 'server';
  let deviceId = localStorage.getItem('fire_device_id');
  if (!deviceId) {
    deviceId = 'device_' + Math.random().toString(36).substr(2, 9) + Date.now();
    localStorage.setItem('fire_device_id', deviceId);
  }
  return deviceId;
};

export default function FireApp() {
  const [screen, setScreen] = useState('feed');
  const [thoughts, setThoughts] = useState([]);
  const [newThought, setNewThought] = useState('');
  const [thoughtsLeft, setThoughtsLeft] = useState(3);
  const [videosLeft, setVideosLeft] = useState(3);
  const [isReleasing, setIsReleasing] = useState(false);
  const [showPurchase, setShowPurchase] = useState(false);
  const [isWatchingVideo, setIsWatchingVideo] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [location, setLocation] = useState(null);
  const [deviceId, setDeviceId] = useState('');

  useEffect(() => {
    setDeviceId(getDeviceId());
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        },
        () => setLocation({ lat: 19.4326, lng: -99.1332 }),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setLocation({ lat: 19.4326, lng: -99.1332 });
    }
  }, []);

  useEffect(() => {
    if (location && deviceId) {
      cargarPensamientos();
      cargarEstado();
    }
  }, [location, deviceId]);

  const cargarPensamientos = async () => {
    setIsLoading(true);
    try {
      const { data } = await supabase.rpc('buscar_cercanos', {
        lat: location.lat, lng: location.lng, radio_km: 1.0
      });
      const { data: misReacciones } = await supabase
        .from('reacciones').select('pensamiento_id').eq('device_id', deviceId);
      const reaccionesSet = new Set(misReacciones?.map(r => r.pensamiento_id) || []);
      setThoughts((data || []).map(p => ({
        id: p.id, text: p.texto, fires: p.fires,
        timeAgo: formatearTiempo(p.created_at),
        hoursOld: (new Date() - new Date(p.created_at)) / 3600000,
        hasFired: reaccionesSet.has(p.id)
      })));
    } catch (e) { console.error(e); }
    setIsLoading(false);
  };

  const cargarEstado = async () => {
    try {
      const { data } = await supabase.rpc('obtener_estado', { p_device_id: deviceId });
      if (data) { setThoughtsLeft(data.pensamientos_restantes); setVideosLeft(data.videos_restantes); }
    } catch (e) { console.error(e); }
  };

  const formatearTiempo = (fecha) => {
    const diff = (new Date() - new Date(fecha)) / 60000;
    if (diff < 1) return 'ahora';
    if (diff < 60) return Math.floor(diff) + 'm';
    return Math.floor(diff / 60) + 'h';
  };

  const handleTextChange = (e) => {
    const filtered = e.target.value.replace(/[^a-záéíóúüñA-ZÁÉÍÓÚÜÑ\s]/g, '');
    if (filtered.length <= 200) setNewThought(filtered);
  };

  const getBurnLevel = (h) => h < 6 ? 0 : h < 12 ? 1 : h < 18 ? 2 : h < 22 ? 3 : 4;

  const handleFire = async (id, e) => {
    e.stopPropagation();
    const { data } = await supabase.rpc('toggle_fire', { p_pensamiento_id: id, p_device_id: deviceId });
    if (data) setThoughts(thoughts.map(t => t.id === id ? { ...t, fires: data.fires, hasFired: data.action === 'added' } : t));
  };

  const watchVideo = async () => {
    if (videosLeft <= 0) return;
    setIsWatchingVideo(true);
    setTimeout(async () => {
      const { data } = await supabase.rpc('ver_video', { p_device_id: deviceId });
      if (data?.success) { setVideosLeft(data.videos_restantes); setThoughtsLeft(prev => prev + 1); }
      setIsWatchingVideo(false);
      setShowPurchase(false);
    }, 3000);
  };

  const releaseThought = async () => {
    if (!newThought.trim() || !location) return;
    if (thoughtsLeft <= 0) { setShowPurchase(true); return; }
    setIsReleasing(true);
    const { data } = await supabase.rpc('agregar_pensamiento', {
      p_texto: newThought.trim(), p_latitud: location.lat, p_longitud: location.lng, p_device_id: deviceId
    });
    setTimeout(() => {
      if (data?.success) { setNewThought(''); setThoughtsLeft(data.restantes); cargarPensamientos(); }
      setIsReleasing(false);
      setScreen('feed');
    }, 2500);
  };

  const styles = {
    container: { fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", maxWidth: '430px', margin: '0 auto', minHeight: '100vh', background: '#000' },
    header: { position: 'sticky', top: 0, background: 'linear-gradient(180deg, #000 0%, #000 80%, transparent 100%)', padding: '50px 20px 30px', zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    logo: { display: 'flex', alignItems: 'center', gap: '10px' },
    logoEmoji: { fontSize: '36px', filter: 'drop-shadow(0 0 10px rgba(255,107,53,0.8))' },
    logoText: { fontSize: '32px', fontWeight: '900', background: 'linear-gradient(135deg, #FF6B35 0%, #FF4500 50%, #FFD700 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-1px' },
    badge: { display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', background: 'rgba(255,107,53,0.15)', borderRadius: '25px', border: '1px solid rgba(255,107,53,0.4)' },
    feed: { flex: 1, padding: '0 16px', paddingBottom: '140px' },
    note: { position: 'relative', background: 'linear-gradient(145deg, #F5E6D3 0%, #E8D5BC 50%, #DCC9AB 100%)', borderRadius: '6px', padding: '20px', marginBottom: '16px', overflow: 'hidden' },
    noteText: { fontSize: '16px', lineHeight: '1.65', color: '#2D2A26', margin: '0 0 16px 0', fontFamily: 'Georgia, serif', fontStyle: 'italic', direction: 'ltr', textAlign: 'left' },
    noteFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    fireBtn: { display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,107,53,0.1)', border: '1px solid rgba(255,107,53,0.3)', borderRadius: '20px', padding: '6px 14px', cursor: 'pointer' },
    fireBtnActive: { background: 'rgba(255,107,53,0.25)', border: '2px solid #FF6B35', boxShadow: '0 0 20px rgba(255,107,53,0.5)' },
    bottomArea: { position: 'fixed', bottom: 0, left: 0, right: 0, padding: '20px', paddingTop: '60px', background: 'linear-gradient(0deg, #000 0%, #000 70%, transparent 100%)' },
    releaseBtn: { width: '100%', maxWidth: '400px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '18px 32px', background: 'linear-gradient(135deg, #FF6B35 0%, #FF4500 50%, #DC143C 100%)', border: 'none', borderRadius: '16px', cursor: 'pointer', boxShadow: '0 8px 32px rgba(255,107,53,0.5)' },
    releaseBtnText: { fontSize: '20px', fontWeight: '800', color: '#fff', letterSpacing: '3px' },
  };

  if (isLoading && !thoughts.length) {
    return (
      <div style={{ ...styles.container, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={styles.logo}><span style={styles.logoEmoji}>🔥</span><span style={styles.logoText}>FIRE</span></div>
        <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: '20px' }}>Buscando cerca de ti...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {isWatchingVideo && (
        <div style={{ position: 'fixed', inset: 0, background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <p style={{ fontSize: '48px' }}>📺</p>
          <p style={{ color: '#FF6B35', marginTop: '20px', fontWeight: '600' }}>Viendo video...</p>
        </div>
      )}
      
      {isReleasing && (
        <div style={{ position: 'fixed', inset: 0, background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'linear-gradient(145deg, #F5E6D3, #DCC9AB)', borderRadius: '6px', padding: '24px', maxWidth: '280px' }}>
            <p style={{ fontSize: '16px', color: '#2D2A26', fontFamily: 'Georgia, serif', fontStyle: 'italic', margin: 0 }}>{newThought}</p>
          </div>
          <p style={{ marginTop: '30px', color: 'rgba(255,255,255,0.6)' }}>🔥 soltando...</p>
        </div>
      )}

      {screen === 'feed' ? (
        <div style={{ minHeight: '100vh', background: '#000' }}>
          <div style={styles.header}>
            <div style={styles.logo}><span style={styles.logoEmoji}>🔥</span><span style={styles.logoText}>FIRE</span></div>
            <div style={styles.badge}><span style={{ fontSize: '10px', color: '#FF6B35' }}>◉</span><span style={{ fontSize: '14px', color: '#FF6B35', fontWeight: '600' }}>cerca</span></div>
          </div>
          <div style={styles.feed}>
            {thoughts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <p style={{ fontSize: '48px' }}>🔥</p>
                <p style={{ color: 'rgba(255,255,255,0.5)' }}>No hay pensamientos cerca</p>
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '14px' }}>¡Sé el primero!</p>
              </div>
            ) : thoughts.map(t => (
              <div key={t.id} style={{ ...styles.note, boxShadow: `0 4px 20px rgba(0,0,0,0.4), 0 0 ${getBurnLevel(t.hoursOld) > 1 ? '40px' : '0'} rgba(255,107,53,${getBurnLevel(t.hoursOld) * 0.15})` }}>
                <p style={styles.noteText}>{t.text}</p>
                <div style={styles.noteFooter}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '10px', color: '#8B7355' }}>◉</span>
                    <span style={{ fontSize: '13px', color: '#8B7355' }}>cerca · {t.timeAgo}</span>
                  </div>
                  <button onClick={(e) => handleFire(t.id, e)} style={{ ...styles.fireBtn, ...(t.hasFired ? styles.fireBtnActive : {}) }}>
                    <span>🔥</span><span style={{ fontWeight: '700', color: t.hasFired ? '#FF6B35' : '#8B7355' }}>{t.fires}</span>
                  </button>
                </div>
                {getBurnLevel(t.hoursOld) >= 2 && (
                  <div style={{ position: 'absolute', bottom: '-8px', left: 0, right: 0, display: 'flex', justifyContent: 'space-around', fontSize: '18px', zIndex: 4 }}>
                    {[...Array(getBurnLevel(t.hoursOld))].map((_, i) => <span key={i}>🔥</span>)}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div style={styles.bottomArea}>
            <button onClick={() => thoughtsLeft > 0 ? setScreen('write') : setShowPurchase(true)} style={styles.releaseBtn}>
              <span style={{ fontSize: '24px' }}>🔥</span>
              <span style={styles.releaseBtnText}>SOLTAR</span>
              <span style={{ fontSize: '18px', color: 'rgba(255,255,255,0.8)' }}>({thoughtsLeft})</span>
            </button>
          </div>
        </div>
      ) : (
        <div style={{ minHeight: '100vh', background: '#000', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '50px 20px 20px' }}>
            <button onClick={() => setScreen('feed')} style={{ background: 'rgba(255,107,53,0.2)', border: '1px solid rgba(255,107,53,0.4)', borderRadius: '50%', width: '44px', height: '44px', color: '#FF6B35', fontSize: '24px', cursor: 'pointer' }}>←</button>
            <div style={styles.logo}><span style={{ fontSize: '28px' }}>🔥</span><span style={{ ...styles.logoText, fontSize: '24px' }}>FIRE</span></div>
            <div style={{ width: '44px' }} />
          </div>
          <div style={{ flex: 1, padding: '20px' }}>
            <div style={{ background: 'linear-gradient(145deg, #F5E6D3, #DCC9AB)', borderRadius: '8px', padding: '24px', minHeight: '200px' }}>
              <textarea value={newThought} onChange={handleTextChange} placeholder="qué traes atorado..." autoFocus style={{ width: '100%', height: '150px', background: 'transparent', border: 'none', outline: 'none', resize: 'none', fontSize: '18px', lineHeight: '1.8', color: '#2D2A26', fontFamily: 'Georgia, serif', fontStyle: 'italic', direction: 'ltr', textAlign: 'left' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '20px' }}>
              <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(newThought.length / 200) * 100}%`, background: 'linear-gradient(90deg, #FF6B35, #FFD700)', borderRadius: '3px' }} />
              </div>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>{newThought.length}/200</span>
            </div>
          </div>
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <button onClick={releaseThought} disabled={!newThought.trim()} style={{ ...styles.releaseBtn, opacity: newThought.trim() ? 1 : 0.5 }}>
              <span style={{ fontSize: '24px' }}>🔥</span>
              <span style={styles.releaseBtnText}>SOLTAR</span>
            </button>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>🔒 nadie sabe que eres tú</p>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>te quedan {thoughtsLeft}</p>
          </div>
        </div>
      )}

      {showPurchase && (
        <div onClick={() => setShowPurchase(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'linear-gradient(180deg, #1a1a1a, #0a0a0a)', borderRadius: '28px', padding: '36px', width: '100%', maxWidth: '340px', border: '1px solid rgba(255,107,53,0.3)', textAlign: 'center' }}>
            <p style={{ fontSize: '56px' }}>😶</p>
            <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#fff', margin: '20px 0 10px' }}>ya soltaste todo</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)' }}>mañana tienes tres más</p>
            <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '28px 0' }} />
            {videosLeft > 0 ? (
              <button onClick={watchVideo} style={{ width: '100%', padding: '20px', background: 'linear-gradient(135deg, rgba(255,107,53,0.2), rgba(255,215,0,0.1))', border: '2px solid rgba(255,107,53,0.5)', borderRadius: '16px', cursor: 'pointer', marginBottom: '16px' }}>
                <p style={{ fontSize: '32px' }}>📺</p>
                <p style={{ fontSize: '18px', fontWeight: '800', color: '#fff' }}>VER VIDEO = +1 GRATIS</p>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>te quedan {videosLeft} videos</p>
              </button>
            ) : (
              <div style={{ padding: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '16px', marginBottom: '16px' }}>
                <p style={{ color: 'rgba(255,255,255,0.4)' }}>ya viste tus tres videos hoy</p>
              </div>
            )}
            <button style={{ width: '100%', display: 'flex', justifyContent: 'space-between', padding: '18px 24px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '14px', cursor: 'pointer', marginBottom: '12px' }}>
              <span style={{ fontSize: '20px', fontWeight: '800', color: '#fff' }}>+3</span>
              <span style={{ fontSize: '18px', fontWeight: '700', color: '#FFD700' }}>$9.99</span>
            </button>
            <button style={{ width: '100%', display: 'flex', justifyContent: 'space-between', padding: '18px 24px', background: 'linear-gradient(135deg, rgba(255,107,53,0.15), rgba(255,215,0,0.1))', border: '1px solid rgba(255,107,53,0.3)', borderRadius: '14px', cursor: 'pointer' }}>
              <span style={{ fontSize: '20px', fontWeight: '800', color: '#fff' }}>∞ hoy</span>
              <span style={{ fontSize: '18px', fontWeight: '700', color: '#FFD700' }}>$29.99</span>
            </button>
            <button onClick={() => setShowPurchase(false)} style={{ width: '100%', padding: '16px', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: '16px', cursor: 'pointer', marginTop: '16px' }}>🔥 seguir leyendo</button>
          </div>
        </div>
      )}
    </div>
  );
}
