'use client';
import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://xjzoabsuzbqxkriamqed.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhqem9hYnN1emJxeGtyaWFtcWVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNzYyNDcsImV4cCI6MjA5MDg1MjI0N30.gS2lG4W-f_4Vtsz7cYZK9PAX6pI8fdD0br7geqaae6E'
);

const RADIO_KM = 1;

const COLORES = [
  { bg: '#FFE066', shadow: 'rgba(255,193,7,0.4)' },
  { bg: '#FF8A80', shadow: 'rgba(244,67,54,0.35)' },
  { bg: '#82B1FF', shadow: 'rgba(41,121,255,0.35)' },
  { bg: '#B9F6CA', shadow: 'rgba(0,200,83,0.35)' },
  { bg: '#EA80FC', shadow: 'rgba(156,39,176,0.3)' },
  { bg: '#FFCC80', shadow: 'rgba(255,152,0,0.35)' },
  { bg: '#F48FB1', shadow: 'rgba(233,30,99,0.3)' },
];

// SONIDO OLAS DEL MAR
class OceanSound {
  constructor() { this.ctx = null; this.playing = false; this.nodes = []; }
  
  start() {
    if (this.playing) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.playing = true;
      const len = 2 * this.ctx.sampleRate;
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 350;
      
      const lfo = this.ctx.createOscillator();
      const lfoG = this.ctx.createGain();
      lfo.frequency.value = 0.08;
      lfoG.gain.value = 120;
      lfo.connect(lfoG);
      lfoG.connect(lp.frequency);
      lfo.start();
      
      const vol = this.ctx.createGain();
      vol.gain.value = 0.06;
      
      src.connect(lp);
      lp.connect(vol);
      vol.connect(this.ctx.destination);
      src.start();
      this.nodes = [src, lfo];
    } catch (e) {}
  }
  
  stop() {
    this.playing = false;
    this.nodes.forEach(n => { try { n.stop(); } catch(e){} });
    if (this.ctx) { try { this.ctx.close(); } catch(e){} }
    this.ctx = null;
  }
  
  toggle() { if (this.playing) { this.stop(); return false; } this.start(); return true; }
}

let ocean = null;

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

function getColor(id) { return COLORES[id.split('').reduce((a,c) => a + c.charCodeAt(0), 0) % COLORES.length]; }

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
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

  const [likes, setLikes] = useState(new Set());
  const [anim, setAnim] = useState(false);
  const [sound, setSound] = useState(false);

  const watchRef = useRef(null);
  const total = unlim ? 999 : 3 + vids + extras;
  const canPost = unlim || used < total;

  useEffect(() => {
    setDid(getId()); setFp(getFp());
    ocean = new OceanSound();
    if (!localStorage.getItem('fw3')) { setShowWelcome(true); localStorage.setItem('fw3', '1'); }
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(p => { setLoc({ lat: p.coords.latitude, lng: p.coords.longitude }); setLocStatus('ok'); }, e => setLocStatus(e.code === 1 ? 'denied' : 'error'), { enableHighAccuracy: true, timeout: 15000 });
      watchRef.current = navigator.geolocation.watchPosition(p => setLoc(prev => (!prev || dist(prev.lat, prev.lng, p.coords.latitude, p.coords.longitude) * 1000 > 50) ? { lat: p.coords.latitude, lng: p.coords.longitude } : prev), () => {}, { enableHighAccuracy: true, timeout: 30000, maximumAge: 60000 });
    } else setLocStatus('error');
    return () => { if (watchRef.current) navigator.geolocation.clearWatch(watchRef.current); ocean?.stop(); };
  }, []);

  useEffect(() => { if (loc?.lat && did) loadAll(); }, [loc, did]);
  useEffect(() => { if (!loc?.lat || !did) return; const i = setInterval(loadNotas, 30000); return () => clearInterval(i); }, [loc, did]);

  const toggleSound = () => { if (ocean) setSound(ocean.toggle()); };

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
        <button onClick={() => setShowInfo(true)} style={S.iconBtn}>☰</button>
        <div style={S.logo}><span style={{ fontSize: '24px' }}>🔥</span><span style={S.logoTxt}>FIRE</span><span style={S.logoSub}>NOTES</span></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button onClick={toggleSound} style={{ ...S.iconBtn, color: sound ? '#4FC3F7' : '#555' }}>{sound ? '🔊' : '🔇'}</button>
          <div style={S.counter}>
            {unlim ? <span style={{ color: '#FFD700', fontSize: '18px', fontWeight: 700 }}>∞</span> : (
              <>{[...Array(3)].map((_, i) => <span key={i} style={{ opacity: i < (total - used) ? 1 : 0.25, transition: '0.3s' }}>📝</span>)}
              {(total - used) > 3 && <span style={{ color: '#FFD700', fontSize: '11px', fontWeight: 700 }}>+{(total - used) - 3}</span>}</>
            )}
          </div>
        </div>
      </header>

      {screen === 'feed' && <div style={S.tabs}>
        <button onClick={() => setTab('feed')} style={{ ...S.tab, ...(tab === 'feed' ? S.tabOn : {}) }}>🌍 Cerca</button>
        <button onClick={() => setTab('mis')} style={{ ...S.tab, ...(tab === 'mis' ? S.tabOn : {}) }}>📝 Tuyas ({mis.length})</button>
      </div>}

      {!loading && screen === 'feed' && tab === 'feed' && (
        <div style={S.zone}>{notas.length === 0 ? '❄️ Zona fría' : notas.length < 5 ? `🌡️ ${notas.length} nota${notas.length > 1 ? 's' : ''}` : notas.length < 15 ? `🔥 ${notas.length} notas` : <span style={{ color: '#FF6B35' }}>🔥🔥 {notas.length} notas</span>}</div>
      )}

      {screen === 'feed' && (
        <main style={S.feed}>
          {loading ? <div style={S.center}><div style={S.spin}></div><p style={{ color: '#666', marginTop: 16 }}>Buscando...</p></div> : (tab === 'feed' ? notas : mis).length === 0 ? (
            <div style={S.center}><div style={{ fontSize: 52 }}>🔥</div><p style={{ color: '#888', marginTop: 12 }}>{tab === 'feed' ? 'No hay notas cerca' : 'Sin notas activas'}</p><p style={{ color: '#555', fontSize: 14 }}>{tab === 'feed' ? 'Sé el primero' : 'Duran 24h'}</p></div>
          ) : (
            <div style={S.grid}>{(tab === 'feed' ? notas : mis).map((n, i) => {
              const c = getColor(n.id), b = burned(n.created_at), hot = n.fires >= 10, liked = likes.has(n.id);
              return (
                <div key={n.id} style={{ ...S.note, backgroundColor: c.bg, boxShadow: hot ? `0 8px 28px ${c.shadow}, 0 0 16px rgba(255,107,53,0.35)` : `0 6px 20px ${c.shadow}`, opacity: 1 - b * 0.2, animation: `pop 0.3s ease ${i * 0.03}s both`, border: hot ? '2px solid rgba(255,107,53,0.5)' : 'none' }}>
                  <div style={S.pin}>📌</div>
                  <div style={S.fold}></div>
                  {b > 0.75 && <div style={S.burnFx}></div>}
                  <p style={S.txt}>{n.texto}</p>
                  <div style={S.foot}>
                    <span style={S.time}>{ago(n.created_at)}{tab === 'feed' ? ` · ${n.dm}m` : ''}</span>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <button onClick={() => setShowReport(n.id)} style={S.miniBtn}>⚑</button>
                      <button onClick={() => fire(n.id)} style={{ ...S.fireBtn, background: liked ? 'rgba(255,87,34,0.2)' : 'rgba(0,0,0,0.06)', transform: liked ? 'scale(1.08)' : 'scale(1)' }}>
                        <span style={{ animation: hot ? 'pulse 0.4s infinite' : 'none' }}>🔥</span>
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
            <div style={S.pin}>📌</div>
            <textarea value={txt} onChange={e => e.target.value.length <= 200 && setTxt(e.target.value)} placeholder="¿Qué estás pensando?" style={S.input} autoFocus />
            <div style={S.chars}>{txt.length}/200</div>
          </div>
          {err && <p style={{ color: '#FF5252', textAlign: 'center', fontSize: 14 }}>{err}</p>}
          <button onClick={post} disabled={sending || !txt.trim()} style={{ ...S.btn, opacity: sending || !txt.trim() ? 0.5 : 1 }}>{sending ? 'Soltando...' : '🔥 SOLTAR'}</button>
          <button onClick={() => { setScreen('feed'); setErr(''); }} style={S.ghost}>Cancelar</button>
        </main>
      )}

      {screen === 'feed' && <button onClick={() => canPost ? setScreen('write') : setShowBuy(true)} style={S.fab}>✏️</button>}

      {showOk && <div style={S.toast}>🔥 ¡Listo!</div>}

      {showBuy && (
        <div style={S.overlay} onClick={() => setShowBuy(false)}><div style={S.modal} onClick={e => e.stopPropagation()}>
          <div style={{ fontSize: 44, textAlign: 'center' }}>😢</div>
          <h2 style={S.modalH}>Sin notas</h2>
          <p style={S.modalP}>Consigue más:</p>
          {vids < 3 && <button onClick={watchVid} style={S.opt}><span>🎬</span><div><strong>Ver video</strong><small>+1 ({3 - vids} disponibles)</small></div></button>}
          <button onClick={() => buy('extra3')} style={S.opt}><span>🔥</span><div><strong>+3 notas</strong><small>$9.99 MXN</small></div></button>
          {!unlim && <button onClick={() => buy('ilimitado')} style={S.opt}><span>♾️</span><div><strong>Ilimitado hoy</strong><small>$29.99 MXN</small></div></button>}
          <button onClick={() => setShowBuy(false)} style={S.ghost}>Cerrar</button>
        </div></div>
      )}

      {showReport && (
        <div style={S.overlay} onClick={() => setShowReport(null)}><div style={S.modal} onClick={e => e.stopPropagation()}>
          <div style={{ fontSize: 36, textAlign: 'center' }}>🚨</div>
          <h2 style={S.modalH}>Reportar</h2>
          <p style={S.modalP}>¿Viola las reglas?</p>
          <button onClick={() => report(showReport)} style={{ ...S.btn, background: '#E53935' }}>Sí, reportar</button>
          <button onClick={() => setShowReport(null)} style={S.ghost}>Cancelar</button>
          <p style={{ fontSize: 11, color: '#666', textAlign: 'center', marginTop: 10 }}>5+ reportes = eliminación</p>
        </div></div>
      )}

      {showInfo && (
        <div style={S.overlay} onClick={() => setShowInfo(false)}><div style={{ ...S.modal, maxWidth: 400 }} onClick={e => e.stopPropagation()}>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <span style={{ fontSize: 36 }}>🔥</span>
            <h2 style={{ ...S.modalH, marginTop: 6 }}>FIRE NOTES</h2>
            <p style={{ color: '#888', fontStyle: 'italic', fontSize: 13 }}>Tu voz anónima. Tu zona. 24 horas.</p>
          </div>

          <div style={S.infoBox}>
            <h3 style={S.infoH}>🎯 CÓMO FUNCIONA</h3>
            <p style={S.infoI}>📝 Escribe lo que piensas</p>
            <p style={S.infoI}>📍 Solo ven personas a 1km</p>
            <p style={S.infoI}>⏰ Desaparece en 24 horas</p>
            <p style={S.infoI}>🔥 Da fuego a lo que te gusta</p>
            <p style={S.infoI}>🌊 Activa sonido para relajarte</p>
          </div>

          <div style={{ ...S.infoBox, borderColor: '#4CAF50' }}>
            <h3 style={{ ...S.infoH, color: '#4CAF50' }}>✅ PERMITIDO</h3>
            <p style={S.infoI}>Opiniones sin filtro</p>
            <p style={S.infoI}>Desahogarte de lo que sea</p>
            <p style={S.infoI}>Secretos (sin identificar personas)</p>
            <p style={S.infoI}>Preguntas a tu zona</p>
          </div>

          <div style={{ ...S.infoBox, borderColor: '#E53935' }}>
            <h3 style={{ ...S.infoH, color: '#E53935' }}>🚫 PROHIBIDO</h3>
            <p style={S.infoI}>Amenazas con nombres reales</p>
            <p style={S.infoI}>Contenido de menores</p>
            <p style={S.infoI}>Acosar personas identificables</p>
            <p style={S.infoI}>Violencia, drogas, armas</p>
          </div>

          <div style={S.warn}>
            <p style={{ fontWeight: 700, color: '#FFD700', fontSize: 14 }}>⚠️ IMPORTANTE</p>
            <p style={{ color: '#FFF', marginTop: 6, lineHeight: 1.5 }}>Eres <strong>anónimo</strong>, pero <strong>NO invisible</strong>.</p>
            <p style={{ color: '#AAA', fontSize: 12, marginTop: 6 }}>Guardamos registros técnicos. Actividad ilegal = cooperamos con autoridades.</p>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 16, justifyContent: 'center' }}>
            <button onClick={() => { setShowInfo(false); setShowTerms(true); }} style={S.link}>Términos</button>
            <button onClick={() => { setShowInfo(false); setShowPrivacy(true); }} style={S.link}>Privacidad</button>
          </div>
          <button onClick={() => setShowInfo(false)} style={{ ...S.btn, marginTop: 14 }}>Entendido</button>
        </div></div>
      )}

      {showTerms && (
        <div style={S.overlay} onClick={() => setShowTerms(false)}><div style={{ ...S.modal, maxWidth: 420, maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
          <h2 style={S.modalH}>📜 Términos de Uso</h2>
          <p style={{ color: '#777', fontSize: 11, textAlign: 'center', marginBottom: 14 }}>Última actualización: Abril 2026</p>
          <div style={S.legal}>
            <h4>1. ACEPTACIÓN</h4>
            <p>Al usar FIRE NOTES aceptas estos Términos en su totalidad. Si no estás de acuerdo, no uses la App.</p>
            <h4>2. SERVICIO</h4>
            <p>Plataforma de expresión anónima geolocalizada. Las notas son visibles a 1km y se eliminan en 24 horas automáticamente.</p>
            <h4>3. EDAD MÍNIMA</h4>
            <p>Debes tener al menos 13 años. Menores de 18 deben tener permiso parental.</p>
            <h4>4. CONDUCTA PROHIBIDA</h4>
            <p>Está prohibido publicar: amenazas identificables, contenido de menores, incitación a violencia, acoso, promoción de actividades ilegales, spam o malware.</p>
            <h4>5. MODERACIÓN</h4>
            <p>5+ reportes = eliminación automática. Nos reservamos el derecho de eliminar contenido sin previo aviso.</p>
            <h4>6. ANONIMATO Y LEY</h4>
            <p><strong>Importante:</strong> Guardamos ID de dispositivo, IP y ubicación aproximada. Ante requerimientos legales, proporcionaremos información que permita identificar usuarios involucrados en actividades ilegales.</p>
            <h4>7. LIMITACIÓN DE RESPONSABILIDAD</h4>
            <p>FIRE NOTES se proporciona "tal cual". No somos responsables por contenido de usuarios, daños derivados del uso, interrupciones del servicio ni pérdida de datos.</p>
            <h4>8. INDEMNIZACIÓN</h4>
            <p>Aceptas indemnizar a FIRE NOTES ante cualquier reclamo derivado de tu uso de la App o violación de estos términos.</p>
            <h4>9. PROPIEDAD INTELECTUAL</h4>
            <p>Tu contenido te pertenece, pero otorgas licencia para mostrarlo en la App.</p>
            <h4>10. MODIFICACIONES</h4>
            <p>Podemos modificar estos términos. El uso continuado constituye aceptación.</p>
            <h4>11. JURISDICCIÓN</h4>
            <p>Estos términos se rigen por las leyes de México. Disputas se resolverán en tribunales de Ciudad de México.</p>
            <h4>12. CONTACTO</h4>
            <p>legal@firenotesapp.com</p>
          </div>
          <button onClick={() => setShowTerms(false)} style={{ ...S.btn, marginTop: 14 }}>Cerrar</button>
        </div></div>
      )}

      {showPrivacy && (
        <div style={S.overlay} onClick={() => setShowPrivacy(false)}><div style={{ ...S.modal, maxWidth: 420, maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
          <h2 style={S.modalH}>🔒 Privacidad</h2>
          <p style={{ color: '#777', fontSize: 11, textAlign: 'center', marginBottom: 14 }}>Última actualización: Abril 2026</p>
          <div style={S.legal}>
            <h4>1. DATOS QUE RECOPILAMOS</h4>
            <p><strong>Automáticamente:</strong> ID de dispositivo (aleatorio), ubicación geográfica, dirección IP, tipo de dispositivo, fecha/hora de uso.</p>
            <p style={{ marginTop: 10 }}><strong>NO recopilamos:</strong> Nombre, correo, teléfono, fotos, contactos.</p>
            <h4>2. USO DE DATOS</h4>
            <p>Mostrar notas cercanas, prevenir abuso, limitar notas diarias, mejorar servicio, cumplir obligaciones legales.</p>
            <h4>3. RETENCIÓN</h4>
            <p>Notas: 24 horas. Registros técnicos: 90 días. Reportes: 1 año.</p>
            <h4>4. COMPARTIR</h4>
            <p>No vendemos datos. Solo compartimos cuando lo requiere la ley o para proteger derechos/seguridad.</p>
            <h4>5. DERECHOS ARCO (México)</h4>
            <p>Conforme a la LFPDPPP, tienes derecho a Acceder, Rectificar, Cancelar u Oponerte. Dado que no recopilamos datos personales identificables, estos derechos son limitados. Contacto: privacidad@firenotesapp.com</p>
            <h4>6. SEGURIDAD</h4>
            <p>Implementamos encriptación y almacenamiento seguro.</p>
            <h4>7. MENORES</h4>
            <p>No dirigida a menores de 13. Si detectamos uso por menores, eliminaremos su información.</p>
            <h4>8. CAMBIOS</h4>
            <p>Notificaremos cambios significativos en la App.</p>
            <h4>9. CONTACTO</h4>
            <p>privacidad@firenotesapp.com</p>
          </div>
          <button onClick={() => setShowPrivacy(false)} style={{ ...S.btn, marginTop: 14 }}>Cerrar</button>
        </div></div>
      )}

      {showWelcome && (
        <div style={S.overlay}><div style={S.modal}>
          <div style={{ textAlign: 'center' }}><div style={{ fontSize: 56 }}>🔥</div><h2 style={{ ...S.modalH, marginTop: 8 }}>¡Bienvenido!</h2></div>
          <div style={S.infoBox}>
            <p style={S.infoI}>📝 <strong>Escribe</strong> lo que piensas</p>
            <p style={S.infoI}>📍 <strong>Solo ven</strong> personas a 1km</p>
            <p style={S.infoI}>⏰ <strong>Desaparece</strong> en 24 horas</p>
            <p style={S.infoI}>🔥 <strong>Da fuego</strong> a lo que te gusta</p>
            <p style={S.infoI}>🌊 <strong>Activa el sonido</strong> para relajarte</p>
          </div>
          <p style={{ textAlign: 'center', color: '#888', fontSize: 12, marginTop: 14 }}>Al continuar, aceptas nuestros Términos de Uso</p>
          <button onClick={() => setShowWelcome(false)} style={{ ...S.btn, marginTop: 12 }}>🔥 Empezar</button>
        </div></div>
      )}

      <style jsx global>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.12); } }
        @keyframes fly { to { transform: translateY(-50px) rotate(-2deg) scale(0.92); opacity: 0; } }
        @keyframes pop { from { opacity: 0; transform: scale(0.92) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0a0a0a; }
      `}</style>
    </div>
  );
}

const S = {
  cont: { minHeight: '100dvh', background: 'linear-gradient(180deg, #0a0a0a 0%, #111 100%)', color: '#FFF', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", maxWidth: 500, margin: '0 auto' },
  center: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: 24, textAlign: 'center' },
  head: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', position: 'sticky', top: 0, zIndex: 100, background: 'rgba(10,10,10,0.94)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #1a1a1a' },
  logo: { display: 'flex', alignItems: 'center', gap: 6 },
  logoTxt: { fontSize: 20, fontWeight: 800, background: 'linear-gradient(135deg, #FF6B35, #E53935)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
  logoSub: { fontSize: 11, color: '#FFF', opacity: 0.85, fontWeight: 500, marginLeft: -2 },
  iconBtn: { width: 36, height: 36, borderRadius: '50%', border: '1px solid #333', background: 'transparent', color: '#888', fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  counter: { display: 'flex', alignItems: 'center', gap: 3, fontSize: 14 },
  tabs: { display: 'flex', borderBottom: '1px solid #1a1a1a' },
  tab: { flex: 1, padding: 13, background: 'transparent', border: 'none', color: '#666', fontSize: 13, fontWeight: 500, cursor: 'pointer' },
  tabOn: { color: '#FF6B35', borderBottom: '2px solid #FF6B35' },
  zone: { textAlign: 'center', padding: 10, fontSize: 12, color: '#888', background: 'rgba(255,255,255,0.015)' },
  feed: { padding: 14, paddingBottom: 100 },
  grid: { display: 'flex', flexDirection: 'column', gap: 16 },
  note: { position: 'relative', borderRadius: 4, padding: '20px 16px 14px', transition: '0.3s' },
  pin: { position: 'absolute', top: -5, left: '50%', transform: 'translateX(-50%)', fontSize: 13 },
  fold: { position: 'absolute', top: 0, right: 0, width: 0, height: 0, borderStyle: 'solid', borderWidth: '0 20px 20px 0', borderColor: 'transparent rgba(0,0,0,0.07) transparent transparent' },
  burnFx: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '22%', background: 'linear-gradient(to top, rgba(90,50,10,0.1), transparent)', pointerEvents: 'none' },
  txt: { color: '#1a1a1a', fontSize: 15, fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: 'italic', lineHeight: 1.55, margin: '6px 0 12px', wordBreak: 'break-word' },
  foot: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  time: { fontSize: 10, color: '#555' },
  miniBtn: { background: 'none', border: 'none', fontSize: 13, color: '#999', opacity: 0.5, cursor: 'pointer', padding: 4 },
  fireBtn: { display: 'flex', alignItems: 'center', border: 'none', fontSize: 14, cursor: 'pointer', padding: '6px 10px', borderRadius: 16, color: '#333', transition: '0.2s' },
  write: { padding: 20, display: 'flex', flexDirection: 'column', gap: 14 },
  paper: { position: 'relative', backgroundColor: '#FFE066', borderRadius: 4, padding: '24px 18px 18px', minHeight: 180, boxShadow: '0 6px 24px rgba(255,193,7,0.35)' },
  input: { width: '100%', minHeight: 140, background: 'transparent', border: 'none', outline: 'none', color: '#1a1a1a', fontSize: 17, fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: 'italic', lineHeight: 1.5, resize: 'none' },
  chars: { position: 'absolute', bottom: 8, right: 12, fontSize: 11, color: '#666' },
  btn: { width: '100%', padding: 15, border: 'none', borderRadius: 12, background: 'linear-gradient(135deg, #FF6B35, #E53935)', color: '#FFF', fontSize: 16, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 16px rgba(230,57,70,0.35)' },
  ghost: { width: '100%', padding: 12, background: 'transparent', border: 'none', color: '#666', fontSize: 14, cursor: 'pointer', marginTop: 6 },
  fab: { position: 'fixed', bottom: 22, right: 22, width: 58, height: 58, borderRadius: '50%', border: 'none', background: 'linear-gradient(135deg, #FF6B35, #E53935)', fontSize: 22, cursor: 'pointer', boxShadow: '0 4px 20px rgba(230,57,70,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99 },
  toast: { position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)', background: 'rgba(255,107,53,0.95)', color: '#FFF', padding: '10px 22px', borderRadius: 20, fontSize: 14, zIndex: 200, boxShadow: '0 4px 16px rgba(0,0,0,0.3)', animation: 'fadeIn 0.3s ease' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 150, padding: 18 },
  modal: { background: '#111', borderRadius: 16, padding: 22, maxWidth: 360, width: '100%', border: '1px solid #222' },
  modalH: { fontSize: 19, fontWeight: 700, textAlign: 'center', color: '#FFD700', marginBottom: 6 },
  modalP: { fontSize: 13, color: '#888', textAlign: 'center', marginBottom: 14 },
  opt: { width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: 13, borderRadius: 12, border: '1px solid #333', background: '#1a1a1a', cursor: 'pointer', marginBottom: 10, textAlign: 'left', color: '#FFF', fontSize: 22 },
  infoBox: { border: '1px solid #333', borderRadius: 10, padding: 14, marginTop: 12 },
  infoH: { fontSize: 13, fontWeight: 700, color: '#FFD700', marginBottom: 10 },
  infoI: { color: '#CCC', fontSize: 13, padding: '6px 0', borderBottom: '1px solid #222' },
  warn: { marginTop: 14, padding: 14, borderRadius: 10, border: '1px solid #FFD700', background: 'rgba(255,215,0,0.05)', textAlign: 'center' },
  link: { background: 'none', border: 'none', color: '#4FC3F7', fontSize: 12, textDecoration: 'underline', cursor: 'pointer' },
  legal: { fontSize: 12, color: '#AAA', lineHeight: 1.65 },
  spin: { width: 30, height: 30, border: '3px solid #222', borderTop: '3px solid #FF6B35', borderRadius: '50%', animation: 'spin 1s linear infinite' },
};
