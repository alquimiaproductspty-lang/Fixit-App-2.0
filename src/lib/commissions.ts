import type { FixitUpsell, Service, VisitOutcome } from '../types';

/**
 * Helper puro para cálculo de comisión Fixit, materiales embebidos,
 * visitas técnicas DIAG-001, regla de complemento (addon_only),
 * piso mínimo de comisión e ingresos de extras en sitio (upsells).
 *
 * NUNCA exponer estos cálculos en vistas públicas, PDF ni mensajes de WhatsApp al cliente.
 */

export const DEFAULT_COMMISSION_RATE = 0.15;
export const DEFAULT_MIN_STANDALONE_COMMISSION_USD = 3.00;
export const PAINTING_MIN_LABOR_USD = 75.00;
export const PAINTING_EMBEDDED_MATERIAL_PER_M2 = 1.00;
export const DIAG_VISIT_PRICE_USD = 25.00;
export const DIAG_UNAPPROVED_FIXIT_USD = 10.00;
export const DIAG_UNAPPROVED_FIXER_USD = 15.00;

/**
 * Redondeo estricto a 2 decimales (anti-centavos).
 */
export function round2(value: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Subtotal por línea: round2(qty * precio)
 */
export function calcLineSubtotal(qty: number, price: number): number {
  const safeQty = Number.isFinite(Number(qty)) ? Math.max(0, Number(qty)) : 0;
  const safePrice = Number.isFinite(Number(price)) ? Math.max(0, Number(price)) : 0;
  return round2(safeQty * safePrice);
}

/**
 * Normaliza la tasa de comisión en rango [0, 1].
 * Si recibe porcentaje (ej. 15), el llamador debe convertirlo antes o usar normalizeRateInput.
 */
export function normalizeCommissionRate(rate?: number | null): number {
  const n = Number(rate);
  if (!Number.isFinite(n) || n < 0) return DEFAULT_COMMISSION_RATE;
  if (n > 1) return round2(Math.min(100, n) / 100);
  return n;
}

export const normalizeRate = normalizeCommissionRate;

/**
 * Normaliza el piso mínimo de comisión para órdenes/cotizaciones individuales.
 */
export function normalizeMinStandaloneCommission(minUsd?: number | null): number {
  const n = Number(minUsd);
  if (!Number.isFinite(n) || n < 0) return DEFAULT_MIN_STANDALONE_COMMISSION_USD;
  return round2(n);
}

export interface CommissionSourceDoc {
  // Campos de cotización (ManagedQuote)
  mano_de_obra?: number | null;
  materiales?: number | null;
  total?: number | null;
  upsells_total?: number | null;
  upsells_costo_mayorista?: number | null;
  upsells_bono_fixer?: number | null;
  upsells_neto_fixit?: number | null;
  // Campos de pedido (ServiceRequest / AdminOrder / FixerOrder)
  total_facturado?: number | null;
  cotizacion?: number | null;
  precio?: number | null;
  precio_lanzamiento?: number | null;
  precio_regular?: number | null;
  costo_materiales?: number | null;
  visitOutcome?: VisitOutcome | null;
  servicio_id?: string | null;
  servicio_probable?: {
    id?: string;
    price?: number;
    embedded_material_usd?: number;
    diagnostic_required?: boolean;
  } | null;
}

/**
 * Determina si la base de comisión corresponde específicamente a mano de obra desglosada.
 */
export function isLaborOnlyBase(doc?: CommissionSourceDoc | null): boolean {
  if (!doc) return false;
  const mo = Number(doc.mano_de_obra);
  const mat = Number(doc.materiales ?? doc.costo_materiales ?? doc.servicio_probable?.embedded_material_usd ?? 0);
  return Number.isFinite(mo) && mo > 0 && Number.isFinite(mat) && mat > 0;
}

export const isLaborCommissionBase = isLaborOnlyBase;

/**
 * Obtiene la base gravable para la comisión (solo mano de obra cuando está desglosada):
 * - Si tiene mano_de_obra > 0, usa mano_de_obra.
 * - Si es un pedido con servicio_probable.embedded_material_usd > 0 (ej. AC-007 $160 con $25 de material),
 *   descuenta el material embebido para gravar únicamente la mano de obra ($135).
 * - En caso contrario, usa total / total_facturado / cotizacion / precio.
 */
export function getCommissionBase(doc?: CommissionSourceDoc | null): number {
  if (!doc) return 0;

  if (doc.visitOutcome === 'no_aprobada') {
    return DIAG_VISIT_PRICE_USD;
  }

  const mo = Number(doc.mano_de_obra);
  if (Number.isFinite(mo) && mo > 0) {
    return round2(mo);
  }

  const rawTotalCandidates = [
    doc.total,
    doc.total_facturado,
    doc.cotizacion,
    doc.precio,
    doc.precio_lanzamiento,
    doc.precio_regular,
    doc.servicio_probable?.price,
  ];

  let grossTotal = 0;
  for (const candidate of rawTotalCandidates) {
    const val = Number(candidate);
    if (Number.isFinite(val) && val > 0) {
      grossTotal = round2(val);
      break;
    }
  }

  if (grossTotal <= 0) return 0;

  // Si el pedido tiene costo_materiales explícito o material embebido en catálogo (ej. AC-007 $25)
  const explicitMat = Number(doc.materiales ?? doc.costo_materiales);
  if (Number.isFinite(explicitMat) && explicitMat > 0 && explicitMat < grossTotal) {
    return round2(grossTotal - explicitMat);
  }

  const embeddedMat = Number(doc.servicio_probable?.embedded_material_usd);
  if (Number.isFinite(embeddedMat) && embeddedMat > 0 && embeddedMat < grossTotal) {
    return round2(grossTotal - embeddedMat);
  }

  return grossTotal;
}

/**
 * Calcula la comisión de Fixit: round2(base * rate).
 */
export function calcCommission(base: number, rate: number = DEFAULT_COMMISSION_RATE): number {
  const safeBase = Math.max(0, Number(base) || 0);
  const safeRate = normalizeCommissionRate(rate);
  return round2(safeBase * safeRate);
}

/**
 * Calcula el neto para el fixer como residual estricto:
 * neto = round2(base - calcCommission(base, rate))
 * NUNCA usar round2(base * (1 - rate)) para evitar descuadres de centavos.
 */
export function calcNet(base: number, rate: number = DEFAULT_COMMISSION_RATE): number {
  const safeBase = round2(Math.max(0, Number(base) || 0));
  const commission = calcCommission(safeBase, rate);
  return round2(safeBase - commission);
}

/**
 * Calcula el desglose completo { base, rate, comision_fixit, costo_tecnico, isLaborBase, ... }
 * Contempla:
 * - Visita DIAG-001 no aprobada: split fijo $10.00 Fixit / $15.00 fixer (ignora el 15%).
 * - Materiales embebidos / desglosados: 0% comisión (reembolso íntegro al fixer).
 * - Upsells en sitio: neto Fixit = precio - costo mayorista - bono fixer; fixer recibe bono fijo.
 */
export function calcCommissionBreakdown(
  doc?: CommissionSourceDoc | null,
  rate: number = DEFAULT_COMMISSION_RATE
) {
  const safeRate = normalizeCommissionRate(rate);

  if (doc?.visitOutcome === 'no_aprobada') {
    return {
      base: DIAG_VISIT_PRICE_USD,
      rate: safeRate,
      comision_fixit: DIAG_UNAPPROVED_FIXIT_USD,
      costo_tecnico: DIAG_UNAPPROVED_FIXER_USD,
      materiales_reembolso: 0,
      upsells_neto_fixit: 0,
      upsells_bono_fixer: 0,
      isLaborBase: false,
      isVisitUnapproved: true,
    };
  }

  const base = getCommissionBase(doc);
  const laborCommission = calcCommission(base, safeRate);
  const laborNet = calcNet(base, safeRate);

  const materialesReembolso = round2(
    Math.max(
      0,
      Number(
        doc?.materiales ??
          doc?.costo_materiales ??
          doc?.servicio_probable?.embedded_material_usd ??
          0
      ) || 0
    )
  );

  const upsellsNetoFixit = round2(Math.max(0, Number(doc?.upsells_neto_fixit) || 0));
  const upsellsBonoFixer = round2(Math.max(0, Number(doc?.upsells_bono_fixer) || 0));

  const comision_fixit = round2(laborCommission + upsellsNetoFixit);
  const costo_tecnico = round2(laborNet + upsellsBonoFixer);

  return {
    base,
    rate: safeRate,
    labor_comision_fixit: laborCommission,
    labor_costo_tecnico: laborNet,
    comision_fixit,
    costo_tecnico,
    materiales_reembolso: materialesReembolso,
    upsells_neto_fixit: upsellsNetoFixit,
    upsells_bono_fixer: upsellsBonoFixer,
    isLaborBase: isLaborOnlyBase(doc),
    isVisitUnapproved: false,
  };
}

/**
 * Cálculo de pintura residencial:
 * IMPORTANTE: NUNCA redondear comisión ni neto por unidad ($/m²), ya que produce un error
 * acumulado de $0.01/m² (ej. en interior $2.50/m² * 0.15 = $0.375 → $0.38/m², que en 40 m²
 * desvía $0.20). Siempre calcular subtotal bruto de mano de obra, aplicar el mínimo de $75.00
 * a la mano de obra bruta ANTES de la comisión, y luego aplicar calcCommission y calcNet.
 */
export interface PaintingBreakdownInput {
  areaType: 'interior' | 'exterior';
  m2: number;
  withMaterials: boolean;
  extraPaintMaterialsUsd?: number;
}

export interface PaintingBreakdownResult {
  m2: number;
  laborRatePerM2: number;
  rawLaborUsd: number;
  minimumApplied: boolean;
  laborBaseUsd: number;
  embeddedMaterialPerM2: number;
  embeddedMaterialsUsd: number;
  extraMaterialsUsd: number;
  totalMaterialsUsd: number;
  totalClientUsd: number;
}

export function calcPaintingBreakdown(input: PaintingBreakdownInput): PaintingBreakdownResult {
  const safeM2 = Math.max(0, Number(input.m2) || 0);
  const laborRatePerM2 = input.areaType === 'exterior' ? 3.50 : 2.50;
  const rawLaborUsd = calcLineSubtotal(safeM2, laborRatePerM2);
  const minimumApplied = safeM2 > 0 && rawLaborUsd < PAINTING_MIN_LABOR_USD;
  const laborBaseUsd = safeM2 > 0 ? Math.max(rawLaborUsd, PAINTING_MIN_LABOR_USD) : 0;

  const embeddedMaterialPerM2 = input.withMaterials ? PAINTING_EMBEDDED_MATERIAL_PER_M2 : 0;
  const embeddedMaterialsUsd = input.withMaterials ? calcLineSubtotal(safeM2, PAINTING_EMBEDDED_MATERIAL_PER_M2) : 0;
  const extraMaterialsUsd = round2(Math.max(0, Number(input.extraPaintMaterialsUsd) || 0));
  const totalMaterialsUsd = round2(embeddedMaterialsUsd + extraMaterialsUsd);
  const totalClientUsd = round2(laborBaseUsd + totalMaterialsUsd);

  return {
    m2: safeM2,
    laborRatePerM2,
    rawLaborUsd,
    minimumApplied,
    laborBaseUsd,
    embeddedMaterialPerM2,
    embeddedMaterialsUsd,
    extraMaterialsUsd,
    totalMaterialsUsd,
    totalClientUsd,
  };
}

/**
 * Desglose matemático de un extra en sitio (upsell):
 * Neto Fixit = price_usd - wholesale_cost_usd - fixer_bonus_usd (NO aplica 15%).
 * El fixer recibe su bono fijo.
 */
export function calcUpsellBreakdown(upsell: FixitUpsell, qty: number = 1) {
  const safeQty = Math.max(0, Number(qty) || 0);
  const totalPrice = calcLineSubtotal(safeQty, upsell.price_usd);
  const wholesaleCost = calcLineSubtotal(safeQty, upsell.wholesale_cost_usd);
  const fixerBonus = calcLineSubtotal(safeQty, upsell.fixer_bonus_usd);
  const fixitNet = round2(totalPrice - wholesaleCost - fixerBonus);

  return {
    qty: safeQty,
    totalPrice,
    wholesaleCost,
    fixerBonus,
    fixitNet,
  };
}

export interface QuoterLineItem {
  id: number | string;
  description: string;
  qty: number;
  price: number;
  kind?: 'labor' | 'material' | 'upsell';
  serviceId?: string;
  upsellId?: string;
  addonOnly?: boolean;
  promoPriceUsd?: number;
  promoLabel?: string;
  regularPriceUsd?: number;
  promoApplied?: boolean;
  wholesaleCostUsd?: number;
  fixerBonusUsd?: number;
  isPaintingLabor?: boolean;
}

/**
 * Construye las líneas del cotizador para un servicio del catálogo oficial:
 * - Si el servicio tiene embedded_material_usd > 0 (ej. AC-007 $160 con $25 de material),
 *   auto-divide en 2 líneas:
 *   1) Mano de obra ($135.00, gravable al 15%)
 *   2) Materiales ($25.00, reembolso 0% comisión)
 * - Si el servicio tiene promo_price_usd (ej. AC-002 $60 lista / $55 promo), adjunta la metadata
 *   para que el fixer pueda activar/desactivar el toggle de promo en el cotizador.
 * - Si el servicio tiene addon_only: true (ej. ELE-002 $10), adjunta addonOnly: true para
 *   impedir que se cotice sin un servicio principal.
 */
export function buildServiceQuoterLines(
  service: Service,
  options?: { applyPromo?: boolean; qty?: number }
): QuoterLineItem[] {
  const qty = Math.max(1, Number(options?.qty) || 1);
  const hasPromo = typeof service.promo_price_usd === 'number' && service.promo_price_usd > 0;
  const applyPromo = Boolean(options?.applyPromo && hasPromo);
  const effectivePrice = applyPromo && service.promo_price_usd ? service.promo_price_usd : service.price;
  const embeddedMat = round2(Math.max(0, Number(service.embedded_material_usd) || 0));
  const nowBase = Date.now() + Math.floor(Math.random() * 1000);

  if (embeddedMat > 0 && embeddedMat < effectivePrice) {
    const laborPrice = round2(effectivePrice - embeddedMat);
    return [
      {
        id: `${nowBase}-mo`,
        description: `${service.service_name} — Mano de obra`,
        qty,
        price: laborPrice,
        kind: 'labor',
        serviceId: service.id,
        addonOnly: Boolean(service.addon_only),
        regularPriceUsd: laborPrice,
      },
      {
        id: `${nowBase}-mat`,
        description: `${service.service_name} — Materiales e insumos (soldadura de plata / nitrógeno)`,
        qty,
        price: embeddedMat,
        kind: 'material',
        serviceId: service.id,
      },
    ];
  }

  return [
    {
      id: `${nowBase}-svc`,
      description: `${service.service_name} (${service.category})`,
      qty,
      price: round2(effectivePrice),
      kind: 'labor',
      serviceId: service.id,
      addonOnly: Boolean(service.addon_only),
      promoPriceUsd: service.promo_price_usd,
      promoLabel: service.promo_label,
      regularPriceUsd: service.price,
      promoApplied: applyPromo,
    },
  ];
}

/**
 * Construye las líneas del cotizador para Pintura Residencial:
 * - Si incluye materiales (con materiales), auto-divide en 2 líneas:
 *   1) Mano de obra ((tarifa - $1/m²) × m², con mínimo de $75.00 aplicado a la mano de obra bruta)
 *   2) Materiales ($1.00/m² × m² + pintura/insumos adicionales si aplica, 0% comisión)
 */
export function buildPaintingQuoterLines(params: {
  areaType: 'interior' | 'exterior';
  m2: number;
  withMaterials: boolean;
  extraPaintMaterialsUsd?: number;
  extraPaintMaterialsDesc?: string;
}): QuoterLineItem[] {
  const breakdown = calcPaintingBreakdown({
    areaType: params.areaType,
    m2: params.m2,
    withMaterials: params.withMaterials,
    extraPaintMaterialsUsd: params.extraPaintMaterialsUsd,
  });

  const areaLabel = params.areaType === 'exterior' ? 'Pintura Exterior' : 'Pintura Interior';
  const nowBase = Date.now() + Math.floor(Math.random() * 1000);
  const lines: QuoterLineItem[] = [];

  lines.push({
    id: `${nowBase}-paint-mo`,
    description: `${areaLabel} — Mano de obra (${breakdown.m2} m² a $${breakdown.laborRatePerM2.toFixed(2)}/m²${
      breakdown.minimumApplied ? ', tarifa mínima $75.00 aplicada' : ''
    })`,
    qty: 1,
    price: breakdown.laborBaseUsd,
    kind: 'labor',
    isPaintingLabor: true,
  });

  if (params.withMaterials && breakdown.totalMaterialsUsd > 0) {
    const matDesc = params.extraPaintMaterialsDesc
      ? `${areaLabel} — Materiales ($1.00/m² × ${breakdown.m2} m² + ${params.extraPaintMaterialsDesc})`
      : `${areaLabel} — Materiales ($1.00/m² × ${breakdown.m2} m²)`;
    lines.push({
      id: `${nowBase}-paint-mat`,
      description: matDesc,
      qty: 1,
      price: breakdown.totalMaterialsUsd,
      kind: 'material',
    });
  }

  return lines;
}

/**
 * Construye una línea de cotizador para un Extra en Sitio (upsell).
 * El cliente solo ve la descripción e importe instalado; internamente se preserva costo y bono.
 */
export function buildUpsellQuoterLine(upsell: FixitUpsell, qty: number = 1): QuoterLineItem {
  return {
    id: `${Date.now()}-${upsell.id}`,
    description: upsell.name,
    qty: Math.max(1, Number(qty) || 1),
    price: round2(upsell.price_usd),
    kind: 'upsell',
    upsellId: upsell.id,
    wholesaleCostUsd: round2(upsell.wholesale_cost_usd),
    fixerBonusUsd: round2(upsell.fixer_bonus_usd),
  };
}

export interface QuoteFinancialSummary {
  activeLinesCount: number;
  laborBase: number;
  paintingMinApplied: boolean;
  materialsReimbursement: number;
  upsellsTotal: number;
  upsellsWholesaleCost: number;
  upsellsFixerBonus: number;
  upsellsFixitNet: number;
  subtotalClient: number;
  laborCommission: number;
  laborNet: number;
  totalFixitGain: number;
  totalFixerNetAndBonus: number;
  totalFixerPayoutWithMaterials: number;
  isAddonOnlyBlocked: boolean;
  isBelowMinCommission: boolean;
  validationError: string | null;
}

/**
 * Evalúa las líneas del cotizador aplicando todas las reglas duras del motor de negocio:
 * 1) Subtotal por línea = round2(qty * price).
 * 2) Mínimo de pintura ($75.00) se aplica sobre la mano de obra bruta ANTES de comisión.
 * 3) Materiales (kind === 'material') tienen 0% comisión (reembolso íntegro al fixer).
 * 4) Extras en sitio (kind === 'upsell') usan neto Fixit = precio - costo mayorista - bono fixer.
 * 5) Bloqueo addon_only (ej. ELE-002 solo): exige al menos un servicio principal.
 * 6) Bloqueo por piso mínimo de comisión (default $3.00): ninguna orden/cotización individual
 *    puede procesarse si la ganancia de plataforma es menor al mínimo configurado.
 */
export function calcQuoteFinancialSummary(
  lines: QuoterLineItem[],
  rate: number = DEFAULT_COMMISSION_RATE,
  minStandaloneCommissionUsd: number = DEFAULT_MIN_STANDALONE_COMMISSION_USD
): QuoteFinancialSummary {
  const safeRate = normalizeCommissionRate(rate);
  const safeMinCommission = normalizeMinStandaloneCommission(minStandaloneCommissionUsd);

  const activeLines = lines.filter(
    (l) => (l.description || '').trim().length > 0 && Number(l.qty) > 0 && Number(l.price) > 0
  );

  let rawLaborSum = 0;
  let hasPaintingLabor = false;
  let paintingLaborRawSum = 0;
  let nonPaintingLaborSum = 0;
  let materialsReimbursement = 0;
  let upsellsTotal = 0;
  let upsellsWholesaleCost = 0;
  let upsellsFixerBonus = 0;
  let upsellsFixitNet = 0;

  for (const line of activeLines) {
    const lineSub = calcLineSubtotal(line.qty, line.price);
    const isMaterialByDesc = /material|insumo|repuesto/i.test(line.description || '');
    const kind = line.kind || (isMaterialByDesc ? 'material' : 'labor');

    if (kind === 'material') {
      materialsReimbursement = round2(materialsReimbursement + lineSub);
    } else if (kind === 'upsell') {
      const qty = Math.max(0, Number(line.qty) || 0);
      const wholesale = calcLineSubtotal(qty, Number(line.wholesaleCostUsd) || 0);
      const bonus = calcLineSubtotal(qty, Number(line.fixerBonusUsd) || 0);
      const net = round2(lineSub - wholesale - bonus);
      upsellsTotal = round2(upsellsTotal + lineSub);
      upsellsWholesaleCost = round2(upsellsWholesaleCost + wholesale);
      upsellsFixerBonus = round2(upsellsFixerBonus + bonus);
      upsellsFixitNet = round2(upsellsFixitNet + net);
    } else {
      rawLaborSum = round2(rawLaborSum + lineSub);
      if (line.isPaintingLabor) {
        hasPaintingLabor = true;
        paintingLaborRawSum = round2(paintingLaborRawSum + lineSub);
      } else {
        nonPaintingLaborSum = round2(nonPaintingLaborSum + lineSub);
      }
    }
  }

  const paintingMinApplied =
    hasPaintingLabor && paintingLaborRawSum > 0 && paintingLaborRawSum < PAINTING_MIN_LABOR_USD;
  const effectivePaintingLabor = hasPaintingLabor
    ? Math.max(paintingLaborRawSum, PAINTING_MIN_LABOR_USD)
    : 0;

  const laborBase = round2(nonPaintingLaborSum + effectivePaintingLabor);
  const subtotalClient = round2(laborBase + materialsReimbursement + upsellsTotal);

  const laborCommission = calcCommission(laborBase, safeRate);
  const laborNet = calcNet(laborBase, safeRate);

  const totalFixitGain = round2(laborCommission + upsellsFixitNet);
  const totalFixerNetAndBonus = round2(laborNet + upsellsFixerBonus);
  const totalFixerPayoutWithMaterials = round2(totalFixerNetAndBonus + materialsReimbursement);

  // Regla addon_only: si todas las líneas activas son addonOnly (ej. ELE-002 solo), bloquear
  const isAddonOnlyBlocked =
    activeLines.length > 0 && activeLines.every((l) => Boolean(l.addonOnly));

  // Regla de piso mínimo de comisión en cotización/orden individual
  const isBelowMinCommission =
    activeLines.length > 0 &&
    !isAddonOnlyBlocked &&
    totalFixitGain < safeMinCommission;

  let validationError: string | null = null;
  if (isAddonOnlyBlocked) {
    validationError = 'Agrega un servicio principal';
  } else if (isBelowMinCommission) {
    validationError = `Comisión mínima requerida no alcanzada ($${totalFixitGain.toFixed(2)} < $${safeMinCommission.toFixed(2)}). Agrega un servicio principal o incrementa el alcance.`;
  }

  return {
    activeLinesCount: activeLines.length,
    laborBase,
    paintingMinApplied,
    materialsReimbursement,
    upsellsTotal,
    upsellsWholesaleCost,
    upsellsFixerBonus,
    upsellsFixitNet,
    subtotalClient,
    laborCommission,
    laborNet,
    totalFixitGain,
    totalFixerNetAndBonus,
    totalFixerPayoutWithMaterials,
    isAddonOnlyBlocked,
    isBelowMinCommission,
    validationError,
  };
}
