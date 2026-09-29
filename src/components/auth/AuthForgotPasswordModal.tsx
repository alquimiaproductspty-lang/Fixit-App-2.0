import React, { useState } from 'react';
import { X, Mail, CheckCircle2, ArrowLeft, Loader2 } from 'lucide-react';
import { authService } from '../../lib/firebase';
import { mapAuthErrorToFriendlyMessage } from '../../lib/authErrors';

interface AuthForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEmail?: string;
}

export const AuthForgotPasswordModal: React.FC<AuthForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  initialEmail = '',
}) => {
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMessage('Por favor ingresa tu correo electrónico.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      await authService.resetPassword(email.trim());
      setSentSuccess(true);
    } catch (err: unknown) {
      setErrorMessage(mapAuthErrorToFriendlyMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResetState = () => {
    setSentSuccess(false);
    setErrorMessage(null);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="forgot-password-title"
    >
      <div className="bg-[#FFFEFA] border border-[#DED4C5] rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-[#DED4C5]/60 pb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetState}
              className="p-1 rounded-full text-[#756A5D] hover:bg-[#DED4C5]/30 transition-colors cursor-pointer"
              aria-label="Cerrar modal de recuperación"
            >
              <ArrowLeft className="w-5 h-5 text-[#082D60]" />
            </button>
            <h3 id="forgot-password-title" className="text-base font-serif font-bold text-[#082D60]">
              Recuperar contraseña
            </h3>
          </div>
          <button
            type="button"
            onClick={handleResetState}
            className="p-1.5 rounded-full text-[#756A5D] hover:bg-[#DED4C5]/30 transition-colors cursor-pointer"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {sentSuccess ? (
          <div className="space-y-4 py-2 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-[#082D60]">Correo de recuperación enviado</h4>
              <p className="text-xs text-[#756A5D] max-w-xs mx-auto">
                Hemos enviado un enlace a <span className="font-semibold text-[#082D60]">{email}</span>. 
                Revisa tu bandeja de entrada o spam para restablecer tu contraseña.
              </p>
            </div>
            <button
              type="button"
              onClick={handleResetState}
              className="w-full py-2.5 px-4 rounded-xl bg-[#082D60] text-white font-semibold text-xs hover:bg-[#062248] transition-all cursor-pointer shadow-xs"
            >
              Entendido, volver
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <p className="text-xs text-[#756A5D] leading-relaxed">
              Ingresa el correo electrónico asociado a tu cuenta de FIXIT y te enviaremos instrucciones para restablecer tu acceso.
            </p>

            {errorMessage && (
              <div 
                className="p-3 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-900 text-xs flex items-start gap-2"
                role="alert"
              >
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="reset-email-input" className="block font-semibold text-[#082D60]">
                Correo electrónico
              </label>
              <div className="relative">
                <input
                  id="reset-email-input"
                  type="email"
                  required
                  autoFocus
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@correo.com"
                  className="w-full p-2.5 pl-9 rounded-xl border border-[#DED4C5] bg-[#F6F4EF] text-[#082D60] placeholder-[#756A5D]/60 focus:bg-[#FFFEFA] focus:border-[#0988F5] focus:outline-none transition-colors"
                />
                <Mail className="w-4 h-4 text-[#756A5D] absolute left-3 top-3 pointer-events-none" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-[#082D60] text-white font-semibold text-xs hover:bg-[#062248] active:scale-[0.99] transition-all cursor-pointer shadow-xs disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Enviando enlace...</span>
                </>
              ) : (
                <span>Enviar enlace de recuperación</span>
              )}
            </button>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={handleResetState}
                className="text-xs font-semibold text-[#0988F5] hover:underline cursor-pointer"
              >
                Volver a iniciar sesión
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
