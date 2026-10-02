import React from 'react';
import { APP_VERSION } from '../config/version';

interface FooterProps {
  version?: string;
  hasUpdate?: boolean;
}

export const Footer: React.FC<FooterProps> = ({
  version = APP_VERSION,
  hasUpdate = false,
}) => {
  return (
    <footer className="bg-slate-50/80 border-t border-slate-200 py-8 px-4 text-center">
      <div className="max-w-xl mx-auto space-y-4">
        {/* Cabecera del Footer */}
        <h3 className="font-semibold text-base sm:text-lg text-[#082D60] tracking-tight">
          FIXIT • Soluciones para tu hogar
        </h3>

        {/* Cobertura y Especialidad */}
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-xl mx-auto">
          Técnicos idóneos en Ciudad de Panamá. Plomería, electricidad, reparaciones del hogar y pintura residencial.
        </p>

        {/* Canal Directo WhatsApp (Pill Button Moderno) */}
        <div className="pt-2 flex justify-center">
          <a
            href="https://wa.me/50765356072"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Contactar a FIXIT por WhatsApp"
            className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-white border border-slate-200 hover:border-[#25D366] text-slate-700 hover:text-slate-900 shadow-xs hover:shadow-md transition-all duration-200 text-xs sm:text-sm group cursor-pointer"
          >
            <img
              src="/whatsapp-icon.webp"
              alt="WhatsApp"
              className="w-5 h-5 object-contain transition-transform group-hover:scale-110"
            />
            <span>
              WhatsApp:{' '}
              <strong className="font-bold text-slate-900 group-hover:text-[#25D366] transition-colors">
                +507 6535-6072
              </strong>
            </span>
          </a>
        </div>

        {/* Micro-información: Copyright y Versión */}
        <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
          <p>© 2026 FIXIT Panamá. Todos los derechos reservados.</p>
          <div className="flex items-center gap-1.5 font-mono">
            <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] text-slate-500 font-semibold border border-slate-200/60">
              v{version}
            </span>
            {hasUpdate && (
              <span
                className="w-2 h-2 rounded-full bg-[#B98A43] animate-pulse"
                title="Actualización disponible"
              />
            )}
          </div>
        </div>
      </div>
    </footer>
  );
};
