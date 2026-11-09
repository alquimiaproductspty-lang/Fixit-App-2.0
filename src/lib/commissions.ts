/**
 * FIXIT — Motor puro de cálculo de comisión (15% por defecto sobre mano de obra)
 * Prohibido mostrar estos cálculos en PDFs, mensajes WhatsApp a clientes o vistas públicas.
 */

export const DEFAULT_COMMISSION_RATE = 0.15;

export interface CommissionableDoc {
  // Campos de Cotización (ManagedQuote)
  mano_de_obra?: number | null;
  materiales?: number | null;
  total?: number | null;
  // Campos de Pedido / Solicitud (ServiceRequest / AdminOrder / FixerOrder)
  total_facturado?: number | null;
  precio?: number | null;
  cotizacion?: number | null;
  precio_regular?: number | null;
  precio_lanzamiento?: number | null;
  servicio_probable?: {
    price?: number | null;
  } | null;
  // Campos ya existentes en ServiceRequest (types.ts)
  comision_fixit?: number;
  costo_tecnico?: number;
}

export function round2(value: number): number {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

export function normalizeRate(rate?: number | null): number {
  if (rate === undefined || rate === null || !Number.isFinite(Number(rate))) {
    return DEFAULT_COMMISSION_RATE;
  }
  const num = Number(rate);
  if (num < 0) return 0;
  if (num > 1 && num <= 100) {
    return num / 100;
  }
  if (num > 100) return 1;
  return num;
}

/**
 * Determina si la base de comisión de un documento proviene explícitamente de `mano_de_obra`.
 */
export function isLaborCommissionBase(doc?: CommissionableDoc | null): boolean {
  if (!doc || typeof doc !== 'object') return false;
  const mo = Number(doc.mano_de_obra);
  return Number.isFinite(mo) && mo > 0;
}

/**
 * Obtiene la base sobre la que se calcula la comisión de Fixit:
 * - Quote: `mano_de_obra > 0 ? mano_de_obra : total`
 * - Order: `total_facturado ?? precio` (con fallback seguro a cotizacion / precio_regular / servicio_probable.price)
 */
export function getCommissionBase(doc?: CommissionableDoc | null): number {
  if (!doc || typeof doc !== 'object') return 0;

  const mo = Number(doc.mano_de_obra);
  if (Number.isFinite(mo) && mo > 0) {
    return round2(mo);
  }

  if (doc.total !== undefined && doc.total !== null && Number.isFinite(Number(doc.total))) {
    return round2(Math.max(0, Number(doc.total)));
  }

  const rawOrderAmount =
    doc.total_facturado ??
    doc.precio ??
    doc.cotizacion ??
    doc.precio_regular ??
    doc.precio_lanzamiento ??
    doc.servicio_probable?.price ??
    0;

  const parsed = Number(rawOrderAmount);
  return Number.isFinite(parsed) && parsed > 0 ? round2(parsed) : 0;
}

/**
 * Calcula la comisión de Fixit: base × tasa (redondeado a 2 decimales).
 */
export function calcCommission(base: number, rate: number = DEFAULT_COMMISSION_RATE): number {
  const cleanBase = Math.max(0, round2(base));
  const cleanRate = normalizeRate(rate);
  return round2(cleanBase * cleanRate);
}

/**
 * Calcula el neto del técnico (Fixer): base - comisión (redondeado a 2 decimales).
 */
export function calcNet(base: number, rate: number = DEFAULT_COMMISSION_RATE): number {
  const cleanBase = Math.max(0, round2(base));
  const commission = calcCommission(cleanBase, rate);
  return round2(cleanBase - commission);
}

/**
 * Calcula el desglose completo cableando los atributos oficiales `comision_fixit` y `costo_tecnico`.
 */
export function calcCommissionBreakdown(
  doc?: CommissionableDoc | null,
  rate: number = DEFAULT_COMMISSION_RATE
): {
  base: number;
  rate: number;
  comision_fixit: number;
  costo_tecnico: number;
  isLaborBase: boolean;
} {
  const cleanRate = normalizeRate(rate);
  const base = getCommissionBase(doc);
  const comision_fixit = calcCommission(base, cleanRate);
  const costo_tecnico = calcNet(base, cleanRate);
  return {
    base,
    rate: cleanRate,
    comision_fixit,
    costo_tecnico,
    isLaborBase: isLaborCommissionBase(doc),
  };
}

