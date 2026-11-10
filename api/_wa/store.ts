// Acceso Firestore vía Admin SDK (serverless) + sesiones de WhatsApp.
// Admin SDK no pasa por security rules: colecciones wa_* no necesitan reglas.
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

let dbInstance: Firestore | null = null;

export function getDb(): Firestore {
  if (dbInstance) return dbInstance;
  const raw = (process.env.FIREBASE_SERVICE_ACCOUNT || '').trim();
  if (!raw) throw new Error('Falta variable de entorno: FIREBASE_SERVICE_ACCOUNT (JSON en base64)');
  let creds: { project_id?: string; client_email?: string; private_key?: string };
  try {
    creds = JSON.parse(Buffer.from(raw, 'base64').toString('utf8')) as typeof creds;
  } catch {
    throw new Error('FIREBASE_SERVICE_ACCOUNT no es base64 de un JSON válido');
  }
  if (!creds.project_id || !creds.client_email || !creds.private_key) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT incompleto (project_id/client_email/private_key)');
  }
  const app =
    getApps().length === 0
      ? initializeApp({
          credential: cert({
            projectId: creds.project_id,
            clientEmail: creds.client_email,
            privateKey: creds.private_key,
          }),
        })
      : getApps()[0];
  dbInstance = getFirestore(app);
  return dbInstance;
}

export interface WaSession {
  phone: string;
  name: string;
  history: { role: 'client' | 'agent'; content: string }[];
  turn: number;
  status: 'bot' | 'human' | 'done';
  address?: string | null;
  pendingQuote?: { service: string; price: number; needsVisit: boolean } | null;
  requestId?: string | null;
  lastInboundId?: string | null;
  lastAlertAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WaBotConfig {
  businessName: string;
  visitFee: number;
  extra: string;
  modelId: string;
  maxTurns: number;
  handoffKeyword: string;
  enabled: boolean;
}

const DEFAULT_CONFIG: WaBotConfig = {
  businessName: 'FIXIT Panamá',
  visitFee: 25,
  extra: '',
  modelId: '',
  maxTurns: 8,
  handoffKeyword: 'HUMANO',
  enabled: true,
};

// Lee wa_config/fixit (editable en consola sin deploy); si no existe, defaults.
export async function getBotConfig(): Promise<WaBotConfig> {
  try {
    const snap = await getDb().doc('wa_config/fixit').get();
    if (!snap.exists) return { ...DEFAULT_CONFIG };
    const d = (snap.data() || {}) as Partial<WaBotConfig>;
    return {
      businessName: typeof d.businessName === 'string' && d.businessName ? d.businessName : DEFAULT_CONFIG.businessName,
      visitFee: typeof d.visitFee === 'number' ? d.visitFee : DEFAULT_CONFIG.visitFee,
      extra: typeof d.extra === 'string' ? d.extra : '',
      modelId: typeof d.modelId === 'string' ? d.modelId : '',
      maxTurns: typeof d.maxTurns === 'number' && d.maxTurns > 0 ? Math.min(20, d.maxTurns) : DEFAULT_CONFIG.maxTurns,
      handoffKeyword: typeof d.handoffKeyword === 'string' && d.handoffKeyword ? d.handoffKeyword : DEFAULT_CONFIG.handoffKeyword,
      enabled: d.enabled !== false,
    };
  } catch (e) {
    console.error('[wa] Error leyendo wa_config/fixit, usando defaults:', e instanceof Error ? e.message : e);
    return { ...DEFAULT_CONFIG };
  }
}

export async function getSession(phone: string): Promise<WaSession | null> {
  const snap = await getDb().doc(`wa_sessions/${phone}`).get();
  if (!snap.exists) return null;
  return snap.data() as WaSession;
}

export async function saveSession(s: WaSession): Promise<void> {
  s.updatedAt = new Date().toISOString();
  // Historial acotado: últimos 12 mensajes (6 turnos).
  if (s.history.length > 12) s.history = s.history.slice(-12);
  await getDb().doc(`wa_sessions/${s.phone}`).set(s, { merge: true });
}

export function freshSession(phone: string, name: string): WaSession {
  const now = new Date().toISOString();
  return {
    phone,
    name: name || 'Chat WhatsApp',
    history: [],
    turn: 0,
    status: 'bot',
    pendingQuote: null,
    requestId: null,
    lastInboundId: null,
    lastAlertAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

// Sesión rancia (>6h) = conversación nueva: resetea estado pero conserva identidad.
export function isStale(s: WaSession, nowMs = Date.now()): boolean {
  const updated = Date.parse(s.updatedAt || '');
  if (Number.isNaN(updated)) return true;
  return nowMs - updated > 6 * 60 * 60 * 1000;
}
