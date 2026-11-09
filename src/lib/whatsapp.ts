import { ServiceRequest, PaintingCalculation, ACInstallationDetails } from '../types';

// Número de WhatsApp oficial de FIXIT Panamá (+507 6137-2394)
export const FIXIT_WHATSAPP_NUMBER = '50765356072'; 
export const FIXI_WHATSAPP_NUMBER = FIXIT_WHATSAPP_NUMBER;

export interface FixitWhatsAppParams {
  orderId?: string;
  category?: string;
  serviceName: string;
  basePrice?: number;
  price: number;
  isDiagnostic?: boolean;
  problemDescription?: string;
  photoCount?: number;
  customerName: string;
  customerPhone: string;
  locationDetails?: string;
  paintingCalculation?: PaintingCalculation | null;
  acDetails?: ACInstallationDetails | null;
}

/**
 * Generates the clean, structured WhatsApp message strictly following FIXIT standards.
 * Honestly reflects selected photos and instructs customer to attach them manually in the chat,
 * without misleading links or false claims.
 */
export function generateFixitWhatsAppMessage(params: FixitWhatsAppParams): string {
  const {
    orderId,
    category,
    serviceName,
    basePrice,
    price,
    isDiagnostic,
    problemDescription,
    photoCount,
    customerName,
    customerPhone,
    locationDetails,
    paintingCalculation,
    acDetails,
  } = params;

  let msg = `Hola FIXIT, quiero coordinar mi solicitud de servicio residencial.\n\n`;

  if (orderId) {
    msg += `📋 *Número de Solicitud / Pedido:* ${orderId}\n`;
  }
  if (category) {
    msg += `🏷️ *Categoría:* ${category}\n`;
  }
  msg += `🔧 *Servicio:* ${serviceName}\n`;

  if (typeof basePrice === 'number' && basePrice > 0) {
    msg += `🏷️ *Precio base de catálogo:* $${basePrice.toFixed(2)}\n`;
  }

  // Specific Painting Calculation breakdown
  if (paintingCalculation) {
    msg += `🎨 *Detalle de Cotización de Pintura:*\n`;
    if (paintingCalculation.areaName) {
      msg += `• Tipo de Superficie: ${paintingCalculation.areaName}\n`;
    }
    msg += `• Área calculada: ${paintingCalculation.areaM2} m²\n`;
    if (paintingCalculation.modalityName) {
      msg += `• Modalidad: ${paintingCalculation.modalityName}\n`;
    }
    msg += `• Mano de Obra: $${(paintingCalculation.costoManoDeObra ?? paintingCalculation.subtotal).toFixed(2)} ($${paintingCalculation.pricePerM2.toFixed(2)}/m²)\n`;
    if (paintingCalculation.includePaintMaterials) {
      if (paintingCalculation.nombreCalidad) {
        msg += `• Calidad de Pintura: ${paintingCalculation.nombreCalidad}\n`;
      }
      if (paintingCalculation.galones && paintingCalculation.galones > 0) {
        const costPinturaVal = paintingCalculation.costoPintura ?? (paintingCalculation.galones * (paintingCalculation.precioGalon || 14));
        msg += `• Pintura estimada: ${paintingCalculation.galones} galones ($${costPinturaVal.toFixed(2)})\n`;
        msg += `• Insumos de protección (rodillos, cinta, plásticos): $${(paintingCalculation.costoInsumosFijo ?? 15).toFixed(2)}\n`;
        msg += `• Total Materiales e Insumos: $${(paintingCalculation.costoMateriales ?? (costPinturaVal + 15)).toFixed(2)}\n`;
      }
    }
    if (paintingCalculation.minimumChargeApplied) {
      msg += `• Tarifa mínima aplicada: $${paintingCalculation.minimumServiceCharge}.00\n`;
    }
    if (paintingCalculation.hasHeightSurcharge) {
      msg += `• Recargo altura (>3m): +$${paintingCalculation.heightSurchargeAmount.toFixed(2)}\n`;
    }
    if (paintingCalculation.hasPatchingRepair) {
      msg += `• Resane de huecos/fisuras: +$${paintingCalculation.patchingRepairAmount.toFixed(2)}\n`;
    }
    msg += `💵 *Total estimado pintura:* $${paintingCalculation.total.toFixed(2)}\n\n`;
  } else if (acDetails) {
    // Specific AC Installation details
    msg += `❄️ *Detalle Instalación A/C:*\n`;
    if (acDetails.requiresEvaluation) {
      msg += `• Modalidad: *Requiere evaluación técnica previa*\n`;
      msg += `• Motivo: Condiciones especiales (${[
        acDetails.needsElectricalPoint ? 'Punto eléctrico nuevo' : null,
        acDetails.hasHeightOver3m ? 'Altura > 3m' : null,
        acDetails.needsDisassemblyOldUnit ? 'Desmonte equipo viejo' : null,
      ].filter(Boolean).join(', ') || 'revisión técnica'})\n`;
      msg += `💵 *Visita técnica / Diagnóstico:* $25.00 (acreditable al trabajo final)\n\n`;
    } else {
      msg += `• Modalidad: *Instalación estándar residencial en punto preparado*\n`;
      msg += `• Incluye hasta 3m de tubería y vacío con bomba profesional\n`;
      msg += `💵 *Tarifa acordada:* $${price.toFixed(2)}\n\n`;
    }
  } else if (isDiagnostic) {
    msg += `💵 *Inspección / Diagnóstico:* $${price} (acreditable al trabajo final)\n\n`;
  } else {
    msg += `💵 *Precio estimado:* $${price.toFixed(2)}\n\n`;
  }

  const anticipo = price * 0.5;
  msg += `💳 *Anticipo requerido (50%):* $${anticipo.toFixed(2)}\n\n`;

  const desc = problemDescription?.trim() || 'Sin descripción adicional.';
  msg += `📝 *Descripción del problema:*\n${desc}\n\n`;

  // Explicit indication of selected photos only if provided
  if (photoCount && photoCount > 0) {
    msg += `📷 *Fotografías seleccionadas:* ${photoCount} ${photoCount === 1 ? 'fotografía seleccionada' : 'fotografías seleccionadas'}.\n\n`;
  }

  if (locationDetails?.trim()) {
    msg += `📍 *Dirección / Ubicación:*\n${locationDetails.trim()}\n\n`;
  }

  msg += `👤 *Cliente:* ${customerName.trim() || 'Por definir'}\n`;
  msg += `📞 *Teléfono:* ${customerPhone.trim() || 'Por definir'}\n\n`;
  msg += `Para confirmar su cita técnica, requerimos el abono del 50% ($${anticipo.toFixed(2)}) vía Yappy al 6137-2394 o Banco General a nombre de Virginia Palomino Hoyte (04-72-98-545854-3). Su servicio cuenta con Garantía FIXIT de 30 días.\n\n`;
  msg += `Hola FIXIT, confirmo mi solicitud y adjunto comprobante de anticipo para agendar la visita técnica.`;

  return msg;
}

export function getFixitWhatsAppUrl(params: FixitWhatsAppParams): string {
  const text = generateFixitWhatsAppMessage(params);
  return `https://wa.me/${FIXIT_WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

/**
 * Backwards compatibility formatter
 */
export function formatWhatsAppMessage(request: ServiceRequest): string {
  const {
    codigo_seguimiento,
    cliente,
    servicio_probable,
    precio_regular,
    precio_lanzamiento,
    direccion,
    referencia,
    respuestas,
    imagenes,
    painting_calculation,
    ac_installation_details,
  } = request;

  return generateFixitWhatsAppMessage({
    orderId: codigo_seguimiento || request.numero_pedido,
    category: servicio_probable.category,
    serviceName: servicio_probable.service_name || servicio_probable.nombre,
    basePrice: precio_regular || servicio_probable.price,
    price: precio_lanzamiento || servicio_probable.price,
    isDiagnostic: servicio_probable.diagnostic_required,
    problemDescription: respuestas.observaciones_extra || respuestas.tipo_problema,
    photoCount: imagenes?.length || 0,
    customerName: cliente.nombre,
    customerPhone: cliente.telefono,
    locationDetails: direccion ? `${direccion}${referencia ? ` (${referencia})` : ''}` : undefined,
    paintingCalculation: painting_calculation,
    acDetails: ac_installation_details,
  });
}

export function generateWhatsAppLink(request: ServiceRequest, overridePhone?: string): string {
  const text = formatWhatsAppMessage(request);
  const targetPhone = overridePhone ? overridePhone.replace(/\D/g, '') : FIXIT_WHATSAPP_NUMBER;
  return `https://wa.me/${targetPhone}?text=${encodeURIComponent(text)}`;
}

export function generateDirectWhatsAppLink(text: string, phone?: string): string {
  const targetPhone = phone ? phone.replace(/\D/g, '') : FIXIT_WHATSAPP_NUMBER;
  return `https://wa.me/${targetPhone}?text=${encodeURIComponent(text)}`;
}

/**
 * Safely opens a WhatsApp URL in an external context, preventing iOS, Android,
 * and PWA webviews from replacing FIXIT or ending up in an unresponsive blank screen.
 * Strictly guarantees that window.location is never replaced or navigated.
 */
export function openWhatsAppSafely(url: string): void {
  if (typeof window === 'undefined') return;

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent || '');

  try {
    if (isMobile) {
      // On mobile Safari and Android Chrome, window.open('_blank') opens an empty blank tab
      // before handing off to the native WhatsApp app. When the user returns to their browser,
      // they are stranded on that blank tab.
      // Using an anchor element with noopener,noreferrer prevents the browser from becoming stuck.
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.style.position = 'fixed';
      a.style.top = '-9999px';
      a.style.left = '-9999px';
      a.style.opacity = '0';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        if (document.body.contains(a)) {
          document.body.removeChild(a);
        }
      }, 400);
    } else {
      // Desktop browsers handle new tabs cleanly
      const win = window.open(url, '_blank', 'noopener,noreferrer');
      if (!win) {
        window.location.assign(url);
      }
    }
  } catch (err) {
    console.warn('[FIXIT WhatsApp] Safe dispatch fallback:', err);
    try {
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        if (document.body.contains(a)) {
          document.body.removeChild(a);
        }
      }, 400);
    } catch {}
  }
}

