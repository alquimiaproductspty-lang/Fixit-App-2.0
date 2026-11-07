/* eslint-disable no-undef */
// ============================================================================
// FIXIT Firebase Cloud Messaging (FCM) Service Worker
// Manejador de notificaciones push en segundo plano para clientes FIXIT Panamá
// ============================================================================

importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyB6oUfRB3P3rUsp9xVozlseuxtBnLLUyls",
  authDomain: "fixit-panama.firebaseapp.com",
  projectId: "fixit-panama",
  storageBucket: "fixit-panama.firebasestorage.app",
  messagingSenderId: "409363334329",
  appId: "1:409363334329:web:430d69caf5cae59bc4c768"
};

// Inicializar Firebase en el Service Worker
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Manejador de mensajes push recibidos mientras la app está en segundo plano o cerrada
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Mensaje push recibido en segundo plano:', payload);

  const title = payload.notification?.title || payload.data?.title || 'FIXIT Panamá';
  const body = payload.notification?.body || payload.data?.body || 'Actualización en tu servicio técnico residencial.';
  const orderId = payload.data?.orderId || payload.data?.numero_pedido || '';
  const status = payload.data?.status || payload.data?.estado || '';

  const notificationOptions = {
    body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    tag: orderId ? `fixit-order-${orderId}` : 'fixit-general-notice',
    renotify: true,
    requireInteraction: status === 'En camino' || status === 'Completada',
    data: {
      orderId,
      status,
      url: orderId ? `/#/orders?order=${orderId}` : '/',
      timestamp: Date.now()
    },
    actions: [
      { action: 'open_order', title: 'Ver Detalles' },
      { action: 'close_notification', title: 'Entendido' }
    ]
  };

  return self.registration.showNotification(title, notificationOptions);
});

// Manejador de clic sobre la notificación push en el dispositivo del usuario
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close_notification') {
    return;
  }

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Si la pestaña ya está abierta, enfocarse en ella y redirigir
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          if ('navigate' in client) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      // Si no hay pestañas abiertas, abrir una nueva ventana
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
