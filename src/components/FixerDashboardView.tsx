import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  getDocs,
  getDoc,
} from 'firebase/firestore';
import { db, AuthState } from '../lib/firebase';
import {
  DEFAULT_COMMISSION_RATE,
  DEFAULT_MIN_STANDALONE_COMMISSION_USD,
  buildPaintingQuoterLines,
  buildServiceQuoterLines,
  calcCommission,
  calcCommissionBreakdown,
  calcNet,
  getCommissionBase,
  isLaborCommissionBase,
  normalizeMinStandaloneCommission,
  normalizeRate,
  round2,
} from '../lib/commissions';
import {
  isSoundEnabled,
  setSoundEnabled,
  playNewOrderSound,
} from '../lib/soundAlert';
import {
  getServicesFromFirestore,
  getQuotesFromFirestore,
  updateOrderInFirestore,
} from '../lib/firestoreService';
import { FIXIT_CATALOG } from '../data/catalog';
import {
  Service,
  ManagedQuote,
  OfficialRequestStatus,
  OFFICIAL_STATUS_DISPLAY,
  normalizeStatus,
} from '../types';
import {
  FixerQuoter,
  QuoterLineItem,
  LinkedOrderContext,
} from './FixerQuoter';
import {
  FileText,
  Package,
  DollarSign,
  Calculator,
  Search,
  MessageCircle,
  MapPin,
  Clock,
  CheckCircle2,
  Plus,
  Paintbrush,
  Home,
  Building2,
  Droplets,
  Sparkles,
  ArrowRight,
  Wrench,
  ShieldCheck,
  RefreshCw,
  Volume2,
  VolumeX,
  BellRing,
} from 'lucide-react';

interface FixerOrder {
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
    nombre?: string;
    category?: string;
    price?: number;
    embedded_material_usd?: number;
    diagnostic_required?: boolean;
  };
  total_facturado?: number;
  cotizacion?: number;
  precio_regular?: number;
  costo_materiales?: number;
  visitOutcome?: 'pendiente' | 'aprobada' | 'no_aprobada';
  estado?: string;
  tecnico_id?: string;
  tecnico_asignado?: string;
  tecnico_nombre?: string;
  direccion?: string;
  fecha?: string;
  createdAt?: any;
  horario_preferido?: string;
  notas_internas?: string;
}

function getFixerOrderMonthPrefix(ord: FixerOrder): string {
  const raw = ord.fecha || ord.createdAt;
  if (!raw) return '';
  if (typeof raw === 'string' && /^\d{4}-\d{2}/.test(raw.trim())) {
    return raw.trim().slice(0, 7);
  }
  const dt = raw?.toDate ? raw.toDate() : new Date(raw);
  if (Number.isNaN(dt.getTime())) return '';
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
}

const FIXER_STATUS_OPTIONS: { value: OfficialRequestStatus; label: string }[] = [
  { value: 'ASIGNADA', label: 'Asignada' },
  { value: 'PROGRAMADA', label: 'Programada' },
  { value: 'EN_PROCESO', label: 'En proceso / En sitio' },
  { value: 'COMPLETADA', label: 'Completada' },
];

const PAINT_PRESETS_M2 = [
  { label: 'Pared de acento', m2: 15 },
  { label: 'Recámara estándar', m2: 35 },
  { label: 'Sala / Comedor', m2: 70 },
  { label: 'Apartamento completo', m2: 120 },
];

interface FixerDashboardViewProps {
  authState: AuthState;
}

export const FixerDashboardView: React.FC<FixerDashboardViewProps> = ({ authState }) => {
  const currentUser = authState.user!;

  const [activeTab, setActiveTab] = useState<'quoter' | 'orders' | 'catalog' | 'calculators'>('quoter');

  // Linked order & pending items for the Quoter
  const [linkedOrder, setLinkedOrder] = useState<LinkedOrderContext | null>(null);
  const [pendingItemsToAdd, setPendingItemsToAdd] = useState<QuoterLineItem[]>([]);

  // Orders & directory matching
  const [orders, setOrders] = useState<FixerOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState<boolean>(true);
  const [matchedFixerIds, setMatchedFixerIds] = useState<string[]>(() => {
    const ids = [currentUser.uid];
    if (currentUser.technicianId && !ids.includes(currentUser.technicianId)) {
      ids.push(currentUser.technicianId);
    }
    return ids;
  });
  const [orderFilterMode, setOrderFilterMode] = useState<'assigned' | 'available' | 'all'>('all');
  const [orderSearch, setOrderSearch] = useState<string>('');

  // Catalog
  const [services, setServices] = useState<Service[]>(FIXIT_CATALOG);
  const [catalogCategory, setCatalogCategory] = useState<string>('all');
  const [catalogSearch, setCatalogSearch] = useState<string>('');

  // Quotes emitted
  const [quotes, setQuotes] = useState<ManagedQuote[]>([]);

  // Commission rate & min floor from settings/fixer_commission (default 0.15 = 15%, min $3.00)
  const [commissionRate, setCommissionRate] = useState<number>(DEFAULT_COMMISSION_RATE);
  const [minStandaloneCommission, setMinStandaloneCommission] = useState<number>(
    DEFAULT_MIN_STANDALONE_COMMISSION_USD
  );
  const [usingDefaultCommission, setUsingDefaultCommission] = useState<boolean>(false);

  // Sound Alert State & Known Assigned Order IDs Ref (Uber-style foreground alert)
  const [soundEnabled, setSoundEnabledState] = useState<boolean>(() => isSoundEnabled());
  const [directoryResolved, setDirectoryResolved] = useState<boolean>(false);
  const knownAssignedIdsRef = useRef<Set<string> | null>(null);

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    setSoundEnabledState(next);
  };

  const handleTestSound = () => {
    if (!soundEnabled) {
      setSoundEnabled(true);
      setSoundEnabledState(true);
    }
    playNewOrderSound('fixer');
  };

  // Painting Calculator state (combines PinturaService m² + wall dimension helper + extras)
  const [paintAreaType, setPaintAreaType] = useState<'interior' | 'exterior'>('interior');
  const [paintM2Input, setPaintM2Input] = useState<string>('35');
  const [paintModality, setPaintModality] = useState<'solo_mano_obra' | 'mano_obra_materiales'>('solo_mano_obra');
  const [paintQuality, setPaintQuality] = useState<'estandar' | 'premium'>('estandar');
  const [paintHeightSurcharge, setPaintHeightSurcharge] = useState<boolean>(false);
  const [paintPatchingRepair, setPaintPatchingRepair] = useState<boolean>(false);
  const [wallHelperOpen, setWallHelperOpen] = useState<boolean>(false);
  const [wallLength, setWallLength] = useState<string>('4');
  const [wallHeight, setWallHeight] = useState<string>('2.6');
  const [wallCount, setWallCount] = useState<number>(4);

  // Resolve Fixer profile IDs from `fixers` / `technicians` by email or name
  useEffect(() => {
    let cancelled = false;
    async function resolveFixerDirectoryId() {
      const ids = new Set<string>([currentUser.uid]);
      if (currentUser.technicianId) ids.add(currentUser.technicianId);

      const userEmail = (currentUser.email || '').toLowerCase().trim();
      const userName = (currentUser.displayName || currentUser.nombre || '').toLowerCase().trim();

      try {
        const fixersSnap = await getDocs(collection(db, 'fixers'));
        fixersSnap.forEach((d) => {
          const data = d.data();
          const fEmail = String(data.correo || data.email || '').toLowerCase().trim();
          const fName = String(data.nombre || data.displayName || '').toLowerCase().trim();
          if ((userEmail && fEmail === userEmail) || (userName && fName === userName)) {
            ids.add(d.id);
          }
        });
      } catch {}

      try {
        const techsSnap = await getDocs(collection(db, 'technicians'));
        techsSnap.forEach((d) => {
          const data = d.data();
          const tEmail = String(data.correo || data.email || '').toLowerCase().trim();
          const tName = String(data.nombre || data.displayName || '').toLowerCase().trim();
          if ((userEmail && tEmail === userEmail) || (userName && tName === userName)) {
            ids.add(d.id);
          }
        });
      } catch {}

      if (!cancelled) {
        setMatchedFixerIds(Array.from(ids));
        setDirectoryResolved(true);
      }
    }
    resolveFixerDirectoryId();
    return () => {
      cancelled = true;
    };
  }, [currentUser.uid, currentUser.email, currentUser.displayName, currentUser.nombre, currentUser.technicianId]);

  // Load orders from Firestore (with fallback to assigned query if rules restrict full list)
  useEffect(() => {
    let unsub: (() => void) | null = null;
    setLoadingOrders(true);

    const qAll = query(collection(db, 'requests'), orderBy('fecha', 'desc'));
    unsub = onSnapshot(
      qAll,
      (snap) => {
        const list: FixerOrder[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
        setOrders(list);
        setLoadingOrders(false);
      },
      async () => {
        // Fallback if full list query is restricted: query assigned to technician UID + orders mirror
        try {
          const qAssigned = query(
            collection(db, 'requests'),
            where('tecnico_id', '==', currentUser.uid)
          );
          const snapAssigned = await getDocs(qAssigned);
          const list: FixerOrder[] = [];
          snapAssigned.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
          setOrders(list);
        } catch {
          setOrders([]);
        } finally {
          setLoadingOrders(false);
        }
      }
    );

    return () => {
      if (unsub) unsub();
    };
  }, [currentUser.uid]);

  // Load services catalog and quotes
  useEffect(() => {
    getServicesFromFirestore().then((svcs) => {
      if (svcs && svcs.length > 0) setServices(svcs);
    });
    getQuotesFromFirestore().then((qts) => {
      setQuotes(qts);
    });
  }, []);

  // Load Fixit commission rate & minimum floor from settings/fixer_commission (signed-in read, fallback 0.15 / $3.00)
  useEffect(() => {
    let unsubCommission: (() => void) | null = null;
    const ref = doc(db, 'settings', 'fixer_commission');

    const applyCommissionSnap = (exists: boolean, data?: Record<string, any>) => {
      if (exists && data && typeof data.rate === 'number' && Number.isFinite(data.rate)) {
        setCommissionRate(normalizeRate(data.rate));
        setUsingDefaultCommission(false);
      } else {
        setCommissionRate(DEFAULT_COMMISSION_RATE);
        setUsingDefaultCommission(true);
      }
      if (
        exists &&
        data &&
        typeof data.min_standalone_commission_usd === 'number' &&
        Number.isFinite(data.min_standalone_commission_usd)
      ) {
        setMinStandaloneCommission(
          normalizeMinStandaloneCommission(data.min_standalone_commission_usd)
        );
      } else {
        setMinStandaloneCommission(DEFAULT_MIN_STANDALONE_COMMISSION_USD);
      }
    };

    try {
      unsubCommission = onSnapshot(
        ref,
        (snap) => {
          applyCommissionSnap(snap.exists(), snap.data());
        },
        async () => {
          try {
            const snap = await getDoc(ref);
            applyCommissionSnap(snap.exists(), snap.data());
          } catch {
            applyCommissionSnap(false);
          }
        }
      );
    } catch {
      getDoc(ref)
        .then((snap) => applyCommissionSnap(snap.exists(), snap.data()))
        .catch(() => applyCommissionSnap(false));
    }

    return () => {
      if (unsubCommission) unsubCommission();
    };
  }, []);

  // Helper to check if an order is assigned to the current fixer
  const isOrderAssignedToMe = (ord: FixerOrder): boolean => {
    if (ord.tecnico_id && matchedFixerIds.includes(ord.tecnico_id)) return true;
    if (ord.tecnico_asignado && matchedFixerIds.includes(ord.tecnico_asignado)) return true;
    const myName = (currentUser.displayName || currentUser.nombre || '').toLowerCase().trim();
    if (myName && myName.length > 2) {
      const assignedName = (ord.tecnico_nombre || ord.tecnico_asignado || '').toLowerCase().trim();
      if (assignedName && assignedName === myName) return true;
    }
    return false;
  };

  // Detectar NUEVAS asignaciones mías (inicializado en primera carga SIN sonar; no suena por cambios de estado)
  useEffect(() => {
    if (loadingOrders || !directoryResolved) return;

    const currentAssignedIds = orders
      .filter((ord) => isOrderAssignedToMe(ord))
      .map((ord) => ord.id);

    if (knownAssignedIdsRef.current === null) {
      knownAssignedIdsRef.current = new Set(currentAssignedIds);
      return;
    }

    let hasNewAssignment = false;
    for (const id of currentAssignedIds) {
      if (!knownAssignedIdsRef.current.has(id)) {
        knownAssignedIdsRef.current.add(id);
        hasNewAssignment = true;
      }
    }

    if (hasNewAssignment) {
      playNewOrderSound('fixer');
    }
  }, [orders, loadingOrders, directoryResolved, matchedFixerIds]);

  const isOrderAvailable = (ord: FixerOrder): boolean => {
    const st = normalizeStatus(ord.estado);
    if (st === 'CANCELADA' || st === 'ARCHIVADA' || st === 'COMPLETADA') return false;
    const hasTech = Boolean(ord.tecnico_id || ord.tecnico_nombre || ord.tecnico_asignado);
    return !hasTech || st === 'NUEVA' || st === 'EVALUACION' || st === 'COTIZACION';
  };

  const assignedOrdersCount = useMemo(
    () => orders.filter((o) => isOrderAssignedToMe(o)).length,
    [orders, matchedFixerIds]
  );

  const availableOrdersCount = useMemo(
    () => orders.filter((o) => isOrderAvailable(o)).length,
    [orders]
  );

  const filteredOrders = useMemo(() => {
    return orders.filter((ord) => {
      const st = normalizeStatus(ord.estado);
      if (st === 'ARCHIVADA') return false;

      if (orderFilterMode === 'assigned' && !isOrderAssignedToMe(ord)) return false;
      if (orderFilterMode === 'available' && !isOrderAvailable(ord)) return false;

      if (orderSearch.trim()) {
        const term = orderSearch.toLowerCase();
        const num = (
          ord.numero_pedido ||
          ord.consecutiveId ||
          ord.orderNumber ||
          ord.codigo_seguimiento ||
          ord.id
        ).toLowerCase();
        const client = (ord.cliente?.nombre || '').toLowerCase();
        const svc = (ord.servicio_probable?.service_name || ord.servicio_probable?.nombre || '').toLowerCase();
        const addr = (ord.direccion || '').toLowerCase();
        return num.includes(term) || client.includes(term) || svc.includes(term) || addr.includes(term);
      }
      return true;
    });
  }, [orders, orderFilterMode, orderSearch, matchedFixerIds]);

  const myQuotes = useMemo(() => {
    return quotes.filter(
      (q) =>
        q.creado_por_uid === currentUser.uid ||
        (q.tecnico_id && matchedFixerIds.includes(q.tecnico_id)) ||
        currentUser.isAdmin
    );
  }, [quotes, currentUser.uid, currentUser.isAdmin, matchedFixerIds]);

  const myTotalQuotedUsd = useMemo(
    () => myQuotes.reduce((acc, q) => acc + (Number(q.total) || 0), 0),
    [myQuotes]
  );

  const currentMonthPrefix = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const commissionPctLabel = useMemo(() => round2(commissionRate * 100), [commissionRate]);

  // Triple sumado sobre pedidos asignados al fixer del mes actual (mes = fecha de creación del pedido)
  const myMonthlyEarnings = useMemo(() => {
    let facturado = 0;
    let comision = 0;
    let neto = 0;
    let count = 0;

    orders.forEach((ord) => {
      if (!isOrderAssignedToMe(ord)) return;
      const st = normalizeStatus(ord.estado);
      if (st === 'CANCELADA' || st === 'ARCHIVADA') return;
      const ordMonth = getFixerOrderMonthPrefix(ord) || currentMonthPrefix;
      if (ordMonth !== currentMonthPrefix) return;

      const breakdown = calcCommissionBreakdown(ord, commissionRate);

      facturado = round2(facturado + breakdown.base);
      comision = round2(comision + breakdown.comision_fixit);
      neto = round2(neto + breakdown.costo_tecnico);
      count += 1;
    });

    return { facturado, comision, neto, count };
  }, [orders, matchedFixerIds, commissionRate, currentMonthPrefix]);

  // Filter catalog services
  const catalogCategories = useMemo(() => {
    const cats = Array.from(new Set(services.filter((s) => s.active !== false).map((s) => s.category)));
    return cats;
  }, [services]);

  const filteredServices = useMemo(() => {
    return services.filter((s) => {
      if (s.active === false) return false;
      if (catalogCategory !== 'all' && s.category !== catalogCategory) return false;
      if (catalogSearch.trim()) {
        const term = catalogSearch.toLowerCase();
        return (
          s.service_name.toLowerCase().includes(term) ||
          s.description.toLowerCase().includes(term) ||
          s.category.toLowerCase().includes(term) ||
          s.id.toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [services, catalogCategory, catalogSearch]);

  // Painting Calculator Computed Breakdown:
  // En pintura con materiales, la tarifa combinada ($3.50 int / $4.50 ext) se auto-divide en:
  // - Mano de obra: (tarifa - $1.00) × m² ($2.50/m² int / $3.50/m² ext), con mínimo $75.00 aplicado a MO bruta antes de comisión
  // - Materiales embebidos: $1.00/m² × m² (+ galones/insumos adicionales si aplica), reembolso 0% comisión.
  // NUNCA redondear comisión ni neto por unidad ($/m²) para evitar el error acumulado de $0.01/m².
  const paintCalc = useMemo(() => {
    const m2 = Math.max(0, parseFloat(paintM2Input) || 0);
    const isWithMaterials = paintModality === 'mano_obra_materiales';
    const combinedRatePerM2 =
      paintAreaType === 'interior'
        ? isWithMaterials
          ? 3.5
          : 2.5
        : isWithMaterials
        ? 4.5
        : 3.5;
    const laborRatePerM2 = isWithMaterials ? round2(combinedRatePerM2 - 1.0) : combinedRatePerM2;
    const embeddedMatPerM2 = isWithMaterials ? 1.0 : 0;

    const rawLabor = round2(m2 * laborRatePerM2);
    const minCharge = 75;
    const minApplied = m2 > 0 && rawLabor < minCharge;
    const laborWithMin = m2 > 0 ? Math.max(rawLabor, minCharge) : 0;

    const embeddedMaterialsTotal = isWithMaterials ? round2(m2 * embeddedMatPerM2) : 0;
    const gallonPrice = paintQuality === 'premium' ? 35 : 14;
    const gallons = isWithMaterials && m2 > 0 ? Math.ceil((m2 / 18) * 1.1) : 0;
    const paintCost = gallons * gallonPrice;
    const suppliesCost = isWithMaterials && m2 > 0 ? 15 : 0;
    const materialsTotal = round2(embeddedMaterialsTotal + paintCost + suppliesCost);

    const heightSurchargeAmount =
      paintHeightSurcharge && m2 > 0 ? round2(laborWithMin * 0.15) : 0;
    const patchingAmount = paintPatchingRepair && m2 > 0 ? 20 : 0;

    const grandTotal = round2(
      laborWithMin + materialsTotal + heightSurchargeAmount + patchingAmount
    );

    return {
      m2,
      isWithMaterials,
      ratePerM2: laborRatePerM2,
      combinedRatePerM2,
      embeddedMaterialsTotal,
      rawLabor,
      minCharge,
      minApplied,
      laborWithMin,
      gallonPrice,
      gallons,
      paintCost,
      suppliesCost,
      materialsTotal,
      heightSurchargeAmount,
      patchingAmount,
      grandTotal,
    };
  }, [paintAreaType, paintM2Input, paintModality, paintQuality, paintHeightSurcharge, paintPatchingRepair]);

  // Actions
  const handleQuoteOrder = (ord: FixerOrder) => {
    const consecutivo =
      ord.numero_pedido || ord.consecutiveId || ord.orderNumber || ord.codigo_seguimiento || ord.id;
    const svcName = ord.servicio_probable?.service_name || ord.servicio_probable?.nombre || 'Servicio técnico especializado';
    const price = ord.cotizacion ?? ord.total_facturado ?? ord.precio_regular ?? ord.servicio_probable?.price ?? 0;

    setLinkedOrder({
      id: ord.id,
      numero_pedido: consecutivo,
      cliente_nombre: ord.cliente?.nombre || '',
      cliente_telefono: ord.cliente?.telefono || '',
      direccion: ord.direccion || 'Ciudad de Panamá',
      servicio_id: ord.servicio_probable?.id,
      servicio_nombre: svcName,
      precio_sugerido: Number(price) || 0,
    });
    setActiveTab('quoter');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: OfficialRequestStatus) => {
    const authorName = currentUser.displayName || currentUser.nombre || currentUser.email || 'Técnico FIXIT';
    try {
      await updateOrderInFirestore(
        orderId,
        { estado: newStatus },
        authorName,
        `Estado actualizado a ${newStatus} por técnico ${authorName}`
      );
      try {
        await updateDoc(doc(db, 'orders', orderId), {
          estado: newStatus,
          updatedAt: new Date().toISOString(),
        });
      } catch {}
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, estado: newStatus } : o)));
    } catch (err) {
      console.warn('[Fixer] Error actualizando estado del pedido:', err);
    }
  };

  const handleAddServiceToQuoter = (srv: Service) => {
    setPendingItemsToAdd(buildServiceQuoterLines(srv));
    setActiveTab('quoter');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSendPaintingToQuoter = () => {
    if (paintCalc.m2 <= 0) return;
    const qualLabel = paintQuality === 'premium' ? 'Pintura Premium' : 'Pintura Estándar';
    const extraPaintUsd = round2(paintCalc.paintCost + paintCalc.suppliesCost);
    const extraPaintDesc =
      paintCalc.isWithMaterials && extraPaintUsd > 0
        ? `${paintCalc.gallons} gal. ${qualLabel} ($${paintCalc.gallonPrice}/gal) + protección y rodillos ($${paintCalc.suppliesCost})`
        : undefined;

    const newItems: QuoterLineItem[] = buildPaintingQuoterLines({
      areaType: paintAreaType,
      m2: paintCalc.m2,
      withMaterials: paintCalc.isWithMaterials,
      extraPaintMaterialsUsd: paintCalc.isWithMaterials ? extraPaintUsd : 0,
      extraPaintMaterialsDesc: extraPaintDesc,
    });

    if (paintHeightSurcharge && paintCalc.heightSurchargeAmount > 0) {
      newItems.push({
        id: Date.now() + 3,
        description: 'Recargo por trabajo en altura (> 3 metros, +15%)',
        qty: 1,
        price: paintCalc.heightSurchargeAmount,
        kind: 'labor',
      });
    }

    if (paintPatchingRepair && paintCalc.patchingAmount > 0) {
      newItems.push({
        id: Date.now() + 4,
        description: 'Resane puntual de grietas y huecos menores',
        qty: 1,
        price: paintCalc.patchingAmount,
        kind: 'labor',
      });
    }

    setPendingItemsToAdd(newItems);
    setActiveTab('quoter');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getWhatsAppLink = (phone?: string, text?: string) => {
    if (!phone) return '#';
    let clean = phone.replace(/\D/g, '');
    if (clean.length === 8 && !clean.startsWith('507')) {
      clean = `507${clean}`;
    }
    const msg = text ? `?text=${encodeURIComponent(text)}` : '';
    return `https://wa.me/${clean}${msg}`;
  };

  return (
    <div className="max-w-6xl mx-auto pt-5 pb-28 px-3 sm:px-6 space-y-5">
      {/* Resumen Operativo del Fixer y Navegación Principal (Oculto al imprimir/exportar PDF) */}
      <div className="space-y-4 q-no-print fixer-nav-chrome">
        {/* Cabecera de Alerta Sonora en Tiempo Real (Estilo Uber) */}
        <div className="bg-[#111827]/85 border border-[#1F2937] rounded-2xl p-3 sm:px-4 flex flex-wrap items-center justify-between gap-2.5 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#059669] animate-pulse shrink-0" />
            <span className="text-xs font-bold text-[#F3F4F6]">
              Recepción en vivo de asignaciones
            </span>
            <span className="hidden sm:inline text-[11px] text-[#9CA3AF]">
              · Suena automáticamente cuando te asignan un nuevo pedido
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleSound}
              title={
                soundEnabled
                  ? 'Alerta sonora activada (clic para silenciar)'
                  : 'Alerta sonora silenciada (clic para activar)'
              }
              className={`py-1.5 px-3 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                soundEnabled
                  ? 'bg-[#059669]/15 text-[#34D399] border-[#34D399]/30 hover:bg-[#059669]/25'
                  : 'bg-white/5 text-[#9CA3AF] border-[#1F2937] hover:text-white'
              }`}
            >
              {soundEnabled ? (
                <>
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Sonido activo</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5" />
                  <span>Silenciado</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleTestSound}
              title="Reproducir tono de prueba de nueva asignación"
              className="py-1.5 px-3 rounded-xl bg-[#0284C7]/10 hover:bg-[#0284C7]/20 border border-[#38BDF8]/30 text-[#38BDF8] font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <BellRing className="w-3.5 h-3.5" />
              <span>Probar sonido</span>
            </button>
          </div>
        </div>

        {/* Cabecera "Mis ganancias (mes)" — Transparencia de Comisión Fixit */}
        <div className="bg-[#111827]/85 border border-[#1F2937] rounded-2xl p-4 shadow-2xs space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <DollarSign className="w-4 h-4 text-[#34D399]" />
              <h2 className="font-sans font-bold text-base text-[#F3F4F6]">
                Mis ganancias (mes)
              </h2>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#EA580C]/10 text-[#FBBF24]">
                {myMonthlyEarnings.count}{' '}
                {myMonthlyEarnings.count === 1 ? 'asignado activo' : 'asignados activos'} ({currentMonthPrefix})
              </span>
              {usingDefaultCommission && (
                <span className="text-[10px] font-semibold text-[#9CA3AF] bg-white/5 border border-[#1F2937] px-2 py-0.5 rounded-full">
                  Tasa pactada por defecto ({commissionPctLabel}%)
                </span>
              )}
            </div>
            <span className="text-[11px] text-[#9CA3AF]">
              Nota: el mes corresponde a la fecha de creación del pedido (materiales desglosados excluidos de comisión).
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="p-3 rounded-xl bg-white/5 border border-[#1F2937]/80">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF] block">
                Total cliente (mes)
              </span>
              <span className="font-sans font-bold text-xl text-[#F3F4F6] mt-0.5 block">
                ${myMonthlyEarnings.facturado.toFixed(2)} USD
              </span>
            </div>

            <div className="p-3 rounded-xl bg-white/5 border border-[#1F2937]/80">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#F59E0B] block">
                Comisión ({commissionPctLabel}%)
              </span>
              <span className="font-sans font-bold text-xl text-[#F59E0B] mt-0.5 block">
                -${myMonthlyEarnings.comision.toFixed(2)} USD
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#059669]/10 border border-[#34D399]/30">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#34D399] block">
                Tu neto (mes)
              </span>
              <span className="font-sans font-bold text-xl text-[#34D399] mt-0.5 block">
                ${myMonthlyEarnings.neto.toFixed(2)} USD
              </span>
            </div>
          </div>
        </div>

        {/* Tarjetas rápidas */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={() => {
              setOrderFilterMode('assigned');
              setActiveTab('orders');
            }}
            className="bg-[#111827]/85 border border-[#1F2937] hover:border-[#38BDF8] rounded-2xl p-3.5 text-left shadow-2xs transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between text-xs text-[#9CA3AF] font-semibold">
              <span>Mis Asignados</span>
              <Wrench className="w-4 h-4 text-[#38BDF8]" />
            </div>
            <p className="font-sans font-bold text-2xl text-[#F3F4F6] mt-1">
              {loadingOrders ? '...' : assignedOrdersCount}
            </p>
            <span className="text-[11px] text-[#38BDF8] font-semibold">Ver mis servicios →</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setOrderFilterMode('available');
              setActiveTab('orders');
            }}
            className="bg-[#111827]/85 border border-[#1F2937] hover:border-[#34D399] rounded-2xl p-3.5 text-left shadow-2xs transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between text-xs text-[#9CA3AF] font-semibold">
              <span>Disponibles / Nuevos</span>
              <Package className="w-4 h-4 text-[#34D399]" />
            </div>
            <p className="font-sans font-bold text-2xl text-[#F3F4F6] mt-1">
              {loadingOrders ? '...' : availableOrdersCount}
            </p>
            <span className="text-[11px] text-[#34D399] font-semibold">Para evaluar / cotizar →</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('quoter')}
            className="bg-[#111827]/85 border border-[#1F2937] hover:border-[#F59E0B] rounded-2xl p-3.5 text-left shadow-2xs transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between text-xs text-[#9CA3AF] font-semibold">
              <span>Cotizaciones Emitidas</span>
              <FileText className="w-4 h-4 text-[#FBBF24]" />
            </div>
            <p className="font-sans font-bold text-2xl text-[#F3F4F6] mt-1">{myQuotes.length}</p>
            <span className="text-[11px] text-[#9CA3AF]">Total: ${myTotalQuotedUsd.toFixed(2)} USD</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('calculators')}
            className="bg-[#111827]/85 border border-[#1F2937] hover:border-[#F59E0B] rounded-2xl p-3.5 text-left shadow-2xs transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between text-xs text-[#9CA3AF] font-semibold">
              <span>Apoyo & Tarifario</span>
              <Calculator className="w-4 h-4 text-[#F59E0B]" />
            </div>
            <p className="font-sans font-bold text-lg text-[#F3F4F6] mt-1 truncate">Pintura m² + Precios</p>
            <span className="text-[11px] text-[#F59E0B] font-semibold">{services.length} servicios activos →</span>
          </button>
        </div>

        {/* Navegación: barra inferior fija al final del componente */}
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: COTIZADOR OFICIAL (1:1 PDF + CUENTA BANCARIA + LOGO)            */}
      {/* ===================================================================== */}
      {activeTab === 'quoter' && (
        <div className="space-y-6">
          <FixerQuoter
            currentUser={currentUser}
            linkedOrder={linkedOrder}
            onClearLinkedOrder={() => setLinkedOrder(null)}
            pendingItemsToAdd={pendingItemsToAdd}
            onConsumePendingItems={() => setPendingItemsToAdd([])}
            onQuoteSaved={(saved) => {
              setQuotes((prev) => [saved, ...prev.filter((q) => q.id !== saved.id)]);
            }}
            onOpenCatalog={() => setActiveTab('catalog')}
            onOpenCalculator={() => setActiveTab('calculators')}
            commissionRate={commissionRate}
            minStandaloneCommission={minStandaloneCommission}
          />

          {/* Historial de cotizaciones emitidas recientemente (Oculto al imprimir/exportar PDF) */}
          {myQuotes.length > 0 && (
            <div className="max-w-[820px] mx-auto bg-[#111827]/85 border border-[#1F2937] rounded-3xl p-5 shadow-2xs space-y-3 q-no-print fixer-nav-chrome">
              <div className="flex items-center justify-between">
                <h3 className="font-sans font-bold text-base text-[#F3F4F6]">
                  Cotizaciones Emitidas Recientemente ({myQuotes.length})
                </h3>
                <span className="text-xs font-bold text-[#34D399]">
                  Total Cotizado: ${myTotalQuotedUsd.toFixed(2)} USD
                </span>
              </div>
              <div className="divide-y divide-[#1F2937]/60 text-xs">
                {myQuotes.slice(0, 6).map((q) => {
                  const qTotal = Number(q.total || 0);
                  const breakdown = calcCommissionBreakdown(q, commissionRate);
                  const isLaborOnly = isLaborCommissionBase(q);
                  return (
                    <div key={q.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono font-bold text-[#FBBF24]">{q.numero_cotizacion}</span>
                          <span className="text-[#9CA3AF]">
                            • {q.cliente_nombre} ({q.cliente_ubicacion || 'Panamá'})
                          </span>
                          {isLaborOnly && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#0284C7]/15 text-[#FBBF24] border border-[#38BDF8]/30">
                              s/MO (${breakdown.base.toFixed(2)})
                            </span>
                          )}
                          {breakdown.materiales_reembolso > 0 && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30">
                              Mat. 0%: +${breakdown.materiales_reembolso.toFixed(2)}
                            </span>
                          )}
                          {breakdown.upsells_bono_fixer > 0 && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-200">
                              Bono extra: +${breakdown.upsells_bono_fixer.toFixed(2)}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#9CA3AF] truncate max-w-md">
                          {q.servicio_nombre || 'Servicio técnico'} · Anticipo 50%: ${(qTotal * 0.5).toFixed(2)}
                        </p>
                      </div>
                      <div className="text-left sm:text-right shrink-0 bg-white/5 border border-[#1F2937]/70 rounded-xl px-3 py-1.5 space-y-0.5">
                        <span className="text-[11px] text-[#F3F4F6] block">
                          Total cliente: <strong>${qTotal.toFixed(2)} USD</strong>
                        </span>
                        <span className="text-[11px] text-[#F59E0B] block">
                          Comisión ({commissionPctLabel}%): <strong>-${breakdown.comision_fixit.toFixed(2)} USD</strong>
                        </span>
                        <span className="text-xs font-bold text-[#34D399] block">
                          Tu neto: ${breakdown.costo_tecnico.toFixed(2)} USD
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: SOLICITUDES / PEDIDOS DISPONIBLES O ASIGNADOS                   */}
      {/* ===================================================================== */}
      {activeTab === 'orders' && (
        <div className="bg-[#111827]/85 border border-[#1F2937] rounded-3xl p-4 sm:p-6 shadow-2xs space-y-4 q-no-print">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="font-sans font-bold text-xl text-[#F3F4F6]">
                Solicitudes y Pedidos ({filteredOrders.length})
              </h2>
              <p className="text-xs text-[#9CA3AF]">
                Revisa tus trabajos asignados o selecciona una solicitud para generar su cotización formal en PDF.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-xl bg-white/5 p-1 border border-[#1F2937]">
                {[
                  { id: 'all', label: `Todos (${orders.length})` },
                  { id: 'assigned', label: `Mis Asignados (${assignedOrdersCount})` },
                  { id: 'available', label: `Disponibles (${availableOrdersCount})` },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setOrderFilterMode(tab.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      orderFilterMode === tab.id
                        ? 'bg-[#EA580C] text-white'
                        : 'text-[#9CA3AF] hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  placeholder="Buscar pedido, cliente, zona..."
                  className="pl-8 pr-3 py-1.5 text-xs rounded-xl bg-white/5 border border-[#1F2937] focus:outline-none focus:border-[#38BDF8] w-56"
                />
              </div>
            </div>
          </div>

          {loadingOrders ? (
            <div className="py-12 text-center text-xs text-[#9CA3AF] flex flex-col items-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-[#38BDF8]" />
              <span>Cargando solicitudes desde Firestore...</span>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#9CA3AF] space-y-2">
              <Package className="w-8 h-8 text-[#D1D5DB] mx-auto" />
              <p className="font-bold text-sm text-[#F3F4F6]">No hay solicitudes en este filtro</p>
              <p>Puedes cambiar a "Todos" o usar directamente el Cotizador Oficial para un cliente nuevo.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredOrders.map((ord) => {
                const consecutivo =
                  ord.numero_pedido ||
                  ord.consecutiveId ||
                  ord.orderNumber ||
                  ord.codigo_seguimiento ||
                  ord.id;
                const officialStatus = normalizeStatus(ord.estado);
                const assignedToMe = isOrderAssignedToMe(ord);
                const svcName =
                  ord.servicio_probable?.service_name ||
                  ord.servicio_probable?.nombre ||
                  'Servicio de Mantenimiento';
                const breakdown = calcCommissionBreakdown(ord, commissionRate);
                const price =
                  ord.total_facturado ??
                  ord.cotizacion ??
                  ord.precio_regular ??
                  ord.servicio_probable?.price ??
                  breakdown.base ??
                  35;
                const ordCommission = breakdown.comision_fixit;
                const ordNet = breakdown.costo_tecnico;

                return (
                  <div
                    key={ord.id}
                    className={`rounded-2xl border p-4 flex flex-col justify-between gap-3 transition-all ${
                      assignedToMe
                        ? 'bg-[#111827]/85 border-[#38BDF8]/50 ring-1 ring-[#38BDF8]/20'
                        : 'bg-white/5/50 border-[#1F2937]'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-xs text-[#FBBF24] bg-[#EA580C]/10 px-2.5 py-0.5 rounded-lg">
                            {consecutivo}
                          </span>
                          {assignedToMe ? (
                            <span className="text-[10px] font-bold bg-[#0284C7]/15 text-[#38BDF8] px-2 py-0.5 rounded-full">
                              Asignado a ti
                            </span>
                          ) : ord.tecnico_nombre || ord.tecnico_asignado ? (
                            <span className="text-[10px] font-semibold bg-white/10 text-[#9CA3AF] px-2 py-0.5 rounded-full">
                              Fixer: {ord.tecnico_nombre || ord.tecnico_asignado}
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold bg-[#059669]/15 text-[#34D399] px-2 py-0.5 rounded-full">
                              Disponible
                            </span>
                          )}
                          {breakdown.isVisitUnapproved && (
                            <span className="text-[10px] font-bold bg-amber-500/15 text-amber-300 px-2 py-0.5 rounded-full">
                              Visita no aprobada ($10/$15)
                            </span>
                          )}
                        </div>

                        <span className="font-sans font-bold text-base text-[#FBBF24]">
                          ${Number(price).toFixed(2)} USD
                        </span>
                      </div>

                      {/* Desglose transparente: Total cliente / Comisión (X%) / Tu neto */}
                      <div className="grid grid-cols-3 gap-1.5 p-2 rounded-xl bg-white/5 border border-[#1F2937]/70 text-[11px]">
                        <div>
                          <span className="text-[10px] text-[#9CA3AF] block">Total cliente</span>
                          <span className="font-bold text-[#F3F4F6]">${Number(price).toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#F59E0B] block">
                            {breakdown.isVisitUnapproved ? 'Fixit (fijo)' : `Comisión (${commissionPctLabel}%)`}
                          </span>
                          <span className="font-bold text-[#F59E0B]">-${ordCommission.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#34D399] block">Tu neto</span>
                          <span className="font-bold text-[#34D399]">
                            ${ordNet.toFixed(2)}
                            {breakdown.materiales_reembolso > 0
                              ? ` (+$${breakdown.materiales_reembolso.toFixed(2)} mat.)`
                              : ''}
                          </span>
                        </div>
                      </div>

                      <div>
                        <h3 className="font-bold text-sm text-[#F3F4F6]">{svcName}</h3>
                        <p className="text-xs text-[#9CA3AF] font-medium">
                          Cliente: <strong className="text-[#F3F4F6]">{ord.cliente?.nombre || 'Cliente FIXIT'}</strong>
                          {ord.cliente?.telefono ? ` • ${ord.cliente.telefono}` : ''}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#9CA3AF]">
                        {ord.direccion && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-[#38BDF8]" />
                            {ord.direccion}
                          </span>
                        )}
                        {(ord.horario_preferido || ord.fecha) && (
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-[#F59E0B]" />
                            {ord.horario_preferido || new Date(ord.fecha!).toLocaleDateString('es-PA')}
                          </span>
                        )}
                      </div>

                      {ord.notas_internas && (
                        <p className="text-[11px] bg-[#111827]/85 border border-[#1F2937] rounded-xl p-2 text-[#9CA3AF]">
                          <strong className="text-[#F3F4F6]">Notas:</strong> {ord.notas_internas}
                        </p>
                      )}
                    </div>

                    <div className="pt-2.5 border-t border-[#1F2937]/60 flex flex-wrap items-center justify-between gap-2">
                      {/* Selector de estado si está asignado */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold uppercase text-[#9CA3AF]">Estado:</span>
                        <select
                          value={officialStatus}
                          onChange={(e) =>
                            handleUpdateOrderStatus(ord.id, e.target.value as OfficialRequestStatus)
                          }
                          className="text-[11px] font-bold py-1 px-2 rounded-lg bg-[#111827] border border-[#1F2937] text-[#F3F4F6] cursor-pointer"
                        >
                          {!FIXER_STATUS_OPTIONS.some((o) => o.value === officialStatus) && (
                            <option value={officialStatus}>
                              {OFFICIAL_STATUS_DISPLAY[officialStatus]?.es || ord.estado || 'Actual'}
                            </option>
                          )}
                          {FIXER_STATUS_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {ord.cliente?.telefono && (
                          <a
                            href={getWhatsAppLink(
                              ord.cliente.telefono,
                              `Hola ${ord.cliente.nombre || ''}, te escribe tu técnico de FIXIT Panamá sobre tu solicitud ${consecutivo}.`
                            )}
                            target="_blank"
                            rel="noreferrer"
                            className="py-1.5 px-2.5 rounded-xl bg-[#059669]/10 hover:bg-[#059669]/20 text-[#34D399] font-bold text-xs inline-flex items-center gap-1 transition-colors"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                          </a>
                        )}

                        <button
                          type="button"
                          onClick={() => handleQuoteOrder(ord)}
                          className="py-1.5 px-3 rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Cotizar en PDF</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: LISTA DE PRECIOS DE SERVICIOS OFICIAL                           */}
      {/* ===================================================================== */}
      {activeTab === 'catalog' && (
        <div className="bg-[#111827]/85 border border-[#1F2937] rounded-3xl p-4 sm:p-6 shadow-2xs space-y-4 q-no-print">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="font-sans font-bold text-xl text-[#F3F4F6]">
                Tarifario Oficial de Servicios FIXIT ({filteredServices.length})
              </h2>
              <p className="text-xs text-[#9CA3AF]">
                Precios de referencia oficial con 30 días de garantía y 50% de anticipo. Pulsa "+ Cotizar" para enviarlo al Cotizador PDF.
              </p>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                placeholder="Buscar servicio o código..."
                className="pl-8 pr-3 py-2 text-xs rounded-xl bg-white/5 border border-[#1F2937] focus:outline-none focus:border-[#38BDF8] w-full sm:w-64"
              />
            </div>
          </div>

          {/* Filtro por Categoría */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setCatalogCategory('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors cursor-pointer whitespace-nowrap ${
                catalogCategory === 'all'
                  ? 'bg-[#EA580C] text-white border-[#F59E0B]'
                  : 'bg-white/5 text-[#9CA3AF] border-[#1F2937] hover:text-white'
              }`}
            >
              Todas las categorías
            </button>
            {catalogCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCatalogCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors cursor-pointer whitespace-nowrap ${
                  catalogCategory === cat
                    ? 'bg-[#0284C7] text-white border-[#38BDF8]'
                    : 'bg-white/5 text-[#9CA3AF] border-[#1F2937] hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Tarjetas del Tarifario */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredServices.map((srv) => {
              const advance50 = (srv.price || 0) * 0.5;
              return (
                <div
                  key={srv.id}
                  className="rounded-2xl border border-[#1F2937] bg-white/5/40 hover:bg-[#111827]/85 p-4 flex flex-col justify-between gap-3 transition-all"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#EA580C]/10 text-[#FBBF24]">
                        {srv.category}
                      </span>
                      <span className="font-mono text-[11px] text-[#9CA3AF]">{srv.id}</span>
                    </div>
                    <h3 className="font-bold text-sm text-[#F3F4F6]">{srv.service_name}</h3>
                    <p className="text-xs text-[#9CA3AF] leading-relaxed">{srv.description}</p>
                  </div>

                  <div className="pt-3 border-t border-[#1F2937]/60 flex items-center justify-between gap-2">
                    <div>
                      <span className="font-sans font-bold text-lg text-[#FBBF24]">
                        ${srv.price.toFixed(2)} USD
                      </span>
                      <span className="block text-[10px] text-[#F59E0B] font-semibold">
                        Anticipo 50%: ${advance50.toFixed(2)} • {srv.estimated_duration || '1-2 hrs'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAddServiceToQuoter(srv)}
                      className="py-2 px-3 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white font-bold text-xs inline-flex items-center gap-1 cursor-pointer transition-colors shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Cotizar</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 4: CALCULADORA DE PINTURA POR M² (REUTILIZADA + INTEGRADA AL PDF)  */}
      {/* ===================================================================== */}
      {activeTab === 'calculators' && (
        <div className="max-w-3xl mx-auto bg-[#111827]/85 border border-[#1F2937] rounded-3xl p-5 sm:p-7 shadow-2xs space-y-6 q-no-print">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#1F2937]/60 pb-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#38BDF8]">
                <Paintbrush className="w-4 h-4" />
                <span>Calculadora Oficial de Apoyo Técnico</span>
              </div>
              <h2 className="font-sans font-bold text-xl sm:text-2xl text-[#F3F4F6] mt-0.5">
                Calculadora de Pintura por m²
              </h2>
              <p className="text-xs text-[#9CA3AF]">
                Calcula mano de obra, galones de pintura (rendimiento 18 m²/gal + 10% merma), insumos y envía el resultado directo al Cotizador PDF.
              </p>
            </div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#34D399] bg-[#059669]/10 px-3 py-1.5 rounded-full shrink-0">
              <ShieldCheck className="w-4 h-4" />
              <span>Mínimo $75.00 USD</span>
            </div>
          </div>

          {/* 1. Superficie: Interior vs Exterior */}
          <div className="space-y-2.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#FBBF24]">
              1. Tipo de Superficie
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaintAreaType('interior')}
                className={`p-4 rounded-2xl border-2 text-left cursor-pointer transition-all flex items-start justify-between ${
                  paintAreaType === 'interior'
                    ? 'border-[#38BDF8] bg-[#0284C7]/5'
                    : 'border-[#1F2937] bg-[#111827] hover:bg-white/5/50'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-bold text-sm text-[#F3F4F6]">
                    <Home className="w-4 h-4 text-[#38BDF8]" />
                    <span>Pintura Interior</span>
                  </div>
                  <p className="text-xs text-[#9CA3AF]">Recámaras, salas, pasillos y techos interiores.</p>
                </div>
                <span className="font-sans font-bold text-sm text-[#FBBF24]">
                  ${paintModality === 'mano_obra_materiales' ? '3.50' : '2.50'}/m²
                </span>
              </button>

              <button
                type="button"
                onClick={() => setPaintAreaType('exterior')}
                className={`p-4 rounded-2xl border-2 text-left cursor-pointer transition-all flex items-start justify-between ${
                  paintAreaType === 'exterior'
                    ? 'border-[#38BDF8] bg-[#0284C7]/5'
                    : 'border-[#1F2937] bg-[#111827] hover:bg-white/5/50'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-bold text-sm text-[#F3F4F6]">
                    <Building2 className="w-4 h-4 text-[#38BDF8]" />
                    <span>Pintura Exterior</span>
                  </div>
                  <p className="text-xs text-[#9CA3AF]">Fachadas, muros perimetrales, balcones y terrazas.</p>
                </div>
                <span className="font-sans font-bold text-sm text-[#FBBF24]">
                  ${paintModality === 'mano_obra_materiales' ? '4.50' : '3.50'}/m²
                </span>
              </button>
            </div>
          </div>

          {/* 2. Metraje en m² + Asistente de Paredes */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-[#FBBF24]">
                2. Área Total a Pintar (m²)
              </label>
              <button
                type="button"
                onClick={() => setWallHelperOpen(!wallHelperOpen)}
                className="text-xs font-bold text-[#38BDF8] hover:underline cursor-pointer"
              >
                {wallHelperOpen ? 'Cerrar calculadora de paredes' : '📐 Calcular por Largo × Alto × Paredes'}
              </button>
            </div>

            {wallHelperOpen && (
              <div className="bg-white/5 p-4 rounded-2xl border border-[#1F2937] space-y-3 text-xs">
                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <span className="text-[11px] font-semibold text-[#9CA3AF] block mb-1">Largo (m)</span>
                    <input
                      type="number"
                      min="0.5"
                      step="0.5"
                      value={wallLength}
                      onChange={(e) => setWallLength(e.target.value)}
                      className="w-full p-2 rounded-xl bg-[#111827] border border-[#1F2937] font-bold text-center"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-[#9CA3AF] block mb-1">Alto (m)</span>
                    <input
                      type="number"
                      min="0.5"
                      step="0.1"
                      value={wallHeight}
                      onChange={(e) => setWallHeight(e.target.value)}
                      className="w-full p-2 rounded-xl bg-[#111827] border border-[#1F2937] font-bold text-center"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-[#9CA3AF] block mb-1">N° Paredes</span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={wallCount}
                      onChange={(e) => setWallCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-full p-2 rounded-xl bg-[#111827] border border-[#1F2937] font-bold text-center"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const totalM2 = Math.max(
                      1,
                      Math.round((parseFloat(wallLength) || 0) * (parseFloat(wallHeight) || 0) * wallCount)
                    );
                    setPaintM2Input(String(totalM2));
                    setWallHelperOpen(false);
                  }}
                  className="w-full py-2 rounded-xl bg-[#0284C7] text-white font-bold cursor-pointer"
                >
                  Aplicar área calculada (
                  {Math.round((parseFloat(wallLength) || 0) * (parseFloat(wallHeight) || 0) * wallCount)} m²)
                </button>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setPaintM2Input(String(Math.max(0, (parseFloat(paintM2Input) || 0) - 5)))}
                className="w-11 h-11 rounded-xl border border-[#1F2937] bg-white/5 font-bold text-lg cursor-pointer"
              >
                -
              </button>
              <div className="relative flex-1">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={paintM2Input}
                  onChange={(e) => setPaintM2Input(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border-2 border-[#1F2937] focus:border-[#38BDF8] focus:outline-none font-mono font-bold text-xl text-center bg-[#111827]"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[#9CA3AF]">
                  m²
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPaintM2Input(String((parseFloat(paintM2Input) || 0) + 5))}
                className="w-11 h-11 rounded-xl border border-[#1F2937] bg-white/5 font-bold text-lg cursor-pointer"
              >
                +
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {PAINT_PRESETS_M2.map((p) => (
                <button
                  key={p.m2}
                  type="button"
                  onClick={() => setPaintM2Input(String(p.m2))}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border cursor-pointer ${
                    paintCalc.m2 === p.m2
                      ? 'bg-[#EA580C] text-white border-[#F59E0B]'
                      : 'bg-[#111827] text-[#9CA3AF] border-[#1F2937] hover:bg-white/5'
                  }`}
                >
                  {p.label} ({p.m2} m²)
                </button>
              ))}
            </div>
          </div>

          {/* 3. Modalidad: Solo Mano de Obra vs Mano de Obra + Materiales */}
          <div className="space-y-2.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#FBBF24]">
              3. Modalidad de Suministro
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaintModality('solo_mano_obra')}
                className={`p-4 rounded-2xl border-2 text-left cursor-pointer transition-all ${
                  paintModality === 'solo_mano_obra'
                    ? 'border-[#38BDF8] bg-[#0284C7]/5'
                    : 'border-[#1F2937] bg-[#111827]'
                }`}
              >
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[#EA580C]/10 text-[#FBBF24]">
                  Opción A
                </span>
                <h4 className="font-bold text-sm text-[#F3F4F6] mt-1.5">Solo Mano de Obra</h4>
                <p className="text-xs text-[#9CA3AF] mt-0.5">
                  Cliente aporta la pintura. Incluye mano de obra calificada y herramientas.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setPaintModality('mano_obra_materiales')}
                className={`p-4 rounded-2xl border-2 text-left cursor-pointer transition-all ${
                  paintModality === 'mano_obra_materiales'
                    ? 'border-[#38BDF8] bg-[#0284C7]/5'
                    : 'border-[#1F2937] bg-[#111827]'
                }`}
              >
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[#059669]/15 text-[#34D399]">
                  Opción B • Llave en mano
                </span>
                <h4 className="font-bold text-sm text-[#F3F4F6] mt-1.5">Mano de Obra + Materiales</h4>
                <p className="text-xs text-[#9CA3AF] mt-0.5">
                  Incluye galones de pintura calculados + $15 de insumos (rodillos, cinta, plásticos).
                </p>
              </button>
            </div>
          </div>

          {/* 4. Calidad de Pintura (si incluye materiales) */}
          {paintCalc.isWithMaterials && (
            <div className="space-y-2.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#FBBF24]">
                4. Gama de Pintura ({paintCalc.gallons} galones estimados)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaintQuality('estandar')}
                  className={`p-3.5 rounded-2xl border-2 text-left cursor-pointer flex items-center justify-between ${
                    paintQuality === 'estandar'
                      ? 'border-[#38BDF8] bg-[#0284C7]/5'
                      : 'border-[#1F2937] bg-[#111827]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Droplets className="w-5 h-5 text-[#FBBF24]" />
                    <div>
                      <span className="font-bold text-xs text-[#F3F4F6] block">Pintura Estándar</span>
                      <span className="text-[11px] text-[#9CA3AF]">Látex lavable interior/exterior</span>
                    </div>
                  </div>
                  <span className="font-sans font-bold text-sm text-[#FBBF24]">$14/gal</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaintQuality('premium')}
                  className={`p-3.5 rounded-2xl border-2 text-left cursor-pointer flex items-center justify-between ${
                    paintQuality === 'premium'
                      ? 'border-[#38BDF8] bg-[#0284C7]/5'
                      : 'border-[#1F2937] bg-[#111827]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="w-5 h-5 text-amber-400" />
                    <div>
                      <span className="font-bold text-xs text-[#F3F4F6] block">Pintura Premium</span>
                      <span className="text-[11px] text-[#9CA3AF]">100% acrílica antihongos / UV</span>
                    </div>
                  </div>
                  <span className="font-sans font-bold text-sm text-[#FBBF24]">$35/gal</span>
                </button>
              </div>
            </div>
          )}

          {/* 5. Condiciones adicionales */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#FBBF24]">
              Condiciones Especiales en Sitio (Opcional)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <label className="flex items-center justify-between p-3 rounded-xl border border-[#1F2937] bg-white/5/50 cursor-pointer">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={paintHeightSurcharge}
                    onChange={(e) => setPaintHeightSurcharge(e.target.checked)}
                  />
                  <span className="font-semibold text-[#F3F4F6]">Altura &gt; 3 metros (escalera/andamio)</span>
                </div>
                <span className="font-bold text-[#38BDF8]">+15%</span>
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl border border-[#1F2937] bg-white/5/50 cursor-pointer">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={paintPatchingRepair}
                    onChange={(e) => setPaintPatchingRepair(e.target.checked)}
                  />
                  <span className="font-semibold text-[#F3F4F6]">Resane menor de huecos y fisuras</span>
                </div>
                <span className="font-bold text-[#38BDF8]">+$20.00</span>
              </label>
            </div>
          </div>

          {/* Resumen y Botón para enviar al Cotizador */}
          <div className="bg-white/5 border border-[#1F2937] rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[#9CA3AF]">
                  Mano de Obra ({paintCalc.m2} m² × ${paintCalc.ratePerM2.toFixed(2)}/m²):
                </span>
                <span className="font-bold text-[#F3F4F6]">${paintCalc.laborWithMin.toFixed(2)}</span>
              </div>
              {paintCalc.minApplied && (
                <div className="text-[11px] text-[#F59E0B] font-semibold">
                  * Se aplica cargo mínimo de servicio de pintura ($75.00 USD).
                </div>
              )}
              {paintCalc.isWithMaterials && (
                <div className="flex justify-between">
                  <span className="text-[#9CA3AF]">
                    Materiales ({paintCalc.gallons} gal × ${paintCalc.gallonPrice} + $15 insumos):
                  </span>
                  <span className="font-bold text-[#34D399]">${paintCalc.materialsTotal.toFixed(2)}</span>
                </div>
              )}
              {paintHeightSurcharge && (
                <div className="flex justify-between">
                  <span className="text-[#9CA3AF]">Recargo por altura (&gt;3m):</span>
                  <span className="font-bold text-[#F3F4F6]">+${paintCalc.heightSurchargeAmount.toFixed(2)}</span>
                </div>
              )}
              {paintPatchingRepair && (
                <div className="flex justify-between">
                  <span className="text-[#9CA3AF]">Resane puntual de fisuras:</span>
                  <span className="font-bold text-[#F3F4F6]">+${paintCalc.patchingAmount.toFixed(2)}</span>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-[#1F2937] flex items-baseline justify-between">
              <div>
                <span className="text-xs font-extrabold uppercase text-[#FBBF24] block">
                  Total Estimado Pintura
                </span>
                <span className="text-[11px] text-[#F59E0B] font-semibold">
                  Anticipo 50%: ${(paintCalc.grandTotal * 0.5).toFixed(2)} USD
                </span>
              </div>
              <span className="font-sans font-bold text-2xl sm:text-3xl text-[#FBBF24]">
                ${paintCalc.grandTotal.toFixed(2)} USD
              </span>
            </div>

            <button
              type="button"
              disabled={paintCalc.m2 <= 0}
              onClick={handleSendPaintingToQuoter}
              className="w-full py-3.5 px-5 rounded-2xl bg-[#EA580C] hover:bg-[#C2410C] disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <span>Enviar Desglose al Cotizador Oficial (${paintCalc.grandTotal.toFixed(2)})</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Navegación inferior fija (estilo app móvil) */}
      <nav className="fixed bottom-0 inset-x-0 z-40 q-no-print">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="flex items-stretch gap-1 p-1.5 bg-[#111827]/95 backdrop-blur-md border border-[#1F2937] rounded-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.45)]">
            <button
              type="button"
              onClick={() => { setActiveTab('quoter'); window.scrollTo({ top: 0 }); }}
              className={`flex-1 py-2 px-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                activeTab === 'quoter' ? 'bg-[#EA580C] text-white shadow-xs' : 'text-[#9CA3AF]'
              }`}
            >
              <FileText className="w-5 h-5" />
              <span>Cotizar</span>
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('orders'); window.scrollTo({ top: 0 }); }}
              className={`flex-1 py-2 px-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                activeTab === 'orders' ? 'bg-[#EA580C] text-white shadow-xs' : 'text-[#9CA3AF]'
              }`}
            >
              <Package className="w-5 h-5" />
              <span>Pedidos ({orders.length})</span>
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('catalog'); window.scrollTo({ top: 0 }); }}
              className={`flex-1 py-2 px-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                activeTab === 'catalog' ? 'bg-[#EA580C] text-white shadow-xs' : 'text-[#9CA3AF]'
              }`}
            >
              <DollarSign className="w-5 h-5" />
              <span>Precios ({services.length})</span>
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('calculators'); window.scrollTo({ top: 0 }); }}
              className={`flex-1 py-2 px-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                activeTab === 'calculators' ? 'bg-[#EA580C] text-white shadow-xs' : 'text-[#9CA3AF]'
              }`}
            >
              <Paintbrush className="w-5 h-5" />
              <span>Pintura</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Botón flotante: ir al cotizador */}
      {activeTab !== 'quoter' && (
        <button
          type="button"
          onClick={() => { setActiveTab('quoter'); window.scrollTo({ top: 0 }); }}
          title="Abrir cotizador"
          className="fixed bottom-24 right-4 z-40 w-14 h-14 rounded-full bg-[#EA580C] hover:bg-[#C2410C] text-white shadow-lg flex items-center justify-center transition-all active:scale-95 cursor-pointer q-no-print"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}
    </div>
  );
};

