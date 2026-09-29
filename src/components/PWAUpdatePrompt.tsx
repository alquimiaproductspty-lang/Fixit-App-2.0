import React from 'react';
import { PWAUpdateState } from '../hooks/usePWAUpdate';
import { Sparkles, RefreshCw, X, ArrowUpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PWAUpdatePromptProps {
  updateState: PWAUpdateState;
}

export const PWAUpdatePrompt: React.FC<PWAUpdatePromptProps> = ({ updateState }) => {
  const {
    hasUpdate,
    dismissed,
    isUpdating,
    serverVersion,
    currentVersion,
    applyUpdate,
    dismissUpdate,
  } = updateState;

  // If no update is available or dismissed by user, do not render anything
  if (!hasUpdate || dismissed) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.95 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="fixed bottom-4 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md z-50 pointer-events-auto"
        id="pwa-update-modal-notice"
        role="dialog"
        aria-labelledby="pwa-update-title"
        aria-describedby="pwa-update-desc"
      >
        <div className="bg-[#082D60] text-white rounded-2xl p-4 sm:p-5 shadow-2xl border border-[#B98A43]/40 backdrop-blur-md relative overflow-hidden">
          {/* Subtle gold brand accent glow */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#B98A43]/10 rounded-full blur-2xl pointer-events-none" />

          {/* Close / Dismiss button (top-right) */}
          <button
            onClick={dismissUpdate}
            disabled={isUpdating}
            className="absolute top-3 right-3 p-1.5 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Posponer actualización"
            aria-label="Cerrar aviso"
            id="btn-pwa-dismiss-x"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-start gap-3.5 pr-6">
            <div className="w-10 h-10 rounded-xl bg-[#B98A43] text-white flex items-center justify-center shrink-0 shadow-md">
              <ArrowUpCircle className="w-5 h-5 text-[#082D60]" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-[#B98A43]/25 text-[#E6C687] px-2 py-0.5 rounded-md">
                  PWA FIXIT {serverVersion !== currentVersion ? `v${serverVersion}` : 'Nueva Versión'}
                </span>
              </div>
              <h3
                id="pwa-update-title"
                className="font-serif font-bold text-base sm:text-lg text-white leading-snug"
              >
                Hay una nueva versión de FIXIT disponible.
              </h3>
              <p
                id="pwa-update-desc"
                className="text-xs text-white/80 leading-relaxed"
              >
                Actualiza ahora para utilizar las últimas mejoras y correcciones.
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={dismissUpdate}
              disabled={isUpdating}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              id="btn-pwa-update-later"
            >
              Más tarde
            </button>
            <button
              type="button"
              onClick={applyUpdate}
              disabled={isUpdating}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#B98A43] text-[#082D60] font-bold text-xs shadow-md hover:bg-[#c9984e] active:scale-95 transition-all cursor-pointer"
              id="btn-pwa-update-now"
            >
              {isUpdating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#082D60]" />
                  <span>Actualizando...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-[#082D60]" />
                  <span>Actualizar ahora</span>
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
