import React, { useState, useEffect } from 'react';
import { X, User, Mail, Phone, Shield, CheckCircle2, Loader2, LogOut, Globe, Trash2 } from 'lucide-react';
import { ActiveUser, authService } from '../../lib/firebase';
import { ROLE_DISPLAY } from '../../types';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: ActiveUser | null;
  onNavigateToAdmin?: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  onNavigateToAdmin,
}) => {
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [language, setLanguage] = useState<'es' | 'en'>('es');
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || user.nombre || '');
      setPhone(user.phone || user.telefono || '');
      setSuccessMessage(null);
      setErrorMessage(null);
    }
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setErrorMessage('El nombre no puede estar vacío.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await authService.updateUserProfile({
        displayName: displayName.trim(),
        phone: phone.trim(),
        languagePreference: language,
      });
      setSuccessMessage('Tu información se actualizó correctamente.');
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3500);
    } catch (err: any) {
      console.error('Error updating user profile:', err);
      setErrorMessage('No se pudo actualizar el perfil. Verifica tu conexión e intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    onClose();
    await authService.signOut();
  };

  const handleDeleteAccount = async () => {
    // 1. Confirmación nativa del navegador
    const confirmed = window.confirm(
      '¿Estás seguro de que deseas eliminar tu cuenta y todos tus datos de forma permanente? Esta acción no se puede deshacer.'
    );

    if (!confirmed) return;

    setIsDeleting(true);
    setErrorMessage(null);

    try {
      // 2. Eliminar el registro de la base de datos de Firebase y auth
      await authService.deleteAccount();

      // 3. Cerrar el modal
      onClose();

      // 4. Redirigir a la página principal (/)
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    } catch (err: any) {
      console.warn('Error al eliminar cuenta:', err);
      if (err?.code === 'auth/requires-recent-login') {
        setErrorMessage(
          'Por motivos de seguridad, Firebase requiere que inicies sesión nuevamente antes de eliminar tu cuenta. Por favor vuelve a ingresar e inténtalo de nuevo.'
        );
      } else {
        setErrorMessage(
          'Ocurrió un error al intentar eliminar la cuenta. Por favor contáctanos o intenta nuevamente.'
        );
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const roleLabel = ROLE_DISPLAY[user.role]?.es || user.role;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-modal-title"
    >
      <div className="bg-[#FFFEFA] border border-[#DED4C5] rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#DED4C5]/60 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#082D60]/10 border border-[#082D60]/20 flex items-center justify-center text-[#082D60] font-bold text-sm">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName}
                  className="w-full h-full rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                (user.displayName || user.email || 'U').charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <h3 id="profile-modal-title" className="text-base font-serif font-bold text-[#082D60] leading-tight">
                Mi Perfil FIXIT
              </h3>
              <p className="text-[11px] text-[#756A5D]">
                Gestión de tu cuenta y datos de contacto
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-[#756A5D] hover:bg-[#DED4C5]/30 transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback notices */}
        {successMessage && (
          <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs leading-relaxed">
            {errorMessage}
          </div>
        )}

        {/* Roles & Status Badges */}
        <div className="bg-[#F6F4EF] border border-[#DED4C5]/70 rounded-2xl p-3.5 flex items-center justify-between gap-3 text-xs">
          <div>
            <span className="text-[10px] text-[#756A5D] uppercase tracking-wider font-semibold block mb-0.5">
              Rol de usuario
            </span>
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-[#0B72D9]" />
              <span className="font-bold text-[#082D60]">{roleLabel}</span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-[#756A5D] uppercase tracking-wider font-semibold block mb-0.5">
              Estado de cuenta
            </span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
              user.isActive
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                : 'bg-rose-50 text-rose-700 border-rose-300'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${user.isActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              {user.isActive ? 'Activa' : 'Inactiva'}
            </span>
          </div>
        </div>

        {/* Admin Quick Action */}
        {user.isAdmin && onNavigateToAdmin && (
          <button
            type="button"
            onClick={() => {
              onClose();
              onNavigateToAdmin();
            }}
            className="w-full py-2 px-3 rounded-2xl bg-[#082D60]/10 hover:bg-[#082D60]/20 border border-[#082D60]/30 text-[#082D60] font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Shield className="w-4 h-4 text-[#082D60]" />
            <span>Abrir Panel de Administración FIXIT</span>
          </button>
        )}

        {/* Editable Form */}
        <form onSubmit={handleSave} className="space-y-3.5 text-xs">
          {/* Nombre */}
          <div className="space-y-1">
            <label htmlFor="profile-name-input" className="block font-semibold text-[#082D60]">
              Nombre completo
            </label>
            <div className="relative">
              <input
                id="profile-name-input"
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Tu nombre completo"
                disabled={isLoading}
                className="w-full py-2.5 pl-9 pr-3 rounded-2xl border border-[#DED4C5] bg-[#F6F4EF] text-xs text-[#082D60] focus:bg-[#FFFEFA] focus:border-[#0988F5] focus:outline-none transition-colors disabled:opacity-50"
              />
              <User className="w-4 h-4 text-[#756A5D] absolute left-3 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Correo (Read-only from Firebase Auth) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label htmlFor="profile-email-input" className="block font-semibold text-[#082D60]">
                Correo electrónico
              </label>
              <span className="text-[10px] text-[#756A5D]">
                (No modificable)
              </span>
            </div>
            <div className="relative">
              <input
                id="profile-email-input"
                type="email"
                disabled
                value={user.email}
                className="w-full py-2.5 pl-9 pr-3 rounded-2xl border border-[#DED4C5]/80 bg-[#DED4C5]/20 text-xs text-[#756A5D] cursor-not-allowed select-none"
              />
              <Mail className="w-4 h-4 text-[#756A5D] absolute left-3 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Teléfono */}
          <div className="space-y-1">
            <label htmlFor="profile-phone-input" className="block font-semibold text-[#082D60]">
              Teléfono / WhatsApp de contacto
            </label>
            <div className="relative">
              <input
                id="profile-phone-input"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+507 6890-1234"
                disabled={isLoading}
                className="w-full py-2.5 pl-9 pr-3 rounded-2xl border border-[#DED4C5] bg-[#F6F4EF] text-xs text-[#082D60] focus:bg-[#FFFEFA] focus:border-[#0988F5] focus:outline-none transition-colors disabled:opacity-50"
              />
              <Phone className="w-4 h-4 text-[#756A5D] absolute left-3 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Idioma */}
          <div className="space-y-1">
            <label htmlFor="profile-lang-select" className="block font-semibold text-[#082D60]">
              Preferencia de idioma
            </label>
            <div className="relative">
              <select
                id="profile-lang-select"
                value={language}
                onChange={(e) => setLanguage(e.target.value as 'es' | 'en')}
                disabled={isLoading}
                className="w-full py-2.5 pl-9 pr-3 rounded-2xl border border-[#DED4C5] bg-[#F6F4EF] text-xs text-[#082D60] focus:bg-[#FFFEFA] focus:border-[#0988F5] focus:outline-none transition-colors cursor-pointer disabled:opacity-50"
              >
                <option value="es">Español (Panamá)</option>
                <option value="en">English</option>
              </select>
              <Globe className="w-4 h-4 text-[#756A5D] absolute left-3 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Botones de acción */}
          <div className="pt-2 flex flex-col gap-2">
            <button
              type="submit"
              disabled={isLoading || isDeleting}
              className="w-full py-2.5 px-4 rounded-2xl bg-[#082D60] hover:bg-[#062248] text-white font-semibold text-xs active:scale-[0.99] transition-all cursor-pointer shadow-xs disabled:opacity-50 flex items-center justify-center gap-2"
              id="btn-save-profile"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Guardando cambios...</span>
                </>
              ) : (
                <span>Guardar cambios</span>
              )}
            </button>

            <button
              type="button"
              onClick={handleSignOut}
              disabled={isLoading || isDeleting}
              className="w-full py-2.5 px-4 rounded-2xl bg-[#FFFEFA] hover:bg-rose-50 text-rose-700 hover:text-rose-800 border border-rose-200 font-semibold text-xs active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              id="btn-profile-signout"
            >
              <LogOut className="w-4 h-4 text-rose-600" />
              <span>Cerrar sesión</span>
            </button>
          </div>

          {/* Zona de advertencia: Eliminar mi cuenta */}
          <div className="pt-4 border-t border-[#DED4C5]/60 text-center">
            <button
              type="button"
              onClick={handleDeleteAccount}
              disabled={isLoading || isDeleting}
              className="w-full bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white font-bold py-2.5 px-4 rounded-2xl text-xs transition-all cursor-pointer shadow-xs flex items-center justify-center gap-2 disabled:opacity-50"
              id="btn-delete-account"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Eliminando cuenta...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 text-white" />
                  <span>Eliminar mi cuenta</span>
                </>
              )}
            </button>
            <p className="text-[10px] text-[#756A5D] mt-1.5">
              Acción permanente de acuerdo con las leyes de privacidad.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};
