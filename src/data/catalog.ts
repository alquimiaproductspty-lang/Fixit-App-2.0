import { Service, ServiceCategory } from '../types';

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

export const FIXIT_CATEGORIES: CategoryInfo[] = [
  {
    id: 'Plomería',
    name: 'Plomería',
    tagline: 'Griferías, línea blanca, conexiones seguras y filtraciones',
    description: 'Renovación de grifería, conexión de electrodomésticos y soluciones de fontanería sin romper tus acabados.',
    isAvailable: true,
    accentColor: '#53653D',
    sortOrder: 1,
  },
  {
    id: 'Electricidad',
    name: 'Electricidad',
    tagline: 'Lámparas, tomas, breakers e interruptores certificados',
    description: 'Instalaciones y diagnósticos eléctricos con altos estándares de seguridad para tu hogar.',
    isAvailable: true,
    accentColor: '#B98A43',
    sortOrder: 2,
  },
  {
    id: 'Reparaciones del hogar',
    name: 'Reparaciones del Hogar',
    tagline: 'Montajes, cerraduras, sellados y ajustes generales',
    description: 'Manitas calificados para resolver esos pendientes y detalles cotidianos en tu casa o apartamento.',
    isAvailable: true,
    accentColor: '#082D60',
    sortOrder: 3,
  },
  {
    id: 'Pintura residencial',
    name: 'Pintura Residencial',
    tagline: 'Interiores, exteriores, techos y resane profesional',
    description: 'Pintores cuidadosos para tu hogar en Ciudad de Panamá. Acabados finos, protección total de pisos y muebles, y garantía FIXIT.',
    isAvailable: true,
    accentColor: '#B98A43',
    sortOrder: 4,
  },
];

/**
 * FIXIT CENTRAL SERVICE CATALOG
 * Single Source of Truth for all prices, services, and diagnostic rules.
 */
export const FIXIT_CATALOG: Service[] = [
  // ==========================================================================
  // 1. PLOMERÍA
  // ==========================================================================

  // --------------------------------------------------------------------------
  // SECCIÓN A: Renovación e Instalación de Grifería
  // --------------------------------------------------------------------------
  {
    id: 'PLO-001',
    category: 'Plomería',
    section: 'Renovación e Instalación de Grifería',
    section_description: 'Renueva la estética y funcionalidad de tus baños y cocina con instalaciones seguras, libres de goteos y filtraciones.',
    service_name: 'Grifería de Lavamanos',
    description: 'Cambio e instalación de grifos para baños. Ideal para renovaciones estéticas o reemplazo de piezas averiadas. Incluye desinstalación del equipo anterior, conexión a las llaves de paso existentes y prueba de presión.',
    price: 30,
    diagnostic_required: false,
    diagnostic_price: 25,
    estimated_duration: '1 hora',
    warranty_days: 30,
    active: true,

    categoria: 'Plomería',
    nombre: 'Grifería de Lavamanos',
    descripcion: 'Cambio e instalación de grifos para baños. Incluye desinstalación, conexión y prueba de presión.',
    precio_regular: 30,
    precio_lanzamiento: 30,
    descuento_porcentaje: 0,
    modalidad: 'Precio fijo',
  },
  {
    id: 'PLO-002',
    category: 'Plomería',
    section: 'Renovación e Instalación de Grifería',
    section_description: 'Renueva la estética y funcionalidad de tus baños y cocina con instalaciones seguras, libres de goteos y filtraciones.',
    service_name: 'Grifería de Fregador',
    description: 'Instalación de llaves estándar o tipo chef en tu cocina. Aseguramos un sellado perfecto para evitar daños en tus muebles por humedad.',
    price: 35,
    diagnostic_required: false,
    diagnostic_price: 25,
    estimated_duration: '1 hora',
    warranty_days: 30,
    active: true,

    categoria: 'Plomería',
    nombre: 'Grifería de Fregador',
    descripcion: 'Instalación de llaves estándar o tipo chef con sellado hermético antihumedad.',
    precio_regular: 35,
    precio_lanzamiento: 35,
    descuento_porcentaje: 0,
    modalidad: 'Precio fijo',
  },
  {
    id: 'PLO-003',
    category: 'Plomería',
    section: 'Renovación e Instalación de Grifería',
    section_description: 'Renueva la estética y funcionalidad de tus baños y cocina con instalaciones seguras, libres de goteos y filtraciones.',
    service_name: 'Sistemas de Ducha',
    description: 'Instalación completa de mezcladoras y brazos de ducha nuevos. Un servicio enfocado en el confort y la correcta distribución del agua. Cambios menores de cabezal desde $35.00.',
    price: 60,
    badge: 'Cabezal desde $35.00',
    diagnostic_required: false,
    diagnostic_price: 25,
    estimated_duration: '1 a 2 horas',
    warranty_days: 30,
    active: true,

    categoria: 'Plomería',
    nombre: 'Sistemas de Ducha',
    descripcion: 'Instalación completa de mezcladoras y brazos de ducha nuevos. Cambios menores de cabezal desde $35.00.',
    precio_regular: 60,
    precio_lanzamiento: 60,
    descuento_porcentaje: 0,
    modalidad: 'Precio fijo',
  },
  {
    id: 'PLO-004',
    category: 'Plomería',
    section: 'Renovación e Instalación de Grifería',
    section_description: 'Renueva la estética y funcionalidad de tus baños y cocina con instalaciones seguras, libres de goteos y filtraciones.',
    service_name: 'Fluxómetros (Baños Comerciales/Modernos)',
    description: 'Instalación y calibración precisa de sistemas de descarga por presión. Garantizamos el flujo de agua correcto para una máxima eficiencia.',
    price: 60,
    diagnostic_required: false,
    diagnostic_price: 25,
    estimated_duration: '1 a 2 horas',
    warranty_days: 30,
    active: true,

    categoria: 'Plomería',
    nombre: 'Fluxómetros (Baños Comerciales/Modernos)',
    descripcion: 'Instalación y calibración precisa de sistemas de descarga por presión.',
    precio_regular: 60,
    precio_lanzamiento: 60,
    descuento_porcentaje: 0,
    modalidad: 'Precio fijo',
  },

  // --------------------------------------------------------------------------
  // SECCIÓN B: Conexión de Línea Blanca y Electrodomésticos
  // --------------------------------------------------------------------------
  {
    id: 'PLO-005',
    category: 'Plomería',
    section: 'Conexión de Línea Blanca y Electrodomésticos',
    section_description: 'Protege tu inversión asegurando que tus equipos estén correctamente instalados desde el primer día.',
    service_name: 'Ice Maker / Nevera',
    description: 'Conexión del sistema de agua de tu nevera a la toma existente. Disfruta de hielo y agua filtrada sin riesgo de fugas ocultas.',
    price: 30,
    diagnostic_required: false,
    diagnostic_price: 25,
    estimated_duration: '1 hora',
    warranty_days: 30,
    active: true,

    categoria: 'Plomería',
    nombre: 'Ice Maker / Nevera',
    descripcion: 'Conexión de agua para nevera e ice maker sin fugas ocultas.',
    precio_regular: 30,
    precio_lanzamiento: 30,
    descuento_porcentaje: 0,
    modalidad: 'Precio fijo',
  },
  {
    id: 'PLO-006',
    category: 'Plomería',
    section: 'Conexión de Línea Blanca y Electrodomésticos',
    section_description: 'Protege tu inversión asegurando que tus equipos estén correctamente instalados desde el primer día.',
    service_name: 'Instalación de Lavadora',
    description: 'Nivelación del equipo y conexión segura a las salidas de agua fría/caliente y al sistema de desagüe de tu lavandería.',
    price: 40,
    diagnostic_required: false,
    diagnostic_price: 25,
    estimated_duration: '1 hora',
    warranty_days: 30,
    active: true,

    categoria: 'Plomería',
    nombre: 'Instalación de Lavadora',
    descripcion: 'Nivelación del equipo y conexión a salidas de agua y desagüe.',
    precio_regular: 40,
    precio_lanzamiento: 40,
    descuento_porcentaje: 0,
    modalidad: 'Precio fijo',
  },
  {
    id: 'PLO-007',
    category: 'Plomería',
    section: 'Conexión de Línea Blanca y Electrodomésticos',
    section_description: 'Protege tu inversión asegurando que tus equipos estén correctamente instalados desde el primer día.',
    service_name: 'Instalación de Secadora (Gas o Eléctrica)',
    description: 'Acople del ducto de ventilación y conexión segura a la línea de gas o toma eléctrica. Priorizamos la seguridad para evitar escapes o sobrecalentamientos.',
    price: 40,
    diagnostic_required: false,
    diagnostic_price: 25,
    estimated_duration: '1 a 2 horas',
    warranty_days: 30,
    active: true,

    categoria: 'Plomería',
    nombre: 'Instalación de Secadora (Gas o Eléctrica)',
    descripcion: 'Acople de ducto de ventilación y conexión segura a gas o electricidad.',
    precio_regular: 40,
    precio_lanzamiento: 40,
    descuento_porcentaje: 0,
    modalidad: 'Precio fijo',
  },
  {
    id: 'PLO-008',
    category: 'Plomería',
    section: 'Conexión de Línea Blanca y Electrodomésticos',
    section_description: 'Protege tu inversión asegurando que tus equipos estén correctamente instalados desde el primer día.',
    service_name: 'Centro de Lavado (Torre Completa)',
    description: 'Servicio integral para instalación simultánea de lavadora y secadora, optimizando el espacio y asegurando la compatibilidad de todas las conexiones.',
    price: 150,
    diagnostic_required: false,
    diagnostic_price: 25,
    estimated_duration: '2 a 3 horas',
    warranty_days: 30,
    active: true,

    categoria: 'Plomería',
    nombre: 'Centro de Lavado (Torre Completa)',
    descripcion: 'Instalación simultánea y acople integral de torre de lavado.',
    precio_regular: 150,
    precio_lanzamiento: 150,
    descuento_porcentaje: 0,
    modalidad: 'Precio fijo',
  },

  // ==========================================
  // 3. ELECTRICIDAD
  // ==========================================
  {
    id: 'ELE-001',
    category: 'Electricidad',
    service_name: 'Cambio de tomacorriente estándar o inteligente',
    description: 'Sustitución de toma corriente dúplex 110V o toma GFCI por desgaste, chispeo o actualización a modelo inteligente.',
    price: 25,
    diagnostic_required: false,
    diagnostic_price: 25,
    estimated_duration: '1 hora',
    warranty_days: 30,
    active: true,

    categoria: 'Electricidad',
    nombre: 'Cambio de tomacorriente estándar',
    descripcion: 'Reemplazo seguro de toma corriente 110V con cableado existente.',
    precio_regular: 25,
    precio_lanzamiento: 25,
    descuento_porcentaje: 0,
    modalidad: 'Precio fijo',
  },
  {
    id: 'ELE-002',
    category: 'Electricidad',
    service_name: 'Cambio de interruptor de luz simple o dimerizable',
    description: 'Sustitución de apagador de pared sencillo, triple o con regulador de intensidad lumínica.',
    price: 25,
    diagnostic_required: false,
    diagnostic_price: 25,
    estimated_duration: '1 hora',
    warranty_days: 30,
    active: true,

    categoria: 'Electricidad',
    nombre: 'Cambio de interruptor de luz',
    descripcion: 'Reemplazo de apagador de luz en caja eléctrica existente.',
    precio_regular: 25,
    precio_lanzamiento: 25,
    descuento_porcentaje: 0,
    modalidad: 'Precio fijo',
  },
  {
    id: 'ELE-003',
    category: 'Electricidad',
    service_name: 'Instalación de lámpara o plafón decorativo',
    description: 'Montaje, fijación a cielo raso y conexión eléctrica de lámpara colgante, aplique de pared o plafón LED en punto ya energizado.',
    price: 30,
    diagnostic_required: false,
    diagnostic_price: 25,
    estimated_duration: '1 hora',
    warranty_days: 30,
    active: true,

    categoria: 'Electricidad',
    nombre: 'Instalación de lámpara o plafón',
    descripcion: 'Fijación y conexión de luminaria en punto existente.',
    precio_regular: 30,
    precio_lanzamiento: 30,
    descuento_porcentaje: 0,
    modalidad: 'Precio fijo',
  },
  {
    id: 'ELE-004',
    category: 'Electricidad',
    service_name: 'Instalación de abanico de techo con lámpara',
    description: 'Armado completo de aspas y motor, anclaje seguro a caja reforzada en cielo raso y balanceo para evitar vibraciones.',
    price: 40,
    diagnostic_required: false,
    diagnostic_price: 25,
    estimated_duration: '1 a 2 horas',
    warranty_days: 30,
    active: true,

    categoria: 'Electricidad',
    nombre: 'Instalación de abanico de techo',
    descripcion: 'Armado, montaje y balanceo de ventilador de techo.',
    precio_regular: 40,
    precio_lanzamiento: 40,
    descuento_porcentaje: 0,
    modalidad: 'Precio fijo',
  },
  {
    id: 'ELE-005',
    category: 'Electricidad',
    service_name: 'Diagnóstico de tomacorriente o interruptor sin energía',
    description: 'Revisión con equipo de medición para detectar línea abierta, falso contacto o cable neutro desprendido en el circuito.',
    price: 25,
    diagnostic_required: true,
    diagnostic_price: 25,
    estimated_duration: '1 hora',
    warranty_days: 30,
    active: true,

    categoria: 'Electricidad',
    nombre: 'Toma o interruptor sin energía',
    descripcion: 'Revisión técnica de continuidad y voltaje en el punto afectado.',
    precio_regular: 25,
    precio_lanzamiento: 25,
    descuento_porcentaje: 0,
    modalidad: 'Diagnóstico acreditable',
  },
  {
    id: 'ELE-006',
    category: 'Electricidad',
    service_name: 'Diagnóstico de breaker que se dispara o recalienta',
    description: 'Evaluación técnica del tablero de distribución principal para aislar sobrecargas, cortocircuitos o falla en el interruptor termo-magnético.',
    price: 25,
    diagnostic_required: true,
    diagnostic_price: 25,
    estimated_duration: '1 hora',
    warranty_days: 30,
    active: true,

    categoria: 'Electricidad',
    nombre: 'Breaker que se dispara o recalienta',
    descripcion: 'Evaluación de carga y cortocircuito en tablero eléctrico.',
    precio_regular: 25,
    precio_lanzamiento: 25,
    descuento_porcentaje: 0,
    modalidad: 'Diagnóstico acreditable',
  },
  {
    id: 'ELE-007',
    category: 'Electricidad',
    service_name: 'Problema eléctrico general en una habitación',
    description: 'Diagnóstico completo cuando varias luces y tomas de una misma recámara o zona dejan de funcionar simultáneamente.',
    price: 25,
    diagnostic_required: true,
    diagnostic_price: 25,
    estimated_duration: '1 a 2 horas',
    warranty_days: 30,
    active: true,

    categoria: 'Electricidad',
    nombre: 'Problema eléctrico en habitación',
    descripcion: 'Revisión integral de circuito de iluminación y tomas.',
    precio_regular: 25,
    precio_lanzamiento: 25,
    descuento_porcentaje: 0,
    modalidad: 'Diagnóstico acreditable',
  },

  // ==========================================
  // 4. REPARACIONES DEL HOGAR
  // ==========================================
  {
    id: 'HOG-001',
    category: 'Reparaciones del hogar',
    service_name: 'Instalación de repisas, cuadros o espejos pesados',
    description: 'Fijación segura con tarugos y tornillos de anclaje de hasta 3 repisas decorativas, espejos o cuadros en mampostería o gypsun.',
    price: 30,
    diagnostic_required: false,
    diagnostic_price: 25,
    estimated_duration: '1 hora',
    warranty_days: 30,
    active: true,

    categoria: 'Reparaciones del hogar',
    nombre: 'Instalación de repisas o cuadros',
    descripcion: 'Montaje con taladro y nivel en mampostería o drywall.',
    precio_regular: 30,
    precio_lanzamiento: 30,
    descuento_porcentaje: 0,
    modalidad: 'Precio fijo',
  },
  {
    id: 'HOG-002',
    category: 'Reparaciones del hogar',
    service_name: 'Ajuste de cerradura, manija o pestillo de puerta',
    description: 'Alineación de cerradura que roza, cambio de manija o pestillo flojo en puertas de madera o metal del hogar.',
    price: 30,
    diagnostic_required: false,
    diagnostic_price: 25,
    estimated_duration: '1 hora',
    warranty_days: 30,
    active: true,

    categoria: 'Reparaciones del hogar',
    nombre: 'Ajuste de cerradura o manija de puerta',
    descripcion: 'Calibración o cambio de manija/pestillo para cierre suave.',
    precio_regular: 30,
    precio_lanzamiento: 30,
    descuento_porcentaje: 0,
    modalidad: 'Precio fijo',
  },
  {
    id: 'HOG-003',
    category: 'Reparaciones del hogar',
    service_name: 'Sellado higiénico con silicona en baño o cocina',
    description: 'Retiro de silicona vieja con moho y aplicación de nuevo cordón de silicona antihongos en lavamanos, batea, ducha o encimera.',
    price: 28,
    diagnostic_required: false,
    diagnostic_price: 25,
    estimated_duration: '1 hora',
    warranty_days: 30,
    active: true,

    categoria: 'Reparaciones del hogar',
    nombre: 'Sellado con silicona en baño o cocina',
    descripcion: 'Renovación de sello impermeable contra filtraciones.',
    precio_regular: 28,
    precio_lanzamiento: 28,
    descuento_porcentaje: 0,
    modalidad: 'Precio fijo',
  },
  {
    id: 'HOG-004',
    category: 'Reparaciones del hogar',
    service_name: 'Armado de mueble estándar (escritorio, mesita o repisa)',
    description: 'Ensamblaje cuidadoso de mueble tipo RTA según manual del fabricante, nivelación de gavetas y ajuste de bisagras.',
    price: 45,
    diagnostic_required: false,
    diagnostic_price: 25,
    estimated_duration: '2 horas',
    warranty_days: 30,
    active: true,

    categoria: 'Reparaciones del hogar',
    nombre: 'Armado de mueble estándar',
    descripcion: 'Armado de escritorios, muebles de TV o mesas auxiliares.',
    precio_regular: 45,
    precio_lanzamiento: 45,
    descuento_porcentaje: 0,
    modalidad: 'Precio fijo',
  },
  {
    id: 'HOG-005',
    category: 'Reparaciones del hogar',
    service_name: 'Diagnóstico o ajuste menor en el hogar',
    description: 'Visita de técnico FIXIT para evaluar daños diversos, puertas descolgadas, filtraciones leves o tareas múltiples en casa.',
    price: 25,
    diagnostic_required: true,
    diagnostic_price: 25,
    estimated_duration: '1 a 2 horas',
    warranty_days: 30,
    active: true,

    categoria: 'Reparaciones del hogar',
    nombre: 'Diagnóstico o ajuste menor en el hogar',
    descripcion: 'Evaluación integral en sitio para tareas o arreglos varios.',
    precio_regular: 25,
    precio_lanzamiento: 25,
    descuento_porcentaje: 0,
    modalidad: 'Diagnóstico acreditable',
  },
  {
    id: 'HOG-006',
    category: 'Reparaciones del hogar',
    service_name: 'Instalación de Wall Mount / Soporte de TV',
    description: 'Instalación y anclaje seguro en pared para televisores, nivelación y fijación profesional.',
    price: 35,
    diagnostic_required: false,
    diagnostic_price: 25,
    estimated_duration: '1 a 1.5 horas',
    warranty_days: 30,
    active: true,
    badge: 'Desde $35.00',

    categoria: 'Reparaciones del hogar',
    nombre: 'Instalación de Wall Mount / Soporte de TV',
    descripcion: 'Instalación y anclaje seguro en pared para televisores, nivelación y fijación profesional.',
    precio_regular: 35,
    precio_lanzamiento: 35,
    descuento_porcentaje: 0,
    modalidad: 'Desde',
    inclusions: [
      'Anclaje seguro con tarugos y pernos de alta resistencia en mampostería o gypsum reforzado',
      'Nivelación precisa con nivel láser o de burbuja',
      'Fijación y acople del televisor al soporte con pruebas de resistencia',
      'Opciones flexibles: solo instalación o combo con soporte suministrado',
    ],
    exclusions: [
      'Canaleteado o recableado interno dentro de pared (se ofrece canaleta superficial si se requiere)',
      'Paredes de cristal o materiales sin solidez de anclaje',
    ],
  },

  // ==========================================
  // 4. PINTURA RESIDENCIAL - SERVICIOS SECUNDARIOS COMPLEMENTARIOS
  // (Pintura interior básica, interior estándar y exterior fueron reemplazadas por el Cotizador Interactivo)
  // ==========================================
  {
    id: 'PIN-004',
    category: 'Pintura residencial',
    service_name: 'Pintura de cielo raso / Techo',
    description: 'Pintura técnica de techos y cielorrasos de gypsum, losa o escayola. Protección plástica antigoteo y acabado blanco mate uniforme.',
    price: 6.0,
    pricing_type: 'per_unit',
    unit_name: 'm²',
    minimum_service_charge: 75,
    diagnostic_required: false,
    diagnostic_price: 25,
    estimated_duration: '3 a 6 horas según m²',
    warranty_days: 30,
    active: true,
    inclusions: [
      'Cobertura plástica total del piso y todo el mobiliario de la habitación',
      '2 manos de pintura blanca mate especial para cielo raso',
      'Recorte cuidadoso alrededor de lámparas, detectores y ductos de A/C',
    ],
    exclusions: [
      'Pintura en sí (mano de obra)',
      'Reparación de goteras o láminas de gypsum colapsadas',
      'Alturas mayores a 3 metros',
    ],

    categoria: 'Pintura residencial',
    nombre: 'Pintura de cielo raso / Techo ($6.00/m²)',
    descripcion: 'Pintura técnica antigoteo para techos y gypsum. Tarifa mínima: $75.',
    precio_regular: 6.0,
    precio_lanzamiento: 6.0,
    descuento_porcentaje: 0,
    modalidad: 'Precio fijo',
  },
  {
    id: 'PIN-005',
    category: 'Pintura residencial',
    service_name: 'Resane y reparación de paredes (Grietas y Humedad)',
    description: 'Tratamiento de humedad, descascaramiento, huecos y fisuras con masilla o pasta profesional. Requiere evaluación técnica en sitio.',
    price: 25,
    pricing_type: 'diagnostic',
    unit_name: 'visita',
    minimum_service_charge: 75,
    diagnostic_required: true,
    diagnostic_price: 25,
    is_evaluation_required: true,
    estimated_duration: '1 a 2 horas (evaluación)',
    warranty_days: 60,
    active: true,
    inclusions: [
      'Visita técnica de inspección para determinar origen de humedad o grieta',
      'Medición precisa de área a resanar y propuesta formal de solución',
      'Diagnóstico 100% acreditable si realizas el trabajo con FIXIT',
    ],
    exclusions: [
      'Trabajos de demolición o albañilería estructural mayor',
    ],

    categoria: 'Pintura residencial',
    nombre: 'Resane y reparación de paredes (Requiere evaluación)',
    descripcion: 'Evaluación técnica en sitio para grietas y humedad. Acreditable.',
    precio_regular: 25,
    precio_lanzamiento: 25,
    descuento_porcentaje: 0,
    modalidad: 'Diagnóstico acreditable',
  },
];

// Compatibility export
export const FIXI_CATALOG = FIXIT_CATALOG;

// Historical services archived from main catalog
export const HISTORICAL_SERVICES: Service[] = [
  {
    id: 'PIN-001',
    category: 'Pintura residencial',
    service_name: 'Pintura interior básica',
    description: 'Aplicación de 2 manos de pintura sobre paredes interiores limpias y en buen estado. Acabado parejo y protección de rodapiés y piso.',
    price: 5.5,
    pricing_type: 'per_unit',
    unit_name: 'm²',
    minimum_service_charge: 75,
    diagnostic_required: false,
    diagnostic_price: 25,
    estimated_duration: '3 a 6 horas según m²',
    warranty_days: 30,
    active: false,
    inclusions: [
      'Protección de rodapiés, marcos y pisos con cinta y plástico',
      '2 manos uniformes de pintura aplicadas con rodillo y brocha de recorte fino',
      'Limpieza general del área al finalizar la jornada',
    ],
    exclusions: [
      'Pintura o esmalte (mano de obra; el cliente provee la pintura o se cotiza por separado)',
      'Resane mayor de grietas o tratamiento de humedades activas',
      'Trabajos en alturas superiores a 3 metros',
    ],
    categoria: 'Pintura residencial',
    nombre: 'Pintura interior básica ($5.50/m²)',
    descripcion: '2 manos en paredes limpias. Tarifa mínima de servicio: $75.',
    precio_regular: 5.5,
    precio_lanzamiento: 5.5,
    descuento_porcentaje: 0,
    modalidad: 'Precio fijo',
  },
  {
    id: 'PIN-002',
    category: 'Pintura residencial',
    service_name: 'Pintura interior estándar',
    description: 'Preparación de paredes, lijado suave, sellador base si aplica y 2 manos de acabado uniforme. Incluye protección total de mobiliario.',
    price: 7.0,
    pricing_type: 'per_unit',
    unit_name: 'm²',
    minimum_service_charge: 75,
    diagnostic_required: false,
    diagnostic_price: 25,
    estimated_duration: '4 a 8 horas según m²',
    warranty_days: 45,
    active: false,
    inclusions: [
      'Protección exhaustiva de pisos, rodapiés, interruptores y muebles',
      'Lijado suave y eliminación de asperezas en las paredes',
      'Aplicación de sellador/imprimante de fijación si es requerido',
      '2 manos uniformes de pintura de acabado fino',
      'Limpieza y retiro de cintas protectoras',
    ],
    exclusions: [
      'Costo de la pintura (mano de obra especializada; cliente provee o cotizamos aparte)',
      'Tratamiento de filtraciones estructurales de agua',
      'Alturas superiores a 3 metros',
    ],
    categoria: 'Pintura residencial',
    nombre: 'Pintura interior estándar ($7.00/m²)',
    descripcion: 'Preparación de pared, sellador y 2 manos. Tarifa mínima: $75.',
    precio_regular: 7.0,
    precio_lanzamiento: 7.0,
    descuento_porcentaje: 0,
    modalidad: 'Precio fijo',
  },
  {
    id: 'PIN-003',
    category: 'Pintura residencial',
    service_name: 'Pintura exterior (Fachadas o Muros)',
    description: 'Pintura de alta resistencia a la intemperie en fachadas, muros perimetrales, balcones o terrazas. Limpieza previa y doble capa protectora.',
    price: 9.0,
    pricing_type: 'per_unit',
    unit_name: 'm²',
    minimum_service_charge: 75,
    diagnostic_required: false,
    diagnostic_price: 25,
    estimated_duration: '1 a 2 días según m²',
    warranty_days: 60,
    active: false,
    inclusions: [
      'Limpieza y raspado superficial de moho, suciedad y pintura suelta',
      '2 manos de pintura exterior antihongos resistente al sol y lluvia',
      'Protección de pisos exteriores, jardines y ventanas',
    ],
    exclusions: [
      'Pintura en sí (mano de obra)',
      'Montaje de andamios mayores a 3 metros de altura',
      'Reparación de filtraciones o grietas profundas',
    ],
    categoria: 'Pintura residencial',
    nombre: 'Pintura exterior de fachada o muros ($9.00/m²)',
    descripcion: 'Pintura resistente al sol y lluvia para fachadas y muros exteriores.',
    precio_regular: 9.0,
    precio_lanzamiento: 9.0,
    descuento_porcentaje: 0,
    modalidad: 'Precio fijo',
  },
];

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
    if (normalizedCat.includes('plomer') && sCat.includes('plomer')) return true;
    if (normalizedCat.includes('electr') && sCat.includes('electr')) return true;
    if ((normalizedCat.includes('reparac') || normalizedCat.includes('hogar')) && sCat.includes('hogar')) return true;
    if (normalizedCat.includes('pintur') && (sCat.includes('pintur') || sCatLeg.includes('pintur'))) return true;

    return false;
  });
}

export function calculatePricing(service: Service) {
  return {
    precio_regular: service.price,
    descuento: 0,
    precio_lanzamiento: service.price,
  };
}
