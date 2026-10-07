import React, { useState } from 'react';
import { FixitLogo } from '../FixitLogo';
import { ArrowLeft, User, Mail, Phone, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { authService } from '../../lib/firebase';
import { mapAuthErrorToFriendlyMessage } from '../../lib/authErrors';

interface AuthRegisterScreenProps {
  onSuccess?: () => void;
  onNavigateToLogin: () => void;
  onGoBack: () => void;
  onNavigateToTerms?: () => void;
  onNavigateToPrivacy?: () => void;
}

export const AuthRegisterScreen: React.FC<AuthRegisterScreenProps> = ({
  onSuccess,
  onNavigateToLogin,
  onGoBack,
  onNavigateToTerms,
  onNavigateToPrivacy,
}) => {
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isRegisterLoading, setIsRegisterLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isBusy = isRegisterLoading || isGoogleLoading;

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

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBusy) return;

    if (!acceptedTerms) {
      setErrorMessage('Debes aceptar los Términos de Servicio y la Política de Privacidad para continuar.');
      return;
    }

    if (!name.trim()) {
      setErrorMessage('Por favor ingresa tu nombre completo.');
      return;
    }

    if (!email.trim()) {
      setErrorMessage('Por favor ingresa tu correo electrónico.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Las contraseñas no coinciden. Por favor verifícalas.');
      return;
    }

    setIsRegisterLoading(true);
    setErrorMessage(null);

    try {
      await authService.registerClient(
        name.trim(),
        email.trim(),
        password,
        phone.trim() || undefined
      );

      if (onSuccess) {
        onSuccess();
      } else {
        onGoBack();
      }
    } catch (err: unknown) {
      setErrorMessage(mapAuthErrorToFriendlyMessage(err));
    } finally {
      setIsRegisterLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F4EF] flex flex-col justify-between py-6 px-4 sm:px-6">
      {/* Top Header */}
      <header className="max-w-md w-full mx-auto flex items-center justify-between">
        <button
          type="button"
          onClick={onGoBack}
          disabled={isBusy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FFFEFA] border border-[#DED4C5] text-xs font-semibold text-[#1F2421] hover:bg-[#DED4C5]/30 transition-colors shadow-2xs active:scale-95 cursor-pointer disabled:opacity-50"
          id="btn-register-back"
          aria-label="Volver atrás"
        >
          <ArrowLeft className="w-4 h-4 text-[#756A5D]" />
          <span>Volver</span>
        </button>

        <span className="text-[11px] font-medium text-[#756A5D]">
          Registro de cliente
        </span>
      </header>

      {/* Main Register Card */}
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
              Crear tu cuenta
            </h1>
          </div>

          {/* Friendly Error Banner */}
          {errorMessage && (
            <div
              className="p-3.5 rounded-2xl bg-amber-50/90 border border-amber-200 text-amber-900 text-xs leading-relaxed transition-all space-y-2"
              role="alert"
            >
              <p>{errorMessage}</p>
              {errorMessage.includes('Google') && (
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isBusy}
                  className="w-full py-2 px-3 rounded-xl bg-[#082D60] hover:bg-[#062248] text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-95"
                >
                  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>Registrarse con Google ahora</span>
                </button>
              )}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
            {/* Nombre */}
            <div className="space-y-1">
              <label
                htmlFor="register-name-input"
                className="block text-xs font-semibold text-[#082D60]"
              >
                Nombre completo *
              </label>
              <div className="relative">
                <input
                  id="register-name-input"
                  type="text"
                  required
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Valeria Icaza"
                  disabled={isBusy}
                  className="w-full py-2.5 pl-9 pr-3 rounded-2xl border border-[#DED4C5] bg-[#F6F4EF] text-xs text-[#082D60] placeholder-[#756A5D]/60 focus:bg-[#FFFEFA] focus:border-[#0988F5] focus:outline-none transition-colors disabled:opacity-50"
                />
                <User className="w-4 h-4 text-[#756A5D] absolute left-3 top-3 pointer-events-none" />
              </div>
            </div>

            {/* Correo */}
            <div className="space-y-1">
              <label
                htmlFor="register-email-input"
                className="block text-xs font-semibold text-[#082D60]"
              >
                Correo electrónico *
              </label>
              <div className="relative">
                <input
                  id="register-email-input"
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

            {/* Teléfono */}
            <div className="space-y-1">
              <label
                htmlFor="register-phone-input"
                className="block text-xs font-semibold text-[#082D60]"
              >
                Teléfono o WhatsApp
              </label>
              <div className="relative">
                <input
                  id="register-phone-input"
                  type="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+507 6890-1234"
                  disabled={isBusy}
                  className="w-full py-2.5 pl-9 pr-3 rounded-2xl border border-[#DED4C5] bg-[#F6F4EF] text-xs text-[#082D60] placeholder-[#756A5D]/60 focus:bg-[#FFFEFA] focus:border-[#0988F5] focus:outline-none transition-colors disabled:opacity-50"
                />
                <Phone className="w-4 h-4 text-[#756A5D] absolute left-3 top-3 pointer-events-none" />
              </div>
            </div>

            {/* Contraseña */}
            <div className="space-y-1">
              <label
                htmlFor="register-password-input"
                className="block text-xs font-semibold text-[#082D60]"
              >
                Contraseña *
              </label>
              <div className="relative">
                <input
                  id="register-password-input"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
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

            {/* Confirmar Contraseña */}
            <div className="space-y-1">
              <label
                htmlFor="register-confirm-password-input"
                className="block text-xs font-semibold text-[#082D60]"
              >
                Confirmar contraseña *
              </label>
              <div className="relative">
                <input
                  id="register-confirm-password-input"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite la contraseña"
                  disabled={isBusy}
                  className="w-full py-2.5 pl-9 pr-10 rounded-2xl border border-[#DED4C5] bg-[#F6F4EF] text-xs text-[#082D60] placeholder-[#756A5D]/60 focus:bg-[#FFFEFA] focus:border-[#0988F5] focus:outline-none transition-colors disabled:opacity-50"
                />
                <Lock className="w-4 h-4 text-[#756A5D] absolute left-3 top-3 pointer-events-none" />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  tabIndex={-1}
                  aria-label={showConfirmPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  className="absolute right-3 top-2.5 text-[#756A5D] hover:text-[#082D60] p-0.5 cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Checkbox Aceptación de Términos y Privacidad */}
            <div className="pt-1.5 pb-1">
              <label
                htmlFor="register-terms-checkbox"
                className="flex items-start gap-2.5 text-xs text-[#756A5D] cursor-pointer select-none leading-relaxed"
              >
                <input
                  id="register-terms-checkbox"
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  disabled={isBusy}
                  className="mt-0.5 h-4 w-4 rounded border-[#DED4C5] text-[#082D60] focus:ring-[#0988F5] accent-[#082D60] cursor-pointer shrink-0"
                />
                <span>
                  He leído y acepto los{' '}
                  <a
                    href="/terminos"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#0B72D9] font-medium hover:underline"
                  >
                    Términos de Servicio
                  </a>{' '}
                  y la{' '}
                  <a
                    href="/privacidad"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#0B72D9] font-medium hover:underline"
                  >
                    Política de Privacidad
                  </a>
                </span>
              </label>
            </div>

            {/* Crear Cuenta Button */}
            <button
              type="submit"
              disabled={isBusy || !acceptedTerms}
              className={`w-full py-3 px-4 mt-2 rounded-2xl bg-[#082D60] hover:bg-[#062248] text-white font-semibold text-xs sm:text-sm active:scale-[0.99] transition-all flex items-center justify-center gap-2 ${
                !acceptedTerms || isBusy
                  ? 'opacity-50 cursor-not-allowed'
                  : 'cursor-pointer shadow-xs'
              }`}
              id="btn-register-submit"
            >
              {isRegisterLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Creando tu cuenta...</span>
                </>
              ) : (
                <span>Crear cuenta</span>
              )}
            </button>
          </form>

          {/* Divider "o" */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-[#DED4C5] w-full" />
            <span className="bg-[#FFFEFA] px-3 text-xs text-[#756A5D] font-medium lowercase">
              o
            </span>
            <div className="border-t border-[#DED4C5] w-full" />
          </div>

          {/* Google Sign-In */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isBusy}
            className="w-full py-3 px-4 rounded-2xl border border-[#DED4C5] bg-[#FFFEFA] hover:bg-[#F6F4EF] active:scale-[0.99] text-[#082D60] font-semibold text-xs sm:text-sm transition-all flex items-center justify-center gap-3 cursor-pointer shadow-2xs disabled:opacity-50"
            id="btn-google-register"
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

          {/* Already have an account */}
          <div className="pt-4 border-t border-[#DED4C5]/60 text-center">
            <span className="text-xs text-[#756A5D] mr-1.5">
              ¿Ya tengo una cuenta?
            </span>
            <button
              type="button"
              onClick={onNavigateToLogin}
              disabled={isBusy}
              className="text-xs font-bold text-[#0988F5] hover:underline cursor-pointer"
              id="link-go-to-login"
            >
              Iniciar sesión
            </button>
          </div>
        </div>
      </main>

      {/* Footer Branding */}
      <footer className="max-w-md w-full mx-auto text-center text-[11px] text-[#756A5D]/80">
        FIXIT © {new Date().getFullYear()} — Registro protegido por Firebase Authentication
      </footer>
    </div>
  );
};
