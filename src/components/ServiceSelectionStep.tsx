import React, { useState, useEffect, useMemo } from 'react';
import { Service, ServiceCategory } from '../types';
import { getServicesByCategory, FIXIT_CATEGORIES } from '../data/catalog';
import { FIXIT_IMAGES } from '../assets/images';
import { fetchServicesFromServer } from '../lib/api';
import { ArrowLeft, ChevronRight, ShieldCheck, Clock, AlertCircle, Wrench, Layers, Tv } from 'lucide-react';

interface ServiceSelectionStepProps {
  category: ServiceCategory;
  onSelectService: (service: Service) => void;
  onBack: () => void;
}

export const ServiceSelectionStep: React.FC<ServiceSelectionStepProps> = ({
  category,
  onSelectService,
  onBack,
}) => {
  const defaultServices = useMemo(() => getServicesByCategory(category), [category]);
  const [customServices, setCustomServices] = useState<Service[] | null>(null);

  useEffect(() => {
    setCustomServices(null);
    let isMounted = true;
    fetchServicesFromServer({ category, activeOnly: true })
      .then((liveServices) => {
        if (isMounted && liveServices && liveServices.length > 0) {
          setCustomServices(liveServices);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [category]);

  // Robustly merge default catalog so newly defined catalog services (such as HOG-006) are ALWAYS present
  const services = useMemo(() => {
    if (!customServices || customServices.length === 0) {
      return defaultServices;
    }
    const map = new Map<string, Service>();
    defaultServices.forEach((s) => map.set(s.id, s));
    customServices.forEach((s) => {
      const existing = map.get(s.id);
      map.set(s.id, existing ? { ...existing, ...s } : s);
    });
    return Array.from(map.values());
  }, [defaultServices, customServices]);

  const categoryInfo = FIXIT_CATEGORIES.find(
    (c) => c.id.toLowerCase() === category.toLowerCase()
  );

  const getCategoryImage = (cat: ServiceCategory | string) => {
    const norm = cat.toLowerCase();
    if (norm.includes('plomer')) return FIXIT_IMAGES.plumbing;
    if (norm.includes('electr')) return FIXIT_IMAGES.electricity;
    if (norm.includes('pintur')) return FIXIT_IMAGES.painting;
    return FIXIT_IMAGES.heroHome;
  };

  // Group services by section if specified (e.g. Plomería sections)
  const sections = useMemo(() => {
    const map = new Map<string, { description?: string; services: Service[] }>();
    const ungrouped: Service[] = [];

    services.forEach((s) => {
      if (s.section) {
        if (!map.has(s.section)) {
          map.set(s.section, {
            description: s.section_description,
            services: [],
          });
        }
        map.get(s.section)!.services.push(s);
      } else {
        ungrouped.push(s);
      }
    });

    return {
      grouped: Array.from(map.entries()).map(([title, data]) => ({
        title,
        description: data.description,
        services: data.services,
      })),
      ungrouped,
    };
  }, [services]);

  const renderServiceCard = (service: Service) => {
    const isWallMount = service.id === 'HOG-006' || service.service_name.toLowerCase().includes('wall mount');

    return (
      <button
        key={service.id}
        onClick={() => onSelectService(service)}
        className="w-full text-left bg-[#FFFEFA] hover:bg-[#FFFEFA] border border-[#DED4C5] hover:border-[#0B72D9] rounded-2xl p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col group active:scale-[0.99] cursor-pointer"
        id={`service-card-${service.id.toLowerCase()}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {isWallMount && (
              <div className="w-10 h-10 rounded-xl bg-[#0B72D9]/10 text-[#0B72D9] flex items-center justify-center shrink-0 border border-[#0B72D9]/20 mt-0.5">
                <Tv className="w-5 h-5 stroke-[2]" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h3 className="font-serif font-bold text-base text-[#1F2421] group-hover:text-[#0B72D9] transition-colors leading-snug">
                  {service.service_name}
                </h3>
                {service.badge && (
                  <span className="text-[10px] font-semibold bg-[#0B72D9]/10 text-[#0B72D9] border border-[#0B72D9]/20 px-2 py-0.5 rounded-full">
                    {service.badge}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#756A5D] leading-relaxed mb-3">
                {service.description}
              </p>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-[#F6F4EF] group-hover:bg-[#0B72D9]/10 group-hover:text-[#0B72D9] flex items-center justify-center shrink-0 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>

        {/* Opciones y tarifas detalladas para Wall Mount (HOG-006) */}
        {isWallMount && (
          <div className="mb-3 p-3 rounded-xl bg-[#F6F4EF]/80 border border-[#DED4C5]/80 space-y-1.5 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5 text-[#1F2421]">
              <span className="font-semibold text-[11px] text-[#082D60]">Solo Instalación (tienes soporte):</span>
              <span className="text-[11px] text-[#1F2421]">Hasta 55": <strong>$35.00</strong> • 65" en adelante: <strong>$50.00</strong></span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5 text-[#1F2421] pt-1.5 border-t border-[#DED4C5]/50">
              <span className="font-semibold text-[11px] text-[#53653D]">Combo Instalación + Soporte incluido:</span>
              <span className="text-[11px] text-[#1F2421]">Fijo/Inclinable: <strong>$50.00</strong> • Brazo Articulado: <strong>$65.00 – $75.00</strong></span>
            </div>
          </div>
        )}

        {/* Price & Meta Footer */}
        <div className="pt-2.5 border-t border-[#DED4C5]/50 flex items-center justify-between flex-wrap gap-2 text-xs">
          {service.diagnostic_required ? (
            <div className="flex items-center gap-1.5 text-[#B98A43] font-semibold text-xs">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Requiere evaluación • Diagnóstico ${service.diagnostic_price}</span>
            </div>
          ) : (
            <div className="flex items-baseline gap-1">
              <span className="text-[11px] text-[#756A5D]">
                {service.modalidad === 'Desde' || isWallMount ? 'Desde:' : 'Precio estándar:'}
              </span>
              <span className="font-serif font-bold text-base text-[#1F2421]">
                ${service.price.toFixed(2)}
              </span>
              <span className="text-[10px] text-[#756A5D] font-medium">USD</span>
            </div>
          )}

          <div className="flex items-center gap-2 text-[11px] text-[#756A5D]">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-[#756A5D]" />
              {service.estimated_duration}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-[#0B72D9]" />
              {service.warranty_days}d garantía
            </span>
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-3 sm:py-5 space-y-5">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-[#756A5D] hover:text-[#1F2421] p-2 rounded-xl hover:bg-[#DED4C5]/30 transition-colors active:scale-95 cursor-pointer"
          id="btn-back-to-categories"
        >
          <ArrowLeft className="w-4 h-4 stroke-[2]" />
          <span>Volver a categorías</span>
        </button>
        <span className="text-[11px] font-semibold text-[#0B72D9] uppercase tracking-wider bg-[#0B72D9]/10 px-2.5 py-1 rounded-full border border-[#0B72D9]/20">
          {categoryInfo?.name || category}
        </span>
      </div>

      {/* Category Header with Prominent Photography */}
      <div className="bg-[#FFFEFA] rounded-2xl sm:rounded-3xl border border-[#DED4C5] overflow-hidden shadow-2xs">
        <div className="relative w-full h-56 sm:h-64 overflow-hidden bg-[#F6F4EF]">
          <img
            src={getCategoryImage(category)}
            alt={categoryInfo?.name || category}
            className="w-full h-full object-cover object-center"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#082D60]/85 via-[#082D60]/30 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4 text-white space-y-1">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-white/20 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-white/20">
              <ShieldCheck className="w-3 h-3 text-white" />
              Catálogo Oficial FIXIT
            </span>
            <h1 className="text-xl sm:text-2xl font-serif font-bold leading-tight drop-shadow-xs">
              {categoryInfo?.name || category}
            </h1>
          </div>
        </div>
        <div className="p-4 sm:p-5">
          <p className="text-xs sm:text-sm text-[#756A5D] leading-relaxed">
            {categoryInfo?.description || 'Selecciona el trabajo que requieres para ver su precio estándar FIXIT:'}
          </p>
        </div>
      </div>

      {/* Services List / Sections */}
      <div className="space-y-6">
        {services.length === 0 ? (
          <div className="bg-[#FFFEFA] rounded-2xl p-6 text-center border border-[#DED4C5]">
            <p className="text-sm text-[#756A5D]">
              No hay servicios registrados en esta categoría temporalmente.
            </p>
          </div>
        ) : sections.grouped.length > 0 ? (
          /* Render by sections (e.g. Plomería Sections A & B) */
          sections.grouped.map((sec, secIdx) => (
            <section key={sec.title} className="space-y-3">
              <div className="bg-[#F6F4EF] border border-[#DED4C5] rounded-2xl p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#0B72D9] uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" />
                    Sección {String.fromCharCode(65 + secIdx)}
                  </span>
                  <span className="text-[11px] text-[#756A5D] font-medium">
                    {sec.services.length} {sec.services.length === 1 ? 'servicio' : 'servicios'}
                  </span>
                </div>
                <h2 className="font-serif font-bold text-base sm:text-lg text-[#1F2421]">
                  {sec.title}
                </h2>
                {sec.description && (
                  <p className="text-xs text-[#756A5D] leading-relaxed pt-0.5">
                    {sec.description}
                  </p>
                )}
              </div>

              <div className="space-y-3">
                {sec.services.map(renderServiceCard)}
              </div>
            </section>
          ))
        ) : (
          /* Standard ungrouped category list */
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-[#756A5D] uppercase tracking-wider">
                Servicios disponibles ({services.length})
              </span>
              <span className="text-[11px] text-[#756A5D]">Precios transparentes</span>
            </div>
            {services.map(renderServiceCard)}
          </div>
        )}

        {/* Any ungrouped services alongside sections */}
        {sections.grouped.length > 0 && sections.ungrouped.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-[#756A5D] uppercase tracking-wider">
                Otros servicios de {categoryInfo?.name || category}
              </span>
            </div>
            {sections.ungrouped.map(renderServiceCard)}
          </div>
        )}
      </div>
    </div>
  );
};
