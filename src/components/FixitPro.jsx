import React, { useState } from 'react';
import { 
  Building2, 
  MessageSquare, 
  DollarSign, 
  Briefcase, 
  CheckCircle2, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  ArrowRight, 
  ShieldCheck, 
  Wrench, 
  Store, 
  UtensilsCrossed, 
  Sparkles, 
  Zap,
  ArrowLeft,
  FileText
} from 'lucide-react';

/**
 * FIXIT Pro B2B Landing & Pricing Component
 * Mantenimiento preventivo y correctivo por suscripción para locales comerciales en Panamá.
 * Cero pasivo laboral, cero emergencias costosas.
 */
export const FixitPro = ({ 
  onGoHome,
  whatsAppPhone = '50761372394' // Puedes pasar '507XXXXXXXX' o tu número comercial
}) => {
  // Estado para el acordeón de Términos, Condiciones y Horarios
  const [openAccordion, setOpenAccordion] = useState(0);

  const toggleAccordion = (index) => {
    setOpenAccordion(openAccordion === index ? null : index);
  };

  const createWhatsAppLink = (planName, price) => {
    const text = `Hola FIXIT Pro, deseo solicitar una evaluación para el plan ${planName} ($${price}/mes) para mi local comercial en Panamá.`;
    return `https://wa.me/${whatsAppPhone}?text=${encodeURIComponent(text)}`;
  };

  const generalInquiryLink = `https://wa.me/${whatsAppPhone}?text=${encodeURIComponent(
    'Hola FIXIT Pro, deseo solicitar una evaluación de mantenimiento para las instalaciones de mi local comercial en Panamá.'
  )}`;

  // Planes B2B configurados
  const plans = [
    {
      id: 'basico',
      name: 'Básico Comercial',
      price: 149,
      period: 'mes',
      visits: 'Incluye 4 visitas al mes',
      recommendedFor: 'Boutiques, consultorios, oficinas y locales pequeños.',
      highlight: false,
      badge: null,
      features: [
        '4 visitas al mes (preventivas o correctivas)',
        'Mano de obra y diagnóstico 100% cubiertos',
        'Revisión y reemplazo de luminarias, tomas e interruptores',
        'Inspección de griferías, sanitarios y desagues',
        'Ajustes de cerraduras, bisagras y puertas comerciales',
        'Respuesta directa vía WhatsApp para administradores',
        '15% de descuento en remodelaciones o trabajos mayores',
      ],
      ctaText: 'Solicitar Evaluación',
    },
    {
      id: 'activa',
      name: 'Operación Activa',
      price: 279,
      period: 'mes',
      visits: 'Incluye 8 visitas al mes',
      recommendedFor: 'Restaurantes, cafeterías, tiendas y locales de alto tráfico.',
      highlight: true,
      badge: 'MÁS POPULAR • RECOMENDADO',
      features: [
        '8 visitas al mes (preventivas y correctivas)',
        'Respuesta prioritaria en menos de 2 horas hábiles',
        'Mantenimiento integral de plomería y electricidad comercial',
        'Retoques de pintura puntual, resane y sellados sanitarios',
        'Inspección periódica de bombas de agua y trampas de grasa',
        'Reporte técnico mensual con recomendaciones preventivas',
        '15% de descuento en remodelaciones o trabajos mayores',
      ],
      ctaText: 'Solicitar Evaluación',
    },
    {
      id: 'priority',
      name: 'Priority B2B',
      price: 499,
      period: 'mes',
      visits: 'Incluye 16 visitas al mes + Atención VIP',
      recommendedFor: 'Cadenas, franquicias multisede y cocinas industriales.',
      highlight: false,
      badge: 'ATENCIÓN VIP',
      features: [
        '16 visitas al mes con despacho preferencial',
        'Atención VIP inmediata ante emergencias operativas',
        'Soporte y coordinación multisede en Ciudad de Panamá',
        'Checklist preventivo semanal y auditoría técnica continua',
        'Cobertura de mano de obra en incidencias operativas complejas',
        'Ejecutivo de cuenta B2B dedicado para su empresa',
        '15% de descuento en remodelaciones y proyectos mayores',
      ],
      ctaText: 'Solicitar Evaluación',
    },
  ];

  // Términos, condiciones y horarios legales
  const terms = [
    {
      id: 'horario',
      title: 'Horario de Operaciones',
      content:
        'Lunes a Viernes de 8:00 a.m. a 5:00 p.m. y Sábados de 8:00 a.m. a 12:00 m.d. Las visitas de emergencia solicitadas fuera del horario operativo ordinario están sujetas a disponibilidad técnica y aplican tarifa preferencial de guardia.',
    },
    {
      id: 'materiales',
      title: 'Materiales no incluidos',
      content:
        'La suscripción cubre estrictamente la mano de obra y el diagnóstico. Repuestos y materiales se facturan por separado previa aprobación del gerente del local.',
    },
    {
      id: 'agendamiento',
      title: 'Agendamiento',
      content:
        'Las visitas están sujetas a la logística de rutas por zona de FIXIT Panamá (San Francisco, Bella Vista, Costa del Este, Obarrio, El Cangrejo, Casco Antiguo y zonas comerciales metropolitanas).',
    },
    {
      id: 'trabajos-extra',
      title: 'Trabajos extra y remodelaciones mayores',
      content:
        'Remodelaciones mayores o proyectos fuera del alcance preventivo/correctivo menor reciben un 15% de descuento exclusivo para suscriptores.',
    },
    {
      id: 'facturacion',
      title: 'Facturación Fiscal y Deducción de Impuestos',
      content:
        'Facturación mensual recurrente emitida con factura fiscal electrónica válida ante la DGI para la deducción del 100% como gasto operativo deducible en Panamá. Sin contratos de permanencia forzosa: preaviso de 15 días calendario.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#F6F4EF] text-[#1F2421] selection:bg-[#0B72D9]/15">
      {/* Top Bar Navigation */}
      <header className="sticky top-0 z-40 bg-[#FFFEFA]/95 backdrop-blur-md border-b border-[#DED4C5] px-4 sm:px-8 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onGoHome && (
              <button
                type="button"
                onClick={onGoHome}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#DED4C5] bg-white text-xs font-semibold text-[#1F2421] hover:bg-[#F6F4EF] transition-colors cursor-pointer"
                title="Volver a la versión residencial"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-[#756A5D]" />
                <span className="hidden sm:inline">Servicios Residenciales</span>
              </button>
            )}

            <div className="flex items-center gap-2">
              <span className="font-serif font-black text-xl tracking-tight text-[#082D60]">
                FIXIT <span className="text-[#0B72D9] font-sans font-extrabold text-sm uppercase px-1.5 py-0.5 rounded-md bg-[#0B72D9]/10 border border-[#0B72D9]/20">Pro</span>
              </span>
              <span className="hidden md:inline-block text-xs font-medium text-[#756A5D] pl-2 border-l border-[#DED4C5]">
                Mantenimiento B2B en Panamá
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href={generalInquiryLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#082D60] hover:bg-[#062248] text-white text-xs font-bold transition-all shadow-xs"
            >
              <MessageSquare className="w-3.5 h-3.5 text-[#25D366]" />
              <span>Solicitar Evaluación</span>
            </a>
          </div>
        </div>
      </header>

      {/* ============================================================== */}
      {/* 1. HERO SECTION                                                */}
      {/* ============================================================== */}
      <section className="relative overflow-hidden pt-12 pb-16 sm:pt-20 sm:pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center space-y-6 relative">
          {/* Tagline / Subtitle kicker (clean typography, no pill box) */}
          <div className="flex items-center justify-center gap-2 text-xs font-bold tracking-wider uppercase text-[#0B72D9]">
            <Building2 className="w-4 h-4 text-[#0B72D9]" />
            <span>Mantenimiento Corporativo & Comercial B2B · Panamá</span>
          </div>

          {/* Título Principal */}
          <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-bold text-[#1F2421] tracking-tight leading-[1.12]">
            FIXIT Pro: Tu departamento de mantenimiento tercerizado
          </h1>

          {/* Subtítulo Principal */}
          <p className="text-base sm:text-xl text-[#756A5D] max-w-2xl mx-auto leading-relaxed font-normal">
            Mantenimiento preventivo y correctivo por suscripción para locales comerciales en Panamá. Cero pasivo laboral, cero emergencias costosas.
          </p>

          {/* Value Props sin encierros pill */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 pt-2 text-xs font-semibold text-[#1F2421]">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#53653D]" />
              Facturación fiscal con RUC
            </span>
            <span aria-hidden="true" className="hidden sm:inline text-[#DED4C5]">·</span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#53653D]" />
              Técnicos idóneos certificados
            </span>
            <span aria-hidden="true" className="hidden sm:inline text-[#DED4C5]">·</span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#53653D]" />
              Cobertura en Ciudad de Panamá
            </span>
          </div>

          {/* Action CTAs */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <a
              href="#planes-pro"
              className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-[#082D60] hover:bg-[#062248] text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Ver Planes de Suscripción</span>
              <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href={generalInquiryLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-white hover:bg-[#F6F4EF] border border-[#DED4C5] text-[#1F2421] font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-2xs"
            >
              <MessageSquare className="w-4 h-4 text-[#25D366]" />
              <span>Solicitar Evaluación Inmediata</span>
            </a>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 2. BENEFICIOS (GRID DE 3 COLUMNAS)                             */}
      {/* ============================================================== */}
      <section className="py-14 sm:py-20 px-4 sm:px-6 lg:px-8 bg-[#FFFEFA] border-y border-[#DED4C5]/80">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1F2421]">
              ¿Por qué las empresas eligen FIXIT Pro?
            </h2>
            <p className="text-xs sm:text-sm text-[#756A5D]">
              Diseñado para dueños de negocios, gerentes de operaciones y administradores de tiendas que necesitan resolver averías sin descuidar sus ventas.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {/* Beneficio 1: Respuesta Inmediata vía WhatsApp */}
            <div className="p-6 sm:p-8 rounded-3xl bg-[#F6F4EF]/60 border border-[#DED4C5] space-y-4 hover:border-[#0B72D9]/40 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-[#0B72D9]/10 text-[#0B72D9] flex items-center justify-center shrink-0">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h3 className="font-serif font-bold text-xl text-[#1F2421]">
                Respuesta Inmediata vía WhatsApp
              </h3>
              <p className="text-xs sm:text-sm text-[#756A5D] leading-relaxed">
                Canal exclusivo para gerentes y administradores de local. Reportas la incidencia en segundos con foto o nota de voz y coordinamos el despacho técnico inmediato sin trámites burocráticos.
              </p>
              <ul className="text-xs text-[#1F2421] space-y-2 pt-2 border-t border-[#DED4C5]/60">
                <li className="flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-[#0B72D9]" />
                  <span>Atención prioritaria y directa</span>
                </li>
                <li className="flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-[#0B72D9]" />
                  <span>Sin formularios engorrosos</span>
                </li>
              </ul>
            </div>

            {/* Beneficio 2: Costos Predecibles */}
            <div className="p-6 sm:p-8 rounded-3xl bg-[#F6F4EF]/60 border border-[#DED4C5] space-y-4 hover:border-[#0B72D9]/40 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-[#53653D]/10 text-[#53653D] flex items-center justify-center shrink-0">
                <DollarSign className="w-6 h-6" />
              </div>
              <h3 className="font-serif font-bold text-xl text-[#1F2421]">
                Costos Predecibles
              </h3>
              <p className="text-xs sm:text-sm text-[#756A5D] leading-relaxed">
                Una tarifa mensual fija que protege tu flujo de caja. Dile adiós a cobros abusivos por 'urgencias' imprevistas o presupuestos inflados de última hora. Mantén tus gastos operativos bajo control.
              </p>
              <ul className="text-xs text-[#1F2421] space-y-2 pt-2 border-t border-[#DED4C5]/60">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#53653D]" />
                  <span>Presupuesto mensual blindado</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#53653D]" />
                  <span>Factura fiscal mensual deducible</span>
                </li>
              </ul>
            </div>

            {/* Beneficio 3: Cero Pasivo Laboral */}
            <div className="p-6 sm:p-8 rounded-3xl bg-[#F6F4EF]/60 border border-[#DED4C5] space-y-4 hover:border-[#0B72D9]/40 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-[#082D60]/10 text-[#082D60] flex items-center justify-center shrink-0">
                <Briefcase className="w-6 h-6" />
              </div>
              <h3 className="font-serif font-bold text-xl text-[#1F2421]">
                Cero Pasivo Laboral
              </h3>
              <p className="text-xs sm:text-sm text-[#756A5D] leading-relaxed">
                Olvídate de contratar personal de mantenimiento en planilla, pagar seguro social (CSS), décimo tercer mes, vacaciones o liquidaciones. Obtén un equipo multidisciplinario idóneo 100% tercerizado.
              </p>
              <ul className="text-xs text-[#1F2421] space-y-2 pt-2 border-t border-[#DED4C5]/60">
                <li className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#082D60]" />
                  <span>Sin riesgos patronales ni demandas</span>
                </li>
                <li className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#082D60]" />
                  <span>Técnicos idóneos en plomería, luz y resane</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Industrias a las que servimos */}
          <div className="p-6 rounded-3xl bg-[#F6F4EF] border border-[#DED4C5] flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-1 text-center md:text-left">
              <h4 className="font-serif font-bold text-base text-[#1F2421]">
                Ideal para todo tipo de local en Ciudad de Panamá
              </h4>
              <p className="text-xs text-[#756A5D]">
                Restaurantes, cafeterías, boutiques, franquicias, consultorios médicos, sucursales y oficinas corporativas.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-[#082D60]">
              <span className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-[#DED4C5] shadow-2xs">
                <UtensilsCrossed className="w-3.5 h-3.5" />
                Restaurantes & Gastronomía
              </span>
              <span className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-[#DED4C5] shadow-2xs">
                <Store className="w-3.5 h-3.5" />
                Retail & Boutiques
              </span>
              <span className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-[#DED4C5] shadow-2xs">
                <Building2 className="w-3.5 h-3.5" />
                Oficinas & Sucursales
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 3. PRICING TABLE (3 TARJETAS DE PRECIOS)                       */}
      {/* ============================================================== */}
      <section id="planes-pro" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0B72D9] uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Planes Mensuales por Suscripción</span>
            </div>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#1F2421]">
              Planes transparentes que se pagan solos
            </h2>
            <p className="text-xs sm:text-sm text-[#756A5D]">
              Elige el volumen de visitas que tu local requiere. Todos los planes incluyen mano de obra, diagnóstico y soporte continuo.
            </p>
          </div>

          {/* Grid de Precios */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
            {plans.map((plan) => {
              const isFeatured = plan.highlight;
              return (
                <div
                  key={plan.id}
                  className={`relative rounded-3xl p-6 sm:p-8 flex flex-col justify-between transition-all duration-300 ${
                    isFeatured
                      ? 'bg-[#082D60] text-white shadow-xl ring-2 ring-[#0B72D9] lg:-translate-y-2'
                      : 'bg-[#FFFEFA] text-[#1F2421] border border-[#DED4C5] shadow-xs hover:border-[#0B72D9]/50'
                  }`}
                >
                  {/* Top Ribbon on Featured Plan */}
                  {isFeatured && (
                    <div className="bg-[#0988F5] text-white text-[11px] font-extrabold uppercase tracking-wider py-1.5 px-4 text-center rounded-t-3xl -mx-6 sm:-mx-8 -mt-6 sm:-mt-8 mb-6 shadow-sm">
                      {plan.badge}
                    </div>
                  )}

                  <div className="space-y-6">
                    {/* Header */}
                    <div>
                      {plan.badge && !isFeatured && (
                        <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#0B72D9] mb-1">
                          {plan.badge}
                        </div>
                      )}
                      <h3
                        className={`font-serif font-bold text-2xl ${
                          isFeatured ? 'text-white' : 'text-[#1F2421]'
                        }`}
                      >
                        {plan.name}
                      </h3>
                      <p
                        className={`text-xs mt-1 leading-relaxed ${
                          isFeatured ? 'text-white/70' : 'text-[#756A5D]'
                        }`}
                      >
                        {plan.recommendedFor}
                      </p>
                    </div>

                    {/* Price Block */}
                    <div className={`pt-2 pb-4 border-b ${isFeatured ? 'border-white/10' : 'border-[#DED4C5]'}`}>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-bold">$</span>
                        <span className="font-serif font-black text-4xl sm:text-5xl tracking-tight tabular-nums">
                          {plan.price}
                        </span>
                        <span
                          className={`text-xs font-medium ${
                            isFeatured ? 'text-white/70' : 'text-[#756A5D]'
                          }`}
                        >
                          /{plan.period}
                        </span>
                      </div>
                      <p
                        className={`mt-2 text-xs font-bold ${
                          isFeatured ? 'text-sky-300' : 'text-[#082D60]'
                        }`}
                      >
                        {plan.visits}
                      </p>
                    </div>

                    {/* Feature List */}
                    <div className="space-y-3">
                      <p
                        className={`text-xs font-bold uppercase tracking-wider ${
                          isFeatured ? 'text-sky-300' : 'text-[#082D60]'
                        }`}
                      >
                        Lo que incluye:
                      </p>
                      <ul className="space-y-2.5 text-xs">
                        {plan.features.map((feature, i) => (
                          <li key={i} className="flex items-start gap-2.5 leading-snug">
                            <CheckCircle2
                              className={`w-4 h-4 shrink-0 mt-0.5 ${
                                isFeatured ? 'text-[#0988F5]' : 'text-[#53653D]'
                              }`}
                            />
                            <span
                              className={isFeatured ? 'text-white/90' : 'text-[#1F2421]'}
                            >
                              {feature}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* 4. CALL TO ACTION: Botón "Solicitar Evaluación" a WhatsApp */}
                  <div className="pt-8">
                    <a
                      href={createWhatsAppLink(plan.name, plan.price)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`w-full py-3.5 px-4 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm ${
                        isFeatured
                          ? 'bg-[#0B72D9] hover:bg-[#0962BC] text-white hover:shadow-lg active:scale-[0.98]'
                          : 'bg-[#082D60] hover:bg-[#062248] text-white active:scale-[0.98]'
                      }`}
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>{plan.ctaText}</span>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Nota a la medida */}
          <div className="text-center pt-2">
            <p className="text-xs text-[#756A5D]">
              ¿Tienes múltiples sucursales o necesidades específicas de mantenimiento?{' '}
              <a
                href={generalInquiryLink}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-[#0B72D9] hover:underline"
              >
                Solicita una cotización corporativa personalizada aquí
              </a>
              .
            </p>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* COMPARATIVA DE COSTOS: EMPLEADO EN PLANILLA VS FIXIT PRO       */}
      {/* ============================================================== */}
      <section className="py-14 sm:py-18 px-4 sm:px-6 lg:px-8 bg-[#FFFEFA] border-y border-[#DED4C5]/80">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h3 className="font-serif text-2xl font-bold text-[#1F2421]">
              La matemática del ahorro para tu negocio
            </h3>
            <p className="text-xs sm:text-sm text-[#756A5D]">
              Comparativa real de costos mensuales en Ciudad de Panamá
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Empleado Propio */}
            <div className="p-6 rounded-3xl bg-rose-50/50 border border-rose-200 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-800 uppercase tracking-wider">
                  Opción Tradicional
                </span>
                <span className="font-serif font-bold text-xl text-rose-900 tabular-nums">
                  ~$950+ / mes
                </span>
              </div>
              <h4 className="font-serif font-bold text-base text-[#1F2421]">
                Técnico de Mantenimiento en Planilla
              </h4>
              <ul className="text-xs text-[#756A5D] space-y-2">
                <li className="flex items-center gap-2">
                  <span className="text-rose-600 font-bold">✕</span>
                  Salario base mensual (~$650.00)
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-rose-600 font-bold">✕</span>
                  Cargas patronales CSS, Seguro Educativo y Riesgos (~$125.00)
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-rose-600 font-bold">✕</span>
                  Provisión de Décimo Tercer Mes y Vacaciones (~$110.00)
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-rose-600 font-bold">✕</span>
                  Riesgo de pasivo laboral, uniformes y herramientas
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-rose-600 font-bold">✕</span>
                  Una sola persona que no domina todas las disciplinas
                </li>
              </ul>
            </div>

            {/* FIXIT Pro */}
            <div className="p-6 rounded-3xl bg-[#53653D]/10 border border-[#53653D]/30 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#53653D] uppercase tracking-wider">
                  Con FIXIT Pro
                </span>
                <span className="font-serif font-bold text-xl text-[#53653D] tabular-nums">
                  Desde $149 / mes
                </span>
              </div>
              <h4 className="font-serif font-bold text-base text-[#1F2421]">
                Departamento Tercerizado por Suscripción
              </h4>
              <ul className="text-xs text-[#1F2421] space-y-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#53653D] shrink-0" />
                  Tarifa plana deducible al 100% como gasto operativo
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#53653D] shrink-0" />
                  Cero pasivo laboral, cero liquidaciones ni cargas de CSS
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#53653D] shrink-0" />
                  Equipo multidisciplinario: plomeros, electricistas y manitas
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#53653D] shrink-0" />
                  Atención oportuna vía WhatsApp para gerentes de local
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#53653D] shrink-0" />
                  15% de descuento en remodelaciones mayores
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 5. TÉRMINOS, CONDICIONES Y HORARIOS (ACORDEÓN INTERACTIVO)     */}
      {/* ============================================================== */}
      <section className="py-14 sm:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[#082D60]">
              <FileText className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">
                Claridad y Transparencia
              </span>
            </div>
            <h3 className="font-serif text-2xl font-bold text-[#1F2421]">
              Términos, Condiciones y Horarios Operativos
            </h3>
            <p className="text-xs sm:text-sm text-[#756A5D]">
              Condiciones claras para garantizar una relación comercial transparente, eficiente y duradera en Panamá.
            </p>
          </div>

          <div className="space-y-3">
            {terms.map((term, index) => {
              const isOpen = openAccordion === index;
              return (
                <div
                  key={term.id}
                  className="rounded-2xl border border-[#DED4C5] bg-[#FFFEFA] overflow-hidden transition-all shadow-2xs"
                >
                  <button
                    type="button"
                    onClick={() => toggleAccordion(index)}
                    className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 font-serif font-bold text-sm sm:text-base text-[#1F2421] hover:text-[#0B72D9] transition-colors cursor-pointer"
                  >
                    <span>{term.title}</span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-[#0B72D9] shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[#756A5D] shrink-0" />
                    )}
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-5 sm:px-5 text-xs sm:text-sm text-[#756A5D] leading-relaxed border-t border-[#DED4C5]/60 pt-3">
                      {term.content}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* FOOTER CORPORATIVO FINAL                                       */}
      {/* ============================================================== */}
      <footer className="bg-[#082D60] text-white py-12 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          <div className="space-y-1">
            <h4 className="font-serif font-bold text-lg text-white">
              FIXIT Pro Panamá
            </h4>
            <p className="text-xs text-white/70">
              Mantenimiento preventivo y correctivo por suscripción para locales comerciales en Panamá.
            </p>
            <p className="text-[11px] text-white/50 pt-1">
              Ciudad de Panamá • WhatsApp Oficial: +507 6137-2394
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <a
              href={generalInquiryLink}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Solicitar Evaluación</span>
            </a>
            {onGoHome && (
              <button
                type="button"
                onClick={onGoHome}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs border border-white/20 transition-colors cursor-pointer"
              >
                Volver al Inicio
              </button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default FixitPro;
