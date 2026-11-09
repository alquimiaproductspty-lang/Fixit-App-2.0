export type ServiceCategory = 
  | 'Diagnóstico'
  | 'Climatización'
  | 'Plomería' 
  | 'Electricidad' 
  | 'Reparaciones del hogar'
  | 'Pintura residencial'
  | 'Aire Acondicionado'
  | 'Mantenimiento de techos'
  // Pre-configured architecture for upcoming catalog categories:
  | 'Limpieza'
  | 'Pintura'
  | 'Cerrajería'
  | 'Carpintería'
  | 'Electrodomésticos'
  | 'Jardinería'
  | 'Otros';

export type ServiceModalidad = 
  | 'Precio fijo' 
  | 'Desde' 
  | 'Diagnóstico acreditable' 
  | 'Diagnóstico urgente';

export type AppRole = 'ADMIN' | 'OPERATOR' | 'TECHNICIAN' | 'CLIENT';
export type AppLanguage = 'es' | 'en';

export type UserRole = 
  | AppRole 
  | 'Administrador' 
  | 'Operador' 
  | 'Técnico' 
  | 'Cliente';

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'activo' | 'inactivo';

export type OfficialRequestStatus = 
  | 'NUEVA'
  | 'EN_REVISION'
  | 'EVALUACION'
  | 'COTIZACION'
  | 'PENDIENTE_APROBACION'
  | 'APROBADA'
  | 'PENDIENTE_PAGO'
  | 'PAGADA'
  | 'ASIGNADA'
  | 'PROGRAMADA'
  | 'EN_PROCESO'
  | 'COMPLETADA'
  | 'CANCELADA'
  | 'ARCHIVADA';

export const ROLE_DISPLAY: Record<AppRole, { es: string; en: string }> = {
  ADMIN: { es: 'Administrador', en: 'Administrator' },
  OPERATOR: { es: 'Operador', en: 'Operator' },
  TECHNICIAN: { es: 'Técnico', en: 'Technician' },
  CLIENT: { es: 'Cliente', en: 'Client' },
};

export const OFFICIAL_STATUS_DISPLAY: Record<OfficialRequestStatus, { es: string; en: string }> = {
  NUEVA: { es: 'Nueva', en: 'New' },
  EN_REVISION: { es: 'En revisión', en: 'In Review' },
  EVALUACION: { es: 'Evaluación', en: 'Evaluation' },
  COTIZACION: { es: 'Cotización', en: 'Quote' },
  PENDIENTE_APROBACION: { es: 'Pendiente de aprobación', en: 'Pending Approval' },
  APROBADA: { es: 'Aprobada', en: 'Approved' },
  PENDIENTE_PAGO: { es: 'Pendiente de pago', en: 'Pending Payment' },
  PAGADA: { es: 'Pagada', en: 'Paid' },
  ASIGNADA: { es: 'Asignada', en: 'Assigned' },
  PROGRAMADA: { es: 'Programada', en: 'Scheduled' },
  EN_PROCESO: { es: 'En proceso', en: 'In Progress' },
  COMPLETADA: { es: 'Completada', en: 'Completed' },
  CANCELADA: { es: 'Cancelada', en: 'Cancelled' },
  ARCHIVADA: { es: 'Archivada', en: 'Archived' },
};

export function normalizeRole(role?: string | null): AppRole {
  if (!role) return 'CLIENT';
  const upper = role.toUpperCase().trim();
  if (upper === 'ADMIN' || upper === 'ADMINISTRADOR' || upper === 'ADMINISTRATOR') return 'ADMIN';
  if (upper === 'OPERATOR' || upper === 'OPERADOR') return 'OPERATOR';
  if (upper === 'TECHNICIAN' || upper === 'TECNICO' || upper === 'TÉCNICO') return 'TECHNICIAN';
  return 'CLIENT';
}

export function normalizeStatus(status?: string | null): OfficialRequestStatus {
  if (!status) return 'NUEVA';
  const s = status.trim().toUpperCase();
  if (s === 'NUEVA' || s === 'NUEVA SOLICITUD' || s === 'SOLICITUD RECIBIDA' || s === 'NEW') return 'NUEVA';
  if (s === 'EN_REVISION' || s === 'EN REVISIÓN' || s === 'EN REVISION' || s === 'EN CONVERSACIÓN' || s === 'EN CONVERSACION' || s === 'IN REVIEW') return 'EN_REVISION';
  if (s === 'EVALUACION' || s === 'EVALUACIÓN' || s === 'PENDIENTE DE EVALUACIÓN' || s === 'PENDIENTE DE EVALUACION') return 'EVALUACION';
  if (s === 'COTIZACION' || s === 'COTIZACIÓN' || s === 'COTIZACIÓN EN PREPARACIÓN' || s === 'COTIZACION EN PREPARACION' || s === 'COTIZACIÓN ENVIADA' || s === 'EN REVISIÓN / COTIZACIÓN') return 'COTIZACION';
  if (s === 'PENDIENTE_APROBACION' || s === 'PENDIENTE DE APROBACIÓN' || s === 'PENDIENTE DE APROBACION') return 'PENDIENTE_APROBACION';
  if (s === 'APROBADA' || s === 'APROBADO POR CLIENTE') return 'APROBADA';
  if (s === 'PENDIENTE_PAGO' || s === 'PENDIENTE DE PAGO') return 'PENDIENTE_PAGO';
  if (s === 'PAGADA' || s === 'PAGO CONFIRMADO') return 'PAGADA';
  if (s === 'ASIGNADA' || s === 'TÉCNICO ASIGNADO' || s === 'TECNICO ASIGNADO') return 'ASIGNADA';
  if (s === 'PROGRAMADA' || s === 'SERVICIO PROGRAMADO' || s === 'AGENDADA' || s === 'INSPECCIÓN PROGRAMADA' || s === 'INSPECCION PROGRAMADA') return 'PROGRAMADA';
  if (s === 'EN_PROCESO' || s === 'EN PROCESO' || s === 'EN EJECUCIÓN' || s === 'EN EJECUCION' || s === 'EN CAMINO' || s === 'EN SITIO / EN PROGRESO') return 'EN_PROCESO';
  if (s === 'COMPLETADA' || s === 'COMPLETADO') return 'COMPLETADA';
  if (s === 'CANCELADA' || s === 'CANCELADO') return 'CANCELADA';
  if (s === 'ARCHIVADA' || s === 'ARCHIVADO') return 'ARCHIVADA';
  return 'NUEVA';
}

export type RequestStatus = 
  | OfficialRequestStatus
  | 'Nueva solicitud'
  | 'En revisión'
  | 'Pendiente de evaluación'
  | 'Cotización en preparación'
  | 'Cotización enviada'
  | 'Pendiente de aprobación'
  | 'Aprobada'
  | 'Pendiente de pago'
  | 'Pago confirmado'
  | 'Técnico asignado'
  | 'Servicio programado'
  | 'En ejecución'
  | 'Completado'
  | 'Cancelado'
  | 'Archivada'
  // Legacy aliases:
  | 'Solicitud recibida'
  | 'Inspección programada'
  | 'Aprobado por cliente'
  | 'En proceso'
  | 'En revisión / cotización'
  | 'En camino'
  | 'En sitio / en progreso'
  | 'Nueva' 
  | 'En conversación' 
  | 'Agendada' 
  | 'Completada' 
  | 'Cancelada';

export type PaymentMethod = 
  | 'Pago en línea'
  | 'MiPOS BAC'
  | 'Yappy' 
  | 'Transferencia ACH' 
  | 'Efectivo' 
  | 'Tarjeta / Terminal' 
  | 'Pendiente';

export interface ManagedUser {
  id: string; // uid
  uid?: string;
  nombre: string;
  displayName?: string;
  correo: string;
  email?: string;
  telefono: string;
  phone?: string;
  direccion?: string;
  tipo_usuario?: UserRole;
  rol?: UserRole;
  role?: AppRole;
  estado: UserStatus;
  status?: UserStatus;
  languagePreference?: AppLanguage;
  fecha_registro: string;
  createdAt?: string;
  fecha_ultima_actividad: string;
  updatedAt?: string;
  notas_internas?: string;
  notas?: string;
  total_solicitudes?: number;
}

export type QuoteStatus = 
  | 'Borrador' 
  | 'En preparación' 
  | 'Enviada' 
  | 'Pendiente de aprobación' 
  | 'Aprobada' 
  | 'Rechazada' 
  | 'Vencida'
  | 'borrador'
  | 'enviada'
  | 'aprobada'
  | 'rechazada'
  | 'vencida';

export interface QuoteItem {
  id: string;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  total: number;
}

export interface ManagedQuote {
  id: string;
  numero_cotizacion: string;
  codigo_cotizacion?: string;
  solicitud_id: string;
  solicitud_codigo: string;
  cliente_nombre: string;
  cliente_telefono: string;
  cliente_ubicacion?: string;
  servicio_nombre?: string;
  mano_de_obra: number;
  materiales: number;
  cargos_adicionales: number;
  subtotal?: number;
  subtotal_bruto?: number;
  subtotal_neto?: number;
  itbms?: number;
  apply_itbms?: boolean;
  descuento: number;
  descuento_tipo?: 'percent' | 'fixed';
  descuento_valor?: number;
  total: number;
  anticipo?: number;
  items?: QuoteItem[];
  cliente_uid?: string;
  tecnico_id?: string;
  tecnico_nombre?: string;
  creado_por_uid?: string;
  diagnostico?: {
    evaluacion_preliminar?: string;
    costo_visita_acreditable?: number;
    requerido?: boolean;
  };
  precio?: number; // Total cotizado formal
  aprobacion?: {
    estado: 'pendiente' | 'aprobada' | 'rechazada';
    fecha?: string;
    medio?: 'whatsapp' | 'web' | 'email' | string;
    validado_por?: string;
  };
  fecha_creacion: string;
  fecha_emision?: string;
  fecha_vencimiento: string;
  valido_hasta?: string;
  estado: QuoteStatus;
  terminos?: string;
  notas_cliente?: string;
  notas_internas?: string;
  creado_por: string;
  historial?: {
    fecha: string;
    accion: string;
    usuario: string;
    notas?: string;
  }[];
}

export type AssignmentStatus = 
  | 'ASIGNADA' 
  | 'PROGRAMADA' 
  | 'EN_CAMINO' 
  | 'EN_PROCESO' 
  | 'COMPLETADA' 
  | 'CANCELADA';

export interface TechnicianAssignment {
  id: string; // assignmentId
  tecnico_id: string; // UID del técnico
  tecnico_nombre: string;
  tecnico_contacto?: string;
  tecnico_telefono?: string;
  solicitud_id: string;
  solicitud_codigo: string;
  fecha_asignacion: string;
  fecha_programada?: string;
  fecha?: string;
  estado: AssignmentStatus;
  notas?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type PaymentStatus = 
  | 'Pendiente' 
  | 'Confirmado' 
  | 'Fallido' 
  | 'Reembolsado'
  | 'pendiente'
  | 'confirmado'
  | 'rechazado'
  | 'reembolsado';

export interface ManagedPayment {
  id: string;
  solicitud_id: string;
  solicitud_codigo: string;
  cotizacion_id?: string;
  cotizacion_codigo?: string;
  cliente_uid?: string;
  cliente_nombre?: string;
  monto: number;
  metodo: PaymentMethod;
  estado: PaymentStatus;
  referencia_transaccion: string;
  referencia?: string;
  fecha: string;
  usuario_registro: string;
  notas?: string;
  comprobante_url?: string;
  updatedAt?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  fecha?: string;
  usuario: string;
  usuario_nombre?: string;
  usuario_uid?: string;
  rol?: string;
  accion: string;
  registro_tipo: 'solicitud' | 'servicio' | 'usuario' | 'tecnico' | 'cotizacion' | 'pago' | 'sistema';
  entidad?: string;
  coleccion?: string;
  registro_id: string;
  documento_id?: string;
  detalles: any;
  detalle?: string;
}

export interface OperationalIndicators {
  solicitudes_nuevas?: number;
  solicitudes_en_proceso?: number;
  solicitudes_activas?: number;
  solicitudes_urgentes?: number;
  cotizaciones_pendientes?: number;
  servicios_programados?: number;
  pagos_pendientes?: number;
  pagos_confirmados?: number;
  servicios_completados?: number;
  solicitudes_canceladas?: number;
  total_solicitudes?: number;
  facturacion_total?: number;
  facturacion_mes?: number;
  ingresos_totales?: number;
  ingresos_totales_estimados?: number;
  ingresos_recaudados?: number;
  pedidos_activos?: number;
  pedidos_pendientes?: number;
  pedidos_completados?: number;
  tecnicos_activos?: number;
  tecnicos_disponibles?: number;
  nuevas_hoy?: number;
  en_proceso_hoy?: number;
  pendientes_asignacion?: number;
  margen_bruto_fixit?: number;
  costos_tecnicos?: number;
  tasa_conversion?: number;
  solicitudes_por_categoria?: Record<string, number>;
}

export type TechnicianRelationship = 'empleado' | 'proveedor' | 'contratista';

export type PricingType = 'fixed' | 'per_unit' | 'from' | 'diagnostic';

export interface PaintingCalculation {
  serviceId: string;
  serviceName: string;
  areaM2: number;
  pricePerM2: number;
  subtotal: number;
  hasHeightSurcharge: boolean;
  heightSurchargeAmount: number;
  includePaintMaterials: boolean;
  paintMaterialsAmount: number;
  hasPatchingRepair: boolean;
  patchingRepairAmount: number;
  minimumServiceCharge: number;
  minimumChargeApplied: boolean;
  total: number;
  roomDetails?: string;
  areaType?: 'interior' | 'exterior';
  areaName?: string;
  modality?: 'solo_mano_obra' | 'mano_obra_materiales';
  modalityName?: string;
  galones?: number;
  costoMateriales?: number;
  costoManoDeObra?: number;
  rateManoDeObra?: number;
  precioGalon?: number;
  calidadPintura?: 'estandar' | 'premium';
  nombreCalidad?: string;
  costoPintura?: number;
  costoInsumosFijo?: number;
}

export interface ACInstallationDetails {
  isStandard: boolean;
  pipeLengthMeters: number;
  requiresEvaluation: boolean;
  hasHeightOver3m: boolean;
  needsElectricalPoint: boolean;
  needsDisassemblyOldUnit: boolean;
  needsWallBrackets: boolean;
  estimatedTotal: number;
  notes?: string;
}

export interface Service {
  id: string;
  category: ServiceCategory;
  service_name: string;
  description: string;
  price: number;
  pricing_type?: PricingType;
  unit_name?: string; // e.g. 'm²', 'equipo', 'punto'
  minimum_service_charge?: number; // e.g. 75 for Painting, 90 for AC installation
  is_evaluation_required?: boolean;
  diagnostic_required: boolean;
  diagnostic_price: number;
  height_surcharge?: number;
  inclusions?: string[];
  exclusions?: string[];
  estimated_duration: string;
  warranty_days: number;
  active: boolean;
  section?: string;
  section_description?: string;
  badge?: string;

  // Propiedades de Anticipo y PVP cerrado
  advance_percentage?: number; // e.g. 0.50 (50%)
  advance_required?: boolean;  // true
  advance_notes?: string;
  anticipo_porcentaje?: number;
  anticipo_requerido?: boolean;
  anticipo_notas?: string;

  // Backwards compatibility aliases
  categoria: ServiceCategory;
  nombre: string;
  descripcion: string;
  precio_regular?: number;
  precio_lanzamiento?: number;
  descuento_porcentaje?: number;
  modalidad?: ServiceModalidad;
  materiales?: string;
  preguntas_claves?: string[];
  es_urgente?: boolean;
  tiempo_estimado?: string;
  garantia?: string;
  diagnostic_fee?: number;
  activo?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AIClassification {
  categoria?: ServiceCategory;
  servicio_id?: string;
  categoria_probable?: ServiceCategory;
  servicio_id_probable?: string;
  servicio_id_secundario?: string | null;
  confianza: number;
  razon_breve: string;
  preguntas_recomendadas: string[];
  es_urgente?: boolean;
  alerta_seguridad?: boolean;
  detalle_seguridad?: string | null;
  foto_borrosa_o_oscura?: boolean;
  mensaje_calidad_foto?: string | null;
}

export interface CustomerData {
  id?: string;
  nombre: string;
  correo?: string;
  telefono: string; // WhatsApp number
  acepta_terminos_fotos?: boolean;
}

export type PropertyType = 'Apartamento' | 'Casa' | 'Local / Oficina' | string;
export type PreferredSchedule = 'Hoy' | 'Mañana' | 'Mañana / tarde' | string;

export interface ServiceRequestPricing {
  precio_regular: number;
  descuento: number;
  precio_lanzamiento: number;
}

export interface BookingDetails {
  direccion: string;
  referencia: string;
  tipo_propiedad: PropertyType;
  horario_preferido: PreferredSchedule;
}

export interface GuidedAnswers {
  ubicacion?: string;
  tipo_problema?: string;
  agua_sale?: string;
  llave_paso?: string;
  urgencia_usuario?: string;
  alcance?: string;
  riesgo_seguridad?: string;
  pieza_comprada?: string;
  observaciones_extra?: string;
}

export interface StatusHistoryEntry {
  id: string;
  estado_anterior?: string;
  estado_nuevo: RequestStatus;
  fecha: string;
  usuario: string;
  nota?: string;
}

export interface ServiceRequest {
  id: string;
  codigo_seguimiento: string; // e.g. FIX-2026-1042
  numero_pedido?: string;
  consecutiveId?: string;
  orderNumber?: string;
  cliente: CustomerData;
  imagenes: string[]; // URLs or base64
  servicio_probable: Service;
  clasificacion_ia?: AIClassification;
  respuestas: GuidedAnswers;
  direccion: string;
  referencia: string;
  tipo_propiedad: string;
  horario_preferido: string;
  precio_regular: number;
  descuento: number;
  precio_lanzamiento: number;
  estado: RequestStatus;
  tecnico_id?: string;
  tecnico_asignado?: string; // Technician ID or Name
  tecnico_nombre?: string;
  notas_internas?: string;
  fecha: string;
  creado_por_uid?: string;
  alerta_seguridad?: boolean;

  // New Comprehensive Business & Financial Attributes:
  costo_inspeccion?: number; // Costo fijado por evaluación técnica ($15-$35)
  cotizacion?: number; // Valor de la cotización final aprobada
  total_facturado?: number; // Total cobrado al cliente
  costo_tecnico?: number; // Pago acordado con el técnico / proveedor
  costo_materiales?: number; // Gasto en repuestos / insumos
  comision_fixit?: number; // Comisión retenida por la plataforma
  utilidad_estimada?: number; // Margen neto real (Total Facturado - Costo Técnico - Materiales - Comisión)
  estado_pago?: 'Pendiente' | 'Pagado' | 'Acreditado a trabajo' | string;
  metodo_pago?: PaymentMethod;
  historial?: any[];
  historial_estados?: StatusHistoryEntry[];
  isArchived?: boolean;
  updatedAt?: string;
  createdAt?: string;
  painting_calculation?: PaintingCalculation;
  ac_installation_details?: ACInstallationDetails;
}

export type TechnicianAvailability = 'Disponible' | 'En servicio' | 'Inactivo';

export interface AssignTechnicianInput {
  tecnicoId: string;
  fecha_programada?: string;
  notas?: string;
}

export interface Technician {
  id: string;
  nombre: string;
  telefono: string;
  correo?: string;
  disponibilidad?: TechnicianAvailability;
  activo: boolean;
  especialidad: ServiceCategory | 'Ambas' | string;
  especialidades?: ServiceCategory[];
  zona_cobertura?: string; // e.g. "San Francisco, Bella Vista, Costa del Este"
  tipo_relacion?: TechnicianRelationship; // 'empleado' | 'proveedor' | 'contratista'
  tarifa_acordada?: string; // e.g. "70% mano de obra" or "$25 por inspección"
  tarifa_base_usd?: number;
  tarifa_base_por_servicio?: number;
  estado?: 'activo' | 'en_servicio' | 'inactivo';
  status?: string;
  servicios_asignados?: number;
  servicios_completados?: number;
  calificacion?: number;
  trabajos_completados?: number;
  evaluacion_interna?: number; // 1 to 5 stars
  documentacion?: string; // e.g. "Idoneidad SPIA vigente, Cédula verificada"
  notas?: string;
}

export interface FinancialSummary {
  total_solicitudes: number;
  pedidos_pendientes: number;
  inspecciones_programadas: number;
  servicios_completados: number;
  servicios_cancelados: number;
  facturacion_total: number;
  facturacion_dia: number;
  facturacion_semana: number;
  facturacion_mes: number;
  costo_tecnicos_total: number;
  costo_materiales_total: number;
  comisiones_total: number;
  utilidad_estimada_total: number;
  por_categoria: {
    categoria: string;
    pedidos: number;
    facturacion: number;
    utilidad: number;
  }[];
  por_tecnico: {
    tecnico_id: string;
    tecnico_nombre: string;
    pedidos_completados: number;
    facturacion: number;
    pago_tecnico: number;
  }[];
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  nombre?: string;
  phone?: string;
  telefono?: string;
  photoURL?: string;
  role: AppRole | 'customer';
  rol?: UserRole;
  status: UserStatus | 'active' | 'inactivo';
  estado?: UserStatus;
  city?: string;
  marketingOptIn?: boolean;
  languagePreference?: AppLanguage;
  direccion?: string;
  notas?: string;
  createdAt: any;
  fecha_creacion?: string;
  updatedAt?: any;
  lastLoginAt?: string;
}

