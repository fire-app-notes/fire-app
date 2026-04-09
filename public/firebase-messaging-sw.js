// Firebase Messaging Service Worker
// Este archivo DEBE estar en public/firebase-messaging-sw.js

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDGbIhSiRh3XxuaOfCaNO7MCTfMrVdlaLM",
  authDomain: "fire-notes-f161a.firebaseapp.com",
  projectId: "fire-notes-f161a",
  storageBucket: "fire-notes-f161a.firebasestorage.app",
  messagingSenderId: "16344396623",
  appId: "1:16344396623:web:f8b39b7075b0202573cb3a"
});

const messaging = firebase.messaging();

// Notificaciones que llegan cuando la app está en segundo plano
messaging.onBackgroundMessage((payload) => {
  const data = payload.data || {};
  const title = data.title || '🔥 Fire Notes';
  const body = data.body || 'Tienes actividad nueva';
  
  self.registration.showNotification(title, {
    body: body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag || 'fire-notes',
    data: data,
    actions: [
      { action: 'open', title: 'Ver' }
    ]
  });
});

// Cuando el usuario clickea la notificación
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Si ya hay una ventana abierta, enfócala
      for (const client of clientList) {
        if (client.url.includes('fire-app') || client.url.includes('firenotesapp')) {
          return client.focus();
        }
      }
      // Si no, abre una nueva
      return clients.openWindow('/app');
    })
  );
});
