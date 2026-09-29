import React, { useState } from 'react';
import { FixitLogo } from '../FixitLogo';
import { ArrowLeft, Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { authService } from '../../lib/firebase';
import { mapAuthErrorToFriendlyMessage } from '../../lib/authErrors';
import { AuthForgotPasswordModal } from './AuthForgotPasswordModal';

interface AuthLoginScreenProps {
  onSuccess?: () => void;
  onNavigateToRegister: () => void;
  onGoBack: () => void;
}

export const AuthLoginScreen: React.FC<AuthLoginScreenProps> = ({
  onSuccess,
  onNavigateToRegister,
  onGoBack,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);

  const isBusy = isEmailLoading || isGoogleLoading;

  const handleGoogleSignIn = async () => {
    if (isBusy) return;
    setIsGoogleLoading(true);
    setErrorMessage(null);

    try {
      await authService.loginWithGoogle();
      if (onSuccess) {
        onSuccess();
      } else {
        onGoBack();
      }
    } catch (err: unknown) {
      setErrorMessage(mapAuthErrorToFriendlyMessage(err));
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBusy) return;

    if (!email.trim() || !password) {
      setErrorMessage('Por favor ingresa tu correo y contraseña.');
      return;
    }

    setIsEmailLoading(true);
    setErrorMessage(null);

    try {
      await authService.loginWithEmail(email.trim(), password);
      if (onSuccess) {
        onSuccess();
      } else {
        onGoBack();
      }
    } catch (err: unknown) {
      setErrorMessage(mapAuthErrorToFriendlyMessage(err));
    } finally {
      setIsEmailLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F4EF] flex flex-col justify-between py-6 px-4 sm:px-6">
      {/* Top Bar with Go Back */}
      <header className="max-w-md w-full mx-auto flex items-center justify-between">
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

        <span className="text-[11px] font-medium text-[#756A5D]">
          Acceso seguro FIXIT
        </span>
      </header>

      {/* Main Login Card */}
      <main className="max-w-md w-full mx-auto my-auto py-6">
        <div className="bg-[#FFFEFA] border border-[#DED4C5] rounded-3xl p-6 sm:p-8 shadow-md shadow-[#082D60]/5 space-y-6">
          {/* Brand Header */}
          <div className="text-center space-y-2">
            <div className="flex justify-center mb-1">
              <FixitLogo variant="horizontal" size={44} />
            </div>
            <p className="text-xs font-medium text-[#756A5D]">
              Soluciones para tu hogar
            </p>
            <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#082D60] pt-1">
              Ingresa a tu cuenta
            </h1>
          </div>

          {/* Friendly Error Banner */}
          {errorMessage && (
            <div 
              className="p-3.5 rounded-2xl bg-amber-50/90 border border-amber-200 text-amber-900 text-xs leading-relaxed transition-all"
              role="alert"
            >
              {errorMessage}
            </div>
          )}

          {/* Google Sign-In Button */}
          <div className="space-y-4">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isBusy}
              className="w-full py-3 px-4 rounded-2xl border border-[#DED4C5] bg-[#FFFEFA] hover:bg-[#F6F4EF] active:scale-[0.99] text-[#082D60] font-semibold text-xs sm:text-sm transition-all flex items-center justify-center gap-3 cursor-pointer shadow-2xs disabled:opacity-50"
              id="btn-google-login"
            >
              {isGoogleLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#082D60]" />
                  <span>Conectando con Google...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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

            {/* Subtle Divider "o" */}
            <div className="relative flex items-center justify-center my-2">
              <div className="border-t border-[#DED4C5] w-full" />
              <span className="bg-[#FFFEFA] px-3 text-xs text-[#756A5D] font-medium lowercase">
                o
              </span>
              <div className="border-t border-[#DED4C5] w-full" />
            </div>

            {/* Email / Password Form */}
            <form onSubmit={handleEmailSignIn} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="login-email-input"
                  className="block text-xs font-semibold text-[#082D60]"
                >
                  Correo electrónico
                </label>
                <div className="relative">
                  <input
                    id="login-email-input"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ejemplo@correo.com"
                    disabled={isBusy}
                    className="w-full py-2.5 pl-9 pr-3 rounded-2xl border border-[#DED4C5] bg-[#F6F4EF] text-xs text-[#082D60] placeholder-[#756A5D]/60 focus:bg-[#FFFEFA] focus:border-[#0988F5] focus:outline-none transition-colors disabled:opacity-50"
                  />
                  <Mail className="w-4 h-4 text-[#756A5D] absolute left-3 top-3 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="login-password-input"
                    className="block text-xs font-semibold text-[#082D60]"
                  >
                    Contraseña
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsForgotModalOpen(true)}
                    disabled={isBusy}
                    className="text-[11px] font-semibold text-[#0988F5] hover:underline cursor-pointer"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="login-password-input"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={isBusy}
                    className="w-full py-2.5 pl-9 pr-10 rounded-2xl border border-[#DED4C5] bg-[#F6F4EF] text-xs text-[#082D60] placeholder-[#756A5D]/60 focus:bg-[#FFFEFA] focus:border-[#0988F5] focus:outline-none transition-colors disabled:opacity-50"
                  />
                  <Lock className="w-4 h-4 text-[#756A5D] absolute left-3 top-3 pointer-events-none" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                    className="absolute right-3 top-2.5 text-[#756A5D] hover:text-[#082D60] p-0.5 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isBusy}
                className="w-full py-3 px-4 rounded-2xl bg-[#082D60] hover:bg-[#062248] text-white font-semibold text-xs sm:text-sm active:scale-[0.99] transition-all cursor-pointer shadow-xs disabled:opacity-50 flex items-center justify-center gap-2"
                id="btn-login-submit"
              >
                {isEmailLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Iniciando sesión...</span>
                  </>
                ) : (
                  <span>Iniciar sesión</span>
                )}
              </button>
            </form>
          </div>

          {/* Create Account Link */}
          <div className="pt-4 border-t border-[#DED4C5]/60 text-center">
            <span className="text-xs text-[#756A5D] mr-1.5">
              ¿Aún no tienes cuenta?
            </span>
            <button
              type="button"
              onClick={onNavigateToRegister}
              disabled={isBusy}
              className="text-xs font-bold text-[#0988F5] hover:underline cursor-pointer"
              id="link-create-account"
            >
              Crear una cuenta
            </button>
          </div>
        </div>
      </main>

      {/* Footer Branding */}
      <footer className="max-w-md w-full mx-auto text-center text-[11px] text-[#756A5D]/80">
        FIXIT © {new Date().getFullYear()} — Servicios residenciales en Panamá
      </footer>

      {/* Forgot Password Modal */}
      <AuthForgotPasswordModal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
        initialEmail={email}
      />
    </div>
  );
};
