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
        (position) => setLocation({ lat: position.coords.latitude, lng: position.coords.longitude }),
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
    }
  }, [location, deviceId]);

  const cargarPensamientos = async () => {
    setIsLoading(true);
    try {
      const { data } = await supabase
        .from('pensamientos')
        .select('*')
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      const { data: misReacciones } = await supabase
        .from('reacciones')
        .select('pensamiento_id')
        .eq('device_id', deviceId);

      const reaccionesSet = new Set(misReacciones?.map(r => r.pensamiento_id) || []);

      setThoughts((data || []).map(p => ({
        id: p.id,
        text: p.texto,
        fires: p.fires || 0,
        timeAgo: formatearTiempo(p.created_at),
        hoursOld: (new Date() - new Date(p.created_at)) / 3600000,
        hasFired: reaccionesSet.has(p.id)
      })));
    } catch (e) {
      console.error('Error cargando:', e);
    }
    setIsLoading(false);
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
    const thought = thoughts.find(t => t.id === id);
    if (!thought) return;

    if (thought.hasFired) {
      await supabase.from('reacciones').delete().eq('pensamiento_id', id).eq('device_id', deviceId);
      await supabase.from('pensamientos').update({ fires: thought.fires - 1 }).eq('id', id);
      setThoughts(thoughts.map(t => t.id === id ? { ...t, fires: t.fires - 1, hasFired: false } : t));
    } else {
      await supabase.from('reacciones').insert({ pensamiento_id: id, device_id: deviceId });
      await supabase.from('pensamientos').update({ fires: thought.fires + 1 }).eq('id', id);
      setThoughts(thoughts.map(t => t.id === id ? { ...t, fires: t.fires + 1, hasFired: true } : t));
    }
  };

  const watchVideo = () => {
    if (videosLeft <= 0) return;
    setIsWatchingVideo(true);
    setTimeout(() => {
      setVideosLeft(prev => prev - 1);
      setThoughtsLeft(prev => prev + 1);
      setIsWatchingVideo(false);
      setShowPurchase(false);
    }, 3000);
  };

  const releaseThought = async () => {
    if (!newThought.trim() || !location) return;
    if (thoughtsLeft <= 0) { setShowPurchase(true); return; }
    
    setIsReleasing(true);
    
    const { error } = await supabase.from('pensamientos').insert({
      texto: newThought.trim(),
      latitud: location.lat,
      longitud: location.lng,
      device_id: deviceId,
      fires: 0,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    });

    if (!error) {
      setThoughtsLeft(prev => prev - 1);
      setNewThought('');
      await cargarPensamientos();
    } else {
      console.error('Error:', error);
    }

    setTimeout(() => {
      setIsReleasing(false);
      setScreen('feed');
    }, 2000);
  };

  if (isLoading && !thoughts.length && !location) {
    return (
      <div style={{ fontFamily: 'system-ui', maxWidth: '430px', margin: '0 auto', minHeight: '100vh', background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: '48px' }}>🔥</span>
        <p style={{ color: '#FF6B35', fontSize: '24px', fontWeight: '900', marginTop: '10px' }}>FIRE</p>
        <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: '20px' }}>Buscando cerca de ti...</p>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'system-ui', maxWidth: '430px', margin: '0 auto', minHeight: '100vh', background: '#000' }}>
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
          <div style={{ position: 'sticky', top: 0, background: 'linear-gradient(180deg, #000 0%, #000 80%, transparent 100%)', padding: '50px 20px 30px', zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '36px', filter: 'drop-shadow(0 0 10px rgba(255,107,53,0.8))' }}>🔥</span>
              <span style={{ fontSize: '32px', fontWeight: '900', background: 'linear-gradient(135deg, #FF6B35 0%, #FF4500 50%, #FFD700 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>FIRE</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', background: 'rgba(255,107,53,0.15)', borderRadius: '25px', border: '1px solid rgba(255,107,53,0.4)' }}>
              <span style={{ fontSize: '10px', color: '#FF6B35' }}>◉</span>
              <span style={{ fontSize: '14px', color: '#FF6B35', fontWeight: '600' }}>cerca</span>
            </div>
          </div>
          
          <div style={{ padding: '0 16px', paddingBottom: '140px' }}>
            {thoughts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <p style={{ fontSize: '48px' }}>🔥</p>
                <p style={{ color: 'rgba(255,255,255,0.5)' }}>No hay pensamientos cerca</p>
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '14px' }}>¡Sé el primero!</p>
              </div>
            ) : thoughts.map(t => (
              <div key={t.id} style={{ position: 'relative', background: 'linear-gradient(145deg, #F5E6D3 0%, #E8D5BC 50%, #DCC9AB 100%)', borderRadius: '6px', padding: '20px', marginBottom: '16px', overflow: 'hidden' }}>
                <p style={{ fontSize: '16px', lineHeight: '1.65', color: '#2D2A26', margin: '0 0 16px 0', fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>{t.text}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '10px', color: '#8B7355' }}>◉</span>
                    <span style={{ fontSize: '13px', color: '#8B7355' }}>cerca · {t.timeAgo}</span>
                  </div>
                  <button onClick={(e) => handleFire(t.id, e)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: t.hasFired ? 'rgba(255,107,53,0.25)' : 'rgba(255,107,53,0.1)', border: t.hasFired ? '2px solid #FF6B35' : '1px solid rgba(255,107,53,0.3)', borderRadius: '20px', padding: '6px 14px', cursor: 'pointer' }}>
                    <span>🔥</span>
                    <span style={{ fontWeight: '700', color: t.hasFired ? '#FF6B35' : '#8B7355' }}>{t.fires}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '20px', paddingTop: '60px', background: 'linear-gradient(0deg, #000 0%, #000 70%, transparent 100%)' }}>
            <button onClick={() => thoughtsLeft > 0 ? setScreen('write') : setShowPurchase(true)} style={{ width: '100%', maxWidth: '400px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '18px 32px', background: 'linear-gradient(135deg, #FF6B35 0%, #FF4500 50%, #DC143C 100%)', border: 'none', borderRadius: '16px', cursor: 'pointer', boxShadow: '0 8px 32px rgba(255,107,53,0.5)' }}>
              <span style={{ fontSize: '24px' }}>🔥</span>
              <span style={{ fontSize: '20px', fontWeight: '800', color: '#fff', letterSpacing: '3px' }}>SOLTAR</span>
              <span style={{ fontSize: '18px', color: 'rgba(255,255,255,0.8)' }}>({thoughtsLeft})</span>
            </button>
          </div>
        </div>
      ) : (
        <div style={{ minHeight: '100vh', background: '#000', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '50px 20px 20px' }}>
            <button onClick={() => setScreen('feed')} style={{ background: 'rgba(255,107,53,0.2)', border: '1px solid rgba(255,107,53,0.4)', borderRadius: '50%', width: '44px', height: '44px', color: '#FF6B35', fontSize: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '28px' }}>🔥</span>
              <span style={{ fontSize: '24px', fontWeight: '900', background: 'linear-gradient(135deg, #FF6B35, #FFD700)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>FIRE</span>
            </div>
            <div style={{ width: '44px' }} />
          </div>
          
          <div style={{ flex: 1, padding: '20px' }}>
            <div style={{ background: 'linear-gradient(145deg, #F5E6D3, #DCC9AB)', borderRadius: '8px', padding:
