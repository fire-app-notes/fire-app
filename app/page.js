'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

// ============================================================
// SUPABASE CLIENT
// ============================================================
const supabase = createClient(
  'https://xjzoabsuzbqxkriamqed.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhqem9hYnN1emJxeGtyaWFtcWVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNzYyNDcsImV4cCI6MjA5MDg1MjI0N30.gS2lG4W-f_4Vtsz7cYZK9PAX6pI8fdD0br7geqaae6E'
);

// ============================================================
// CONSTANTES DE LA APP
// ============================================================
const RADIO_KM = 1;
const MAX_NOTAS_GRATIS = 5;
const MAX_VIDEOS_DIA = 3;
const COOLDOWN_SECONDS = 30;

// Cloudflare Turnstile (CAPTCHA)
const TURNSTILE_SITE_KEY = '0x4AAAAAAC1muhrmP2gp6FCG';

// Firebase Config (Push Notifications)
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDGbIhSiRh3XxuaOfCaNO7MCTfMrVdlaLM",
  authDomain: "fire-notes-f161a.firebaseapp.com",
  projectId: "fire-notes-f161a",
  storageBucket: "fire-notes-f161a.firebasestorage.app",
  messagingSenderId: "16344396623",
  appId: "1:16344396623:web:f8b39b7075b0202573cb3a"
};
const FIREBASE_VAPID_KEY = 'BK1DYJHZUlNM8Vx0Ete2aX-Dyz-9vtXcy5h7c7sa-Qq3K2MWHZ18FAzOM4jO0UEz51U2J82ytUPbaP_BFaU_GFI';

// ============================================================
// COLORES - PALETA FIRE NOTES
// ============================================================
const COLORS = {
  bgPrimary: '#0D0D15',
  bgSecondary: '#1A1A2E',
  bgCard: '#16213E',
  purple: '#9B59B6',
  purpleLight: '#BB8FCE',
  purpleDark: '#7D3C98',
  orange: '#FF6B35',
  orangeLight: '#FF8C5A',
  gold: '#FFD700',
  white: '#FFFFFF',
  gray: '#8892B0',
  grayLight: '#A0AEC0',
  grayDark: '#4A5568',
  danger: '#E63946',
  success: '#10B981',
  notePaper: '#FDF6E3',
  noteText: '#2D2A26',
};

// ============================================================
// DEVICE FINGERPRINT
// ============================================================
function generateFingerprint() {
  try {
    const components = [
      screen.width, screen.height, screen.colorDepth,
      navigator.language, navigator.languages?.join(','),
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      navigator.platform, navigator.hardwareConcurrency,
      navigator.maxTouchPoints, getCanvasFingerprint(),
    ];
    const raw = components.filter(Boolean).join('|');
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      const char = raw.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return 'fp_' + Math.abs(hash).toString(36);
  } catch (e) {
    return 'fp_unknown';
  }
}

function getCanvasFingerprint() {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 200; canvas.height = 50;
    ctx.textBaseline = 'top'; ctx.font = '14px Arial';
    ctx.fillStyle = '#f60'; ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069'; ctx.fillText('FIRE🔥test', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)'; ctx.fillText('FIRE🔥test', 4, 17);
    return canvas.toDataURL().slice(-50);
  } catch (e) { return 'no-canvas'; }
}

// ============================================================
// DEVICE ID
// ============================================================
function getDeviceId() {
  if (typeof window === 'undefined') return 'server';
  const sources = [
    () => localStorage.getItem('fire_did'),
    () => sessionStorage.getItem('fire_did'),
    () => getCookie('fire_did'),
  ];
  let id = null;
  for (const source of sources) {
    try { const val = source(); if (val) { id = val; break; } } catch (e) {}
  }
  if (!id) { id = 'dev_' + crypto.randomUUID(); }
  saveDeviceId(id);
  return id;
}

function saveDeviceId(id) {
  try { localStorage.setItem('fire_did', id); } catch (e) {}
  try { sessionStorage.setItem('fire_did', id); } catch (e) {}
  try { setCookie('fire_did', id, 365); } catch (e) {}
}

function setCookie(name, value, days) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${value};expires=${expires};path=/;SameSite=Strict`;
}

function getCookie(name) {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : null;
}

// ============================================================
// HELPERS
// ============================================================
function calcularDistanciaKm(lat1, lng1, lat2, lng2) {
  if (!lat1 || !lng1 || !lat2 || !lng2) return 999;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function timeAgo(dateString) {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'ahora';
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  return '1d';
}

function tiempoRestante(expiresAt) {
  const diffMs = new Date(expiresAt).getTime() - Date.now();
  if (diffMs <= 0) return 'expirando...';
  const diffHr = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMin = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  if (diffHr > 0) return `${diffHr}h ${diffMin}m`;
  return `${diffMin}m`;
}

function calcularQuemado(createdAt, expiresAt) {
  const ahora = Date.now();
  const creado = new Date(createdAt).getTime();
  const expira = expiresAt ? new Date(expiresAt).getTime() : creado + (24 * 60 * 60 * 1000);
  const vidaTotal = expira - creado;
  const vidaTranscurrida = ahora - creado;
  return Math.min(Math.max(vidaTranscurrida / vidaTotal, 0), 1);
}

function getNivelFuego(quemado) {
  if (quemado >= 0.92) return 3;
  if (quemado >= 0.75) return 2;
  if (quemado >= 0.5) return 1;
  return 0;
}

function tiempoRestanteCorto(expiresAt) {
  const diffMs = new Date(expiresAt).getTime() - Date.now();
  if (diffMs <= 0) return '💨';
  const diffMin = Math.floor(diffMs / (1000 * 60));
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  return `${diffHr}h`;
}

// [FIX-1] Validación de texto más estricta - sanitiza HTML/scripts
function validarTexto(texto) {
  if (!texto || typeof texto !== 'string') return false;
  const trimmed = texto.trim();
  if (trimmed.length === 0 || trimmed.length > 200) return false;
  
  // Bloquear HTML tags, scripts, URLs
  const peligroso = /<[^>]*>|javascript:|on\w+\s*=|data:/i;
  if (peligroso.test(trimmed)) return false;
  
  // Solo caracteres seguros
  const regex = /^[a-zA-ZáéíóúüñÁÉÍÓÚÜÑàèìòùÀÈÌÒÙâêîôûÂÊÎÔÛäëïöüÄËÏÖÜçÇ\s.,;:!?¡¿'"()\-0-9]+$/;
  return regex.test(trimmed);
}

// [FIX-2] Sanitizar texto para display (prevenir XSS en render)
function sanitizarTexto(texto) {
  if (!texto) return '';
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function FireApp() {
  // --- STATE ---
  const [pantalla, setPantalla] = useState('feed');
  const [notas, setNotas] = useState([]);
  const [misNotas, setMisNotas] = useState([]);
  const [texto, setTexto] = useState('');
  const [ubicacion, setUbicacion] = useState(null);
  const [ubicacionStatus, setUbicacionStatus] = useState('obteniendo');
  const [deviceId, setDeviceId] = useState('');
  const [fingerprint, setFingerprint] = useState('');
  const [cargando, setCargando] = useState(true);
  const [cargandoMisNotas, setCargandoMisNotas] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  // Cooldown state
  const [cooldownActivo, setCooldownActivo] = useState(false);
  const [cooldownRestante, setCooldownRestante] = useState(0);

  // Daily usage
  const [pensamientosUsados, setPensamientosUsados] = useState(0);
  const [videosVistos, setVideosVistos] = useState(0);
  const [extrasComprados, setExtrasComprados] = useState(0);
  const [tieneIlimitado, setTieneIlimitado] = useState(false);

  // Modals
  const [mostrarModal, setMostrarModal] = useState(false);
  const [mostrarInfo, setMostrarInfo] = useState(false);
  const [mostrarExito, setMostrarExito] = useState(false);
  const [mostrarReporte, setMostrarReporte] = useState(null);
  const [mostrarDebug, setMostrarDebug] = useState(false);
  const [mostrarBienvenida, setMostrarBienvenida] = useState(false);

  // Reactions
  const [misReacciones, setMisReacciones] = useState(new Set());
  
  // Mapa de calor
  const [puntosCalor, setPuntosCalor] = useState([]);
  
  // Estadísticas del usuario
  const [misEstadisticas, setMisEstadisticas] = useState({
    total_fires_recibidos: 0,
    total_notas_publicadas: 0,
    mejor_nota_fires: 0,
    logros: {}
  });
  
  // Turnstile CAPTCHA
  const [turnstileToken, setTurnstileToken] = useState(null);
  const [turnstileLoaded, setTurnstileLoaded] = useState(false);
  const turnstileRef = useRef(null);

  // Push Notifications
  const [fcmToken, setFcmToken] = useState(null);
  const firebaseMessagingRef = useRef(null);
  
  // Medal toast
  const [mostrarMedalla, setMostrarMedalla] = useState(null); // { emoji, nombre }

  // [FIX-3] Debounce refs para prevenir spam de acciones
  const fireDebounceRef = useRef(new Set()); // IDs en proceso
  const reporteDebounceRef = useRef(new Set()); // IDs ya reportados en esta sesión

  // --- COMPUTED ---
  const totalDisponible = MAX_NOTAS_GRATIS + videosVistos + extrasComprados;
  const puedeEscribir = pensamientosUsados < totalDisponible;
  const totalFires = misNotas.reduce((sum, nota) => sum + (nota.fires || 0), 0);

  const watchIdRef = useRef(null);
  const cooldownIntervalRef = useRef(null);
  
  // ============================================================
  // COOLDOWN TIMER
  // ============================================================
  const iniciarCooldown = (segundos) => {
    setCooldownActivo(true);
    setCooldownRestante(segundos);
    
    if (cooldownIntervalRef.current) {
      clearInterval(cooldownIntervalRef.current);
    }
    
    cooldownIntervalRef.current = setInterval(() => {
      setCooldownRestante(prev => {
        if (prev <= 1) {
          clearInterval(cooldownIntervalRef.current);
          setCooldownActivo(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // ============================================================
  // INIT
  // ============================================================
  useEffect(() => {
    const id = getDeviceId();
    const fp = generateFingerprint();
    setDeviceId(id);
    setFingerprint(fp);

    // [FIX-4] ELIMINADO: fetch a ipify.org
    // La IP del usuario DEBE obtenerse del lado del servidor (headers del request).
    // Enviar la IP desde el cliente permite que un atacante mande cualquier IP falsa.
    // La IP ahora se obtiene en la Edge Function / RPC desde los headers.

    // Cargar Turnstile CAPTCHA
    if (!window.turnstile) {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad';
      script.async = true;
      window.onTurnstileLoad = () => setTurnstileLoaded(true);
      document.head.appendChild(script);
    } else {
      setTurnstileLoaded(true);
    }

    // Check if first visit
    const hasVisited = localStorage.getItem('fire_visited');
    if (!hasVisited) {
      setMostrarBienvenida(true);
      localStorage.setItem('fire_visited', 'true');
    }

    // Detectar retorno de pago exitoso de Stripe
    const urlParams = new URLSearchParams(window.location.search);
    const pagoStatus = urlParams.get('pago');
    const pagoTipo = urlParams.get('tipo');
    const pagoDeviceId = urlParams.get('device_id');
    
    if (pagoStatus === 'exito' && pagoTipo && pagoDeviceId) {
      // Confirmar pago en el servidor y esperar a que termine
      const confirmarPago = async () => {
        try {
          await fetch('https://xjzoabsuzbqxkriamqed.supabase.co/functions/v1/confirm-payment', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhqem9hYnN1emJxeGtyaWFtcWVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNzYyNDcsImV4cCI6MjA5MDg1MjI0N30.gS2lG4W-f_4Vtsz7cYZK9PAX6pI8fdD0br7geqaae6E',
            },
            body: JSON.stringify({ tipo: pagoTipo, device_id: pagoDeviceId }),
          });
          
          // Esperar un momento y recargar estado para que tome la compra
          await new Promise(r => setTimeout(r, 1000));
          
          // Recargar estado desde el servidor
          try {
            const { data } = await supabase.rpc('obtener_estado', {
              p_device_id: id,
              p_fingerprint: fp,
            });
            if (data) {
              setPensamientosUsados(data.usados || 0);
              setVideosVistos(data.videos || 0);
              setTieneIlimitado(data.ilimitado || false);
              setExtrasComprados(data.extras || 0);
            }
          } catch(e) {}
          
          setMostrarMedalla({ emoji: '✅', nombre: '¡Pago exitoso! Notas agregadas' });
          setTimeout(() => setMostrarMedalla(null), 3000);
        } catch(e) {}
      };
      confirmarPago();
      
      // Limpiar URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (pagoStatus === 'cancelado') {
      window.history.replaceState({}, '', window.location.pathname);
    }

    // Cargar Firebase para Push Notifications
    const loadFirebase = async () => {
      try {
        // Cargar Firebase SDK via CDN
        if (!window.firebase) {
          await new Promise((resolve, reject) => {
            const script1 = document.createElement('script');
            script1.src = 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js';
            script1.onload = () => {
              const script2 = document.createElement('script');
              script2.src = 'https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js';
              script2.onload = resolve;
              script2.onerror = reject;
              document.head.appendChild(script2);
            };
            script1.onerror = reject;
            document.head.appendChild(script1);
          });
        }
        
        // Inicializar Firebase
        if (!window.firebase.apps?.length) {
          window.firebase.initializeApp(FIREBASE_CONFIG);
        }
        
        const messaging = window.firebase.messaging();
        firebaseMessagingRef.current = messaging;
        
        // Registrar service worker
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
          
          // Pedir permiso de notificaciones
          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            const token = await messaging.getToken({
              vapidKey: FIREBASE_VAPID_KEY,
              serviceWorkerRegistration: registration,
            });
            if (token) {
              setFcmToken(token);
              // Guardar token en Supabase
              await supabase.from('push_tokens').upsert({
                device_id: id,
                fcm_token: token,
                updated_at: new Date().toISOString(),
              }, { onConflict: 'device_id' });
            }
          }
          
          // Escuchar notificaciones en primer plano
          messaging.onMessage((payload) => {
            const data = payload.data || {};
            if (data.tipo === 'fire') {
              setMostrarExito(false);
              setTimeout(() => {
                setMostrarMedalla({ emoji: '🔥', nombre: data.body || 'Tu nota recibió fuego!' });
                setTimeout(() => setMostrarMedalla(null), 3000);
              }, 100);
            } else if (data.tipo === 'medalla') {
              setMostrarMedalla({ emoji: data.emoji || '🏅', nombre: data.body || 'Nueva medalla!' });
              setTimeout(() => setMostrarMedalla(null), 4000);
            } else if (data.tipo === 'zona') {
              setMostrarMedalla({ emoji: '📍', nombre: data.body || 'Actividad cerca de ti!' });
              setTimeout(() => setMostrarMedalla(null), 3000);
            }
          });
        }
      } catch (e) {
        // Push notifications no disponibles - no es crítico
      }
    };
    loadFirebase();

    if (navigator.geolocation) {
      setUbicacionStatus('obteniendo');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUbicacion({ 
            lat: pos.coords.latitude, 
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy 
          });
          setUbicacionStatus('ok');
        },
        (err) => {
          if (err.code === 1) setUbicacionStatus('denegado');
          else setUbicacionStatus('error');
        },
        { enableHighAccuracy: true, timeout: 15000 }
      );
      
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          setUbicacion(prev => {
            if (prev && prev.lat && prev.lng) {
              const dist = calcularDistanciaKm(prev.lat, prev.lng, pos.coords.latitude, pos.coords.longitude) * 1000;
              if (dist < 50) return prev;
            }
            return { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
          });
          setUbicacionStatus('ok');
        },
        () => {},
        { enableHighAccuracy: true, timeout: 30000, maximumAge: 60000 }
      );
    } else {
      setUbicacionStatus('error');
    }

    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      if (cooldownIntervalRef.current) clearInterval(cooldownIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (ubicacion && ubicacion.lat && deviceId && fingerprint) {
      cargarTodo();
    }
  }, [ubicacion, deviceId, fingerprint]);

  useEffect(() => {
    if (!ubicacion || !ubicacion.lat || !deviceId) return;
    const interval = setInterval(cargarNotas, 30000);
    return () => clearInterval(interval);
  }, [ubicacion, deviceId]);

  // Renderizar Turnstile cuando se va a escribir
  useEffect(() => {
    if (turnstileLoaded && pantalla === 'escribir' && turnstileRef.current) {
      turnstileRef.current.innerHTML = '';
      setTurnstileToken(null);
      
      try {
        window.turnstile.render(turnstileRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          callback: (token) => {
            setTurnstileToken(token);
          },
          'expired-callback': () => {
            setTurnstileToken(null);
          },
          'error-callback': () => {
            // Si Turnstile falla, permitir publicar (la IA modera el contenido)
            setTurnstileToken('bypass-on-error');
          },
          theme: 'dark',
          size: 'normal',
        });
      } catch (e) {
        setTurnstileToken('bypass-on-error');
      }
    }
  }, [turnstileLoaded, pantalla]);

  // ============================================================
  // LOAD DATA
  // ============================================================
  const cargarTodo = async () => {
    setCargando(true);
    try {
      await Promise.all([cargarNotas(), cargarEstado(), cargarMisNotas(), cargarEstadisticas()]);
    } catch (e) {
      // Silent fail on load - user sees empty state
    } finally {
      setCargando(false);
    }
  };

  const cargarEstadisticas = async () => {
    if (!deviceId) return;
    try {
      const { data, error } = await supabase
        .from('estadisticas_usuario')
        .select('*')
        .eq('device_id', deviceId)
        .single();
      
      if (data && !error) {
        // Logros puede ser un objeto {chispa_10: "fecha", ...} o un array viejo ["star_2026_04"]
        let logrosData = data.logros || {};
        if (Array.isArray(logrosData)) {
          // Convertir formato viejo de array a objeto
          const obj = {};
          logrosData.forEach(l => { obj[l] = ''; });
          logrosData = obj;
        }
        
        setMisEstadisticas({
          total_fires_recibidos: data.total_fires_recibidos || 0,
          total_notas_publicadas: data.total_notas_publicadas || 0,
          mejor_nota_fires: data.mejor_nota_fires || 0,
          logros: logrosData
        });
      }
    } catch (e) {
      // Si no existe el registro, está bien
    }
  };

  const cargarNotas = async () => {
    if (!ubicacion || !ubicacion.lat || !ubicacion.lng) return;
    
    try {
      const { data, error: dbError } = await supabase
        .from('pensamientos')
        .select('id, texto, latitud, longitud, fires, created_at, expires_at')
        .eq('eliminado', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(200);
      
      if (dbError) return;
      
      const notasFiltradas = [];
      (data || []).forEach(nota => {
        if (!nota.latitud || !nota.longitud) return;
        const distancia = calcularDistanciaKm(ubicacion.lat, ubicacion.lng, nota.latitud, nota.longitud);
        if (distancia <= RADIO_KM) {
          notasFiltradas.push({
            ...nota, 
            distancia: distancia.toFixed(3),
            distanciaMetros: Math.round(distancia * 1000)
          });
        }
      });
      
      setNotas(notasFiltradas);
    } catch (e) {
      // Silent fail
    }

    // Load reactions
    try {
      const { data: reacciones } = await supabase
        .from('reacciones')
        .select('pensamiento_id')
        .eq('device_id', deviceId);
      if (reacciones) {
        setMisReacciones(new Set(reacciones.map((r) => r.pensamiento_id)));
      }
    } catch (e) {}
  };

  const cargarMisNotas = async () => {
    if (!deviceId) return;
    
    setCargandoMisNotas(true);
    try {
      const { data, error: dbError } = await supabase
        .from('pensamientos')
        .select('id, texto, latitud, longitud, fires, created_at, expires_at, device_id')
        .eq('device_id', deviceId)
        .eq('eliminado', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });
      
      if (!dbError) {
        setMisNotas(data || []);
      }
    } catch (e) {
      // Silent fail
    } finally {
      setCargandoMisNotas(false);
    }
  };

  const cargarEstado = async () => {
    try {
      const { data, error: err } = await supabase.rpc('obtener_estado', {
        p_device_id: deviceId,
        p_fingerprint: fingerprint,
      });
      if (err) throw err;
      if (data) {
        setPensamientosUsados(data.usados || 0);
        setVideosVistos(data.videos || 0);
        setTieneIlimitado(data.ilimitado || false);
        setExtrasComprados(data.extras || 0);
      }
    } catch (e) {
      // Silent fail
    }
  };

  // ============================================================
  // VERIFICAR CAPTCHA (Turnstile) - capa adicional, IA es la protección principal
  // ============================================================
  const verificarCaptcha = async (token) => {
    if (token === 'bypass-on-error') return true;
    
    try {
      const response = await fetch('https://xjzoabsuzbqxkriamqed.supabase.co/functions/v1/verify-captcha', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhqem9hYnN1emJxeGtyaWFtcWVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNzYyNDcsImV4cCI6MjA5MDg1MjI0N30.gS2lG4W-f_4Vtsz7cYZK9PAX6pI8fdD0br7geqaae6E',
        },
        body: JSON.stringify({ token }),
      });
      
      if (!response.ok) return true;
      const data = await response.json();
      return data.success === true;
    } catch (e) {
      return true; // Si falla, dejar pasar - la IA modera el contenido
    }
  };

  // ============================================================
  // [FIX-7] MODERAR CONTENIDO - FAIL CLOSED
  // ============================================================
  const moderarContenido = async (texto) => {
    try {
      const response = await fetch('https://xjzoabsuzbqxkriamqed.supabase.co/functions/v1/moderate-content', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhqem9hYnN1emJxeGtyaWFtcWVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNzYyNDcsImV4cCI6MjA5MDg1MjI0N30.gS2lG4W-f_4Vtsz7cYZK9PAX6pI8fdD0br7geqaae6E',
        },
        body: JSON.stringify({ texto }),
      });
      
      // Moderación FAIL-CLOSED: si falla, no se publica
      if (!response.ok) {
        return { permitido: false, razon: 'Error de moderación. Intenta de nuevo.' };
      }
      const data = await response.json();
      return data;
    } catch (e) {
      return { permitido: false, razon: 'No se pudo verificar el contenido. Intenta de nuevo.' };
    }
  };

  // ============================================================
  // PUBLICAR
  // ============================================================
  const publicar = async () => {
    if (!ubicacion || !ubicacion.lat || !ubicacion.lng) {
      setError('Necesitamos tu ubicación para publicar');
      return;
    }
    if (cooldownActivo) {
      setError(`Espera ${cooldownRestante}s antes de publicar otra nota`);
      return;
    }
    if (!puedeEscribir) { setMostrarModal(true); return; }
    if (!validarTexto(texto)) {
      setError('Solo letras, números y puntuación básica. Máximo 200 caracteres.');
      return;
    }

    setEnviando(true);
    setError('');

    try {
      // Verificar CAPTCHA si hay token
      if (turnstileToken && turnstileToken !== 'bypass-on-error') {
        const captchaOk = await verificarCaptcha(turnstileToken);
        if (!captchaOk) {
          setError('Error de verificación. Intenta de nuevo.');
          setTurnstileToken(null);
          setEnviando(false);
          return;
        }
      }
      
      // Moderar contenido con IA - FAIL CLOSED (protección principal)
      const moderacion = await moderarContenido(texto.trim());
      if (!moderacion.permitido) {
        setError(`🚫 ${moderacion.razon || 'Contenido no permitido'}`);
        setEnviando(false);
        return;
      }
      
      // [FIX-4] Ya no enviamos p_ip desde el cliente
      const { data, error: err } = await supabase.rpc('publicar_pensamiento', {
        p_texto: texto.trim(),
        p_lat: ubicacion.lat,
        p_lng: ubicacion.lng,
        p_device_id: deviceId,
        p_fingerprint: fingerprint,
        p_ip: null, // IP se obtiene server-side ahora
      });

      if (err) { setError('Error de conexión. Intenta de nuevo.'); setEnviando(false); return; }
      
      if (!data.ok) {
        if (data.error && data.error.includes('segundo')) {
          const match = data.error.match(/(\d+)/);
          const segundos = match ? parseInt(match[1]) : COOLDOWN_SECONDS;
          iniciarCooldown(segundos);
          setError(`⏱ Espera ${segundos} segundos antes de publicar otra nota`);
        } else {
          setError(data.error);
        }
        if (data.sin_notas) setMostrarModal(true);
        setEnviando(false);
        return;
      }

      // Éxito
      iniciarCooldown(COOLDOWN_SECONDS);
      setPensamientosUsados(data.usados);
      const nuevaNota = {...data.nota, distancia: '0.000', distanciaMetros: 0};
      setNotas((prev) => [nuevaNota, ...prev]);
      setMisNotas((prev) => [nuevaNota, ...prev]);
      setTexto('');
      setTurnstileToken(null);
      
      // Incrementar contador local (el servidor ya lo hizo en publicar_pensamiento)
      setMisEstadisticas(prev => ({
        ...prev,
        total_notas_publicadas: prev.total_notas_publicadas + 1
      }));
      
      setMostrarExito(true);
      setTimeout(() => { setMostrarExito(false); setPantalla('feed'); }, 1500);
    } catch (e) {
      setError('Error inesperado. Intenta de nuevo.');
    } finally {
      setEnviando(false);
    }
  };

  // ============================================================
  // [FIX-9] TOGGLE FIRE - CON DEBOUNCE ANTI-SPAM
  // ============================================================
  const hacerFire = async (notaId) => {
    // Prevenir doble-click / spam
    if (fireDebounceRef.current.has(notaId)) return;
    fireDebounceRef.current.add(notaId);
    
    const yaReaccione = misReacciones.has(notaId);

    // Actualización optimista
    setMisReacciones((prev) => {
      const next = new Set(prev);
      yaReaccione ? next.delete(notaId) : next.add(notaId);
      return next;
    });
    
    const updateFires = (notas) => notas.map((n) =>
      n.id === notaId ? { ...n, fires: n.fires + (yaReaccione ? -1 : 1) } : n
    );
    setNotas(updateFires);
    setMisNotas(updateFires);

    try {
      const { data, error } = await supabase.rpc('toggle_fire', {
        p_pensamiento_id: notaId,
        p_device_id: deviceId,
      });
      
      if (error) {
        // Revertir cambio optimista
        setMisReacciones((prev) => {
          const next = new Set(prev);
          yaReaccione ? next.add(notaId) : next.delete(notaId);
          return next;
        });
        const revertFires = (notas) => notas.map((n) =>
          n.id === notaId ? { ...n, fires: n.fires + (yaReaccione ? 1 : -1) } : n
        );
        setNotas(revertFires);
        setMisNotas(revertFires);
        return;
      }
      
      if (data && data.fires !== undefined) {
        const syncFires = (notas) => notas.map((n) => 
          n.id === notaId ? { ...n, fires: data.fires } : n
        );
        setNotas(syncFires);
        setMisNotas(syncFires);
        
        setMisReacciones((prev) => {
          const next = new Set(prev);
          if (data.liked) {
            next.add(notaId);
          } else {
            next.delete(notaId);
          }
          return next;
        });
        
        // Enviar push notification al autor de la nota (solo cuando se da fire, no cuando se quita)
        if (data.liked) {
          try {
            fetch('https://xjzoabsuzbqxkriamqed.supabase.co/functions/v1/send-notification', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhqem9hYnN1emJxeGtyaWFtcWVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNzYyNDcsImV4cCI6MjA5MDg1MjI0N30.gS2lG4W-f_4Vtsz7cYZK9PAX6pI8fdD0br7geqaae6E',
              },
              body: JSON.stringify({
                pensamiento_id: notaId,
                fires: data.fires,
                tipo: 'fire',
              }),
            }).catch(() => {}); // No esperar ni bloquear si falla
          } catch (e) {}
        }
      }
    } catch (e) {
      // Revertir cambio optimista
      setMisReacciones((prev) => {
        const next = new Set(prev);
        yaReaccione ? next.add(notaId) : next.delete(notaId);
        return next;
      });
      const revertFires = (notas) => notas.map((n) =>
        n.id === notaId ? { ...n, fires: n.fires + (yaReaccione ? 1 : -1) } : n
      );
      setNotas(revertFires);
      setMisNotas(revertFires);
    } finally {
      // [FIX-9] Cooldown de 500ms antes de permitir otro fire al mismo ID
      setTimeout(() => {
        fireDebounceRef.current.delete(notaId);
      }, 500);
    }
  };

  // ============================================================
  // VER VIDEO / COMPRAR
  // ============================================================
  const verVideo = async () => {
    try {
      const { data, error: err } = await supabase.rpc('ver_video', {
        p_device_id: deviceId,
        p_fingerprint: fingerprint,
      });
      if (err) throw err;
      if (data.ok) { setVideosVistos(data.videos); setMostrarModal(false); }
      else setError(data.error);
    } catch (e) { setError('Error al procesar video.'); }
  };

  const comprar = async (tipo) => {
    try {
      setError('');
      const response = await fetch('https://xjzoabsuzbqxkriamqed.supabase.co/functions/v1/create-checkout', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhqem9hYnN1emJxeGtyaWFtcWVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNzYyNDcsImV4cCI6MjA5MDg1MjI0N30.gS2lG4W-f_4Vtsz7cYZK9PAX6pI8fdD0br7geqaae6E',
        },
        body: JSON.stringify({ tipo, device_id: deviceId }),
      });
      
      const data = await response.json();
      
      if (data.ok && data.url) {
        // Redirigir a Stripe Checkout
        window.location.href = data.url;
      } else {
        setError(data.error || 'Error al procesar. Intenta de nuevo.');
      }
    } catch (e) { setError('Error de conexión. Intenta de nuevo.'); }
  };

  // ============================================================
  // [FIX-10] REPORTAR - CON PROTECCIÓN ANTI-SPAM
  // ============================================================
  const reportarNota = async (notaId) => {
    // Prevenir reportes duplicados en la misma sesión
    if (reporteDebounceRef.current.has(notaId)) {
      alert('Ya reportaste esta nota.');
      setMostrarReporte(null);
      return;
    }
    
    try {
      const { data, error } = await supabase.rpc('reportar_nota', {
        p_pensamiento_id: notaId,
        p_device_id: deviceId,
        p_razon: 'contenido inapropiado',
      });
      
      if (error) {
        alert('Error al reportar. Intenta de nuevo.');
        return;
      }
      
      if (data?.ok) {
        // Marcar como reportada en esta sesión
        reporteDebounceRef.current.add(notaId);
        setMostrarReporte(null);
        if (data.eliminado || data.reportes >= 5) {
          setNotas((prev) => prev.filter((n) => n.id !== notaId));
          alert('Nota reportada y eliminada. Gracias por ayudar a mantener la comunidad.');
        } else {
          alert('Nota reportada. Gracias por ayudar.');
        }
      } else if (data?.error) {
        alert(data.error);
        setMostrarReporte(null);
      }
    } catch (e) {
      alert('Error al reportar. Intenta de nuevo.');
    }
  };

  // ============================================================
  // RENDER
  // ============================================================

  // Pantalla de ubicación denegada
  if (ubicacionStatus === 'denegado') {
    return (
      <div style={S.container}>
        <div style={S.ubicacionError}>
          <div style={S.ubicacionIcono}>📍</div>
          <h2 style={S.ubicacionTitulo}>FIRE necesita tu ubicación</h2>
          <p style={S.ubicacionTexto}>
            Las notas solo son visibles a 1km de ti.<br/>
            Sin ubicación, no podemos mostrarte nada.
          </p>
          <button onClick={() => window.location.reload()} style={S.btnPrimario}>
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={S.container}>
      {/* ===== HEADER ===== */}
      <header style={S.header}>
        <button onClick={() => setMostrarInfo(true)} style={S.infoBtn}>
          <span style={{ fontSize: '16px' }}>?</span>
        </button>
        
        <div style={S.logoWrap}>
          <span style={{ fontSize: '26px' }}>🔥</span>
          <span style={S.logoFire}>FIRE</span>
          <span style={S.logoNotes}>NOTES</span>
        </div>
        
        <div style={S.headerRight}>
          <div style={S.contadorWrap} onClick={() => setMostrarDebug(!mostrarDebug)}>
            {tieneIlimitado ? (
              <span style={S.contadorInfinito}>∞</span>
            ) : (
              <div style={S.contadorNotas}>
                {[...Array(MAX_NOTAS_GRATIS)].map((_, i) => {
                  const restantes = totalDisponible - pensamientosUsados;
                  const disponible = i < restantes;
                  return (
                    <span key={i} style={{
                      fontSize: '14px',
                      opacity: disponible ? 1 : 0.25,
                      transition: 'all 0.3s ease',
                      filter: disponible ? 'none' : 'grayscale(100%)',
                    }}>
                      {disponible ? '🔥' : '○'}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* DEBUG BAR */}
      {mostrarDebug && ubicacion && (
        <div style={S.debugBar}>
          📍 {ubicacion.lat.toFixed(5)}, {ubicacion.lng.toFixed(5)} | 
          ±{Math.round(ubicacion.accuracy || 0)}m | 
          📊 {notas.length} notas | 
          🆔 {deviceId.slice(0,12)}...
        </div>
      )}

      {/* ===== TAB BAR ===== */}
      <div style={S.tabBar}>
        <button 
          onClick={() => setPantalla('feed')} 
          style={{...S.tab, ...(pantalla === 'feed' ? S.tabActive : {})}}
        >
          <span style={{ marginRight: '6px' }}>🌍</span>
          Cerca de ti
        </button>
        <button 
          onClick={() => setPantalla('mapa')} 
          style={{...S.tab, ...(pantalla === 'mapa' ? S.tabActive : {})}}
        >
          <span style={{ marginRight: '6px' }}>🏆</span>
          Mapa y Top 10
        </button>
        <button 
          onClick={() => { cargarMisNotas(); cargarEstadisticas(); setPantalla('misnotas'); }} 
          style={{...S.tab, ...(pantalla === 'misnotas' ? S.tabActive : {})}}
        >
          <span style={{ marginRight: '6px' }}>📝</span>
          Tus notas {misNotas.length > 0 && <span style={S.badge}>{misNotas.length}</span>}
        </button>
      </div>

      {/* ===== INDICADOR DE ZONA ===== */}
      {!cargando && pantalla === 'feed' && (
        <div style={S.zonaIndicador}>
          {notas.length === 0 ? (
            <span>❄️ Tu zona está fría — sé el primero en soltar algo</span>
          ) : notas.length < 5 ? (
            <span>🌡️ {notas.length} {notas.length === 1 ? 'nota' : 'notas'} cerca de ti</span>
          ) : (
            <span style={{ color: COLORS.orange }}>🔥 ¡Zona activa! — {notas.length} notas</span>
          )}
        </div>
      )}

      {/* ===== COOLDOWN BANNER ===== */}
      {cooldownActivo && (
        <div style={S.cooldownBanner}>
          <span>⏱</span>
          <span>Puedes publicar otra nota en <strong>{cooldownRestante}s</strong></span>
        </div>
      )}

      {/* ===== STATS DE MIS NOTAS + HISTORIAL ===== */}
      {pantalla === 'misnotas' && !cargandoMisNotas && (
        <>
          {/* NOTAS ACTIVAS */}
          <div style={S.misNotasStats}>
            <div style={S.statItem}>
              <span style={S.statNumber}>{misNotas.length}</span>
              <span style={S.statLabel}>notas activas</span>
            </div>
          </div>
          
          {/* HISTORIAL */}
          <div style={S.historialBox}>
            <div style={S.historialStats}>
              <div style={S.historialStatItem}>
                <span style={S.historialStatNumber}>{misEstadisticas.total_notas_publicadas}</span>
                <span style={S.historialStatLabel}>notas totales</span>
              </div>
              <div style={S.historialStatItem}>
                <span style={{...S.historialStatNumber, color: COLORS.gold}}>{misEstadisticas.total_fires_recibidos.toLocaleString()}</span>
                <span style={S.historialStatLabel}>🔥 recibidos</span>
              </div>
              <div style={S.historialStatItem}>
                <span style={S.historialStatNumber}>{misEstadisticas.mejor_nota_fires.toLocaleString()}</span>
                <span style={S.historialStatLabel}>mejor nota 🔥</span>
              </div>
            </div>
            
            {/* Sistema de Medallas */}
            {(() => {
              const logros = misEstadisticas.logros || {};
              const medallas = [
                { key: 'chispa_10', emoji: '🔥', nombre: 'Chispa', desc: '10 fuegos en una nota', color: '#FF6B35' },
                { key: 'fogata_50', emoji: '🔥🔥', nombre: 'Fogata', desc: '50 fuegos en una nota', color: '#FF4500' },
                { key: 'incendio_100', emoji: '🔥🔥🔥', nombre: 'Incendio', desc: '100 fuegos en una nota', color: '#FF0000' },
                { key: 'volcan_1000', emoji: '🌋', nombre: 'Volcán', desc: '1,000 fuegos en una nota', color: '#FF6B35' },
                { key: 'estrella_10000', emoji: '🌟', nombre: 'Estrella Dorada', desc: '10,000 fuegos en una nota', color: '#FFD700' },
              ];
              const medallasObtenidas = medallas.filter(m => logros[m.key]);
              const medallasPendientes = medallas.filter(m => !logros[m.key]);
              
              return (
                <div style={{ textAlign: 'center', borderTop: `1px solid ${COLORS.bgCard}`, paddingTop: '16px' }}>
                  <p style={{ fontSize: '14px', fontWeight: '600', color: COLORS.gold, marginBottom: '16px' }}>
                    🏅 Tus Medallas
                  </p>
                  
                  {medallasObtenidas.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '10px', marginBottom: '16px' }}>
                      {medallasObtenidas.map((m) => {
                        const fecha = logros[m.key];
                        const fechaCorta = fecha ? new Date(fecha).toLocaleDateString('es-MX', { month: 'short', year: 'numeric' }) : '';
                        return (
                          <div key={m.key} style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center',
                            padding: '12px 16px',
                            background: `linear-gradient(135deg, ${COLORS.bgCard}, #2a2a3a)`,
                            borderRadius: '12px',
                            border: `2px solid ${m.color}`,
                            boxShadow: `0 0 15px ${m.color}40`,
                            minWidth: '80px',
                          }}>
                            <span style={{ fontSize: '28px', filter: `drop-shadow(0 0 6px ${m.color})` }}>{m.emoji}</span>
                            <span style={{ fontSize: '11px', fontWeight: '700', color: m.color, marginTop: '4px' }}>{m.nombre}</span>
                            {fechaCorta && <span style={{ fontSize: '9px', color: COLORS.gray, marginTop: '2px' }}>{fechaCorta}</span>}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ padding: '12px', marginBottom: '12px' }}>
                      <span style={{ fontSize: '32px', opacity: 0.3 }}>🏅</span>
                      <p style={{ fontSize: '12px', color: COLORS.gray, marginTop: '8px' }}>
                        Aún no tienes medallas. ¡Consigue 10 🔥 en una nota!
                      </p>
                    </div>
                  )}
                  
                  {medallasPendientes.length > 0 && (
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                      padding: '10px 16px',
                      backgroundColor: `${COLORS.bgCard}`,
                      borderRadius: '10px',
                      border: `1px dashed ${COLORS.gray}40`,
                    }}>
                      <span style={{ fontSize: '18px', opacity: 0.4 }}>{medallasPendientes[0].emoji}</span>
                      <div style={{ textAlign: 'left' }}>
                        <span style={{ fontSize: '11px', fontWeight: '600', color: COLORS.grayLight }}>
                          Siguiente: {medallasPendientes[0].nombre}
                        </span>
                        <p style={{ fontSize: '10px', color: COLORS.gray, margin: 0 }}>
                          {medallasPendientes[0].desc}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
          
          {/* COMPARTIR */}
          <div style={{ padding: '0 16px 8px 16px' }}>
            <button
              onClick={() => {
                const shareData = {
                  title: '🔥 Fire Notes',
                  text: 'Pensamientos anónimos cerca de ti. Todo desaparece en 24h.',
                  url: 'https://firenotesapp.com',
                };
                if (navigator.share) {
                  navigator.share(shareData).catch(() => {});
                } else {
                  navigator.clipboard.writeText('🔥 Fire Notes — Pensamientos anónimos cerca de ti. firenotesapp.com');
                  setMostrarMedalla({ emoji: '📋', nombre: 'Link copiado!' });
                  setTimeout(() => setMostrarMedalla(null), 2000);
                }
              }}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '12px',
                border: `1px solid ${COLORS.purple}40`,
                background: 'transparent',
                color: COLORS.purpleLight,
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                fontFamily: "'Space Grotesk', sans-serif",
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <span>📤</span> Invita amigos a Fire Notes
            </button>
          </div>
        </>
      )}

      {/* ===== FEED ===== */}
      {pantalla === 'feed' && (
        <main style={S.feed}>
          {cargando ? (
            <div style={S.empty}>
              <div style={S.spinner}></div>
              <p style={S.emptyText}>Buscando notas cerca de ti...</p>
            </div>
          ) : notas.length === 0 ? (
            <div style={S.empty}>
              <span style={{ fontSize: '56px', marginBottom: '16px' }}>🔥</span>
              <p style={S.emptyTitle}>No hay notas cerca</p>
              <p style={S.emptyText}>Sé el primero en soltar un pensamiento en tu zona</p>
            </div>
          ) : (
            <div style={S.notasGrid}>
              {(() => {
                // Nota con más fuegos va primero con corona
                const topNota = notas.filter(n => n.fires > 0).sort((a, b) => b.fires - a.fires)[0];
                const resto = topNota 
                  ? notas.filter(n => n.id !== topNota.id) // Las demás en orden original (más nuevas primero)
                  : notas;
                const ordenadas = topNota ? [topNota, ...resto] : resto;
                
                return ordenadas.map((nota) => {
                const esTop = topNota && nota.id === topNota.id;
                const quemado = calcularQuemado(nota.created_at, nota.expires_at);
                const nivelFuego = getNivelFuego(quemado);
                const estaArdiendo = nota.fires >= 10;
                const tieneReaccion = misReacciones.has(nota.id);
                const esMia = nota.device_id === deviceId;
                
                const estiloQuemado = {
                  opacity: nivelFuego >= 3 ? 0.85 : nivelFuego >= 2 ? 0.9 : 1 - (quemado * 0.15),
                  boxShadow: esTop
                    ? '0 0 20px rgba(255, 215, 0, 0.4), 0 0 40px rgba(255, 215, 0, 0.2), 0 4px 24px rgba(0,0,0,0.5)'
                    : nivelFuego >= 2 
                      ? '0 0 20px rgba(255, 107, 53, 0.5), 0 0 40px rgba(255, 69, 0, 0.3)'
                      : estaArdiendo 
                        ? '0 4px 20px rgba(255, 107, 53, 0.3)'
                        : '0 2px 12px rgba(0,0,0,0.3)',
                  border: esTop 
                    ? '2px solid #FFD700'
                    : nivelFuego >= 2 ? '2px solid #FF6B35' : 'none',
                  animation: nivelFuego >= 3 ? 'burning 1.5s ease-in-out infinite' : esTop ? 'glow 2s ease-in-out infinite' : 'none',
                  // TOP 1: fondo morado oscuro premium
                  ...(esTop ? {
                    backgroundColor: '#2D1B4E',
                    background: 'linear-gradient(135deg, #2D1B4E 0%, #1A1A2E 50%, #2D1B4E 100%)',
                  } : {}),
                };
                
                return (
                  <div key={nota.id} style={{
                    ...S.nota,
                    ...estiloQuemado,
                  }}>
                    {/* Líneas de cuaderno solo en notas normales */}
                    {!esTop && <div style={S.notaLines} />}
                    
                    {/* Efecto quemándose - borde inferior con gradiente */}
                    {nivelFuego >= 2 && (
                      <div style={{
                        position: 'absolute',
                        bottom: 0, left: 0, right: 0,
                        height: nivelFuego >= 3 ? '40px' : '24px',
                        background: nivelFuego >= 3 
                          ? 'linear-gradient(to top, rgba(255,69,0,0.4), rgba(255,107,53,0.15), transparent)'
                          : 'linear-gradient(to top, rgba(255,107,53,0.2), transparent)',
                        borderRadius: '0 0 8px 8px',
                        pointerEvents: 'none',
                        zIndex: 2,
                      }} />
                    )}
                    
                    {/* Indicador de tiempo restante para notas que se queman */}
                    {nivelFuego >= 2 && (
                      <div style={{
                        position: 'absolute',
                        top: '8px', right: '8px',
                        fontSize: '11px',
                        backgroundColor: nivelFuego >= 3 ? '#FF4500' : '#FF6B35',
                        color: '#fff',
                        padding: '2px 8px',
                        borderRadius: '8px',
                        fontWeight: '600',
                        zIndex: 10,
                        display: 'flex', alignItems: 'center', gap: '4px',
                      }}>
                        {nivelFuego >= 3 ? '🔥' : '⏱'} {tiempoRestanteCorto(nota.expires_at)}
                      </div>
                    )}
                    
                    {/* Badge Top 1 - DENTRO de la nota */}
                    {esTop && (
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                        marginBottom: '10px',
                        position: 'relative', zIndex: 5,
                      }}>
                        <span style={{ fontSize: '20px' }}>👑</span>
                        <span style={{
                          fontSize: '13px', fontWeight: '700', color: '#FFD700',
                          letterSpacing: '2px',
                        }}>
                          TOP 1
                        </span>
                        <span style={{ fontSize: '20px' }}>👑</span>
                      </div>
                    )}
                    
                    {esMia && <div style={S.tuNotaBadgeFeed}>Tu nota</div>}
                    
                    {estaArdiendo && !esTop && nivelFuego < 2 && <div style={S.notaHot}>🔥</div>}
                    
                    <p style={{
                      ...S.notaTexto,
                      ...(esTop ? { color: '#FFFFFF', fontSize: '16px', fontWeight: '500' } : {}),
                    }}>{nota.texto}</p>
                    
                    <div style={S.notaFooter}>
                      <div style={S.notaMeta}>
                        <span style={{
                          ...S.notaTiempo,
                          color: esTop ? '#FFD700' : nivelFuego >= 2 ? '#FF6B35' : '#8B7355',
                          fontWeight: nivelFuego >= 2 || esTop ? '600' : '500',
                        }}>
                          {timeAgo(nota.created_at)}
                          {nivelFuego >= 2 && ` · ${tiempoRestanteCorto(nota.expires_at)} 💨`}
                        </span>
                        <span style={{
                          ...S.notaDistancia,
                          ...(esTop ? { color: '#A0AEC0', backgroundColor: 'rgba(255,255,255,0.1)' } : {}),
                        }}>{nota.distanciaMetros}m</span>
                      </div>
                      <div style={S.notaActions}>
                        <button onClick={() => setMostrarReporte(nota.id)} style={{
                          ...S.reportBtn,
                          ...(esTop ? { color: '#A0AEC0' } : {}),
                        }}>
                          ⚑
                        </button>
                        <button 
                          onClick={() => hacerFire(nota.id)} 
                          style={{
                            ...S.fireBtn,
                            backgroundColor: tieneReaccion ? 'rgba(255,107,53,0.3)' : esTop ? 'rgba(255,215,0,0.15)' : 'transparent',
                            borderColor: tieneReaccion ? COLORS.orange : esTop ? '#FFD700' : 'rgba(0,0,0,0.1)',
                          }}
                        >
                          <span style={{ fontSize: '16px' }}>🔥</span>
                          <span style={{ 
                            fontWeight: '600',
                            color: tieneReaccion ? COLORS.orange : esTop ? '#FFD700' : COLORS.noteText,
                          }}>
                            {nota.fires}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
                });
              })()}
            </div>
          )}
        </main>
      )}

      {/* ===== MAPA DE CALOR ===== */}
      {pantalla === 'mapa' && (
        <main style={S.mapaContainer}>
          <div style={S.mapaHeader}>
            <h3 style={S.mapaTitle}>🗺️ Mapa y Top 10</h3>
            <p style={S.mapaSubtitle}>Notas en tu zona (1km de radio)</p>
          </div>
          
          <div style={S.mapaVisual}>
            <div style={S.mapaCirculo}>
              <div style={S.mapaCentro}>📍</div>
              
              {notas.map((nota, idx) => {
                const distancia = nota.distanciaMetros || 500;
                const angulo = (idx * 137.5) % 360;
                const radio = (distancia / 1000) * 45;
                const x = 50 + radio * Math.cos(angulo * Math.PI / 180);
                const y = 50 + radio * Math.sin(angulo * Math.PI / 180);
                
                let content, size, glow, animation, color;
                
                if (nota.fires >= 10000) {
                  content = '🌟'; size = 28;
                  glow = '0 0 20px #FFD700, 0 0 40px #FFD700, 0 0 60px #FFA500';
                  animation = 'pulse 0.6s ease infinite'; color = '#FFD700';
                } else if (nota.fires >= 1000) {
                  content = '🌋'; size = 24;
                  glow = '0 0 15px #FF6B35, 0 0 30px #FF6B35';
                  animation = 'pulse 0.8s ease infinite'; color = '#FF6B35';
                } else if (nota.fires >= 100) {
                  content = '🔥🔥🔥'; size = 16;
                  glow = '0 0 12px #FF0000, 0 0 24px #FF0000';
                  animation = 'pulse 1s ease infinite'; color = '#FF0000';
                } else if (nota.fires >= 50) {
                  content = '🔥🔥'; size = 16;
                  glow = '0 0 8px #FF4500';
                  animation = 'pulse 1.2s ease infinite'; color = '#FF4500';
                } else if (nota.fires >= 10) {
                  content = '🔥'; size = 16;
                  glow = '0 0 6px #FF6B35';
                  animation = 'none'; color = '#FF6B35';
                } else {
                  content = '💭'; size = 14;
                  glow = 'none'; animation = 'none'; color = '#8892B0';
                }
                
                return (
                  <div
                    key={nota.id}
                    style={{
                      position: 'absolute',
                      left: `${x}%`,
                      top: `${y}%`,
                      transform: 'translate(-50%, -50%)',
                      fontSize: `${size}px`,
                      filter: nota.fires >= 1000 ? 'drop-shadow(0 0 8px gold)' : nota.fires >= 100 ? 'drop-shadow(0 0 4px red)' : 'none',
                      animation: animation,
                      cursor: 'pointer',
                      zIndex: Math.min(nota.fires, 100) + 1,
                      whiteSpace: 'nowrap',
                    }}
                    title={`${nota.fires.toLocaleString()} 🔥 · ${nota.distanciaMetros}m`}
                  >
                    {content}
                  </div>
                );
              })}
              
              <div style={S.mapaCircle500}></div>
              <div style={S.mapaCircle1000}></div>
            </div>
            
            <div style={S.mapaLeyenda}>
              <span>💭 &lt;10</span>
              <span>🔥 10+</span>
              <span>🔥🔥 50+</span>
              <span>🔥🔥🔥 100+</span>
              <span>🌋 1k+</span>
              <span>🌟 10k+</span>
            </div>
          </div>
          
          <div style={S.mapaStats}>
            <div style={S.mapaStatItem}>
              <span style={S.mapaStatNumber}>{notas.length}</span>
              <span style={S.mapaStatLabel}>notas cerca</span>
            </div>
            <div style={S.mapaStatItem}>
              <span style={S.mapaStatNumber}>
                {notas.filter(n => n.fires >= 5).length}
              </span>
              <span style={S.mapaStatLabel}>activas</span>
            </div>
            <div style={S.mapaStatItem}>
              <span style={S.mapaStatNumber}>
                {notas.reduce((sum, n) => sum + n.fires, 0)}
              </span>
              <span style={S.mapaStatLabel}>🔥 total</span>
            </div>
          </div>
          
          <div style={S.mapaZonaInfo}>
            {notas.length === 0 ? (
              <>
                <span style={{ fontSize: '32px', marginBottom: '8px' }}>❄️</span>
                <p style={S.mapaZonaText}>Tu zona está fría</p>
                <p style={S.mapaZonaSubtext}>Sé el primero en soltar un pensamiento</p>
              </>
            ) : notas.length < 5 ? (
              <>
                <span style={{ fontSize: '32px', marginBottom: '8px' }}>🌡️</span>
                <p style={S.mapaZonaText}>Zona tibia</p>
                <p style={S.mapaZonaSubtext}>{notas.length} {notas.length === 1 ? 'nota' : 'notas'} cerca de ti</p>
              </>
            ) : notas.length < 15 ? (
              <>
                <span style={{ fontSize: '32px', marginBottom: '8px' }}>🔥</span>
                <p style={S.mapaZonaText}>¡Zona activa!</p>
                <p style={S.mapaZonaSubtext}>{notas.length} notas y {notas.reduce((s, n) => s + n.fires, 0)} fuegos</p>
              </>
            ) : (
              <>
                <span style={{ fontSize: '32px', marginBottom: '8px' }}>🌋</span>
                <p style={{...S.mapaZonaText, color: COLORS.orange}}>¡ZONA EN LLAMAS!</p>
                <p style={S.mapaZonaSubtext}>{notas.length} notas y {notas.reduce((s, n) => s + n.fires, 0)} fuegos</p>
              </>
            )}
          </div>
          
          {/* TOP 5 EN EL MAPA */}
          {notas.some(n => n.fires >= 1) && (
            <div style={{
              backgroundColor: COLORS.bgSecondary,
              borderRadius: '16px',
              padding: '16px',
              border: `1px solid ${COLORS.bgCard}`,
            }}>
              <p style={{
                fontSize: '16px', fontWeight: '700', color: COLORS.gold,
                textAlign: 'center', marginBottom: '14px', margin: 0,
                fontFamily: "'Space Grotesk', sans-serif",
              }}>
                🏆 Top 10
              </p>
              {[...notas]
                .filter(n => n.fires >= 1)
                .sort((a, b) => b.fires - a.fires)
                .slice(0, 10)
                .map((nota, idx) => {
                  const medalla = nota.fires >= 10000 ? '🌟' : nota.fires >= 1000 ? '🌋' : nota.fires >= 100 ? '🔥🔥🔥' : nota.fires >= 50 ? '🔥🔥' : nota.fires >= 10 ? '🔥' : '';
                  return (
                    <div key={nota.id} style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '10px 0',
                      borderBottom: idx < 9 ? `1px solid ${COLORS.bgCard}` : 'none',
                    }}>
                      <span style={{
                        fontSize: idx === 0 ? '22px' : '16px',
                        fontWeight: '700',
                        color: idx === 0 ? COLORS.gold : idx === 1 ? '#C0C0C0' : idx === 2 ? '#CD7F32' : COLORS.gray,
                        minWidth: '28px',
                        textAlign: 'center',
                      }}>
                        {idx === 0 ? '👑' : `${idx + 1}`}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{
                          margin: 0, fontSize: '13px', color: COLORS.white,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {nota.texto}
                        </p>
                        <span style={{ fontSize: '10px', color: COLORS.gray }}>{nota.distanciaMetros}m · {timeAgo(nota.created_at)}</span>
                      </div>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '4px',
                        padding: '4px 10px',
                        backgroundColor: nota.fires >= 10 ? `${COLORS.orange}20` : 'transparent',
                        borderRadius: '12px',
                      }}>
                        <span style={{ fontSize: '14px' }}>{medalla || '🔥'}</span>
                        <span style={{
                          fontSize: '14px', fontWeight: '700',
                          color: nota.fires >= 10 ? COLORS.orange : COLORS.grayLight,
                        }}>
                          {nota.fires}
                        </span>
                      </div>
                    </div>
                  );
                })
              }
            </div>
          )}
        </main>
      )}

      {/* ===== MIS NOTAS ===== */}
      {pantalla === 'misnotas' && (
        <main style={S.feed}>
          {cargandoMisNotas ? (
            <div style={S.empty}>
              <div style={S.spinner}></div>
              <p style={S.emptyText}>Cargando tus notas...</p>
            </div>
          ) : misNotas.length === 0 ? (
            <div style={S.empty}>
              <span style={{ fontSize: '56px', marginBottom: '16px' }}>📝</span>
              <p style={S.emptyTitle}>No tienes notas activas</p>
              <p style={S.emptyText}>Las notas desaparecen en 24 horas</p>
              <button 
                onClick={() => setPantalla('escribir')}
                style={{...S.btnPrimario, marginTop: '20px'}}
              >
                Escribir nota
              </button>
            </div>
          ) : (
            <div style={S.notasGrid}>
              {misNotas.map((nota) => {
                const quemado = calcularQuemado(nota.created_at, nota.expires_at);
                const nivelFuego = getNivelFuego(quemado);
                const estaArdiendo = nota.fires >= 10;
                
                const estiloQuemado = {
                  opacity: nivelFuego >= 3 ? 0.85 : nivelFuego >= 2 ? 0.9 : 1,
                  boxShadow: nivelFuego >= 2 
                    ? '0 0 20px rgba(255, 107, 53, 0.5), 0 0 40px rgba(255, 69, 0, 0.3)'
                    : estaArdiendo 
                      ? '0 4px 20px rgba(255, 107, 53, 0.3)'
                      : '0 2px 12px rgba(0,0,0,0.3)',
                  border: nivelFuego >= 2 ? '2px solid #FF6B35' : `2px solid ${COLORS.purple}40`,
                  animation: nivelFuego >= 3 ? 'burning 1.5s ease-in-out infinite' : 'none',
                };
                
                return (
                  <div key={nota.id} style={{
                    ...S.nota,
                    ...estiloQuemado,
                  }}>
                    <div style={S.notaLines} />
                    
                    {/* Efecto quemándose - gradiente inferior */}
                    {nivelFuego >= 2 && (
                      <div style={{
                        position: 'absolute',
                        bottom: 0, left: 0, right: 0,
                        height: nivelFuego >= 3 ? '40px' : '24px',
                        background: nivelFuego >= 3 
                          ? 'linear-gradient(to top, rgba(255,69,0,0.4), rgba(255,107,53,0.15), transparent)'
                          : 'linear-gradient(to top, rgba(255,107,53,0.2), transparent)',
                        borderRadius: '0 0 8px 8px',
                        pointerEvents: 'none',
                        zIndex: 2,
                      }} />
                    )}
                    
                    {/* Tiempo restante para notas que se queman */}
                    {nivelFuego >= 2 && (
                      <div style={{
                        position: 'absolute',
                        top: '8px', left: '8px',
                        fontSize: '11px',
                        backgroundColor: nivelFuego >= 3 ? '#FF4500' : '#FF6B35',
                        color: '#fff',
                        padding: '2px 8px',
                        borderRadius: '8px',
                        fontWeight: '600',
                        zIndex: 10,
                        display: 'flex', alignItems: 'center', gap: '4px',
                      }}>
                        {nivelFuego >= 3 ? '🔥' : '⏱'} {tiempoRestanteCorto(nota.expires_at)}
                      </div>
                    )}
                    
                    <div style={S.tuNotaBadge}>Tu nota</div>
                    <p style={S.notaTexto}>{nota.texto}</p>
                    <div style={S.notaFooter}>
                      <div style={S.notaMetaCol}>
                        <span style={{
                          ...S.notaTiempo,
                          color: nivelFuego >= 2 ? '#FF6B35' : '#8B7355',
                        }}>
                          {timeAgo(nota.created_at)}
                        </span>
                        <span style={{
                          ...S.notaExpira,
                          color: nivelFuego >= 2 ? '#FF6B35' : COLORS.gray,
                          fontWeight: nivelFuego >= 2 ? '600' : '400',
                        }}>
                          ⏱ {tiempoRestante(nota.expires_at)} {nivelFuego >= 2 && '💨'}
                        </span>
                      </div>
                      <div style={{
                        ...S.fireCount,
                        backgroundColor: estaArdiendo ? 'rgba(255,107,53,0.15)' : 'rgba(0,0,0,0.03)',
                        borderColor: estaArdiendo ? COLORS.orange : 'transparent',
                      }}>
                        <span style={{ fontSize: estaArdiendo ? '22px' : '18px' }}>🔥</span>
                        <span style={{ 
                          fontSize: '18px', 
                          fontWeight: 'bold',
                          color: estaArdiendo ? COLORS.orange : COLORS.noteText,
                        }}>
                          {nota.fires}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      )}

      {/* ===== ESCRIBIR ===== */}
      {pantalla === 'escribir' && (
        <main style={S.escribir}>
          <div style={S.papelEscribir}>
            <div style={S.notaLines} />
            <textarea
              value={texto}
              onChange={(e) => e.target.value.length <= 200 && setTexto(e.target.value)}
              placeholder="Suelta tu pensamiento..."
              style={S.textarea}
              autoFocus
              maxLength={200}
            />
            <div style={S.charCount}>
              <span style={{ color: texto.length > 180 ? COLORS.danger : '#8B7355' }}>
                {texto.length}
              </span>/200
            </div>
          </div>

          {error && <p style={S.errorText}>{error}</p>}
          
          {cooldownActivo && (
            <p style={S.cooldownText}>
              ⏱ Podrás publicar en {cooldownRestante}s
            </p>
          )}

          {/* Turnstile CAPTCHA */}
          <div 
            ref={turnstileRef} 
            style={{ 
              margin: '16px 0', 
              minHeight: '65px',
              display: 'flex',
              justifyContent: 'center',
            }}
          />
          {turnstileToken && turnstileToken !== 'bypass-on-error' && (
            <p style={{ color: COLORS.success, fontSize: '12px', textAlign: 'center', marginBottom: '12px' }}>
              ✓ Verificación completada
            </p>
          )}

          <button
            onClick={publicar}
            disabled={enviando || !texto.trim() || cooldownActivo}
            style={{ 
              ...S.btnPrimario, 
              opacity: (enviando || !texto.trim() || cooldownActivo) ? 0.5 : 1,
              cursor: (enviando || !texto.trim() || cooldownActivo) ? 'not-allowed' : 'pointer',
            }}
          >
            {enviando ? 'Soltando...' : cooldownActivo ? `Espera ${cooldownRestante}s` : '🔥 SOLTAR'}
          </button>

          <button onClick={() => { setPantalla('feed'); setError(''); }} style={S.btnSecundario}>
            Cancelar
          </button>
        </main>
      )}

      {/* ===== FAB ===== */}
      {(pantalla === 'feed' || pantalla === 'misnotas') && (
        <button
          onClick={() => {
            if (cooldownActivo) {
              setError(`Espera ${cooldownRestante}s antes de publicar`);
              return;
            }
            if (!puedeEscribir) setMostrarModal(true);
            else { setError(''); setPantalla('escribir'); }
          }}
          style={{
            ...S.fab,
            opacity: cooldownActivo ? 0.6 : 1,
          }}
        >
          ✏️
        </button>
      )}

      {/* ===== TOASTS & MODALS ===== */}
      {mostrarExito && <div style={S.toast}>🔥 Nota publicada</div>}
      
      {/* Medal toast */}
      {mostrarMedalla && (
        <div style={{
          ...S.toast,
          background: 'linear-gradient(135deg, #FF6B35, #FFD700)',
          boxShadow: '0 4px 24px rgba(255, 215, 0, 0.5)',
        }}>
          {mostrarMedalla.emoji} {mostrarMedalla.nombre}
        </div>
      )}

      {/* Modal: Bienvenida */}
      {mostrarBienvenida && (
        <div style={S.overlay} onClick={() => setMostrarBienvenida(false)}>
          <div style={S.modal} onClick={(e) => e.stopPropagation()}>
            <div style={S.modalHeader}>
              <span style={{ fontSize: '48px' }}>🔥</span>
              <h2 style={S.modalTitle}>Bienvenido a FIRE</h2>
            </div>
            <p style={S.modalDesc}>
              Pensamientos anónimos que solo ven las personas a <strong style={{ color: COLORS.orange }}>1km de ti</strong>.
            </p>
            <div style={S.welcomeFeatures}>
              <div style={S.welcomeFeature}>
                <span>📍</span>
                <span>Las notas flotan donde las sueltas</span>
              </div>
              <div style={S.welcomeFeature}>
                <span>⏱</span>
                <span>Todo desaparece en 24h</span>
              </div>
              <div style={S.welcomeFeature}>
                <span>👤</span>
                <span>Cero registro, cero datos, 100% anónimo</span>
              </div>
              <div style={S.welcomeFeature}>
                <span>🔥</span>
                <span>Sin likes, sin corazones, solo fuegos</span>
              </div>
            </div>
            <p style={{
              fontSize: '13px',
              color: COLORS.grayLight,
              textAlign: 'center',
              fontStyle: 'italic',
              lineHeight: '1.6',
              marginBottom: '20px',
              padding: '12px',
              borderLeft: `3px solid ${COLORS.gold}`,
              backgroundColor: `${COLORS.bgCard}`,
              borderRadius: '0 8px 8px 0',
            }}>
              Cuando tu nota recibe fuegos no es porque les gustó tu foto o tu nombre, es porque lo que escribiste conectó de verdad. <strong style={{ color: COLORS.gold }}>Sin cara, sin filtro, solo tus palabras.</strong>
            </p>
            <button onClick={() => setMostrarBienvenida(false)} style={S.btnPrimario}>
              ¡Entendido!
            </button>
          </div>
        </div>
      )}

      {/* Modal: Sin notas */}
      {mostrarModal && (
        <div style={S.overlay} onClick={() => setMostrarModal(false)}>
          <div style={S.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={S.modalTitle}>Se acabaron tus notas 🔥</h2>
            <p style={S.modalSub}>Consigue más para seguir soltando:</p>

            {videosVistos < MAX_VIDEOS_DIA && (
              <button onClick={verVideo} style={S.modalOpt}>
                <span style={S.modalOptIcon}>🎬</span>
                <div>
                  <strong>Ver un video</strong>
                  <p style={S.modalOptDesc}>+1 nota gratis ({MAX_VIDEOS_DIA - videosVistos} restantes)</p>
                </div>
              </button>
            )}

            <button onClick={() => comprar('extra3')} style={S.modalOpt}>
              <span style={S.modalOptIcon}>🔥</span>
              <div>
                <strong>+3 pensamientos</strong>
                <p style={S.modalOptDesc}>$10 MXN <span style={{ color: COLORS.gray, fontSize: '11px' }}>≈ $0.60 USD</span></p>
              </div>
            </button>

            <button onClick={() => comprar('extra10')} style={{...S.modalOpt, border: `2px solid ${COLORS.gold}`}}>
              <span style={S.modalOptIcon}>⭐</span>
              <div>
                <strong>+10 pensamientos</strong>
                <p style={{...S.modalOptDesc, color: COLORS.gold}}>$25 MXN <span style={{ fontSize: '11px', opacity: 0.8 }}>≈ $1.50 USD</span> · Mejor valor</p>
              </div>
            </button>

            <div style={S.paymentMethods}>
              <p style={S.paymentTitle}>Aceptamos</p>
              <div style={S.paymentIcons}>
                <span style={S.paymentIcon}>💳</span>
                <span style={S.paymentIcon}>₿</span>
              </div>
              <p style={S.paymentText}>Tarjetas y Bitcoin</p>
            </div>

            <button onClick={() => setMostrarModal(false)} style={S.btnTerciario}>
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Modal: Reportar */}
      {mostrarReporte && (
        <div style={S.overlay} onClick={() => setMostrarReporte(null)}>
          <div style={S.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={S.modalTitle}>⚑ Reportar nota</h2>
            <p style={S.modalSub}>¿Esta nota viola las reglas de la comunidad?</p>
            <button onClick={() => reportarNota(mostrarReporte)} style={S.btnDanger}>
              Sí, reportar
            </button>
            <button onClick={() => setMostrarReporte(null)} style={S.btnTerciario}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Modal: Info */}
      {mostrarInfo && (
        <div style={S.overlay} onClick={() => setMostrarInfo(false)}>
          <div style={{...S.modal, maxHeight: '85vh', overflowY: 'auto'}} onClick={(e) => e.stopPropagation()}>
            <div style={S.modalHeader}>
              <span style={{ fontSize: '36px' }}>🔥</span>
              <h2 style={S.modalTitle}>FIRE NOTES</h2>
            </div>
            <p style={S.modalTagline}>Pensamientos anónimos a 1km de ti</p>
            
            <div style={S.infoGridNew}>
              <div style={{...S.infoItemNew, backgroundColor: '#1E3A5F'}}>
                <span style={S.infoIconNew}>📍</span>
                <strong style={S.infoTitleNew}>Hiperlocal</strong>
                <p style={S.infoDescNew}>Solo ves notas a 1km máximo</p>
              </div>
              <div style={{...S.infoItemNew, backgroundColor: '#2D1B4E'}}>
                <span style={S.infoIconNew}>⏱</span>
                <strong style={S.infoTitleNew}>Efímero</strong>
                <p style={S.infoDescNew}>Todo desaparece en 24 horas</p>
              </div>
              <div style={{...S.infoItemNew, backgroundColor: '#1B4D3E'}}>
                <span style={S.infoIconNew}>👤</span>
                <strong style={S.infoTitleNew}>Anónimo</strong>
                <p style={S.infoDescNew}>Sin registro, sin perfiles</p>
              </div>
              <div style={{...S.infoItemNew, backgroundColor: '#4A1F1F'}}>
                <span style={S.infoIconNew}>🔥</span>
                <strong style={S.infoTitleNew}>Simple</strong>
                <p style={S.infoDescNew}>Solo texto y fuegos</p>
              </div>
            </div>

            <div style={S.rulesBox}>
              <p style={S.rulesTitle}>✅ Puedes</p>
              <p style={S.ruleText}>Decir lo que piensas, quejarte, confesar, usar groserías</p>
              
              <p style={{...S.rulesTitle, color: COLORS.danger, marginTop: '12px'}}>❌ No puedes</p>
              <p style={S.ruleText}>Amenazar con nombres, contenido de menores, cosas ilegales</p>
            </div>

            <div style={S.importantBox}>
              <p style={S.importantTitle}>⚠️ IMPORTANTE</p>
              <p style={S.importantText}>
                Eres anónimo pero <strong>NO invisible</strong>. Si haces algo ilegal, cooperamos con autoridades.
              </p>
            </div>

            <div style={S.termsSection}>
              <p style={S.termsSectionTitle}>📜 TÉRMINOS Y PRIVACIDAD</p>
              
              <div style={S.termsContent}>
                <p style={S.termsSubtitle}>Uso de FIRE</p>
                <p style={S.termsText}>
                  Plataforma de expresión anónima. Sin registro. Notas visibles solo a 1km. Todo desaparece en 24 horas.
                </p>
                
                <p style={S.termsSubtitle}>Prohibido</p>
                <p style={S.termsText}>
                  Amenazas, contenido de menores, violencia, acoso, drogas/armas, actividades ilegales. 5+ reportes = nota eliminada.
                </p>
                
                <p style={S.termsSubtitle}>Privacidad</p>
                <p style={S.termsText}>
                  <strong>Guardamos:</strong> ID anónimo, ubicación aproximada, IP (anti-abuso).<br/>
                  <strong>NO guardamos:</strong> nombre, email, teléfono, fotos.<br/>
                  <strong>Retención:</strong> 24h datos de notas, 30 días logs.
                </p>
                
                <p style={S.termsSubtitle}>Autoridades</p>
                <p style={S.termsText}>
                  Ante requerimiento legal válido, proporcionamos IDs, IPs y contenido relacionado.
                </p>
              </div>
              
              <p style={S.termsUpdate}>Última actualización: Abril 2026</p>
            </div>

            <button onClick={() => setMostrarInfo(false)} style={S.btnPrimario}>
              Entendido
            </button>
          </div>
        </div>
      )}
      
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap');
        
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        body {
          font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif;
          background: ${COLORS.bgPrimary};
          -webkit-font-smoothing: antialiased;
        }
        
        @keyframes spin { 
          to { transform: rotate(360deg); } 
        }
        
        @keyframes fadeIn { 
          from { opacity: 0; transform: translateY(-10px); } 
          to { opacity: 1; transform: translateY(0); } 
        }
        
        @keyframes pulse { 
          0%, 100% { transform: scale(1); } 
          50% { transform: scale(1.05); } 
        }
        
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 20px rgba(155, 89, 182, 0.3); }
          50% { box-shadow: 0 0 30px rgba(155, 89, 182, 0.5); }
        }
        
        @keyframes burning {
          0%, 100% { 
            box-shadow: 0 0 20px rgba(255, 107, 53, 0.5), 0 0 40px rgba(255, 69, 0, 0.3);
            transform: scale(1);
          }
          50% { 
            box-shadow: 0 0 30px rgba(255, 107, 53, 0.7), 0 0 60px rgba(255, 69, 0, 0.5);
            transform: scale(1.01);
          }
        }
        
        @keyframes flicker {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.85; }
        }
      `}</style>
    </div>
  );
}

// ============================================================
// STYLES
// ============================================================
const S = {
  container: {
    minHeight: '100dvh',
    backgroundColor: COLORS.bgPrimary,
    color: COLORS.white,
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
    maxWidth: '480px',
    margin: '0 auto',
    position: 'relative',
  },
  
  ubicacionError: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100dvh',
    padding: '24px',
    textAlign: 'center',
  },
  ubicacionIcono: { fontSize: '72px', marginBottom: '24px' },
  ubicacionTitulo: { color: COLORS.gold, fontSize: '24px', fontWeight: '700', marginBottom: '12px' },
  ubicacionTexto: { color: COLORS.gray, fontSize: '16px', lineHeight: '1.6', marginBottom: '32px' },
  
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 16px', position: 'sticky', top: 0, zIndex: 100,
    backgroundColor: COLORS.bgPrimary, borderBottom: `1px solid ${COLORS.bgSecondary}`,
  },
  infoBtn: {
    width: '36px', height: '36px', borderRadius: '50%',
    border: `1px solid ${COLORS.purple}`, background: 'transparent',
    color: COLORS.purple, fontSize: '16px', fontWeight: '600', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease',
  },
  logoWrap: { display: 'flex', alignItems: 'center', gap: '4px' },
  logoFire: { fontSize: '22px', fontWeight: '700', color: COLORS.orange, letterSpacing: '1px' },
  logoNotes: { fontSize: '22px', fontWeight: '700', color: COLORS.white, letterSpacing: '1px' },
  headerRight: { display: 'flex', alignItems: 'center', gap: '12px' },
  contadorWrap: {
    display: 'flex', alignItems: 'center', cursor: 'pointer',
    padding: '6px 12px', borderRadius: '20px', backgroundColor: COLORS.bgSecondary,
  },
  contadorNotas: { display: 'flex', alignItems: 'center', gap: '4px' },
  contadorInfinito: { fontSize: '20px', fontWeight: 'bold', color: COLORS.gold },
  
  debugBar: {
    backgroundColor: COLORS.bgSecondary, borderBottom: `1px solid ${COLORS.bgCard}`,
    padding: '6px 12px', fontSize: '10px', color: COLORS.gray, fontFamily: 'monospace', textAlign: 'center',
  },
  
  tabBar: { display: 'flex', backgroundColor: COLORS.bgPrimary, borderBottom: `1px solid ${COLORS.bgSecondary}` },
  tab: {
    flex: 1, padding: '14px', background: 'transparent', border: 'none',
    color: COLORS.gray, fontSize: '14px', fontWeight: '500', cursor: 'pointer',
    fontFamily: "'Space Grotesk', sans-serif", borderBottom: '2px solid transparent',
    transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  tabActive: { color: COLORS.orange, borderBottomColor: COLORS.orange },
  badge: {
    backgroundColor: COLORS.purple, color: COLORS.white, fontSize: '11px',
    fontWeight: '600', padding: '2px 6px', borderRadius: '10px', marginLeft: '6px',
  },
  
  zonaIndicador: {
    textAlign: 'center', padding: '10px 16px', fontSize: '13px',
    color: COLORS.gray, backgroundColor: COLORS.bgSecondary, borderBottom: `1px solid ${COLORS.bgCard}`,
  },
  
  cooldownBanner: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
    padding: '10px 16px', backgroundColor: `${COLORS.purple}15`,
    borderBottom: `1px solid ${COLORS.purple}30`, color: COLORS.purpleLight, fontSize: '13px',
  },
  
  misNotasStats: {
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    padding: '20px', gap: '32px', backgroundColor: COLORS.bgSecondary,
    borderBottom: `1px solid ${COLORS.bgCard}`,
  },
  statItem: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
  statNumber: { fontSize: '28px', fontWeight: '700', color: COLORS.gold },
  statLabel: { fontSize: '12px', color: COLORS.gray, marginTop: '4px' },
  statDivider: { width: '1px', height: '40px', backgroundColor: COLORS.bgCard },
  
  feed: { padding: '16px', paddingBottom: '100px', minHeight: 'calc(100dvh - 150px)' },
  empty: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', minHeight: '50vh', gap: '8px',
  },
  emptyTitle: { color: COLORS.white, fontSize: '18px', fontWeight: '600' },
  emptyText: { color: COLORS.gray, fontSize: '14px', textAlign: 'center' },
  spinner: {
    width: '36px', height: '36px', border: `3px solid ${COLORS.bgSecondary}`,
    borderTop: `3px solid ${COLORS.purple}`, borderRadius: '50%', animation: 'spin 1s linear infinite',
  },
  
  notasGrid: { display: 'flex', flexDirection: 'column', gap: '16px' },
  nota: {
    position: 'relative', backgroundColor: COLORS.notePaper,
    borderRadius: '8px', padding: '18px', overflow: 'hidden', animation: 'slideUp 0.3s ease',
  },
  notaHot: { position: 'absolute', top: '8px', right: '8px', fontSize: '20px', animation: 'pulse 1s ease infinite' },
  tuNotaBadge: {
    position: 'absolute', top: '8px', right: '8px', backgroundColor: COLORS.purple,
    color: COLORS.white, fontSize: '10px', fontWeight: '600', padding: '3px 10px', borderRadius: '12px',
  },
  notaLines: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    background: 'repeating-linear-gradient(0deg, transparent, transparent 27px, rgba(0,0,0,0.03) 27px, rgba(0,0,0,0.03) 28px)',
    pointerEvents: 'none',
  },
  notaTexto: {
    color: COLORS.noteText, fontSize: '15px', lineHeight: '1.6',
    fontFamily: "'Space Grotesk', sans-serif", position: 'relative',
    zIndex: 1, margin: 0, wordBreak: 'break-word',
  },
  notaFooter: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginTop: '14px', position: 'relative', zIndex: 1,
  },
  notaMeta: { display: 'flex', alignItems: 'center', gap: '8px' },
  notaMetaCol: { display: 'flex', flexDirection: 'column', gap: '2px' },
  notaTiempo: { fontSize: '12px', color: '#8B7355', fontWeight: '500' },
  notaDistancia: {
    fontSize: '11px', color: '#A0937D', backgroundColor: 'rgba(0,0,0,0.05)',
    padding: '2px 6px', borderRadius: '8px',
  },
  notaExpira: { fontSize: '11px', color: COLORS.danger, fontWeight: '500' },
  notaActions: { display: 'flex', alignItems: 'center', gap: '8px' },
  reportBtn: {
    background: 'transparent', border: 'none', fontSize: '14px',
    cursor: 'pointer', padding: '6px', color: '#A0937D', opacity: 0.5, transition: 'opacity 0.2s',
  },
  fireBtn: {
    display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent',
    border: '1.5px solid rgba(0,0,0,0.1)', borderRadius: '20px', padding: '6px 12px',
    cursor: 'pointer', transition: 'all 0.2s ease', fontFamily: "'Space Grotesk', sans-serif",
  },
  fireCount: {
    display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px',
    borderRadius: '16px', border: '2px solid transparent', transition: 'all 0.2s ease',
  },
  
  escribir: {
    padding: '24px 20px', display: 'flex', flexDirection: 'column',
    gap: '20px', minHeight: 'calc(100dvh - 70px)',
  },
  papelEscribir: {
    position: 'relative', backgroundColor: COLORS.notePaper, borderRadius: '8px',
    padding: '20px', minHeight: '200px', boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
  },
  textarea: {
    width: '100%', minHeight: '160px', background: 'transparent', border: 'none',
    outline: 'none', color: COLORS.noteText, fontSize: '16px',
    fontFamily: "'Space Grotesk', sans-serif", lineHeight: '28px', resize: 'none',
    position: 'relative', zIndex: 1,
  },
  charCount: {
    position: 'absolute', bottom: '10px', right: '14px', fontSize: '12px',
    color: '#8B7355', fontFamily: 'monospace', zIndex: 1,
  },
  errorText: {
    color: COLORS.danger, fontSize: '13px', textAlign: 'center', margin: 0,
    padding: '8px 12px', backgroundColor: `${COLORS.danger}15`, borderRadius: '8px',
  },
  cooldownText: { color: COLORS.purple, fontSize: '13px', textAlign: 'center', margin: 0 },
  
  btnPrimario: {
    width: '100%', padding: '16px', border: 'none', borderRadius: '12px',
    background: `linear-gradient(135deg, ${COLORS.orange}, ${COLORS.purple})`,
    color: COLORS.white, fontSize: '16px', fontWeight: '600',
    fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '1px', cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(155, 89, 182, 0.4)', transition: 'transform 0.2s, box-shadow 0.2s',
  },
  btnSecundario: {
    background: 'transparent', border: 'none', color: COLORS.gray, fontSize: '14px',
    cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif", padding: '12px',
  },
  btnTerciario: {
    width: '100%', padding: '12px', borderRadius: '8px', border: 'none',
    background: 'transparent', color: COLORS.gray, fontSize: '14px',
    cursor: 'pointer', marginTop: '8px', fontFamily: "'Space Grotesk', sans-serif",
  },
  btnDanger: {
    width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
    background: COLORS.danger, color: COLORS.white, fontSize: '14px',
    fontWeight: '600', cursor: 'pointer', marginBottom: '8px',
  },
  
  fab: {
    position: 'fixed', bottom: '24px', right: '24px', width: '64px', height: '64px',
    borderRadius: '50%', border: 'none',
    background: `linear-gradient(135deg, ${COLORS.orange}, ${COLORS.purple})`,
    fontSize: '26px', cursor: 'pointer', boxShadow: '0 4px 24px rgba(155, 89, 182, 0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99,
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  
  toast: {
    position: 'fixed', top: '80px', left: '50%', transform: 'translateX(-50%)',
    backgroundColor: COLORS.purple, color: COLORS.white, padding: '14px 28px',
    borderRadius: '24px', fontSize: '14px', fontWeight: '600',
    fontFamily: "'Space Grotesk', sans-serif", zIndex: 200,
    boxShadow: '0 4px 24px rgba(155, 89, 182, 0.5)', animation: 'fadeIn 0.3s ease',
  },
  
  overlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center',
    justifyContent: 'center', zIndex: 150, padding: '20px',
  },
  modal: {
    backgroundColor: COLORS.bgSecondary, borderRadius: '20px', padding: '28px',
    maxWidth: '380px', width: '100%', border: `1px solid ${COLORS.bgCard}`, animation: 'slideUp 0.3s ease',
  },
  modalHeader: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', marginBottom: '16px' },
  modalTitle: {
    fontSize: '22px', fontWeight: '700', textAlign: 'center', color: COLORS.gold,
    fontFamily: "'Space Grotesk', sans-serif", margin: 0,
  },
  modalTagline: { fontSize: '14px', color: COLORS.gray, textAlign: 'center', marginBottom: '20px', fontStyle: 'italic' },
  modalDesc: { fontSize: '15px', color: COLORS.grayLight, textAlign: 'center', marginBottom: '20px', lineHeight: '1.6' },
  modalSub: { fontSize: '14px', color: COLORS.gray, textAlign: 'center', marginBottom: '20px' },
  
  welcomeFeatures: { display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' },
  welcomeFeature: {
    display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px',
    backgroundColor: COLORS.bgCard, borderRadius: '12px', fontSize: '14px', color: COLORS.grayLight,
  },
  
  infoGridNew: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' },
  infoItemNew: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    textAlign: 'center', padding: '16px 12px', borderRadius: '16px', minHeight: '110px',
  },
  infoIconNew: { fontSize: '28px', marginBottom: '8px' },
  infoTitleNew: { fontSize: '15px', fontWeight: '700', color: COLORS.white, marginBottom: '4px' },
  infoDescNew: { fontSize: '12px', color: COLORS.grayLight, margin: 0, lineHeight: '1.4' },
  
  rulesBox: { backgroundColor: COLORS.bgCard, borderRadius: '12px', padding: '16px', marginBottom: '16px' },
  rulesTitle: { fontSize: '13px', fontWeight: '600', color: COLORS.success, marginBottom: '4px' },
  ruleText: { fontSize: '12px', color: COLORS.grayLight, margin: 0, lineHeight: '1.5' },
  
  modalOpt: {
    width: '100%', display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px',
    borderRadius: '12px', border: `1px solid ${COLORS.bgCard}`, background: COLORS.bgPrimary,
    cursor: 'pointer', marginBottom: '10px', textAlign: 'left', color: COLORS.white,
    fontFamily: "'Space Grotesk', sans-serif", transition: 'border-color 0.2s',
  },
  modalOptIcon: { fontSize: '28px', flexShrink: 0 },
  modalOptDesc: { fontSize: '12px', color: COLORS.gray, margin: '4px 0 0 0' },
  
  importantBox: {
    backgroundColor: `${COLORS.gold}15`, border: `2px solid ${COLORS.gold}50`,
    borderRadius: '12px', padding: '16px', marginBottom: '16px',
  },
  importantTitle: { fontSize: '14px', fontWeight: '700', color: COLORS.gold, textAlign: 'center', marginBottom: '8px' },
  importantText: { fontSize: '13px', color: COLORS.grayLight, textAlign: 'center', margin: 0, lineHeight: '1.5' },
  
  termsSection: { backgroundColor: COLORS.bgCard, borderRadius: '12px', padding: '16px', marginBottom: '16px' },
  termsSectionTitle: { fontSize: '13px', fontWeight: '600', color: COLORS.purple, textAlign: 'center', marginBottom: '12px' },
  termsContent: { fontSize: '11px', color: COLORS.grayLight, lineHeight: '1.6' },
  termsSubtitle: { fontSize: '12px', fontWeight: '600', color: COLORS.white, marginTop: '10px', marginBottom: '4px' },
  termsText: { margin: 0, marginBottom: '8px' },
  termsUpdate: { fontSize: '10px', color: COLORS.gray, textAlign: 'center', fontStyle: 'italic', marginTop: '12px' },
  
  paymentMethods: {
    backgroundColor: COLORS.bgCard, borderRadius: '12px', padding: '14px', marginBottom: '16px', textAlign: 'center',
  },
  paymentTitle: { fontSize: '11px', color: COLORS.gray, marginBottom: '8px' },
  paymentIcons: { display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '6px' },
  paymentIcon: { fontSize: '24px' },
  paymentText: { fontSize: '12px', color: COLORS.grayLight, fontWeight: '500' },
  
  burningIndicator: {
    position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)',
    fontSize: '12px', backgroundColor: COLORS.orange, color: COLORS.white,
    padding: '2px 10px', borderRadius: '10px', fontWeight: '600', zIndex: 10,
    whiteSpace: 'nowrap', boxShadow: '0 2px 8px rgba(255, 107, 53, 0.4)',
  },
  tuNotaBadgeFeed: {
    position: 'absolute', top: '8px', right: '8px', backgroundColor: COLORS.purple,
    color: COLORS.white, fontSize: '10px', fontWeight: '600', padding: '3px 8px', borderRadius: '8px', zIndex: 5,
  },
  
  mapaContainer: {
    padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', minHeight: 'calc(100dvh - 160px)',
  },
  mapaHeader: { textAlign: 'center' },
  mapaTitle: {
    fontSize: '20px', fontWeight: '700', color: COLORS.white, margin: 0,
    fontFamily: "'Space Grotesk', sans-serif",
  },
  mapaSubtitle: { fontSize: '13px', color: COLORS.gray, marginTop: '4px' },
  mapaVisual: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' },
  mapaCirculo: {
    position: 'relative', width: '280px', height: '280px', borderRadius: '50%',
    backgroundColor: COLORS.bgCard, border: `2px solid ${COLORS.purple}40`,
    boxShadow: '0 4px 20px rgba(155, 89, 182, 0.2)',
  },
  mapaCentro: {
    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
    fontSize: '24px', zIndex: 10,
  },
  mapaCircle500: {
    position: 'absolute', top: '25%', left: '25%', width: '50%', height: '50%',
    borderRadius: '50%', border: `1px dashed ${COLORS.gray}40`, pointerEvents: 'none',
  },
  mapaCircle1000: {
    position: 'absolute', top: '5%', left: '5%', width: '90%', height: '90%',
    borderRadius: '50%', border: `1px dashed ${COLORS.gray}30`, pointerEvents: 'none',
  },
  mapaLeyenda: { display: 'flex', justifyContent: 'center', gap: '16px', fontSize: '12px', color: COLORS.gray },
  mapaStats: {
    display: 'flex', justifyContent: 'space-around', padding: '16px',
    backgroundColor: COLORS.bgCard, borderRadius: '16px',
  },
  mapaStatItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' },
  mapaStatNumber: {
    fontSize: '24px', fontWeight: '700', color: COLORS.white,
    fontFamily: "'Space Grotesk', sans-serif",
  },
  mapaStatLabel: {
    fontSize: '11px', color: COLORS.gray, textTransform: 'uppercase', letterSpacing: '0.5px',
  },
  mapaZonaInfo: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px',
    backgroundColor: COLORS.bgSecondary, borderRadius: '16px', border: `1px solid ${COLORS.bgCard}`,
  },
  mapaZonaText: {
    fontSize: '18px', fontWeight: '600', color: COLORS.white, margin: 0,
    fontFamily: "'Space Grotesk', sans-serif",
  },
  mapaZonaSubtext: { fontSize: '13px', color: COLORS.gray, marginTop: '4px' },
  
  historialBox: {
    backgroundColor: COLORS.bgSecondary, borderRadius: '16px', padding: '16px',
    margin: '0 16px 16px 16px', border: `1px solid ${COLORS.bgCard}`,
  },
  historialHeader: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' },
  historialTitle: {
    fontSize: '16px', fontWeight: '700', color: COLORS.gold,
    fontFamily: "'Space Grotesk', sans-serif",
  },
  historialStats: {
    display: 'flex', justifyContent: 'space-around', marginBottom: '16px',
    paddingBottom: '16px', borderBottom: `1px solid ${COLORS.bgCard}`,
  },
  historialStatItem: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
  historialStatNumber: { fontSize: '20px', fontWeight: '700', color: COLORS.white },
  historialStatLabel: { fontSize: '11px', color: COLORS.gray, marginTop: '2px' },
  estrellasSection: { textAlign: 'center' },
  estrellasTitle: { fontSize: '14px', fontWeight: '600', color: COLORS.gold, marginBottom: '12px' },
  estrellasGrid: { display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '10px', marginBottom: '8px' },
  estrellaItem: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 14px',
    background: `linear-gradient(135deg, ${COLORS.bgCard}, #2a2a3a)`, borderRadius: '12px',
    border: `2px solid ${COLORS.gold}`, boxShadow: '0 0 15px rgba(255, 215, 0, 0.3)',
  },
  estrellaEmoji: { fontSize: '32px', filter: 'drop-shadow(0 0 8px gold)', animation: 'pulse 2s ease infinite' },
  estrellaFecha: { fontSize: '11px', color: COLORS.gold, marginTop: '4px', fontWeight: '600' },
  estrellaDesc: { fontSize: '11px', color: COLORS.gray, marginTop: '8px' },
  sinEstrellas: { textAlign: 'center', padding: '20px' },
  sinEstrellasText: { fontSize: '12px', color: COLORS.gray, marginTop: '8px', lineHeight: '1.5' },
};
