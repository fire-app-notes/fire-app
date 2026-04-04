'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://vjzoabsuzbqxkriamqed.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhqem9hYnN1emJxeGtyaWFtcWVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNzYyNDcsImV4cCI6MjA5MDg1MjI0N30.gS2lG4W-f_4Vtsz7cYZK9PAX6pI8fdD0br7geqaae6E'
);

export default function FireApp() {
  const [screen, setScreen] = useState('feed');
  const [thoughts, setThoughts] = useState([]);
  const [newThought, setNewThought] = useState('');
  const [thoughtsLeft, setThoughtsLeft] = useState(3);
  const [isReleasing, setIsReleasing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [deviceId, setDeviceId] = useState('');

  useEffect(() => {
    let id = localStorage.getItem('fire_device_id');
    if (!id) {
      id = 'device_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('fire_device_id', id);
    }
    setDeviceId(id);
    cargarPensamientos();
  }, []);

  const cargarPensamientos = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('pensamientos')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) {
      setThoughts(data.map(p => ({
        id: p.id,
        text: p.texto,
        fires: p.fires || 0,
        timeAgo: getTimeAgo(p.created_at)
      })));
    }
    setIsLoading(false);
  };

  const getTimeAgo = (date) => {
    const mins = Math.floor((new Date() - new Date(date)) / 60000);
    if (mins < 1) return 'ahora';
    if (mins < 60) return mins + 'm';
    return Math.floor(mins / 60) + 'h';
  };

  const handleTextChange = (e) => {
    const filtered = e.target.value.replace(/[^a-záéíóúüñA-ZÁÉÍÓÚÜÑ\s]/g, '');
    if (filtered.length <= 200) setNewThought(filtered);
  };

  const handleFire = async (id) => {
    const thought = thoughts.find(t => t.id === id);
    await supabase.from('pensamientos').update({ fires: thought.fires + 1 }).eq('id', id);
    setThoughts(thoughts.map(t => t.id === id ? { ...t, fires: t.fires + 1 } : t));
  };

  const releaseThought = async () => {
    if (!newThought.trim() || thoughtsLeft <= 0) return;
    setIsReleasing(true);

    await supabase.from('pensamientos').insert({
      texto: newThought.trim(),
      latitud: 19.4326,
      longitud: -99.1332,
      device_id: deviceId,
      fires: 0
    });

    setThoughtsLeft(prev => prev - 1);
    setNewThought('');
    await cargarPensamientos();
    
    setTimeout(() => {
      setIsReleasing(false);
      setScreen('feed');
    }, 1500);
  };

  if (isLoading && thoughts.length === 0) {
    return (
      <div style={{ fontFamily: 'system-ui', maxWidth: '430px', margin: '0 auto', minHeight: '100vh', background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: '48px' }}>🔥</span>
        <p style={{ color: '#FF6B35', fontSize: '24px', fontWeight: '900' }}>FIRE</p>
        <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: '20px' }}>Cargando...</p>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'system-ui', maxWidth: '430px', margin: '0 auto', minHeight: '100vh', background: '#000' }}>
      
      {isReleasing && (
        <div style={{ position: 'fixed', inset: 0, background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#F5E6D3', borderRadius: '8px', padding: '24px', maxWidth: '280px' }}>
            <p style={{ color: '#2D2A26', fontFamily: 'Georgia', fontStyle: 'italic', margin: 0 }}>{newThought}</p>
          </div>
          <p style={{ marginTop: '30px', color: 'rgba(255,255,255,0.6)' }}>🔥 soltando...</p>
        </div>
      )}

      {screen === 'feed' ? (
        <>
          <div style={{ padding: '50px 20px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '36px' }}>🔥</span>
              <span style={{ fontSize: '28px', fontWeight: '900', color: '#FF6B35' }}>FIRE</span>
            </div>
            <span style={{ color: '#FF6B35', fontSize: '14px', padding: '8px 16px', background: 'rgba(255,107,53,0.15)', borderRadius: '20px' }}>◉ cerca</span>
          </div>
          
          <div style={{ padding: '0 16px 140px' }}>
            {thoughts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <p style={{ fontSize: '48px' }}>🔥</p>
                <p style={{ color: 'rgba(255,255,255,0.5)' }}>No hay pensamientos</p>
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '14px' }}>¡Sé el primero!</p>
              </div>
            ) : thoughts.map(t => (
              <div key={t.id} style={{ background: 'linear-gradient(145deg, #F5E6D3, #DCC9AB)', borderRadius: '8px', padding: '20px', marginBottom: '16px' }}>
                <p style={{ color: '#2D2A26', fontFamily: 'Georgia', fontStyle: 'italic', margin: '0 0 16px', lineHeight: '1.6' }}>{t.text}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#8B7355', fontSize: '13px' }}>◉ cerca · {t.timeAgo}</span>
                  <button onClick={() => handleFire(t.id)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,107,53,0.15)', border: '1px solid rgba(255,107,53,0.3)', borderRadius: '20px', padding: '6px 14px', cursor: 'pointer' }}>
                    <span>🔥</span>
                    <span style={{ color: '#8B7355', fontWeight: '700' }}>{t.fires}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '20px', background: 'linear-gradient(transparent, #000 30%)' }}>
            <button onClick={() => setScreen('write')} style={{ width: '100%', maxWidth: '400px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '18px', background: 'linear-gradient(135deg, #FF6B35, #DC143C)', border: 'none', borderRadius: '16px', cursor: 'pointer' }}>
              <span style={{ fontSize: '24px' }}>🔥</span>
              <span style={{ fontSize: '20px', fontWeight: '800', color: '#fff' }}>SOLTAR</span>
              <span style={{ color: 'rgba(255,255,255,0.8)' }}>({thoughtsLeft})</span>
            </button>
          </div>
        </>
      ) : (
        <>
          <div style={{ padding: '50px 20px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button onClick={() => setScreen('feed')} style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(255,107,53,0.2)', border: '1px solid rgba(255,107,53,0.4)', color: '#FF6B35', fontSize: '24px', cursor: 'pointer' }}>←</button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '28px' }}>🔥</span>
              <span style={{ fontSize: '24px', fontWeight: '900', color: '#FF6B35' }}>FIRE</span>
            </div>
            <div style={{ width: '44px' }}></div>
          </div>
          
          <div style={{ padding: '20px' }}>
            <div style={{ background: 'linear-gradient(145deg, #F5E6D3, #DCC9AB)', borderRadius: '8px', padding: '24px' }}>
              <textarea 
                value={newThought} 
                onChange={handleTextChange} 
                placeholder="qué traes atorado..." 
                autoFocus
                style={{ width: '100%', height: '150px', background: 'transparent', border: 'none', outline: 'none', resize: 'none', fontSize: '18px', color: '#2D2A26', fontFamily: 'Georgia', fontStyle: 'italic' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
              <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', marginRight: '12px' }}>
                <div style={{ width: `${(newThought.length/200)*100}%`, height: '100%', background: '#FF6B35', borderRadius: '3px' }}></div>
              </div>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>{newThought.length}/200</span>
            </div>
          </div>
          
          <div style={{ padding: '20px', position: 'fixed', bottom: 0, left: 0, right: 0 }}>
            <button onClick={releaseThought} disabled={!newThought.trim()} style={{ width: '100%', maxWidth: '400px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '18px', background: newThought.trim() ? 'linear-gradient(135deg, #FF6B35, #DC143C)' : 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '16px', cursor: newThought.trim() ? 'pointer' : 'not-allowed' }}>
              <span style={{ fontSize: '24px' }}>🔥</span>
              <span style={{ fontSize: '20px', fontWeight: '800', color: '#fff' }}>SOLTAR</span>
            </button>
            <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', marginTop: '16px', fontSize: '14px' }}>🔒 nadie sabe que eres tú · te quedan {thoughtsLeft}</p>
          </div>
        </>
      )}
    </div>
  );
}
