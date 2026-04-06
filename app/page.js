'use client';
import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://xjzoabsuzbqxkriamqed.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhqem9hYnN1emJxeGtyaWFtcWVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNzYyNDcsImV4cCI6MjA5MDg1MjI0N30.gS2lG4W-f_4Vtsz7cYZK9PAX6pI8fdD0br7geqaae6E'
);

const RADIO_KM = 1;

function playPop() {
  try {
    const c = new (window.AudioContext || window.webkitAudioContext)();
    const o = c.createOscillator();
    const g = c.createGain();
    o.frequency.setValueAtTime(500, c.currentTime);
    o.frequency.exponentialRampToValueAtTime(150, c.currentTime + 0.1);
    g.gain.setValueAtTime(0.12, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.01, c.currentTime + 0.1);
    o.connect(g); g.connect(c.destination);
    o.start(); o.stop(c.currentTime + 0.1);
  } catch(e){}
}

function playWhoosh() {
  try {
    const c = new (window.AudioContext || window.webkitAudioContext)();
    const o = c.createOscillator();
    const g = c.createGain();
    o.frequency.setValueAtTime(400, c.currentTime);
    o.frequency.exponentialRampToValueAtTime(80, c.currentTime + 0.3);
    g.gain.setValueAtTime(0.1, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.01, c.currentTime + 0.3);
    o.connect(g); g.connect(c.destination);
    o.start(); o.stop(c.currentTime + 0.3);
  } catch(e){}
}

function vib(ms = 40) { try { navigator.vibrate?.(ms); } catch(e){} }

function getId() {
  if (typeof window === 'undefined') return 's';
  let id = localStorage.getItem('fid') || sessionStorage.getItem('fid');
  if (!id) { id = 'd_' + crypto.randomUUID(); localStorage.setItem('fid', id); sessionStorage.setItem('fid', id); }
  return id;
}

function getFp() {
  try { const s = [screen.width, screen.height, navigator.language, Intl.DateTimeFormat().resolvedOptions().timeZone].join('|'); let h = 0; for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h &= h; } return 'f' + Math.abs(h).toString(36); } catch(e) { return 'fx'; }
}

function dist(a, b, c, d) { if (!a||!b||!c||!d) return 999; const R = 6371, dLat = (c-a)*Math.PI/180, dLng = (d-b)*Math.PI/180; const x = Math.sin(dLat/2)**2 + Math.cos(a*Math.PI/180)*Math.cos(c*Math.PI/180)*Math.sin(dLng/2)**2; return R*2*Math.atan2(Math.sqrt(x), Math.sqrt(1-x)); }

function ago(d) { const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000); if (m < 1) return 'ahora'; if (m < 60) return `${m}m`; const h = Math.floor(m/60); return h < 24 ? `${h}h` : '1d'; }

function burned(d) { return Math.min((Date.now() - new Date(d).getTime()) / 86400000, 1); }

function valid(t) { return /^[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ0-9\s.,;:!?¡¿'"()\-@#%&]+$/i.test(t) && t.trim().length > 0 && t.length <= 200; }

export default function App() {
  const [tab, setTab] = useState('feed');
  const [screen, setScreen] = useState('feed');
  const [notas, setNotas] = useState([]);
  const [mis, setMis] = useState([]);
  const [txt, setTxt] = useState('');
  const [loc, setLoc] = useState(null);
  const [locStatus, setLocStatus] = useState('loading');
  const [did, setDid] = useState('');
  const [fp, setFp] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState('');

  const [used, setUsed] = useState(0);
  const [vids, setVids] = useState(0);
  const [extras, setExtras] = useState(0);
  const [unlim, setUnlim] = useState(false);

  const [showBuy, setShowBuy] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showOk, setShowOk] = useState(false);
  const [showReport, setShowReport] = useState(null);
  const [showTerms, setShowTerms] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

  const [likes, setLikes] = useState(new Set());
  const [anim, setAnim] = useState(false);

  const watchRef = useRef(null);
  const total = unlim ? 999 : 3 + vids + extras;
  const canPost = unlim || used < total;

  useEffect(() => {
    setDid(getId()); setFp(getFp());
    if (!localStorage.getItem('fw4')) { setShowWelcome(true); localStorage.setItem('fw4', '1'); }
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(p => { setLoc({ lat: p.coords.latitude, lng: p.coords.longitude }); setLocStatus('ok'); }, e => setLocStatus(e.code === 1 ? 'denied' : 'error'), { enableHighAccuracy: true, timeout: 15000 });
      watchRef.current = navigator.geolocation.watchPosition(p => setLoc(prev => (!prev || dist(prev.lat, prev.lng, p.coords.latitude, p.coords.longitude) * 1000 > 50) ? { lat: p.coords.latitude, lng: p.coords.longitude } : prev), () => {}, { enableHighAccuracy: true, timeout: 30000, maximumAge: 60000 });
    } else setLocStatus('error');
    return () => { if (watchRef.current) navigator.geolocation.clearWatch(watchRef.current); };
  }, []);

  useEffect(() => { if (loc?.lat && did) loadAll(); }, [loc, did]);
  useEffect(() => { if (!loc?.lat || !did) return; const i = setInterval(loadNotas, 30000); return () => clearInterval(i); }, [loc, did]);

  const loadAll = async () => { setLoading(true); await Promise.all([loadNotas(), loadMis(), loadState()]); setLoading(false); };

  const loadNotas = async () => {
    if (!loc?.lat) return;
    try {
      const { data } = await supabase.from('pensamientos').select('id, texto, latitud, longitud, fires, created_at, expires_at, device_id').gt('expires_at', new Date().toISOString()).or('eliminado.is.null,eliminado.eq.false').order('created_at', { ascending: false }).limit(200);
      setNotas((data||[]).filter(n => dist(loc.lat, loc.lng, n.latitud, n.longitud) <= RADIO_KM).map(n => ({ ...n, dm: Math.round(dist(loc.lat, loc.lng, n.latitud, n.longitud) * 1000) })));
    } catch(e){}
    try { const { data: r } = await supabase.from('reacciones').select('pensamiento_id').eq('device_id', did); if (r) setLikes(new Set(r.map(x => x.pensamiento_id))); } catch(e){}
  };

  const loadMis = async () => {
    if (!did) return;
    try { const { data } = await supabase.from('pensamientos').select('id, texto, latitud, longitud, fires, created_at, expires_at').eq('device_id', did).gt('expires_at', new Date().toISOString()).or('eliminado.is.null,eliminado.eq.false').order('created_at', { ascending: false }); setMis(data || []); } catch(e){}
  };

  const loadState = async () => {
    try { const { data } = await supabase.rpc('obtener_estado', { p_device_id: did, p_fingerprint: fp }); if (data) { setUsed(data.usados || 0); setVids(data.videos || 0); setUnlim(data.ilimitado || false); setExtras(data.extras || 0); } } catch(e){}
  };

  const post = async () => {
    if (!loc?.lat) { setErr('Necesitamos ubicación'); return; }
    if (!canPost) { setShowBuy(true); return; }
    if (!valid(txt)) { setErr('Solo letras, números y puntuación. Máx 200.'); return; }
    setSending(true); setErr('');
    try {
      const { data, error: e } = await supabase.rpc('publicar_pensamiento', { p_texto: txt.trim(), p_lat: loc.lat, p_lng: loc.lng, p_device_id: did, p_fingerprint: fp });
      if (e || !data.ok) { setErr(data?.error || 'Error'); if (data?.sin_notas) setShowBuy(true); setSending(false); return; }
      setAnim(true); playWhoosh(); vib(80);
      setUsed(data.usados); setNotas(p => [{ ...data.nota, dm: 0 }, ...p]); setMis(p => [data.nota, ...p]); setTxt('');
      setTimeout(() => { setAnim(false); setShowOk(true); setTimeout(() => { setShowOk(false); setScreen('feed'); }, 1000); }, 400);
    } catch(e) { setErr('Error'); } finally { setSending(false); }
  };

  const fire = async id => {
    const had = likes.has(id); playPop(); vib(25);
    setLikes(p => { const n = new Set(p); had ? n.delete(id) : n.add(id); return n; });
    const upd = p => p.map(n => n.id === id ? { ...n, fires: n.fires + (had ? -1 : 1) } : n);
    setNotas(upd); setMis(upd);
    try { const { data } = await supabase.rpc('toggle_fire', { p_pensamiento_id: id, p_device_id: did }); if (data?.fires !== undefined) { const u = p => p.map(n => n.id === id ? { ...n, fires: data.fires } : n); setNotas(u); setMis(u); } } catch(e){}
  };

  const watchVid = async () => { try { const { data } = await supabase.rpc('ver_video', { p_device_id: did, p_fingerprint: fp }); if (data?.ok) { setVids(data.videos); setShowBuy(false); vib(40); } } catch(e){} };

  const buy = async tipo => { try { await supabase.from('compras').insert({ device_id: did, tipo, fecha: new Date().toISOString().split('T')[0] }); tipo === 'ilimitado' ? setUnlim(true) : setExtras(p => p + 3); setShowBuy(false); vib(40); } catch(e){} };

  const report = async id => { try { const { data } = await supabase.rpc('reportar_nota', { p_pensamiento_id: id, p_device_id: did, p_razon: 'inapropiado' }); if (data?.ok) { setShowReport(null); vib(25); if (data.eliminado) { setNotas(p => p.filter(n => n.id !== id)); setMis(p => p.filter(n => n.id !== id)); } } } catch(e){} };

  if (locStatus === 'denied') return (
    <div style={S.cont}><div style={S.center}>
      <div style={{ fontSize: '72px', marginBottom: '20px' }}>📍</div>
      <h2 style={{ color: '#FF6B35', marginBottom: '12px' }}>Activa tu ubicación</h2>
      <p style={{ color: '#999', marginBottom: '24px', lineHeight: 1.6 }}>FIRE NOTES muestra notas a 1km de ti. Sin ubicación no funciona.</p>
      <button onClick={() => location.reload()} style={S.btn}>Reintentar</button>
    </div></div>
  );

  return (
    <div style={S.cont}>
      <header style={S.head}>
        <button onClick={() => setShowInfo(true)} style={S.qBtn}>?</button>
        <div style={S.logo}>
          <span style={{ fontSize: '26px' }}>🔥</span>
          <span style={S.logoTxt}>FIRE</span>
          <span style={S.logoSub}>NOTES</span>
        </div>
        <div style={S.counter}>
          {unlim ? <span style={{ color: '#FFD700', fontSize: '20px', fontWeight: 700 }}>∞</span> : (
            <>{[...Array(3)].map((_, i) => <span key={i} style={{ fontSize: '16px', opacity: i < (total - used) ? 1 : 0.2, transition: '0.3s' }}>{i < (total - used) ? '📝' : '⬜'}</span>)}
            {(total - used) > 3 && <span style={{ color: '#FFD700', fontSize: '12px', fontWeight: 700, marginLeft: 4 }}>+{(total - used) - 3}</span>}</>
          )}
        </div>
      </header>

      {screen === 'feed' && <div style={S.tabs}>
        <button onClick={() => setTab('feed')} style={{ ...S.tab, ...(tab === 'feed' ? S.tabOn : {}) }}>🌍 Cerca de ti</button>
        <button onClick={() => setTab('mis')} style={{ ...S.tab, ...(tab === 'mis' ? S.tabOn : {}) }}>📝 Tus notas ({mis.length})</button>
      </div>}

      {!loading && screen === 'feed' && tab === 'feed' && (
        <div style={S.zone}>{notas.length === 0 ? '❄️ Zona fría - sé el primero' : notas.length < 5 ? `🌡️ ${notas.length} nota${notas.length > 1 ? 's' : ''} cerca` : notas.length < 15 ? `🔥 ¡Zona activa! - ${notas.length} notas` : <span style={{ color: '#FF6B35' }}>🔥🔥🔥 ¡Zona caliente! - {notas.length} notas</span>}</div>
      )}

      {screen === 'feed' && (
        <main style={S.feed}>
          {loading ? <div style={S.center}><div style={S.spin}></div><p style={{ color: '#666', marginTop: 16 }}>Buscando notas cerca de ti...</p></div> : (tab === 'feed' ? notas : mis).length === 0 ? (
            <div style={S.center}><div style={{ fontSize: 52 }}>🔥</div><p style={{ color: '#888', marginTop: 12 }}>{tab === 'feed' ? 'No hay notas cerca de ti' : 'No tienes notas activas'}</p><p style={{ color: '#555', fontSize: 14 }}>{tab === 'feed' ? 'Sé el primero en soltar un pensamiento' : 'Tus notas desaparecen en 24 horas'}</p></div>
          ) : (
            <div style={S.grid}>{(tab === 'feed' ? notas : mis).map((n, i) => {
              const b = burned(n.created_at), hot = n.fires >= 10, liked = likes.has(n.id);
              return (
                <div key={n.id} style={{ 
                  ...S.note, 
                  opacity: 1 - b * 0.25,
                  boxShadow: hot ? '0 8px 32px rgba(0,0,0,0.4), 0 0 20px rgba(255,107,53,0.3)' : '0 4px 20px rgba(0,0,0,0.35)',
                  border: hot ? '2px solid rgba(255,107,53,0.4)' : '1px solid rgba(255,255,255,0.05)',
                  animation: `pop 0.35s ease ${i * 0.03}s both`,
                }}>
                  <div style={S.noteLines}></div>
                  {b > 0.75 && <div style={S.burnFx}></div>}
                  <p style={S.txt}>{n.texto}</p>
                  <div style={S.foot}>
                    <span style={S.time}>{ago(n.created_at)}{tab === 'feed' ? ` (${n.dm}m)` : ''}</span>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <button onClick={() => setShowReport(n.id)} style={S.miniBtn}>⚑</button>
                      <button onClick={() => fire(n.id)} style={{ 
                        ...S.fireBtn, 
                        background: liked ? 'rgba(255,107,53,0.15)' : 'transparent',
                        transform: liked ? 'scale(1.1)' : 'scale(1)',
                      }}>
                        <span style={{ animation: hot ? 'flicker 0.5s infinite' : 'none' }}>🔥</span>
                        <span style={{ fontWeight: 600, marginLeft: 4 }}>{n.fires}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}</div>
          )}
        </main>
      )}

      {screen === 'write' && (
        <main style={S.write}>
          <div style={{ ...S.paper, ...(anim ? { animation: 'fly 0.4s ease forwards' } : {}) }}>
            <div style={S.noteLines}></div>
            <textarea value={txt} onChange={e => e.target.value.length <= 200 && setTxt(e.target.value)} placeholder="Suelta tu pensamiento..." style={S.input} autoFocus />
            <div style={S.chars}><span style={{ color: txt.length > 180 ? '#E63946' : '#8B7355' }}>{txt.length}</span>/200</div>
          </div>
          {err && <p style={{ color: '#FF5252', textAlign: 'center', fontSize: 14 }}>{err}</p>}
          <button onClick={post} disabled={sending || !txt.trim()} style={{ ...S.btn, opacity: sending || !txt.trim() ? 0.5 : 1 }}>{sending ? 'Soltando...' : '🔥 SOLTAR'}</button>
          <button onClick={() => { setScreen('feed'); setErr(''); }} style={S.ghost}>Cancelar</button>
          {loc && <p style={{ color: '#555', fontSize: 12, textAlign: 'center', marginTop: 8 }}>📍 Se publicará en tu ubicación actual</p>}
        </main>
      )}

      {screen === 'feed' && <button onClick={() => canPost ? setScreen('write') : setShowBuy(true)} style={S.fab}>✏️</button>}

      {showOk && <div style={S.toast}>🔥 ¡Nota soltada!</div>}

      {/* MODAL: COMPRAR - CON CRIPTO */}
      {showBuy && (
        <div style={S.overlay} onClick={() => setShowBuy(false)}><div style={S.modal} onClick={e => e.stopPropagation()}>
          <h2 style={S.modalH}>Se acabaron tus notas 🔥</h2>
          <p style={S.modalP}>Consigue más para seguir soltando:</p>
          
          {vids < 3 && <button onClick={watchVid} style={S.opt}>
            <span style={S.optIcon}>🎬</span>
            <div><strong>Ver un video</strong><p style={S.optDesc}>+1 nota gratis ({3 - vids} restantes hoy)</p></div>
          </button>}
          
          <button onClick={() => buy('extra3')} style={S.opt}>
            <span style={S.optIcon}>🔥</span>
            <div><strong>+3 pensamientos</strong><p style={S.optDesc}>$9.99 MXN</p></div>
          </button>
          
          {!unlim && <button onClick={() => buy('ilimitado')} style={S.opt}>
            <span style={S.optIcon}>∞</span>
            <div><strong>Ilimitado hoy</strong><p style={S.optDesc}>$29.99 MXN</p></div>
          </button>}

          <div style={S.divider}><span>o paga con</span></div>

          <button onClick={() => buy('extra3')} style={{ ...S.opt, borderColor: '#F7931A' }}>
            <span style={S.optIcon}>₿</span>
            <div><strong>Bitcoin / Crypto</strong><p style={S.optDesc}>+3 notas • Lightning Network</p></div>
          </button>

          <button onClick={() => setShowBuy(false)} style={S.ghost}>Cerrar</button>
        </div></div>
      )}

      {/* MODAL: REPORTAR */}
      {showReport && (
        <div style={S.overlay} onClick={() => setShowReport(null)}><div style={S.modal} onClick={e => e.stopPropagation()}>
          <h2 style={S.modalH}>⚑ Reportar nota</h2>
          <p style={S.modalP}>¿Esta nota viola las reglas?</p>
          <button onClick={() => report(showReport)} style={{ ...S.btn, background: '#E53935' }}>Sí, reportar</button>
          <button onClick={() => setShowReport(null)} style={S.ghost}>Cancelar</button>
          <p style={{ fontSize: 12, color: '#555', textAlign: 'center', marginTop: 12 }}>Si muchas personas reportan una nota, se oculta automáticamente.</p>
        </div></div>
      )}

      {/* MODAL: INFO - COMO ANTES */}
      {showInfo && (
        <div style={S.overlay} onClick={() => setShowInfo(false)}><div style={S.modal} onClick={e => e.stopPropagation()}>
          <h2 style={S.modalH}>🔥 FIRE NOTES</h2>
          <p style={{ textAlign: 'center', color: '#888', fontStyle: 'italic', marginBottom: 16 }}>Pensamientos anónimos que flotan a 1km</p>
          
          <div style={S.infoSection}>
            <h3 style={{ ...S.infoTitle, color: '#4CAF50' }}>✅ Lo que SÍ puedes hacer</h3>
            <p style={S.infoRule}>Decir lo que piensas sin filtro</p>
            <p style={S.infoRule}>Quejarte de lo que sea</p>
            <p style={S.infoRule}>Confesar algo (sin nombres)</p>
            <p style={S.infoRule}>Dar tu opinión honesta</p>
          </div>

          <div style={S.infoSection}>
            <h3 style={{ ...S.infoTitle, color: '#E53935' }}>❌ Lo que te BANEA</h3>
            <p style={S.infoRule}>Amenazar a alguien con nombre</p>
            <p style={S.infoRule}>Contenido de menores de edad</p>
            <p style={S.infoRule}>Acosar a personas identificables</p>
          </div>

          <div style={S.important}>
            <p style={{ fontWeight: 'bold', textAlign: 'center', color: '#FFD700' }}>⚠ IMPORTANTE ⚠</p>
            <p style={{ textAlign: 'center', fontWeight: 'bold', color: '#FFF', marginTop: 8 }}>Eres anónimo, pero NO invisible.</p>
            <p style={{ textAlign: 'center', fontSize: 13, color: '#AAA', marginTop: 8 }}>Si haces algo ilegal, cooperamos con las autoridades.</p>
          </div>

          <button onClick={() => { setShowInfo(false); setShowTerms(true); }} style={{ ...S.link, marginTop: 16 }}>
            Términos de uso y Privacidad
          </button>

          <button onClick={() => setShowInfo(false)} style={{ ...S.ghost, marginTop: 12 }}>Cerrar</button>
        </div></div>
      )}

      {/* MODAL: TÉRMINOS COMPLETOS */}
      {showTerms && (
        <div style={S.overlay} onClick={() => setShowTerms(false)}><div style={{ ...S.modal, maxWidth: 420, maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
          <h2 style={S.modalH}>📜 Términos y Privacidad</h2>
          
          <div style={S.legal}>
            <h4 style={S.legalH}>1. TÉRMINOS DE USO</h4>
            <p>FIRE NOTES es una plataforma de expresión anónima. No requiere registro. Cada nota es visible solo para personas dentro de 1km y desaparece en 24 horas.</p>
            
            <p style={{ marginTop: 12 }}><strong>Edad mínima:</strong> 13 años. Menores de 18 requieren permiso parental.</p>
            
            <p style={{ marginTop: 12 }}><strong>Contenido prohibido:</strong> Amenazas con nombres, contenido de menores, incitación a violencia, acoso identificable, actividades ilegales, spam.</p>
            
            <p style={{ marginTop: 12 }}><strong>Moderación:</strong> 5+ reportes = nota eliminada automáticamente.</p>
            
            <p style={{ marginTop: 12 }}><strong>Responsabilidad:</strong> FIRE NOTES no es responsable por el contenido de usuarios. La App es una plataforma neutral.</p>

            <h4 style={{ ...S.legalH, marginTop: 20 }}>2. PRIVACIDAD</h4>
            
            <p><strong>Recopilamos:</strong> ID anónimo del dispositivo, ubicación aproximada, dirección IP (para prevención de abuso).</p>
            
            <p style={{ marginTop: 12 }}><strong>NO recopilamos:</strong> Nombre, email, teléfono, fotos, contactos.</p>
            
            <p style={{ marginTop: 12 }}><strong>Retención:</strong> Las notas se eliminan automáticamente en 24 horas. Registros técnicos se conservan 90 días.</p>
            
            <p style={{ marginTop: 12 }}><strong>Cooperación legal:</strong> Ante requerimientos legales válidos, proporcionaremos información técnica que permita identificar usuarios involucrados en actividades ilegales.</p>

            <h4 style={{ ...S.legalH, marginTop: 20 }}>3. JURISDICCIÓN</h4>
            <p>Estos términos se rigen por las leyes de México. Disputas serán resueltas en tribunales de Ciudad de México.</p>

            <h4 style={{ ...S.legalH, marginTop: 20 }}>4. DERECHOS ARCO</h4>
            <p>Conforme a la LFPDPPP, tienes derecho a Acceder, Rectificar, Cancelar u Oponerte al tratamiento de tus datos. Contacto: privacidad@firenotesapp.com</p>

            <h4 style={{ ...S.legalH, marginTop: 20 }}>5. CONTACTO</h4>
            <p>legal@firenotesapp.com</p>
          </div>

          <button onClick={() => setShowTerms(false)} style={{ ...S.btn, marginTop: 16 }}>Cerrar</button>
        </div></div>
      )}

      {/* MODAL: ONBOARDING */}
      {showWelcome && (
        <div style={S.overlay}><div style={S.modal}>
          <h2 style={S.modalH}>¡Bienvenido a FIRE NOTES! 🔥</h2>
          <div style={{ padding: '16px 0' }}>
            <p style={{ ...S.infoRule, borderBottom: 'none', padding: '12px 0' }}>📝 <strong>Escribe</strong> lo que piensas</p>
            <p style={{ ...S.infoRule, borderBottom: 'none', padding: '12px 0' }}>📍 <strong>Solo ven</strong> personas a 1km de ti</p>
            <p style={{ ...S.infoRule, borderBottom: 'none', padding: '12px 0' }}>⏰ <strong>Desaparece</strong> en 24 horas</p>
            <p style={{ ...S.infoRule, borderBottom: 'none', padding: '12px 0' }}>🔥 <strong>Da fuego</strong> a lo que te gusta</p>
            <p style={{ ...S.infoRule, borderBottom: 'none', padding: '12px 0' }}>👤 <strong>100% anónimo</strong> - sin registro</p>
          </div>
          <button onClick={() => setShowWelcome(false)} style={S.btn}>¡Entendido!</button>
        </div></div>
      )}

      <style jsx global>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes flicker { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
        @keyframes fly { to { transform: translateY(-60px) rotate(-3deg) scale(0.9); opacity: 0; } }
        @keyframes pop { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateX(-50%) translateY(-10px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #000; }
      `}</style>
    </div>
  );
}

const S = {
  cont: { minHeight: '100dvh', backgroundColor: '#000', color: '#FFF', fontFamily: "'Georgia', serif", maxWidth: 480, margin: '0 auto', position: 'relative' },
  center: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: 24, textAlign: 'center' },
  
  head: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', position: 'sticky', top: 0, zIndex: 100, backgroundColor: '#000', borderBottom: '1px solid #1a1a1a' },
  qBtn: { width: 36, height: 36, borderRadius: '50%', border: '1px solid #333', background: 'transparent', color: '#888', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  logo: { display: 'flex', alignItems: 'center', gap: 8 },
  logoTxt: { fontSize: 24, fontWeight: 'bold', background: 'linear-gradient(135deg, #FF6B35, #E63946)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: 2 },
  logoSub: { fontSize: 14, fontWeight: 'normal', color: '#FFF', letterSpacing: 1, opacity: 0.9 },
  counter: { display: 'flex', alignItems: 'center', gap: 2, minWidth: 70, justifyContent: 'flex-end' },

  tabs: { display: 'flex', borderBottom: '1px solid #1a1a1a' },
  tab: { flex: 1, padding: 12, background: 'transparent', border: 'none', color: '#666', fontSize: 14, cursor: 'pointer', transition: '0.2s' },
  tabOn: { color: '#FF6B35', borderBottom: '2px solid #FF6B35', marginBottom: -1 },

  zone: { textAlign: 'center', padding: '10px 16px', fontSize: 13, color: '#777', fontStyle: 'italic', backgroundColor: 'rgba(255,255,255,0.02)', borderBottom: '1px solid #1a1a1a' },

  feed: { padding: 16, paddingBottom: 100, minHeight: 'calc(100dvh - 140px)' },
  grid: { display: 'flex', flexDirection: 'column', gap: 16 },

  note: { position: 'relative', backgroundColor: '#F5E6D3', borderRadius: 4, padding: 20, overflow: 'hidden', transition: '0.3s' },
  noteLines: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'repeating-linear-gradient(0deg, transparent, transparent 28px, rgba(0,0,0,0.03) 28px, rgba(0,0,0,0.03) 29px)', pointerEvents: 'none' },
  burnFx: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(135deg, transparent 85%, rgba(139,69,19,0.2) 100%)', borderRadius: 4, pointerEvents: 'none' },
  txt: { color: '#2D2A26', fontSize: 16, fontStyle: 'italic', lineHeight: 1.6, position: 'relative', zIndex: 1, margin: 0, wordBreak: 'break-word' },
  foot: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, position: 'relative', zIndex: 1 },
  time: { fontSize: 12, color: '#8B7355' },
  miniBtn: { background: 'transparent', border: 'none', fontSize: 14, cursor: 'pointer', padding: 4, color: '#8B7355', opacity: 0.4 },
  fireBtn: { background: 'transparent', border: 'none', fontSize: 16, cursor: 'pointer', padding: '6px 10px', borderRadius: 12, color: '#2D2A26', transition: '0.2s', display: 'flex', alignItems: 'center' },

  write: { padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 20, minHeight: 'calc(100dvh - 70px)' },
  paper: { position: 'relative', backgroundColor: '#F5E6D3', borderRadius: 4, padding: 24, minHeight: 200, boxShadow: '2px 4px 12px rgba(0,0,0,0.4)' },
  input: { width: '100%', minHeight: 150, background: 'transparent', border: 'none', outline: 'none', color: '#2D2A26', fontSize: 18, fontStyle: 'italic', fontFamily: "'Georgia', serif", lineHeight: '29px', resize: 'none', position: 'relative', zIndex: 1 },
  chars: { position: 'absolute', bottom: 8, right: 12, fontSize: 12, color: '#8B7355', fontFamily: 'monospace', zIndex: 1 },

  btn: { width: '100%', padding: 16, border: 'none', borderRadius: 12, background: 'linear-gradient(135deg, #FF6B35, #E63946)', color: '#FFF', fontSize: 18, fontWeight: 'bold', fontFamily: "'Georgia', serif", letterSpacing: 2, cursor: 'pointer', boxShadow: '0 0 20px rgba(230,57,70,0.4)' },
  ghost: { width: '100%', padding: 12, background: 'transparent', border: 'none', color: '#666', fontSize: 16, cursor: 'pointer', marginTop: 8 },

  fab: { position: 'fixed', bottom: 24, right: 24, width: 64, height: 64, borderRadius: '50%', border: 'none', background: 'linear-gradient(135deg, #FF6B35, #E63946)', fontSize: 26, cursor: 'pointer', boxShadow: '0 4px 24px rgba(230,57,70,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99 },
  toast: { position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)', backgroundColor: 'rgba(255,107,53,0.95)', color: '#FFF', padding: '12px 24px', borderRadius: 24, fontSize: 16, zIndex: 200, boxShadow: '0 4px 20px rgba(0,0,0,0.4)', animation: 'fadeIn 0.3s ease' },

  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 150, padding: 20 },
  modal: { backgroundColor: '#111', borderRadius: 16, padding: 28, maxWidth: 380, width: '100%', border: '1px solid #222' },
  modalH: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', color: '#FFD700', margin: '0 0 8px 0' },
  modalP: { fontSize: 14, color: '#888', textAlign: 'center', marginBottom: 20, fontStyle: 'italic' },

  opt: { width: '100%', display: 'flex', alignItems: 'center', gap: 16, padding: 16, borderRadius: 12, border: '1px solid #333', background: '#1a1a1a', cursor: 'pointer', marginBottom: 12, textAlign: 'left', color: '#FFF' },
  optIcon: { fontSize: 28, flexShrink: 0 },
  optDesc: { fontSize: 13, color: '#888', margin: '4px 0 0 0' },

  divider: { display: 'flex', alignItems: 'center', gap: 12, margin: '16px 0', color: '#555', fontSize: 12 },

  infoSection: { marginTop: 16 },
  infoTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 8 },
  infoRule: { color: '#CCC', fontSize: 14, margin: 0, padding: '6px 0', borderBottom: '1px solid #1a1a1a' },

  important: { marginTop: 16, padding: 16, borderRadius: 8, border: '2px solid #FFD700', backgroundColor: 'rgba(255,215,0,0.05)' },

  link: { display: 'block', background: 'none', border: 'none', color: '#666', fontSize: 12, textDecoration: 'underline', cursor: 'pointer', textAlign: 'center', width: '100%' },

  legal: { marginTop: 16, fontSize: 13, color: '#AAA', lineHeight: 1.7 },
  legalH: { fontSize: 15, color: '#FFD700', fontWeight: 'bold', marginBottom: 8, marginTop: 16 },

  spin: { width: 32, height: 32, border: '3px solid #222', borderTop: '3px solid #FF6B35', borderRadius: '50%', animation: 'spin 1s linear infinite' },
};
