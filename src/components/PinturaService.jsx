import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Paintbrush, 
  Home, 
  Building2, 
  Check, 
  Sparkles, 
  Info, 
  Droplets, 
  ArrowRight, 
  ShieldCheck, 
  Plus, 
  Minus,
  ArrowLeft,
  CheckCircle2,
  FileText,
  PackageCheck
} from 'lucide-react';

// Constantes de precios de materiales e insumos
export const PRECIO_GALON_ESTANDAR = 14;
export const PRECIO_GALON_PREMIUM = 35;
export const COSTO_INSUMOS_FIJO = 15; // Insumos base fijos (rodillos, plásticos, cinta)
export const PRECIO_GALON = PRECIO_GALON_ESTANDAR; // Retrocompatibilidad

// Presets de metraje para agilizar la selección en móviles y escritorio
const PRESETS_M2 = [
  { label: 'Pared de acento', m2: 15, hint: '1 pared puntual' },
  { label: 'Recámara', m2: 35, hint: 'Habitación estándar' },
  { label: 'Sala / Comedor', m2: 70, hint: 'Área social común' },
  { label: 'Apartamento completo', m2: 120, hint: 'Paredes completas' },
];

/**
 * PinturaService - Cotizador interactivo paso a paso para servicio de pintura
 * Diseñado conforme a los estándares visuales de FIXIT Panamá.
 */
export const PinturaService = ({
  onSolicitarServicio,
  onBack,
  initialArea = 'interior',
  initialM2 = 0,
  initialModality = 'solo_mano_obra',
  initialCalidad = 'estandar',
  whatsAppPhone = '50765356072'
}) => {
  const { t } = useTranslation();

  // 1. Paso 1: Selección de Área ('interior' | 'exterior')
  const [areaType, setAreaType] = useState(initialArea);

  // 2. Paso 2: Metraje en m² (inicia en 0 o vacío para probar botón deshabilitado)
  const [m2Input, setM2Input] = useState(initialM2 > 0 ? String(initialM2) : '');

  // 3. Paso 3: Modalidad de Servicio ('solo_mano_obra' | 'mano_obra_materiales')
  const [modality, setModality] = useState(initialModality);

  // 4. Paso 4: Calidad de Pintura ('estandar' | 'premium') - solo aplica si modality === 'mano_obra_materiales'
  const [calidadPintura, setCalidadPintura] = useState(initialCalidad);

  // Parseo numérico seguro del metraje ingresado
  const m2 = useMemo(() => {
    const val = parseFloat(m2Input);
    return isNaN(val) || val < 0 ? 0 : val;
  }, [m2Input]);

  const isConMateriales = modality === 'mano_obra_materiales';

  // Precio base de mano de obra por m² según área y modalidad
  // Interior: $2.50 (Solo Mano de Obra) o $3.50 (Mano de Obra + Materiales)
  // Exterior: $3.50 (Solo Mano de Obra) o $4.50 (Mano de Obra + Materiales)
  const rateManoDeObra = useMemo(() => {
    if (areaType === 'interior') {
      return isConMateriales ? 3.50 : 2.50;
    } else {
      return isConMateriales ? 4.50 : 3.50;
    }
  }, [areaType, isConMateriales]);

  // Costo total de Mano de Obra
  const costoManoDeObra = useMemo(() => {
    if (m2 <= 0) return 0;
    return Math.round(m2 * rateManoDeObra * 100) / 100;
  }, [m2, rateManoDeObra]);

  // Precio unitario por galón según la calidad seleccionada
  const precioGalon = useMemo(() => {
    return calidadPintura === 'premium' ? PRECIO_GALON_PREMIUM : PRECIO_GALON_ESTANDAR;
  }, [calidadPintura]);

  // Fórmula matemática de Galones requeridos:
  // Galones a comprar = Math.ceil((m2 / 18) * 1.10) (solo si Opción B: Mano de Obra + Materiales)
  const galones = useMemo(() => {
    if (!isConMateriales || m2 <= 0) return 0;
    return Math.ceil((m2 / 18) * 1.10);
  }, [isConMateriales, m2]);

  // Costo de los galones de pintura
  const costoPintura = useMemo(() => {
    if (!isConMateriales || galones <= 0) return 0;
    return galones * precioGalon;
  }, [isConMateriales, galones, precioGalon]);

  // Costo fijo de insumos (rodillos, plásticos, cinta)
  const costoInsumosFijo = useMemo(() => {
    if (!isConMateriales || m2 <= 0) return 0;
    return COSTO_INSUMOS_FIJO;
  }, [isConMateriales, m2]);

  // Costo Total de Materiales = Costo Pintura + Insumos fijos ($15)
  const costoMateriales = useMemo(() => {
    if (!isConMateriales || m2 <= 0) return 0;
    return costoPintura + costoInsumosFijo;
  }, [isConMateriales, m2, costoPintura, costoInsumosFijo]);

  // Gran Total a Pagar
  const granTotal = useMemo(() => {
    return Math.round((costoManoDeObra + costoMateriales) * 100) / 100;
  }, [costoManoDeObra, costoMateriales]);

  // Handler de incremento / decremento rápido
  const handleAdjustM2 = (delta) => {
    const current = m2;
    const next = Math.max(0, current + delta);
    setM2Input(String(next));
  };

  // Manejo de la acción "Solicitar Servicio"
  const handleSubmit = () => {
    if (m2 <= 0) return;

    const nombreCalidadTexto = calidadPintura === 'premium' 
      ? `Pintura Premium ($${PRECIO_GALON_PREMIUM}/gal)` 
      : `Pintura Estándar ($${PRECIO_GALON_ESTANDAR}/gal)`;

    const payload = {
      areaType,
      areaName: areaType === 'interior' ? 'Pintura Interior' : 'Pintura Exterior',
      m2,
      modality,
      modalityName: isConMateriales ? 'Mano de Obra + Materiales' : 'Solo Mano de Obra',
      calidadPintura: isConMateriales ? calidadPintura : undefined,
      nombreCalidad: isConMateriales ? nombreCalidadTexto : undefined,
      precioGalon: isConMateriales ? precioGalon : 0,
      costoPintura: isConMateriales ? costoPintura : 0,
      costoInsumosFijo: isConMateriales ? costoInsumosFijo : 0,
      rateManoDeObra,
      costoManoDeObra,
      galones,
      costoMateriales,
      granTotal,
    };

    if (onSolicitarServicio) {
      onSolicitarServicio(payload);
    } else {
      // Fallback a enlace directo de WhatsApp con mensaje estructurado
      let text = `Hola FIXIT, deseo solicitar el servicio de Pintura con la siguiente cotización:\n\n` +
        `• Superficie: ${payload.areaName}\n` +
        `• Metraje: ${payload.m2} m²\n` +
        `• Modalidad: ${payload.modalityName}\n` +
        `• Mano de Obra: $${payload.costoManoDeObra.toFixed(2)} ($${payload.rateManoDeObra.toFixed(2)}/m²)\n`;

      if (isConMateriales) {
        text += `• Calidad de Pintura: ${payload.nombreCalidad}\n` +
          `• Galones estimados: ${payload.galones} galones ($${payload.costoPintura.toFixed(2)})\n` +
          `• Insumos de protección (rodillos, cinta, plásticos): $${payload.costoInsumosFijo.toFixed(2)}\n` +
          `• Total Materiales: $${payload.costoMateriales.toFixed(2)}\n`;
      }

      text += `💵 *Gran Total Estimado:* $${payload.granTotal.toFixed(2)}\n\n` +
        `¿Podrían confirmarme disponibilidad de pintores?`;

      const waUrl = `https://wa.me/${whatsAppPhone}?text=${encodeURIComponent(text)}`;
      window.open(waUrl, '_blank');
    }
  };

  // Manejo de volver a la página principal
  const handleRegresar = (e) => {
    if (e) e.preventDefault();
    if (typeof onBack === 'function') {
      onBack();
    } else {
      try {
        window.history.pushState({ route: { step: 'home' }, fixitIdx: 0 }, '', '/');
        window.dispatchEvent(new PopStateEvent('popstate'));
      } catch {
        window.location.href = '/';
      }
    }
  };

  return (
    <div className="w-full max-w-2xl sm:max-w-3xl mx-auto px-4 py-5 sm:py-8 space-y-7 font-sans text-[#1F2421]">
      {/* Encabezado / Botón Volver y Badge de Garantía */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handleRegresar}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-[#DED4C5] bg-[#FFFEFA] hover:bg-[#F6F4EF] text-xs font-semibold text-[#1F2421] transition-colors cursor-pointer shadow-2xs active:scale-95"
          id="btn-back-pintura"
          title="Volver a la página principal"
          aria-label="Regresar a la página principal"
        >
          <ArrowLeft className="w-4 h-4 text-[#756A5D]" />
          <span>Volver al inicio</span>
        </button>

        <div className="flex items-center gap-2 text-xs font-semibold text-[#082D60] bg-[#082D60]/5 border border-[#082D60]/15 px-3 py-1 rounded-full">
          <ShieldCheck className="w-3.5 h-3.5 text-[#53653D]" />
          <span>Garantía de Acabado 30 Días</span>
        </div>
      </div>

      {/* Banner Principal del Cotizador con Degradado Azul Oficial */}
      <div className="bg-gradient-to-r from-blue-950 to-blue-600 text-white rounded-2xl p-8 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="space-y-2 flex-1">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white/90 bg-white/15 px-3 py-1 rounded-full border border-white/20 backdrop-blur-sm">
              <Paintbrush className="w-3.5 h-3.5 text-white" />
              <span>Cotizador Interactivo en Tiempo Real</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold text-white tracking-tight leading-tight">
              {t('pinturaService.title', 'Cotizador de Pintura Residencial')}
            </h1>
            <p className="text-xs sm:text-sm text-white leading-relaxed max-w-xl">
              {t('pinturaService.subtitle', 'Calcula tu presupuesto estimado al instante en 4 simples pasos')}
            </p>
          </div>
          <div className="shrink-0">
            <a
              href="#input-metraje-m2"
              className="inline-flex items-center gap-2 px-5 py-3.5 bg-white text-blue-900 font-semibold hover:bg-gray-100 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer text-xs sm:text-sm"
              id="btn-cotizador-action"
            >
              <span>Abrir Cotizador</span>
              <ArrowRight className="w-4 h-4 text-blue-900" />
            </a>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* PASO 1: SELECCIÓN DE ÁREA                                      */}
      {/* ============================================================== */}
      <section className="space-y-3.5 bg-[#FFFEFA] p-5 sm:p-7 rounded-3xl border border-[#DED4C5] shadow-xs">
        <div className="flex items-center justify-between">
          <label className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#082D60] flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-full bg-[#082D60] text-white flex items-center justify-center text-xs font-bold">1</span>
            <span>{t('pinturaService.step1Title', '1. Selección de Área')}</span>
          </label>
          <span className="text-xs text-[#756A5D] font-medium">
            Tarifa base desde {areaType === 'interior' ? '$2.50/m²' : '$3.50/m²'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Opción Pintura Interior */}
          <button
            type="button"
            onClick={() => setAreaType('interior')}
            className={`p-4 sm:p-5 rounded-2xl text-left border-2 transition-all cursor-pointer flex flex-col justify-between space-y-3 shadow-2xs group ${
              areaType === 'interior'
                ? 'border-[#0B72D9] bg-[#0B72D9]/5 ring-2 ring-[#0B72D9]/20'
                : 'border-[#DED4C5] bg-white hover:border-[#0B72D9]/50 hover:bg-[#F6F4EF]/50'
            }`}
            id="btn-area-interior"
          >
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-white border border-[#DED4C5]/80 flex items-center justify-center text-[#082D60] group-hover:scale-105 transition-transform shadow-2xs">
                <Home className="w-5 h-5 text-[#082D60]" />
              </div>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center border transition-colors ${
                areaType === 'interior'
                  ? 'border-[#0B72D9] bg-[#0B72D9] text-white'
                  : 'border-[#DED4C5] bg-white'
              }`}>
                {areaType === 'interior' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
            </div>

            <div>
              <h3 className="font-serif font-bold text-base text-[#1F2421]">
                {t('pinturaService.interior', 'Pintura Interior')}
              </h3>
              <p className="text-xs text-[#756A5D] mt-1 leading-relaxed">
                {t('pinturaService.interiorDesc', 'Paredes de recámaras, salas, pasillos, estudios y áreas bajo techo protegidas de la intemperie.')}
              </p>
            </div>

            <div className="pt-2 border-t border-[#DED4C5]/50 flex items-center justify-between text-xs font-semibold">
              <span className="text-[#0B72D9]">
                ${isConMateriales ? '3.50' : '2.50'} / m²
              </span>
              <span className="text-[11px] text-[#756A5D] font-normal">
                {isConMateriales ? 'Mano de Obra + Mat.' : 'Solo mano de obra'}
              </span>
            </div>
          </button>

          {/* Opción Pintura Exterior */}
          <button
            type="button"
            onClick={() => setAreaType('exterior')}
            className={`p-4 sm:p-5 rounded-2xl text-left border-2 transition-all cursor-pointer flex flex-col justify-between space-y-3 shadow-2xs group ${
              areaType === 'exterior'
                ? 'border-[#0B72D9] bg-[#0B72D9]/5 ring-2 ring-[#0B72D9]/20'
                : 'border-[#DED4C5] bg-white hover:border-[#0B72D9]/50 hover:bg-[#F6F4EF]/50'
            }`}
            id="btn-area-exterior"
          >
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-white border border-[#DED4C5]/80 flex items-center justify-center text-[#082D60] group-hover:scale-105 transition-transform shadow-2xs">
                <Building2 className="w-5 h-5 text-[#082D60]" />
              </div>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center border transition-colors ${
                areaType === 'exterior'
                  ? 'border-[#0B72D9] bg-[#0B72D9] text-white'
                  : 'border-[#DED4C5] bg-white'
              }`}>
                {areaType === 'exterior' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
            </div>

            <div>
              <h3 className="font-serif font-bold text-base text-[#1F2421]">
                {t('pinturaService.exterior', 'Pintura Exterior')}
              </h3>
              <p className="text-xs text-[#756A5D] mt-1 leading-relaxed">
                {t('pinturaService.exteriorDesc', 'Fachadas, muros perimetrales, balcones y terrazas con exposición a sol directo y lluvias tropicales.')}
              </p>
            </div>

            <div className="pt-2 border-t border-[#DED4C5]/50 flex items-center justify-between text-xs font-semibold">
              <span className="text-[#0B72D9]">
                ${isConMateriales ? '4.50' : '3.50'} / m²
              </span>
              <span className="text-[11px] text-[#756A5D] font-normal">
                {isConMateriales ? 'Mano de Obra + Mat.' : 'Solo mano de obra'}
              </span>
            </div>
          </button>
        </div>
      </section>

      {/* ============================================================== */}
      {/* PASO 2: INPUT DE METRAJE (m²)                                  */}
      {/* ============================================================== */}
      <section className="space-y-4 bg-[#FFFEFA] p-5 sm:p-7 rounded-3xl border border-[#DED4C5] shadow-xs">
        <div className="flex items-center justify-between">
          <label 
            htmlFor="input-metraje-m2"
            className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#082D60] flex items-center gap-2.5"
          >
            <span className="w-6 h-6 rounded-full bg-[#082D60] text-white flex items-center justify-center text-xs font-bold">2</span>
            <span>{t('pinturaService.step2Title', '2. Área Total a Pintar (m²)')}</span>
          </label>
          <span className="text-xs text-[#756A5D] font-medium">
            Metros cuadrados
          </span>
        </div>

        {/* Input Numérico con Controles + y - */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleAdjustM2(-5)}
            disabled={m2 <= 0}
            className="w-12 h-12 rounded-2xl border border-[#DED4C5] bg-[#F6F4EF] hover:bg-[#DED4C5]/40 text-[#1F2421] flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-95 shrink-0"
            aria-label="Restar 5 metros cuadrados"
          >
            <Minus className="w-5 h-5" />
          </button>

          <div className="relative flex-1">
            <input
              id="input-metraje-m2"
              type="number"
              min="0"
              step="1"
              value={m2Input}
              onChange={(e) => setM2Input(e.target.value)}
              placeholder="0"
              className="w-full h-12 pl-4 pr-14 rounded-2xl border-2 border-[#DED4C5] focus:border-[#0B72D9] focus:outline-none focus:ring-2 focus:ring-[#0B72D9]/20 bg-white font-mono text-xl font-bold text-[#1F2421] text-center transition-all"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[#756A5D] pointer-events-none select-none">
              m²
            </span>
          </div>

          <button
            type="button"
            onClick={() => handleAdjustM2(5)}
            className="w-12 h-12 rounded-2xl border border-[#DED4C5] bg-[#F6F4EF] hover:bg-[#DED4C5]/40 text-[#1F2421] flex items-center justify-center transition-colors cursor-pointer active:scale-95 shrink-0"
            aria-label="Sumar 5 metros cuadrados"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Presets Rápidos */}
        <div className="space-y-2 pt-1">
          <p className="text-[11px] font-semibold text-[#756A5D] uppercase tracking-wider">
            Sugerencias de metraje común:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {PRESETS_M2.map((p) => {
              const isActive = m2 === p.m2;
              return (
                <button
                  key={p.m2}
                  type="button"
                  onClick={() => setM2Input(String(p.m2))}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    isActive
                      ? 'border-[#0B72D9] bg-[#0B72D9]/10 text-[#082D60] font-bold shadow-2xs'
                      : 'border-[#DED4C5] bg-white hover:bg-[#F6F4EF] text-[#756A5D]'
                  }`}
                >
                  <div className="text-xs font-bold text-[#1F2421]">
                    {p.m2} m²
                  </div>
                  <div className="text-[10px] text-[#756A5D] truncate">
                    {p.label}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tip explicativo */}
        <div className="flex items-start gap-2 p-3 rounded-2xl bg-[#082D60]/5 border border-[#082D60]/10 text-[11px] text-[#756A5D]">
          <Info className="w-4 h-4 text-[#0B72D9] shrink-0 mt-0.5" />
          <span>
            <strong>¿Cómo calcular tus m²?</strong> Multiplica el largo de cada pared por su altura (ej. 4m de largo × 2.6m de alto = 10.4 m² por pared).
          </span>
        </div>
      </section>

      {/* ============================================================== */}
      {/* PASO 3: MODALIDAD DE SERVICIO (TOGGLE O BOTONES)               */}
      {/* ============================================================== */}
      <section className="space-y-3.5 bg-[#FFFEFA] p-5 sm:p-7 rounded-3xl border border-[#DED4C5] shadow-xs">
        <div className="flex items-center justify-between">
          <label className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#082D60] flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-full bg-[#082D60] text-white flex items-center justify-center text-xs font-bold">3</span>
            <span>{t('pinturaService.step3Title', '3. Modalidad de Servicio')}</span>
          </label>
          <span className="text-xs text-[#756A5D] font-medium">
            {isConMateriales ? 'Llave en mano con insumos' : 'Cliente provee pintura'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Opción A: Solo Mano de Obra */}
          <button
            type="button"
            onClick={() => setModality('solo_mano_obra')}
            className={`p-4 sm:p-5 rounded-2xl text-left border-2 transition-all cursor-pointer flex flex-col justify-between space-y-3 shadow-2xs group ${
              modality === 'solo_mano_obra'
                ? 'border-[#0B72D9] bg-[#0B72D9]/5 ring-2 ring-[#0B72D9]/20'
                : 'border-[#DED4C5] bg-white hover:border-[#0B72D9]/50 hover:bg-[#F6F4EF]/50'
            }`}
            id="btn-modality-labor-only"
          >
            <div className="flex items-start justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#082D60]/10 text-[#082D60]">
                Opción A
              </span>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center border transition-colors ${
                modality === 'solo_mano_obra'
                  ? 'border-[#0B72D9] bg-[#0B72D9] text-white'
                  : 'border-[#DED4C5] bg-white'
              }`}>
                {modality === 'solo_mano_obra' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
            </div>

            <div>
              <h3 className="font-serif font-bold text-base text-[#1F2421]">
                {t('pinturaService.laborOnly', 'Solo Mano de Obra')}
              </h3>
              <p className="text-xs text-[#756A5D] mt-1 leading-relaxed">
                {t('pinturaService.laborOnlyDesc', 'Tú suministras la pintura y nosotros ponemos los pintores expertos, rodillos, brochas, escaleras y protección plástica.')}
              </p>
            </div>

            <div className="pt-2 border-t border-[#DED4C5]/50 text-xs font-semibold text-[#0B72D9]">
              ${areaType === 'interior' ? '2.50' : '3.50'} / m²
            </div>
          </button>

          {/* Opción B: Mano de Obra + Materiales */}
          <button
            type="button"
            onClick={() => setModality('mano_obra_materiales')}
            className={`p-4 sm:p-5 rounded-2xl text-left border-2 transition-all cursor-pointer flex flex-col justify-between space-y-3 shadow-2xs group ${
              modality === 'mano_obra_materiales'
                ? 'border-[#0B72D9] bg-[#0B72D9]/5 ring-2 ring-[#0B72D9]/20'
                : 'border-[#DED4C5] bg-white hover:border-[#0B72D9]/50 hover:bg-[#F6F4EF]/50'
            }`}
            id="btn-modality-labor-materials"
          >
            <div className="flex items-start justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#53653D]/10 text-[#53653D] flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#53653D]" />
                Opción B • Llave en mano
              </span>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center border transition-colors ${
                modality === 'mano_obra_materiales'
                  ? 'border-[#0B72D9] bg-[#0B72D9] text-white'
                  : 'border-[#DED4C5] bg-white'
              }`}>
                {modality === 'mano_obra_materiales' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
            </div>

            <div>
              <h3 className="font-serif font-bold text-base text-[#1F2421]">
                {t('pinturaService.laborAndMaterials', 'Mano de Obra + Materiales')}
              </h3>
              <p className="text-xs text-[#756A5D] mt-1 leading-relaxed">
                {t('pinturaService.laborAndMaterialsDesc', 'Nos encargamos de todo: pintura según calidad elegida, cinta azul de enmascarar, plásticos y consumibles incluidos.')}
              </p>
            </div>

            <div className="pt-2 border-t border-[#DED4C5]/50 flex items-center justify-between text-xs font-semibold">
              <span className="text-[#0B72D9]">
                ${areaType === 'interior' ? '3.50' : '4.50'} / m² M.O.
              </span>
              <span className="text-[11px] text-[#53653D]">
                + Galones e insumos
              </span>
            </div>
          </button>
        </div>
      </section>

      {/* ============================================================== */}
      {/* PASO 4: CALIDAD DE LA PINTURA (SOLO SI MANO DE OBRA + MAT.)     */}
      {/* ============================================================== */}
      {isConMateriales && (
        <section className="space-y-4 bg-[#FFFEFA] p-5 sm:p-7 rounded-3xl border-2 border-[#0B72D9]/40 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <label className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#082D60] flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-[#0B72D9] text-white flex items-center justify-center text-xs font-bold">4</span>
              <span>{t('pinturaService.step4Title', '4. Calidad de la Pintura')}</span>
            </label>
            <span className="text-xs font-bold text-[#0B72D9]">
              Elige el tipo de pintura
            </span>
          </div>

          <p className="text-xs text-[#756A5D] leading-relaxed">
            Selecciona la gama de pintura que prefieres para tu acabado. El cálculo de galones se ajusta automáticamente:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Opción 1: Pintura Estándar ($14 USD por galón) */}
            <button
              type="button"
              onClick={() => setCalidadPintura('estandar')}
              className={`p-4 sm:p-5 rounded-2xl text-left border-2 transition-all cursor-pointer flex flex-col justify-between space-y-3 shadow-2xs group ${
                calidadPintura === 'estandar'
                  ? 'border-[#0B72D9] bg-[#0B72D9]/5 ring-2 ring-[#0B72D9]/20'
                  : 'border-[#DED4C5] bg-white hover:border-[#0B72D9]/50 hover:bg-[#F6F4EF]/50'
              }`}
              id="btn-calidad-estandar"
            >
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl bg-white border border-[#DED4C5]/80 flex items-center justify-center text-[#082D60] group-hover:scale-105 transition-transform shadow-2xs">
                  <Droplets className="w-5 h-5 text-[#082D60]" />
                </div>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center border transition-colors ${
                  calidadPintura === 'estandar'
                    ? 'border-[#0B72D9] bg-[#0B72D9] text-white'
                    : 'border-[#DED4C5] bg-white'
                }`}>
                  {calidadPintura === 'estandar' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-serif font-bold text-base text-[#1F2421]">
                    {t('pinturaService.standardPaint', 'Pintura Estándar')}
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#082D60]/10 text-[#082D60]">
                    Económica
                  </span>
                </div>
                <p className="text-xs text-[#756A5D] mt-1.5 leading-relaxed">
                  {t('pinturaService.standardPaintDesc', 'Pintura látex lavable de buen poder cubritivo. Ideal para interiores residenciales, oficinas y mantenimiento regular.')}
                </p>
              </div>

              <div className="pt-2.5 border-t border-[#DED4C5]/50 flex items-baseline justify-between text-xs font-semibold">
                <span className="font-serif font-bold text-base text-[#082D60]">
                  ${PRECIO_GALON_ESTANDAR}.00
                </span>
                <span className="text-[11px] text-[#756A5D] font-medium">
                  USD por galón
                </span>
              </div>
            </button>

            {/* Opción 2: Pintura Premium ($35 USD por galón) */}
            <button
              type="button"
              onClick={() => setCalidadPintura('premium')}
              className={`p-4 sm:p-5 rounded-2xl text-left border-2 transition-all cursor-pointer flex flex-col justify-between space-y-3 shadow-2xs group ${
                calidadPintura === 'premium'
                  ? 'border-[#0B72D9] bg-[#0B72D9]/5 ring-2 ring-[#0B72D9]/20'
                  : 'border-[#DED4C5] bg-white hover:border-[#0B72D9]/50 hover:bg-[#F6F4EF]/50'
              }`}
              id="btn-calidad-premium"
            >
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 group-hover:scale-105 transition-transform shadow-2xs">
                  <Sparkles className="w-5 h-5 text-amber-600" />
                </div>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center border transition-colors ${
                  calidadPintura === 'premium'
                    ? 'border-[#0B72D9] bg-[#0B72D9] text-white'
                    : 'border-[#DED4C5] bg-white'
                }`}>
                  {calidadPintura === 'premium' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-serif font-bold text-base text-[#1F2421]">
                    {t('pinturaService.premiumPaint', 'Pintura Premium')}
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
                    Máxima Calidad
                  </span>
                </div>
                <p className="text-xs text-[#756A5D] mt-1.5 leading-relaxed">
                  {t('pinturaService.premiumPaintDesc', 'Pintura 100% acrílica superlavable antihongos de alta densidad. Máxima resistencia a la humedad de Panamá, intemperie y rayos UV.')}
                </p>
              </div>

              <div className="pt-2.5 border-t border-[#DED4C5]/50 flex items-baseline justify-between text-xs font-semibold">
                <span className="font-serif font-bold text-base text-[#082D60]">
                  ${PRECIO_GALON_PREMIUM}.00
                </span>
                <span className="text-[11px] text-[#756A5D] font-medium">
                  USD por galón
                </span>
              </div>
            </button>
          </div>

          {/* Nota de Insumos Fijos */}
          <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-[#53653D]/10 border border-[#53653D]/20 text-xs text-[#3f4f2c]">
            <PackageCheck className="w-4 h-4 text-[#53653D] shrink-0" />
            <span>
              <strong>Insumos de trabajo incluidos:</strong> Se suma una base fija de <strong>${COSTO_INSUMOS_FIJO} USD</strong> para rodillos profesionales, cinta azul de enmascarar y plásticos protectores de pisos.
            </span>
          </div>
        </section>
      )}

      {/* ============================================================== */}
      {/* PASO 5: RESUMEN Y TOTAL (RECIBO DINÁMICO)                      */}
      {/* ============================================================== */}
      <section className="bg-[#FFFEFA] rounded-3xl border border-[#DED4C5] p-5 sm:p-7 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-[#DED4C5]/60 pb-3">
          <div className="flex items-center gap-2 text-[#082D60]">
            <FileText className="w-4 h-4 text-[#0B72D9]" />
            <h3 className="font-serif font-bold text-base sm:text-lg">
              {t('pinturaService.summaryTitle', 'Resumen de Cotización')}
            </h3>
          </div>
          <span className="text-xs font-mono font-semibold text-[#756A5D] bg-[#F6F4EF] px-2.5 py-1 rounded-lg">
            {m2 > 0 ? `${m2} m²` : '0 m²'}
          </span>
        </div>

        {/* Desglose de partidas del recibo */}
        <div className="space-y-3.5 text-xs sm:text-sm">
          {/* Parámetros Seleccionados */}
          <div className="flex items-center justify-between text-[#756A5D] text-xs pb-1">
            <span>Tipo de Superficie:</span>
            <span className="font-semibold text-[#1F2421]">
              {areaType === 'interior' ? 'Pintura Interior' : 'Pintura Exterior'}
            </span>
          </div>

          <div className="flex items-center justify-between text-[#756A5D] text-xs pb-1">
            <span>Modalidad de Servicio:</span>
            <span className="font-semibold text-[#1F2421]">
              {isConMateriales ? 'Mano de Obra + Materiales' : 'Solo Mano de Obra'}
            </span>
          </div>

          {/* 1. Costo de Mano de Obra */}
          <div className="pt-2 border-t border-[#DED4C5]/40 flex items-center justify-between">
            <div>
              <p className="font-semibold text-[#1F2421]">
                Costo de Mano de Obra
              </p>
              <p className="text-[11px] text-[#756A5D]">
                {m2 > 0 ? `${m2} m² × $${rateManoDeObra.toFixed(2)} / m²` : 'Ingresa los metros cuadrados'}
              </p>
            </div>
            <span className="font-mono font-bold text-sm sm:text-base text-[#1F2421]">
              ${costoManoDeObra.toFixed(2)}
            </span>
          </div>

          {/* 2. Costo de Materiales (Solo si Opción B: Mano de Obra + Materiales) */}
          {isConMateriales && (
            <div className="pt-2.5 border-t border-[#DED4C5]/40 space-y-2 bg-[#53653D]/5 -mx-3 px-3.5 py-3 rounded-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-[#1F2421] flex items-center gap-1.5">
                    <Droplets className="w-3.5 h-3.5 text-[#53653D]" />
                    <span>Costo de Materiales e Insumos</span>
                  </p>
                  <p className="text-[11px] text-[#756A5D]">
                    Calidad seleccionada: <strong className="text-[#1F2421]">{calidadPintura === 'premium' ? 'Pintura Premium ($35/gal)' : 'Pintura Estándar ($14/gal)'}</strong>
                  </p>
                </div>
                <span className="font-mono font-bold text-sm sm:text-base text-[#53653D]">
                  ${costoMateriales.toFixed(2)}
                </span>
              </div>

              {/* Detalle interno de materiales: galones + insumos fijos */}
              <div className="pl-5 border-l-2 border-[#53653D]/30 space-y-1 text-[11px] text-[#756A5D]">
                <div className="flex justify-between">
                  <span>
                    • Pintura ({galones} {galones === 1 ? 'galón' : 'galones'} × ${precioGalon}):
                  </span>
                  <span className="font-mono font-semibold text-[#1F2421]">
                    ${costoPintura.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>
                    • Insumos fijos (rodillos, cinta, plástico protector):
                  </span>
                  <span className="font-mono font-semibold text-[#1F2421]">
                    ${costoInsumosFijo.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Línea divisoria de recibo */}
          <div className="border-t-2 border-dashed border-[#DED4C5] pt-3 flex items-baseline justify-between">
            <div>
              <p className="text-xs uppercase font-extrabold tracking-wider text-[#082D60]">
                {t('pinturaService.estimatedTotal', 'Total Estimado')}
              </p>
              <p className="text-[11px] text-[#756A5D]">
                {isConMateriales 
                  ? `Mano de obra + pintura (${calidadPintura === 'premium' ? 'Premium' : 'Estándar'}) + insumos` 
                  : 'Mano de obra técnica calificada'}
              </p>
            </div>
            <div className="text-right">
              <span className="font-serif font-black text-2xl sm:text-3xl text-[#082D60] tracking-tight">
                ${granTotal.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Validación: Si m² es 0 */}
        {m2 <= 0 && (
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
            <Info className="w-4 h-4 shrink-0 text-amber-600" />
            <span>Por favor ingresa los metros cuadrados (m²) a pintar para habilitar la solicitud.</span>
          </div>
        )}

        {/* Botón: Solicitar Servicio */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={m2 <= 0}
            className={`w-full py-4 px-6 rounded-2xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.99] ${
              m2 <= 0
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none opacity-60'
                : 'bg-[#082D60] hover:bg-[#062248] text-white hover:shadow-lg cursor-pointer'
            }`}
            id="btn-solicitar-pintura"
          >
            <span>{t('pinturaService.requestService', 'Solicitar este Servicio')}</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Garantías y condiciones */}
        <div className="pt-2 border-t border-[#DED4C5]/40 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#756A5D]">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#53653D]" />
            Incluye protección de pisos y rodapiés
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#53653D]" />
            Facturación fiscal con RUC
          </span>
        </div>
      </section>
    </div>
  );
};

export default PinturaService;
