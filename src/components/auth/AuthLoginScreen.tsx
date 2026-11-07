import React, { useState } from 'react';
import { FixitLogo } from '../FixitLogo';
import { ArrowLeft, Loader2, ShieldCheck, CheckCircle2, Sparkles, User } from 'lucide-react';
import { authService } from '../../lib/firebase';
import { mapAuthErrorToFriendlyMessage } from '../../lib/authErrors';
import { AuthEmailForm } from './AuthEmailForm';

interface AuthLoginScreenProps {
  onSuccess?: () => void;
  onNavigateToRegister?: () => void;
  onGoBack?: () => void;
  hideGuest?: boolean;
  showBack?: boolean;
  title?: string;
  subtitle?: string;
}

export const AuthLoginScreen: React.FC<AuthLoginScreenProps> = ({
  onSuccess,
  onGoBack,
  hideGuest = false,
  showBack = true,
  title = 'Bienvenido a FIXIT',
  subtitle = 'Inicia sesión con tu cuenta de administrador u operador para acceder al panel.',
}) => {
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isGuestLoading, setIsGuestLoading] = useState(false);
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isBusy = isGoogleLoading || isGuestLoading || isEmailLoading;

  const handleGoogleSignIn = async () => {
    if (isBusy) return;
    setIsGoogleLoading(true);
    setErrorMessage(null);

    try {
      await authService.loginWithGoogle();
      if (onSuccess) {
        onSuccess();
      } else {
        onGoBack?.();
      }
    } catch (err: unknown) {
      const errCode = (err as { code?: string })?.code;
      if (errCode === 'auth/unauthorized-domain') {
        console.error(
          '[AuthLoginScreen] Google Auth falló por auth/unauthorized-domain. Verifica la lista de dominios autorizados en Firebase Console (Authentication > Settings > Authorized domains).'
        );
      } else if (errCode === 'auth/popup-blocked') {
        console.error('[AuthLoginScreen] Google Auth falló por auth/popup-blocked. La ventana emergente fue bloqueada por el navegador.');
      } else if (errCode === 'auth/popup-closed-by-user') {
        console.warn('[AuthLoginScreen] El usuario cerró la ventana emergente de Google antes de completar la verificación.');
      } else if (errCode === 'auth/admin-restricted-operation') {
        console.error('[AuthLoginScreen] Google Auth falló por auth/admin-restricted-operation. Operación restringida en Firebase Console.');
      } else {
        console.error('[AuthLoginScreen] Error al iniciar sesión con Google:', err);
      }
      setErrorMessage(mapAuthErrorToFriendlyMessage(err));
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleGuestSignIn = async () => {
    if (isBusy) return;
    setIsGuestLoading(true);
    setErrorMessage(null);

    try {
      await authService.loginAnonymously();
      if (onSuccess) {
        onSuccess();
      } else {
        onGoBack?.();
      }
    } catch (err: unknown) {
      const errCode = (err as { code?: string })?.code;
      if (errCode === 'auth/admin-restricted-operation' || errCode === 'auth/operation-not-allowed') {
        console.warn(
          `[AuthLoginScreen] Aviso: ${errCode}. Para usar cuentas anónimas nativas en Firebase, activa el proveedor "Anónimo" en Firebase Console (Authentication > Sign-in method > Anónimo).`,
          err
        );
      } else {
        console.error('[AuthLoginScreen] Error al iniciar sesión como invitado:', err);
      }
      setErrorMessage(mapAuthErrorToFriendlyMessage(err));
    } finally {
      setIsGuestLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F4EF] flex flex-col justify-between py-6 px-4 sm:px-6">
      {/* Top Bar with Go Back */}
      <header className="max-w-md w-full mx-auto flex items-center justify-between">
        {showBack && onGoBack ? (
          <button
            type="button"
            onClick={onGoBack}
            disabled={isBusy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FFFEFA] border border-[#DED4C5] text-xs font-semibold text-[#1F2421] hover:bg-[#DED4C5]/30 transition-colors shadow-2xs active:scale-95 cursor-pointer disabled:opacity-50"
            id="btn-login-back"
            aria-label="Volver atrás"
          >
            <ArrowLeft className="w-4 h-4 text-[#756A5D]" />
            <span>Volver</span>
          </button>
        ) : (
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#082D60]">
            <ShieldCheck className="w-4 h-4 text-[#0B72D9]" />
            <span>Consola de Operaciones</span>
          </div>
        )}

        <span className="text-[11px] font-medium text-[#756A5D]">
          Acceso seguro FIXIT
        </span>
      </header>

      {/* Main Login Card */}
      <main className="max-w-md w-full mx-auto my-auto py-6">
        <div className="bg-[#FFFEFA] border border-[#DED4C5] rounded-3xl p-6 sm:p-8 shadow-md shadow-[#082D60]/5 space-y-6 text-center">
          {/* Brand Header */}
          <div className="space-y-2">
            <div className="flex justify-center mb-1">
              <FixitLogo variant="horizontal" size={46} />
            </div>
            <p className="text-xs font-medium text-[#756A5D]">
              Panel de Administración y Control
            </p>
            <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#082D60] pt-1">
              {title}
            </h1>
            <p className="text-xs text-[#756A5D] max-w-xs mx-auto leading-relaxed">
              {subtitle}
            </p>
          </div>

          {/* Friendly Error Banner */}
          {errorMessage && (
            <div 
              className="p-3.5 rounded-2xl bg-amber-50/90 border border-amber-200 text-amber-900 text-xs leading-relaxed transition-all text-left"
              role="alert"
            >
              <p>{errorMessage}</p>
            </div>
          )}

          {/* Main Action Buttons */}
          <div className="pt-2 pb-1 space-y-3">
            {/* Email / Password Sign-In */}
            <AuthEmailForm
              disabled={isBusy}
              onBusyChange={setIsEmailLoading}
              onError={setErrorMessage}
              onSuccess={onSuccess}
              onGoBack={onGoBack}
            />

            {/* Divider */}
            <div className="flex items-center gap-3 py-1">
              <span className="flex-1 h-px bg-[#DED4C5]/70" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#756A5D]">o</span>
              <span className="flex-1 h-px bg-[#DED4C5]/70" />
            </div>

            {/* Google Sign-In Main Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isBusy}
              className="w-full py-4 px-6 rounded-2xl bg-white hover:bg-[#FDFCF9] border-2 border-[#DED4C5] hover:border-[#0B72D9] text-[#082D60] font-semibold text-sm sm:text-base transition-all flex items-center justify-center gap-3 cursor-pointer shadow-sm hover:shadow-md active:scale-[0.99] disabled:opacity-50 group"
              id="btn-google-login"
            >
              {isGoogleLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-[#082D60]" />
                  <span>Conectando con Google...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 shrink-0 group-hover:scale-105 transition-transform" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continuar con Google</span>
                </>
              )}
            </button>

            {/* Guest / Explore Without Account Button (Oculto en entorno CRM interno) */}
            {!hideGuest && (
              <>
                <button
                  type="button"
                  onClick={handleGuestSignIn}
                  disabled={isBusy}
                  className="w-full py-3 px-4 rounded-2xl bg-[#F6F4EF] hover:bg-[#EFECE4] active:scale-[0.99] text-[#756A5D] hover:text-[#082D60] font-semibold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer border border-[#DED4C5]/80 disabled:opacity-50"
                  id="btn-guest-login"
                >
                  {isGuestLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#756A5D]" />
                      <span>Iniciando como invitado...</span>
                    </>
                  ) : (
                    <>
                      <User className="w-4 h-4 text-[#756A5D]" />
                      <span>Continuar como Invitado</span>
                    </>
                  )}
                </button>
                <p className="text-[11px] text-[#756A5D]/80">
                  Explora servicios y cotiza de inmediato sin necesidad de registro
                </p>
              </>
            )}
          </div>

          {/* Benefits & Trust Points */}
          <div className="pt-2 border-t border-[#DED4C5]/60 space-y-2.5 text-left">
            <div className="flex items-center gap-2.5 text-xs text-[#756A5D]">
              <CheckCircle2 className="w-4 h-4 text-[#0B72D9] shrink-0" />
              <span>Acceso inmediato a tus cotizaciones y solicitudes</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-[#756A5D]">
              <Sparkles className="w-4 h-4 text-[#0B72D9] shrink-0" />
              <span>Sin formularios largos ni contraseñas adicionales</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-[#756A5D]">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Tus datos están protegidos y nunca se comparten</span>
            </div>
          </div>

          {/* Legal Note */}
          <p className="text-[11px] text-[#756A5D]/80 leading-relaxed pt-2">
            Al continuar, aceptas los{' '}
            <a href="/terminos" target="_blank" rel="noopener noreferrer" className="text-[#0B72D9] hover:underline">
              Términos de Servicio
            </a>{' '}
            y la{' '}
            <a href="/privacidad" target="_blank" rel="noopener noreferrer" className="text-[#0B72D9] hover:underline">
              Política de Privacidad
            </a>{' '}
            de FIXIT.
          </p>
        </div>
      </main>

      {/* Footer Branding */}
      <footer className="max-w-md w-full mx-auto text-center text-[11px] text-[#756A5D]/80">
        FIXIT © {new Date().getFullYear()} — Servicios residenciales en Panamá
      </footer>
    </div>
  );
};
