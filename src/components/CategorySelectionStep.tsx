import React from 'react';
import { Service, ServiceCategory } from '../types';
import { FIXIT_CATEGORIES } from '../data/catalog';
import { FIXIT_IMAGES } from '../assets/images';
import { FixitLogo } from './FixitLogo';
import {
  Wrench,
  Zap,
  Home,
  Paintbrush,
  ChevronRight,
  ShieldCheck,
  BadgeCheck,
} from 'lucide-react';

interface CategorySelectionStepProps {
  onSelectCategory: (category: ServiceCategory) => void;
  onSelectService?: (service: Service) => void;
  onOpenWhatsAppDirect?: () => void;
}

export const CategorySelectionStep: React.FC<CategorySelectionStepProps> = ({
  onSelectCategory,
  onOpenWhatsAppDirect,
}) => {
  const activeCategories = FIXIT_CATEGORIES
    .filter((c) => c.isAvailable)
    .sort((a, b) => (a.sortOrder || 99) - (b.sortOrder || 99));

  const getCategoryIcon = (category: ServiceCategory) => {
    switch (category) {
      case 'Plomería':
        return <Wrench className="w-4 h-4 text-[#53653D]" />;
      case 'Electricidad':
        return <Zap className="w-4 h-4 text-[#B98A43]" />;
      case 'Pintura':
      case 'Pintura residencial':
        return <Paintbrush className="w-4 h-4 text-[#B98A43]" />;
      case 'Reparaciones del hogar':
      default:
        return <Home className="w-4 h-4 text-[#082D60]" />;
    }
  };

  const getCategoryImage = (category: ServiceCategory) => {
    switch (category) {
      case 'Plomería':
        return FIXIT_IMAGES.plumbing;
      case 'Electricidad':
        return FIXIT_IMAGES.electricity;
      case 'Pintura':
      case 'Pintura residencial':
        return FIXIT_IMAGES.painting;
      case 'Reparaciones del hogar':
      default:
        return FIXIT_IMAGES.heroHome;
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-3 sm:py-5 space-y-5">
      {/* Brand Header Banner */}
      <section className="bg-[#FFFEFA] rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-[#DED4C5] shadow-2xs text-center relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-[#0B72D9]/5 rounded-full blur-2xl pointer-events-none" />
        <div className="flex justify-center mb-2.5">
          <FixitLogo variant="horizontal" size="lg" showTagline={true} showSlogan={true} />
        </div>
        <p className="text-xs sm:text-sm text-[#756A5D] max-w-md mx-auto leading-relaxed mt-1.5">
          Servicios de mantenimiento y reparaciones residenciales en Ciudad de Panamá.
          Técnicos idóneos, precios estándar claros y atención inmediata.
        </p>

        <div className="mt-3.5 pt-3 border-t border-[#DED4C5]/60 flex items-center justify-center gap-3 sm:gap-4 text-[11px] text-[#756A5D] font-medium flex-wrap">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#0B72D9]" />
            Garantía 30 días
          </span>
          <span className="text-[#DED4C5]">•</span>
          <span className="flex items-center gap-1">
            <BadgeCheck className="w-3.5 h-3.5 text-[#53653D]" />
            Precio estándar sin sorpresas
          </span>
        </div>
      </section>

      {/* Main Question & Active Services Categories Section */}
      <section className="space-y-3.5 animate-in fade-in duration-200">
        <div className="text-center sm:text-left px-0.5">
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#1F2421]">
            ¿Qué necesitas solucionar?
          </h2>
          <p className="text-xs sm:text-sm text-[#756A5D] mt-0.5">
            Selecciona el tipo de servicio para ver los precios estándar disponibles:
          </p>
        </div>

        {/* Active Categories Grid with High-Impact Photography */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-4.5">
          {activeCategories.map((cat) => {
            return (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(cat.id)}
                className="group text-left bg-[#FFFEFA] hover:bg-[#FFFEFA] border border-[#DED4C5] hover:border-[#0B72D9] rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xs hover:shadow-xs transition-all flex flex-col active:scale-[0.985] cursor-pointer"
                id={`cat-card-${cat.id.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {/* 1. Fotografía grande y atractiva con mayor aprovechamiento visual */}
                <div className="relative w-full h-60 sm:h-64 overflow-hidden bg-[#F6F4EF] rounded-t-2xl sm:rounded-t-3xl">
                  <img
                    src={getCategoryImage(cat.id)}
                    alt={cat.name}
                    loading="eager"
                    decoding="sync"
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent opacity-70 group-hover:opacity-50 transition-opacity" />
                </div>

                {/* Contenido de la tarjeta con jerarquía estructurada */}
                <div className="p-4 sm:p-4.5 flex-1 flex flex-col justify-between">
                  <div>
                    {/* 2. Icono de la categoría + 3. Nombre del servicio */}
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <div className="w-8 h-8 rounded-xl bg-[#F6F4EF] flex items-center justify-center shrink-0 border border-[#DED4C5]/60 group-hover:border-[#0B72D9]/40 group-hover:bg-[#0B72D9]/5 transition-colors">
                        {getCategoryIcon(cat.id)}
                      </div>
                      <h3 className="font-serif font-bold text-base sm:text-lg text-[#1F2421] group-hover:text-[#0B72D9] transition-colors leading-snug flex-1">
                        {cat.name}
                      </h3>
                      <ChevronRight className="w-4 h-4 text-[#756A5D] group-hover:text-[#0B72D9] group-hover:translate-x-0.5 transition-all shrink-0" />
                    </div>

                    {/* 4. Descripción breve */}
                    <p className="text-xs sm:text-[13px] text-[#756A5D] leading-relaxed line-clamp-2">
                      {cat.tagline}
                    </p>
                  </div>

                  {/* 5. Enlace "Ver servicios disponibles" + 6. Texto "Precios FIXIT" */}
                  <div className="mt-3.5 pt-2.5 border-t border-[#DED4C5]/40 flex items-center justify-between text-xs font-semibold">
                    <span className="text-[#0B72D9] group-hover:underline flex items-center gap-1">
                      Ver servicios disponibles
                    </span>
                    <span className="text-[11px] text-[#756A5D] font-normal">
                      Precios FIXIT
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* 3. Bloque Compacto de Contacto por WhatsApp para Servicios Diferentes */}
      <section className="pt-0.5">
        <button
          type="button"
          onClick={onOpenWhatsAppDirect}
          className="w-full group bg-[#FFFEFA] hover:bg-[#FBF9F4] border border-[#DED4C5] hover:border-[#25D366]/60 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-all flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left active:scale-[0.99] cursor-pointer"
          id="btn-whatsapp-custom-service"
        >
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <div className="w-10 h-10 rounded-xl bg-[#25D366]/10 text-[#25D366] flex items-center justify-center shrink-0 border border-[#25D366]/20 group-hover:scale-105 transition-transform">
              <img
                src="/whatsapp-icon.webp"
                alt="WhatsApp"
                className="w-7 h-7 object-contain"
              />
            </div>
            <div className="space-y-0.5">
              <p className="text-xs sm:text-sm font-semibold text-[#1F2421] leading-snug">
                ¿Requieres un servicio diferente?
              </p>
              <p className="text-xs text-[#0B72D9] font-medium leading-snug group-hover:underline">
                Escríbenos directamente por WhatsApp
              </p>
            </div>
          </div>
          <div className="hidden sm:flex w-7 h-7 rounded-lg bg-[#F6F4EF] group-hover:bg-[#25D366]/10 items-center justify-center shrink-0 text-[#756A5D] group-hover:text-[#25D366] transition-colors">
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </button>
      </section>
    </div>
  );
};
