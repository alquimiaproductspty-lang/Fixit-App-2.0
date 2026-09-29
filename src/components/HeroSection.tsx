import React from 'react';
import { Camera, ListFilter, ShieldCheck, Tag, Sparkles, MessageSquare } from 'lucide-react';
import { FIXIT_IMAGES } from '../assets/images';
import { FixitLogo } from './FixitLogo';

interface HeroSectionProps {
  onTakePhoto: () => void;
  onSelectService: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onTakePhoto,
  onSelectService,
}) => {
  return (
    <section className="w-full pb-6 pt-2 sm:pt-4">
      <div className="max-w-xl mx-auto px-4 sm:px-6">
        
        {/* Official FIXIT Logo Centered with "Soluciones para tu hogar" and Slogan */}
        <div className="flex flex-col items-center text-center pt-2 pb-4">
          <FixitLogo variant="full" size="lg" className="mb-2" />
        </div>

        {/* Message requested: "Arreglar tu hogar, sin complicaciones." */}
        <div className="text-center mb-5">
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#082D60] tracking-tight leading-snug mb-2">
            Arreglar tu hogar, <span className="text-[#0988F5] font-normal italic">sin complicaciones.</span>
          </h1>
          <p className="text-[#756A5D] text-xs sm:text-sm leading-relaxed max-w-md mx-auto">
            Un hogar bonito merece soluciones cuidadas. Plomería, electricidad, reparaciones del hogar y pintura residencial en Ciudad de Panamá con precios por adelantado y técnicos propios.
          </p>
        </div>

        {/* Launch Discount Badge in Gold Brass detail */}
        <div className="flex justify-center mb-5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FFFEFA] border border-[#B98A43]/40 text-[#082D60] text-xs font-semibold tracking-wide shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-[#B98A43]"></span>
            <span className="text-[#B98A43] font-bold">20% off</span>
            <span className="text-[#756A5D]">en servicios residenciales de lanzamiento</span>
          </div>
        </div>

        {/* Luminous and Wide Home Sanctuary Image */}
        <div className="relative w-full h-56 sm:h-64 rounded-3xl overflow-hidden mb-6 shadow-sm border border-[#DED4C5] bg-[#DED4C5]/30">
          <img
            src={FIXIT_IMAGES.heroHome}
            alt="Espacio residencial sereno, luminoso y cuidado en Ciudad de Panamá"
            className="w-full h-full object-cover object-center"
            referrerPolicy="no-referrer"
          />
          {/* Elegant gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#082D60]/85 via-[#082D60]/25 to-transparent flex flex-col justify-end p-5 text-[#FFFEFA]">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0988F5]"></span>
              <span className="text-[11px] font-medium uppercase tracking-widest text-[#DED4C5]">
                Plomería • Electricidad • Reparaciones • Pintura
              </span>
            </div>
            <p className="text-sm sm:text-base font-serif font-semibold text-[#FFFEFA]">
              Técnicos idóneos certificados en Ciudad de Panamá
            </p>
          </div>
        </div>

        {/* Action Card: Porcelain surface */}
        <div className="bg-[#FFFEFA] rounded-3xl p-5 sm:p-6 shadow-2xs border border-[#DED4C5] mb-6">
          <p className="text-center text-[11px] font-semibold uppercase tracking-widest text-[#756A5D] mb-1.5">
            Paso 1 de 4
          </p>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-center text-[#082D60] mb-5 tracking-tight">
            ¿Cómo podemos ayudarte hoy?
          </h2>

          <div className="space-y-3">
            {/* Primary Action Button: FIXI Navy with White Text */}
            <button
              onClick={onTakePhoto}
              className="w-full bg-[#082D60] hover:bg-[#062248] text-white py-4 px-6 rounded-2xl font-semibold text-sm sm:text-base shadow-sm transition-all flex items-center justify-center gap-3 active:scale-[0.99] border border-[#082D60]"
              id="btn-hero-take-photo"
            >
              <div className="w-8 h-8 rounded-full bg-[#0988F5]/30 flex items-center justify-center text-white">
                <Camera className="w-4 h-4 stroke-[2]" />
              </div>
              <span>Tomar o subir una foto</span>
            </button>

            {/* Secondary Action Button: Electric Blue FIXI Border */}
            <button
              onClick={onSelectService}
              className="w-full bg-transparent hover:bg-[#0988F5]/5 border-2 border-[#0988F5] text-[#0988F5] py-3.5 px-6 rounded-2xl font-semibold text-sm transition-all flex items-center justify-center gap-2.5 active:scale-[0.99]"
              id="btn-hero-select-catalog"
            >
              <ListFilter className="w-4 h-4 text-[#0988F5] stroke-[2]" />
              <span>Elegir un servicio del catálogo</span>
            </button>
          </div>

          <p className="text-center text-xs text-[#756A5D] mt-3.5">
            Sube hasta 3 fotos para que identifiquemos la solución recomendada.
          </p>
        </div>

        {/* Value Proposition Callouts */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-[#FFFEFA] border border-[#DED4C5] rounded-2xl p-4 flex sm:flex-col items-center sm:items-start gap-3 sm:gap-2 shadow-2xs">
            <div className="w-8 h-8 rounded-xl bg-[#F6F4EF] text-[#B98A43] flex items-center justify-center shrink-0 border border-[#DED4C5]/60">
              <Tag className="w-4 h-4 stroke-[1.75]" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#2A211B]">Precio claro</p>
              <p className="text-[11px] text-[#756A5D] leading-tight">Sin tarifas ocultas ni sorpresas al llegar.</p>
            </div>
          </div>

          <div className="bg-[#FFFEFA] border border-[#DED4C5] rounded-2xl p-4 flex sm:flex-col items-center sm:items-start gap-3 sm:gap-2 shadow-2xs">
            <div className="w-8 h-8 rounded-xl bg-[#F6F4EF] text-[#53653D] flex items-center justify-center shrink-0 border border-[#DED4C5]/60">
              <ShieldCheck className="w-4 h-4 stroke-[1.75]" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#2A211B]">Técnicos propios</p>
              <p className="text-[11px] text-[#756A5D] leading-tight">Personal FIXI calificado y de confianza.</p>
            </div>
          </div>

          <div className="bg-[#FFFEFA] border border-[#DED4C5] rounded-2xl p-4 flex sm:flex-col items-center sm:items-start gap-3 sm:gap-2 shadow-2xs">
            <div className="w-8 h-8 rounded-xl bg-[#F6F4EF] text-[#53653D] flex items-center justify-center shrink-0 border border-[#DED4C5]/60">
              <MessageSquare className="w-4 h-4 stroke-[1.75]" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#2A211B]">Vía WhatsApp</p>
              <p className="text-[11px] text-[#756A5D] leading-tight">Coordinación directa, ágil y personalizada.</p>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};
