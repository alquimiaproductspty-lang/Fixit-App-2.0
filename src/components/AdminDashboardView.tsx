import React, { useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  orderBy, 
  setDoc, 
  doc, 
  updateDoc, 
  deleteDoc,
  serverTimestamp,
  where,
  getDocs
} from 'firebase/firestore';
import { db, auth, AuthState } from '../lib/firebase';
import { getNextMonthlyOrderNumber } from '../lib/orderConsecutive';
import { FIXIT_CATALOG } from '../data/catalog';
import { sanitizeForFirestore, updateOrderInFirestore, assignTechnicianToOrder, getQuotesFromFirestore, updateQuoteInFirestore } from '../lib/firestoreService';
import { normalizeStatus, OFFICIAL_STATUS_DISPLAY, type OfficialRequestStatus, type ManagedQuote, type QuoteStatus } from '../types';
import { 
  Users, 
  Wrench, 
  DollarSign, 
  Package, 
  Search, 
  Download, 
  Plus, 
  MessageCircle, 
  Mail, 
  Phone, 
  Star, 
  AlertCircle, 
  AlertTriangle,
  ShieldCheck, 
  RefreshCw, 
  TrendingUp, 
  X, 
  Hash,
  LayoutGrid,
  List,
  Sparkles,
  Trash2,
  Calendar,
  MapPin,
  Clock,
  CheckCircle2,
  User,
  FileText
} from 'lucide-react';

export interface AdminFixer {
  id: string;
  nombre: string;
  especialidad: 'Plomería' | 'Electricidad' | 'Reparaciones del hogar' | 'Pintura residencial' | string;
  telefono: string;
  correo?: string;
  disponibilidad: 'Disponible' | 'En servicio' | 'Inactivo';
  calificacion: number;
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
  };
  total_facturado?: number;
  precio_regular?: number;
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

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  authState,
  onGoHome,
  onOpenFixerView,
}) => {
  const user = authState.user;
  const isAdmin = user?.isAdmin || user?.role === 'ADMIN';

  useEffect(() => {
    if (!authState.loading && !isAdmin) {
      onGoHome();
    }
  }, [authState.loading, isAdmin, onGoHome]);

  // Tab State: [Resumen y KPIs] | [Cotizaciones] | [Pedidos] | [Clientes] | [Fixers] | [Agenda]
  const [activeTab, setActiveTab] = useState<'kpis' | 'quotes' | 'orders' | 'clients' | 'fixers' | 'agenda'>('kpis');

  const [fixerViewMode, setFixerViewMode] = useState<'cards' | 'table'>('cards');

  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [clients, setClients] = useState<AdminUser[]>([]);
  const [fixers, setFixers] = useState<AdminFixer[]>([]);
  const [quotes, setQuotes] = useState<ManagedQuote[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingClients, setLoadingClients] = useState(true);
  const [loadingFixers, setLoadingFixers] = useState(true);
  const [loadingQuotes, setLoadingQuotes] = useState(true);

  const [clientSearch, setClientSearch] = useState('');
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [fixerFilter, setFixerFilter] = useState('all');
  const [quoteSearch, setQuoteSearch] = useState('');
  const [quoteStatusFilter, setQuoteStatusFilter] = useState('all');

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

  const [isCreateOrderModalOpen, setIsCreateOrderModalOpen] = useState(false);
  const [manualClientName, setManualClientName] = useState('');
  const [manualClientPhone, setManualClientPhone] = useState('');
  const [manualClientEmail, setManualClientEmail] = useState('');
  const [manualSelectedCatalogId, setManualSelectedCatalogId] = useState(FIXIT_CATALOG[0]?.id || 'custom');
  const [manualServiceName, setManualServiceName] = useState(FIXIT_CATALOG[0]?.service_name || '');
  const [manualCategory, setManualCategory] = useState(FIXIT_CATALOG[0]?.category || 'Reparaciones del hogar');
  const [manualAmount, setManualAmount] = useState(String(FIXIT_CATALOG[0]?.price || 35));
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

  const [nextConsecutivePreview, setNextConsecutivePreview] = useState<string>('');
  const [isGeneratingConsecutive, setIsGeneratingConsecutive] = useState(false);

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
            nombre: data.nombre || data.displayName || 'Fixer FIXIT',
            especialidad: data.especialidad || 'Reparaciones del hogar',
            telefono: data.telefono || data.phone || '',
            correo: data.correo || data.email,
            disponibilidad: data.disponibilidad || (data.activo === false ? 'Inactivo' : 'Disponible'),
            calificacion: typeof data.calificacion === 'number' ? data.calificacion : 4.9,
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
                nombre: tData.nombre || 'Técnico FIXIT',
                especialidad: tData.especialidad || 'Reparaciones del hogar',
                telefono: tData.telefono || '',
                correo: tData.correo,
                disponibilidad: tData.activo === false ? 'Inactivo' : 'Disponible',
                calificacion: typeof tData.calificacion === 'number' ? tData.calificacion : 5.0,
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
        calificacion: 5.0,
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

    setSavingManualOrder(true);
    try {
      const monthlyConsecutive = await getNextMonthlyOrderNumber();
      const orderDocId = `REQ-${Date.now().toString().slice(-6)}`;

      let serviceCategory = manualCategory;
      let serviceName = manualServiceName;
      if (manualSelectedCatalogId && manualSelectedCatalogId !== 'custom') {
        const catService = FIXIT_CATALOG.find((s) => s.id === manualSelectedCatalogId);
        if (catService) {
          serviceCategory = catService.category;
          serviceName = catService.service_name;
        }
      }

      const selectedFixer = fixers.find((f) => f.id === manualFixerId);
      const priceNum = parseFloat(manualAmount) || 35;
      const nowIso = new Date().toISOString();

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
        },
        direccion: manualAddress.trim(),
        fecha: manualScheduledDate || nowIso,
        horario_preferido: manualScheduledDate ? `Agendado: ${manualScheduledDate}` : 'Hoy',
        precio_regular: priceNum,
        total_facturado: priceNum,
        cotizacion: priceNum,
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

  const handleTestGenerateConsecutive = async () => {
    setIsGeneratingConsecutive(true);
    try {
      const generated = await getNextMonthlyOrderNumber();
      setNextConsecutivePreview(generated);
    } catch (e) {
      console.error('Error al generar consecutivo:', e);
    } finally {
      setIsGeneratingConsecutive(false);
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

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-[#FFFEFA] border border-[#DED4C5] rounded-3xl text-center space-y-4 shadow-sm">
        <AlertCircle className="w-12 h-12 text-[#B98A43] mx-auto" />
        <h2 className="font-serif font-bold text-xl text-[#1F2421]">Acceso Restringido</h2>
        <p className="text-xs text-[#756A5D] leading-relaxed">
          Esta vista está reservada exclusivamente para usuarios administradores (role === 'ADMIN').
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
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
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
            <span className="text-xs font-semibold text-[#756A5D]">Facturación Pedidos</span>
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
          <p className="text-[11px] text-[#756A5D]">Ingresos de órdenes no canceladas</p>
        </div>

        <div
          onClick={() => setActiveTab('quotes')}
          className="bg-[#FFFEFA] border border-[#0B72D9]/40 hover:border-[#0B72D9] rounded-3xl p-4 sm:p-5 shadow-2xs space-y-2 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#082D60]">Cotizado por Fixers</span>
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

        <div className="bg-[#FFFEFA] border border-[#DED4C5] rounded-3xl p-4 sm:p-5 shadow-2xs space-y-2 col-span-2 lg:col-span-1">
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
          onClick={() => setActiveTab('quotes')}
          className={`flex-1 sm:flex-initial py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
            activeTab === 'quotes' ? 'bg-[#082D60] text-white shadow-xs' : 'text-[#756A5D] hover:text-[#1F2421]'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Cotizaciones e Ingresos ({quotes.length})</span>
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
          <div className="bg-[#FFFEFA] border border-[#DED4C5] rounded-3xl p-5 sm:p-6 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Hash className="w-5 h-5 text-[#0B72D9]" />
                  <h3 className="font-serif font-bold text-lg text-[#1F2421]">
                    Sistema de Numeración Correlativa Mensual (FIX-YYMM-####)
                  </h3>
                </div>
                <p className="text-xs text-[#756A5D] mt-1">
                  Mecanismo transaccional atómico en <code>counters/orders_YYYY_MM</code> mediante <code>runTransaction</code>.
                </p>
              </div>
              <button
                type="button"
                onClick={handleTestGenerateConsecutive}
                disabled={isGeneratingConsecutive}
                className="py-2.5 px-4 rounded-xl bg-[#0B72D9]/10 hover:bg-[#0B72D9]/20 border border-[#0B72D9]/30 text-[#0B72D9] font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingConsecutive ? 'animate-spin' : ''}`} />
                <span>Simular Consecutivo Atómico</span>
              </button>
            </div>

            {nextConsecutivePreview && (
              <div className="p-4 rounded-2xl bg-[#53653D]/10 border border-[#53653D]/30 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-[#53653D] uppercase tracking-wider block">
                    Consecutivo Generado:
                  </span>
                  <span className="font-mono font-bold text-xl sm:text-2xl text-[#1F2421]">
                    {nextConsecutivePreview}
                  </span>
                </div>
              </div>
            )}
          </div>

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
                      <td className="py-4 px-4"><div className="h-4 bg-[#DED4C5]/40 rounded w-24" /></td>
                      <td className="py-4 px-4"><div className="h-4 bg-[#DED4C5]/40 rounded w-20" /></td>
                      <td className="py-4 px-4"><div className="h-4 bg-[#DED4C5]/40 rounded w-16 ml-auto" /></td>
                    </tr>
                  ))
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[#756A5D]">
                      <Package className="w-8 h-8 text-[#DED4C5] mx-auto mb-2" />
                      <p className="font-semibold text-[#1F2421]">No se encontraron pedidos</p>
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((ord) => {
                    const consecutivo = ord.numero_pedido || ord.consecutiveId || ord.orderNumber || ord.codigo_seguimiento || 'FIX-PENDIENTE';
                    const officialStatus = normalizeStatus(ord.estado);
                    const isOfficialListed = ORDER_STATUS_OPTIONS.some((o) => o.value === officialStatus);
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
                        </td>
                        <td className="py-3 px-4 font-serif font-bold text-[#1F2421] whitespace-nowrap">
                          ${(ord.total_facturado ?? ord.precio_regular ?? 35).toFixed(2)} USD
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
                                className="p-1.5 rounded-lg bg-[#53653D]/10 text-[#53653D] hover:bg-[#53653D]/20 transition-colors"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                              </a>
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
              <h2 className="font-serif font-bold text-xl text-[#1F2421]">Directorio de Fixers ({filteredFixers.length})</h2>
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

          <div className="overflow-x-auto rounded-2xl border border-[#DED4C5]/80">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F6F4EF] border-b border-[#DED4C5] text-[#756A5D] uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="py-3 px-4">Nombre</th>
                  <th className="py-3 px-4">Especialidad</th>
                  <th className="py-3 px-4">Teléfono</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DED4C5]/60 bg-[#FFFEFA]">
                {filteredFixers.map((fixer) => (
                  <tr key={fixer.id} className="hover:bg-[#F6F4EF]/50 transition-colors">
                    <td className="py-3 px-4 font-bold text-[#1F2421]">{fixer.nombre}</td>
                    <td className="py-3 px-4 font-medium text-[#0B72D9]">{fixer.especialidad}</td>
                    <td className="py-3 px-4 font-mono">{fixer.telefono || 'N/A'}</td>
                    <td className="py-3 px-4">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-[#53653D]/10 text-[#53653D] border-[#53653D]/30">
                        {fixer.disponibilidad}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setFixerToDelete(fixer)}
                        className="p-1 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
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
                    <th className="py-3.5 px-4">Estado</th>
                    <th className="py-3.5 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DED4C5]/60 text-xs">
                  {filteredQuotes.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-[#756A5D]">
                        No hay cotizaciones registradas con este filtro.
                      </td>
                    </tr>
                  ) : (
                    filteredQuotes.map((quote) => {
                      const anticipo = quote.anticipo ?? Number(quote.total || 0) * 0.5;
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
                          <td className="py-3.5 px-4 text-right">
                            {waPhone ? (
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
                            ) : (
                              <span className="text-[11px] text-[#756A5D]">—</span>
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
            <form onSubmit={handleCreateManualOrder} className="space-y-3 text-xs max-h-[60vh] overflow-y-auto">
              <input type="text" required placeholder="Nombre Cliente" value={manualClientName} onChange={(e) => setManualClientName(e.target.value)} className="w-full p-2.5 rounded-xl border border-[#DED4C5] bg-[#F6F4EF]" />
              <input type="tel" required placeholder="Teléfono" value={manualClientPhone} onChange={(e) => setManualClientPhone(e.target.value)} className="w-full p-2.5 rounded-xl border border-[#DED4C5] bg-[#F6F4EF]" />
              <input type="text" required placeholder="Dirección" value={manualAddress} onChange={(e) => setManualAddress(e.target.value)} className="w-full p-2.5 rounded-xl border border-[#DED4C5] bg-[#F6F4EF]" />
              <input type="number" required placeholder="Monto" value={manualAmount} onChange={(e) => setManualAmount(e.target.value)} className="w-full p-2.5 rounded-xl border border-[#DED4C5] bg-[#F6F4EF]" />
              <button type="submit" className="w-full py-2.5 rounded-xl bg-[#082D60] text-white font-bold">Guardar Pedido</button>
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
                    {f.nombre} — {f.especialidad} · {f.disponibilidad}{f.zona_cobertura ? ` · ${f.zona_cobertura}` : ''}
                  </option>
                ))}
              </select>
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
    </div>
  );
};
