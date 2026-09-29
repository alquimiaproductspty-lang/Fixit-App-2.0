// ============================================================================
// FIXIT Firebase Cloud Messaging (FCM) Service
// Configuración de notificaciones push para clientes (técnico asignado / cambio de estatus)
// ============================================================================

import { getMessaging, getToken, onMessage, isSupported, Messaging } from 'firebase/messaging';
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp 
} from 'firebase/firestore';
import { app, db, auth } from './firebase';
import { AdminOrder } from '../components/AdminDashboardView';
import { sanitizeForFirestore } from './firestoreService';

export interface FixitNotification {
  id: string;
  userId: string;
  orderId?: string;
  title: string;
  body: string;
  type: 'TECH_ASSIGNED' | 'STATUS_CHANGE' | 'ORDER_CREATED' | 'GENERAL';
  status?: string;
  read: boolean;
  data?: Record<string, any>;
  createdAt?: any;
}

let messagingInstance: Messaging | null = null;

/**
 * Verifica si Firebase Cloud Messaging y las APIs del navegador son compatibles
 */
export async function isFCMSupported(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return false;
  try {
    return await isSupported();
  } catch (err) {
    console.warn('[FCM] Error verificando compatibilidad de FCM:', err);
    return false;
  }
}

/**
 * Obtiene la instancia activa de Messaging de forma segura
 */
export async function getFCMInstance(): Promise<Messaging | null> {
  if (messagingInstance) return messagingInstance;
  const supported = await isFCMSupported();
  if (!supported) {
    console.warn('[FCM] Firebase Messaging no es compatible en este navegador o entorno.');
    return null;
  }
  try {
    messagingInstance = getMessaging(app);
    return messagingInstance;
  } catch (err) {
    console.error('[FCM] Error inicializando getMessaging:', err);
    return null;
  }
}

/**
 * Consulta el estado actual de los permisos de notificación del navegador
 */
export function getNotificationPermissionStatus(): 'granted' | 'denied' | 'default' | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

/**
 * Solicita permiso al usuario y registra el token FCM en Firestore
 */
export async function requestNotificationPermissionAndGetToken(
  targetUserId?: string
): Promise<{ success: boolean; token?: string; error?: string }> {
  if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
    return { success: false, error: 'Las notificaciones push no están soportadas en este navegador.' };
  }

  try {
    // 1. Solicitar permiso nativo al usuario
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { 
        success: false, 
        error: permission === 'denied' 
          ? 'El usuario denegó los permisos de notificación.' 
          : 'Permiso de notificación no otorgado.' 
      };
    }

    // 2. Registrar el Service Worker específico de FCM
    const swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/'
    });
    await navigator.serviceWorker.ready;

    // 3. Inicializar FCM Messaging
    const messaging = await getFCMInstance();
    if (!messaging) {
      return { success: false, error: 'No se pudo inicializar Firebase Messaging.' };
    }

    // 4. Obtener el token de registro del dispositivo
    // Nota: Si no se provee vapidKey, Firebase usa el key por defecto asociado al SenderId del proyecto
    const token = await getToken(messaging, {
      serviceWorkerRegistration: swRegistration
    });

    if (!token) {
      return { success: false, error: 'No se generó ningún token de FCM para este dispositivo.' };
    }

    console.log('[FCM] Token obtenido con éxito:', token.slice(0, 15) + '...');

    // 5. Guardar el token en Firestore si hay un usuario autenticado
    const activeUid = targetUserId || auth.currentUser?.uid;
    if (activeUid) {
      await saveFCMTokenToFirestore(activeUid, token);
    }

    return { success: true, token };
  } catch (err: any) {
    console.error('[FCM] Error solicitando permisos u obteniendo token:', err);
    return { success: false, error: err.message || 'Error desconocido al configurar notificaciones.' };
  }
}

/**
 * Almacena el token FCM en Firestore tanto en el perfil del usuario como en la colección de tokens
 */
export async function saveFCMTokenToFirestore(userId: string, token: string): Promise<void> {
  if (!userId || !token) return;

  try {
    const tokenDocId = `FCM_${userId}_${token.slice(-12).replace(/[^a-zA-Z0-9]/g, '')}`;
    const tokenPayload = sanitizeForFirestore({
      id: tokenDocId,
      userId,
      token,
      platform: 'web',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 250) : 'unknown',
      active: true,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    });

    // Guardar en la colección global de tokens de dispositivos
    await setDoc(doc(db, 'fcm_tokens', tokenDocId), tokenPayload, { merge: true });

    // Guardar referencia en el perfil del usuario en la colección 'users'
    try {
      await updateDoc(doc(db, 'users', userId), {
        fcmToken: token,
        notificationsEnabled: true,
        lastFcmTokenAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      console.warn('[FCM] Aviso al actualizar token en users/{userId}:', e);
    }
  } catch (err) {
    console.error('[FCM] Error guardando token FCM en Firestore:', err);
  }
}

/**
 * Escucha notificaciones push en primer plano (foreground)
 */
export function setupForegroundFCMListener(
  onNotificationReceived?: (notification: { title: string; body: string; data?: any }) => void
): () => void {
  let unsubscribe: (() => void) | null = null;

  getFCMInstance().then((messaging) => {
    if (!messaging) return;

    unsubscribe = onMessage(messaging, (payload) => {
      console.log('[FCM] Notificación recibida en primer plano:', payload);

      const title = payload.notification?.title || payload.data?.title || 'FIXIT Panamá';
      const body = payload.notification?.body || payload.data?.body || 'Actualización en tu servicio técnico.';
      const data = payload.data || {};

      // Callback opcional para la aplicación React
      if (onNotificationReceived) {
        onNotificationReceived({ title, body, data });
      }

      // Si el navegador tiene permisos, mostrar notificación nativa
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(title, {
            body,
            icon: '/icons/icon-192x192.png',
            tag: data.orderId ? `fixit-${data.orderId}` : 'fixit-update',
            data
          });
        } catch (e) {
          console.warn('[FCM] No se pudo instanciar la notificación nativa:', e);
        }
      }

      // Disparar evento personalizado en el DOM
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('fixit-fcm-notification', {
          detail: { title, body, data }
        }));
      }
    });
  });

  return () => {
    if (unsubscribe) {
      unsubscribe();
    }
  };
}

/**
 * Escucha en tiempo real las notificaciones de un cliente en Firestore
 */
export function subscribeToUserNotifications(
  userId: string,
  callback: (notifications: FixitNotification[]) => void
): () => void {
  if (!userId) {
    callback([]);
    return () => {};
  }

  try {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const notifs: FixitNotification[] = [];
      snapshot.forEach((d) => {
        notifs.push({ id: d.id, ...(d.data() as any) });
      });
      callback(notifs);
    }, (error) => {
      console.warn('[FCM] Aviso en listener de notificaciones de usuario:', error);
      callback([]);
    });
  } catch (err) {
    console.error('[FCM] Error suscribiendo a notificaciones:', err);
    callback([]);
    return () => {};
  }
}

/**
 * Marca una notificación como leída
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  if (!notificationId) return;
  try {
    await updateDoc(doc(db, 'notifications', notificationId), {
      read: true,
      readAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (e) {
    console.warn('[FCM] Error marcando notificación como leída:', e);
  }
}

/**
 * Despacha una notificación push y persiste el registro en Firestore cuando
 * cambia el estatus o se asigna un técnico a una orden desde el Dashboard.
 */
export async function dispatchOrderNotification(params: {
  order: AdminOrder;
  type: 'TECH_ASSIGNED' | 'STATUS_CHANGE';
  newStatus?: string;
  technicianName?: string;
  technicianSpecialty?: string;
}): Promise<{ success: boolean; notificationId?: string }> {
  const { order, type, newStatus, technicianName, technicianSpecialty } = params;

  // Determinar identificador del cliente destinatario
  const targetUserId = (order.cliente as any)?.id || (order as any).creado_por_uid || (order as any).userId;
  const consecutivo = order.numero_pedido || order.consecutiveId || order.orderNumber || order.codigo_seguimiento || order.id;
  const serviceName = order.servicio_probable?.service_name || 'Servicio FIXIT';

  let title = 'FIXIT Panamá: Actualización de tu servicio';
  let body = `Hay novedades en tu orden ${consecutivo}.`;

  if (type === 'TECH_ASSIGNED') {
    const techDisplayName = technicianName || order.tecnico_nombre || order.tecnico_asignado || 'un técnico idóneo';
    const spec = technicianSpecialty ? ` (${technicianSpecialty})` : '';
    title = `¡Técnico Asignado a tu Orden ${consecutivo}! 👷`;
    body = `${techDisplayName}${spec} ha sido asignado a tu servicio de ${serviceName}. Pronto se pondrá en contacto contigo.`;
  } else if (type === 'STATUS_CHANGE' && newStatus) {
    const norm = newStatus.toLowerCase();
    if (norm.includes('camino')) {
      title = `¡Tu Técnico va en camino! 🚗`;
      body = `El especialista va hacia tu ubicación para atender tu orden ${consecutivo} de ${serviceName}.`;
    } else if (norm.includes('progreso') || norm.includes('sitio')) {
      title = `¡Servicio en Progreso! 🛠️`;
      body = `El técnico ha iniciado los trabajos de ${serviceName} para la orden ${consecutivo}.`;
    } else if (norm.includes('complet')) {
      title = `¡Servicio Completado! ⭐`;
      body = `Los trabajos de ${serviceName} (${consecutivo}) han finalizado con éxito y cuentan con garantía FIXIT.`;
    } else if (norm.includes('cancel')) {
      title = `Orden ${consecutivo} Cancelada`;
      body = `Tu orden de ${serviceName} ha sido marcada como cancelada por el equipo administrativo.`;
    } else {
      title = `Estado Actualizado: ${newStatus}`;
      body = `Tu orden ${consecutivo} de ${serviceName} ahora se encuentra en estado "${newStatus}".`;
    }
  }

  const notificationId = `NOTIF_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  try {
    // 1. Guardar notificación en Firestore si existe un usuario destinatario
    if (targetUserId) {
      const notifDoc = sanitizeForFirestore({
        id: notificationId,
        userId: targetUserId,
        orderId: consecutivo,
        title,
        body,
        type,
        status: newStatus || order.estado || '',
        read: false,
        data: {
          orderId: consecutivo,
          orderDocId: order.id,
          serviceName,
          clientPhone: order.cliente?.telefono || '',
          technician: technicianName || order.tecnico_nombre || order.tecnico_asignado || '',
        },
        createdAt: serverTimestamp(),
      });

      await setDoc(doc(db, 'notifications', notificationId), notifDoc);
    }

    // 2. Invocar endpoint backend para envío real de push FCM (HTTP v1 / tokens)
    try {
      await fetch('/api/send-fcm-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: targetUserId,
          orderId: consecutivo,
          title,
          body,
          data: {
            orderId: consecutivo,
            status: newStatus || order.estado || '',
            url: `/#/orders?order=${consecutivo}`
          }
        })
      });
    } catch (apiErr) {
      console.warn('[FCM] Aviso al enviar petición al servidor /api/send-fcm-notification:', apiErr);
    }

    // 3. Si el navegador actual tiene permisos concedidos (ej: prueba en vivo en el mismo browser), disparar notificación
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: '/icons/icon-192x192.png',
          tag: `fixit-${consecutivo}`,
          data: { orderId: consecutivo }
        });
      } catch (e) {
        // En algunos contextos de móvil puede requerir serviceWorkerRegistration.showNotification
      }
    }

    return { success: true, notificationId };
  } catch (err: any) {
    console.error('[FCM] Error despachando notificación de orden:', err);
    return { success: false };
  }
}
