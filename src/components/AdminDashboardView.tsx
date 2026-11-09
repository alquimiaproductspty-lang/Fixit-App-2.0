import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  orderBy, 
  setDoc, 
  doc, 
  getDoc,
  updateDoc, 
  deleteDoc,
  serverTimestamp,
  where,
  getDocs
} from 'firebase/firestore';
import { db, auth, AuthState } from '../lib/firebase';
import {
  isSoundEnabled,
  setSoundEnabled,
  playNewOrderSound,
} from '../lib/soundAlert';
import {
  DEFAULT_COMMISSION_RATE,
  DEFAULT_MIN_STANDALONE_COMMISSION_USD,
  getCommissionBase,
  calcCommission,
  calcNet,
  calcCommissionBreakdown,
  isLaborCommissionBase,
  normalizeRate,
  normalizeMinStandaloneCommission,
  round2,
} from '../lib/commissions';
import { getNextMonthlyOrderNumber } from '../lib/orderConsecutive';
import { FIXIT_CATALOG } from '../data/catalog';
import {
  sanitizeForFirestore,
  updateOrderInFirestore,
  assignTechnicianToOrder,
  getQuotesFromFirestore,
  updateQuoteInFirestore,
  deleteQuoteInFirestore,
  getPaymentsFromFirestore,
  recordPaymentInFirestore,
  updatePaymentInFirestore,
  deletePaymentInFirestore,
} from '../lib/firestoreService';
import {
  normalizeStatus,
  OFFICIAL_STATUS_DISPLAY,
  type OfficialRequestStatus,
  type ManagedQuote,
  type QuoteStatus,
  type ManagedPayment,
  type PaymentMethod,
  type PaymentStatus,
  type VisitOutcome,
} from '../types';
import { 
  Users, 
  Wrench, 
  DollarSign, 
  Banknote,
  Edit2,
  Package, 
  Search, 
  Download, 
  Plus, 
  MessageCircle, 
  Share2,
  Copy,
  KeyRound,
  Award,
  CreditCard,
  Mail, 
  Phone, 
  Star, 
  AlertCircle, 
  AlertTriangle,
  ShieldCheck, 
  RefreshCw, 
  TrendingUp, 
  X, 
  LayoutGrid,
  List,
  Sparkles,
  Trash2,
  Calendar,
  MapPin,
  Clock,
  CheckCircle2,
  User,
  FileText,
  Volume2,
  VolumeX,
  Percent
} from 'lucide-react';

export interface AdminFixer {
  id: string;
  uid?: string;
  nombre: string;
  especialidad: 'Plomería' | 'Electricidad' | 'Reparaciones del hogar' | 'Pintura residencial' | string;
  telefono: string;
  correo?: string;
  cedula?: string;
  idoneidad_tipo?: string;
  idoneidad_numero?: string;
  photoURL?: string;
  disponibilidad: 'Disponible' | 'En servicio' | 'Inactivo';
  calificacion: number | null;
  trabajos_realizados: number;
  zona_cobertura?: string;
  createdAt?: any;
}

export interface AdminUser {
  id: string;
  uid: string;
  displayName?: string;
  email?: string;
  phone?: string;
  city?: string;
  role?: string;
  status?: string;
  marketingOptIn?: boolean;
  createdAt?: any;
}

export interface AdminOrder {
  id: string;
  numero_pedido?: string;
  orderNumber?: string;
  consecutiveId?: string;
  codigo_seguimiento?: string;
  cliente?: {
    nombre?: string;
    telefono?: string;
    correo?: string;
  };
  servicio_probable?: {
    id?: string;
    service_name?: string;
    category?: string;
    price?: number;
    embedded_material_usd?: number;
    diagnostic_required?: boolean;
  };
  total_facturado?: number;
  precio_regular?: number;
  cotizacion?: number;
  costo_materiales?: number;
  comision_fixit?: number;
  costo_tecnico?: number;
  visitOutcome?: VisitOutcome;
  estado_pago?: string;
  estado?: string;
  tecnico_id?: string;
  tecnico_asignado?: string;
  tecnico_nombre?: string;
  direccion?: string;
  fecha?: string;
  notas_internas?: string;
  origen?: string;
  createdAt?: any;
}

interface AdminDashboardViewProps {
  authState: AuthState;
  onGoHome: () => void;
  onOpenFixerView?: () => void;
}

export const DEFAULT_INITIAL_FIXERS: AdminFixer[] = [
  {
    id: 'FIXER-PTY-001',
    nombre: 'Carlos Mendoza',
    especialidad: 'Plomería',
    telefono: '6234-5678',
    correo: 'carlos.mendoza@fixit.com.pa',
    disponibilidad: 'Disponible',
    calificacion: 4.9,
    trabajos_realizados: 38,
    zona_cobertura: 'San Francisco, Bella Vista, Obarrio',
  },
  {
    id: 'FIXER-PTY-002',
    nombre: 'Alejandro Vargas',
    especialidad: 'Electricidad',
    telefono: '6345-6789',
    correo: 'alejandro.vargas@fixit.com.pa',
    disponibilidad: 'En servicio',
    calificacion: 5.0,
    trabajos_realizados: 52,
    zona_cobertura: 'Costa del Este, Santa María, Paitilla',
  },
  {
    id: 'FIXER-PTY-003',
    nombre: 'Roberto Samaniego',
    especialidad: 'Reparaciones del hogar',
    telefono: '6456-7890',
    correo: 'roberto.samaniego@fixit.com.pa',
    disponibilidad: 'Disponible',
    calificacion: 4.8,
    trabajos_realizados: 29,
    zona_cobertura: 'Betania, El Dorado, Condado del Rey',
  },
  {
    id: 'FIXER-PTY-004',
    nombre: 'Eduardo De León',
    especialidad: 'Pintura residencial',
    telefono: '6567-8901',
    correo: 'eduardo.deleon@fixit.com.pa',
    disponibilidad: 'Disponible',
    calificacion: 4.9,
    trabajos_realizados: 44,
    zona_cobertura: 'Clayton, Albrook, Casco Antiguo',
  },
];

const ORDER_STATUS_OPTIONS: { value: OfficialRequestStatus; label: string }[] = [
  { value: 'ASIGNADA', label: 'Asignada' },
  { value: 'PROGRAMADA', label: 'Programada' },
  { value: 'EN_PROCESO', label: 'En proceso' },
  { value: 'COMPLETADA', label: 'Completada' },
  { value: 'CANCELADA', label: 'Cancelada' },
];

const PAYMENT_METHOD_OPTIONS: PaymentMethod[] = [
  'Yappy',
  'Transferencia ACH',
  'Efectivo',
  'Tarjeta / Terminal',
  'MiPOS BAC',
  'Pago en línea',
  'Pendiente',
];

function getPaymentMonthPrefix(fecha?: string | null): string {
  if (!fecha || typeof fecha !== 'string') return '';
  const trimmed = fecha.trim();
  if (/^\d{4}-\d{2}/.test(trimmed)) {
    return trimmed.slice(0, 7);
  }
  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashMatch) {
    return `${slashMatch[3]}-${slashMatch[2].padStart(2, '0')}`;
  }
  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 7);
  }
  return trimmed.slice(0, 7);
}

function getCurrentMonthPrefix(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getOrderMonthPrefix(ord?: { fecha?: string | null; createdAt?: any } | null): string {
  if (!ord) return '';
  const fromFecha = getPaymentMonthPrefix(ord.fecha);
  if (fromFecha) return fromFecha;
  if (ord.createdAt) {
    if (typeof ord.createdAt === 'string') {
      return getPaymentMonthPrefix(ord.createdAt);
    }
    if (typeof ord.createdAt.toDate === 'function') {
      try {
        return ord.createdAt.toDate().toISOString().slice(0, 7);
      } catch {}
    }
  }
  return '';
}

export function getFixerShareText(f: AdminFixer): string {
  const lines: string[] = ['🔧 *Técnico FIXIT*'];

  const cleanNombre = (f.nombre || '').trim();
  if (cleanNombre && cleanNombre.toUpperCase() !== 'N/A') {
    lines.push(`👤 *${cleanNombre}*`);
  }

  const cleanEsp = (f.especialidad || '').trim();
  if (cleanEsp && cleanEsp.toUpperCase() !== 'N/A') {
    lines.push(`🛠️ ${cleanEsp}`);
  }

  const cleanTel = (f.telefono || '').trim();
  if (cleanTel && cleanTel.toUpperCase() !== 'N/A') {
    lines.push(`📱 ${cleanTel}`);
  }

  const cleanCedula = (f.cedula || '').trim();
  if (cleanCedula && cleanCedula.toUpperCase() !== 'N/A') {
    lines.push(`🪪 Cédula: ${cleanCedula}`);
  }

  const cleanIdonTipo = (f.idoneidad_tipo || '').trim();
  const cleanIdonNum = (f.idoneidad_numero || '').trim();
  if (
    cleanIdonTipo &&
    cleanIdonTipo.toLowerCase() !== 'ninguna' &&
    cleanIdonTipo.toUpperCase() !== 'N/A'
  ) {
    lines.push(
      cleanIdonNum && cleanIdonNum.toUpperCase() !== 'N/A'
        ? `🏅 Idoneidad: ${cleanIdonTipo} ${cleanIdonNum}`
        : `🏅 Idoneidad: ${cleanIdonTipo}`
    );
  }

  if (typeof f.calificacion === 'number' && f.calificacion > 0) {
    const trabajos = typeof f.trabajos_realizados === 'number' ? f.trabajos_realizados : 0;
    lines.push(`⭐ ${f.calificacion.toFixed(1)} · ${trabajos} trabajos`);
  }

  const cleanZona = (f.zona_cobertura || '').trim();
  if (cleanZona && cleanZona.toUpperCase() !== 'N/A') {
    lines.push(`📍 Zona: ${cleanZona}`);
  }

  lines.push('✅ Verificado por FIXIT Panamá');
  return lines.join('\n');
}

export function getFixerShareLink(f: AdminFixer, targetPhone?: string): string {
  const text = getFixerShareText(f);
  const encodedText = encodeURIComponent(text);
  if (targetPhone) {
    let clean = targetPhone.replace(/\D/g, '');
    if (clean.length === 8 && !clean.startsWith('507')) {
      clean = `507${clean}`;
    } else if (clean.length > 0 && !clean.startsWith('507') && clean.length < 10) {
      clean = `507${clean}`;
    }
    if (clean) {
      return `https://wa.me/${clean}?text=${encodedText}`;
    }
  }
  return `https://wa.me/?text=${encodedText}`;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  authState,
  onGoHome,
  onOpenFixerView,
}) => {
  const user = authState.user;
  const isAdmin = Boolean(user?.isAdmin || user?.role === 'ADMIN');
  const isOperator = user?.role === 'OPERATOR';
  const hasAdminOrOperatorAccess = isAdmin || isOperator;

  useEffect(() => {
    if (!authState.loading && !hasAdminOrOperatorAccess) {
      onGoHome();
    }
  }, [authState.loading, hasAdminOrOperatorAccess, onGoHome]);

  // Tab State: [Resumen y KPIs] | [Pagos e Ingresos] | [Cotizaciones] | [Pedidos] | [Clientes] | [Fixers] | [Agenda]
  const [activeTab, setActiveTab] = useState<
    'kpis' | 'payments' | 'quotes' | 'orders' | 'clients' | 'fixers' | 'agenda'
  >('kpis');

  const [fixerViewMode, setFixerViewMode] = useState<'cards' | 'table'>('cards');

  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [clients, setClients] = useState<AdminUser[]>([]);
  const [fixers, setFixers] = useState<AdminFixer[]>([]);
  const [quotes, setQuotes] = useState<ManagedQuote[]>([]);
  const [payments, setPayments] = useState<ManagedPayment[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingClients, setLoadingClients] = useState(true);
  const [loadingFixers, setLoadingFixers] = useState(true);
  const [loadingQuotes, setLoadingQuotes] = useState(true);
  const [loadingPayments, setLoadingPayments] = useState(true);

  const [clientSearch, setClientSearch] = useState('');
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [fixerFilter, setFixerFilter] = useState('all');
  const [quoteSearch, setQuoteSearch] = useState('');
  const [quoteStatusFilter, setQuoteStatusFilter] = useState('all');

  // === ESTADOS PARA PAGOS E INGRESOS REALES ===
  const [paymentMonthFilter, setPaymentMonthFilter] = useState<string>(() => getCurrentMonthPrefix());
  const [paymentSearch, setPaymentSearch] = useState('');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<ManagedPayment | null>(null);
  const [paymentOrderId, setPaymentOrderId] = useState('');
  const [paymentOrderCode, setPaymentOrderCode] = useState('');
  const [paymentQuoteId, setPaymentQuoteId] = useState('');
  const [paymentClientName, setPaymentClientName] = useState('');
  const [paymentClientUid, setPaymentClientUid] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Yappy');
  const [paymentDate, setPaymentDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [paymentStatus, setPaymentStatus] = useState<'Pendiente' | 'Confirmado'>('Confirmado');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isSavingPayment, setIsSavingPayment] = useState(false);

  const [isAddFixerModalOpen, setIsAddFixerModalOpen] = useState(false);
  const [newFixerName, setNewFixerName] = useState('');
  const [newFixerPhone, setNewFixerPhone] = useState('');
  const [newFixerEmail, setNewFixerEmail] = useState('');
  const [newFixerSpecialty, setNewFixerSpecialty] = useState<string>('Plomería');
  const [newFixerZone, setNewFixerZone] = useState('Ciudad de Panamá');
  const [savingFixer, setSavingFixer] = useState(false);
  const [isSeedingFixers, setIsSeedingFixers] = useState(false);

  const [fixerToDelete, setFixerToDelete] = useState<AdminFixer | null>(null);
  const [isDeletingFixer, setIsDeletingFixer] = useState(false);

  // === ESTADOS PARA ACCESO DE FIXERS Y CÓDIGO DE INVITACIÓN ===
  const [fixerAccessMap, setFixerAccessMap] = useState<Record<string, boolean>>({});
  const [fixerInviteCode, setFixerInviteCode] = useState<string | null>(null);
  const [fixerInviteMeta, setFixerInviteMeta] = useState<{
    updatedBy?: string;
    updatedAt?: string;
  } | null>(null);
  const [isSavingInviteCode, setIsSavingInviteCode] = useState(false);

  // === COMISIÓN FIXIT (settings/fixer_commission, default 0.15 = 15%, piso $3.00) ===
  const [commissionRate, setCommissionRate] = useState<number>(DEFAULT_COMMISSION_RATE);
  const [commissionInputPct, setCommissionInputPct] = useState<string>(
    String(round2(DEFAULT_COMMISSION_RATE * 100))
  );
  const [minStandaloneCommission, setMinStandaloneCommission] = useState<number>(
    DEFAULT_MIN_STANDALONE_COMMISSION_USD
  );
  const [minCommissionInputUsd, setMinCommissionInputUsd] = useState<string>(
    DEFAULT_MIN_STANDALONE_COMMISSION_USD.toFixed(2)
  );
  const [isEditingCommission, setIsEditingCommission] = useState<boolean>(false);
  const [isSavingCommission, setIsSavingCommission] = useState<boolean>(false);
  const [commissionDocExists, setCommissionDocExists] = useState<boolean>(true);
  const [commissionMeta, setCommissionMeta] = useState<{
    updatedBy?: string;
    updatedAt?: string;
  } | null>(null);
  const [updatingVisitOutcomeId, setUpdatingVisitOutcomeId] = useState<string | null>(null);

  // === ALERTA SONORA DE NUEVOS PEDIDOS (ADMIN) ===
  const [adminSoundEnabled, setAdminSoundEnabledState] = useState<boolean>(() => isSoundEnabled());
  const knownAdminOrderIdsRef = useRef<Set<string> | null>(null);

  const handleToggleAdminSound = () => {
    const next = !adminSoundEnabled;
    setSoundEnabled(next);
    setAdminSoundEnabledState(next);
  };

  const [isCreateOrderModalOpen, setIsCreateOrderModalOpen] = useState(false);
  const [manualClientName, setManualClientName] = useState('');
  const [manualClientPhone, setManualClientPhone] = useState('');
  const [manualClientEmail, setManualClientEmail] = useState('');
  const [manualSelectedCatalogId, setManualSelectedCatalogId] = useState(FIXIT_CATALOG[0]?.id || 'custom');
  const [manualServiceName, setManualServiceName] = useState(FIXIT_CATALOG[0]?.service_name || '');
  const [manualCategory, setManualCategory] = useState(FIXIT_CATALOG[0]?.category || 'Reparaciones del hogar');
  const [manualAmount, setManualAmount] = useState(String(FIXIT_CATALOG[0]?.price || 35));
  const [manualApplyPromo, setManualApplyPromo] = useState<boolean>(false);
  const [manualAddress, setManualAddress] = useState('');
  const [manualFixerId, setManualFixerId] = useState('');
  const [manualScheduledDate, setManualScheduledDate] = useState('');
  const [manualInitialStatus, setManualInitialStatus] = useState('Pendiente');
  const [manualNotes, setManualNotes] = useState('');
  const [savingManualOrder, setSavingManualOrder] = useState(false);

  const [orderToManage, setOrderToManage] = useState<AdminOrder | null>(null);
  const [isActionInProgress, setIsActionInProgress] = useState(false);

  const [orderToAssign, setOrderToAssign] = useState<AdminOrder | null>(null);
  const [assignFixerId, setAssignFixerId] = useState('');
  const [assignScheduledDate, setAssignScheduledDate] = useState('');
  const [assignNotes, setAssignNotes] = useState('');
  const [assignFilterSpecialty, setAssignFilterSpecialty] = useState('all');
  const [assignFilterZone, setAssignFilterZone] = useState('');
  const [assignFilterAvailability, setAssignFilterAvailability] = useState('all');
  const [isAssigning, setIsAssigning] = useState(false);


  const [toast, setToast] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  // === NUEVOS ESTADOS PARA AGENDA MAESTRA ===
  const [agendaDate, setAgendaDate] = useState<string>('');
  const [agendaTime, setAgendaTime] = useState<string>('08:00 AM');
  const [agendaClientInfo, setAgendaClientInfo] = useState<string>('');
  const [isSavingAppointment, setIsSavingAppointment] = useState(false);
  const [appointmentsList, setAppointmentsList] = useState<any[]>([]);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  useEffect(() => {
    let unsubRequests: (() => void) | null = null;
    try {
      const q = query(collection(db, 'requests'), orderBy('fecha', 'desc'));
      unsubRequests = onSnapshot(q, (snapshot) => {
        const fetched: AdminOrder[] = [];
        snapshot.forEach((d) => {
          fetched.push({ id: d.id, ...d.data() });
        });
        setOrders(fetched);
        setLoadingOrders(false);
      }, (err) => {
        console.warn('[Admin] Error en listener de requests, usando orders:', err);
        const qOrders = collection(db, 'orders');
        onSnapshot(qOrders, (snap) => {
          const ords: AdminOrder[] = [];
          snap.forEach((d) => ords.push({ id: d.id, ...d.data() }));
          setOrders(ords);
          setLoadingOrders(false);
        }, () => setLoadingOrders(false));
      });
    } catch {
      setLoadingOrders(false);
    }

    return () => {
      if (unsubRequests) unsubRequests();
    };
  }, []);

  // Detectar NUEVOS pedidos en estado NUEVA (sin sonar en carga inicial ni por ediciones posteriores)
  useEffect(() => {
    if (loadingOrders) return;

    if (knownAdminOrderIdsRef.current === null) {
      knownAdminOrderIdsRef.current = new Set(orders.map((o) => o.id));
      return;
    }

    let hasNewIncomingOrder = false;
    for (const ord of orders) {
      if (!knownAdminOrderIdsRef.current.has(ord.id)) {
        knownAdminOrderIdsRef.current.add(ord.id);
        if (normalizeStatus(ord.estado) === 'NUEVA') {
          hasNewIncomingOrder = true;
        }
      }
    }

    if (hasNewIncomingOrder) {
      playNewOrderSound('admin');
    }
  }, [orders, loadingOrders]);

  useEffect(() => {
    let unsubUsers: (() => void) | null = null;
    try {
      const q = collection(db, 'users');
      unsubUsers = onSnapshot(q, (snapshot) => {
        const fetched: AdminUser[] = [];
        snapshot.forEach((d) => {
          const data = d.data();
          const role = (data.role || '').toLowerCase();
          if (role === 'customer' || role === 'client' || !role) {
            fetched.push({ id: d.id, uid: data.uid || d.id, ...data });
          }
        });
        fetched.sort((a, b) => {
          const tA = a.createdAt?.toMillis?.() || (a.createdAt ? new Date(a.createdAt).getTime() : 0);
          const tB = b.createdAt?.toMillis?.() || (b.createdAt ? new Date(b.createdAt).getTime() : 0);
          return tB - tA;
        });
        setClients(fetched);
        setLoadingClients(false);
      }, (err) => {
        console.warn('[Admin] Error en listener de users:', err);
        setLoadingClients(false);
      });
    } catch {
      setLoadingClients(false);
    }

    return () => {
      if (unsubUsers) unsubUsers();
    };
  }, []);

  useEffect(() => {
    let unsubFixers: (() => void) | null = null;
    try {
      const q = collection(db, 'fixers');
      unsubFixers = onSnapshot(q, (snapshot) => {
        const fetched: AdminFixer[] = [];
        snapshot.forEach((d) => {
          const data = d.data();
          fetched.push({
            id: d.id,
            uid: data.uid || d.id,
            nombre: data.nombre || data.displayName || 'Fixer FIXIT',
            especialidad: data.especialidad || 'Reparaciones del hogar',
            telefono: data.telefono || data.phone || '',
            correo: data.correo || data.email,
            cedula: data.cedula || '',
            idoneidad_tipo: data.idoneidad_tipo || '',
            idoneidad_numero: data.idoneidad_numero || '',
            photoURL: data.photoURL || '',
            disponibilidad: data.disponibilidad || (data.activo === false ? 'Inactivo' : 'Disponible'),
            calificacion: typeof data.calificacion === 'number' ? data.calificacion : null,
            trabajos_realizados: data.trabajos_realizados || data.servicios_completados || 0,
            zona_cobertura: data.zona_cobertura || 'Ciudad de Panamá',
            createdAt: data.createdAt,
          });
        });

        if (fetched.length === 0) {
          const qTechs = collection(db, 'technicians');
          onSnapshot(qTechs, (tSnap) => {
            const tFetched: AdminFixer[] = [];
            tSnap.forEach((td) => {
              const tData = td.data();
              tFetched.push({
                id: td.id,
                uid: tData.uid || td.id,
                nombre: tData.nombre || 'Técnico FIXIT',
                especialidad: tData.especialidad || 'Reparaciones del hogar',
                telefono: tData.telefono || '',
                correo: tData.correo,
                cedula: tData.cedula || '',
                idoneidad_tipo: tData.idoneidad_tipo || '',
                idoneidad_numero: tData.idoneidad_numero || '',
                photoURL: tData.photoURL || '',
                disponibilidad: tData.activo === false ? 'Inactivo' : 'Disponible',
                calificacion: typeof tData.calificacion === 'number' ? tData.calificacion : null,
                trabajos_realizados: tData.servicios_completados || 0,
                zona_cobertura: tData.zona_cobertura || 'Ciudad de Panamá',
              });
            });
            setFixers(tFetched.length > 0 ? tFetched : DEFAULT_INITIAL_FIXERS);
            setLoadingFixers(false);
          }, () => {
            setFixers(DEFAULT_INITIAL_FIXERS);
            setLoadingFixers(false);
          });
        } else {
          setFixers(fetched);
          setLoadingFixers(false);
        }
      }, () => {
        setFixers(DEFAULT_INITIAL_FIXERS);
        setLoadingFixers(false);
      });
    } catch {
      setFixers(DEFAULT_INITIAL_FIXERS);
      setLoadingFixers(false);
    }

    return () => {
      if (unsubFixers) unsubFixers();
    };
  }, []);

  // Verificar acceso al app por cada fixer (existe users/{fixer.id}), cacheado en estado
  useEffect(() => {
    let cancelled = false;
    const uncachedIds = fixers
      .map((f) => f.id)
      .filter((id) => id && fixerAccessMap[id] === undefined);

    if (uncachedIds.length === 0) return;

    Promise.all(
      uncachedIds.map(async (id) => {
        try {
          const snap = await getDoc(doc(db, 'users', id));
          return [id, snap.exists()] as const;
        } catch {
          return [id, false] as const;
        }
      })
    ).then((entries) => {
      if (cancelled) return;
      setFixerAccessMap((prev) => {
        const next = { ...prev };
        for (const [id, exists] of entries) {
          next[id] = exists;
        }
        return next;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [fixers, fixerAccessMap]);

  // Cargar código de invitación actual desde settings/fixer_invite (solo ADMIN)
  useEffect(() => {
    if (!isAdmin) return;
    let unsubInvite: (() => void) | null = null;
    try {
      const inviteDocRef = doc(db, 'settings', 'fixer_invite');
      unsubInvite = onSnapshot(
        inviteDocRef,
        (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            setFixerInviteCode(data.code || null);
            setFixerInviteMeta({
              updatedBy: data.updatedBy,
              updatedAt: data.updatedAt,
            });
          } else {
            setFixerInviteCode(null);
            setFixerInviteMeta(null);
          }
        },
        async () => {
          try {
            const snap = await getDoc(inviteDocRef);
            if (snap.exists()) {
              const data = snap.data();
              setFixerInviteCode(data.code || null);
              setFixerInviteMeta({
                updatedBy: data.updatedBy,
                updatedAt: data.updatedAt,
              });
            }
          } catch {}
        }
      );
    } catch {}

    return () => {
      if (unsubInvite) unsubInvite();
    };
  }, [isAdmin]);

  // Cargar tasa de comisión y piso de comisión mínima desde settings/fixer_commission
  useEffect(() => {
    if (!hasAdminOrOperatorAccess) return;
    let unsubCommission: (() => void) | null = null;
    const commissionDocRef = doc(db, 'settings', 'fixer_commission');

    const applySnap = (exists: boolean, data?: Record<string, any>) => {
      if (exists && data) {
        const rate =
          typeof data.rate === 'number' && Number.isFinite(data.rate)
            ? normalizeRate(data.rate)
            : DEFAULT_COMMISSION_RATE;
        const minComm = normalizeMinStandaloneCommission(data.min_standalone_commission_usd);
        setCommissionRate(rate);
        setCommissionInputPct(String(round2(rate * 100)));
        setMinStandaloneCommission(minComm);
        setMinCommissionInputUsd(minComm.toFixed(2));
        setCommissionDocExists(true);
        setCommissionMeta({
          updatedBy: data.updatedBy,
          updatedAt: data.updatedAt,
        });
      } else {
        setCommissionRate(DEFAULT_COMMISSION_RATE);
        setCommissionInputPct(String(round2(DEFAULT_COMMISSION_RATE * 100)));
        setMinStandaloneCommission(DEFAULT_MIN_STANDALONE_COMMISSION_USD);
        setMinCommissionInputUsd(DEFAULT_MIN_STANDALONE_COMMISSION_USD.toFixed(2));
        setCommissionDocExists(false);
        setCommissionMeta(null);
      }
    };

    try {
      unsubCommission = onSnapshot(
        commissionDocRef,
        (snap) => {
          applySnap(snap.exists(), snap.data());
        },
        async () => {
          try {
            const snap = await getDoc(commissionDocRef);
            applySnap(snap.exists(), snap.data());
          } catch {
            applySnap(false);
          }
        }
      );
    } catch {
      getDoc(commissionDocRef)
        .then((snap) => applySnap(snap.exists(), snap.data()))
        .catch(() => applySnap(false));
    }

    return () => {
      if (unsubCommission) unsubCommission();
    };
  }, [hasAdminOrOperatorAccess]);

  // Cargar Citas Agendadas
  useEffect(() => {
    if (activeTab !== 'agenda') return;
    
    let unsubAgenda: (() => void) | null = null;
    try {
      const q = query(collection(db, 'appointments'), orderBy('date', 'desc'));
      unsubAgenda = onSnapshot(q, (snapshot) => {
        const fetched: any[] = [];
        snapshot.forEach((d) => {
          fetched.push({ id: d.id, ...d.data() });
        });
        setAppointmentsList(fetched);
      }, (err) => {
        console.warn('[Admin] Error en listener de appointments:', err);
      });
    } catch (err) {
      console.warn("Aviso cargando agenda:", err);
    }
    
    return () => {
      if (unsubAgenda) unsubAgenda();
    };
  }, [activeTab]);

  // Cargar Cotizaciones Emitidas (tiempo real + fallback a caché)
  useEffect(() => {
    let unsubQuotes: (() => void) | null = null;
    try {
      const qQuotes = query(collection(db, 'quotes'), orderBy('fecha_creacion', 'desc'));
      unsubQuotes = onSnapshot(
        qQuotes,
        (snapshot) => {
          const fetched: ManagedQuote[] = [];
          snapshot.forEach((d) => {
            fetched.push({ ...(d.data() as ManagedQuote), id: d.id });
          });
          setQuotes(fetched);
          setLoadingQuotes(false);
        },
        async (err) => {
          console.warn('[Admin] Error en listener de quotes, usando fallback:', err);
          const fallbackQuotes = await getQuotesFromFirestore();
          setQuotes(fallbackQuotes);
          setLoadingQuotes(false);
        }
      );
    } catch {
      getQuotesFromFirestore()
        .then((list) => setQuotes(list))
        .finally(() => setLoadingQuotes(false));
    }

    return () => {
      if (unsubQuotes) unsubQuotes();
    };
  }, []);

  // Cargar Pagos Registrados (tiempo real + fallback a caché)
  useEffect(() => {
    let unsubPayments: (() => void) | null = null;
    try {
      const qPayments = query(collection(db, 'payments'), orderBy('fecha', 'desc'));
      unsubPayments = onSnapshot(
        qPayments,
        (snapshot) => {
          const fetched: ManagedPayment[] = [];
          snapshot.forEach((d) => {
            fetched.push({ ...(d.data() as ManagedPayment), id: d.id });
          });
          setPayments(fetched);
          setLoadingPayments(false);
        },
        async (err) => {
          console.warn('[Admin] Error en listener de payments, usando fallback:', err);
          const fallbackPayments = await getPaymentsFromFirestore();
          setPayments(fallbackPayments);
          setLoadingPayments(false);
        }
      );
    } catch {
      getPaymentsFromFirestore()
        .then((list) => setPayments(list))
        .finally(() => setLoadingPayments(false));
    }

    return () => {
      if (unsubPayments) unsubPayments();
    };
  }, []);

  const totalOrdersCount = orders.length;

  const totalOrdersRevenue = useMemo(() => {
    return orders.reduce((sum, ord) => {
      const estado = (ord.estado || '').toLowerCase();
      if (!estado.includes('cancel')) {
        const val = ord.total_facturado ?? ord.precio_regular ?? ord.servicio_probable?.price ?? 0;
        return sum + (typeof val === 'number' ? val : parseFloat(val) || 0);
      }
      return sum;
    }, 0);
  }, [orders]);

  const totalQuotedRevenue = useMemo(() => {
    return quotes.reduce((sum, q) => {
      const st = String(q.estado || '').toLowerCase();
      if (!st.includes('rechaz')) {
        return sum + (Number(q.total) || 0);
      }
      return sum;
    }, 0);
  }, [quotes]);

  const totalApprovedQuotesRevenue = useMemo(() => {
    return quotes.reduce((sum, q) => {
      const st = String(q.estado || '').toLowerCase();
      if (st.includes('aprobad')) {
        return sum + (Number(q.total) || 0);
      }
      return sum;
    }, 0);
  }, [quotes]);

  const totalRevenue = totalOrdersRevenue;

  const quotesByFixer = useMemo(() => {
    const map = new Map<
      string,
      { nombre: string; count: number; totalUsd: number; anticiposUsd: number; approvedUsd: number }
    >();
    quotes.forEach((q) => {
      const st = String(q.estado || '').toLowerCase();
      if (st.includes('rechaz')) return;
      const key = q.tecnico_nombre || q.creado_por || 'Fixer FIXIT';
      const current = map.get(key) || {
        nombre: key,
        count: 0,
        totalUsd: 0,
        anticiposUsd: 0,
        approvedUsd: 0,
      };
      const tot = Number(q.total) || 0;
      current.count += 1;
      current.totalUsd += tot;
      current.anticiposUsd += Number(q.anticipo) || tot * 0.5;
      if (st.includes('aprobad')) {
        current.approvedUsd += tot;
      }
      map.set(key, current);
    });
    return Array.from(map.values()).sort((a, b) => b.totalUsd - a.totalUsd);
  }, [quotes]);

  const filteredQuotes = useMemo(() => {
    return quotes.filter((q) => {
      if (quoteStatusFilter !== 'all') {
        const st = String(q.estado || '').toLowerCase();
        if (!st.includes(quoteStatusFilter.toLowerCase())) return false;
      }
      if (quoteSearch.trim()) {
        const term = quoteSearch.toLowerCase();
        const folio = (q.numero_cotizacion || q.codigo_cotizacion || q.id || '').toLowerCase();
        const client = (q.cliente_nombre || '').toLowerCase();
        const svc = (q.servicio_nombre || '').toLowerCase();
        const fixer = (q.tecnico_nombre || q.creado_por || '').toLowerCase();
        return folio.includes(term) || client.includes(term) || svc.includes(term) || fixer.includes(term);
      }
      return true;
    });
  }, [quotes, quoteStatusFilter, quoteSearch]);

  const handleUpdateQuoteStatus = async (quote: ManagedQuote, nextStatus: QuoteStatus) => {
    try {
      const authorName = user?.displayName || user?.nombre || user?.email || 'Admin FIXIT';
      await updateQuoteInFirestore(
        quote.id,
        {
          estado: nextStatus,
          aprobacion: {
            estado:
              nextStatus === 'Aprobada'
                ? 'aprobada'
                : nextStatus === 'Rechazada'
                ? 'rechazada'
                : 'pendiente',
            fecha: new Date().toISOString(),
            validado_por: authorName,
          },
        },
        authorName
      );
      setQuotes((prev) =>
        prev.map((q) => (q.id === quote.id ? { ...q, estado: nextStatus } : q))
      );
      showToast(`Cotización ${quote.numero_cotizacion} marcada como ${nextStatus}.`, 'info');
    } catch (err: any) {
      showToast(`Error actualizando cotización: ${err?.message || 'Error'}`, 'error');
    }
  };

  const handleDeleteQuote = async (quote: ManagedQuote) => {
    if (!isAdmin) return;
    const folio = quote.numero_cotizacion || quote.id;
    const confirmed =
      typeof window !== 'undefined' && typeof window.confirm === 'function'
        ? window.confirm(
            `¿Eliminar definitivamente la cotización ${folio} (${quote.cliente_nombre || 'Consumidor Final'})? Esta acción quedará registrada en auditoría.`
          )
        : true;
    if (!confirmed) return;

    try {
      const authorName = user?.displayName || user?.nombre || user?.email || 'Admin FIXIT';
      await deleteQuoteInFirestore(quote.id, authorName);
      setQuotes((prev) => prev.filter((q) => q.id !== quote.id));
      showToast(`Cotización ${folio} eliminada correctamente.`, 'success');
    } catch (err: any) {
      showToast(`Error eliminando cotización: ${err?.message || 'Error'}`, 'error');
    }
  };

  // === MÉTRICAS Y OPERACIONES DE PAGOS E INGRESOS REALES ===
  const currentMonthPrefix = useMemo(() => getCurrentMonthPrefix(), []);

  const confirmedCurrentMonthRevenue = useMemo(() => {
    return payments.reduce((sum, p) => {
      const st = String(p.estado || '').toLowerCase();
      const month = getPaymentMonthPrefix(p.fecha);
      if (st === 'confirmado' && month === currentMonthPrefix) {
        return sum + (Number(p.monto) || 0);
      }
      return sum;
    }, 0);
  }, [payments, currentMonthPrefix]);

  const confirmedCurrentMonthCount = useMemo(() => {
    return payments.filter(
      (p) =>
        String(p.estado || '').toLowerCase() === 'confirmado' &&
        getPaymentMonthPrefix(p.fecha) === currentMonthPrefix
    ).length;
  }, [payments, currentMonthPrefix]);

  // === MÉTRICAS DE COMISIÓN FIXIT (DEVENGADAS VS COBRADAS Y POR FIXER) ===
  const accruedCurrentMonthOrders = useMemo(() => {
    return orders.filter((ord) => {
      const estado = String(ord.estado || '').toLowerCase();
      if (estado.includes('cancel')) return false;
      const month = getOrderMonthPrefix(ord) || currentMonthPrefix;
      return month === currentMonthPrefix;
    });
  }, [orders, currentMonthPrefix]);

  const accruedCurrentMonthCommissions = useMemo(() => {
    const sum = accruedCurrentMonthOrders.reduce((acc, ord) => {
      const bd = calcCommissionBreakdown(ord, commissionRate);
      return acc + bd.comision_fixit;
    }, 0);
    return round2(sum);
  }, [accruedCurrentMonthOrders, commissionRate]);

  const collectedCurrentMonthCommissions = useMemo(() => {
    return calcCommission(confirmedCurrentMonthRevenue, commissionRate);
  }, [confirmedCurrentMonthRevenue, commissionRate]);

  const fixerCommissionBreakdown = useMemo(() => {
    type Triple = { facturado: number; comisiones: number; neto: number; count: number };
    type FixerRow = {
      key: string;
      fixerId?: string;
      nombre: string;
      especialidad?: string;
      mes: Triple;
      historico: Triple;
    };

    const map = new Map<string, FixerRow>();

    // Inicializar con los fixers registrados para que todos aparezcan en el directorio
    fixers.forEach((f) => {
      const key = f.id || f.nombre;
      map.set(key, {
        key,
        fixerId: f.id,
        nombre: f.nombre || 'Fixer FIXIT',
        especialidad: f.especialidad,
        mes: { facturado: 0, comisiones: 0, neto: 0, count: 0 },
        historico: { facturado: 0, comisiones: 0, neto: 0, count: 0 },
      });
    });

    const resolveKeyForOrder = (ord: AdminOrder): { key: string; nombre: string } | null => {
      if (ord.tecnico_id && map.has(ord.tecnico_id)) {
        return { key: ord.tecnico_id, nombre: map.get(ord.tecnico_id)!.nombre };
      }
      const rawName = (ord.tecnico_nombre || ord.tecnico_asignado || '').trim();
      if (rawName) {
        const matched = fixers.find(
          (f) => f.id === rawName || f.nombre.trim().toLowerCase() === rawName.toLowerCase()
        );
        if (matched) {
          const k = matched.id || matched.nombre;
          return { key: k, nombre: matched.nombre };
        }
        return { key: rawName, nombre: rawName };
      }
      if (ord.tecnico_id) {
        return { key: ord.tecnico_id, nombre: ord.tecnico_id };
      }
      return null;
    };

    orders.forEach((ord) => {
      const estado = String(ord.estado || '').toLowerCase();
      if (estado.includes('cancel')) return;
      const target = resolveKeyForOrder(ord);
      if (!target) return;

      const existing = map.get(target.key) || {
        key: target.key,
        nombre: target.nombre,
        mes: { facturado: 0, comisiones: 0, neto: 0, count: 0 },
        historico: { facturado: 0, comisiones: 0, neto: 0, count: 0 },
      };

      const bd = calcCommissionBreakdown(ord, commissionRate);
      const billed = round2(
        Number(ord.total_facturado ?? ord.precio_regular ?? bd.base + bd.materiales_reembolso) || 0
      );
      const com = bd.comision_fixit;
      const net = bd.costo_tecnico;

      existing.historico.facturado = round2(existing.historico.facturado + billed);
      existing.historico.comisiones = round2(existing.historico.comisiones + com);
      existing.historico.neto = round2(existing.historico.neto + net);
      existing.historico.count += 1;

      const ordMonth = getOrderMonthPrefix(ord) || currentMonthPrefix;
      if (ordMonth === currentMonthPrefix) {
        existing.mes.facturado = round2(existing.mes.facturado + billed);
        existing.mes.comisiones = round2(existing.mes.comisiones + com);
        existing.mes.neto = round2(existing.mes.neto + net);
        existing.mes.count += 1;
      }

      map.set(target.key, existing);
    });

    return Array.from(map.values()).sort(
      (a, b) => b.historico.facturado - a.historico.facturado || a.nombre.localeCompare(b.nombre)
    );
  }, [fixers, orders, commissionRate, currentMonthPrefix]);

  const monthlyPaymentsSummary = useMemo(() => {
    let confirmedSum = 0;
    let confirmedCount = 0;
    let pendingSum = 0;
    let pendingCount = 0;

    payments.forEach((p) => {
      const month = getPaymentMonthPrefix(p.fecha);
      if (paymentMonthFilter && month !== paymentMonthFilter) return;
      const st = String(p.estado || '').toLowerCase();
      const monto = Number(p.monto) || 0;
      if (st === 'confirmado') {
        confirmedSum += monto;
        confirmedCount += 1;
      } else if (st === 'pendiente') {
        pendingSum += monto;
        pendingCount += 1;
      }
    });

    return { confirmedSum, confirmedCount, pendingSum, pendingCount };
  }, [payments, paymentMonthFilter]);

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      if (paymentMonthFilter) {
        const month = getPaymentMonthPrefix(p.fecha);
        if (month !== paymentMonthFilter) return false;
      }
      if (paymentSearch.trim()) {
        const term = paymentSearch.toLowerCase();
        const code = (p.solicitud_codigo || p.solicitud_id || '').toLowerCase();
        const quoteCode = (p.cotizacion_codigo || p.cotizacion_id || '').toLowerCase();
        const client = (p.cliente_nombre || '').toLowerCase();
        const ref = (p.referencia || p.referencia_transaccion || '').toLowerCase();
        const method = (p.metodo || '').toLowerCase();
        return (
          code.includes(term) ||
          quoteCode.includes(term) ||
          client.includes(term) ||
          ref.includes(term) ||
          method.includes(term)
        );
      }
      return true;
    });
  }, [payments, paymentMonthFilter, paymentSearch]);

  const getConfirmedPaidForOrder = (orderId?: string, orderCode?: string, quoteId?: string): number => {
    return payments.reduce((sum, p) => {
      const st = String(p.estado || '').toLowerCase();
      if (st !== 'confirmado') return sum;
      const matchOrder =
        (orderId && p.solicitud_id === orderId) ||
        (orderCode && p.solicitud_codigo === orderCode);
      const matchQuote = quoteId && (p.cotizacion_id === quoteId || p.cotizacion_codigo === quoteId);
      if (matchOrder || matchQuote) {
        return sum + (Number(p.monto) || 0);
      }
      return sum;
    }, 0);
  };

  const openNewPaymentModal = (prefill?: {
    order?: AdminOrder;
    quote?: ManagedQuote;
  }) => {
    setEditingPayment(null);
    const today = new Date().toISOString().slice(0, 10);

    if (prefill?.quote) {
      const q = prefill.quote;
      const linkedOrd = orders.find(
        (o) =>
          o.id === q.solicitud_id ||
          (q.solicitud_codigo &&
            (o.numero_pedido === q.solicitud_codigo ||
              o.codigo_seguimiento === q.solicitud_codigo))
      );
      const ordCode =
        q.solicitud_codigo ||
        linkedOrd?.numero_pedido ||
        linkedOrd?.codigo_seguimiento ||
        q.solicitud_id ||
        '';
      const alreadyPaid = getConfirmedPaidForOrder(
        linkedOrd?.id || q.solicitud_id,
        ordCode,
        q.numero_cotizacion || q.id
      );
      const quoteTotal = Number(q.total) || 0;
      const pendingAmount = Math.max(0, Number((quoteTotal - alreadyPaid).toFixed(2)));

      setPaymentOrderId(linkedOrd?.id || q.solicitud_id || '');
      setPaymentOrderCode(ordCode);
      setPaymentQuoteId(q.numero_cotizacion || q.id);
      setPaymentClientName(q.cliente_nombre || linkedOrd?.cliente?.nombre || '');
      setPaymentClientUid(
        q.cliente_uid ||
          (linkedOrd as any)?.creado_por_uid ||
          (linkedOrd?.cliente as any)?.id ||
          ''
      );
      setPaymentAmount(String(pendingAmount > 0 ? pendingAmount : quoteTotal || 35));
      setPaymentMethod('Yappy');
      setPaymentDate(today);
      setPaymentStatus('Confirmado');
      setPaymentReference('');
      setPaymentNotes(`Pago asociado a cotización ${q.numero_cotizacion || q.id}`);
      setIsPaymentModalOpen(true);
      return;
    }

    if (prefill?.order) {
      const ord = prefill.order;
      const ordCode =
        ord.numero_pedido ||
        ord.consecutiveId ||
        ord.orderNumber ||
        ord.codigo_seguimiento ||
        ord.id;
      const linkedQuote = quotes.find(
        (q) => q.solicitud_id === ord.id || (ordCode && q.solicitud_codigo === ordCode)
      );
      const orderTotal =
        Number(ord.total_facturado ?? ord.precio_regular ?? ord.servicio_probable?.price ?? 35) ||
        35;
      const alreadyPaid = getConfirmedPaidForOrder(ord.id, ordCode, linkedQuote?.id);
      const pendingAmount = Math.max(0, Number((orderTotal - alreadyPaid).toFixed(2)));

      setPaymentOrderId(ord.id);
      setPaymentOrderCode(ordCode);
      setPaymentQuoteId(linkedQuote?.numero_cotizacion || linkedQuote?.id || '');
      setPaymentClientName(ord.cliente?.nombre || '');
      setPaymentClientUid((ord as any).creado_por_uid || (ord.cliente as any)?.id || '');
      setPaymentAmount(String(pendingAmount > 0 ? pendingAmount : orderTotal));
      setPaymentMethod('Yappy');
      setPaymentDate(today);
      setPaymentStatus('Confirmado');
      setPaymentReference('');
      setPaymentNotes('');
      setIsPaymentModalOpen(true);
      return;
    }

    setPaymentOrderId('');
    setPaymentOrderCode('');
    setPaymentQuoteId('');
    setPaymentClientName('');
    setPaymentClientUid('');
    setPaymentAmount('');
    setPaymentMethod('Yappy');
    setPaymentDate(today);
    setPaymentStatus('Confirmado');
    setPaymentReference('');
    setPaymentNotes('');
    setIsPaymentModalOpen(true);
  };

  const openEditPaymentModal = (payment: ManagedPayment) => {
    setEditingPayment(payment);
    setPaymentOrderId(payment.solicitud_id || '');
    setPaymentOrderCode(payment.solicitud_codigo || payment.solicitud_id || '');
    setPaymentQuoteId(payment.cotizacion_codigo || payment.cotizacion_id || '');
    setPaymentClientName(payment.cliente_nombre || '');
    setPaymentClientUid(payment.cliente_uid || '');
    setPaymentAmount(String(payment.monto ?? ''));
    setPaymentMethod(payment.metodo || 'Yappy');
    const dateStr =
      payment.fecha && /^\d{4}-\d{2}-\d{2}/.test(payment.fecha)
        ? payment.fecha.slice(0, 10)
        : new Date().toISOString().slice(0, 10);
    setPaymentDate(dateStr);
    const normStatus =
      String(payment.estado || '').toLowerCase() === 'pendiente' ? 'Pendiente' : 'Confirmado';
    setPaymentStatus(normStatus);
    setPaymentReference(payment.referencia || payment.referencia_transaccion || '');
    setPaymentNotes(payment.notas || '');
    setIsPaymentModalOpen(true);
  };

  const handleSelectOrderInPaymentModal = (selectedId: string) => {
    setPaymentOrderId(selectedId);
    const ord = orders.find((o) => o.id === selectedId);
    if (ord) {
      const code =
        ord.numero_pedido ||
        ord.consecutiveId ||
        ord.orderNumber ||
        ord.codigo_seguimiento ||
        ord.id;
      setPaymentOrderCode(code);
      setPaymentClientName(ord.cliente?.nombre || '');
      setPaymentClientUid((ord as any).creado_por_uid || (ord.cliente as any)?.id || '');
      const linkedQuote = quotes.find(
        (q) => q.solicitud_id === ord.id || (code && q.solicitud_codigo === code)
      );
      if (linkedQuote && !paymentQuoteId) {
        setPaymentQuoteId(linkedQuote.numero_cotizacion || linkedQuote.id);
      }
      if (!paymentAmount) {
        const orderTotal =
          Number(ord.total_facturado ?? ord.precio_regular ?? ord.servicio_probable?.price ?? 35) ||
          35;
        const alreadyPaid = getConfirmedPaidForOrder(ord.id, code, linkedQuote?.id);
        const pendingAmount = Math.max(0, Number((orderTotal - alreadyPaid).toFixed(2)));
        setPaymentAmount(String(pendingAmount > 0 ? pendingAmount : orderTotal));
      }
    }
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    const montoNum = parseFloat(paymentAmount);
    if (!Number.isFinite(montoNum) || montoNum <= 0) {
      showToast('El monto del pago debe ser mayor a $0.00.', 'error');
      return;
    }

    const resolvedOrder = orders.find(
      (o) =>
        o.id === paymentOrderId ||
        (paymentOrderCode.trim() &&
          (o.numero_pedido === paymentOrderCode.trim() ||
            o.codigo_seguimiento === paymentOrderCode.trim()))
    );
    const resolvedOrderId = paymentOrderId.trim() || resolvedOrder?.id || paymentOrderCode.trim() || 'MANUAL';
    const resolvedOrderCode =
      paymentOrderCode.trim() ||
      resolvedOrder?.numero_pedido ||
      resolvedOrder?.codigo_seguimiento ||
      resolvedOrderId;
    const resolvedClientUid =
      paymentClientUid.trim() ||
      (resolvedOrder as any)?.creado_por_uid ||
      (resolvedOrder?.cliente as any)?.id ||
      undefined;
    const resolvedClientName =
      paymentClientName.trim() || resolvedOrder?.cliente?.nombre || 'Cliente FIXIT';

    const isoDate = paymentDate
      ? paymentDate.length === 10
        ? `${paymentDate}T12:00:00.000Z`
        : paymentDate
      : new Date().toISOString();

    const authorName = user?.displayName || user?.nombre || user?.email || 'Admin FIXIT';
    const refText = paymentReference.trim() || 'SIN-REF';

    setIsSavingPayment(true);
    try {
      if (editingPayment) {
        const patch: Partial<ManagedPayment> = {
          solicitud_id: resolvedOrderId,
          solicitud_codigo: resolvedOrderCode,
          ...(paymentQuoteId.trim()
            ? { cotizacion_id: paymentQuoteId.trim(), cotizacion_codigo: paymentQuoteId.trim() }
            : { cotizacion_id: '', cotizacion_codigo: '' }),
          ...(resolvedClientUid ? { cliente_uid: resolvedClientUid } : {}),
          cliente_nombre: resolvedClientName,
          monto: montoNum,
          metodo: paymentMethod,
          estado: paymentStatus,
          fecha: isoDate,
          referencia: refText,
          referencia_transaccion: refText,
          notas: paymentNotes.trim(),
        };
        const updated = await updatePaymentInFirestore(editingPayment.id, patch, authorName);
        setPayments((prev) =>
          prev.map((p) => (p.id === editingPayment.id ? { ...p, ...patch, ...(updated || {}) } : p))
        );
        showToast(`Pago ${editingPayment.id} actualizado ($${montoNum.toFixed(2)}).`, 'success');
      } else {
        const created = await recordPaymentInFirestore(
          {
            solicitud_id: resolvedOrderId,
            solicitud_codigo: resolvedOrderCode,
            ...(paymentQuoteId.trim()
              ? { cotizacion_id: paymentQuoteId.trim(), cotizacion_codigo: paymentQuoteId.trim() }
              : {}),
            ...(resolvedClientUid ? { cliente_uid: resolvedClientUid } : {}),
            cliente_nombre: resolvedClientName,
            monto: montoNum,
            metodo: paymentMethod,
            estado: paymentStatus,
            fecha: isoDate,
            referencia: refText,
            referencia_transaccion: refText,
            usuario_registro: authorName,
            ...(paymentNotes.trim() ? { notas: paymentNotes.trim() } : {}),
          },
          authorName
        );
        setPayments((prev) => [created, ...prev.filter((p) => p.id !== created.id)]);
        showToast(
          `Pago registrado por $${montoNum.toFixed(2)} (${paymentStatus}).`,
          'success'
        );
      }
      setIsPaymentModalOpen(false);
      setEditingPayment(null);
    } catch (err: any) {
      showToast(`Error guardando pago: ${err?.message || 'Error'}`, 'error');
    } finally {
      setIsSavingPayment(false);
    }
  };

  const handleDeletePayment = async (payment: ManagedPayment) => {
    if (!isAdmin) return;
    const confirmed =
      typeof window !== 'undefined' && typeof window.confirm === 'function'
        ? window.confirm(
            `¿Eliminar el registro de pago ${payment.id} por $${Number(payment.monto || 0).toFixed(2)} USD? Esta acción se registrará en auditoría.`
          )
        : true;
    if (!confirmed) return;

    try {
      const authorName = user?.displayName || user?.nombre || user?.email || 'Admin FIXIT';
      await deletePaymentInFirestore(payment.id, authorName);
      setPayments((prev) => prev.filter((p) => p.id !== payment.id));
      showToast(`Pago ${payment.id} eliminado.`, 'success');
    } catch (err: any) {
      showToast(`Error eliminando pago: ${err?.message || 'Error'}`, 'error');
    }
  };

  const totalClientsCount = clients.length;
  const totalFixersCount = fixers.length;

  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) return clients;
    const term = clientSearch.toLowerCase();
    return clients.filter((c) => {
      return (
        c.displayName?.toLowerCase().includes(term) ||
        c.email?.toLowerCase().includes(term) ||
        c.phone?.toLowerCase().includes(term) ||
        c.city?.toLowerCase().includes(term)
      );
    });
  }, [clients, clientSearch]);

  const filteredOrders = useMemo(() => {
    return orders.filter((ord) => {
      if (orderStatusFilter !== 'all') {
        const s = (ord.estado || '').toLowerCase();
        const official = normalizeStatus(ord.estado);
        if (orderStatusFilter === 'Pendiente' && !s.includes('pendient') && !s.includes('nuev') && official !== 'NUEVA') return false;
        if (orderStatusFilter === 'En camino' && !s.includes('camino') && !s.includes('asigna') && !s.includes('program') && official !== 'ASIGNADA' && official !== 'PROGRAMADA') return false;
        if (orderStatusFilter === 'En progreso' && !s.includes('progres') && !s.includes('sitio') && !s.includes('proceso') && official !== 'EN_PROCESO') return false;
        if (orderStatusFilter === 'Completado' && !s.includes('complet') && official !== 'COMPLETADA') return false;
        if (orderStatusFilter === 'Cancelado' && !s.includes('cancel') && official !== 'CANCELADA') return false;
      }
      if (orderSearch.trim()) {
        const term = orderSearch.toLowerCase();
        const num = (ord.numero_pedido || ord.consecutiveId || ord.orderNumber || ord.codigo_seguimiento || '').toLowerCase();
        const client = (ord.cliente?.nombre || '').toLowerCase();
        const svc = (ord.servicio_probable?.service_name || '').toLowerCase();
        const fixer = (ord.tecnico_nombre || ord.tecnico_asignado || '').toLowerCase();
        return num.includes(term) || client.includes(term) || svc.includes(term) || fixer.includes(term);
      }
      return true;
    });
  }, [orders, orderStatusFilter, orderSearch]);

  const filteredFixers = useMemo(() => {
    if (fixerFilter === 'all') return fixers;
    return fixers.filter((f) => f.especialidad.toLowerCase().includes(fixerFilter.toLowerCase()));
  }, [fixers, fixerFilter]);

  const assignFilteredFixers = useMemo(() => {
    return fixers.filter((f) => {
      if (assignFilterSpecialty !== 'all' && f.especialidad !== assignFilterSpecialty) return false;
      if (assignFilterAvailability !== 'all' && f.disponibilidad !== assignFilterAvailability) return false;
      if (assignFilterZone.trim()) {
        const zone = (f.zona_cobertura || '').toLowerCase();
        if (!zone.includes(assignFilterZone.trim().toLowerCase())) return false;
      }
      return true;
    });
  }, [fixers, assignFilterSpecialty, assignFilterAvailability, assignFilterZone]);

  const assignSpecialties = useMemo(() => {
    return Array.from(new Set(fixers.map((f) => f.especialidad).filter(Boolean)));
  }, [fixers]);

  const handleExportClientsCSV = () => {
    if (clients.length === 0) {
      showToast('No hay clientes registrados para exportar.', 'error');
      return;
    }

    const headers = ['UID', 'Nombre', 'Correo', 'Telefono', 'Ciudad', 'Rol', 'Fecha Registro'];
    const rows = clients.map((c) => {
      const regDate = c.createdAt?.toDate 
        ? c.createdAt.toDate().toISOString() 
        : c.createdAt 
        ? new Date(c.createdAt).toISOString() 
        : 'N/A';
      return [
        `"${c.uid || c.id}"`,
        `"${(c.displayName || '').replace(/"/g, '""')}"`,
        `"${(c.email || '').replace(/"/g, '""')}"`,
        `"${(c.phone || '').replace(/"/g, '""')}"`,
        `"${(c.city || 'Ciudad de Panamá').replace(/"/g, '""')}"`,
        `"${c.role || 'customer'}"`,
        `"${regDate}"`
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `fixit_clientes_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getWhatsAppLink = (phone?: string, text?: string) => {
    if (!phone) return '#';
    let clean = phone.replace(/\D/g, '');
    if (clean.length === 8 && !clean.startsWith('507')) {
      clean = `507${clean}`;
    }
    const message = text ? `?text=${encodeURIComponent(text)}` : '';
    return `https://wa.me/${clean}${message}`;
  };

  const handleGenerateInviteCode = async () => {
    if (!isAdmin) return;
    setIsSavingInviteCode(true);
    try {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      const pick = (len: number) =>
        Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
      const newCode = `FIXIT-${pick(4)}-${pick(4)}`;
      const nowIso = new Date().toISOString();
      const author = user?.displayName || user?.nombre || user?.email || 'Admin FIXIT';

      await setDoc(doc(db, 'settings', 'fixer_invite'), {
        code: newCode,
        updatedBy: author,
        updatedAt: nowIso,
      });

      setFixerInviteCode(newCode);
      setFixerInviteMeta({ updatedBy: author, updatedAt: nowIso });
      showToast(`Código de invitación generado: ${newCode}`, 'success');
    } catch (err: any) {
      console.error('[Admin] Error generando código de invitación:', err);
      showToast(`Error al guardar código de invitación: ${err?.message || 'Error'}`, 'error');
    } finally {
      setIsSavingInviteCode(false);
    }
  };

  const handleCopyInviteCode = async () => {
    if (!fixerInviteCode) return;
    try {
      await navigator.clipboard.writeText(fixerInviteCode);
      showToast(`Código ${fixerInviteCode} copiado al portapapeles.`, 'info');
    } catch {
      showToast(`Código actual: ${fixerInviteCode}`, 'info');
    }
  };

  const handleSaveCommissionRate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isAdmin) return;
    const parsedPct = parseFloat(commissionInputPct.replace(',', '.'));
    if (!Number.isFinite(parsedPct) || parsedPct < 0 || parsedPct > 100) {
      showToast('Ingresa un porcentaje válido entre 0% y 100%.', 'error');
      return;
    }

    const parsedMinUsd = parseFloat(minCommissionInputUsd.replace(',', '.'));
    if (!Number.isFinite(parsedMinUsd) || parsedMinUsd < 0) {
      showToast('Ingresa un piso mínimo de comisión válido ($0.00 o mayor).', 'error');
      return;
    }

    setIsSavingCommission(true);
    try {
      const nextRate = normalizeRate(round2(parsedPct) / 100);
      const nextMinUsd = normalizeMinStandaloneCommission(parsedMinUsd);
      const nowIso = new Date().toISOString();
      const author = user?.displayName || user?.nombre || user?.email || 'Admin FIXIT';

      await setDoc(doc(db, 'settings', 'fixer_commission'), {
        rate: nextRate,
        min_standalone_commission_usd: nextMinUsd,
        updatedBy: author,
        updatedAt: nowIso,
      });

      setCommissionRate(nextRate);
      setCommissionInputPct(String(round2(nextRate * 100)));
      setMinStandaloneCommission(nextMinUsd);
      setMinCommissionInputUsd(nextMinUsd.toFixed(2));
      setCommissionDocExists(true);
      setCommissionMeta({ updatedBy: author, updatedAt: nowIso });
      setIsEditingCommission(false);
      showToast(
        `Comisión Fixit actualizada a ${round2(nextRate * 100)}% (piso mínimo $${nextMinUsd.toFixed(2)}).`,
        'success'
      );
    } catch (err: any) {
      console.error('[Admin] Error guardando tasa de comisión:', err);
      showToast(`Error al guardar tasa de comisión: ${err?.message || 'Error'}`, 'error');
    } finally {
      setIsSavingCommission(false);
    }
  };

  const handleSetVisitOutcome = async (
    ord: AdminOrder,
    outcome: 'aprobada' | 'no_aprobada'
  ) => {
    setUpdatingVisitOutcomeId(ord.id);
    try {
      const nowIso = new Date().toISOString();
      const author = user?.displayName || user?.nombre || user?.email || 'Admin FIXIT';
      const code =
        ord.numero_pedido ||
        ord.consecutiveId ||
        ord.orderNumber ||
        ord.codigo_seguimiento ||
        ord.id;

      if (outcome === 'no_aprobada') {
        const updates: Record<string, any> = {
          visitOutcome: 'no_aprobada',
          total_facturado: 25,
          comision_fixit: 10,
          costo_tecnico: 15,
          updatedAt: nowIso,
        };
        await updateDoc(doc(db, 'requests', ord.id), updates);
        try {
          await updateDoc(doc(db, 'orders', ord.id), updates);
        } catch {}

        setOrders((prev) =>
          prev.map((item) => (item.id === ord.id ? { ...item, ...updates } : item))
        );
        showToast(
          `Visita ${code} marcada como No aprobada: split fijo $10.00 Fixit / $15.00 Fixer`,
          'info'
        );
      } else {
        const currentTotal = Number(ord.total_facturado ?? ord.precio_regular ?? 25) || 25;
        const base = getCommissionBase({
          ...ord,
          visitOutcome: 'aprobada',
          total_facturado: currentTotal,
        });
        const com = calcCommission(base, commissionRate);
        const net = calcNet(base, commissionRate);

        const updates: Record<string, any> = {
          visitOutcome: 'aprobada',
          estado_pago: 'Acreditado a trabajo',
          comision_fixit: com,
          costo_tecnico: net,
          updatedAt: nowIso,
        };
        await updateDoc(doc(db, 'requests', ord.id), updates);
        try {
          await updateDoc(doc(db, 'orders', ord.id), updates);
        } catch {}

        const alreadyCredited = payments.some(
          (p) =>
            (p.solicitud_id === ord.id || p.solicitud_codigo === code) &&
            Math.abs(Number(p.monto || 0) - 25) < 0.01 &&
            String(p.notas || '').toLowerCase().includes('acreditad')
        );

        if (!alreadyCredited) {
          const newPay = await recordPaymentInFirestore({
            solicitud_id: ord.id,
            solicitud_codigo: code,
            cliente_nombre: ord.cliente?.nombre || 'Cliente FIXIT',
            monto: 25,
            metodo: 'Efectivo',
            estado: 'Confirmado',
            referencia_transaccion: `DIAG-CREDIT-${code}`,
            referencia: `DIAG-CREDIT-${code}`,
            fecha: nowIso.slice(0, 10),
            usuario_registro: author,
            notas: 'Visita técnica $25.00 acreditada a cuenta del trabajo aprobado',
          });
          setPayments((prev) => [newPay, ...prev]);
        }

        setOrders((prev) =>
          prev.map((item) => (item.id === ord.id ? { ...item, ...updates } : item))
        );
        showToast(
          `Visita ${code} marcada como Aprobada: $25.00 acreditados al trabajo (comisión 15/85 sobre total final).`,
          'success'
        );
      }
    } catch (err: any) {
      console.error('[Admin] Error actualizando visitOutcome:', err);
      showToast(`Error al actualizar visita: ${err?.message || 'Error'}`, 'error');
    } finally {
      setUpdatingVisitOutcomeId(null);
    }
  };

  const resolveAssignedFixerForOrder = (ord: AdminOrder): AdminFixer | null => {
    const hasAssigned = Boolean(ord.tecnico_id || ord.tecnico_nombre || ord.tecnico_asignado);
    if (!hasAssigned) return null;

    if (ord.tecnico_id) {
      const byId = fixers.find((f) => f.id === ord.tecnico_id || f.uid === ord.tecnico_id);
      if (byId) return byId;
    }

    const assignedName = (ord.tecnico_nombre || ord.tecnico_asignado || '').trim().toLowerCase();
    if (assignedName) {
      const byName = fixers.find((f) => f.nombre.trim().toLowerCase() === assignedName);
      if (byName) return byName;
    }

    return {
      id: ord.tecnico_id || 'assigned',
      nombre: ord.tecnico_nombre || ord.tecnico_asignado || 'Técnico FIXIT',
      especialidad: ord.servicio_probable?.category || 'Reparaciones del hogar',
      telefono: '',
      disponibilidad: 'Disponible',
      calificacion: 0,
      trabajos_realizados: 0,
    };
  };

  const handleCreateFixer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFixerName.trim()) return;

    setSavingFixer(true);
    try {
      const fixerId = `FIXER-PTY-${Date.now().toString().slice(-4)}`;
      const fixerData: Record<string, any> = {
        id: fixerId,
        nombre: newFixerName.trim(),
        telefono: newFixerPhone.trim(),
        especialidad: newFixerSpecialty,
        disponibilidad: 'Disponible',
        calificacion: null,
        trabajos_realizados: 0,
        zona_cobertura: newFixerZone.trim(),
        createdAt: serverTimestamp(),
      };

      if (newFixerEmail.trim()) {
        fixerData.correo = newFixerEmail.trim();
      }

      await setDoc(doc(db, 'fixers', fixerId), fixerData);
      await setDoc(doc(db, 'technicians', fixerId), {
        ...fixerData,
        activo: true,
        tipo_relacion: 'contratista',
      });

      setIsAddFixerModalOpen(false);
      setNewFixerName('');
      setNewFixerPhone('');
      setNewFixerEmail('');
      showToast(`¡Técnico ${fixerData.nombre} registrado con éxito!`, 'success');
    } catch (err: any) {
      console.error('[Admin] Error al registrar fixer:', err);
      showToast(`Error al registrar el técnico: ${err.message || 'Error'}`, 'error');
    } finally {
      setSavingFixer(false);
    }
  };

  const handleConfirmDeleteFixer = async () => {
    if (!fixerToDelete) return;
    setIsDeletingFixer(true);
    try {
      await deleteDoc(doc(db, 'fixers', fixerToDelete.id));
      try {
        await deleteDoc(doc(db, 'technicians', fixerToDelete.id));
      } catch {}
      setFixers((prev) => prev.filter((f) => f.id !== fixerToDelete.id));
      showToast(`Técnico "${fixerToDelete.nombre}" eliminado exitosamente.`, 'success');
      setFixerToDelete(null);
    } catch (err: any) {
      console.error('Error eliminando fixer:', err);
      showToast(`Error al eliminar técnico: ${err.message || 'Error'}`, 'error');
    } finally {
      setIsDeletingFixer(false);
    }
  };

  const handleSeedDefaultFixers = async () => {
    setIsSeedingFixers(true);
    try {
      for (const f of DEFAULT_INITIAL_FIXERS) {
        const payload: Record<string, any> = {
          id: f.id,
          nombre: f.nombre,
          especialidad: f.especialidad,
          telefono: f.telefono,
          disponibilidad: f.disponibilidad,
          calificacion: f.calificacion,
          trabajos_realizados: f.trabajos_realizados,
          zona_cobertura: f.zona_cobertura,
          createdAt: serverTimestamp(),
        };
        if (f.correo) {
          payload.correo = f.correo;
        }

        await setDoc(doc(db, 'fixers', f.id), payload);
        await setDoc(doc(db, 'technicians', f.id), {
          ...payload,
          activo: true,
          tipo_relacion: 'contratista',
          createdAt: serverTimestamp(),
        });
      }
      showToast('¡Técnicos idóneos guardados exitosamente en Firestore!', 'success');
    } catch (e: any) {
      console.error('Error al guardar técnicos:', e);
      showToast(`Error al guardar técnicos: ${e.message || 'Error'}`, 'error');
    } finally {
      setIsSeedingFixers(false);
    }
  };

  const handleCatalogServiceChange = (serviceId: string) => {
    setManualSelectedCatalogId(serviceId);
    setManualApplyPromo(false);
    if (serviceId === 'custom') {
      setManualServiceName('');
      setManualAmount('35');
    } else {
      const s = FIXIT_CATALOG.find((item) => item.id === serviceId);
      if (s) {
        setManualServiceName(s.service_name);
        setManualCategory(s.category);
        setManualAmount(String(s.price || 35));
      }
    }
  };

  const handleToggleManualPromo = (applyPromo: boolean) => {
    setManualApplyPromo(applyPromo);
    const s = FIXIT_CATALOG.find((item) => item.id === manualSelectedCatalogId);
    if (s) {
      const nextPrice =
        applyPromo && typeof s.promo_price_usd === 'number' ? s.promo_price_usd : s.price;
      setManualAmount(String(nextPrice));
    }
  };

  const handleCreateManualOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualClientName.trim()) {
      showToast('Ingresa el nombre del cliente', 'error');
      return;
    }
    if (!manualClientPhone.trim()) {
      showToast('Ingresa el teléfono del cliente', 'error');
      return;
    }
    if (!manualAddress.trim()) {
      showToast('Ingresa la dirección del servicio', 'error');
      return;
    }

    const selectedCatalogService =
      manualSelectedCatalogId && manualSelectedCatalogId !== 'custom'
        ? FIXIT_CATALOG.find((s) => s.id === manualSelectedCatalogId)
        : undefined;

    if (selectedCatalogService?.addon_only) {
      showToast('Agrega un servicio principal', 'error');
      return;
    }

    const priceNum = parseFloat(manualAmount) || 0;
    const embeddedMat =
      selectedCatalogService?.embedded_material_usd &&
      selectedCatalogService.embedded_material_usd > 0
        ? round2(selectedCatalogService.embedded_material_usd)
        : 0;
    const laborBase = Math.max(0, round2(priceNum - embeddedMat));
    const expectedComm = calcCommission(laborBase, commissionRate);

    if (expectedComm < minStandaloneCommission) {
      showToast(
        `Comisión (${round2(commissionRate * 100)}% = $${expectedComm.toFixed(2)}) inferior al piso mínimo permitido ($${minStandaloneCommission.toFixed(2)}).`,
        'error'
      );
      return;
    }

    setSavingManualOrder(true);
    try {
      const monthlyConsecutive = await getNextMonthlyOrderNumber();
      const orderDocId = `REQ-${Date.now().toString().slice(-6)}`;

      let serviceCategory = manualCategory;
      let serviceName = manualServiceName;
      if (selectedCatalogService) {
        serviceCategory = selectedCatalogService.category;
        serviceName = selectedCatalogService.service_name;
      }

      const selectedFixer = fixers.find((f) => f.id === manualFixerId);
      const nowIso = new Date().toISOString();
      const isDiagnosticOrder =
        selectedCatalogService?.id === 'DIAG-001' ||
        Boolean(selectedCatalogService?.diagnostic_required);

      const currentUid = auth.currentUser?.uid || user?.uid || 'admin_manual';
      const orderPayload: Record<string, any> = {
        id: orderDocId,
        numero_pedido: monthlyConsecutive,
        consecutiveId: monthlyConsecutive,
        orderNumber: monthlyConsecutive,
        codigo_seguimiento: monthlyConsecutive,
        creado_por_uid: currentUid,
        cliente: {
          id: currentUid,
          nombre: manualClientName.trim(),
          telefono: manualClientPhone.trim(),
        },
        servicio_probable: {
          id: manualSelectedCatalogId || 'MANUAL',
          service_name: serviceName.trim() || 'Servicio de Reparación',
          category: serviceCategory,
          price: priceNum,
          embedded_material_usd: embeddedMat > 0 ? embeddedMat : undefined,
          diagnostic_required: isDiagnosticOrder || undefined,
        },
        direccion: manualAddress.trim(),
        fecha: manualScheduledDate || nowIso,
        horario_preferido: manualScheduledDate ? `Agendado: ${manualScheduledDate}` : 'Hoy',
        precio_regular: selectedCatalogService?.precio_regular ?? priceNum,
        total_facturado: priceNum,
        cotizacion: priceNum,
        costo_materiales: embeddedMat > 0 ? embeddedMat : undefined,
        visitOutcome: isDiagnosticOrder ? ('pendiente' as VisitOutcome) : undefined,
        comision_fixit: expectedComm,
        costo_tecnico: calcNet(laborBase, commissionRate),
        estado: manualInitialStatus,
        origen: 'ADMIN_MANUAL',
        tipo_propiedad: 'Residencial',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      if (manualClientEmail.trim()) {
        orderPayload.cliente.correo = manualClientEmail.trim();
      }
      if (selectedFixer) {
        orderPayload.tecnico_id = selectedFixer.id;
        orderPayload.tecnico_asignado = selectedFixer.nombre;
        orderPayload.tecnico_nombre = selectedFixer.nombre;
      }
      if (manualNotes.trim()) {
        orderPayload.notas_internas = manualNotes.trim();
      }

      const cleanPayload = sanitizeForFirestore(orderPayload);
      await setDoc(doc(db, 'requests', orderDocId), cleanPayload);
      try {
        await setDoc(doc(db, 'orders', orderDocId), cleanPayload);
      } catch {}

      showToast(`¡Pedido ${monthlyConsecutive} creado con éxito!`, 'success');
      setIsCreateOrderModalOpen(false);

      setManualClientName('');
      setManualClientPhone('');
      setManualClientEmail('');
      setManualSelectedCatalogId(FIXIT_CATALOG[0]?.id || 'custom');
      setManualServiceName(FIXIT_CATALOG[0]?.service_name || '');
      setManualCategory(FIXIT_CATALOG[0]?.category || 'Reparaciones del hogar');
      setManualAmount(String(FIXIT_CATALOG[0]?.price || 35));
      setManualApplyPromo(false);
      setManualAddress('');
      setManualFixerId('');
      setManualScheduledDate('');
      setManualNotes('');
      setManualInitialStatus('Pendiente');
    } catch (err: any) {
      console.error('Error creando pedido manual:', err);
      showToast(`Error al crear pedido: ${err.message || 'Error'}`, 'error');
    } finally {
      setSavingManualOrder(false);
    }
  };

  const handleConfirmCancelOrder = async () => {
    if (!orderToManage) return;
    setIsActionInProgress(true);
    try {
      const updates = {
        estado: 'Cancelado',
        updatedAt: new Date().toISOString(),
      };
      await updateDoc(doc(db, 'requests', orderToManage.id), updates);
      try {
        await updateDoc(doc(db, 'orders', orderToManage.id), updates);
      } catch {}

      setOrders((prev) => prev.map((o) => o.id === orderToManage.id ? { ...o, estado: 'Cancelado' } : o));
      const consecutivo = orderToManage.numero_pedido || orderToManage.consecutiveId || orderToManage.orderNumber || orderToManage.codigo_seguimiento || orderToManage.id;
      showToast(`Pedido ${consecutivo} marcado como Cancelado.`, 'info');
      setOrderToManage(null);
    } catch (err: any) {
      console.error('Error cancelando pedido:', err);
      showToast(`Error al cancelar pedido: ${err.message || 'Error'}`, 'error');
    } finally {
      setIsActionInProgress(false);
    }
  };

  const handleConfirmDeleteOrder = async () => {
    if (!orderToManage) return;
    setIsActionInProgress(true);
    try {
      await deleteDoc(doc(db, 'requests', orderToManage.id));
      try {
        await deleteDoc(doc(db, 'orders', orderToManage.id));
      } catch {}

      setOrders((prev) => prev.filter((o) => o.id !== orderToManage.id));
      const consecutivo = orderToManage.numero_pedido || orderToManage.consecutiveId || orderToManage.orderNumber || orderToManage.codigo_seguimiento || orderToManage.id;
      showToast(`Pedido ${consecutivo} eliminado definitivamente de Firestore.`, 'success');
      setOrderToManage(null);
    } catch (err: any) {
      console.error('Error eliminando pedido:', err);
      showToast(`Error al eliminar pedido: ${err.message || 'Error'}`, 'error');
    } finally {
      setIsActionInProgress(false);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const authorName = user?.displayName || user?.nombre || user?.email || 'Operador FIXIT';
      const updated = await updateOrderInFirestore(
        orderId,
        { estado: newStatus as OfficialRequestStatus },
        authorName,
        `Estado actualizado a ${newStatus} desde panel admin`
      );
      const normalizedStatus = updated?.estado || normalizeStatus(newStatus);
      try {
        await updateDoc(doc(db, 'orders', orderId), {
          estado: normalizedStatus,
          updatedAt: new Date().toISOString(),
        });
      } catch {}
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, estado: normalizedStatus } : o)));
      showToast(`Estado actualizado a: ${OFFICIAL_STATUS_DISPLAY[normalizedStatus as OfficialRequestStatus]?.es || normalizedStatus}`, 'info');
    } catch (err: any) {
      console.error('[Admin] Error actualizando estado:', err);
      showToast(`Error actualizando estado: ${err.message || 'Error'}`, 'error');
    }
  };

  const openAssignModal = (ord: AdminOrder) => {
    setOrderToAssign(ord);
    setAssignFixerId(fixers.some((f) => f.id === ord.tecnico_id) ? (ord.tecnico_id as string) : '');
    setAssignScheduledDate('');
    setAssignNotes('');
    setAssignFilterSpecialty('all');
    setAssignFilterZone('');
    setAssignFilterAvailability('all');
  };

  const handleConfirmAssignTechnician = async () => {
    if (!orderToAssign) return;
    if (!assignFixerId) {
      showToast('Selecciona un técnico para asignar.', 'error');
      return;
    }
    setIsAssigning(true);
    try {
      const authorName = user?.displayName || user?.nombre || user?.email || 'Operador FIXIT';
      const result = await assignTechnicianToOrder(
        orderToAssign.id,
        {
          tecnicoId: assignFixerId,
          ...(assignScheduledDate.trim() ? { fecha_programada: assignScheduledDate.trim() } : {}),
          ...(assignNotes.trim() ? { notas: assignNotes.trim() } : {}),
        },
        authorName
      );
      try {
        await updateDoc(doc(db, 'orders', orderToAssign.id), sanitizeForFirestore({
          tecnico_id: result.order?.tecnico_id,
          tecnico_asignado: result.order?.tecnico_asignado,
          tecnico_nombre: result.order?.tecnico_nombre,
          estado: result.order?.estado,
          updatedAt: new Date().toISOString(),
        }));
      } catch {}
      setOrders((prev) => prev.map((o) => (o.id === orderToAssign.id
        ? {
            ...o,
            tecnico_id: result.order?.tecnico_id,
            tecnico_asignado: result.order?.tecnico_asignado,
            tecnico_nombre: result.order?.tecnico_nombre,
            estado: result.order?.estado || o.estado,
          }
        : o)));
      const consecutivo = orderToAssign.numero_pedido || orderToAssign.consecutiveId || orderToAssign.orderNumber || orderToAssign.codigo_seguimiento || orderToAssign.id;
      showToast(`Técnico ${result.order?.tecnico_nombre || ''} asignado al pedido ${consecutivo}.`, 'success');
      setOrderToAssign(null);
    } catch (err: any) {
      console.error('[Admin] Error asignando técnico:', err);
      showToast(`Error asignando técnico: ${err.message || 'Error'}`, 'error');
    } finally {
      setIsAssigning(false);
    }
  };

  // === FUNCIONES DE AGENDA MAESTRA ===
  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agendaDate || !agendaTime) {
      showToast('Por favor, selecciona fecha y hora.', 'error');
      return;
    }

    setIsSavingAppointment(true);
    try {
      // Validar si la hora ya está ocupada
      const q = query(
        collection(db, 'appointments'),
        where('date', '==', agendaDate),
        where('time', '==', agendaTime)
      );
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        showToast('Ese horario ya está ocupado en la fecha seleccionada.', 'error');
        setIsSavingAppointment(false);
        return;
      }

      const docId = `APP-${Date.now()}`;
      await setDoc(doc(db, 'appointments', docId), {
        date: agendaDate,
        time: agendaTime,
        clientInfo: agendaClientInfo.trim() || 'Cita Reservada',
        createdAt: serverTimestamp()
      });

      showToast(`Horario ${agendaTime} bloqueado exitosamente para el ${agendaDate}`, 'success');
      setAgendaClientInfo('');
      // No reseteamos fecha/hora para que pueda bloquear varias si quiere
    } catch (err: any) {
      console.warn("Aviso al agendar cita:", err);
      showToast('Error al bloquear horario.', 'error');
    } finally {
      setIsSavingAppointment(false);
    }
  };

  const handleDeleteAppointment = async (id: string) => {
    const confirmed = typeof window !== 'undefined' && typeof window.confirm === 'function'
      ? window.confirm('¿Liberar este horario? Volverá a estar disponible para el público.')
      : true;
    if (!confirmed) return;
    
    try {
      await deleteDoc(doc(db, 'appointments', id));
      showToast('Horario liberado exitosamente.', 'success');
    } catch (err) {
      console.warn("Aviso borrando cita:", err);
      showToast('Error al liberar horario.', 'error');
    }
  };

  if (authState.loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center space-y-3">
        <RefreshCw className="w-8 h-8 text-[#0B72D9] animate-spin" />
        <p className="text-sm font-semibold text-[#756A5D]">Verificando credenciales de administrador FIXIT...</p>
      </div>
    );
  }

  if (!hasAdminOrOperatorAccess) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-[#FFFEFA] border border-[#DED4C5] rounded-3xl text-center space-y-4 shadow-sm">
        <AlertCircle className="w-12 h-12 text-[#B98A43] mx-auto" />
        <h2 className="font-serif font-bold text-xl text-[#1F2421]">Acceso Restringido</h2>
        <p className="text-xs text-[#756A5D] leading-relaxed">
          Esta vista está reservada exclusivamente para usuarios administradores y operadores (role === 'ADMIN' | 'OPERATOR').
        </p>
        <button
          onClick={onGoHome}
          className="w-full py-3 rounded-2xl bg-[#082D60] text-white font-bold text-sm hover:bg-[#07244D] cursor-pointer transition-colors"
        >
          Volver al Inicio
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F4EF] py-6 px-3 sm:px-6 space-y-6 max-w-6xl mx-auto relative">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-3 duration-300">
          <div className={`p-4 rounded-2xl shadow-xl border flex items-center gap-2.5 text-xs font-semibold ${
            toast.type === 'success' 
              ? 'bg-[#53653D] text-white border-[#435331]' 
              : toast.type === 'error'
              ? 'bg-rose-700 text-white border-rose-800'
              : 'bg-[#082D60] text-white border-[#062248]'
          }`}>
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-200 shrink-0" />}
            {toast.type === 'info' && <Sparkles className="w-4 h-4 text-sky-300 shrink-0" />}
            <span>{toast.text}</span>
            <button onClick={() => setToast(null)} className="ml-2 opacity-70 hover:opacity-100 p-0.5 cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Top Header Bar */}
      <header className="bg-[#FFFEFA] border border-[#DED4C5] rounded-3xl p-4 sm:p-6 shadow-2xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#082D60] text-white flex items-center justify-center font-bold shadow-xs shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-[#082D60]/10 text-[#082D60] px-2 py-0.5 rounded-full border border-[#082D60]/20">
                Panel Oficial FIXIT
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] text-[#53653D] font-bold">
                <span className="w-2 h-2 rounded-full bg-[#53653D] animate-ping" />
                Firestore Live
              </span>
            </div>
            <h1 className="font-serif font-bold text-xl sm:text-2xl text-[#1F2421]">
              Administración & Control Operativo
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleToggleAdminSound}
            title={
              adminSoundEnabled
                ? 'Alerta sonora de nuevos pedidos activa (clic para silenciar)'
                : 'Alerta sonora de nuevos pedidos silenciada (clic para activar)'
            }
            className={`py-2.5 px-3.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              adminSoundEnabled
                ? 'bg-[#53653D]/15 text-[#53653D] border-[#53653D]/30 hover:bg-[#53653D]/25'
                : 'bg-[#F6F4EF] text-[#756A5D] border-[#DED4C5] hover:text-[#1F2421]'
            }`}
          >
            {adminSoundEnabled ? (
              <>
                <Volume2 className="w-4 h-4" />
                <span>Sonido activo</span>
              </>
            ) : (
              <>
                <VolumeX className="w-4 h-4" />
                <span>Silenciado</span>
              </>
            )}
          </button>
          {onOpenFixerView && (
            <button
              onClick={onOpenFixerView}
              className="py-2.5 px-4 rounded-xl border border-[#0B72D9]/30 bg-[#0B72D9]/10 hover:bg-[#0B72D9]/20 text-xs font-bold text-[#082D60] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <FileText className="w-4 h-4 text-[#0B72D9]" />
              <span>Vista Fixer / Cotizador PDF</span>
            </button>
          )}
          <button
            onClick={() => setIsCreateOrderModalOpen(true)}
            className="py-2.5 px-4 rounded-xl bg-[#082D60] hover:bg-[#062248] text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Crear Pedido Manual</span>
          </button>
          <button
            onClick={() => setIsAddFixerModalOpen(true)}
            className="py-2.5 px-4 rounded-xl bg-[#0B72D9] hover:bg-[#0962BC] text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Fixer</span>
          </button>
        </div>
      </header>

      {/* TARJETAS DE MÉTRICAS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div
          onClick={() => setActiveTab('payments')}
          className="bg-[#FFFEFA] border-2 border-[#53653D]/40 hover:border-[#53653D] rounded-3xl p-4 sm:p-5 shadow-2xs space-y-2 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#53653D]">
              Ingresos confirmados (mes actual)
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#53653D]/15 text-[#53653D] flex items-center justify-center shrink-0">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="font-serif font-bold text-2xl sm:text-3xl text-[#53653D]">
              {loadingPayments
                ? '...'
                : `$${confirmedCurrentMonthRevenue.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`}
            </span>
            <span className="text-xs font-semibold text-[#756A5D]">USD</span>
          </div>
          <p className="text-[11px] text-[#53653D] font-semibold">
            {confirmedCurrentMonthCount} {confirmedCurrentMonthCount === 1 ? 'pago real' : 'pagos reales'} ({currentMonthPrefix})
          </p>
        </div>

        <div
          onClick={() => setActiveTab('orders')}
          className="bg-[#FFFEFA] border-2 border-[#082D60]/30 hover:border-[#082D60] rounded-3xl p-4 sm:p-5 shadow-2xs space-y-2 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#082D60]">
              Comisiones devengadas (mes)
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#082D60]/10 text-[#082D60] flex items-center justify-center shrink-0">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="font-serif font-bold text-2xl sm:text-3xl text-[#082D60]">
              {loadingOrders
                ? '...'
                : `$${accruedCurrentMonthCommissions.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`}
            </span>
            <span className="text-xs font-semibold text-[#756A5D]">USD</span>
          </div>
          <p className="text-[11px] text-[#082D60] font-semibold">
            {round2(commissionRate * 100)}% sobre {accruedCurrentMonthOrders.length} pedidos no cancelados ({currentMonthPrefix})
          </p>
        </div>

        <div
          onClick={() => setActiveTab('payments')}
          className="bg-[#FFFEFA] border-2 border-[#B98A43]/40 hover:border-[#B98A43] rounded-3xl p-4 sm:p-5 shadow-2xs space-y-2 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#B98A43]">
              Comisiones cobradas (mes)
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#B98A43]/15 text-[#B98A43] flex items-center justify-center shrink-0">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="font-serif font-bold text-2xl sm:text-3xl text-[#B98A43]">
              {loadingPayments
                ? '...'
                : `$${collectedCurrentMonthCommissions.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`}
            </span>
            <span className="text-xs font-semibold text-[#756A5D]">USD</span>
          </div>
          <p className="text-[11px] text-[#B98A43] font-semibold">
            {round2(commissionRate * 100)}% sobre pagos confirmados ({currentMonthPrefix})
          </p>
        </div>

        <div className="bg-[#FFFEFA] border border-[#DED4C5] rounded-3xl p-4 sm:p-5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#756A5D]">Órdenes Totales</span>
            <div className="w-8 h-8 rounded-xl bg-[#0B72D9]/10 text-[#0B72D9] flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-serif font-bold text-2xl sm:text-3xl text-[#1F2421]">
              {loadingOrders ? '...' : totalOrdersCount}
            </span>
            <span className="text-[11px] font-semibold text-[#53653D] flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" />
              Activas
            </span>
          </div>
          <p className="text-[11px] text-[#756A5D]">Colección 'orders' & 'requests'</p>
        </div>

        <div className="bg-[#FFFEFA] border border-[#DED4C5] rounded-3xl p-4 sm:p-5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#756A5D]">
              Facturación Pedidos (proyectado)
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#53653D]/10 text-[#53653D] flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="font-serif font-bold text-2xl sm:text-3xl text-[#1F2421]">
              {loadingOrders ? '...' : `$${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </span>
            <span className="text-xs font-semibold text-[#756A5D]">USD</span>
          </div>
          <p className="text-[11px] text-[#756A5D]">Estimado de órdenes no canceladas</p>
        </div>

        <div
          onClick={() => setActiveTab('quotes')}
          className="bg-[#FFFEFA] border border-[#0B72D9]/40 hover:border-[#0B72D9] rounded-3xl p-4 sm:p-5 shadow-2xs space-y-2 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#082D60]">
              Cotizado por Fixers (proyectado)
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#082D60]/10 text-[#082D60] flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="font-serif font-bold text-2xl sm:text-3xl text-[#082D60]">
              {loadingQuotes ? '...' : `$${totalQuotedRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </span>
            <span className="text-xs font-semibold text-[#756A5D]">USD</span>
          </div>
          <p className="text-[11px] text-[#0B72D9] font-semibold">
            {quotes.length} cotizaciones • Anticipos 50%: ${(totalQuotedRevenue * 0.5).toFixed(2)}
          </p>
        </div>

        <div className="bg-[#FFFEFA] border border-[#DED4C5] rounded-3xl p-4 sm:p-5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#756A5D]">Total Clientes</span>
            <div className="w-8 h-8 rounded-xl bg-[#082D60]/10 text-[#082D60] flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-serif font-bold text-2xl sm:text-3xl text-[#1F2421]">
              {loadingClients ? '...' : totalClientsCount}
            </span>
            <span className="text-[11px] font-semibold text-[#082D60]">Registrados</span>
          </div>
          <p className="text-[11px] text-[#756A5D]">Colección 'users' (clientes)</p>
        </div>

        <div className="bg-[#FFFEFA] border border-[#DED4C5] rounded-3xl p-4 sm:p-5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#756A5D]">Total Fixers</span>
            <div className="w-8 h-8 rounded-xl bg-[#B98A43]/10 text-[#B98A43] flex items-center justify-center">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-serif font-bold text-2xl sm:text-3xl text-[#1F2421]">
              {loadingFixers ? '...' : totalFixersCount}
            </span>
            <span className="text-[11px] font-semibold text-[#B98A43]">Idóneos</span>
          </div>
          <p className="text-[11px] text-[#756A5D]">Colección 'fixers' / técnicos</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-[#DED4C5]/40 rounded-2xl w-full sm:w-auto overflow-x-auto">
        <button
          onClick={() => setActiveTab('kpis')}
          className={`flex-1 sm:flex-initial py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
            activeTab === 'kpis' ? 'bg-[#FFFEFA] text-[#082D60] shadow-xs' : 'text-[#756A5D] hover:text-[#1F2421]'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Resumen y KPIs</span>
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`flex-1 sm:flex-initial py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
            activeTab === 'payments'
              ? 'bg-[#53653D] text-white shadow-xs'
              : 'text-[#756A5D] hover:text-[#1F2421]'
          }`}
        >
          <Banknote className="w-4 h-4" />
          <span>Pagos e Ingresos ({payments.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('quotes')}
          className={`flex-1 sm:flex-initial py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
            activeTab === 'quotes' ? 'bg-[#082D60] text-white shadow-xs' : 'text-[#756A5D] hover:text-[#1F2421]'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Cotizaciones ({quotes.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('agenda')}
          className={`flex-1 sm:flex-initial py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
            activeTab === 'agenda' ? 'bg-[#0B72D9] text-white shadow-xs' : 'text-[#756A5D] hover:text-[#1F2421]'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Control de Agenda</span>
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`flex-1 sm:flex-initial py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
            activeTab === 'orders' ? 'bg-[#FFFEFA] text-[#082D60] shadow-xs' : 'text-[#756A5D] hover:text-[#1F2421]'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Pedidos ({orders.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('clients')}
          className={`flex-1 sm:flex-initial py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
            activeTab === 'clients' ? 'bg-[#FFFEFA] text-[#082D60] shadow-xs' : 'text-[#756A5D] hover:text-[#1F2421]'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Clientes ({clients.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('fixers')}
          className={`flex-1 sm:flex-initial py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
            activeTab === 'fixers' ? 'bg-[#FFFEFA] text-[#082D60] shadow-xs' : 'text-[#756A5D] hover:text-[#1F2421]'
          }`}
        >
          <Wrench className="w-4 h-4" />
          <span>Fixers ({fixers.length})</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: RESUMEN Y KPIs                                          */}
      {/* ============================================================== */}
      {activeTab === 'kpis' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#FFFEFA] border border-[#DED4C5] rounded-3xl p-5 shadow-2xs space-y-3">
              <h3 className="font-serif font-bold text-base text-[#1F2421] flex items-center justify-between">
                <span>Últimos Pedidos con Consecutivo</span>
              </h3>
              <div className="divide-y divide-[#DED4C5]/60 text-xs">
                {orders.length === 0 ? (
                  <p className="py-4 text-center text-[#756A5D]">No hay pedidos registrados.</p>
                ) : (
                  orders.slice(0, 5).map((ord) => (
                    <div key={ord.id} className="py-2.5 flex items-center justify-between">
                      <div>
                        <span className="font-mono font-bold text-[#082D60] block">
                          {ord.numero_pedido || ord.consecutiveId || ord.orderNumber || ord.codigo_seguimiento || 'FIX-PENDIENTE'}
                        </span>
                        <span className="text-[#756A5D] truncate block max-w-[200px]">
                          {ord.cliente?.nombre || 'Cliente'} • {ord.servicio_probable?.service_name || 'Servicio'}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-[#1F2421] block">
                          ${(ord.total_facturado ?? ord.precio_regular ?? 35).toFixed(2)} USD
                        </span>
                        <span className="text-[10px] font-semibold text-[#53653D]">
                          {ord.estado || 'Pendiente'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-[#FFFEFA] border border-[#DED4C5] rounded-3xl p-5 shadow-2xs space-y-3">
              <h3 className="font-serif font-bold text-base text-[#1F2421] flex items-center justify-between">
                <span>Estado de Fixers Idóneos</span>
              </h3>
              <div className="space-y-2 text-xs">
                {fixers.slice(0, 4).map((f) => (
                  <div key={f.id} className="p-2.5 rounded-xl bg-[#F6F4EF] border border-[#DED4C5]/60 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-[#1F2421] block">{f.nombre}</span>
                      <span className="text-[11px] text-[#756A5D]">{f.especialidad}</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      f.disponibilidad === 'Disponible' ? 'bg-[#53653D]/10 text-[#53653D] border-[#53653D]/30' : 'bg-[#756A5D]/10 text-[#756A5D]'
                    }`}>
                      {f.disponibilidad}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Resumen de Cotizaciones Emitidas por Fixer */}
          <div className="bg-[#FFFEFA] border border-[#DED4C5] rounded-3xl p-5 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-serif font-bold text-base text-[#1F2421] flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#0B72D9]" />
                  <span>Ingresos y Cotizaciones Emitidas por Fixer</span>
                </h3>
                <p className="text-[11px] text-[#756A5D]">
                  Consolidado en tiempo real de la colección <code>quotes</code> (Cotizador Oficial 1:1).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('quotes')}
                className="py-1.5 px-3 rounded-xl bg-[#082D60]/10 hover:bg-[#082D60]/15 text-[#082D60] font-bold text-xs transition-colors cursor-pointer self-start sm:self-auto"
              >
                Ver todas las cotizaciones ({quotes.length}) →
              </button>
            </div>

            {quotesByFixer.length === 0 ? (
              <p className="py-4 text-center text-xs text-[#756A5D]">
                Aún no se han emitido cotizaciones desde la Vista Fixer.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {quotesByFixer.map((row) => (
                  <div
                    key={row.nombre}
                    className="p-3.5 rounded-2xl bg-[#F6F4EF] border border-[#DED4C5]/70 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <span className="font-bold text-xs text-[#1F2421] truncate block">
                        {row.nombre}
                      </span>
                      <span className="text-[11px] text-[#756A5D]">
                        {row.count} {row.count === 1 ? 'cotización emitida' : 'cotizaciones emitidas'}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-serif font-bold text-sm text-[#082D60] block">
                        ${row.totalUsd.toFixed(2)}
                      </span>
                      <span className="text-[10px] font-bold text-[#53653D]">
                        Aprob: ${row.approvedUsd.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 1.5: NUEVA AGENDA MAESTRA DE FIREBASE                        */}
      {/* ============================================================== */}
      {activeTab === 'agenda' && (
        <div className="space-y-6">
          <div className="bg-[#FFFEFA] border border-[#DED4C5] rounded-3xl p-5 sm:p-6 shadow-2xs space-y-4">
            <div>
              <h2 className="font-serif font-bold text-xl text-[#1F2421] flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#0B72D9]" />
                Control de Agenda (Bloqueo de Horarios)
              </h2>
              <p className="text-xs text-[#756A5D] mt-1">
                Cuando confirmes una cita por WhatsApp, bloquéala aquí. Ese horario se tachará instantáneamente en la app pública para que nadie más lo pueda elegir.
              </p>
            </div>

            <form onSubmit={handleCreateAppointment} className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-[#F6F4EF] p-4 rounded-2xl border border-[#DED4C5]">
              <div>
                <label className="text-[11px] font-bold text-[#1F2421] block mb-1">Día de la Cita</label>
                <input 
                  type="date" 
                  required
                  value={agendaDate}
                  onChange={(e) => setAgendaDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-white border border-[#DED4C5] text-xs focus:outline-none focus:border-[#0B72D9]"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-[#1F2421] block mb-1">Hora a Bloquear</label>
                <select 
                  value={agendaTime}
                  onChange={(e) => setAgendaTime(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-white border border-[#DED4C5] text-xs focus:outline-none focus:border-[#0B72D9] cursor-pointer"
                >
                  <option value="08:00 AM">08:00 AM</option>
                  <option value="10:00 AM">10:00 AM</option>
                  <option value="12:00 PM">12:00 PM</option>
                  <option value="02:00 PM">02:00 PM</option>
                  <option value="04:00 PM">04:00 PM</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold text-[#1F2421] block mb-1">Detalle / Cliente (Para ti)</label>
                <input 
                  type="text" 
                  placeholder="Ej. Juan Pérez - Plomería"
                  value={agendaClientInfo}
                  onChange={(e) => setAgendaClientInfo(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-white border border-[#DED4C5] text-xs focus:outline-none focus:border-[#0B72D9]"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={isSavingAppointment}
                  className="w-full py-2.5 rounded-xl bg-[#0B72D9] hover:bg-[#0962BC] text-white font-bold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <Clock className="w-3.5 h-3.5" />
                  {isSavingAppointment ? 'Bloqueando...' : 'Bloquear Hora'}
                </button>
              </div>
            </form>
          </div>

          <div className="bg-[#FFFEFA] border border-[#DED4C5] rounded-3xl p-5 sm:p-6 shadow-2xs space-y-4">
            <h3 className="font-serif font-bold text-lg text-[#1F2421]">Horarios Bloqueados Actualmente</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {appointmentsList.length === 0 ? (
                <p className="text-sm text-[#756A5D] col-span-full py-4 text-center">
                  La agenda está limpia. No hay horarios bloqueados.
                </p>
              ) : (
                appointmentsList.map((appo) => (
                  <div key={appo.id} className="p-4 rounded-2xl border border-rose-200 bg-rose-50 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center gap-1.5 text-rose-700 font-bold text-sm mb-1">
                        <Calendar className="w-4 h-4" />
                        {appo.date} a las {appo.time}
                      </div>
                      <p className="text-xs text-rose-900 font-medium">
                        {appo.clientInfo}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteAppointment(appo.id)}
                      className="py-1.5 px-3 rounded-lg border border-rose-300 text-rose-700 text-xs font-bold hover:bg-rose-100 transition-colors self-start cursor-pointer"
                    >
                      Liberar Horario
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: PEDIDOS                                                 */}
      {/* ============================================================== */}
      {activeTab === 'orders' && (
        <div className="bg-[#FFFEFA] border border-[#DED4C5] rounded-3xl p-4 sm:p-6 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="font-serif font-bold text-xl text-[#1F2421]">Historial de Pedidos ({filteredOrders.length})</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setIsCreateOrderModalOpen(true)}
                className="py-1.5 px-3.5 rounded-xl bg-[#082D60] hover:bg-[#062248] text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Crear Pedido Manual</span>
              </button>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#756A5D] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar consecutivo, cliente..."
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs rounded-xl bg-[#F6F4EF] border border-[#DED4C5] focus:outline-none focus:border-[#0B72D9] w-60"
                />
              </div>
              <select
                value={orderStatusFilter}
                onChange={(e) => setOrderStatusFilter(e.target.value)}
                className="py-1.5 px-3 text-xs rounded-xl bg-[#F6F4EF] border border-[#DED4C5] font-semibold text-[#1F2421] cursor-pointer"
              >
                <option value="all">Todos los estados</option>
                <option value="Pendiente">Pendiente</option>
                <option value="En camino">En camino</option>
                <option value="En progreso">En progreso</option>
                <option value="Completado">Completado</option>
                <option value="Cancelado">Cancelado</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-[#DED4C5]/80">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F6F4EF] border-b border-[#DED4C5] text-[#756A5D] uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="py-3 px-4">Consecutivo</th>
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4">Servicio</th>
                  <th className="py-3 px-4">Monto</th>
                  <th className="py-3 px-3">Comisión</th>
                  <th className="py-3 px-3">Neto fixer</th>
                  <th className="py-3 px-4">Fixer Asignado</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DED4C5]/60 bg-[#FFFEFA]">
                {loadingOrders ? (
                  [1, 2, 3].map((n) => (
                    <tr key={`skel-ord-${n}`} className="animate-pulse">
                      <td className="py-4 px-4"><div className="h-4 bg-[#DED4C5]/40 rounded w-24" /></td>
                      <td className="py-4 px-4"><div className="h-4 bg-[#DED4C5]/40 rounded w-32" /></td>
                      <td className="py-4 px-4"><div className="h-4 bg-[#DED4C5]/40 rounded w-28" /></td>
                      <td className="py-4 px-4"><div className="h-4 bg-[#DED4C5]/40 rounded w-16" /></td>
                      <td className="py-4 px-3"><div className="h-4 bg-[#DED4C5]/40 rounded w-14" /></td>
                      <td className="py-4 px-3"><div className="h-4 bg-[#DED4C5]/40 rounded w-14" /></td>
                      <td className="py-4 px-4"><div className="h-4 bg-[#DED4C5]/40 rounded w-24" /></td>
                      <td className="py-4 px-4"><div className="h-4 bg-[#DED4C5]/40 rounded w-20" /></td>
                      <td className="py-4 px-4"><div className="h-4 bg-[#DED4C5]/40 rounded w-16 ml-auto" /></td>
                    </tr>
                  ))
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-[#756A5D]">
                      <Package className="w-8 h-8 text-[#DED4C5] mx-auto mb-2" />
                      <p className="font-semibold text-[#1F2421]">No se encontraron pedidos</p>
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((ord) => {
                    const consecutivo = ord.numero_pedido || ord.consecutiveId || ord.orderNumber || ord.codigo_seguimiento || 'FIX-PENDIENTE';
                    const officialStatus = normalizeStatus(ord.estado);
                    const isOfficialListed = ORDER_STATUS_OPTIONS.some((o) => o.value === officialStatus);
                    const ordBd = calcCommissionBreakdown(ord, commissionRate);
                    const orderBilled = Number(ord.total_facturado ?? ord.precio_regular ?? ordBd.base) || 0;
                    const isDiagOrder =
                      ord.servicio_probable?.id === 'DIAG-001' ||
                      Boolean(ord.servicio_probable?.diagnostic_required) ||
                      /visita|diagn[oó]stico/i.test(ord.servicio_probable?.service_name || '');
                    return (
                      <tr key={ord.id} className="hover:bg-[#F6F4EF]/50 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-[#082D60] whitespace-nowrap">
                          {consecutivo}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-[#1F2421] block">{ord.cliente?.nombre || 'Cliente FIXIT'}</span>
                          <span className="text-[11px] text-[#756A5D]">{ord.cliente?.telefono || 'Sin teléfono'}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-medium text-[#1F2421] block">{ord.servicio_probable?.service_name || 'Reparaciones'}</span>
                          <span className="text-[11px] text-[#756A5D] truncate block max-w-xs">{ord.direccion || 'Panamá'}</span>
                          {isDiagOrder && (
                            <div className="flex items-center gap-1 mt-1 flex-wrap">
                              <span className="text-[9px] font-bold uppercase text-[#756A5D]">
                                Visita DIAG-001:
                              </span>
                              <button
                                type="button"
                                disabled={updatingVisitOutcomeId === ord.id}
                                onClick={() => handleSetVisitOutcome(ord, 'aprobada')}
                                className={`text-[10px] font-bold px-2 py-0.5 rounded border cursor-pointer transition-colors ${
                                  ord.visitOutcome === 'aprobada'
                                    ? 'bg-[#53653D] text-white border-[#53653D]'
                                    : 'bg-[#FFFEFA] text-[#53653D] border-[#53653D]/40 hover:bg-[#53653D]/10'
                                }`}
                              >
                                Aprobada
                              </button>
                              <button
                                type="button"
                                disabled={updatingVisitOutcomeId === ord.id}
                                onClick={() => handleSetVisitOutcome(ord, 'no_aprobada')}
                                className={`text-[10px] font-bold px-2 py-0.5 rounded border cursor-pointer transition-colors ${
                                  ord.visitOutcome === 'no_aprobada'
                                    ? 'bg-amber-600 text-white border-amber-700'
                                    : 'bg-[#FFFEFA] text-amber-800 border-amber-300 hover:bg-amber-50'
                                }`}
                              >
                                No aprobada
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 font-serif font-bold text-[#1F2421] whitespace-nowrap">
                          <span>${orderBilled.toFixed(2)} USD</span>
                          {ordBd.materiales_reembolso > 0 && (
                            <span className="block text-[10px] font-sans font-semibold text-[#0B72D9]">
                              MO: ${ordBd.base.toFixed(2)} + Mat: ${ordBd.materiales_reembolso.toFixed(2)}
                            </span>
                          )}
                          {ord.estado_pago === 'Acreditado a trabajo' && (
                            <span className="block text-[9px] font-sans font-bold text-[#53653D]">
                              $25.00 acreditados
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-[#082D60] whitespace-nowrap">
                          <span>${ordBd.comision_fixit.toFixed(2)}</span>
                          {ordBd.isVisitUnapproved && (
                            <span className="block text-[9px] font-sans font-bold text-amber-700">
                              Fijo $10/$15
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-[#53653D] whitespace-nowrap">
                          <span>${ordBd.costo_tecnico.toFixed(2)}</span>
                          {ordBd.materiales_reembolso > 0 && (
                            <span className="block text-[9px] font-sans font-semibold text-[#756A5D]">
                              incl. +${ordBd.materiales_reembolso.toFixed(2)} mat. 0%
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-[#756A5D]">
                          {ord.tecnico_nombre || ord.tecnico_asignado ? (
                            <span className="font-semibold text-[#1F2421]">{ord.tecnico_nombre || ord.tecnico_asignado}</span>
                          ) : (
                            <span className="text-[11px] italic text-[#B98A43]">Sin asignar</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <select
                            value={officialStatus}
                            onChange={(e) => handleUpdateOrderStatus(ord.id, e.target.value)}
                            className="text-[11px] font-bold py-1 px-2 rounded-lg bg-[#F6F4EF] border border-[#DED4C5] text-[#1F2421] cursor-pointer"
                          >
                            {!isOfficialListed && (
                              <option value={officialStatus}>
                                {OFFICIAL_STATUS_DISPLAY[officialStatus]?.es || ord.estado || 'Actual'}
                              </option>
                            )}
                            {ORDER_STATUS_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {ord.cliente?.telefono && (
                              <a
                                href={getWhatsAppLink(ord.cliente.telefono, `Hola ${ord.cliente.nombre || ''}, respecto a tu pedido ${consecutivo}.`)}
                                target="_blank"
                                rel="noreferrer"
                                title="Contactar al cliente por WhatsApp sobre su pedido"
                                className="p-1.5 rounded-lg bg-[#53653D]/10 text-[#53653D] hover:bg-[#53653D]/20 transition-colors"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                              </a>
                            )}
                            {(() => {
                              const assignedFixer = resolveAssignedFixerForOrder(ord);
                              if (!assignedFixer) return null;
                              return (
                                <a
                                  href={getFixerShareLink(assignedFixer, ord.cliente?.telefono)}
                                  target="_blank"
                                  rel="noreferrer"
                                  title={`Enviar ficha verificada del técnico (${assignedFixer.nombre}) al cliente por WhatsApp`}
                                  className="py-1 px-2.5 rounded-lg bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#128C7E] transition-colors text-[11px] font-bold flex items-center gap-1"
                                >
                                  <Share2 className="w-3.5 h-3.5" />
                                  <span>Enviar fixer al cliente</span>
                                </a>
                              );
                            })()}
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => openNewPaymentModal({ order: ord })}
                                title="Registrar pago para este pedido"
                                className="py-1 px-2.5 rounded-lg bg-[#53653D]/15 text-[#53653D] hover:bg-[#53653D]/25 transition-colors cursor-pointer text-[11px] font-bold flex items-center gap-1"
                              >
                                <DollarSign className="w-3.5 h-3.5" />
                                <span>Registrar pago</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => openAssignModal(ord)}
                              title={ord.tecnico_nombre || ord.tecnico_asignado ? 'Reasignar técnico' : 'Asignar técnico'}
                              className="py-1 px-2.5 rounded-lg bg-[#0B72D9]/10 text-[#0B72D9] hover:bg-[#0B72D9]/20 transition-colors cursor-pointer text-[11px] font-bold flex items-center gap-1"
                            >
                              <User className="w-3.5 h-3.5" />
                              Asignar
                            </button>
                            <button
                              type="button"
                              onClick={() => setOrderToManage(ord)}
                              className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: CLIENTES                                                */}
      {/* ============================================================== */}
      {activeTab === 'clients' && (
        <div className="bg-[#FFFEFA] border border-[#DED4C5] rounded-3xl p-4 sm:p-6 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="font-serif font-bold text-xl text-[#1F2421]">Clientes Registrados ({filteredClients.length})</h2>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#756A5D] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar por nombre..."
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs rounded-xl bg-[#F6F4EF] border border-[#DED4C5] focus:outline-none focus:border-[#0B72D9] w-64"
                />
              </div>
              <button
                type="button"
                onClick={handleExportClientsCSV}
                className="py-1.5 px-3.5 rounded-xl bg-[#53653D] hover:bg-[#435331] text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exportar a CSV</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-[#DED4C5]/80">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F6F4EF] border-b border-[#DED4C5] text-[#756A5D] uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="py-3 px-4">Nombre</th>
                  <th className="py-3 px-4">Correo</th>
                  <th className="py-3 px-4">Teléfono</th>
                  <th className="py-3 px-4 text-right">Contacto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DED4C5]/60 bg-[#FFFEFA]">
                {filteredClients.map((c) => (
                  <tr key={c.id || c.uid} className="hover:bg-[#F6F4EF]/50 transition-colors">
                    <td className="py-3 px-4 font-bold text-[#1F2421]">{c.displayName || 'Cliente'}</td>
                    <td className="py-3 px-4 text-[#756A5D]">{c.email || 'Sin correo'}</td>
                    <td className="py-3 px-4 font-mono text-[#1F2421]">{c.phone || 'Sin teléfono'}</td>
                    <td className="py-3 px-4 text-right">
                      {c.phone && (
                        <a
                          href={getWhatsAppLink(c.phone, `Hola ${c.displayName || ''}, te saludamos de FIXIT Panamá.`)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex p-1.5 rounded-lg bg-[#53653D]/10 text-[#53653D] hover:bg-[#53653D]/20 transition-colors"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 4: FIXERS                                                  */}
      {/* ============================================================== */}
      {activeTab === 'fixers' && (
        <div className="bg-[#FFFEFA] border border-[#DED4C5] rounded-3xl p-4 sm:p-6 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="font-serif font-bold text-xl text-[#1F2421]">
                Directorio de Fixers ({filteredFixers.length})
              </h2>
              <p className="text-xs text-[#756A5D] mt-0.5">
                Los técnicos auto-registrados con código de invitación muestran <strong>Con acceso</strong> y reciben asignaciones en tiempo real.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setIsAddFixerModalOpen(true)}
                className="py-1.5 px-3.5 rounded-xl bg-[#0B72D9] hover:bg-[#0962BC] text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nuevo Fixer</span>
              </button>
            </div>
          </div>

          {/* Control de Tasa de Comisión Fixit y Piso Mínimo (solo ADMIN) */}
          {isAdmin && (
            <div className="p-4 rounded-2xl bg-[#F6F4EF] border border-[#DED4C5] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#082D60]">
                  <Percent className="w-4 h-4 text-[#0B72D9]" />
                  <span>Tasa de Comisión Fixit (sobre mano de obra) y Piso Mínimo</span>
                  {!commissionDocExists && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                      Default 15% · Piso $3.00 activo
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#756A5D]">
                  Fixit cobra el 100% al cliente y liquida el neto residual al fixer (materiales 0% excluidos). Piso mínimo por servicio independiente: <strong>${minStandaloneCommission.toFixed(2)} USD</strong>. Guardado en <code>settings/fixer_commission</code>.
                  {commissionMeta?.updatedBy ? ` · Actualizado por ${commissionMeta.updatedBy}` : ''}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {isEditingCommission ? (
                  <form onSubmit={handleSaveCommissionRate} className="flex items-center gap-2 flex-wrap">
                    <div className="relative flex items-center" title="Tasa de comisión (0-100%)">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step="0.5"
                        value={commissionInputPct}
                        onChange={(e) => setCommissionInputPct(e.target.value)}
                        className="w-20 pr-6 pl-2.5 py-1.5 rounded-xl bg-[#FFFEFA] border border-[#0B72D9] font-mono font-bold text-sm text-[#082D60] focus:outline-hidden"
                      />
                      <span className="absolute right-2.5 text-xs font-bold text-[#756A5D]">%</span>
                    </div>
                    <div className="relative flex items-center" title="Comisión mínima por servicio independiente (USD)">
                      <span className="absolute left-2.5 text-xs font-bold text-[#756A5D]">$</span>
                      <input
                        type="number"
                        min={0}
                        step="0.5"
                        value={minCommissionInputUsd}
                        onChange={(e) => setMinCommissionInputUsd(e.target.value)}
                        className="w-20 pl-6 pr-2.5 py-1.5 rounded-xl bg-[#FFFEFA] border border-[#0B72D9] font-mono font-bold text-sm text-[#082D60] focus:outline-hidden"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isSavingCommission}
                      className="py-1.5 px-3 rounded-xl bg-[#53653D] hover:bg-[#435331] text-white font-bold text-xs cursor-pointer transition-colors disabled:opacity-50"
                    >
                      {isSavingCommission ? 'Guardando...' : 'Guardar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingCommission(false);
                        setCommissionInputPct(String(round2(commissionRate * 100)));
                        setMinCommissionInputUsd(minStandaloneCommission.toFixed(2));
                      }}
                      className="py-1.5 px-2.5 rounded-xl border border-[#DED4C5] bg-[#FFFEFA] text-[#756A5D] hover:text-[#1F2421] font-bold text-xs cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </form>
                ) : (
                  <>
                    <span className="font-mono font-bold text-sm px-3 py-1.5 rounded-xl bg-[#FFFEFA] border border-[#DED4C5] text-[#082D60]">
                      {round2(commissionRate * 100)}% · Mín ${minStandaloneCommission.toFixed(2)}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setCommissionInputPct(String(round2(commissionRate * 100)));
                        setMinCommissionInputUsd(minStandaloneCommission.toFixed(2));
                        setIsEditingCommission(true);
                      }}
                      className="py-1.5 px-3 rounded-xl border border-[#DED4C5] bg-[#FFFEFA] hover:bg-[#DED4C5]/30 text-[#082D60] font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Editar tasa / piso</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Desglose por Fixer: Triple Facturado / Comisiones / Neto (Mes + Histórico, patrón quotesByFixer) */}
          {fixerCommissionBreakdown.length > 0 && (
            <div className="bg-[#F6F4EF]/70 border border-[#DED4C5] rounded-2xl p-4 space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#082D60]">
                  Liquidación y Comisiones por Fixer — Triple Facturado / Comisiones ({round2(commissionRate * 100)}%) / Neto
                </h3>
                <span className="text-[11px] text-[#756A5D]">
                  Mes actual ({currentMonthPrefix}) + Histórico acumulado
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {fixerCommissionBreakdown.map((row) => (
                  <div
                    key={row.key}
                    className="p-3.5 rounded-xl bg-[#FFFEFA] border border-[#DED4C5]/80 space-y-2 shadow-2xs"
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-[#DED4C5]/50 pb-1.5">
                      <div className="min-w-0">
                        <span className="font-bold text-xs text-[#1F2421] truncate block">
                          {row.nombre}
                        </span>
                        {row.especialidad && (
                          <span className="text-[10px] text-[#756A5D] block truncate">
                            {row.especialidad}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#082D60]/10 text-[#082D60] shrink-0">
                        {row.historico.count} {row.historico.count === 1 ? 'pedido' : 'pedidos'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="p-2 rounded-lg bg-[#F6F4EF] border border-[#DED4C5]/60 space-y-0.5">
                        <span className="text-[10px] font-bold uppercase text-[#082D60] block">
                          Mes ({currentMonthPrefix})
                        </span>
                        <span className="text-[#1F2421] block">
                          Facturado: <strong>${row.mes.facturado.toFixed(2)}</strong>
                        </span>
                        <span className="text-[#B98A43] block">
                          Comisiones: <strong>${row.mes.comisiones.toFixed(2)}</strong>
                        </span>
                        <span className="text-[#53653D] font-bold block">
                          Neto: ${row.mes.neto.toFixed(2)}
                        </span>
                      </div>

                      <div className="p-2 rounded-lg bg-[#F6F4EF] border border-[#DED4C5]/60 space-y-0.5">
                        <span className="text-[10px] font-bold uppercase text-[#756A5D] block">
                          Histórico
                        </span>
                        <span className="text-[#1F2421] block">
                          Facturado: <strong>${row.historico.facturado.toFixed(2)}</strong>
                        </span>
                        <span className="text-[#B98A43] block">
                          Comisiones: <strong>${row.historico.comisiones.toFixed(2)}</strong>
                        </span>
                        <span className="text-[#53653D] font-bold block">
                          Neto: ${row.historico.neto.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Gestor de Código de Invitación (solo ADMIN) */}
          {isAdmin && (
            <div className="p-4 rounded-2xl bg-[#F6F4EF] border border-[#DED4C5] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#082D60]">
                  <KeyRound className="w-4 h-4 text-[#0B72D9]" />
                  <span>Código de Invitación para Auto-Registro de Fixers</span>
                </div>
                <p className="text-[11px] text-[#756A5D]">
                  Comparte este código con tus técnicos para que se registren desde su teléfono y vinculen su cuenta <code>fixers/&#123;uid&#125;</code>.
                  {fixerInviteMeta?.updatedBy ? ` · Actualizado por ${fixerInviteMeta.updatedBy}` : ''}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {fixerInviteCode ? (
                  <>
                    <span className="font-mono font-bold text-sm px-3 py-1.5 rounded-xl bg-[#FFFEFA] border border-[#DED4C5] text-[#082D60] tracking-wider select-all">
                      {fixerInviteCode}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyInviteCode}
                      title="Copiar código al portapapeles"
                      className="py-1.5 px-3 rounded-xl bg-[#082D60] hover:bg-[#07244D] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar</span>
                    </button>
                    <button
                      type="button"
                      disabled={isSavingInviteCode}
                      onClick={handleGenerateInviteCode}
                      title="Generar un nuevo código e invalidar el anterior"
                      className="py-1.5 px-3 rounded-xl border border-[#DED4C5] bg-[#FFFEFA] hover:bg-[#DED4C5]/30 text-[#1F2421] font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSavingInviteCode ? 'animate-spin' : ''}`} />
                      <span>Regenerar</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    disabled={isSavingInviteCode}
                    onClick={handleGenerateInviteCode}
                    className="py-2 px-3.5 rounded-xl bg-[#082D60] hover:bg-[#07244D] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>{isSavingInviteCode ? 'Generando...' : 'Generar código'}</span>
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="overflow-x-auto rounded-2xl border border-[#DED4C5]/80">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F6F4EF] border-b border-[#DED4C5] text-[#756A5D] uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="py-3 px-4">Técnico / Cédula</th>
                  <th className="py-3 px-4">Especialidad & Idoneidad</th>
                  <th className="py-3 px-4">Teléfono / Zona</th>
                  <th className="py-3 px-4">Acceso App</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DED4C5]/60 bg-[#FFFEFA]">
                {filteredFixers.map((fixer) => {
                  const hasAppAccess = Boolean(fixerAccessMap[fixer.id]);
                  const initial = (fixer.nombre || 'F').trim().charAt(0).toUpperCase();
                  const hasIdoneidad =
                    Boolean(fixer.idoneidad_tipo) &&
                    fixer.idoneidad_tipo?.toLowerCase() !== 'ninguna';

                  return (
                    <tr key={fixer.id} className="hover:bg-[#F6F4EF]/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-[#082D60]/10 border border-[#DED4C5] text-[#082D60] font-serif font-bold text-sm flex items-center justify-center overflow-hidden shrink-0">
                            {fixer.photoURL ? (
                              <img
                                src={fixer.photoURL}
                                alt={fixer.nombre}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span>{initial}</span>
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-[#1F2421] block">{fixer.nombre}</span>
                            {fixer.cedula ? (
                              <span className="text-[11px] font-mono text-[#756A5D] flex items-center gap-1">
                                <CreditCard className="w-3 h-3 text-[#756A5D]" />
                                <span>Cédula: {fixer.cedula}</span>
                              </span>
                            ) : (
                              <span className="text-[10px] text-[#756A5D] font-mono">
                                ID: {fixer.id}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-[#0B72D9] block">
                          {fixer.especialidad}
                        </span>
                        {hasIdoneidad ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#53653D] bg-[#53653D]/10 border border-[#53653D]/25 px-2 py-0.5 rounded-md mt-0.5">
                            <Award className="w-3 h-3" />
                            <span>
                              Idoneidad: {fixer.idoneidad_tipo}
                              {fixer.idoneidad_numero ? ` · ${fixer.idoneidad_numero}` : ''}
                            </span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-[#756A5D]">Sin idoneidad registrada</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-[#1F2421] block">
                          {fixer.telefono || 'Sin teléfono'}
                        </span>
                        {fixer.zona_cobertura && (
                          <span className="text-[11px] text-[#756A5D] truncate block max-w-[180px]">
                            {fixer.zona_cobertura}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {hasAppAccess ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#53653D]/15 text-[#53653D] border border-[#53653D]/30">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Con acceso</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                            <AlertCircle className="w-3 h-3" />
                            <span>Sin acceso</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-[#53653D]/10 text-[#53653D] border-[#53653D]/30">
                          {fixer.disponibilidad}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <a
                            href={getFixerShareLink(fixer)}
                            target="_blank"
                            rel="noreferrer"
                            title={`Compartir ficha verificada de ${fixer.nombre} por WhatsApp`}
                            className="py-1 px-2.5 rounded-lg bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#128C7E] font-bold text-[11px] inline-flex items-center gap-1 transition-colors"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                            <span>Compartir</span>
                          </a>
                          <button
                            type="button"
                            onClick={() => setFixerToDelete(fixer)}
                            title="Eliminar fixer"
                            className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 4: COTIZACIONES E INGRESOS (COLECCIÓN QUOTES)              */}
      {/* ============================================================== */}
      {activeTab === 'quotes' && (
        <div className="space-y-4">
          {/* Resumen financiero de cotizaciones */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-[#FFFEFA] border border-[#DED4C5] rounded-2xl p-4 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#756A5D] block">
                Volumen Total Cotizado
              </span>
              <span className="font-serif font-bold text-2xl text-[#082D60] mt-1 block">
                ${totalQuotedRevenue.toFixed(2)} USD
              </span>
              <span className="text-[11px] text-[#756A5D] mt-0.5 block">
                {quotes.length} {quotes.length === 1 ? 'cotización emitida' : 'cotizaciones emitidas'}
              </span>
            </div>

            <div className="bg-[#FFFEFA] border border-[#DED4C5] rounded-2xl p-4 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#756A5D] block">
                Anticipos 50% Requeridos
              </span>
              <span className="font-serif font-bold text-2xl text-[#0B72D9] mt-1 block">
                ${(totalQuotedRevenue * 0.5).toFixed(2)} USD
              </span>
              <span className="text-[11px] text-[#756A5D] mt-0.5 block">
                Política oficial para agendar e iniciar
              </span>
            </div>

            <div className="bg-[#FFFEFA] border border-[#DED4C5] rounded-2xl p-4 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#756A5D] block">
                Cotizaciones Aprobadas
              </span>
              <span className="font-serif font-bold text-2xl text-[#53653D] mt-1 block">
                ${totalApprovedQuotesRevenue.toFixed(2)} USD
              </span>
              <span className="text-[11px] text-[#53653D] font-semibold mt-0.5 block">
                {quotes.filter((q) => q.estado === 'Aprobada').length} aprobadas
              </span>
            </div>
          </div>

          {/* Desglose por Fixer */}
          {quotesByFixer.length > 0 && (
            <div className="bg-[#FFFEFA] border border-[#DED4C5] rounded-2xl p-4 shadow-2xs space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#082D60]">
                Rendimiento de Cotización por Fixer / Emisor
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {quotesByFixer.map((row) => (
                  <div
                    key={row.nombre}
                    className="p-3 rounded-xl bg-[#F6F4EF] border border-[#DED4C5]/70 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <span className="font-bold text-xs text-[#1F2421] truncate block">
                        {row.nombre}
                      </span>
                      <span className="text-[10px] text-[#756A5D]">
                        {row.count} {row.count === 1 ? 'folio' : 'folios'}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-bold text-xs text-[#082D60] block">
                        ${row.totalUsd.toFixed(2)}
                      </span>
                      <span className="text-[10px] font-semibold text-[#53653D]">
                        Aprob: ${row.approvedUsd.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Barra de búsqueda y filtro de estado */}
          <div className="bg-[#FFFEFA] border border-[#DED4C5] rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#756A5D] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por folio FIXIT-YYYY-MM-###, cliente, teléfono, fixer o pedido..."
                value={quoteSearch}
                onChange={(e) => setQuoteSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-[#DED4C5] bg-[#F6F4EF] text-xs text-[#1F2421] focus:outline-hidden focus:border-[#0B72D9]"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={quoteStatusFilter}
                onChange={(e) => setQuoteStatusFilter(e.target.value)}
                className="py-2 px-3 rounded-xl border border-[#DED4C5] bg-[#F6F4EF] text-xs font-semibold text-[#1F2421]"
              >
                <option value="all">Todos los estados</option>
                <option value="Borrador">Borrador</option>
                <option value="En preparación">En preparación</option>
                <option value="Enviada">Enviada</option>
                <option value="Pendiente de aprobación">Pendiente de aprobación</option>
                <option value="Aprobada">Aprobada</option>
                <option value="Rechazada">Rechazada</option>
                <option value="Vencida">Vencida</option>
              </select>

              {onOpenFixerView && (
                <button
                  type="button"
                  onClick={onOpenFixerView}
                  className="py-2 px-3.5 rounded-xl bg-[#0B72D9] hover:bg-[#0962BC] text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Nueva Cotización</span>
                </button>
              )}
            </div>
          </div>

          {/* Tabla de cotizaciones emitidas */}
          <div className="bg-[#FFFEFA] border border-[#DED4C5] rounded-3xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F6F4EF] border-b border-[#DED4C5] text-[10px] font-bold uppercase tracking-wider text-[#756A5D]">
                    <th className="py-3.5 px-4">Folio / Fecha</th>
                    <th className="py-3.5 px-4">Cliente & Ubicación</th>
                    <th className="py-3.5 px-4">Pedido</th>
                    <th className="py-3.5 px-4">Fixer / Emisor</th>
                    <th className="py-3.5 px-4">Conceptos</th>
                    <th className="py-3.5 px-4">Total / Anticipo 50%</th>
                    <th className="py-3.5 px-3">Comisión</th>
                    <th className="py-3.5 px-3">Neto fixer</th>
                    <th className="py-3.5 px-4">Estado</th>
                    <th className="py-3.5 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DED4C5]/60 text-xs">
                  {filteredQuotes.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-[#756A5D]">
                        No hay cotizaciones registradas con este filtro.
                      </td>
                    </tr>
                  ) : (
                    filteredQuotes.map((quote) => {
                      const anticipo = quote.anticipo ?? Number(quote.total || 0) * 0.5;
                      const qBd = calcCommissionBreakdown(quote, commissionRate);
                      const isLaborBase = isLaborCommissionBase(quote);
                      const cleanPhone = (quote.cliente_telefono || '').replace(/\D/g, '');
                      const waPhone = cleanPhone
                        ? cleanPhone.startsWith('507')
                          ? cleanPhone
                          : `507${cleanPhone}`
                        : '';

                      return (
                        <tr key={quote.id} className="hover:bg-[#F6F4EF]/60 transition-colors">
                          <td className="py-3.5 px-4">
                            <span className="font-mono font-bold text-[#082D60] block">
                              {quote.numero_cotizacion}
                            </span>
                            <span className="text-[11px] text-[#756A5D]">
                              {quote.fecha_emision}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-[#1F2421]">
                              {quote.cliente_nombre || 'Consumidor Final'}
                            </div>
                            <div className="text-[11px] text-[#756A5D]">
                              {quote.cliente_telefono || '—'}
                              {quote.cliente_ubicacion ? ` · ${quote.cliente_ubicacion}` : ''}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            {quote.solicitud_codigo ? (
                              <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#082D60]/10 text-[#082D60]">
                                {quote.solicitud_codigo}
                              </span>
                            ) : (
                              <span className="text-[11px] text-[#756A5D]">Directa</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-semibold text-[#1F2421] block">
                              {quote.tecnico_nombre || quote.creado_por || 'Fixer FIXIT'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 max-w-[220px]">
                            <span className="text-[11px] text-[#1F2421] font-medium block truncate">
                              {quote.items?.map((i) => i.descripcion).join(', ') || 'Servicios varios'}
                            </span>
                            <span className="text-[10px] text-[#756A5D]">
                              {quote.items?.length || 0} {(quote.items?.length || 0) === 1 ? 'ítem' : 'ítems'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-serif font-bold text-sm text-[#1F2421] block">
                              ${Number(quote.total || 0).toFixed(2)} USD
                            </span>
                            <span className="text-[10px] font-bold text-[#0B72D9]">
                              50%: ${Number(anticipo).toFixed(2)}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              <span className="font-mono font-bold text-xs text-[#082D60]">
                                ${qBd.comision_fixit.toFixed(2)}
                              </span>
                              {isLaborBase && (
                                <span
                                  title={`Calculada sobre mano de obra ($${qBd.base.toFixed(2)})`}
                                  className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#0B72D9]/15 text-[#082D60] border border-[#0B72D9]/30"
                                >
                                  s/MO
                                </span>
                              )}
                            </div>
                            {qBd.upsells_neto_fixit > 0 && (
                              <span className="block text-[9px] font-semibold text-[#53653D]">
                                incl. +${qBd.upsells_neto_fixit.toFixed(2)} extra
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-3 whitespace-nowrap">
                            <span className="font-mono font-bold text-xs text-[#53653D] block">
                              ${qBd.costo_tecnico.toFixed(2)}
                            </span>
                            {qBd.materiales_reembolso > 0 && (
                              <span className="block text-[9px] text-[#756A5D]">
                                +${qBd.materiales_reembolso.toFixed(2)} mat. 0%
                              </span>
                            )}
                            {qBd.upsells_bono_fixer > 0 && (
                              <span className="block text-[9px] font-semibold text-[#53653D]">
                                +${qBd.upsells_bono_fixer.toFixed(2)} bono extra
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            {(() => {
                              const rawStatus = String(quote.estado || '').toLowerCase();
                              const normalizedQuoteStatus: QuoteStatus = rawStatus.includes('aprobad')
                                ? 'Aprobada'
                                : rawStatus.includes('rechaz')
                                ? 'Rechazada'
                                : rawStatus.includes('borrador')
                                ? 'Borrador'
                                : rawStatus.includes('preparaci')
                                ? 'En preparación'
                                : rawStatus.includes('pendiente')
                                ? 'Pendiente de aprobación'
                                : rawStatus.includes('vencid')
                                ? 'Vencida'
                                : 'Enviada';

                              return (
                                <select
                                  value={normalizedQuoteStatus}
                                  onChange={(e) =>
                                    handleUpdateQuoteStatus(quote, e.target.value as QuoteStatus)
                                  }
                                  className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border cursor-pointer ${
                                    normalizedQuoteStatus === 'Aprobada'
                                      ? 'bg-[#53653D]/15 text-[#53653D] border-[#53653D]/30'
                                      : normalizedQuoteStatus === 'Rechazada' || normalizedQuoteStatus === 'Vencida'
                                      ? 'bg-rose-100 text-rose-700 border-rose-200'
                                      : normalizedQuoteStatus === 'Borrador' || normalizedQuoteStatus === 'En preparación'
                                      ? 'bg-amber-100 text-amber-800 border-amber-200'
                                      : 'bg-[#0B72D9]/10 text-[#0B72D9] border-[#0B72D9]/30'
                                  }`}
                                >
                                  <option value="Borrador">Borrador</option>
                                  <option value="En preparación">En preparación</option>
                                  <option value="Enviada">Enviada</option>
                                  <option value="Pendiente de aprobación">Pendiente de aprobación</option>
                                  <option value="Aprobada">Aprobada</option>
                                  <option value="Rechazada">Rechazada</option>
                                  <option value="Vencida">Vencida</option>
                                </select>
                              );
                            })()}
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {waPhone && (
                                <a
                                  href={`https://wa.me/${waPhone}?text=${encodeURIComponent(
                                    `Hola ${quote.cliente_nombre || ''}, le escribimos de FIXIT Panamá respecto a su cotización ${quote.numero_cotizacion} por $${Number(quote.total || 0).toFixed(2)} USD.`
                                  )}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 py-1.5 px-2.5 rounded-lg bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#128C7E] font-bold text-[11px] transition-colors"
                                >
                                  <Phone className="w-3 h-3" />
                                  <span>WhatsApp</span>
                                </a>
                              )}
                              {isAdmin && (
                                <button
                                  type="button"
                                  onClick={() => openNewPaymentModal({ quote })}
                                  title="Registrar pago asociado a esta cotización"
                                  className="py-1.5 px-2.5 rounded-lg bg-[#53653D]/15 hover:bg-[#53653D]/25 text-[#53653D] font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                                >
                                  <DollarSign className="w-3 h-3" />
                                  <span>Registrar pago</span>
                                </button>
                              )}
                              {isAdmin && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteQuote(quote)}
                                  title="Eliminar cotización"
                                  className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 5: PAGOS E INGRESOS REALES (COLECCIÓN PAYMENTS)            */}
      {/* ============================================================== */}
      {activeTab === 'payments' && (
        <div className="space-y-4">
          {/* Controles mensuales y tarjetas de resumen */}
          <div className="bg-[#FFFEFA] border border-[#DED4C5] rounded-3xl p-4 sm:p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-serif font-bold text-xl text-[#1F2421] flex items-center gap-2">
                  <Banknote className="w-5 h-5 text-[#53653D]" />
                  <span>Control Mensual de Pagos e Ingresos Reales</span>
                </h2>
                <p className="text-xs text-[#756A5D] mt-0.5">
                  Solo los pagos en estado <strong>Confirmado</strong> se contabilizan como ingreso real. Los pedidos de prueba sin pago no inflan esta métrica.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-2 bg-[#F6F4EF] border border-[#DED4C5] rounded-xl px-3 py-1.5 text-xs font-semibold text-[#1F2421]">
                  <Calendar className="w-3.5 h-3.5 text-[#082D60]" />
                  <span>Mes:</span>
                  <input
                    type="month"
                    value={paymentMonthFilter}
                    onChange={(e) => setPaymentMonthFilter(e.target.value)}
                    className="bg-transparent font-mono font-bold text-[#082D60] focus:outline-hidden cursor-pointer"
                  />
                </label>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => openNewPaymentModal()}
                    className="py-2 px-3.5 rounded-xl bg-[#53653D] hover:bg-[#435331] text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Registrar Pago</span>
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-[#53653D]/10 border border-[#53653D]/30 rounded-2xl p-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#53653D] block">
                  Confirmado (mes {paymentMonthFilter || 'todos'})
                </span>
                <span className="font-serif font-bold text-2xl text-[#53653D] mt-1 block">
                  ${monthlyPaymentsSummary.confirmedSum.toFixed(2)} USD
                </span>
                <span className="text-[11px] font-semibold text-[#53653D] mt-0.5 block">
                  {monthlyPaymentsSummary.confirmedCount}{' '}
                  {monthlyPaymentsSummary.confirmedCount === 1
                    ? 'pago confirmado'
                    : 'pagos confirmados'}
                </span>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">
                  Pendiente (mes {paymentMonthFilter || 'todos'})
                </span>
                <span className="font-serif font-bold text-2xl text-amber-800 mt-1 block">
                  ${monthlyPaymentsSummary.pendingSum.toFixed(2)} USD
                </span>
                <span className="text-[11px] font-semibold text-amber-700 mt-0.5 block">
                  {monthlyPaymentsSummary.pendingCount}{' '}
                  {monthlyPaymentsSummary.pendingCount === 1
                    ? 'pago pendiente'
                    : 'pagos pendientes'}
                </span>
              </div>

              <div className="bg-[#F6F4EF] border border-[#DED4C5] rounded-2xl p-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#756A5D] block">
                  Total Registros en el Mes
                </span>
                <span className="font-serif font-bold text-2xl text-[#082D60] mt-1 block">
                  ${(monthlyPaymentsSummary.confirmedSum + monthlyPaymentsSummary.pendingSum).toFixed(2)} USD
                </span>
                <span className="text-[11px] text-[#756A5D] mt-0.5 block">
                  {filteredPayments.length} {filteredPayments.length === 1 ? 'transacción listada' : 'transacciones listadas'}
                </span>
              </div>
            </div>
          </div>

          {/* Buscador de pagos */}
          <div className="bg-[#FFFEFA] border border-[#DED4C5] rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#756A5D] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por pedido, cotización, cliente, método o referencia..."
                value={paymentSearch}
                onChange={(e) => setPaymentSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-[#DED4C5] bg-[#F6F4EF] text-xs text-[#1F2421] focus:outline-hidden focus:border-[#0B72D9]"
              />
            </div>
            {paymentMonthFilter && (
              <button
                type="button"
                onClick={() => setPaymentMonthFilter('')}
                className="py-2 px-3 rounded-xl border border-[#DED4C5] hover:bg-[#F6F4EF] text-xs font-semibold text-[#756A5D] cursor-pointer"
              >
                Ver todos los meses
              </button>
            )}
          </div>

          {/* Tabla de pagos */}
          <div className="bg-[#FFFEFA] border border-[#DED4C5] rounded-3xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F6F4EF] border-b border-[#DED4C5] text-[10px] font-bold uppercase tracking-wider text-[#756A5D]">
                    <th className="py-3.5 px-4">Fecha</th>
                    <th className="py-3.5 px-4">Pedido</th>
                    <th className="py-3.5 px-4">Cotización</th>
                    <th className="py-3.5 px-4">Cliente</th>
                    <th className="py-3.5 px-4">Método</th>
                    <th className="py-3.5 px-4">Monto</th>
                    <th className="py-3.5 px-3">Neto Fixit est.</th>
                    <th className="py-3.5 px-4">Estado</th>
                    <th className="py-3.5 px-4">Referencia</th>
                    <th className="py-3.5 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DED4C5]/60 text-xs">
                  {filteredPayments.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-10 text-center text-[#756A5D]">
                        No hay pagos registrados para el período o filtro seleccionado.
                      </td>
                    </tr>
                  ) : (
                    filteredPayments.map((pay) => {
                      const rawStatus = String(pay.estado || '').toLowerCase();
                      const isConfirmed = rawStatus === 'confirmado';
                      const isPending = rawStatus === 'pendiente';
                      const linkedOrd = orders.find(
                        (o) =>
                          o.id === pay.solicitud_id ||
                          (pay.solicitud_codigo &&
                            (o.numero_pedido === pay.solicitud_codigo ||
                              o.codigo_seguimiento === pay.solicitud_codigo))
                      );
                      const displayClient =
                        pay.cliente_nombre || linkedOrd?.cliente?.nombre || 'Cliente FIXIT';
                      const displayDate = pay.fecha
                        ? pay.fecha.slice(0, 10)
                        : '—';

                      return (
                        <tr key={pay.id} className="hover:bg-[#F6F4EF]/60 transition-colors">
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="font-mono font-semibold text-[#1F2421] block">
                              {displayDate}
                            </span>
                            <span className="text-[10px] text-[#756A5D] font-mono">
                              {pay.id}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="font-mono font-bold text-[#082D60]">
                              {pay.solicitud_codigo || pay.solicitud_id || '—'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {pay.cotizacion_codigo || pay.cotizacion_id ? (
                              <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#082D60]/10 text-[#082D60]">
                                {pay.cotizacion_codigo || pay.cotizacion_id}
                              </span>
                            ) : (
                              <span className="text-[11px] text-[#756A5D]">—</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-[#1F2421] block">
                              {displayClient}
                            </span>
                            {pay.notas && (
                              <span className="text-[10px] text-[#756A5D] truncate block max-w-[180px]">
                                {pay.notas}
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="font-semibold text-[#1F2421]">
                              {pay.metodo}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="font-serif font-bold text-sm text-[#1F2421]">
                              ${Number(pay.monto || 0).toFixed(2)}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 whitespace-nowrap">
                            {isConfirmed ? (
                              <div>
                                <span className="font-mono font-bold text-xs text-[#53653D] block">
                                  ${calcNet(Number(pay.monto) || 0, commissionRate).toFixed(2)}
                                </span>
                                <span className="text-[10px] text-[#756A5D]">
                                  Com ({round2(commissionRate * 100)}%): ${calcCommission(Number(pay.monto) || 0, commissionRate).toFixed(2)}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[11px] text-[#756A5D]">—</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span
                              className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                                isConfirmed
                                  ? 'bg-[#53653D]/15 text-[#53653D] border-[#53653D]/30'
                                  : isPending
                                  ? 'bg-amber-100 text-amber-800 border-amber-200'
                                  : 'bg-rose-100 text-rose-700 border-rose-200'
                              }`}
                            >
                              {isConfirmed ? 'Confirmado' : isPending ? 'Pendiente' : pay.estado}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[11px] text-[#756A5D]">
                            {pay.referencia || pay.referencia_transaccion || '—'}
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            {isAdmin ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => openEditPaymentModal(pay)}
                                  title="Editar pago"
                                  className="py-1 px-2.5 rounded-lg border border-[#DED4C5] hover:bg-[#F6F4EF] text-[#082D60] font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                                >
                                  <Edit2 className="w-3 h-3" />
                                  <span>Editar</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeletePayment(pay)}
                                  title="Eliminar pago"
                                  className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-[11px] text-[#756A5D]">Solo lectura</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 1: REGISTRAR NUEVO FIXER                                 */}
      {/* ============================================================== */}
      {isAddFixerModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#082D60]/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFEFA] border border-[#DED4C5] rounded-3xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#DED4C5]/60 pb-3">
              <h3 className="font-serif font-bold text-lg text-[#1F2421]">Registrar Fixer</h3>
              <button onClick={() => setIsAddFixerModalOpen(false)}>
                <X className="w-5 h-5 text-[#756A5D]" />
              </button>
            </div>
            <form onSubmit={handleCreateFixer} className="space-y-3.5 text-xs">
              <input type="text" required placeholder="Nombre" value={newFixerName} onChange={(e) => setNewFixerName(e.target.value)} className="w-full p-2.5 rounded-xl border border-[#DED4C5] bg-[#F6F4EF]" />
              <input type="tel" required placeholder="Teléfono" value={newFixerPhone} onChange={(e) => setNewFixerPhone(e.target.value)} className="w-full p-2.5 rounded-xl border border-[#DED4C5] bg-[#F6F4EF]" />
              <select value={newFixerSpecialty} onChange={(e) => setNewFixerSpecialty(e.target.value)} className="w-full p-2.5 rounded-xl border border-[#DED4C5] bg-[#F6F4EF]">
                <option value="Plomería">Plomería</option>
                <option value="Electricidad">Electricidad</option>
              </select>
              <button type="submit" className="w-full py-2.5 rounded-xl bg-[#0B72D9] text-white font-bold">Guardar</button>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: CONFIRMAR ELIMINACIÓN DE FIXER                        */}
      {/* ============================================================== */}
      {fixerToDelete && (
        <div className="fixed inset-0 z-50 bg-[#082D60]/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFEFA] border border-[#DED4C5] rounded-3xl max-w-sm w-full p-6 shadow-xl space-y-4">
            <h3 className="font-serif font-bold text-base text-[#1F2421]">¿Eliminar Fixer?</h3>
            <p className="text-xs text-[#756A5D]">Esta acción no se puede deshacer.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setFixerToDelete(null)} className="py-2 px-4 border border-[#DED4C5] rounded-xl text-xs">Cancelar</button>
              <button onClick={handleConfirmDeleteFixer} className="py-2 px-4 bg-rose-600 text-white rounded-xl text-xs font-bold">Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: CREAR PEDIDO MANUAL                                   */}
      {/* ============================================================== */}
      {isCreateOrderModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#082D60]/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFEFA] border border-[#DED4C5] rounded-3xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#DED4C5]/60 pb-3">
              <h3 className="font-serif font-bold text-lg text-[#1F2421]">Crear Pedido Manual</h3>
              <button onClick={() => setIsCreateOrderModalOpen(false)}>
                <X className="w-5 h-5 text-[#756A5D]" />
              </button>
            </div>
            <form onSubmit={handleCreateManualOrder} className="space-y-3 text-xs max-h-[65vh] overflow-y-auto pr-1">
              <label className="block space-y-1">
                <span className="text-[11px] font-bold text-[#1F2421]">Servicio de Catálogo</span>
                <select
                  value={manualSelectedCatalogId}
                  onChange={(e) => handleCatalogServiceChange(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#DED4C5] bg-[#F6F4EF] font-semibold"
                >
                  {FIXIT_CATALOG.map((svc) => (
                    <option key={svc.id} value={svc.id}>
                      {svc.id} — {svc.service_name} (${svc.price.toFixed(2)}
                      {svc.addon_only ? ' · Solo complemento' : ''})
                    </option>
                  ))}
                  <option value="custom">Personalizado / Otro</option>
                </select>
              </label>

              {(() => {
                const selectedSvc = FIXIT_CATALOG.find((s) => s.id === manualSelectedCatalogId);
                if (!selectedSvc) return null;

                const priceVal = parseFloat(manualAmount) || 0;
                const embeddedMat = selectedSvc.embedded_material_usd || 0;
                const laborBase = Math.max(0, round2(priceVal - embeddedMat));
                const commVal = calcCommission(laborBase, commissionRate);
                const netVal = calcNet(laborBase, commissionRate);
                const isBelowMinComm = !selectedSvc.addon_only && commVal < minStandaloneCommission;

                return (
                  <div className="space-y-2">
                    {typeof selectedSvc.promo_price_usd === 'number' && (
                      <label className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 font-bold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={manualApplyPromo}
                          onChange={(e) => handleToggleManualPromo(e.target.checked)}
                          className="rounded accent-[#082D60]"
                        />
                        <span>
                          Aplicar {selectedSvc.promo_label || 'Promo'}: $
                          {selectedSvc.promo_price_usd.toFixed(2)} USD (Lista: $
                          {selectedSvc.price.toFixed(2)})
                        </span>
                      </label>
                    )}

                    {selectedSvc.addon_only && (
                      <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-bold flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>
                          Agrega un servicio principal ({selectedSvc.id} es solo complemento y no puede crearse solo).
                        </span>
                      </div>
                    )}

                    {isBelowMinComm && (
                      <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-bold flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>
                          Comisión (${commVal.toFixed(2)}) inferior al piso mínimo ($
                          {minStandaloneCommission.toFixed(2)}).
                        </span>
                      </div>
                    )}

                    <div className="p-2.5 rounded-xl bg-[#F6F4EF] border border-[#DED4C5] flex flex-wrap items-center justify-between gap-2 text-[11px]">
                      <span className="text-[#756A5D]">
                        Base MO: <strong>${laborBase.toFixed(2)}</strong>
                        {embeddedMat > 0 ? ` + Mat. 0%: $${embeddedMat.toFixed(2)}` : ''}
                      </span>
                      <span className="text-[#082D60] font-bold">
                        Comisión ({round2(commissionRate * 100)}%): ${commVal.toFixed(2)}
                      </span>
                      <span className="text-[#53653D] font-bold">
                        Neto Fixer: ${(netVal + embeddedMat).toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })()}

              <input type="text" required placeholder="Nombre Cliente" value={manualClientName} onChange={(e) => setManualClientName(e.target.value)} className="w-full p-2.5 rounded-xl border border-[#DED4C5] bg-[#F6F4EF]" />
              <input type="tel" required placeholder="Teléfono" value={manualClientPhone} onChange={(e) => setManualClientPhone(e.target.value)} className="w-full p-2.5 rounded-xl border border-[#DED4C5] bg-[#F6F4EF]" />
              <input type="text" required placeholder="Dirección" value={manualAddress} onChange={(e) => setManualAddress(e.target.value)} className="w-full p-2.5 rounded-xl border border-[#DED4C5] bg-[#F6F4EF]" />
              <input type="number" step="0.01" required placeholder="Monto (USD)" value={manualAmount} onChange={(e) => setManualAmount(e.target.value)} className="w-full p-2.5 rounded-xl border border-[#DED4C5] bg-[#F6F4EF] font-mono font-bold" />
              <button
                type="submit"
                disabled={
                  savingManualOrder ||
                  Boolean(FIXIT_CATALOG.find((s) => s.id === manualSelectedCatalogId)?.addon_only)
                }
                className="w-full py-2.5 rounded-xl bg-[#082D60] hover:bg-[#062248] disabled:opacity-50 text-white font-bold cursor-pointer"
              >
                {savingManualOrder ? 'Guardando...' : 'Guardar Pedido'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 4: CANCELACIÓN Y ELIMINACIÓN DE PEDIDOS                  */}
      {/* ============================================================== */}
      {orderToManage && (
        <div className="fixed inset-0 z-50 bg-[#082D60]/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFEFA] border border-[#DED4C5] rounded-3xl max-w-sm w-full p-6 shadow-xl space-y-4">
            <h3 className="font-serif font-bold text-base text-[#1F2421]">Gestionar Pedido</h3>
            <div className="flex flex-col gap-2">
              <button onClick={handleConfirmCancelOrder} className="py-2 bg-amber-600 text-white rounded-xl text-xs font-bold">Marcar como Cancelado</button>
              <button onClick={handleConfirmDeleteOrder} className="py-2 bg-rose-600 text-white rounded-xl text-xs font-bold">Borrar de BD</button>
              <button onClick={() => setOrderToManage(null)} className="py-2 border border-[#DED4C5] rounded-xl text-xs">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 5: ASIGNAR / REASIGNAR TÉCNICO (Uber Fase A)              */}
      {/* ============================================================== */}
      {orderToAssign && (
        <div className="fixed inset-0 z-50 bg-[#082D60]/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFEFA] border border-[#DED4C5] rounded-3xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#DED4C5]/60 pb-3">
              <div>
                <h3 className="font-serif font-bold text-lg text-[#1F2421]">Asignar técnico</h3>
                <p className="text-[11px] text-[#756A5D] font-mono">
                  {orderToAssign.numero_pedido || orderToAssign.consecutiveId || orderToAssign.orderNumber || orderToAssign.codigo_seguimiento || orderToAssign.id}
                  {' · '}
                  <span className="font-semibold">
                    Actual: {orderToAssign.tecnico_nombre || orderToAssign.tecnico_asignado || 'Sin asignar'}
                  </span>
                </p>
              </div>
              <button onClick={() => setOrderToAssign(null)}>
                <X className="w-5 h-5 text-[#756A5D]" />
              </button>
            </div>
            <div className="space-y-3 text-xs max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-2">
                <select value={assignFilterSpecialty} onChange={(e) => setAssignFilterSpecialty(e.target.value)} className="p-2.5 rounded-xl border border-[#DED4C5] bg-[#F6F4EF]">
                  <option value="all">Todas las especialidades</option>
                  {assignSpecialties.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <select value={assignFilterAvailability} onChange={(e) => setAssignFilterAvailability(e.target.value)} className="p-2.5 rounded-xl border border-[#DED4C5] bg-[#F6F4EF]">
                  <option value="all">Toda disponibilidad</option>
                  <option value="Disponible">Disponible</option>
                  <option value="En servicio">En servicio</option>
                  <option value="Inactivo">Inactivo</option>
                </select>
              </div>
              <input type="text" placeholder="Filtrar por zona de cobertura..." value={assignFilterZone} onChange={(e) => setAssignFilterZone(e.target.value)} className="w-full p-2.5 rounded-xl border border-[#DED4C5] bg-[#F6F4EF]" />
              <select value={assignFixerId} onChange={(e) => setAssignFixerId(e.target.value)} className="w-full p-2.5 rounded-xl border border-[#DED4C5] bg-[#F6F4EF] font-semibold">
                <option value="">Selecciona un técnico ({assignFilteredFixers.length})</option>
                {assignFilteredFixers.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nombre} — {f.especialidad} · {f.disponibilidad}{f.zona_cobertura ? ` · ${f.zona_cobertura}` : ''} ({fixerAccessMap[f.id] ? 'Con acceso' : 'Sin acceso'})
                  </option>
                ))}
              </select>
              {assignFixerId && fixerAccessMap[assignFixerId] === false && (
                <p className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>Este fixer no tiene acceso al app: no verá la asignación.</span>
                </p>
              )}
              {fixers.find((f) => f.id === assignFixerId)?.disponibilidad === 'En servicio' && (
                <p className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Este técnico está en servicio. Puedes asignarlo igual, pero verifica su carga.
                </p>
              )}
              <label className="block space-y-1">
                <span className="text-[11px] font-semibold text-[#756A5D]">Fecha programada (opcional → estado Programada)</span>
                <input type="datetime-local" value={assignScheduledDate} onChange={(e) => setAssignScheduledDate(e.target.value)} className="w-full p-2.5 rounded-xl border border-[#DED4C5] bg-[#F6F4EF]" />
              </label>
              <textarea placeholder="Notas de asignación (opcional)" value={assignNotes} onChange={(e) => setAssignNotes(e.target.value)} rows={2} className="w-full p-2.5 rounded-xl border border-[#DED4C5] bg-[#F6F4EF]" />
              <div className="flex justify-end gap-2 pt-1">
                <button onClick={() => setOrderToAssign(null)} className="py-2.5 px-4 border border-[#DED4C5] rounded-xl font-semibold">Cancelar</button>
                <button onClick={handleConfirmAssignTechnician} disabled={!assignFixerId || isAssigning} className="py-2.5 px-4 rounded-xl bg-[#0B72D9] hover:bg-[#0962BC] disabled:opacity-50 text-white font-bold">
                  {isAssigning ? 'Asignando...' : 'Confirmar asignación'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 6: REGISTRAR / EDITAR PAGO REAL (COLECCIÓN PAYMENTS)     */}
      {/* ============================================================== */}
      {isPaymentModalOpen && isAdmin && (
        <div className="fixed inset-0 z-50 bg-[#082D60]/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFEFA] border border-[#DED4C5] rounded-3xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#DED4C5]/60 pb-3">
              <div>
                <h3 className="font-serif font-bold text-lg text-[#1F2421] flex items-center gap-2">
                  <Banknote className="w-5 h-5 text-[#53653D]" />
                  <span>{editingPayment ? 'Editar Pago Registrado' : 'Registrar Nuevo Pago'}</span>
                </h3>
                <p className="text-[11px] text-[#756A5D]">
                  {editingPayment
                    ? `Modificando transacción ${editingPayment.id}`
                    : 'Registra un abono, anticipo 50% o saldo final confirmado'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsPaymentModalOpen(false);
                  setEditingPayment(null);
                }}
              >
                <X className="w-5 h-5 text-[#756A5D]" />
              </button>
            </div>

            <form
              onSubmit={handleSavePayment}
              className="space-y-3 text-xs max-h-[70vh] overflow-y-auto pr-1"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block space-y-1">
                  <span className="text-[11px] font-bold text-[#1F2421]">
                    Seleccionar Pedido Existente
                  </span>
                  <select
                    value={paymentOrderId}
                    onChange={(e) => handleSelectOrderInPaymentModal(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#DED4C5] bg-[#F6F4EF] font-medium"
                  >
                    <option value="">-- Pedido manual / otro --</option>
                    {orders.map((ord) => {
                      const code =
                        ord.numero_pedido ||
                        ord.consecutiveId ||
                        ord.orderNumber ||
                        ord.codigo_seguimiento ||
                        ord.id;
                      return (
                        <option key={ord.id} value={ord.id}>
                          {code} — {ord.cliente?.nombre || 'Cliente'} ($
                          {(ord.total_facturado ?? ord.precio_regular ?? 35).toFixed(2)})
                        </option>
                      );
                    })}
                  </select>
                </label>

                <label className="block space-y-1">
                  <span className="text-[11px] font-bold text-[#1F2421]">
                    Código de Pedido *
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="Ej. FIX-2611-0001 o MANUAL"
                    value={paymentOrderCode}
                    onChange={(e) => setPaymentOrderCode(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#DED4C5] bg-[#F6F4EF] font-mono"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block space-y-1">
                  <span className="text-[11px] font-bold text-[#1F2421]">
                    Cotización vinculada (opcional)
                  </span>
                  <input
                    type="text"
                    placeholder="Ej. FIXIT-2026-11-100"
                    value={paymentQuoteId}
                    onChange={(e) => setPaymentQuoteId(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#DED4C5] bg-[#F6F4EF] font-mono"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-[11px] font-bold text-[#1F2421]">
                    Nombre del Cliente
                  </span>
                  <input
                    type="text"
                    placeholder="Ej. Juan Pérez"
                    value={paymentClientName}
                    onChange={(e) => setPaymentClientName(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#DED4C5] bg-[#F6F4EF]"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className="block space-y-1">
                  <span className="text-[11px] font-bold text-[#1F2421]">
                    Monto (USD) *
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0.00"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#DED4C5] bg-[#F6F4EF] font-bold text-sm text-[#082D60]"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-[11px] font-bold text-[#1F2421]">
                    Método de Pago *
                  </span>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full p-2.5 rounded-xl border border-[#DED4C5] bg-[#F6F4EF] font-semibold"
                  >
                    {PAYMENT_METHOD_OPTIONS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-1">
                  <span className="text-[11px] font-bold text-[#1F2421]">
                    Estado *
                  </span>
                  <select
                    value={paymentStatus}
                    onChange={(e) =>
                      setPaymentStatus(e.target.value as 'Pendiente' | 'Confirmado')
                    }
                    className="w-full p-2.5 rounded-xl border border-[#DED4C5] bg-[#F6F4EF] font-bold"
                  >
                    <option value="Confirmado">Confirmado</option>
                    <option value="Pendiente">Pendiente</option>
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block space-y-1">
                  <span className="text-[11px] font-bold text-[#1F2421]">
                    Fecha del Pago *
                  </span>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#DED4C5] bg-[#F6F4EF]"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-[11px] font-bold text-[#1F2421]">
                    Referencia / Comprobante (opcional)
                  </span>
                  <input
                    type="text"
                    placeholder="Ej. YAPPY-849201 / ACH-BG"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#DED4C5] bg-[#F6F4EF] font-mono"
                  />
                </label>
              </div>

              <label className="block space-y-1">
                <span className="text-[11px] font-bold text-[#1F2421]">
                  Notas (opcional)
                </span>
                <textarea
                  rows={2}
                  placeholder="Ej. Anticipo 50% recibido por Yappy Comercial..."
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#DED4C5] bg-[#F6F4EF]"
                />
              </label>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#DED4C5]/60">
                <button
                  type="button"
                  onClick={() => {
                    setIsPaymentModalOpen(false);
                    setEditingPayment(null);
                  }}
                  className="py-2.5 px-4 border border-[#DED4C5] rounded-xl font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingPayment}
                  className="py-2.5 px-5 rounded-xl bg-[#53653D] hover:bg-[#435331] disabled:opacity-50 text-white font-bold cursor-pointer"
                >
                  {isSavingPayment
                    ? 'Guardando...'
                    : editingPayment
                    ? 'Guardar Cambios'
                    : 'Registrar Pago'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
