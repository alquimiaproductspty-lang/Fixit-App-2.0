import { FixitUpsell, Service, ServiceCategory } from '../types';

export interface CategoryInfo {
  id: ServiceCategory;
  name: string;
  tagline: string;
  description: string;
  badge?: string;
  isAvailable: boolean;
  accentColor: string;
  sortOrder?: number;
}

/**
 * FIXIT OFFICIAL CATEGORIES (PVP CERRADO)
 */
export const FIXIT_CATEGORIES: CategoryInfo[] = [
  {
    id: 'Diagnóstico',
    name: 'Diagnóstico Técnico',
    tagline: 'Inspección en sitio 100% deducible de tu reparación',
    description: 'Evaluación técnica profesional en tu hogar. El costo de la visita es 100% deducible del total si apruebas el trabajo.',
    isAvailable: true,
    accentColor: '#0B72D9',
    sortOrder: 1,
  },
  {
    id: 'Climatización',
    name: 'Climatización',
    tagline: 'Mantenimientos preventivos e instalación de split',
    description: 'Técnicos certificados para limpieza profunda, combos de mantenimiento e instalación segura de aires acondicionados split.',
    isAvailable: true,
    accentColor: '#0988F5',
    sortOrder: 2,
  },
  {
    id: 'Plomería',
    name: 'Plomería',
    tagline: 'Duchas eléctricas, grifería, línea blanca y conexiones',
    description: 'Instalaciones y reemplazos hidrosanitarios herméticos, seguros y con materiales de calidad.',
    isAvailable: true,
    accentColor: '#53653D',
    sortOrder: 3,
  },
  {
    id: 'Electricidad',
    name: 'Electricidad',
    tagline: 'Tomas, interruptores, dimmers y puntos dedicados',
    description: 'Soluciones eléctricas residenciales con altos estándares de seguridad y garantía FIXIT.',
    isAvailable: true,
    accentColor: '#B98A43',
    sortOrder: 4,
  },
];

/**
 * FIXIT CENTRAL SERVICE CATALOG (PVP CERRADO - CERO COMPLACENCIA)
 * Tarifario oficial con precios cerrados y 50% de anticipo obligatorio.
 */
export const FIXIT_CATALOG: Service[] = [
  // ==========================================================================
  // 1. DIAGNÓSTICO
  // ==========================================================================
  {
    id: 'DIAG-001',
    category: 'Diagnóstico',
    section: 'Evaluación Técnica',
    section_description: 'Inspección en sitio para determinar fallas, cotizaciones personalizadas o daños no visibles.',
    service_name: 'Visita Técnica / Inspección',
    description: 'Visita técnica de inspección en sitio. Costo de $25.00 es 100% deducible del total si el cliente aprueba la reparación.',
    price: 25.00,
    diagnostic_required: true,
    diagnostic_price: 25.00,
    estimated_duration: '1 hora',
    warranty_days: 30,
    active: true,
    advance_percentage: 0.50,
    advance_required: true,
    advance_notes: 'Requiere abono del 50% ($12.50) para separar la cita.',

    categoria: 'Diagnóstico',
    nombre: 'Visita Técnica / Inspección ($25.00 Deducible)',
    descripcion: 'Evaluación técnica en sitio. 100% deducible si apruebas la reparación.',
    precio_regular: 25.00,
    precio_lanzamiento: 25.00,
    descuento_porcentaje: 0,
    modalidad: 'Diagnóstico acreditable',
  },

  // ==========================================================================
  // 2. CLIMATIZACIÓN (AIRES ACONDICIONADOS SPLIT)
  // ==========================================================================
  {
    id: 'AC-001',
    category: 'Climatización',
    section: 'Mantenimiento Preventivo',
    section_description: 'Limpieza profunda de unidades split residenciales para máximo rendimiento y aire limpio.',
    service_name: 'Mantenimiento 1 Unidad Split',
    description: 'Limpieza profunda de 1 split residencial: evaporador, turbina, filtros, bandeja de condensado y unidad condensadora exterior.',
    price: 30.00,
    diagnostic_required: false,
    diagnostic_price: 25.00,
    estimated_duration: '1 hora',
    warranty_days: 30,
    active: true,
    advance_percentage: 0.50,
    advance_required: true,
    advance_notes: 'Requiere abono del 50% ($15.00) para confirmar la cita.',

    categoria: 'Climatización',
    nombre: 'Mantenimiento 1 Unidad Split',
    descripcion: 'Limpieza técnica profunda de split residencial y condensador exterior.',
    precio_regular: 30.00,
    precio_lanzamiento: 30.00,
    descuento_porcentaje: 0,
    modalidad: 'Precio fijo',
  },
  {
    id: 'AC-002',
    category: 'Climatización',
    section: 'Mantenimiento Preventivo',
    section_description: 'Limpieza profunda de unidades split residenciales para máximo rendimiento y aire limpio.',
    service_name: 'Mantenimiento Combo 2 Unidades',
    description: 'Mantenimiento preventivo completo para 2 unidades split residenciales en la misma visita.',
    price: 60.00,
    promo_price_usd: 55.00,
    promo_label: 'Promo Meta Ads',
    diagnostic_required: false,
    diagnostic_price: 25.00,
    estimated_duration: '1.5 a 2 horas',
    warranty_days: 30,
    active: true,
    advance_percentage: 0.50,
    advance_required: true,
    advance_notes: 'Requiere abono del 50% ($30.00) para confirmar la cita.',

    categoria: 'Climatización',
    nombre: 'Mantenimiento Combo 2 Unidades',
    descripcion: 'Mantenimiento preventivo para 2 unidades split en la misma visita.',
    precio_regular: 60.00,
    precio_lanzamiento: 60.00,
    descuento_porcentaje: 0,
    modalidad: 'Precio fijo',
  },
  {
    id: 'AC-003',
    category: 'Climatización',
    section: 'Mantenimiento Preventivo',
    section_description: 'Limpieza profunda de unidades split residenciales para máximo rendimiento y aire limpio.',
    service_name: 'Mantenimiento Combo 3 Unidades',
    description: 'Mantenimiento preventivo completo para 3 unidades split residenciales en la misma visita.',
    price: 75.00,
    diagnostic_required: false,
    diagnostic_price: 25.00,
    estimated_duration: '2 a 3 horas',
    warranty_days: 30,
    active: true,
    advance_percentage: 0.50,
    advance_required: true,
    advance_notes: 'Requiere abono del 50% ($37.50) para confirmar la cita.',

    categoria: 'Climatización',
    nombre: 'Mantenimiento Combo 3 Unidades',
    descripcion: 'Mantenimiento preventivo completo para 3 unidades split.',
    precio_regular: 75.00,
    precio_lanzamiento: 75.00,
    descuento_porcentaje: 0,
    modalidad: 'Precio fijo',
  },
  {
    id: 'AC-004',
    category: 'Climatización',
    section: 'Instalación de Split',
    section_description: 'Montaje profesional de consola interior y unidad exterior con vacío certificado.',
    service_name: 'Instalación Básica Split (Residencial)',
    description: 'Instalación split residencial en punto preparado. Incluye kit básico de 3m de tubería, cableado de interconexión y vacío con bomba profesional.',
    price: 80.00,
    diagnostic_required: false,
    diagnostic_price: 25.00,
    estimated_duration: '2 a 3 horas',
    warranty_days: 30,
    active: true,
    advance_percentage: 0.50,
    advance_required: true,
    advance_notes: 'Requiere abono del 50% ($40.00) para confirmar la cita.',

    categoria: 'Climatización',
    nombre: 'Instalación Básica Split (Residencial)',
    descripcion: 'Instalación split residencial con kit básico de 3m.',
    precio_regular: 80.00,
    precio_lanzamiento: 80.00,
    descuento_porcentaje: 0,
    modalidad: 'Precio fijo',
  },
  {
    id: 'AC-005',
    category: 'Climatización',
    section: 'Instalación de Split',
    section_description: 'Montaje profesional de consola interior y unidad exterior con vacío certificado.',
    service_name: 'Instalación Básica Split (Balcón/Edificio)',
    description: 'Instalación split en balcón o edificio residencial con kit básico de 3m y fijación de soportes.',
    price: 100.00,
    diagnostic_required: false,
    diagnostic_price: 25.00,
    estimated_duration: '2 a 3 horas',
    warranty_days: 30,
    active: true,
    advance_percentage: 0.50,
    advance_required: true,
    advance_notes: 'Requiere abono del 50% ($50.00) para confirmar la cita.',

    categoria: 'Climatización',
    nombre: 'Instalación Básica Split (Balcón/Edificio)',
    descripcion: 'Instalación split en balcón o edificio con kit básico.',
    precio_regular: 100.00,
    precio_lanzamiento: 100.00,
    descuento_porcentaje: 0,
    modalidad: 'Precio fijo',
  },
  {
    id: 'AC-006',
    category: 'Climatización',
    section: 'Instalación Especial en PH',
    section_description: 'Instalaciones técnicas para apartamentos con pases de manga preinstalados.',
    service_name: 'Instalación por Manga (Solo MO)',
    description: 'Pase de tuberías refrigerantes por manga embutida en PH (solo mano de obra de conexión).',
    price: 135.00,
    diagnostic_required: false,
    diagnostic_price: 25.00,
    estimated_duration: '3 a 4 horas',
    warranty_days: 30,
    active: true,
    advance_percentage: 0.50,
    advance_required: true,
    advance_notes: 'Requiere abono del 50% ($67.50) para confirmar la cita.',

    categoria: 'Climatización',
    nombre: 'Instalación por Manga (Solo MO)',
    descripcion: 'Pase por manga en PH (solo mano de obra).',
    precio_regular: 135.00,
    precio_lanzamiento: 135.00,
    descuento_porcentaje: 0,
    modalidad: 'Precio fijo',
  },
  {
    id: 'AC-007',
    category: 'Climatización',
    section: 'Instalación Especial en PH',
    section_description: 'Instalaciones técnicas para apartamentos con pases de manga preinstalados.',
    service_name: 'Instalación por Manga (Full Plata/Nitrógeno)',
    description: 'Instalación por manga en PH completa. Incluye soldadura de plata, presurización con nitrógeno para detección de fugas y vacío profesional.',
    price: 160.00,
    embedded_material_usd: 25.00,
    diagnostic_required: false,
    diagnostic_price: 25.00,
    estimated_duration: '3 a 5 horas',
    warranty_days: 30,
    active: true,
    advance_percentage: 0.50,
    advance_required: true,
    advance_notes: 'Requiere abono del 50% ($80.00) para confirmar la cita.',

    categoria: 'Climatización',
    nombre: 'Instalación por Manga (Full Plata/Nitrógeno)',
    descripcion: 'Instalación por manga con soldadura de plata, nitrógeno y vacío.',
    precio_regular: 160.00,
    precio_lanzamiento: 160.00,
    descuento_porcentaje: 0,
    modalidad: 'Precio fijo',
  },
  {
    id: 'AC-008',
    category: 'Climatización',
    section: 'Adecuaciones Eléctricas para A/C',
    section_description: 'Líneas y conexiones dedicadas para climatización.',
    service_name: 'Punto eléctrico extra para A/C',
    description: 'Adecuación o tirada de punto eléctrico dedicado para aire acondicionado split residencial.',
    price: 35.00,
    diagnostic_required: false,
    diagnostic_price: 25.00,
    estimated_duration: '1 a 2 horas',
    warranty_days: 30,
    active: true,
    advance_percentage: 0.50,
    advance_required: true,
    advance_notes: 'Requiere abono del 50% ($17.50) para confirmar la cita.',

    categoria: 'Climatización',
    nombre: 'Punto eléctrico extra para A/C',
    descripcion: 'Punto eléctrico dedicado para aire acondicionado split.',
    precio_regular: 35.00,
    precio_lanzamiento: 35.00,
    descuento_porcentaje: 0,
    modalidad: 'Precio fijo',
  },

  // ==========================================================================
  // 3. PLOMERÍA RESIDENCIAL
  // ==========================================================================
  {
    id: 'PLO-001',
    category: 'Plomería',
    section: 'Duchas Eléctricas',
    section_description: 'Instalación y reemplazo seguro de duchas eléctricas residenciales.',
    service_name: 'Ducha Eléctrica (Reemplazo en niple)',
    description: 'Desinstalación y reemplazo de ducha eléctrica básica sobre niple existente con prueba de estanqueidad y sellado.',
    price: 38.00,
    diagnostic_required: false,
    diagnostic_price: 25.00,
    estimated_duration: '1 hora',
    warranty_days: 30,
    active: true,
    advance_percentage: 0.50,
    advance_required: true,
    advance_notes: 'Requiere abono del 50% ($19.00) para confirmar la cita.',

    categoria: 'Plomería',
    nombre: 'Ducha Eléctrica (Reemplazo en niple)',
    descripcion: 'Reemplazo de ducha eléctrica básica sobre niple existente.',
    precio_regular: 38.00,
    precio_lanzamiento: 38.00,
    descuento_porcentaje: 0,
    modalidad: 'Precio fijo',
  },
  {
    id: 'PLO-002',
    category: 'Plomería',
    section: 'Duchas Eléctricas',
    section_description: 'Instalación y reemplazo seguro de duchas eléctricas residenciales.',
    service_name: 'Ducha Eléctrica + Punto eléctrico desde tablero',
    description: 'Instalación completa de ducha eléctrica incluyendo tirada de cableado y breaker dedicado desde el tablero eléctrico principal.',
    price: 100.00,
    diagnostic_required: false,
    diagnostic_price: 25.00,
    estimated_duration: '2 a 3 horas',
    warranty_days: 30,
    active: true,
    advance_percentage: 0.50,
    advance_required: true,
    advance_notes: 'Requiere abono del 50% ($50.00) para confirmar la cita.',

    categoria: 'Plomería',
    nombre: 'Ducha Eléctrica + Punto eléctrico desde tablero',
    descripcion: 'Instalación de ducha eléctrica con cableado dedicado desde tablero.',
    precio_regular: 100.00,
    precio_lanzamiento: 100.00,
    descuento_porcentaje: 0,
    modalidad: 'Precio fijo',
  },
  {
    id: 'PLO-003',
    category: 'Plomería',
    section: 'Grifería y Accesorios',
    section_description: 'Reemplazo e instalación hermética de griferías en baños y cocinas.',
    service_name: 'Reemplazo Lavamanos/Grifería',
    description: 'Cambio e instalación de grifería o llave estándar en lavamanos con conexión a llaves de paso y prueba de presión.',
    price: 45.00,
    diagnostic_required: false,
    diagnostic_price: 25.00,
    estimated_duration: '1 hora',
    warranty_days: 30,
    active: true,
    advance_percentage: 0.50,
    advance_required: true,
    advance_notes: 'Requiere abono del 50% ($22.50) para confirmar la cita.',

    categoria: 'Plomería',
    nombre: 'Reemplazo Lavamanos/Grifería',
    descripcion: 'Cambio de grifería en lavamanos con prueba de presión.',
    precio_regular: 45.00,
    precio_lanzamiento: 45.00,
    descuento_porcentaje: 0,
    modalidad: 'Precio fijo',
  },
  {
    id: 'PLO-004',
    category: 'Plomería',
    section: 'Grifería y Accesorios',
    section_description: 'Reemplazo e instalación hermética de griferías en baños y cocinas.',
    service_name: 'Reemplazo Fregador (con sellado)',
    description: 'Instalación y sellado hermético de fregador o grifería de cocina con silicona antihongos de alta durabilidad.',
    price: 50.00,
    diagnostic_required: false,
    diagnostic_price: 25.00,
    estimated_duration: '1 hora',
    warranty_days: 30,
    active: true,
    advance_percentage: 0.50,
    advance_required: true,
    advance_notes: 'Requiere abono del 50% ($25.00) para confirmar la cita.',

    categoria: 'Plomería',
    nombre: 'Reemplazo Fregador (con sellado)',
    descripcion: 'Instalación de fregador con sellado hermético antihumedad.',
    precio_regular: 50.00,
    precio_lanzamiento: 50.00,
    descuento_porcentaje: 0,
    modalidad: 'Precio fijo',
  },
  {
    id: 'PLO-005',
    category: 'Plomería',
    section: 'Instalaciones Especiales',
    section_description: 'Modificaciones y adaptaciones sanitarias complejas.',
    service_name: 'Instalación compleja (Tubería PVC/Mueble)',
    description: 'Montaje de mueble de baño nuevo, acople a drenajes o reconfiguración de tuberías de PVC en baños y cocinas.',
    price: 60.00,
    diagnostic_required: false,
    diagnostic_price: 25.00,
    estimated_duration: '2 horas',
    warranty_days: 30,
    active: true,
    advance_percentage: 0.50,
    advance_required: true,
    advance_notes: 'Requiere abono del 50% ($30.00) para confirmar la cita.',

    categoria: 'Plomería',
    nombre: 'Instalación compleja (Tubería PVC/Mueble)',
    descripcion: 'Montaje en mueble nuevo o reconfiguración de desagüe/tubería PVC.',
    precio_regular: 60.00,
    precio_lanzamiento: 60.00,
    descuento_porcentaje: 0,
    modalidad: 'Precio fijo',
  },
  {
    id: 'PLO-006',
    category: 'Plomería',
    section: 'Línea Blanca y Electrodomésticos',
    section_description: 'Conexión de electrodomésticos con cero fugas ocultas.',
    service_name: 'Conexión Icemaker / Nevera',
    description: 'Conexión segura de manguera a toma de agua existente para nevera e icemaker sin fugas ocultas.',
    price: 48.00,
    diagnostic_required: false,
    diagnostic_price: 25.00,
    estimated_duration: '1 hora',
    warranty_days: 30,
    active: true,
    advance_percentage: 0.50,
    advance_required: true,
    advance_notes: 'Requiere abono del 50% ($24.00) para confirmar la cita.',

    categoria: 'Plomería',
    nombre: 'Conexión Icemaker / Nevera',
    descripcion: 'Conexión de agua para nevera e ice maker sin fugas.',
    precio_regular: 48.00,
    precio_lanzamiento: 48.00,
    descuento_porcentaje: 0,
    modalidad: 'Precio fijo',
  },
  {
    id: 'PLO-007',
    category: 'Plomería',
    section: 'Línea Blanca y Electrodomésticos',
    section_description: 'Conexión de electrodomésticos con cero fugas ocultas.',
    service_name: 'Instalación Secadora (+ ducto)',
    description: 'Conexión segura de secadora a línea de gas o tomacorriente y acople hermético de ducto de evacuación.',
    price: 68.00,
    diagnostic_required: false,
    diagnostic_price: 25.00,
    estimated_duration: '1 a 2 horas',
    warranty_days: 30,
    active: true,
    advance_percentage: 0.50,
    advance_required: true,
    advance_notes: 'Requiere abono del 50% ($34.00) para confirmar la cita.',

    categoria: 'Plomería',
    nombre: 'Instalación Secadora (+ ducto)',
    descripcion: 'Conexión de secadora a gas/luz y acople de ducto de ventilación.',
    precio_regular: 68.00,
    precio_lanzamiento: 68.00,
    descuento_porcentaje: 0,
    modalidad: 'Precio fijo',
  },

  // ==========================================================================
  // 4. ELECTRICIDAD MENOR
  // ==========================================================================
  {
    id: 'ELE-001',
    category: 'Electricidad',
    section: 'Electricidad Menor',
    section_description: 'Renovación y adecuación de tomas e interruptores residenciales.',
    service_name: 'Paquete Eléctrico Menor (Visita + 3 tomas/switches)',
    description: 'Visita técnica y cambio seguro de hasta 3 tomacorrientes o interruptores estándar en el hogar.',
    price: 40.00,
    diagnostic_required: false,
    diagnostic_price: 25.00,
    estimated_duration: '1 hora',
    warranty_days: 30,
    active: true,
    advance_percentage: 0.50,
    advance_required: true,
    advance_notes: 'Requiere abono del 50% ($20.00) para confirmar la cita.',

    categoria: 'Electricidad',
    nombre: 'Paquete Eléctrico Menor (Visita + 3 tomas/switches)',
    descripcion: 'Visita y cambio seguro de hasta 3 tomacorrientes o interruptores.',
    precio_regular: 40.00,
    precio_lanzamiento: 40.00,
    descuento_porcentaje: 0,
    modalidad: 'Precio fijo',
  },
  {
    id: 'ELE-002',
    category: 'Electricidad',
    section: 'Electricidad Menor',
    section_description: 'Renovación y adecuación de tomas e interruptores residenciales.',
    service_name: 'Punto eléctrico adicional (desde el 4to)',
    description: 'Tarifa unitaria por cada tomacorriente o interruptor adicional reemplazado en la misma visita después de los primeros 3.',
    price: 10.00,
    addon_only: true,
    diagnostic_required: false,
    diagnostic_price: 25.00,
    estimated_duration: '30 min',
    warranty_days: 30,
    active: true,
    advance_percentage: 0.50,
    advance_required: true,
    advance_notes: 'Requiere abono del 50% ($5.00) para confirmar la cita.',

    categoria: 'Electricidad',
    nombre: 'Punto eléctrico adicional (desde el 4to)',
    descripcion: 'Punto adicional (toma o switch) a partir del 4to en la misma visita.',
    precio_regular: 10.00,
    precio_lanzamiento: 10.00,
    descuento_porcentaje: 0,
    modalidad: 'Precio fijo',
  },
  {
    id: 'ELE-003',
    category: 'Electricidad',
    section: 'Domótica e Iluminación',
    section_description: 'Instalación de dispositivos modernos y sistemas inteligentes.',
    service_name: 'Switch Inteligente / Dimmer',
    description: 'Instalación y configuración de interruptor inteligente (WiFi/Zigbee) o regulador dimerizable en caja eléctrica existente.',
    price: 40.00,
    diagnostic_required: false,
    diagnostic_price: 25.00,
    estimated_duration: '1 hora',
    warranty_days: 30,
    active: true,
    advance_percentage: 0.50,
    advance_required: true,
    advance_notes: 'Requiere abono del 50% ($20.00) para confirmar la cita.',

    categoria: 'Electricidad',
    nombre: 'Switch Inteligente / Dimmer',
    descripcion: 'Instalación de switch inteligente o dimmer en caja existente.',
    precio_regular: 40.00,
    precio_lanzamiento: 40.00,
    descuento_porcentaje: 0,
    modalidad: 'Precio fijo',
  },
];

/**
 * FIXIT ON-SITE UPSELLS (EXTRAS EN SITIO)
 * Neto Fixit = price_usd - wholesale_cost_usd - fixer_bonus_usd (no aplica 15%)
 * El fixer recibe su bono fijo; el cliente solo ve el precio instalado.
 */
export const FIXIT_UPSELLS: FixitUpsell[] = [
  {
    id: 'UP-001',
    name: 'Protector voltaje instalado',
    description: 'Protector de voltaje para equipo residencial (suministro e instalación en sitio)',
    price_usd: 45.00,
    wholesale_cost_usd: 15.00,
    fixer_bonus_usd: 10.00,
    active: true,
  },
  {
    id: 'UP-002',
    name: 'Control universal A/C',
    description: 'Control remoto universal para aire acondicionado split configurado en sitio',
    price_usd: 25.00,
    wholesale_cost_usd: 6.00,
    fixer_bonus_usd: 5.00,
    active: true,
  },
  {
    id: 'UP-003',
    name: 'Filtro purificador',
    description: 'Filtro purificador para unidad split residencial instalado en sitio',
    price_usd: 28.00,
    wholesale_cost_usd: 7.00,
    fixer_bonus_usd: 5.00,
    active: true,
  },
];

export function getUpsellById(id: string): FixitUpsell | undefined {
  if (!id) return undefined;
  const cleanId = id.toLowerCase().trim();
  return FIXIT_UPSELLS.find((u) => u.id.toLowerCase() === cleanId);
}

// Compatibility alias
export const FIXI_CATALOG = FIXIT_CATALOG;

/**
 * Historical archived services for backward compatibility with existing orders
 */
export const HISTORICAL_SERVICES: Service[] = [];

export function getServiceById(id: string): Service | undefined {
  if (!id) return undefined;
  const cleanId = id.toLowerCase();
  return (
    FIXIT_CATALOG.find((s) => s.id.toLowerCase() === cleanId) ||
    HISTORICAL_SERVICES.find((s) => s.id.toLowerCase() === cleanId)
  );
}

export function getServicesByCategory(cat: ServiceCategory | string): Service[] {
  if (!cat) return [];
  const normalizedCat = cat.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

  return FIXIT_CATALOG.filter((s) => {
    if (!s.active) return false;
    const sCat = s.category.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const sCatLeg = s.categoria.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

    if (sCat === normalizedCat || sCatLeg === normalizedCat) return true;
    if (normalizedCat.includes('diag') && (sCat.includes('diag') || sCatLeg.includes('diag'))) return true;
    if ((normalizedCat.includes('clima') || normalizedCat.includes('aire') || normalizedCat === 'ac') && (sCat.includes('clima') || sCat.includes('aire') || sCatLeg.includes('clima'))) return true;
    if (normalizedCat.includes('plomer') && sCat.includes('plomer')) return true;
    if (normalizedCat.includes('electr') && sCat.includes('electr')) return true;

    return false;
  });
}

export function calculatePricing(service: Service) {
  return {
    precio_regular: service.price,
    descuento: 0,
    precio_lanzamiento: service.price,
    anticipo_50: service.price * 0.5,
  };
}
