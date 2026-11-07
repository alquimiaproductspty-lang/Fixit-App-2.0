import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { authService } from '../../lib/firebase';
import { mapAuthErrorToFriendlyMessage } from '../../lib/authErrors';
import { AuthForgotPasswordModal } from './AuthForgotPasswordModal';

interface AuthEmailFormProps {
  disabled?: boolean;
  onBusyChange?: (busy: boolean) => void;
  onError?: (message: string | null) => void;
  onSuccess?: () => void;
  onGoBack?: () => void;
}

export const AuthEmailForm: React.FC<AuthEmailFormProps> = ({
  disabled = false,
  onBusyChange,
  onError,
  onSuccess,
  onGoBack,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);

  const busy = disabled || submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!email.trim() || !password) {
      onError?.('Ingresa tu correo y contraseña para continuar.');
      return;
    }
    setSubmitting(true);
    onBusyChange?.(true);
    onError?.(null);
    try {
      await authService.loginWithEmail(email.trim(), password);
      if (onSuccess) {
        onSuccess();
      } else {
        onGoBack?.();
      }
    } catch (err: unknown) {
      console.error('[AuthEmailForm] Error al iniciar sesión con correo:', err);
      onError?.(mapAuthErrorToFriendlyMessage(err));
    } finally {
      setSubmitting(false);
      onBusyChange?.(false);
    }
  };

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <Mail className="w-4 h-4 text-[#756A5D] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={busy}
            className="w-full pl-10 pr-3.5 py-3 rounded-2xl border border-[#DED4C5] bg-white text-sm text-[#1F2421] placeholder:text-[#756A5D]/70 focus:outline-none focus:border-[#0B72D9] focus:ring-2 focus:ring-[#0B72D9]/15 disabled:opacity-50"
            id="input-login-email"
          />
        </div>
        <div className="relative">
          <Lock className="w-4 h-4 text-[#756A5D] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type={showPassword ? 'text' : 'password'}
            required
            autoComplete="current-password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={busy}
            className="w-full pl-10 pr-11 py-3 rounded-2xl border border-[#DED4C5] bg-white text-sm text-[#1F2421] placeholder:text-[#756A5D]/70 focus:outline-none focus:border-[#0B72D9] focus:ring-2 focus:ring-[#0B72D9]/15 disabled:opacity-50"
            id="input-login-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            disabled={busy}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#756A5D] hover:text-[#082D60] transition-colors cursor-pointer disabled:opacity-50"
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <button
          type="submit"
          disabled={busy}
          className="w-full py-3.5 px-4 rounded-2xl bg-[#082D60] hover:bg-[#07244D] text-white font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-[0.99] disabled:opacity-50"
          id="btn-email-login"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Verificando...</span>
            </>
          ) : (
            <span>Iniciar sesión</span>
          )}
        </button>
      </form>
      <button
        type="button"
        onClick={() => setForgotOpen(true)}
        disabled={busy}
        className="text-xs font-semibold text-[#0B72D9] hover:underline cursor-pointer disabled:opacity-50"
      >
        ¿Olvidaste tu contraseña?
      </button>
      <AuthForgotPasswordModal
        isOpen={forgotOpen}
        onClose={() => setForgotOpen(false)}
        initialEmail={email}
      />
    </div>
  );
};
