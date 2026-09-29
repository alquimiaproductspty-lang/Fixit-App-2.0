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
  serverTimestamp 
} from 'firebase/firestore';
import { db, auth, AuthState } from '../lib/firebase';
import { getNextMonthlyOrderNumber } from '../lib/orderConsecutive';
import { FIXIT_CATALOG } from '../data/catalog';
import { sanitizeForFirestore } from '../lib/firestoreService';
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
  User
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
}

// Initial qualified fixers for quick display or auto-seeding
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

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  authState,
  onGoHome,
}) => {
  const user = authState.user;
  const isAdmin = user?.isAdmin || user?.role === 'ADMIN';

  // 1. SEGURIDAD Y ACCESO: Validar que únicamente usuarios con role === 'ADMIN' o isAdmin === true puedan acceder
  useEffect(() => {
    if (!authState.loading && !isAdmin) {
      onGoHome();
    }
  }, [authState.loading, isAdmin, onGoHome]);

  // Tab State: [Resumen y KPIs] | [Pedidos] | [Clientes] | [Fixers]
  const [activeTab, setActiveTab] = useState<'kpis' | 'orders' | 'clients' | 'fixers'>('kpis');

  // Fixers view mode: Cards or Table
  const [fixerViewMode, setFixerViewMode] = useState<'cards' | 'table'>('cards');

  // Real-time Firestore states
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [clients, setClients] = useState<AdminUser[]>([]);
  const [fixers, setFixers] = useState<AdminFixer[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingClients, setLoadingClients] = useState(true);
  const [loadingFixers, setLoadingFixers] = useState(true);

  // Search & Filters
  const [clientSearch, setClientSearch] = useState('');
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [fixerFilter, setFixerFilter] = useState('all');

  // Modal State for New Fixer
  const [isAddFixerModalOpen, setIsAddFixerModalOpen] = useState(false);
  const [newFixerName, setNewFixerName] = useState('');
  const [newFixerPhone, setNewFixerPhone] = useState('');
  const [newFixerEmail, setNewFixerEmail] = useState('');
  const [newFixerSpecialty, setNewFixerSpecialty] = useState<string>('Plomería');
  const [newFixerZone, setNewFixerZone] = useState('Ciudad de Panamá');
  const [savingFixer, setSavingFixer] = useState(false);
  const [isSeedingFixers, setIsSeedingFixers] = useState(false);

  // Modal State for Deleting Fixer
  const [fixerToDelete, setFixerToDelete] = useState<AdminFixer | null>(null);
  const [isDeletingFixer, setIsDeletingFixer] = useState(false);

  // Modal State for Manual Order Creation
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

  // Modal State for Order Management (Cancel / Delete)
  const [orderToManage, setOrderToManage] = useState<AdminOrder | null>(null);
  const [isActionInProgress, setIsActionInProgress] = useState(false);

  // Consecutive Live Generator Preview & Test State
  const [nextConsecutivePreview, setNextConsecutivePreview] = useState<string>('');
  const [isGeneratingConsecutive, setIsGeneratingConsecutive] = useState(false);

  // Toast Notification state
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // 1. Subscribe to Orders in real time (from 'requests' and 'orders')
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

  // 2. Subscribe to Users in real time (Clientes registrados en colección 'users')
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
        // Orden descendente por fecha de registro
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

  // 3. Subscribe to Fixers (técnicos) in real time
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

  // 2. TARJETAS DE MÉTRICAS SUPERIORES (KPIs EN TIEMPO REAL)
  const totalOrdersCount = orders.length;

  const totalRevenue = useMemo(() => {
    return orders.reduce((sum, ord) => {
      const estado = (ord.estado || '').toLowerCase();
      if (!estado.includes('cancel')) {
        const val = ord.total_facturado ?? ord.precio_regular ?? ord.servicio_probable?.price ?? 0;
        return sum + (typeof val === 'number' ? val : parseFloat(val) || 0);
      }
      return sum;
    }, 0);
  }, [orders]);

  const totalClientsCount = clients.length;
  const totalFixersCount = fixers.length;

  // Filtros
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
        if (orderStatusFilter === 'Pendiente' && !s.includes('pendient') && !s.includes('nuev')) return false;
        if (orderStatusFilter === 'En camino' && !s.includes('camino') && !s.includes('asigna') && !s.includes('program')) return false;
        if (orderStatusFilter === 'En progreso' && !s.includes('progres') && !s.includes('sitio')) return false;
        if (orderStatusFilter === 'Completado' && !s.includes('complet')) return false;
        if (orderStatusFilter === 'Cancelado' && !s.includes('cancel')) return false;
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

  // Exportar Clientes a CSV
  const handleExportClientsCSV = () => {
    if (clients.length === 0) {
      alert('No hay clientes registrados para exportar.');
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

  // Enlace seguro de WhatsApp (+507)
  const getWhatsAppLink = (phone?: string, text?: string) => {
    if (!phone) return '#';
    let clean = phone.replace(/\D/g, '');
    if (clean.length === 8 && !clean.startsWith('507')) {
      clean = `507${clean}`;
    }
    const message = text ? `?text=${encodeURIComponent(text)}` : '';
    return `https://wa.me/${clean}${message}`;
  };

  // 1. Registro de nuevo Fixer en Firestore
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

  // 1. GESTIÓN DE FIXERS: Confirmar eliminación de Fixer
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

  // Persistir técnicos idóneos en Firestore
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

  // 2. GESTIÓN MANUAL DE PEDIDOS (CREACIÓN EXTERNA)
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
      alert('Ingresa el nombre del cliente');
      return;
    }
    if (!manualClientPhone.trim()) {
      alert('Ingresa el teléfono del cliente');
      return;
    }
    if (!manualAddress.trim()) {
      alert('Ingresa la dirección del servicio');
      return;
    }

    setSavingManualOrder(true);
    try {
      // 1. Obtener consecutivo atómico mensual FIX-YYMM-####
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

      // Reset Form
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

  // 3. CANCELACIÓN Y ELIMINACIÓN DE PEDIDOS: Cancelar Pedido (marcar 'Cancelado')
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

  // 3. CANCELACIÓN Y ELIMINACIÓN DE PEDIDOS: Eliminar Registro Definitivo (deleteDoc)
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

  // Simulador de consecutivo atómico mensual
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

  // Actualizador rápido de estado de orden
  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const updateData = {
        estado: newStatus,
        updatedAt: new Date().toISOString(),
      };
      await updateDoc(doc(db, 'requests', orderId), updateData);
      try {
        await updateDoc(doc(db, 'orders', orderId), updateData);
      } catch {}
      showToast(`Estado actualizado a: ${newStatus}`, 'info');
    } catch (err: any) {
      console.error('[Admin] Error actualizando estado:', err);
      showToast(`Error actualizando estado: ${err.message || 'Error'}`, 'error');
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

        <div className="flex items-center gap-2.5">
          <button
            onClick={onGoHome}
            className="py-2.5 px-4 rounded-xl border border-[#DED4C5] bg-[#FFFEFA] hover:bg-[#F6F4EF] text-xs font-semibold text-[#1F2421] transition-colors cursor-pointer"
          >
            Ver App Cliente
          </button>
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

      {/* 2. TARJETAS DE MÉTRICAS SUPERIORES (KPIs EN TIEMPO REAL) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Órdenes Totales */}
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

        {/* Facturación Total ($ USD) con formato $XX,XXX.XX */}
        <div className="bg-[#FFFEFA] border border-[#DED4C5] rounded-3xl p-4 sm:p-5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#756A5D]">Facturación Total</span>
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

        {/* Total Clientes */}
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

        {/* Total Fixers */}
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

      {/* Navigation Tabs: [Resumen y KPIs] | [Pedidos] | [Clientes] | [Fixers] */}
      <div className="flex items-center gap-1.5 p-1 bg-[#DED4C5]/40 rounded-2xl w-full sm:w-auto overflow-x-auto">
        <button
          onClick={() => setActiveTab('kpis')}
          className={`flex-1 sm:flex-initial py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
            activeTab === 'kpis'
              ? 'bg-[#FFFEFA] text-[#082D60] shadow-xs'
              : 'text-[#756A5D] hover:text-[#1F2421]'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Resumen y KPIs</span>
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`flex-1 sm:flex-initial py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
            activeTab === 'orders'
              ? 'bg-[#FFFEFA] text-[#082D60] shadow-xs'
              : 'text-[#756A5D] hover:text-[#1F2421]'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Pedidos ({orders.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('clients')}
          className={`flex-1 sm:flex-initial py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
            activeTab === 'clients'
              ? 'bg-[#FFFEFA] text-[#082D60] shadow-xs'
              : 'text-[#756A5D] hover:text-[#1F2421]'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Clientes ({clients.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('fixers')}
          className={`flex-1 sm:flex-initial py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
            activeTab === 'fixers'
              ? 'bg-[#FFFEFA] text-[#082D60] shadow-xs'
              : 'text-[#756A5D] hover:text-[#1F2421]'
          }`}
        >
          <Wrench className="w-4 h-4" />
          <span>Fixers ({fixers.length})</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: RESUMEN Y SISTEMA DE CONSECUTIVOS MENSUALES            */}
      {/* ============================================================== */}
      {activeTab === 'kpis' && (
        <div className="space-y-6">
          {/* Card: Generador de Consecutivo Mensual Atómico */}
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
                  Mecanismo transaccional atómico en <code>counters/orders_YYYY_MM</code> mediante <code>runTransaction</code> para evitar colisiones si dos clientes ordenan simultáneamente.
                </p>
              </div>

              <button
                type="button"
                onClick={handleTestGenerateConsecutive}
                disabled={isGeneratingConsecutive}
                className="py-2.5 px-4 rounded-xl bg-[#0B72D9]/10 hover:bg-[#0B72D9]/20 border border-[#0B72D9]/30 text-[#0B72D9] font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer self-start sm:self-auto disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingConsecutive ? 'animate-spin' : ''}`} />
                <span>Simular Consecutivo Atómico</span>
              </button>
            </div>

            {nextConsecutivePreview && (
              <div className="p-4 rounded-2xl bg-[#53653D]/10 border border-[#53653D]/30 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-[#53653D] uppercase tracking-wider block">
                    Consecutivo Generado Atómicamente en Firestore:
                  </span>
                  <span className="font-mono font-bold text-xl sm:text-2xl text-[#1F2421]">
                    {nextConsecutivePreview}
                  </span>
                </div>
                <span className="text-xs text-[#53653D] font-medium hidden sm:inline">
                  Contador en: <code>counters/orders_{new Date().getFullYear()}_{String(new Date().getMonth() + 1).padStart(2, '0')}</code>
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs">
              <div className="p-3.5 rounded-2xl bg-[#F6F4EF] border border-[#DED4C5]">
                <span className="font-bold text-[#1F2421] block mb-1">Estructura del Formato:</span>
                <p className="text-[#756A5D] leading-relaxed">
                  Prefijo <strong>FIX-</strong> + Año (2 cifras) + Mes (2 cifras) + <strong>-####</strong> correlativo de 4 cifras con ceros a la izquierda (ej. FIX-2609-0001).
                </p>
              </div>
              <div className="p-3.5 rounded-2xl bg-[#F6F4EF] border border-[#DED4C5]">
                <span className="font-bold text-[#1F2421] block mb-1">Reinicio Automático:</span>
                <p className="text-[#756A5D] leading-relaxed">
                  Cada nuevo mes calendario el contador se reinicia a 0001 automáticamente mediante el documento independiente mensual.
                </p>
              </div>
              <div className="p-3.5 rounded-2xl bg-[#F6F4EF] border border-[#DED4C5]">
                <span className="font-bold text-[#1F2421] block mb-1">Garantía Atómica:</span>
                <p className="text-[#756A5D] leading-relaxed">
                  Respaldado por <code>runTransaction(db)</code> bloqueando lecturas simultáneas para garantizar estricta unicidad.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Actividad Reciente de Pedidos */}
            <div className="bg-[#FFFEFA] border border-[#DED4C5] rounded-3xl p-5 shadow-2xs space-y-3">
              <h3 className="font-serif font-bold text-base text-[#1F2421] flex items-center justify-between">
                <span>Últimos Pedidos con Consecutivo</span>
                <button
                  onClick={() => setActiveTab('orders')}
                  className="text-xs text-[#0B72D9] font-bold hover:underline"
                >
                  Ver todos
                </button>
              </h3>
              <div className="divide-y divide-[#DED4C5]/60 text-xs">
                {orders.length === 0 ? (
                  <p className="py-4 text-center text-[#756A5D]">No hay pedidos registrados aún.</p>
                ) : (
                  orders.slice(0, 5).map((ord) => (
                    <div key={ord.id} className="py-2.5 flex items-center justify-between">
                      <div>
                        <span className="font-mono font-bold text-[#082D60] block">
                          {ord.numero_pedido || ord.consecutiveId || ord.orderNumber || ord.codigo_seguimiento || 'FIX-PENDIENTE'}
                        </span>
                        <span className="text-[#756A5D] truncate block max-w-[200px]">
                          {ord.cliente?.nombre || 'Cliente FIXIT'} • {ord.servicio_probable?.service_name || 'Servicio'}
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

            {/* Disponibilidad de Fixers */}
            <div className="bg-[#FFFEFA] border border-[#DED4C5] rounded-3xl p-5 shadow-2xs space-y-3">
              <h3 className="font-serif font-bold text-base text-[#1F2421] flex items-center justify-between">
                <span>Estado de Fixers Idóneos</span>
                <button
                  onClick={() => setActiveTab('fixers')}
                  className="text-xs text-[#0B72D9] font-bold hover:underline"
                >
                  Ver directorio
                </button>
              </h3>
              <div className="space-y-2 text-xs">
                {fixers.slice(0, 4).map((f) => (
                  <div key={f.id} className="p-2.5 rounded-xl bg-[#F6F4EF] border border-[#DED4C5]/60 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-[#1F2421] block">{f.nombre}</span>
                      <span className="text-[11px] text-[#756A5D]">{f.especialidad} • {f.zona_cobertura}</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      f.disponibilidad === 'Disponible' 
                        ? 'bg-[#53653D]/10 text-[#53653D] border-[#53653D]/30' 
                        : f.disponibilidad === 'En servicio'
                        ? 'bg-[#B98A43]/10 text-[#B98A43] border-[#B98A43]/30'
                        : 'bg-[#756A5D]/10 text-[#756A5D] border-[#756A5D]/30'
                    }`}>
                      {f.disponibilidad}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: HISTORIAL DE PEDIDOS CON CORRELATIVO (FIX-YYMM-####)   */}
      {/* ============================================================== */}
      {activeTab === 'orders' && (
        <div className="bg-[#FFFEFA] border border-[#DED4C5] rounded-3xl p-4 sm:p-6 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="font-serif font-bold text-xl text-[#1F2421]">
                Historial de Pedidos ({filteredOrders.length})
              </h2>
              <p className="text-xs text-[#756A5D]">
                Listado detallado con consecutivo mensual correlativo, cliente, fixer asignado, servicio, monto y control de estado.
              </p>
            </div>

            {/* Actions & Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setIsCreateOrderModalOpen(true)}
                className="py-1.5 px-3.5 rounded-xl bg-[#082D60] hover:bg-[#062248] text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
                id="btn-create-manual-order-header"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Crear Pedido Manual</span>
              </button>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#756A5D] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar consecutivo, cliente o servicio..."
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

          {/* Table with Skeletons and Empty State */}
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
                      <td className="py-4 px-4"><div className="h-4 bg-[#DED4C5]/40 rounded w-32 mb-1" /><div className="h-3 bg-[#DED4C5]/30 rounded w-20" /></td>
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
                      <p className="text-[11px] text-[#756A5D] mt-1">Puedes registrar un nuevo pedido manualmente con el botón superior.</p>
                      <button
                        onClick={() => setIsCreateOrderModalOpen(true)}
                        className="mt-3 py-1.5 px-3 rounded-xl bg-[#082D60] text-white font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Crear Pedido Manual
                      </button>
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((ord) => {
                    const consecutivo = ord.numero_pedido || ord.consecutiveId || ord.orderNumber || ord.codigo_seguimiento || 'FIX-PENDIENTE';
                    return (
                      <tr key={ord.id} className="hover:bg-[#F6F4EF]/50 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-[#082D60] whitespace-nowrap">
                          {consecutivo}
                          {ord.origen === 'ADMIN_MANUAL' && (
                            <span className="block text-[9px] font-sans font-bold text-[#B98A43]">Manual</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-[#1F2421] block">{ord.cliente?.nombre || 'Cliente FIXIT'}</span>
                          <span className="text-[11px] text-[#756A5D]">{ord.cliente?.telefono || 'Sin teléfono'}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-medium text-[#1F2421] block">{ord.servicio_probable?.service_name || 'Reparaciones del hogar'}</span>
                          <span className="text-[11px] text-[#756A5D] truncate block max-w-xs">{ord.direccion || 'Ciudad de Panamá'}</span>
                        </td>
                        <td className="py-3 px-4 font-serif font-bold text-[#1F2421] whitespace-nowrap">
                          ${(ord.total_facturado ?? ord.precio_regular ?? 35).toFixed(2)} USD
                        </td>
                        <td className="py-3 px-4 text-[#756A5D]">
                          {ord.tecnico_nombre || ord.tecnico_asignado ? (
                            <span className="font-semibold text-[#1F2421] flex items-center gap-1">
                              <Wrench className="w-3.5 h-3.5 text-[#B98A43]" />
                              {ord.tecnico_nombre || ord.tecnico_asignado}
                            </span>
                          ) : (
                            <span className="text-[11px] italic text-[#B98A43]">Sin asignar</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <select
                            value={ord.estado || 'Pendiente'}
                            onChange={(e) => handleUpdateOrderStatus(ord.id, e.target.value)}
                            className="text-[11px] font-bold py-1 px-2 rounded-lg bg-[#F6F4EF] border border-[#DED4C5] text-[#1F2421] cursor-pointer"
                          >
                            <option value="Pendiente">Pendiente</option>
                            <option value="En camino">En camino</option>
                            <option value="En progreso">En progreso</option>
                            <option value="Completado">Completado</option>
                            <option value="Cancelado">Cancelado</option>
                          </select>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {ord.cliente?.telefono && (
                              <a
                                href={getWhatsAppLink(ord.cliente.telefono, `Hola ${ord.cliente.nombre || ''}, te contactamos de FIXIT respecto a tu pedido correlativo ${consecutivo}.`)}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 rounded-lg bg-[#53653D]/10 text-[#53653D] hover:bg-[#53653D]/20 transition-colors"
                                title="Contactar por WhatsApp"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() => setOrderToManage(ord)}
                              className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Cancelar o Eliminar pedido"
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
      {/* TAB 3: CLIENTES REGISTRADOS                                    */}
      {/* ============================================================== */}
      {activeTab === 'clients' && (
        <div className="bg-[#FFFEFA] border border-[#DED4C5] rounded-3xl p-4 sm:p-6 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="font-serif font-bold text-xl text-[#1F2421]">
                Clientes Registrados ({filteredClients.length})
              </h2>
              <p className="text-xs text-[#756A5D]">
                Usuarios registrados en tiempo real en la colección <code>users</code> en Cloud Firestore.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#756A5D] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar por nombre, correo o teléfono..."
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs rounded-xl bg-[#F6F4EF] border border-[#DED4C5] focus:outline-none focus:border-[#0B72D9] w-64"
                />
              </div>

              <button
                type="button"
                onClick={handleExportClientsCSV}
                className="py-1.5 px-3.5 rounded-xl bg-[#53653D] hover:bg-[#435331] text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
                id="btn-export-clients-csv"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exportar a CSV</span>
              </button>
            </div>
          </div>

          {/* Table with Skeletons */}
          <div className="overflow-x-auto rounded-2xl border border-[#DED4C5]/80">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F6F4EF] border-b border-[#DED4C5] text-[#756A5D] uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="py-3 px-4">Nombre</th>
                  <th className="py-3 px-4">Correo</th>
                  <th className="py-3 px-4">Teléfono</th>
                  <th className="py-3 px-4">Ciudad / Zona</th>
                  <th className="py-3 px-4">Fecha Registro</th>
                  <th className="py-3 px-4 text-right">Contacto Directo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DED4C5]/60 bg-[#FFFEFA]">
                {loadingClients ? (
                  [1, 2, 3].map((n) => (
                    <tr key={`skel-cli-${n}`} className="animate-pulse">
                      <td className="py-4 px-4"><div className="h-4 bg-[#DED4C5]/40 rounded w-28" /></td>
                      <td className="py-4 px-4"><div className="h-4 bg-[#DED4C5]/40 rounded w-36" /></td>
                      <td className="py-4 px-4"><div className="h-4 bg-[#DED4C5]/40 rounded w-24" /></td>
                      <td className="py-4 px-4"><div className="h-4 bg-[#DED4C5]/40 rounded w-28" /></td>
                      <td className="py-4 px-4"><div className="h-4 bg-[#DED4C5]/40 rounded w-24" /></td>
                      <td className="py-4 px-4"><div className="h-4 bg-[#DED4C5]/40 rounded w-16 ml-auto" /></td>
                    </tr>
                  ))
                ) : filteredClients.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[#756A5D]">
                      <Users className="w-8 h-8 text-[#DED4C5] mx-auto mb-2" />
                      <p className="font-semibold text-[#1F2421]">No se encontraron clientes</p>
                      <p className="text-[11px] text-[#756A5D] mt-1">Los clientes registrados en Firestore aparecerán aquí automáticamente.</p>
                    </td>
                  </tr>
                ) : (
                  filteredClients.map((c) => {
                    const formattedDate = c.createdAt?.toDate 
                      ? c.createdAt.toDate().toLocaleDateString('es-PA', { day: '2-digit', month: 'short', year: 'numeric' })
                      : c.createdAt 
                      ? new Date(c.createdAt).toLocaleDateString('es-PA', { day: '2-digit', month: 'short', year: 'numeric' })
                      : 'Reciente';

                    return (
                      <tr key={c.id || c.uid} className="hover:bg-[#F6F4EF]/50 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-bold text-[#1F2421] block">
                            {c.displayName || 'Cliente Sin Nombre'}
                          </span>
                          <span className="text-[10px] font-mono text-[#756A5D]">
                            UID: {(c.uid || c.id).slice(0, 10)}...
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[#756A5D]">
                          {c.email || 'Sin correo'}
                        </td>
                        <td className="py-3 px-4 font-mono text-[#1F2421]">
                          {c.phone || 'Sin teléfono'}
                        </td>
                        <td className="py-3 px-4 text-[#756A5D]">
                          {c.city || 'Ciudad de Panamá'}
                        </td>
                        <td className="py-3 px-4 text-[#756A5D] whitespace-nowrap">
                          {formattedDate}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            {c.phone && (
                              <a
                                href={getWhatsAppLink(c.phone, `Hola ${c.displayName || ''}, te saludamos de FIXIT Panamá.`)}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 rounded-lg bg-[#53653D]/10 text-[#53653D] hover:bg-[#53653D]/20 transition-colors"
                                title="Abrir chat en WhatsApp (+507)"
                              >
                                <MessageCircle className="w-4 h-4" />
                              </a>
                            )}
                            {c.email && (
                              <a
                                href={`mailto:${c.email}?subject=Contacto%20FIXIT%20Panamá`}
                                className="p-1.5 rounded-lg bg-[#0B72D9]/10 text-[#0B72D9] hover:bg-[#0B72D9]/20 transition-colors"
                                title="Enviar correo electrónico"
                              >
                                <Mail className="w-4 h-4" />
                              </a>
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
      )}

      {/* ============================================================== */}
      {/* TAB 4: DIRECTORIO DE FIXERS (TÉCNICOS)                         */}
      {/* ============================================================== */}
      {activeTab === 'fixers' && (
        <div className="bg-[#FFFEFA] border border-[#DED4C5] rounded-3xl p-4 sm:p-6 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="font-serif font-bold text-xl text-[#1F2421]">
                Directorio de Fixers ({filteredFixers.length})
              </h2>
              <p className="text-xs text-[#756A5D]">
                Gestión de técnicos calificados en la colección <code>fixers</code> / <code>technicians</code>.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Selector de vista: Cards / Tabla */}
              <div className="flex items-center bg-[#F6F4EF] p-0.5 rounded-xl border border-[#DED4C5]">
                <button
                  type="button"
                  onClick={() => setFixerViewMode('cards')}
                  className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                    fixerViewMode === 'cards' ? 'bg-[#FFFEFA] text-[#082D60] shadow-xs' : 'text-[#756A5D]'
                  }`}
                  title="Vista de Tarjetas"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setFixerViewMode('table')}
                  className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                    fixerViewMode === 'table' ? 'bg-[#FFFEFA] text-[#082D60] shadow-xs' : 'text-[#756A5D]'
                  }`}
                  title="Vista de Tabla"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>

              <select
                value={fixerFilter}
                onChange={(e) => setFixerFilter(e.target.value)}
                className="py-1.5 px-3 text-xs rounded-xl bg-[#F6F4EF] border border-[#DED4C5] font-semibold text-[#1F2421] cursor-pointer"
              >
                <option value="all">Todas las especialidades</option>
                <option value="Plomería">Plomería</option>
                <option value="Electricidad">Electricidad</option>
                <option value="Reparaciones del hogar">Reparaciones Generales</option>
                <option value="Pintura">Pintura Residencial</option>
              </select>

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

          {/* Sincronizador de técnicos en Firestore */}
          <div className="p-3 rounded-2xl bg-[#0B72D9]/5 border border-[#0B72D9]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <span className="text-[#082D60] flex items-center gap-1.5 font-medium">
              <Sparkles className="w-4 h-4 text-[#0B72D9] shrink-0" />
              Técnicos idóneos certificados en Plomería, Electricidad, Reparaciones y Pintura con enlace directo a WhatsApp (+507).
            </span>
            <button
              type="button"
              onClick={handleSeedDefaultFixers}
              disabled={isSeedingFixers}
              className="text-[#0B72D9] font-bold hover:underline cursor-pointer disabled:opacity-50 text-[11px] self-start sm:self-auto shrink-0"
            >
              {isSeedingFixers ? 'Guardando en Firestore...' : 'Sincronizar base en Firestore'}
            </button>
          </div>

          {/* Vista de Tarjetas (Cards) */}
          {fixerViewMode === 'cards' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {loadingFixers ? (
                [1, 2, 3].map((n) => (
                  <div key={`skel-fixer-${n}`} className="p-5 rounded-2xl border border-[#DED4C5] bg-[#FFFEFA] animate-pulse space-y-3">
                    <div className="h-5 bg-[#DED4C5]/40 rounded w-36" />
                    <div className="h-4 bg-[#DED4C5]/30 rounded w-24" />
                    <div className="h-4 bg-[#DED4C5]/30 rounded w-48" />
                  </div>
                ))
              ) : filteredFixers.length === 0 ? (
                <div className="col-span-full py-12 text-center text-[#756A5D]">
                  <Wrench className="w-8 h-8 text-[#DED4C5] mx-auto mb-2" />
                  <p className="font-semibold text-[#1F2421]">No hay fixers para este filtro</p>
                  <p className="text-[11px] text-[#756A5D] mt-1">Registra un nuevo fixer o ajusta los criterios de búsqueda.</p>
                </div>
              ) : (
                filteredFixers.map((fixer) => (
                  <div
                    key={fixer.id}
                    className="p-5 rounded-2xl border border-[#DED4C5] bg-[#FFFEFA] hover:border-[#0B72D9]/60 transition-all shadow-2xs flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-serif font-bold text-base text-[#1F2421]">
                            {fixer.nombre}
                          </h4>
                          <span className="text-[11px] font-semibold text-[#0B72D9] block">
                            {fixer.especialidad}
                          </span>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          fixer.disponibilidad === 'Disponible' 
                            ? 'bg-[#53653D]/10 text-[#53653D] border-[#53653D]/30' 
                            : fixer.disponibilidad === 'En servicio'
                            ? 'bg-[#B98A43]/10 text-[#B98A43] border-[#B98A43]/30'
                            : 'bg-[#756A5D]/10 text-[#756A5D] border-[#756A5D]/30'
                        }`}>
                          {fixer.disponibilidad}
                        </span>
                      </div>

                      <p className="text-xs text-[#756A5D]">
                        📍 Zona: {fixer.zona_cobertura || 'Ciudad de Panamá'}
                      </p>

                      <div className="flex items-center gap-3 pt-1 text-xs">
                        <span className="flex items-center gap-1 text-[#B98A43] font-bold">
                          <Star className="w-3.5 h-3.5 fill-[#B98A43]" />
                          {fixer.calificacion.toFixed(1)}
                        </span>
                        <span className="text-[#756A5D]">
                          <strong>{fixer.trabajos_realizados}</strong> trabajos realizados
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[#DED4C5]/60 flex items-center justify-between gap-2">
                      <span className="text-xs font-mono font-semibold text-[#1F2421]">
                        {fixer.telefono || 'Sin teléfono'}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {fixer.telefono && (
                          <a
                            href={getWhatsAppLink(fixer.telefono, `Hola ${fixer.nombre}, te contactamos desde administración de FIXIT.`)}
                            target="_blank"
                            rel="noreferrer"
                            className="py-1.5 px-3 rounded-xl bg-[#53653D] hover:bg-[#435331] text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-colors"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                          </a>
                        )}
                        {/* 1. Botón Eliminar Fixer */}
                        <button
                          type="button"
                          onClick={() => setFixerToDelete(fixer)}
                          className="p-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title={`Eliminar técnico ${fixer.nombre}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            // Vista de Tabla
            <div className="overflow-x-auto rounded-2xl border border-[#DED4C5]/80">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F6F4EF] border-b border-[#DED4C5] text-[#756A5D] uppercase text-[10px] font-bold tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Nombre del Fixer</th>
                    <th className="py-3 px-4">Especialidad</th>
                    <th className="py-3 px-4">Teléfono (+507)</th>
                    <th className="py-3 px-4">Zona</th>
                    <th className="py-3 px-4">Disponibilidad</th>
                    <th className="py-3 px-4">Calificación</th>
                    <th className="py-3 px-4">Trabajos</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DED4C5]/60 bg-[#FFFEFA]">
                  {filteredFixers.map((fixer) => (
                    <tr key={fixer.id} className="hover:bg-[#F6F4EF]/50 transition-colors">
                      <td className="py-3 px-4 font-bold text-[#1F2421]">
                        {fixer.nombre}
                      </td>
                      <td className="py-3 px-4 font-medium text-[#0B72D9]">
                        {fixer.especialidad}
                      </td>
                      <td className="py-3 px-4 font-mono">
                        {fixer.telefono || 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-[#756A5D]">
                        {fixer.zona_cobertura || 'Ciudad de Panamá'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          fixer.disponibilidad === 'Disponible' 
                            ? 'bg-[#53653D]/10 text-[#53653D] border-[#53653D]/30' 
                            : fixer.disponibilidad === 'En servicio'
                            ? 'bg-[#B98A43]/10 text-[#B98A43] border-[#B98A43]/30'
                            : 'bg-[#756A5D]/10 text-[#756A5D] border-[#756A5D]/30'
                        }`}>
                          {fixer.disponibilidad}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-[#B98A43]">
                        ★ {fixer.calificacion.toFixed(1)}
                      </td>
                      <td className="py-3 px-4 text-[#1F2421]">
                        {fixer.trabajos_realizados}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {fixer.telefono && (
                            <a
                              href={getWhatsAppLink(fixer.telefono, `Hola ${fixer.nombre}, te contactamos desde administración de FIXIT.`)}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-[#53653D] hover:underline"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>WhatsApp</span>
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => setFixerToDelete(fixer)}
                            className="p-1 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title={`Eliminar técnico ${fixer.nombre}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 1: REGISTRAR NUEVO FIXER                                 */}
      {/* ============================================================== */}
      {isAddFixerModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#082D60]/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFEFA] border border-[#DED4C5] rounded-3xl max-w-md w-full p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#DED4C5]/60 pb-3">
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-[#0B72D9]" />
                <h3 className="font-serif font-bold text-lg text-[#1F2421]">Registrar Nuevo Fixer</h3>
              </div>
              <button
                onClick={() => setIsAddFixerModalOpen(false)}
                className="p-1 rounded-full text-[#756A5D] hover:text-[#1F2421] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateFixer} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-[#1F2421] block mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Carlos Mendoza"
                  value={newFixerName}
                  onChange={(e) => setNewFixerName(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#F6F4EF] border border-[#DED4C5] text-xs focus:outline-none focus:border-[#0B72D9]"
                />
              </div>

              <div>
                <label className="font-bold text-[#1F2421] block mb-1">Teléfono (WhatsApp Panamá) *</label>
                <input
                  type="tel"
                  required
                  placeholder="Ej. 6123-4567"
                  value={newFixerPhone}
                  onChange={(e) => setNewFixerPhone(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#F6F4EF] border border-[#DED4C5] text-xs focus:outline-none focus:border-[#0B72D9]"
                />
              </div>

              <div>
                <label className="font-bold text-[#1F2421] block mb-1">Correo Electrónico (Opcional)</label>
                <input
                  type="email"
                  placeholder="carlos.fixer@fixit.com.pa"
                  value={newFixerEmail}
                  onChange={(e) => setNewFixerEmail(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#F6F4EF] border border-[#DED4C5] text-xs focus:outline-none focus:border-[#0B72D9]"
                />
              </div>

              <div>
                <label className="font-bold text-[#1F2421] block mb-1">Especialidad Principal *</label>
                <select
                  value={newFixerSpecialty}
                  onChange={(e) => setNewFixerSpecialty(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#F6F4EF] border border-[#DED4C5] text-xs focus:outline-none focus:border-[#0B72D9] cursor-pointer"
                >
                  <option value="Plomería">Plomería</option>
                  <option value="Electricidad">Electricidad</option>
                  <option value="Reparaciones del hogar">Reparaciones Generales / Montajes</option>
                  <option value="Pintura residencial">Pintura Residencial</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-[#1F2421] block mb-1">Zona de Cobertura</label>
                <input
                  type="text"
                  placeholder="Ej. San Francisco, Bella Vista, Costa del Este"
                  value={newFixerZone}
                  onChange={(e) => setNewFixerZone(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#F6F4EF] border border-[#DED4C5] text-xs focus:outline-none focus:border-[#0B72D9]"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddFixerModalOpen(false)}
                  className="py-2.5 px-4 rounded-xl border border-[#DED4C5] font-semibold text-xs text-[#756A5D] hover:bg-[#F6F4EF] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingFixer}
                  className="py-2.5 px-5 rounded-xl bg-[#0B72D9] hover:bg-[#0962BC] text-white font-bold text-xs shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {savingFixer ? 'Guardando...' : 'Guardar Fixer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: CONFIRMAR ELIMINACIÓN DE FIXER                        */}
      {/* ============================================================== */}
      {fixerToDelete && (
        <div className="fixed inset-0 z-50 bg-[#082D60]/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFEFA] border border-[#DED4C5] rounded-3xl max-w-md w-full p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-base text-[#1F2421]">¿Eliminar Fixer del Directorio?</h3>
                <p className="text-xs text-[#756A5D]">Esta acción no se puede deshacer.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#F6F4EF] border border-[#DED4C5] text-xs space-y-1">
              <p className="font-bold text-[#1F2421]">{fixerToDelete.nombre}</p>
              <p className="text-[#756A5D]">Especialidad: <span className="font-medium text-[#082D60]">{fixerToDelete.especialidad}</span></p>
              <p className="text-[#756A5D]">Teléfono: <span className="font-mono text-[#1F2421]">{fixerToDelete.telefono}</span></p>
              <p className="text-[#756A5D]">Zona: {fixerToDelete.zona_cobertura || 'Ciudad de Panamá'}</p>
            </div>

            <p className="text-xs text-[#756A5D] leading-relaxed">
              ¿Estás seguro de eliminar al técnico <strong>{fixerToDelete.nombre}</strong>? Se borrará el documento correspondiente en Firestore.
            </p>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setFixerToDelete(null)}
                disabled={isDeletingFixer}
                className="py-2.5 px-4 rounded-xl border border-[#DED4C5] font-semibold text-xs text-[#756A5D] hover:bg-[#F6F4EF] cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteFixer}
                disabled={isDeletingFixer}
                className="py-2.5 px-5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeletingFixer ? 'Eliminando...' : 'Sí, Eliminar Técnico'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: CREAR PEDIDO MANUAL (GESTIÓN MANUAL EXTERNA)          */}
      {/* ============================================================== */}
      {isCreateOrderModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#082D60]/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#FFFEFA] border border-[#DED4C5] rounded-3xl max-w-lg w-full p-6 shadow-xl space-y-4 my-8 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#DED4C5]/60 pb-3">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-[#082D60]" />
                <div>
                  <h3 className="font-serif font-bold text-lg text-[#1F2421]">Crear Pedido Manual</h3>
                  <p className="text-[11px] text-[#756A5D]">Para pedidos recibidos por llamada, WhatsApp o referidos</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateOrderModalOpen(false)}
                className="p-1 rounded-full text-[#756A5D] hover:text-[#1F2421] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateManualOrder} className="space-y-3 text-xs">
              {/* Cliente */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#1F2421] block mb-1">Nombre del Cliente *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Maria Elena Díaz"
                    value={manualClientName}
                    onChange={(e) => setManualClientName(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#F6F4EF] border border-[#DED4C5] text-xs focus:outline-none focus:border-[#0B72D9]"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#1F2421] block mb-1">Teléfono (WhatsApp Panamá) *</label>
                  <input
                    type="tel"
                    required
                    placeholder="Ej. 6890-1234"
                    value={manualClientPhone}
                    onChange={(e) => setManualClientPhone(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#F6F4EF] border border-[#DED4C5] text-xs focus:outline-none focus:border-[#0B72D9]"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-[#1F2421] block mb-1">Correo Electrónico (Opcional)</label>
                <input
                  type="email"
                  placeholder="cliente@gmail.com"
                  value={manualClientEmail}
                  onChange={(e) => setManualClientEmail(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#F6F4EF] border border-[#DED4C5] text-xs focus:outline-none focus:border-[#0B72D9]"
                />
              </div>

              {/* Selector de Servicio */}
              <div>
                <label className="font-bold text-[#1F2421] block mb-1">Servicio del Catálogo FIXIT *</label>
                <select
                  value={manualSelectedCatalogId}
                  onChange={(e) => handleCatalogServiceChange(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#F6F4EF] border border-[#DED4C5] text-xs focus:outline-none focus:border-[#0B72D9] cursor-pointer"
                >
                  <optgroup label="Servicios Catalogados">
                    {FIXIT_CATALOG.map((s) => (
                      <option key={s.id} value={s.id}>
                        [{s.category}] {s.service_name} (${s.price || 35}.00)
                      </option>
                    ))}
                  </optgroup>
                  <option value="custom">-- Otro Servicio / Personalizado --</option>
                </select>
              </div>

              {manualSelectedCatalogId === 'custom' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-[#F6F4EF] border border-[#DED4C5]/80">
                  <div>
                    <label className="font-bold text-[#1F2421] block mb-1">Nombre del Servicio *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Reparación especial de ventana"
                      value={manualServiceName}
                      onChange={(e) => setManualServiceName(e.target.value)}
                      className="w-full p-2 rounded-lg bg-white border border-[#DED4C5] text-xs focus:outline-none focus:border-[#0B72D9]"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-[#1F2421] block mb-1">Categoría</label>
                    <select
                      value={manualCategory}
                      onChange={(e) => setManualCategory(e.target.value)}
                      className="w-full p-2 rounded-lg bg-white border border-[#DED4C5] text-xs focus:outline-none focus:border-[#0B72D9]"
                    >
                      <option value="Reparaciones del hogar">Reparaciones del hogar</option>
                      <option value="Plomería">Plomería</option>
                      <option value="Electricidad">Electricidad</option>
                      <option value="Pintura residencial">Pintura residencial</option>
                      <option value="Aire acondicionado">Aire acondicionado</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Fixer y Monto */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#1F2421] block mb-1">Fixer Asignado</label>
                  <select
                    value={manualFixerId}
                    onChange={(e) => setManualFixerId(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#F6F4EF] border border-[#DED4C5] text-xs focus:outline-none focus:border-[#0B72D9] cursor-pointer"
                  >
                    <option value="">-- Sin asignar por ahora --</option>
                    {fixers.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.nombre} ({f.especialidad})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-[#1F2421] block mb-1">Monto Total ($ USD) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 font-bold text-[#756A5D]">$</span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      min="1"
                      value={manualAmount}
                      onChange={(e) => setManualAmount(e.target.value)}
                      className="w-full pl-7 pr-3 p-2.5 rounded-xl bg-[#F6F4EF] border border-[#DED4C5] text-xs focus:outline-none focus:border-[#0B72D9] font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Dirección y Fecha Agendada */}
              <div>
                <label className="font-bold text-[#1F2421] block mb-1">Dirección / Ubicación en Panamá *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Bella Vista, Calle 45, Edif. Los Pinos, Apto 4B"
                  value={manualAddress}
                  onChange={(e) => setManualAddress(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#F6F4EF] border border-[#DED4C5] text-xs focus:outline-none focus:border-[#0B72D9]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#1F2421] block mb-1">Fecha y Hora Agendada</label>
                  <input
                    type="datetime-local"
                    value={manualScheduledDate}
                    onChange={(e) => setManualScheduledDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#F6F4EF] border border-[#DED4C5] text-xs focus:outline-none focus:border-[#0B72D9]"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#1F2421] block mb-1">Estado Inicial</label>
                  <select
                    value={manualInitialStatus}
                    onChange={(e) => setManualInitialStatus(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#F6F4EF] border border-[#DED4C5] text-xs focus:outline-none focus:border-[#0B72D9] cursor-pointer"
                  >
                    <option value="Pendiente">Pendiente (Nueva)</option>
                    <option value="En camino">En camino</option>
                    <option value="En progreso">En progreso</option>
                    <option value="Completado">Completado</option>
                  </select>
                </div>
              </div>

              {/* Notas */}
              <div>
                <label className="font-bold text-[#1F2421] block mb-1">Observaciones / Notas Internas</label>
                <textarea
                  rows={2}
                  placeholder="Detalles sobre el problema, estacionamiento, indicaciones del cliente..."
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#F6F4EF] border border-[#DED4C5] text-xs focus:outline-none focus:border-[#0B72D9] resize-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-[#53653D]/10 border border-[#53653D]/30 flex items-center justify-between text-[11px] text-[#53653D]">
                <span>Al guardar se generará automáticamente el consecutivo <strong>FIX-YYMM-####</strong>.</span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOrderModalOpen(false)}
                  className="py-2.5 px-4 rounded-xl border border-[#DED4C5] font-semibold text-xs text-[#756A5D] hover:bg-[#F6F4EF] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingManualOrder}
                  className="py-2.5 px-5 rounded-xl bg-[#082D60] hover:bg-[#062248] text-white font-bold text-xs shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{savingManualOrder ? 'Generando Pedido...' : 'Guardar Pedido'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 4: CANCELACIÓN Y ELIMINACIÓN DE PEDIDOS                  */}
      {/* ============================================================== */}
      {orderToManage && (
        <div className="fixed inset-0 z-50 bg-[#082D60]/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFEFA] border border-[#DED4C5] rounded-3xl max-w-md w-full p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#DED4C5]/60 pb-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-[#B98A43]" />
                <h3 className="font-serif font-bold text-base text-[#1F2421]">Gestión y Baja de Pedido</h3>
              </div>
              <button
                onClick={() => setOrderToManage(null)}
                className="p-1 rounded-full text-[#756A5D] hover:text-[#1F2421] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#F6F4EF] border border-[#DED4C5] text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-[#082D60]">
                  {orderToManage.numero_pedido || orderToManage.consecutiveId || orderToManage.orderNumber || orderToManage.codigo_seguimiento || orderToManage.id}
                </span>
                <span className="font-bold text-[#1F2421]">
                  ${(orderToManage.total_facturado ?? orderToManage.precio_regular ?? 35).toFixed(2)} USD
                </span>
              </div>
              <p className="text-[#1F2421] font-semibold">{orderToManage.cliente?.nombre || 'Cliente'}</p>
              <p className="text-[#756A5D]">{orderToManage.servicio_probable?.service_name || 'Servicio'}</p>
              <p className="text-[#756A5D]">Estado actual: <span className="font-bold text-[#082D60]">{orderToManage.estado || 'Pendiente'}</span></p>
            </div>

            <p className="text-xs text-[#756A5D]">
              Elige qué acción deseas realizar sobre esta orden:
            </p>

            <div className="space-y-2.5">
              {/* Opción A: Cancelar Pedido */}
              <div className="p-3.5 rounded-2xl border border-amber-200 bg-amber-50/60 hover:bg-amber-50 transition-colors flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-xs text-amber-900 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-amber-600" />
                      Opción A: Marcar como Cancelado
                    </h4>
                    <p className="text-[11px] text-amber-800/80 mt-0.5 leading-relaxed">
                      Cambia el estado a <strong>Cancelado</strong>. No sumará en la facturación total activa, pero se conservará en el historial de pedidos.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleConfirmCancelOrder}
                    disabled={isActionInProgress}
                    className="py-1.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shrink-0 cursor-pointer disabled:opacity-50"
                  >
                    {isActionInProgress ? 'Procesando...' : 'Cancelar Pedido'}
                  </button>
                </div>
              </div>

              {/* Opción B: Eliminar Definitivo */}
              <div className="p-3.5 rounded-2xl border border-rose-200 bg-rose-50/60 hover:bg-rose-50 transition-colors flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-xs text-rose-900 flex items-center gap-1.5">
                      <Trash2 className="w-4 h-4 text-rose-600" />
                      Opción B: Eliminar Registro Definitivo
                    </h4>
                    <p className="text-[11px] text-rose-800/80 mt-0.5 leading-relaxed">
                      Ejecuta <code>deleteDoc</code> en Firestore. Borra permanentemente el pedido si fue creado por error de prueba.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleConfirmDeleteOrder}
                    disabled={isActionInProgress}
                    className="py-1.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shrink-0 cursor-pointer disabled:opacity-50"
                  >
                    {isActionInProgress ? 'Borrando...' : 'Borrar de BD'}
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setOrderToManage(null)}
                disabled={isActionInProgress}
                className="py-2 px-4 rounded-xl border border-[#DED4C5] font-semibold text-xs text-[#756A5D] hover:bg-[#F6F4EF] cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
