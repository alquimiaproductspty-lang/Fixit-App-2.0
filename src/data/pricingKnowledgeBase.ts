/**
 * BASE DE CONOCIMIENTO CENTRAL: MOTOR DE COTIZACIÓN Y REGLAS OPERATIVAS FIXIT PANAMÁ
 * Single Source of Truth para el asistente de IA (AI Studio / Gemini API) y la aplicación.
 */

export const FIXIT_BANKING_DETAILS = {
  yappyPhone: '6137-2394',
  bank: 'Banco General',
  accountType: 'Cuenta de Ahorros',
  accountNumber: '04-72-98-545854-3',
  beneficiary: 'Virginia Palomino Hoyte',
  advancePercentage: 0.50, // 50% anticipo obligatorio
  diagnosticPrice: 25.00,  // $25.00 deducible
  warrantyDays: 30,        // 30 días de garantía FIXIT
  commercialWhatsApp: '50765356072',
  commercialWhatsAppFormatted: '+507 6535-6072',
};

export const FIXIT_OFFICIAL_PVP = {
  climatizacion: [
    {
      id: 'AC-001',
      name: 'Mantenimiento Preventivo (1 Unidad)',
      category: 'Climatización',
      price: 30.00,
      description: 'Limpieza profunda de split residencial (evaporador, turbina, filtros y condensador exterior).',
    },
    {
      id: 'AC-002',
      name: 'Mantenimiento Combo (2 Unidades)',
      category: 'Climatización',
      price: 60.00,
      promo_price_usd: 55.00,
      promo_label: 'Promo Meta Ads',
      description: 'Mantenimiento preventivo completo para 2 unidades split en la misma visita.',
    },
    {
      id: 'AC-003',
      name: 'Mantenimiento Combo (3 Unidades)',
      category: 'Climatización',
      price: 75.00,
      description: 'Mantenimiento preventivo completo para 3 unidades split en la misma visita.',
    },
    {
      id: 'AC-004',
      name: 'Instalación Básica (Residencial - incluye kit básico 3m)',
      category: 'Climatización',
      price: 80.00,
      description: 'Instalación split residencial en punto preparado. Incluye kit básico de 3m.',
    },
    {
      id: 'AC-005',
      name: 'Instalación Básica (Edificio/Balcón)',
      category: 'Climatización',
      price: 100.00,
      description: 'Instalación split en balcón o edificio residencial con kit básico.',
    },
    {
      id: 'AC-006',
      name: 'Instalación por Manga (PH) - Solo mano de obra',
      category: 'Climatización',
      price: 135.00,
      description: 'Pase por manga en PH/apartamentos (solo mano de obra).',
    },
    {
      id: 'AC-007',
      name: 'Instalación por Manga (PH) - Completa',
      category: 'Climatización',
      price: 160.00,
      embedded_material_usd: 25.00,
      description: 'Pase por manga en PH. Incluye soldadura de plata, presurización con nitrógeno y vacío profesional.',
    },
    {
      id: 'AC-008',
      name: 'Punto eléctrico adicional para A/C',
      category: 'Climatización',
      price: 35.00,
      description: 'Tirada o adecuación de punto eléctrico dedicado para aire acondicionado.',
    },
  ],
  plomeria: [
    {
      id: 'PLO-001',
      name: 'Reemplazo de Ducha Eléctrica (Básica sobre niple)',
      category: 'Plomería',
      price: 38.00,
      description: 'Desinstalación y montaje de ducha eléctrica básica sobre niple existente.',
    },
    {
      id: 'PLO-002',
      name: 'Ducha Eléctrica + Punto eléctrico nuevo desde tablero',
      category: 'Plomería',
      price: 100.00,
      description: 'Instalación de ducha eléctrica con cableado y punto eléctrico nuevo desde el tablero.',
    },
    {
      id: 'PLO-003',
      name: 'Reemplazo simple de Lavamanos / Grifería',
      category: 'Plomería',
      price: 45.00,
      description: 'Cambio de grifería o llave estándar en lavamanos con sellado y prueba de estanqueidad.',
    },
    {
      id: 'PLO-004',
      name: 'Reemplazo de Fregador (con sellado)',
      category: 'Plomería',
      price: 50.00,
      description: 'Instalación y sellado hermético con silicona antihongos de fregador en cocina.',
    },
    {
      id: 'PLO-005',
      name: 'Instalación compleja (Mueble nuevo o modificación de tubería PVC)',
      category: 'Plomería',
      price: 60.00,
      description: 'Montaje en mueble nuevo o reconfiguración de desagüe/tubería PVC sanitaria.',
    },
    {
      id: 'PLO-006',
      name: 'Conexión punto de agua Icemaker / Nevera',
      category: 'Plomería',
      price: 48.00,
      description: 'Conexión segura de manguera a toma de agua existente sin fugas ocultas.',
    },
    {
      id: 'PLO-007',
      name: 'Instalación Secadora (Gas/Eléctrica + ducto)',
      category: 'Plomería',
      price: 68.00,
      description: 'Conexión de secadora a línea de gas o tomacorriente y acople de ducto de escape.',
    },
  ],
  electricidad: [
    {
      id: 'ELE-001',
      name: 'Paquete Eléctrico Menor (Visita + cambio de hasta 3 tomas/switches)',
      category: 'Electricidad',
      price: 40.00,
      description: 'Visita técnica y sustitución de hasta 3 puntos (tomacorrientes o interruptores estándar).',
    },
    {
      id: 'ELE-002',
      name: 'Punto adicional (a partir del 4to en la misma visita)',
      category: 'Electricidad',
      price: 10.00,
      addon_only: true,
      description: 'Tarifa unitaria por cada tomacorriente o interruptor adicional después del 3ro.',
    },
    {
      id: 'ELE-003',
      name: 'Instalación Switch Inteligente / Dimmer',
      category: 'Electricidad',
      price: 40.00,
      description: 'Montaje y configuración eléctrica de switch inteligente (WiFi/Zigbee) o regulador dimerizable.',
    },
  ],
};

/**
 * PROMPT COMPLETO DEL SISTEMA PARA ASISTENTE IA (AI STUDIO / GEMINI SYSTEM INSTRUCTIONS)
 */
export const FIXIT_SYSTEM_PROMPT = `Instrucciones del Sistema: Motor de Cotización FIXIT Panamá

Actúa como el motor principal de cotización y gestión de servicios residenciales para "FIXIT Panamá". Tu objetivo es proporcionar cotizaciones exactas, rápidas y sin fricciones, basándote estrictamente en la siguiente estructura de Precios de Venta al Público (PVP) y reglas operativas.

Reglas Operativas Estrictas (Cero Complacencia):

Anticipo Obligatorio: Todo servicio requiere el pago del 50% por adelantado vía Yappy (6137-2394) o Banco General (04-72-98-545854-3, Virginia Palomino Hoyte) para separar la cita. Sin comprobante, no hay agendamiento.

Diagnóstico Técnico: Toda visita de inspección cuesta $25.00. Este monto es 100% deducible del total si el cliente aprueba la reparación.

Consumibles: Los precios reflejan mano de obra e insumos menores de fijación. Materiales mayores o piezas de reemplazo los proporciona el cliente o se cotizan por separado.

Fijación de Precios: No inventes tarifas ni apliques porcentajes ciegos. Usa únicamente los precios fijos detallados a continuación.

Tarifario Oficial (PVP FIXIT):

❄️ Climatización (Aires Acondicionados Split)
- Mantenimiento Preventivo (1 Unidad): $30.00
- Mantenimiento Combo (2 Unidades): $60.00 (Promo Meta Ads: $55.00)
- Mantenimiento Combo (3 Unidades): $75.00
- Instalación Básica (Residencial - incluye kit básico 3m): $80.00
- Instalación Básica (Edificio/Balcón): $100.00
- Instalación por Manga (PH): $135.00 (Solo mano de obra) / $160.00 (Incluye soldadura de plata, nitrógeno y vacío).
- Punto eléctrico adicional para A/C: $35.00

💧 Plomería Residencial
- Reemplazo de Ducha Eléctrica (Básica sobre niple): $38.00
- Ducha Eléctrica + Punto eléctrico nuevo desde tablero: $100.00
- Reemplazo simple de Lavamanos/Grifería: $45.00
- Reemplazo de Fregador (con sellado): $50.00
- Instalación compleja (Mueble nuevo o modificación de tubería PVC): $60.00
- Conexión punto de agua Icemaker / Nevera: $48.00
- Instalación Secadora (Gas/Eléctrica + ducto): $68.00

⚡ Electricidad Menor
- Paquete Eléctrico Menor (Visita + cambio de hasta 3 tomas/switches): $40.00
- Punto adicional (a partir del 4to en la misma visita, solo como complemento): $10.00 c/u
- Instalación Switch Inteligente / Dimmer: $40.00

Flujo de Respuesta al Cliente:
Cuando un usuario solicite un servicio, responde de manera concisa:
1. Confirma la disponibilidad del servicio.
2. Proporciona el precio exacto basado en la tabla.
3. Indica el monto del anticipo requerido (50%) y los métodos de pago oficiales para agendar de inmediato:
   - Yappy: 6137-2394
   - Banco General: Cuenta de Ahorros 04-72-98-545854-3 (Virginia Palomino Hoyte)
4. Menciona la Garantía FIXIT de 30 días.`;
