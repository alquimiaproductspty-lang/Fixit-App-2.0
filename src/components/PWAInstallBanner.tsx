import React from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Share2, X, Smartphone, PlusSquare } from 'lucide-react';
import { FixitAppIcon } from './FixitLogo';

export const PWAInstallBanner: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = React.useState(false);
  const [dismissed, setDismissed] = React.useState(false);

  if (isInstalled || dismissed) return null;

  return (
    <>
      {/* Android / Chromium PWA Banner */}
      {isInstallable && (
        <div className="bg-[#082D60] text-white px-4 py-2.5 text-xs sm:text-sm flex items-center justify-between shadow-md border-b border-[#0988F5]/30">
          <div className="flex items-center gap-2.5">
            <FixitAppIcon size={26} theme="dark" rounded={6} />
            <span>
              Instala <strong>FIXIT</strong> en tu pantalla de inicio para acceso directo y rápido.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-3">
            <button
              onClick={install}
              className="bg-[#0988F5] text-white hover:bg-[#0770cb] font-semibold px-3 py-1 rounded-full text-xs transition-colors flex items-center gap-1.5 shadow-sm active:scale-95"
              id="btn-pwa-install-banner"
            >
              <Download className="w-3.5 h-3.5 stroke-[2]" />
              Instalar App
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="text-white/70 hover:text-white p-1 rounded-full transition-colors"
              aria-label="Cerrar aviso de instalación"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* iOS Safari Guide Banner */}
      {isIOS && !isInstallable && (
        <div className="bg-[#082D60] text-white px-4 py-2 text-xs flex items-center justify-between border-b border-[#0988F5]/30">
          <div className="flex items-center gap-2">
            <FixitAppIcon size={22} theme="dark" rounded={5} />
            <span>
              Disponible como App en tu iPhone: agrega <strong>FIXIT</strong> a tu pantalla de inicio.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-2">
            <button
              onClick={() => setShowIOSModal(true)}
              className="bg-[#0988F5] text-white hover:bg-[#0770cb] font-medium px-2.5 py-1 rounded-full text-[11px] transition-colors cursor-pointer"
              id="btn-pwa-ios-guide"
            >
              Ver pasos
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="text-white/70 hover:text-white p-1"
              aria-label="Cerrar aviso"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* iOS Safari Modal Walkthrough */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#082D60]/70 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl bg-[#FFFEFA] p-6 shadow-2xl border border-[#DED4C5] text-[#2A211B]">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#DED4C5]/40">
              <div className="flex items-center gap-3">
                <FixitAppIcon size={44} theme="dark" rounded={12} />
                <div>
                  <h3 className="text-base font-serif font-bold text-[#082D60]">Instalar FIXIT en iPhone</h3>
                  <p className="text-[11px] text-[#756A5D]">Icono oficial en tu pantalla principal</p>
                </div>
              </div>
              <button
                onClick={() => setShowIOSModal(false)}
                className="p-1.5 text-[#756A5D] hover:text-[#082D60] rounded-full hover:bg-[#F6F4EF] transition-colors"
                aria-label="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#756A5D] mb-4 leading-relaxed">
              Agrega FIXIT a tu iPhone o iPad para abrirlo a pantalla completa como una app nativa con su icono corporativo:
            </p>

            <ol className="space-y-3.5 text-xs text-[#2A211B] mb-6">
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#082D60] text-white font-bold flex items-center justify-center shrink-0 text-[11px]">
                  1
                </span>
                <span>
                  Toca el botón <strong>Compartir</strong>{' '}
                  <Share2 className="w-3.5 h-3.5 inline mx-1 text-[#0988F5]" /> en la barra inferior de Safari.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#082D60] text-white font-bold flex items-center justify-center shrink-0 text-[11px]">
                  2
                </span>
                <span>
                  Baja en el menú y selecciona{' '}
                  <strong>"Agregar a pantalla de inicio"</strong>{' '}
                  <PlusSquare className="w-3.5 h-3.5 inline mx-0.5 text-[#082D60]" />.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#082D60] text-white font-bold flex items-center justify-center shrink-0 text-[11px]">
                  3
                </span>
                <span>
                  Confirma el nombre <strong>"FIXIT"</strong> y toca <strong>"Agregar"</strong> arriba a la derecha.
                </span>
              </li>
            </ol>

            <div className="bg-[#F6F4EF] rounded-2xl p-3 mb-5 border border-[#DED4C5] flex items-center gap-3">
              <FixitAppIcon size={36} theme="dark" rounded={10} />
              <div className="text-[11px] text-[#082D60]">
                <strong>Icono verificado FIXIT</strong>
                <p className="text-[#756A5D]">Fondo azul oscuro con herramientas en negativo.</p>
              </div>
            </div>

            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full rounded-2xl bg-[#082D60] text-white py-3 text-xs font-semibold hover:bg-[#061e40] transition-colors shadow-sm"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
};

