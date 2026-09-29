import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { 
  ServiceRequest, 
  RequestStatus, 
} from '../src/types';

const DATA_DIR = path.join(process.cwd(), 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Ensure data and uploads directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

export interface DatabaseSchema {
  orders: ServiceRequest[];
  orderCounter: number;
}

// Helper to safely read database
export function getDb(): DatabaseSchema {
  try {
    if (!fs.existsSync(DB_FILE)) {
      const initial: DatabaseSchema = {
        orders: [],
        orderCounter: 1000,
      };
      saveDb(initial);
      return initial;
    }
    const data = fs.readFileSync(DB_FILE, 'utf8');
    const parsed = JSON.parse(data) as DatabaseSchema;

    if (!Array.isArray(parsed.orders)) {
      parsed.orders = [];
    }
    if (!parsed.orderCounter) {
      parsed.orderCounter = 1000;
    }

    return parsed;
  } catch (err) {
    console.error('[Database] Read error, resetting store:', err);
    const fallback: DatabaseSchema = {
      orders: [],
      orderCounter: 1000,
    };
    saveDb(fallback);
    return fallback;
  }
}

// Helper to safely write database atomically
export function saveDb(data: DatabaseSchema): void {
  try {
    const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.error('[Database] Save error:', err);
  }
}

// -------------------------------------------------------------
// Orders (Solicitudes) Store Methods
// -------------------------------------------------------------
export function getAllOrders(filters?: {
  status?: string;
  category?: string;
  technicianId?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  showArchived?: boolean;
}): ServiceRequest[] {
  const db = getDb();
  let list = db.orders;

  if (filters) {
    if (filters.status && filters.status !== 'all') {
      const targetStatus = filters.status.toLowerCase();
      list = list.filter((o) => o.estado.toLowerCase() === targetStatus);
    }
    if (filters.category && filters.category !== 'all') {
      const targetCat = filters.category.toLowerCase();
      list = list.filter((o) => 
        (o.servicio_probable.category && o.servicio_probable.category.toLowerCase() === targetCat) ||
        (o.servicio_probable.categoria && o.servicio_probable.categoria.toLowerCase() === targetCat)
      );
    }
    if (filters.technicianId && filters.technicianId !== 'all') {
      list = list.filter((o) => o.tecnico_asignado === filters.technicianId || o.tecnico_id === filters.technicianId);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter((o) => 
        o.codigo_seguimiento.toLowerCase().includes(q) ||
        (o.numero_pedido && o.numero_pedido.toLowerCase().includes(q)) ||
        o.cliente.nombre.toLowerCase().includes(q) ||
        o.cliente.telefono.toLowerCase().includes(q) ||
        (o.cliente.correo && o.cliente.correo.toLowerCase().includes(q)) ||
        o.direccion.toLowerCase().includes(q) ||
        o.servicio_probable.service_name.toLowerCase().includes(q)
      );
    }
    if (filters.startDate) {
      list = list.filter((o) => o.fecha >= filters.startDate!);
    }
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      list = list.filter((o) => o.fecha <= end.toISOString());
    }
  }

  // Sort descending by creation date
  return list.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
}

export function getOrderById(id: string): ServiceRequest | null {
  const db = getDb();
  return db.orders.find((o) => o.id === id || o.codigo_seguimiento === id || o.numero_pedido === id) || null;
}

export function createOrder(orderData: Partial<ServiceRequest>, author: string = 'Sistema'): ServiceRequest {
  const db = getDb();
  const year = new Date().getFullYear();
  db.orderCounter = (db.orderCounter || 1000) + 1;
  
  const seqNumber = db.orderCounter;
  const code = `FIX-${year}-${seqNumber}`;
  const orderId = `REQ-${year}-${String(seqNumber).slice(-3)}`;

  const newOrder: ServiceRequest = {
    id: orderId,
    codigo_seguimiento: code,
    numero_pedido: code,
    cliente: orderData.cliente!,
    imagenes: orderData.imagenes || [],
    servicio_probable: orderData.servicio_probable!,
    clasificacion_ia: orderData.clasificacion_ia,
    respuestas: orderData.respuestas || {},
    direccion: orderData.direccion || '',
    referencia: orderData.referencia || '',
    tipo_propiedad: orderData.tipo_propiedad || 'Apartamento',
    horario_preferido: orderData.horario_preferido || 'Hoy',
    precio_regular: orderData.precio_regular || 35,
    descuento: orderData.descuento || 0,
    precio_lanzamiento: orderData.precio_lanzamiento || 35,
    estado: (orderData.estado as RequestStatus) || 'Nueva solicitud',
    tecnico_id: orderData.tecnico_id,
    tecnico_asignado: orderData.tecnico_asignado,
    tecnico_nombre: orderData.tecnico_nombre,
    notas_internas: orderData.notas_internas || '',
    fecha: orderData.fecha || new Date().toISOString(),
    costo_inspeccion: orderData.costo_inspeccion ?? 25,
    cotizacion: orderData.cotizacion ?? orderData.precio_lanzamiento,
    total_facturado: orderData.total_facturado ?? orderData.precio_lanzamiento,
    costo_tecnico: orderData.costo_tecnico ?? 0,
    costo_materiales: orderData.costo_materiales ?? 0,
    comision_fixit: orderData.comision_fixit ?? 0,
    utilidad_estimada: orderData.utilidad_estimada ?? 0,
    estado_pago: orderData.estado_pago || 'Pendiente',
    metodo_pago: orderData.metodo_pago || 'Pendiente',
    historial_estados: [
      {
        id: 'h-' + Date.now(),
        estado_nuevo: (orderData.estado as RequestStatus) || 'Nueva solicitud',
        fecha: new Date().toISOString(),
        usuario: author,
        nota: 'Solicitud registrada en plataforma',
      },
    ],
  };

  db.orders.unshift(newOrder);
  saveDb(db);

  return newOrder;
}

export function updateOrder(id: string, updates: Partial<ServiceRequest>, author: string = 'Admin FIXIT'): ServiceRequest | null {
  const db = getDb();
  const index = db.orders.findIndex((o) => o.id === id || o.codigo_seguimiento === id);
  if (index === -1) return null;

  const current = db.orders[index];
  const oldStatus = current.estado;
  const newStatus = (updates.estado && updates.estado !== oldStatus) ? updates.estado : oldStatus;

  const history = [...(current.historial_estados || [])];
  if (updates.estado && updates.estado !== oldStatus) {
    history.push({
      id: 'h-' + Date.now(),
      estado_anterior: oldStatus,
      estado_nuevo: updates.estado,
      fecha: new Date().toISOString(),
      usuario: author,
      nota: updates.notas_internas || 'Cambio de estado administrativo',
    });
  }

  const updated: ServiceRequest = {
    ...current,
    ...updates,
    id: current.id,
    codigo_seguimiento: current.codigo_seguimiento,
    estado: newStatus,
    tecnico_nombre: updates.tecnico_nombre || current.tecnico_nombre,
    historial_estados: history,
  };

  db.orders[index] = updated;
  saveDb(db);

  return updated;
}

// -------------------------------------------------------------
// Image Storage (Durable file writes)
// -------------------------------------------------------------
export function savePhotoBuffer(base64Data: string, mimeTypeHint?: string): { id: string; filename: string; url: string } {
  const matches = base64Data.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
  let contentType = mimeTypeHint || 'image/jpeg';
  let buffer: Buffer;

  if (matches && matches.length === 3) {
    contentType = matches[1];
    buffer = Buffer.from(matches[2], 'base64');
  } else {
    buffer = Buffer.from(base64Data, 'base64');
  }

  let ext = 'jpg';
  if (contentType.includes('png')) ext = 'png';
  else if (contentType.includes('webp')) ext = 'webp';
  else if (contentType.includes('jpeg')) ext = 'jpg';

  const photoId = 'fixit_' + crypto.randomBytes(6).toString('hex') + '_' + Date.now();
  const filename = `${photoId}.${ext}`;
  const filePath = path.join(UPLOADS_DIR, filename);

  fs.writeFileSync(filePath, buffer);

  return {
    id: photoId,
    filename,
    url: `/api/photos/${filename}`,
  };
}

export function getPhotoPath(filename: string): string | null {
  const sanitized = path.basename(filename);
  const filePath = path.join(UPLOADS_DIR, sanitized);
  if (fs.existsSync(filePath)) {
    return filePath;
  }
  return null;
}
