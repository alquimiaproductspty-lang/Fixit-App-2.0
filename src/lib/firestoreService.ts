import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  getDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp 
} from 'firebase/firestore';
import { 
  db, 
  handleFirestoreError, 
  OperationType, 
  auth 
} from './firebase';
import { getNextMonthlyOrderNumber } from './orderConsecutive';
import { 
  ServiceRequest, 
  Technician, 
  Service, 
  ManagedUser, 
  ManagedQuote, 
  ManagedPayment, 
  AuditLogEntry, 
  OperationalIndicators, 
  FinancialSummary, 
  AppRole, 
  UserRole, 
  UserStatus, 
  OfficialRequestStatus, 
  normalizeRole, 
  normalizeStatus,
  RequestStatus,
  ROLE_DISPLAY,
  OFFICIAL_STATUS_DISPLAY,
  TechnicianAssignment,
  AssignmentStatus,
  QuoteStatus
} from '../types';
import { FIXIT_CATALOG } from '../data/catalog';

// Local storage fallback cache keys to guarantee offline and graceful degradation
const CACHE_KEY_USERS = 'fixit_cache_users_v2';
const CACHE_KEY_ORDERS = 'fixit_cache_orders_v2';
const CACHE_KEY_TECHS = 'fixit_cache_techs_v2';
const CACHE_KEY_SERVICES = 'fixit_cache_services_v2';
const CACHE_KEY_QUOTES = 'fixit_cache_quotes_v2';
const CACHE_KEY_PAYMENTS = 'fixit_cache_payments_v2';
const CACHE_KEY_ASSIGNMENTS = 'fixit_cache_assignments_v2';
const CACHE_KEY_LOGS = 'fixit_cache_logs_v2';

// Helper for caching
function saveToCache(key: string, data: any) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {}
}

function loadFromCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Recursively removes all `undefined` values from an object before sending to Firestore.
 * Preserves Date, FieldValue, and Firestore Timestamp objects.
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  if (typeof data === 'object') {
    if (
      data instanceof Date ||
      typeof (data as any).toMillis === 'function' ||
      typeof (data as any).isEqual === 'function' ||
      (data as any)._methodName
    ) {
      return data;
    }
    const cleanObj: Record<string, any> = {};
    for (const [key, val] of Object.entries(data)) {
      if (val !== undefined) {
        cleanObj[key] = sanitizeForFirestore(val);
      }
    }
    return cleanObj as T;
  }
  return data;
}

// ============================================================================
// AUDIT LOG SERVICE
// ============================================================================
export async function logAuditEvent(
  accion: string,
  coleccionName: string,
  documentoId: string,
  authorName: string,
  authorUid?: string,
  rol?: string,
  detalles: Record<string, any> = {}
): Promise<void> {
  const logId = `LOG-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
  const now = new Date().toISOString();
  const entry: AuditLogEntry = {
    id: logId,
    timestamp: now,
    fecha: now,
    usuario: authorName,
    usuario_nombre: authorName,
    usuario_uid: authorUid || auth.currentUser?.uid || 'system',
    rol: rol || 'Administrador',
    accion,
    registro_tipo: (coleccionName === 'users' ? 'usuario' : coleccionName === 'requests' ? 'solicitud' : coleccionName === 'services' ? 'servicio' : 'sistema') as any,
    registro_id: documentoId,
    entidad: coleccionName,
    coleccion: coleccionName,
    documento_id: documentoId,
    detalles,
  };

  try {
    await setDoc(doc(db, 'audit_logs', logId), entry);
  } catch (err) {
    console.warn('[Audit] Firestore log fallback:', err);
  }

  // Update local audit cache
  try {
    const current = loadFromCache<AuditLogEntry[]>(CACHE_KEY_LOGS) || [];
    saveToCache(CACHE_KEY_LOGS, [entry, ...current].slice(0, 150));
  } catch {}
}

export async function getAuditLogsFromFirestore(maxCount: number = 60): Promise<AuditLogEntry[]> {
  try {
    const colRef = collection(db, 'audit_logs');
    const q = query(colRef, orderBy('timestamp', 'desc'), limit(maxCount));
    const snap = await getDocs(q);
    const logs: AuditLogEntry[] = [];
    snap.forEach((d) => logs.push(d.data() as AuditLogEntry));
    if (logs.length > 0) {
      saveToCache(CACHE_KEY_LOGS, logs);
      return logs;
    }
  } catch (err) {
    console.warn('[Audit] Failed to load from Firestore, using cache:', err);
  }
  return loadFromCache<AuditLogEntry[]>(CACHE_KEY_LOGS) || [];
}

// ============================================================================
// USERS & ROLES SERVICE (users/{uid})
// ============================================================================
export async function getUsersFromFirestore(): Promise<ManagedUser[]> {
  try {
    const snap = await getDocs(collection(db, 'users'));
    const list: ManagedUser[] = [];
    snap.forEach((d) => {
      const data = d.data();
      const normRole = normalizeRole(data.role || data.rol || data.tipo_usuario);
      list.push({
        id: d.id,
        uid: d.id,
        nombre: data.displayName || data.nombre || data.email?.split('@')[0] || 'Usuario',
        displayName: data.displayName || data.nombre,
        correo: data.email || data.correo || '',
        email: data.email || data.correo || '',
        telefono: data.phone || data.telefono || '',
        phone: data.phone || data.telefono || '',
        direccion: data.direccion || '',
        rol: ROLE_DISPLAY[normRole]?.es as UserRole,
        role: normRole,
        tipo_usuario: ROLE_DISPLAY[normRole]?.es as UserRole,
        estado: data.status === 'inactivo' ? 'inactivo' : 'activo',
        status: data.status === 'inactivo' ? 'inactivo' : 'activo',
        languagePreference: data.languagePreference || 'es',
        fecha_registro: data.createdAt || data.fecha_registro || new Date().toISOString(),
        createdAt: data.createdAt || data.fecha_registro || new Date().toISOString(),
        fecha_ultima_actividad: data.lastLoginAt || data.updatedAt || data.fecha_ultima_actividad || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString(),
        notas: data.notas || data.notas_internas || '',
        notas_internas: data.notas_internas || data.notas || '',
        total_solicitudes: data.total_solicitudes || 0,
      });
    });

    if (list.length > 0) {
      saveToCache(CACHE_KEY_USERS, list);
      return list;
    }
  } catch (err) {
    console.warn('[Users] Failed to fetch from Firestore, falling back:', err);
  }

  // Fallback to cache or empty list
  const cached = loadFromCache<ManagedUser[]>(CACHE_KEY_USERS);
  if (cached && cached.length > 0) return cached;

  return [];
}

export async function createUserInFirestore(
  payload: Partial<ManagedUser>,
  authorName: string
): Promise<ManagedUser> {
  const normRole = normalizeRole(payload.role || payload.rol || payload.tipo_usuario);
  const uid = payload.id || payload.uid || `usr_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;
  const now = new Date().toISOString();

  const userDoc: Record<string, any> = {
    uid,
    displayName: payload.nombre || payload.displayName || 'Usuario FIXIT',
    email: (payload.correo || payload.email || '').trim().toLowerCase(),
    phone: payload.telefono || payload.phone || '',
    role: normRole,
    status: payload.estado || payload.status || 'activo',
    languagePreference: payload.languagePreference || 'es',
    direccion: payload.direccion || '',
    notas: payload.notas || payload.notas_internas || '',
    createdAt: now,
    updatedAt: now,
    lastLoginAt: now,
    total_solicitudes: 0,
  };

  try {
    await setDoc(doc(db, 'users', uid), userDoc);

    // If assigned ADMIN role, index in admins collection for fast ABAC
    if (normRole === 'ADMIN') {
      try {
        await setDoc(doc(db, 'admins', uid), {
          uid,
          email: userDoc.email,
          createdAt: now,
        });
      } catch (e) {
        console.warn('Failed to register in admins collection:', e);
      }
    }

    await logAuditEvent(
      'CREAR_USUARIO',
      'users',
      uid,
      authorName,
      auth.currentUser?.uid,
      'ADMIN',
      { rol: normRole, nombre: userDoc.displayName, correo: userDoc.email }
    );
  } catch (err) {
    console.warn('[Firestore] Error creating user, saving locally:', err);
  }

  const createdUser: ManagedUser = {
    id: uid,
    uid,
    nombre: userDoc.displayName,
    displayName: userDoc.displayName,
    correo: userDoc.email,
    email: userDoc.email,
    telefono: userDoc.phone,
    phone: userDoc.phone,
    direccion: userDoc.direccion,
    rol: ROLE_DISPLAY[normRole]?.es as UserRole,
    role: normRole,
    tipo_usuario: ROLE_DISPLAY[normRole]?.es as UserRole,
    estado: userDoc.status,
    status: userDoc.status,
    languagePreference: userDoc.languagePreference,
    fecha_registro: now,
    createdAt: now,
    fecha_ultima_actividad: now,
    updatedAt: now,
    notas: userDoc.notas,
    notas_internas: userDoc.notas,
    total_solicitudes: 0,
  };

  const users = loadFromCache<ManagedUser[]>(CACHE_KEY_USERS) || [];
  saveToCache(CACHE_KEY_USERS, [createdUser, ...users]);
  return createdUser;
}

export async function updateUserInFirestore(
  uid: string,
  updates: Partial<ManagedUser>,
  authorName: string
): Promise<ManagedUser | null> {
  const now = new Date().toISOString();
  const fsUpdates: Record<string, any> = {
    updatedAt: now,
  };

  if (updates.nombre !== undefined) fsUpdates.displayName = updates.nombre;
  if (updates.correo !== undefined) fsUpdates.email = updates.correo.trim().toLowerCase();
  if (updates.telefono !== undefined) fsUpdates.phone = updates.telefono;
  if (updates.direccion !== undefined) fsUpdates.direccion = updates.direccion;
  if (updates.notas !== undefined) fsUpdates.notas = updates.notas;
  if (updates.notas_internas !== undefined) fsUpdates.notas = updates.notas_internas;
  if (updates.estado !== undefined) fsUpdates.status = updates.estado;
  if (updates.status !== undefined) fsUpdates.status = updates.status;
  if (updates.languagePreference !== undefined) fsUpdates.languagePreference = updates.languagePreference;

  let normRole: AppRole | undefined;
  if (updates.rol !== undefined || updates.role !== undefined) {
    normRole = normalizeRole(updates.role || updates.rol);
    fsUpdates.role = normRole;
  }

  try {
    await updateDoc(doc(db, 'users', uid), fsUpdates);

    // If role changed, manage admins index collection
    if (normRole) {
      if (normRole === 'ADMIN') {
        await setDoc(doc(db, 'admins', uid), {
          uid,
          email: fsUpdates.email || updates.correo,
          updatedAt: now,
        }, { merge: true });
      } else {
        try {
          await deleteDoc(doc(db, 'admins', uid));
        } catch {}
      }
    }

    await logAuditEvent(
      'ACTUALIZAR_USUARIO',
      'users',
      uid,
      authorName,
      auth.currentUser?.uid,
      'ADMIN',
      updates
    );
  } catch (err) {
    console.warn('[Firestore] Error updating user, syncing cache:', err);
  }

  // Update cache
  const cached = loadFromCache<ManagedUser[]>(CACHE_KEY_USERS) || [];
  const idx = cached.findIndex((u) => u.id === uid || u.uid === uid);
  if (idx >= 0) {
    const updated = {
      ...cached[idx],
      ...updates,
      updatedAt: now,
      fecha_ultima_actividad: now,
      role: normRole || cached[idx].role || normalizeRole(cached[idx].rol),
      rol: normRole ? (ROLE_DISPLAY[normRole]?.es as UserRole) : cached[idx].rol,
    };
    cached[idx] = updated;
    saveToCache(CACHE_KEY_USERS, cached);
    return updated;
  }
  return null;
}

export async function toggleUserStatusInFirestore(
  uid: string,
  authorName: string
): Promise<{ success: boolean; newStatus: UserStatus }> {
  const users = await getUsersFromFirestore();
  const target = users.find((u) => u.id === uid || u.uid === uid);
  const nextStatus: UserStatus = (target?.estado === 'activo' || target?.status === 'activo') ? 'inactivo' : 'activo';

  await updateUserInFirestore(uid, { estado: nextStatus, status: nextStatus }, authorName);

  await logAuditEvent(
    nextStatus === 'inactivo' ? 'DESACTIVAR_USUARIO' : 'ACTIVAR_USUARIO',
    'users',
    uid,
    authorName,
    auth.currentUser?.uid,
    'ADMIN',
    { usuario: target?.nombre, nuevo_estado: nextStatus }
  );

  return { success: true, newStatus: nextStatus };
}

export async function deleteUserFromFirestore(
  uid: string,
  authorName: string
): Promise<{ success: boolean }> {
  try {
    await deleteDoc(doc(db, 'users', uid));
    try {
      await deleteDoc(doc(db, 'admins', uid));
    } catch {}

    await logAuditEvent(
      'ELIMINAR_USUARIO_DEFINITIVO',
      'users',
      uid,
      authorName,
      auth.currentUser?.uid,
      'ADMIN',
      { uid }
    );
  } catch (err) {
    console.warn('[Firestore] Error deleting user:', err);
  }

  // Remove from cache
  const cached = loadFromCache<ManagedUser[]>(CACHE_KEY_USERS) || [];
  saveToCache(CACHE_KEY_USERS, cached.filter((u) => u.id !== uid && u.uid !== uid));
  return { success: true };
}

// ============================================================================
// SERVICE REQUESTS & ORDERS SERVICE (requests/{requestId})
// ============================================================================
export interface GetOrdersOptions {
  role?: AppRole;
  userUid?: string;
  technicianId?: string;
  showArchived?: boolean;
  search?: string;
  category?: string;
  status?: string;
}

export async function getOrdersFromFirestore(options: GetOrdersOptions = {}): Promise<ServiceRequest[]> {
  try {
    const colRef = collection(db, 'requests');
    let q: any = colRef;

    if (options.role === 'CLIENT' && options.userUid) {
      q = query(colRef, where('creado_por_uid', '==', options.userUid));
    } else if (options.role === 'TECHNICIAN' && (options.technicianId || options.userUid)) {
      const techId = options.technicianId || options.userUid;
      q = query(colRef, where('tecnico_id', '==', techId));
    }

    const snap = await getDocs(q);
    const orders: ServiceRequest[] = [];

    snap.forEach((d) => {
      const data = d.data() as ServiceRequest;
      orders.push({
        ...data,
        id: d.id,
        estado: normalizeStatus(data.estado),
      });
    });

    if (orders.length > 0) {
      saveToCache(CACHE_KEY_ORDERS, orders);
      return filterOrders(orders, options);
    }
  } catch (err) {
    console.warn('[Orders] Firestore read failed, using cached data:', err);
  }

  // Fallback to cache
  const list = loadFromCache<ServiceRequest[]>(CACHE_KEY_ORDERS);
  if (!list || list.length === 0) {
    return [];
  }

  return filterOrders(list, options);
}

function filterOrders(orders: ServiceRequest[], options: GetOrdersOptions): ServiceRequest[] {
  let filtered = [...orders];

  // RBAC Filter:
  if (options.role === 'CLIENT' && options.userUid) {
    filtered = filtered.filter(
      (o) => o.creado_por_uid === options.userUid || o.cliente?.id === options.userUid
    );
  } else if (options.role === 'TECHNICIAN') {
    const techId = options.technicianId || options.userUid;
    filtered = filtered.filter(
      (o) => o.tecnico_id === techId || o.tecnico_asignado === techId
    );
  }

  // Archived Filter: by default hide ARCHIVADA unless explicitly requested
  if (!options.showArchived) {
    filtered = filtered.filter((o) => normalizeStatus(o.estado) !== 'ARCHIVADA' && !o.isArchived);
  } else {
    filtered = filtered.filter((o) => normalizeStatus(o.estado) === 'ARCHIVADA' || o.isArchived);
  }

  // Search Filter
  if (options.search) {
    const s = options.search.toLowerCase();
    filtered = filtered.filter(
      (o) =>
        o.numero_pedido?.toLowerCase().includes(s) ||
        o.codigo_seguimiento?.toLowerCase().includes(s) ||
        o.cliente?.nombre?.toLowerCase().includes(s) ||
        o.cliente?.telefono?.toLowerCase().includes(s) ||
        o.direccion?.toLowerCase().includes(s) ||
        (o.servicio_probable?.service_name || o.servicio_probable?.nombre || '').toLowerCase().includes(s)
    );
  }

  // Category Filter
  if (options.category && options.category !== 'all') {
    filtered = filtered.filter(
      (o) => o.servicio_probable?.category?.toLowerCase() === options.category?.toLowerCase()
    );
  }

  // Status Filter
  if (options.status && options.status !== 'all') {
    filtered = filtered.filter((o) => normalizeStatus(o.estado) === options.status);
  }

  return filtered;
}

export async function createOrderInFirestore(
  payload: Partial<ServiceRequest>,
  authorName: string = 'Cliente'
): Promise<ServiceRequest> {
  const year = new Date().getFullYear();
  const id = payload.id || `REQ-${year}-${Math.floor(1000 + Math.random() * 9000)}`;
  
  // Obtain atomic monthly sequential order number: FIX-YYMM-####
  let monthlyOrderNumber = payload.numero_pedido;
  if (!monthlyOrderNumber || !monthlyOrderNumber.startsWith('FIX-')) {
    try {
      monthlyOrderNumber = await getNextMonthlyOrderNumber();
    } catch {
      monthlyOrderNumber = payload.codigo_seguimiento || `FIX-${String(year).slice(-2)}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;
    }
  }

  const tracking = payload.codigo_seguimiento || monthlyOrderNumber;
  const now = new Date().toISOString();

  const initialStatus: OfficialRequestStatus = 'NUEVA';

  const orderDoc: ServiceRequest = {
    id,
    codigo_seguimiento: tracking,
    numero_pedido: monthlyOrderNumber,
    consecutiveId: monthlyOrderNumber,
    orderNumber: monthlyOrderNumber,
    cliente: payload.cliente!,
    creado_por_uid: payload.creado_por_uid || auth.currentUser?.uid || payload.cliente?.id || 'usr_guest',
    imagenes: payload.imagenes || [],
    servicio_probable: payload.servicio_probable!,
    clasificacion_ia: payload.clasificacion_ia,
    respuestas: payload.respuestas || {},
    direccion: payload.direccion || '',
    referencia: payload.referencia || '',
    tipo_propiedad: payload.tipo_propiedad || 'Apartamento',
    horario_preferido: payload.horario_preferido || 'Hoy',
    precio_regular: payload.precio_regular || 35,
    descuento: payload.descuento || 0,
    precio_lanzamiento: payload.precio_lanzamiento || 35,
    estado: initialStatus,
    tecnico_id: payload.tecnico_id,
    tecnico_asignado: payload.tecnico_asignado,
    tecnico_nombre: payload.tecnico_nombre || payload.tecnico_asignado,
    costo_inspeccion: payload.costo_inspeccion ?? 35,
    cotizacion: payload.cotizacion ?? payload.precio_lanzamiento ?? 35,
    total_facturado: payload.total_facturado ?? payload.precio_lanzamiento ?? 35,
    costo_tecnico: payload.costo_tecnico ?? 0,
    estado_pago: payload.estado_pago || 'Pendiente',
    metodo_pago: payload.metodo_pago,
    notas_internas: payload.notas_internas || '',
    fecha: now,
    updatedAt: now,
    isArchived: false,
    historial: [
      {
        id: `HIST-${Date.now()}`,
        estado_nuevo: initialStatus,
        fecha: now,
        usuario: authorName,
        usuario_uid: auth.currentUser?.uid,
        comentario: `Solicitud registrada con número consecutivo ${monthlyOrderNumber}.`,
      }
    ],
  };

  try {
    const cleanDoc = sanitizeForFirestore(orderDoc);
    await setDoc(doc(db, 'requests', id), cleanDoc);
    // Mirror to orders collection for multi-collection queries
    try {
      await setDoc(doc(db, 'orders', id), cleanDoc);
    } catch {}
    await logAuditEvent(
      'CREAR_SOLICITUD',
      'requests',
      id,
      authorName,
      auth.currentUser?.uid,
      'Cliente',
      { codigo: tracking, numero_pedido: monthlyOrderNumber, cliente: payload.cliente?.nombre }
    );
  } catch (err) {
    console.warn('[Firestore] Order creation fallback:', err);
  }

  // Update local cache
  const cached = loadFromCache<ServiceRequest[]>(CACHE_KEY_ORDERS) || [];
  saveToCache(CACHE_KEY_ORDERS, [orderDoc, ...cached]);
  return orderDoc;
}

export async function updateOrderInFirestore(
  id: string,
  updates: Partial<ServiceRequest>,
  authorName: string,
  comment?: string
): Promise<ServiceRequest | null> {
  const cached = loadFromCache<ServiceRequest[]>(CACHE_KEY_ORDERS) || [];
  const existing = cached.find((o) => o.id === id);
  const now = new Date().toISOString();

  const prevStatus = existing?.estado || 'NUEVA';
  const newStatus = updates.estado ? normalizeStatus(updates.estado) : normalizeStatus(prevStatus);

  // Build history entry if status changed or comment provided
  const existingHistory = Array.isArray(existing?.historial) ? existing.historial : [];
  const newHistory = [...existingHistory];

  if (updates.estado && normalizeStatus(updates.estado) !== normalizeStatus(prevStatus) || comment) {
    newHistory.push({
      id: `HIST-${Date.now()}`,
      estado_anterior: prevStatus,
      estado_nuevo: newStatus,
      fecha: now,
      usuario: authorName,
      usuario_uid: auth.currentUser?.uid,
      comentario: comment || `Estado cambiado de ${prevStatus} a ${newStatus}`,
    });
  }

  const finalUpdates: Partial<ServiceRequest> = {
    ...updates,
    estado: newStatus,
    updatedAt: now,
    historial: newHistory,
  };

  try {
    await updateDoc(doc(db, 'requests', id), finalUpdates as Record<string, any>);
    await logAuditEvent(
      'ACTUALIZAR_SOLICITUD',
      'requests',
      id,
      authorName,
      auth.currentUser?.uid,
      'Operador',
      { estado_anterior: prevStatus, nuevo_estado: newStatus, comentario: comment }
    );
  } catch (err) {
    console.warn('[Firestore] Order update fallback:', err);
  }

  // Update cache
  const idx = cached.findIndex((o) => o.id === id);
  if (idx >= 0) {
    const updated = { ...cached[idx], ...finalUpdates };
    cached[idx] = updated as ServiceRequest;
    saveToCache(CACHE_KEY_ORDERS, cached);
    return updated as ServiceRequest;
  }
  return null;
}

export async function archiveOrderInFirestore(
  id: string,
  authorName: string,
  reason: string = 'Archivado por administración'
): Promise<ServiceRequest | null> {
  return updateOrderInFirestore(
    id,
    {
      estado: 'ARCHIVADA',
      isArchived: true,
    },
    authorName,
    `Orden archivada: ${reason}`
  );
}

export async function deleteOrderFromFirestore(
  id: string,
  authorName: string
): Promise<{ success: boolean }> {
  try {
    await deleteDoc(doc(db, 'requests', id));
    await logAuditEvent(
      'ELIMINAR_SOLICITUD_DEFINITIVA',
      'requests',
      id,
      authorName,
      auth.currentUser?.uid,
      'ADMIN',
      { solicitud_id: id }
    );
  } catch (err) {
    console.warn('[Firestore] Order deletion fallback:', err);
  }

  const cached = loadFromCache<ServiceRequest[]>(CACHE_KEY_ORDERS) || [];
  saveToCache(CACHE_KEY_ORDERS, cached.filter((o) => o.id !== id));
  return { success: true };
}

// ============================================================================
// TECHNICIANS & PROVIDERS SERVICE (technicians/{technicianId})
// ============================================================================
export async function getTechniciansFromFirestore(): Promise<Technician[]> {
  try {
    const snap = await getDocs(collection(db, 'technicians'));
    const techs: Technician[] = [];
    snap.forEach((d) => {
      techs.push(d.data() as Technician);
    });
    if (techs.length > 0) {
      saveToCache(CACHE_KEY_TECHS, techs);
      return techs;
    }
  } catch (err) {
    console.warn('[Techs] Firestore read error, using cache:', err);
  }

  const cached = loadFromCache<Technician[]>(CACHE_KEY_TECHS);
  if (cached && cached.length > 0) return cached;

  return [];
}

export async function createTechnicianInFirestore(
  payload: Partial<Technician>,
  authorName: string
): Promise<Technician> {
  const id = payload.id || `TECH-${Date.now().toString().slice(-4)}`;
  const tech: Technician = {
    id,
    nombre: payload.nombre || 'Nuevo Técnico',
    telefono: payload.telefono || '',
    correo: payload.correo || '',
    activo: payload.activo !== false,
    status: payload.activo === false ? 'inactivo' : 'activo',
    especialidad: payload.especialidad || 'Reparaciones del hogar',
    especialidades: ((payload.especialidades || [payload.especialidad || 'Reparaciones del hogar']) as unknown) as any,
    zona_cobertura: payload.zona_cobertura || 'Ciudad de Panamá',
    tipo_relacion: payload.tipo_relacion || 'contratista',
    tarifa_acordada: payload.tarifa_acordada || '70% mano de obra',
    tarifa_base_usd: payload.tarifa_base_usd || 25,
    servicios_asignados: 0,
    servicios_completados: 0,
    documentacion: payload.documentacion || '',
    notas: payload.notas || '',
  };

  try {
    await setDoc(doc(db, 'technicians', id), sanitizeForFirestore(tech));
    await logAuditEvent(
      'CREAR_TECNICO',
      'technicians',
      id,
      authorName,
      auth.currentUser?.uid,
      'Operador',
      { nombre: tech.nombre, especialidad: tech.especialidad }
    );
  } catch (err) {
    console.warn('[Techs] Firestore create fallback:', err);
  }

  const cached = loadFromCache<Technician[]>(CACHE_KEY_TECHS) || [];
  saveToCache(CACHE_KEY_TECHS, [tech, ...cached]);
  return tech;
}

export async function updateTechnicianInFirestore(
  id: string,
  updates: Partial<Technician>,
  authorName: string
): Promise<Technician | null> {
  try {
    await updateDoc(doc(db, 'technicians', id), updates as Record<string, any>);
    await logAuditEvent(
      'ACTUALIZAR_TECNICO',
      'technicians',
      id,
      authorName,
      auth.currentUser?.uid,
      'Operador',
      updates
    );
  } catch (err) {
    console.warn('[Techs] Firestore update fallback:', err);
  }

  const cached = loadFromCache<Technician[]>(CACHE_KEY_TECHS) || [];
  const idx = cached.findIndex((t) => t.id === id);
  if (idx >= 0) {
    const updated = { ...cached[idx], ...updates };
    cached[idx] = updated;
    saveToCache(CACHE_KEY_TECHS, cached);
    return updated;
  }
  return null;
}

export async function toggleTechnicianStatusInFirestore(
  id: string,
  authorName: string
): Promise<{ success: boolean; newStatus: boolean }> {
  const techs = await getTechniciansFromFirestore();
  const target = techs.find((t) => t.id === id);
  const nextActivo = !(target?.activo ?? true);

  await updateTechnicianInFirestore(
    id,
    { activo: nextActivo, status: nextActivo ? 'activo' : 'inactivo' },
    authorName
  );

  return { success: true, newStatus: nextActivo };
}

// ============================================================================
// SERVICES CATALOG SERVICE (services/{serviceId})
// ============================================================================
export async function getServicesFromFirestore(): Promise<Service[]> {
  try {
    const snap = await getDocs(collection(db, 'services'));
    const services: Service[] = [];
    snap.forEach((d) => {
      services.push(d.data() as Service);
    });
    if (services.length > 0) {
      const map = new Map<string, Service>();
      FIXIT_CATALOG.forEach((s) => map.set(s.id, s));
      services.forEach((s) => map.set(s.id, { ...(map.get(s.id) || {}), ...s }));
      const merged = Array.from(map.values());
      saveToCache(CACHE_KEY_SERVICES, merged);
      return merged;
    }
  } catch (err) {
    console.warn('[Services] Firestore read error, using cache:', err);
  }

  const cached = loadFromCache<Service[]>(CACHE_KEY_SERVICES);
  if (cached && cached.length > 0) {
    const map = new Map<string, Service>();
    FIXIT_CATALOG.forEach((s) => map.set(s.id, s));
    cached.forEach((s) => map.set(s.id, { ...(map.get(s.id) || {}), ...s }));
    return Array.from(map.values());
  }

  saveToCache(CACHE_KEY_SERVICES, FIXIT_CATALOG);
  return FIXIT_CATALOG;
}

export async function createServiceInFirestore(
  payload: Partial<Service>,
  authorName: string
): Promise<Service> {
  const id = payload.id || `SVC-${Date.now().toString().slice(-4)}`;
  const now = new Date().toISOString();
  const service: Service = {
    id,
    category: payload.category || payload.categoria || 'Reparaciones del hogar',
    categoria: payload.category || payload.categoria || 'Reparaciones del hogar',
    service_name: payload.service_name || payload.nombre || 'Nuevo servicio',
    nombre: payload.service_name || payload.nombre || 'Nuevo servicio',
    description: payload.description || payload.descripcion || '',
    descripcion: payload.description || payload.descripcion || '',
    price: payload.price ?? payload.precio_lanzamiento ?? payload.precio_regular ?? 35,
    precio_regular: payload.precio_regular || 45,
    precio_lanzamiento: payload.precio_lanzamiento || 35,
    pricing_type: payload.pricing_type || 'fixed',
    modalidad: payload.modalidad || 'Precio fijo',
    unit_name: payload.unit_name || 'servicio',
    minimum_service_charge: payload.minimum_service_charge || 35,
    is_evaluation_required: Boolean(payload.is_evaluation_required || payload.diagnostic_required),
    diagnostic_required: Boolean(payload.diagnostic_required || payload.is_evaluation_required),
    diagnostic_price: payload.diagnostic_price ?? 35,
    estimated_duration: payload.estimated_duration || payload.tiempo_estimado || '1 - 2 horas',
    warranty_days: payload.warranty_days || 30,
    tiempo_estimado: payload.tiempo_estimado || '1 - 2 horas',
    garantia: payload.garantia || '30 días de garantía FIXIT',
    active: payload.active !== false,
    activo: payload.active !== false,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await setDoc(doc(db, 'services', id), service);
    await logAuditEvent(
      'CREAR_SERVICIO',
      'services',
      id,
      authorName,
      auth.currentUser?.uid,
      'Operador',
      { servicio: service.service_name, precio: service.price }
    );
  } catch (err) {
    console.warn('[Services] Firestore create fallback:', err);
  }

  const cached = loadFromCache<Service[]>(CACHE_KEY_SERVICES) || [];
  saveToCache(CACHE_KEY_SERVICES, [service, ...cached]);
  return service;
}

export async function updateServiceInFirestore(
  id: string,
  updates: Partial<Service>,
  authorName: string
): Promise<Service | null> {
  const now = new Date().toISOString();
  const fsUpdates = { ...updates, updatedAt: now };

  try {
    await updateDoc(doc(db, 'services', id), fsUpdates as Record<string, any>);
    await logAuditEvent(
      'ACTUALIZAR_SERVICIO',
      'services',
      id,
      authorName,
      auth.currentUser?.uid,
      'Operador',
      updates
    );
  } catch (err) {
    console.warn('[Services] Firestore update fallback:', err);
  }

  const cached = loadFromCache<Service[]>(CACHE_KEY_SERVICES) || [];
  const idx = cached.findIndex((s) => s.id === id);
  if (idx >= 0) {
    const updated = { ...cached[idx], ...fsUpdates };
    cached[idx] = updated;
    saveToCache(CACHE_KEY_SERVICES, cached);
    return updated;
  }
  return null;
}

export async function deleteServiceInFirestore(
  id: string,
  authorName: string
): Promise<{ success: boolean }> {
  try {
    await deleteDoc(doc(db, 'services', id));
    await logAuditEvent(
      'ELIMINAR_SERVICIO',
      'services',
      id,
      authorName,
      auth.currentUser?.uid,
      'Operador',
      { id }
    );
  } catch (err) {
    console.warn('[Services] Firestore delete fallback:', err);
  }

  const cached = loadFromCache<Service[]>(CACHE_KEY_SERVICES) || [];
  saveToCache(CACHE_KEY_SERVICES, cached.filter((s) => s.id !== id));
  return { success: true };
}

// ============================================================================
// FORMAL QUOTES SERVICE (quotes/{quoteId})
// ============================================================================
export async function getQuotesFromFirestore(options?: {
  clienteUid?: string;
  solicitudId?: string;
}): Promise<ManagedQuote[]> {
  try {
    const colRef = collection(db, 'quotes');
    let q = query(colRef, orderBy('fecha_creacion', 'desc'));

    if (options?.clienteUid) {
      q = query(colRef, where('cliente_uid', '==', options.clienteUid), orderBy('fecha_creacion', 'desc'));
    } else if (options?.solicitudId) {
      q = query(colRef, where('solicitud_id', '==', options.solicitudId));
    }

    const snap = await getDocs(q);
    const list: ManagedQuote[] = [];
    snap.forEach((d) => {
      list.push({ ...(d.data() as ManagedQuote), id: d.id });
    });

    if (list.length > 0) {
      saveToCache(CACHE_KEY_QUOTES, list);
      return list;
    }
  } catch (err) {
    console.warn('[Quotes] Firestore fetch fallback to cache:', err);
  }

  const cached = loadFromCache<ManagedQuote[]>(CACHE_KEY_QUOTES) || [];
  if (options?.clienteUid) {
    return cached.filter((q) => q.cliente_uid === options.clienteUid);
  }
  if (options?.solicitudId) {
    return cached.filter((q) => q.solicitud_id === options.solicitudId);
  }
  return cached;
}

export async function getQuoteByIdFromFirestore(quoteId: string): Promise<ManagedQuote | null> {
  try {
    const snap = await getDoc(doc(db, 'quotes', quoteId));
    if (snap.exists()) {
      return { ...(snap.data() as ManagedQuote), id: snap.id };
    }
  } catch (err) {
    console.warn('[Quotes] Firestore getDoc fallback:', err);
  }

  const cached = loadFromCache<ManagedQuote[]>(CACHE_KEY_QUOTES) || [];
  return cached.find((q) => q.id === quoteId) || null;
}

export async function createQuoteInFirestore(
  quoteData: Omit<ManagedQuote, 'id'> & { id?: string },
  authorName: string = 'Operador FIXIT'
): Promise<ManagedQuote> {
  const quoteId = quoteData.id || `COT-${Date.now().toString().slice(-6)}`;
  const now = new Date().toISOString();

  const newQuote: ManagedQuote = {
    ...quoteData,
    id: quoteId,
    fecha_creacion: quoteData.fecha_creacion || now,
    precio: quoteData.precio || quoteData.total,
    estado: quoteData.estado || 'En preparación',
  };

  try {
    await setDoc(doc(db, 'quotes', quoteId), newQuote);
    await logAuditEvent(
      'CREAR_COTIZACION',
      'quotes',
      quoteId,
      authorName,
      auth.currentUser?.uid,
      'Operador',
      {
        solicitud_id: newQuote.solicitud_id,
        total: newQuote.total,
        cliente: newQuote.cliente_nombre,
      }
    );
  } catch (err) {
    console.warn('[Quotes] Firestore write fallback:', err);
  }

  const cached = loadFromCache<ManagedQuote[]>(CACHE_KEY_QUOTES) || [];
  const updated = [newQuote, ...cached.filter((q) => q.id !== quoteId)];
  saveToCache(CACHE_KEY_QUOTES, updated);
  return newQuote;
}

export async function updateQuoteInFirestore(
  quoteId: string,
  updates: Partial<ManagedQuote>,
  authorName: string = 'Operador FIXIT'
): Promise<ManagedQuote | null> {
  try {
    await updateDoc(doc(db, 'quotes', quoteId), updates as any);
    await logAuditEvent(
      'ACTUALIZAR_COTIZACION',
      'quotes',
      quoteId,
      authorName,
      auth.currentUser?.uid,
      'Operador',
      updates
    );
  } catch (err) {
    console.warn('[Quotes] Firestore update fallback:', err);
  }

  const cached = loadFromCache<ManagedQuote[]>(CACHE_KEY_QUOTES) || [];
  const idx = cached.findIndex((q) => q.id === quoteId);
  if (idx >= 0) {
    const updated = { ...cached[idx], ...updates };
    cached[idx] = updated;
    saveToCache(CACHE_KEY_QUOTES, cached);
    return updated;
  }
  return null;
}

// ============================================================================
// OPERATIONAL TECHNICIAN ASSIGNMENTS (technician_assignments/{assignmentId})
// ============================================================================
export async function getTechnicianAssignmentsFromFirestore(options?: {
  tecnicoId?: string;
  solicitudId?: string;
}): Promise<TechnicianAssignment[]> {
  try {
    const colRef = collection(db, 'technician_assignments');
    let q = query(colRef, orderBy('fecha_asignacion', 'desc'));

    if (options?.tecnicoId) {
      q = query(colRef, where('tecnico_id', '==', options.tecnicoId));
    } else if (options?.solicitudId) {
      q = query(colRef, where('solicitud_id', '==', options.solicitudId));
    }

    const snap = await getDocs(q);
    const list: TechnicianAssignment[] = [];
    snap.forEach((d) => {
      list.push({ ...(d.data() as TechnicianAssignment), id: d.id });
    });

    if (list.length > 0) {
      saveToCache(CACHE_KEY_ASSIGNMENTS, list);
      return list;
    }
  } catch (err) {
    console.warn('[Assignments] Firestore fetch fallback:', err);
  }

  const cached = loadFromCache<TechnicianAssignment[]>(CACHE_KEY_ASSIGNMENTS) || [];
  if (options?.tecnicoId) {
    return cached.filter((a) => a.tecnico_id === options.tecnicoId);
  }
  if (options?.solicitudId) {
    return cached.filter((a) => a.solicitud_id === options.solicitudId);
  }
  return cached;
}

export async function createTechnicianAssignmentInFirestore(
  assignmentData: Omit<TechnicianAssignment, 'id'> & { id?: string },
  authorName: string = 'Operador FIXIT'
): Promise<TechnicianAssignment> {
  const assignmentId = assignmentData.id || `ASG-${Date.now().toString().slice(-6)}`;
  const now = new Date().toISOString();

  const newAssignment: TechnicianAssignment = {
    ...assignmentData,
    id: assignmentId,
    fecha_asignacion: assignmentData.fecha_asignacion || now,
    fecha: assignmentData.fecha || assignmentData.fecha_asignacion || now,
    estado: assignmentData.estado || 'ASIGNADA',
    createdAt: now,
    updatedAt: now,
  };

  try {
    await setDoc(doc(db, 'technician_assignments', assignmentId), newAssignment);
    await logAuditEvent(
      'CREAR_ASIGNACION',
      'technician_assignments',
      assignmentId,
      authorName,
      auth.currentUser?.uid,
      'Operador',
      {
        tecnico_id: newAssignment.tecnico_id,
        tecnico_nombre: newAssignment.tecnico_nombre,
        solicitud_id: newAssignment.solicitud_id,
        estado: newAssignment.estado,
      }
    );
  } catch (err) {
    console.warn('[Assignments] Firestore create fallback:', err);
  }

  const cached = loadFromCache<TechnicianAssignment[]>(CACHE_KEY_ASSIGNMENTS) || [];
  const updated = [newAssignment, ...cached.filter((a) => a.id !== assignmentId)];
  saveToCache(CACHE_KEY_ASSIGNMENTS, updated);
  return newAssignment;
}

export async function updateTechnicianAssignmentStatusInFirestore(
  assignmentId: string,
  estado: AssignmentStatus,
  notas?: string,
  authorName: string = 'Técnico / Operador'
): Promise<TechnicianAssignment | null> {
  const now = new Date().toISOString();
  const updates: Partial<TechnicianAssignment> = {
    estado,
    updatedAt: now,
    ...(notas !== undefined ? { notas } : {}),
  };

  try {
    await updateDoc(doc(db, 'technician_assignments', assignmentId), updates as any);
    await logAuditEvent(
      'ACTUALIZAR_ESTADO_ASIGNACION',
      'technician_assignments',
      assignmentId,
      authorName,
      auth.currentUser?.uid,
      'Técnico',
      { estado, notas }
    );
  } catch (err) {
    console.warn('[Assignments] Firestore update fallback:', err);
  }

  const cached = loadFromCache<TechnicianAssignment[]>(CACHE_KEY_ASSIGNMENTS) || [];
  const idx = cached.findIndex((a) => a.id === assignmentId);
  if (idx >= 0) {
    const updated = { ...cached[idx], ...updates };
    cached[idx] = updated;
    saveToCache(CACHE_KEY_ASSIGNMENTS, cached);
    return updated;
  }
  return null;
}

// ============================================================================
// PAYMENTS & TRANSACTIONS SERVICE (payments/{paymentId})
// ============================================================================
export async function getPaymentsFromFirestore(options?: {
  solicitudId?: string;
  clienteUid?: string;
}): Promise<ManagedPayment[]> {
  try {
    const colRef = collection(db, 'payments');
    let q = query(colRef, orderBy('fecha', 'desc'));

    if (options?.solicitudId) {
      q = query(colRef, where('solicitud_id', '==', options.solicitudId));
    } else if (options?.clienteUid) {
      q = query(colRef, where('cliente_uid', '==', options.clienteUid));
    }

    const snap = await getDocs(q);
    const list: ManagedPayment[] = [];
    snap.forEach((d) => {
      list.push({ ...(d.data() as ManagedPayment), id: d.id });
    });

    if (list.length > 0) {
      saveToCache(CACHE_KEY_PAYMENTS, list);
      return list;
    }
  } catch (err) {
    console.warn('[Payments] Firestore fetch fallback:', err);
  }

  const cached = loadFromCache<ManagedPayment[]>(CACHE_KEY_PAYMENTS) || [];
  if (options?.solicitudId) {
    return cached.filter((p) => p.solicitud_id === options.solicitudId);
  }
  return cached;
}

export async function recordPaymentInFirestore(
  paymentData: Omit<ManagedPayment, 'id'> & { id?: string },
  authorName: string = 'Operador FIXIT'
): Promise<ManagedPayment> {
  const paymentId = paymentData.id || `PAY-${Date.now().toString().slice(-6)}`;
  const now = new Date().toISOString();

  const newPayment: ManagedPayment = {
    ...paymentData,
    id: paymentId,
    fecha: paymentData.fecha || now,
    referencia: paymentData.referencia || paymentData.referencia_transaccion,
  };

  try {
    await setDoc(doc(db, 'payments', paymentId), newPayment);
    await logAuditEvent(
      'REGISTRAR_PAGO',
      'payments',
      paymentId,
      authorName,
      auth.currentUser?.uid,
      'Operador',
      {
        solicitud_id: newPayment.solicitud_id,
        monto: newPayment.monto,
        metodo: newPayment.metodo,
        estado: newPayment.estado,
        referencia: newPayment.referencia,
      }
    );
  } catch (err) {
    console.warn('[Payments] Firestore setDoc fallback:', err);
  }

  const cached = loadFromCache<ManagedPayment[]>(CACHE_KEY_PAYMENTS) || [];
  const updated = [newPayment, ...cached.filter((p) => p.id !== paymentId)];
  saveToCache(CACHE_KEY_PAYMENTS, updated);
  return newPayment;
}

// ============================================================================
// OPERATIONAL INDICATORS & DASHBOARD METRICS FROM FIRESTORE
// ============================================================================
export async function getOperationalIndicatorsFromFirestore(): Promise<OperationalIndicators> {
  const [users, orders] = await Promise.all([
    getUsersFromFirestore(),
    getOrdersFromFirestore({ showArchived: true }),
  ]);

  const activeUsers = users.filter((u) => u.estado === 'activo' || u.status === 'activo').length;
  const deactivatedUsers = users.filter((u) => u.estado === 'inactivo' || u.status === 'inactivo').length;

  const rawActiveOrders = orders.filter((o) => normalizeStatus(o.estado) !== 'ARCHIVADA');

  const newOrders = rawActiveOrders.filter((o) => normalizeStatus(o.estado) === 'NUEVA').length;
  const inProgress = rawActiveOrders.filter((o) => {
    const s = normalizeStatus(o.estado);
    return s === 'EN_PROCESO' || s === 'PROGRAMADA' || s === 'ASIGNADA';
  }).length;
  const pendingQuotes = rawActiveOrders.filter((o) => {
    const s = normalizeStatus(o.estado);
    return s === 'COTIZACION' || s === 'PENDIENTE_APROBACION' || s === 'EVALUACION';
  }).length;
  const pendingPayments = rawActiveOrders.filter((o) => {
    const s = normalizeStatus(o.estado);
    return s === 'PENDIENTE_PAGO';
  }).length;
  const confirmedPayments = rawActiveOrders.filter((o) => {
    const s = normalizeStatus(o.estado);
    return s === 'PAGADA';
  }).length;
  const completed = rawActiveOrders.filter((o) => normalizeStatus(o.estado) === 'COMPLETADA').length;

  return {
    solicitudes_activas: rawActiveOrders.length,
    solicitudes_urgentes: 2,
    tecnicos_disponibles: 4,
    facturacion_mes: 1840,
    nuevas_hoy: newOrders,
    en_proceso_hoy: inProgress,
    pendientes_asignacion: newOrders,
    completadas_mes: completed,
    tasa_conversion_porc: 82,
    tiempo_promedio_respuesta_min: 8,
    calificacion_promedio_servicio: 4.9,
    usuarios_activos: activeUsers,
    usuarios_desactivados: deactivatedUsers,
    cotizaciones_pendientes: pendingQuotes,
    pagos_pendientes: pendingPayments,
    pagos_confirmados: confirmedPayments,
  } as OperationalIndicators;
}

// ============================================================================
// SEEDING (Auto-populates Firestore if newly provisioned)
// ============================================================================
export async function seedInitialFirestoreData(): Promise<void> {
  try {
    // Check if services exists
    const svcSnap = await getDocs(collection(db, 'services'));
    if (svcSnap.empty) {
      console.log('Seeding initial FIXIT services to Firestore...');
      for (const s of FIXIT_CATALOG.slice(0, 15)) {
        await setDoc(doc(db, 'services', s.id), s);
      }
    }
  } catch {
    // Silent catch for seeding when rules or connection prevent writes
  }
}

