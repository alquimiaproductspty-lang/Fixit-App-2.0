import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Service, ServiceRequest, PaintingCalculation, ACInstallationDetails } from '../types';
import { getFixitWhatsAppUrl, FixitWhatsAppParams, openWhatsAppSafely } from '../lib/whatsapp';
import { uploadPhotosToServer, registerOrderOnServer } from '../lib/api';
import {
  ArrowLeft,
  MessageCircle,
  MapPin,
  CheckCircle2,
  AlertCircle,
  User,
  Phone,
  HelpCircle,
  ExternalLink,
  Check,
  RotateCcw,
  Paintbrush,
  Wind,
  Paperclip,
  Info,
  X,
} from 'lucide-react';

interface LocationSuggestion {
  readable: string;
  mapsUrl: string;
  full: string;
}

/**
 * Reverse geocode GPS coordinates to obtain a friendly street or neighborhood in Panama
 */
async function reverseGeocodeCoords(lat: number, lon: number): Promise<string> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept-Language': 'es',
      },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      const road = addr.road || addr.pedestrian || addr.street;
      const neighbourhood = addr.neighbourhood || addr.suburb || addr.quarter || addr.city_district;
      const city = addr.city || addr.town || addr.municipality || 'Ciudad de Panamá';

      const parts = [road, neighbourhood, city].filter(Boolean);
      if (parts.length > 0) {
        return parts.join(', ');
      }
      if (data.display_name) {
        return data.display_name.split(',').slice(0, 3).join(',').trim();
      }
    }
  } catch (err) {
    console.warn('[FIXIT Geolocation] Fallback to coordinates:', err);
  }

  return `Ubicación GPS (${lat.toFixed(4)}, ${lon.toFixed(4)})`;
}

interface SummaryWhatsAppStepProps {
  service: Service;
  description: string;
  photos: string[];
  customerName: string;
  onChangeCustomerName: (name: string) => void;
  customerPhone: string;
  onChangeCustomerPhone: (phone: string) => void;
  customerAddress: string;
  onChangeCustomerAddress: (address: string) => void;
  paintingCalculation?: PaintingCalculation | null;
  acDetails?: ACInstallationDetails | null;
  adjustedPrice?: number;
  onBack: () => void;
  onReset?: () => void;
}

export const SummaryWhatsAppStep: React.FC<SummaryWhatsAppStepProps> = ({
  service,
  description,
  photos,
  customerName,
  onChangeCustomerName,
  customerPhone,
  onChangeCustomerPhone,
  customerAddress,
  onChangeCustomerAddress,
  paintingCalculation,
  acDetails,
  adjustedPrice,
  onBack,
  onReset,
}) => {
  const [isLocating, setIsLocating] = useState(false);
  const [locationSuccess, setLocationSuccess] = useState(false);
  const [suggestedAddress, setSuggestedAddress] = useState<LocationSuggestion | null>(null);
  const [dismissedSuggestion, setDismissedSuggestion] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatusText, setSubmitStatusText] = useState('Preparando solicitud...');
  const [uploadedPhotoUrls, setUploadedPhotoUrls] = useState<string[]>([]);
  const [confirmedOrder, setConfirmedOrder] = useState<ServiceRequest | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPhotoInstructions, setShowPhotoInstructions] = useState(false);
  const hasAutoLocatedRef = useRef(false);

  // Compute final effective price
  const effectivePrice = (() => {
    if (paintingCalculation) {
      return paintingCalculation.total;
    }
    if (acDetails) {
      return acDetails.requiresEvaluation ? 25 : 90;
    }
    if (typeof adjustedPrice === 'number' && adjustedPrice > 0) {
      return adjustedPrice;
    }
    return service.diagnostic_required ? service.diagnostic_price : service.price;
  })();

  const isEvaluationMode = Boolean(
    service.diagnostic_required || acDetails?.requiresEvaluation
  );

  // Geolocation & Google Maps Integration
  const detectLocation = useCallback((isManual: boolean = false) => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      if (isManual) {
        alert('La geolocalización no está disponible en este navegador o dispositivo.');
      }
      return;
    }

    setIsLocating(true);
    setLocationSuccess(false);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const mapsUrl = `https://www.google.com/maps?q=${latitude.toFixed(5)},${longitude.toFixed(5)}`;

        // Reverse geocode coordinates to human-readable street or area
        const readable = await reverseGeocodeCoords(latitude, longitude);
        const full = `${readable} (GPS: ${mapsUrl})`;

        setSuggestedAddress({ readable, mapsUrl, full });
        setIsLocating(false);
        setLocationSuccess(true);
        setDismissedSuggestion(false);

        // If triggered manually and address input is currently empty, fill directly
        if (isManual && !customerAddress.trim()) {
          onChangeCustomerAddress(full);
        }
      },
      (error) => {
        console.warn('[FIXIT Geolocation] Error al obtener ubicación:', error);
        setIsLocating(false);
        if (isManual) {
          if (error.code === error.PERMISSION_DENIED) {
            alert('Permiso de ubicación denegado. Por favor escribe tu dirección manualmente.');
          } else {
            alert('No se pudo determinar tu ubicación exacta. Por favor escribe tu dirección manualmente.');
          }
        }
      },
      { enableHighAccuracy: true, timeout: 9000, maximumAge: 60000 }
    );
  }, [customerAddress, onChangeCustomerAddress]);

  // Automatically request current location on mount to suggest filling address
  useEffect(() => {
    if (hasAutoLocatedRef.current) return;
    hasAutoLocatedRef.current = true;
    detectLocation(false);
  }, [detectLocation]);

  // Upload photos to durable server storage and register order
  const prepareAndSendWhatsApp = async () => {
    if (!customerName.trim()) {
      setErrorMessage('Por favor ingresa tu nombre completo.');
      return;
    }
    if (!customerPhone.trim() || customerPhone.replace(/\D/g, '').length < 7) {
      setErrorMessage('Por favor ingresa un número de teléfono válido.');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);
    setSubmitStatusText('Guardando fotografías...');

    let finalPhotoUrls: string[] = uploadedPhotoUrls;

    // 1. Upload photos to durable backend store if not yet uploaded
    if (photos.length > 0 && finalPhotoUrls.length === 0) {
      try {
        finalPhotoUrls = await uploadPhotosToServer(photos);
        setUploadedPhotoUrls(finalPhotoUrls);
      } catch (err) {
        console.warn('Continuando sin subida previa de fotos:', err);
      }
    }

    // 2. Register real order in the backend database
    setSubmitStatusText('Registrando pedido en sistema FIXIT...');
    
    let createdOrder: ServiceRequest | null = null;
    try {
      createdOrder = await registerOrderOnServer({
        cliente: {
          nombre: customerName.trim(),
          telefono: customerPhone.trim(),
          acepta_terminos_fotos: true,
        },
        servicio_probable: service,
        direccion: customerAddress.trim() || 'Ciudad de Panamá',
        referencia: '',
        tipo_propiedad: 'Apartamento',
        horario_preferido: 'Hoy',
        precio_regular: service.price,
        descuento: 0,
        precio_lanzamiento: effectivePrice,
        costo_inspeccion: isEvaluationMode ? 25 : 0,
        cotizacion: effectivePrice,
        total_facturado: effectivePrice,
        estado: 'Solicitud recibida',
        imagenes: finalPhotoUrls,
        painting_calculation: paintingCalculation || undefined,
        ac_installation_details: acDetails || undefined,
        respuestas: {
          observaciones_extra: description,
          tipo_problema: description,
        },
      });
      setConfirmedOrder(createdOrder);
    } catch (err) {
      console.warn('Error al persistir orden en servidor:', err);
    }

    const orderTrackingId = createdOrder?.numero_pedido || createdOrder?.codigo_seguimiento;

    // 3. Prepare parameters for WhatsApp
    const locationParam = customerAddress.trim() || undefined;

    const params: FixitWhatsAppParams = {
      orderId: orderTrackingId,
      category: service.category,
      serviceName: service.service_name,
      basePrice: service.price,
      price: effectivePrice,
      isDiagnostic: isEvaluationMode,
      problemDescription: description,
      photoCount: photos.length,
      customerName,
      customerPhone,
      locationDetails: locationParam,
      paintingCalculation,
      acDetails,
    };

    const waUrl = getFixitWhatsAppUrl(params);

    setIsSubmitting(false);

    // Open WhatsApp safely in an external context
    openWhatsAppSafely(waUrl);
  };


  // If order was confirmed and sent to WhatsApp, display confirmation screen
  if (confirmedOrder) {
    const orderCode = confirmedOrder.numero_pedido || confirmedOrder.codigo_seguimiento;
    const waUrl = getFixitWhatsAppUrl({
      orderId: orderCode,
      category: service.category,
      serviceName: service.service_name,
      basePrice: service.price,
      price: effectivePrice,
      isDiagnostic: isEvaluationMode,
      problemDescription: description,
      photoCount: photos.length,
      customerName,
      customerPhone,
      locationDetails: customerAddress,
      paintingCalculation,
      acDetails,
    });

    return (
      <div className="w-full max-w-xl mx-auto px-4 py-6 sm:py-8 space-y-6">
        <div className="bg-[#FFFEFA] rounded-3xl p-6 sm:p-8 border border-[#DED4C5] shadow-sm text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-[#EBF7EE] text-[#25D366] flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <span className="text-xs font-bold text-[#0988F5] uppercase tracking-wider bg-[#0988F5]/10 px-3 py-1 rounded-full">
              Pedido Registrado con Éxito
            </span>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#082D60] mt-3">
              {orderCode}
            </h2>
            <p className="text-sm text-[#756A5D] mt-1">
              Tu solicitud ha sido guardada en la base de datos de FIXIT.
            </p>
          </div>

          <div className="bg-[#F6F4EF] rounded-2xl p-4 text-left space-y-2 text-xs">
            <div className="flex justify-between border-b border-[#DED4C5]/60 pb-2">
              <span className="text-[#756A5D]">Servicio:</span>
              <span className="font-semibold text-[#082D60] text-right">{service.service_name}</span>
            </div>
            <div className="flex justify-between border-b border-[#DED4C5]/60 pb-2">
              <span className="text-[#756A5D]">Cliente:</span>
              <span className="font-semibold text-[#082D60]">{customerName}</span>
            </div>
            <div className="flex justify-between border-b border-[#DED4C5]/60 pb-2">
              <span className="text-[#756A5D]">Teléfono:</span>
              <span className="font-semibold text-[#082D60]">{customerPhone}</span>
            </div>
            <div className="flex justify-between border-b border-[#DED4C5]/60 pb-2">
              <span className="text-[#756A5D]">Tarifa estimada:</span>
              <span className="font-bold text-[#0988F5]">
                ${effectivePrice.toFixed(2)} {isEvaluationMode ? '(Evaluación técnica acreditable)' : '(Total estimado)'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#756A5D]">Fotos seleccionadas:</span>
              <span className="font-semibold text-[#082D60]">
                {photos.length > 0 ? `${photos.length} fotografía${photos.length === 1 ? '' : 's'}` : 'Ninguna'}
              </span>
            </div>
          </div>

          {photos.length > 0 && (
            <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-2xl p-3.5 text-left text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-[#92400E]">
                <Paperclip className="w-4 h-4 text-[#D97706]" />
                <span>Recuerda adjuntar las fotos en el chat</span>
              </div>
              <p className="text-[#B45309] leading-relaxed">
                Al abrirse WhatsApp, tu mensaje estará listo. Recuerda pulsar el icono de clip (📎 o 📷) para adjuntar tus fotos directamente en la conversación.
              </p>
              <button
                type="button"
                onClick={() => setShowPhotoInstructions(true)}
                className="text-[11px] font-bold text-[#0B72D9] hover:underline flex items-center gap-1 cursor-pointer pt-0.5"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                Ver instrucciones para adjuntar fotos
              </button>
            </div>
          )}

          <div className="pt-2 space-y-3">
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3.5 px-6 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-sm shadow-sm flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-5 h-5 fill-white stroke-none" />
              <span>Abrir WhatsApp con el pedido</span>
            </a>

            {onReset && (
              <button
                onClick={onReset}
                className="w-full py-2.5 px-4 rounded-xl border border-[#DED4C5] text-xs font-semibold text-[#082D60] hover:bg-[#F6F4EF] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Hacer una nueva solicitud</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-4 sm:py-6 space-y-5">
      {/* Back Button */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-[#756A5D] hover:text-[#1F2421] p-2 rounded-xl hover:bg-[#DED4C5]/30 transition-colors active:scale-95 cursor-pointer"
          id="btn-back-to-details"
        >
          <ArrowLeft className="w-4 h-4 stroke-[2]" />
          <span>Volver a fotos y descripción</span>
        </button>
        <span className="text-[11px] font-semibold text-[#0988F5] uppercase tracking-wider bg-[#0988F5]/10 px-2.5 py-1 rounded-full">
          Paso final
        </span>
      </div>

      {/* Title */}
      <div>
        <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#082D60]">
          Resumen de solicitud
        </h2>
        <p className="text-xs sm:text-sm text-[#756A5D] mt-0.5">
          Verifica los datos antes de registrar tu pedido y coordinar por WhatsApp:
        </p>
      </div>

      {/* Error alert */}
      {errorMessage && (
        <div className="bg-[#FEE2E2] border border-[#FCA5A5] text-[#991B1B] text-xs rounded-xl p-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* RESUMEN DE SOLICITUD CARD */}
      <div className="bg-[#FFFEFA] rounded-3xl p-5 sm:p-6 border border-[#DED4C5] shadow-xs space-y-4">
        {/* Service row */}
        <div className="pb-3 border-b border-[#DED4C5]/60">
          <span className="text-[11px] font-bold text-[#756A5D] uppercase tracking-wider block mb-1">
            Servicio
          </span>
          <h3 className="font-serif font-bold text-base sm:text-lg text-[#082D60]">
            {service.service_name}
          </h3>
          <span className="text-xs text-[#0988F5] font-medium">
            Categoría: {service.category}
          </span>
        </div>

        {/* Painting Calculation Details if available */}
        {paintingCalculation && (
          <div className="p-3.5 bg-[#B98A43]/10 border border-[#B98A43]/20 rounded-2xl text-xs space-y-1.5">
            <div className="flex items-center gap-2 text-[#8C601E] font-bold">
              <Paintbrush className="w-4 h-4" />
              <span>Desglose de pintura residencial</span>
            </div>
            <div className="grid grid-cols-2 gap-1 text-[#756A5D] pt-1">
              <div>Área: <strong className="text-[#1F2421]">{paintingCalculation.areaM2} m²</strong></div>
              <div>Tarifa: <strong className="text-[#1F2421]">${paintingCalculation.pricePerM2.toFixed(2)}/m²</strong></div>
            </div>
            {paintingCalculation.minimumChargeApplied && (
              <p className="text-[11px] text-[#8C601E]">
                • Tarifa mínima de servicio aplicada ($75.00)
              </p>
            )}
            {paintingCalculation.hasHeightSurcharge && (
              <p className="text-[11px] text-[#8C601E]">
                • Recargo por altura (&gt;3m): +${paintingCalculation.heightSurchargeAmount.toFixed(2)}
              </p>
            )}
            {paintingCalculation.hasPatchingRepair && (
              <p className="text-[11px] text-[#8C601E]">
                • Resane de huecos/fisuras: +${paintingCalculation.patchingRepairAmount.toFixed(2)}
              </p>
            )}
          </div>
        )}

        {/* AC Installation details if available */}
        {acDetails && (
          <div className="p-3.5 bg-[#0B72D9]/10 border border-[#0B72D9]/20 rounded-2xl text-xs space-y-1.5">
            <div className="flex items-center gap-2 text-[#0B72D9] font-bold">
              <Wind className="w-4 h-4" />
              <span>Condición de Instalación A/C</span>
            </div>
            {acDetails.requiresEvaluation ? (
              <p className="text-[#756A5D] text-[11px]">
                <strong>Requiere evaluación técnica previa ($25)</strong>: El técnico acudirá a revisar la ruta de tubería, punto eléctrico o altura antes de la instalación final. Los $25 se descuentan si apruebas el trabajo.
              </p>
            ) : (
              <p className="text-[#756A5D] text-[11px]">
                <strong>Instalación estándar confirmada ($90)</strong>: Punto preparado, hasta 3 metros de tubería y vacío con bomba profesional.
              </p>
            )}
          </div>
        )}

        {/* Price row */}
        <div className="pb-3 border-b border-[#DED4C5]/60 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-[#756A5D] uppercase tracking-wider block">
              {isEvaluationMode ? 'Evaluación / Diagnóstico FIXIT' : 'Precio acordado FIXIT'}
            </span>
            <span className="text-xs text-[#756A5D]">
              {isEvaluationMode
                ? 'Acreditable al trabajo si realizas el servicio'
                : 'Mano de obra especializada sin sorpresas'}
            </span>
          </div>
          <div className="text-right">
            <span className="font-bold text-lg sm:text-xl text-[#082D60]">
              ${effectivePrice.toFixed(2)}
            </span>
            <span className="text-xs text-[#756A5D] ml-1">USD</span>
          </div>
        </div>

        {/* Problem description */}
        <div className="pb-3 border-b border-[#DED4C5]/60">
          <span className="text-[11px] font-bold text-[#756A5D] uppercase tracking-wider block mb-1">
            Problema o detalle reportado
          </span>
          <p className="text-xs text-[#1F2421] bg-[#F6F4EF] p-3 rounded-xl">
            {description || 'Sin descripción adicional.'}
          </p>
        </div>

        {/* Photos row with clear manual attachment warning */}
        <div className="pb-3 border-b border-[#DED4C5]/60 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#756A5D] uppercase tracking-wider">
              Fotografías para el técnico ({photos.length})
            </span>
            {photos.length > 0 && (
              <span className="text-[11px] font-bold text-[#D97706] bg-[#FEF3C7] px-2 py-0.5 rounded-full">
                Adjuntar en WhatsApp
              </span>
            )}
          </div>

          {photos.length > 0 ? (
            <div className="space-y-2.5">
              <div className="flex gap-2 overflow-x-auto py-1">
                {photos.map((src, i) => (
                  <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border border-[#DED4C5] shrink-0">
                    <img src={src} alt={`Adjunto ${i + 1}`} className="w-full h-full object-cover" />
                    <span className="absolute bottom-0.5 right-0.5 bg-black/60 text-[9px] font-bold text-white px-1 rounded">
                      #{i + 1}
                    </span>
                  </div>
                ))}
              </div>

              {/* Explicit user requirement alert */}
              <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-xl p-3 text-xs text-[#92400E] space-y-2">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong>Tu mensaje está preparado.</strong> Por limitaciones de WhatsApp, <strong>debes adjuntar las fotografías manualmente en el chat</strong>.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPhotoInstructions(true)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FDE68A]/70 hover:bg-[#FDE68A] text-[#92400E] font-bold text-[11px] transition-colors cursor-pointer"
                  id="btn-view-photo-instructions"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Ver instrucciones para adjuntar fotos</span>
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-[#756A5D] italic">
              No seleccionaste fotografías. Podrás enviarlas directamente por WhatsApp si lo deseas.
            </p>
          )}
        </div>

        {/* Contact fields */}
        <div className="space-y-3.5 pt-1">
          <div>
            <label className="block text-xs font-semibold text-[#756A5D] mb-1">
              Nombre completo <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-[#756A5D] absolute left-3 top-3" />
              <input
                type="text"
                value={customerName}
                onChange={(e) => onChangeCustomerName(e.target.value)}
                placeholder="Ej. Carlos Chen"
                className="w-full pl-9 pr-3.5 py-2.5 bg-[#F6F4EF]/50 hover:bg-[#F6F4EF] focus:bg-[#FFFEFA] border border-[#DED4C5] focus:border-[#0988F5] rounded-xl text-sm text-[#1F2421] placeholder-[#756A5D]/60 focus:outline-none transition-all"
                id="input-customer-name"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#756A5D] mb-1">
              Número de WhatsApp <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-[#756A5D] absolute left-3 top-3" />
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => onChangeCustomerPhone(e.target.value)}
                placeholder="Ej. +507 6123-4567"
                className="w-full pl-9 pr-3.5 py-2.5 bg-[#F6F4EF]/50 hover:bg-[#F6F4EF] focus:bg-[#FFFEFA] border border-[#DED4C5] focus:border-[#0988F5] rounded-xl text-sm text-[#1F2421] placeholder-[#756A5D]/60 focus:outline-none transition-all"
                id="input-customer-phone"
              />
            </div>
          </div>

          {/* Location & Google Maps */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-[#756A5D]">
                Dirección / Ubicación en Ciudad de Panamá
              </label>
              <button
                type="button"
                onClick={() => detectLocation(true)}
                disabled={isLocating}
                className="text-[11px] font-semibold text-[#0988F5] hover:text-[#082D60] flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-60"
                id="btn-detect-gps-manual"
                title="Detectar tu ubicación actual con el GPS del dispositivo"
              >
                <MapPin className="w-3 h-3" />
                <span>{isLocating ? 'Detectando...' : 'Detectar con GPS'}</span>
              </button>
            </div>
            <textarea
              value={customerAddress}
              onChange={(e) => onChangeCustomerAddress(e.target.value)}
              placeholder="Ej. San Francisco, Calle 74, PH Vista Marina, Apto 12B"
              rows={2}
              className="w-full px-3.5 py-2 bg-[#F6F4EF]/50 hover:bg-[#F6F4EF] focus:bg-[#FFFEFA] border border-[#DED4C5] focus:border-[#0988F5] rounded-xl text-xs text-[#1F2421] placeholder-[#756A5D]/60 focus:outline-none transition-all resize-none"
              id="input-customer-address"
            />

            {/* Geolocation in progress indicator */}
            {isLocating && (
              <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-[#0988F5] font-medium">
                <span className="w-2 h-2 rounded-full bg-[#0988F5] animate-ping shrink-0" />
                <span>Obteniendo tu ubicación actual para sugerir dirección...</span>
              </div>
            )}

            {/* Suggested address banner / action card */}
            {suggestedAddress && !dismissedSuggestion && !customerAddress.includes(suggestedAddress.readable) && (
              <div className="mt-2.5 bg-[#EBF5FF] border border-[#B9E0FE] rounded-xl p-3 text-xs space-y-2.5 transition-all shadow-2xs">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-lg bg-[#0988F5]/10 text-[#0988F5] flex items-center justify-center shrink-0 mt-0.5">
                      <MapPin className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold text-[#082D60] uppercase tracking-wider block">
                        Ubicación actual detectada
                      </span>
                      <p className="text-xs text-[#1F2421] font-semibold leading-snug mt-0.5">
                        {suggestedAddress.readable}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDismissedSuggestion(true)}
                    className="text-[#756A5D] hover:text-[#1F2421] p-1 rounded-md text-xs cursor-pointer shrink-0"
                    title="Descartar sugerencia"
                    id="btn-dismiss-location-suggestion"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      const newAddress = customerAddress.trim()
                        ? `${customerAddress.trim()} • ${suggestedAddress.full}`
                        : suggestedAddress.full;
                      onChangeCustomerAddress(newAddress);
                      setLocationSuccess(true);
                      setDismissedSuggestion(true);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[#0988F5] hover:bg-[#085ab0] active:scale-95 text-white font-semibold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                    id="btn-apply-suggested-address"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{customerAddress.trim() ? 'Añadir a mi dirección' : 'Rellenar con esta ubicación'}</span>
                  </button>
                  <a
                    href={suggestedAddress.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1.5 rounded-lg text-[#0988F5] hover:bg-[#0988F5]/10 text-xs font-medium flex items-center gap-1 transition-colors no-underline"
                    id="link-view-detected-map"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Ver en Google Maps</span>
                  </a>
                </div>
              </div>
            )}

            {/* Success state */}
            {locationSuccess && !isLocating && (customerAddress.includes('GPS') || (suggestedAddress && customerAddress.includes(suggestedAddress.readable))) && (
              <p className="text-[11px] text-[#25D366] mt-1.5 flex items-center gap-1 font-medium">
                <Check className="w-3 h-3" />
                <span>Ubicación GPS vinculada a tu solicitud.</span>
              </p>
            )}
          </div>
        </div>

        {/* Trust reassurance banner */}
        <div className="bg-[#F6F4EF] rounded-2xl p-4 border border-[#DED4C5] space-y-2 text-xs text-[#756A5D]">
          <div className="flex items-center gap-2 text-[#082D60] font-bold">
            <MessageCircle className="w-4 h-4 text-[#25D366]" />
            <span>Confirmación directa por WhatsApp</span>
          </div>
          <p className="leading-relaxed">
            Al tocar el botón, tu pedido se guardará en nuestro sistema con un número único de seguimiento y se abrirá WhatsApp con los datos completos listos para coordinar la visita técnica.
          </p>
          {photos.length > 0 && (
            <p className="leading-relaxed text-[#B45309] font-medium bg-[#FFFBEB] p-2.5 rounded-xl border border-[#FDE68A]">
              📎 <strong>Para completar tu solicitud:</strong> Adjunta las fotografías manualmente en el chat de WhatsApp.
            </p>
          )}
        </div>
      </div>

      {/* MAIN WHATSAPP CTA ONLY */}
      <div className="space-y-2.5">
        <button
          onClick={prepareAndSendWhatsApp}
          disabled={isSubmitting}
          className="w-full py-4 px-6 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] active:scale-[0.99] text-white font-bold text-base shadow-sm hover:shadow transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60"
          id="btn-send-whatsapp-order"
        >
          <MessageCircle className="w-5 h-5 fill-white stroke-none" />
          <span>{isSubmitting ? submitStatusText : 'Continuar por WhatsApp'}</span>
        </button>
      </div>

      {/* MODAL DE INSTRUCCIONES PARA ADJUNTAR FOTOS */}
      {showPhotoInstructions && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFEFA] w-full max-w-md rounded-3xl p-6 border border-[#DED4C5] shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#DED4C5]/60 pb-3">
              <div className="flex items-center gap-2 text-[#082D60] font-bold">
                <Paperclip className="w-5 h-5 text-[#0B72D9]" />
                <h3 className="text-base font-serif">Cómo adjuntar fotos en WhatsApp</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPhotoInstructions(false)}
                className="p-1 rounded-full text-[#756A5D] hover:text-[#1F2421] hover:bg-[#F6F4EF] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-[#1F2421]">
              <div className="flex items-start gap-3 bg-[#F6F4EF] p-3 rounded-2xl">
                <span className="w-6 h-6 rounded-full bg-[#0B72D9] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  1
                </span>
                <div>
                  <strong className="block text-[#082D60] mb-0.5">Envía el texto generado</strong>
                  <p className="text-[#756A5D]">Al pulsar "Continuar por WhatsApp" se abrirá el chat con todos los datos y detalles del pedido. Presiona enviar.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-[#F6F4EF] p-3 rounded-2xl">
                <span className="w-6 h-6 rounded-full bg-[#0B72D9] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  2
                </span>
                <div>
                  <strong className="block text-[#082D60] mb-0.5">Toca el botón de adjuntar</strong>
                  <p className="text-[#756A5D]">En la barra inferior de WhatsApp, pulsa el clip 📎 o el icono de cámara 📷.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-[#F6F4EF] p-3 rounded-2xl">
                <span className="w-6 h-6 rounded-full bg-[#0B72D9] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  3
                </span>
                <div>
                  <strong className="block text-[#082D60] mb-0.5">Selecciona y envía tus fotos</strong>
                  <p className="text-[#756A5D]">Elige las fotografías desde tu galería y envíalas. El técnico FIXIT las revisará para preparar los materiales y herramientas requeridos.</p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowPhotoInstructions(false)}
              className="w-full py-3 rounded-xl bg-[#0B72D9] hover:bg-[#0962BC] text-white font-bold text-xs transition-colors cursor-pointer"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
