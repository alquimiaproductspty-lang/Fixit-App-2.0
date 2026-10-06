import React, { useState } from 'react';
import { LogOut, ArrowLeft, User, Shield } from 'lucide-react';
import { authService, AuthState } from '../lib/firebase';
import { FixitLogo } from './FixitLogo';
import { UserProfileModal } from './auth/UserProfileModal';

interface NavbarProps {
  currentView: string;
  canGoBack?: boolean;
  onGoBack?: () => void;
  onNavigate: (view: 'home' | 'login' | 'register' | 'admin' | 'pro' | 'privacy' | 'terms') => void;
  authState?: AuthState;
  hasUpdate?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  canGoBack,
  onGoBack,
  onNavigate,
  authState,
}) => {
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const user = authState?.user || null;
  const isLoading = authState?.loading ?? false;

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#F6F4EF]/95 backdrop-blur-md border-b border-[#DED4C5] px-4 sm:px-6 py-2.5 transition-colors">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          {/* Left Side: Back button if in sub-step, or Brand Logo */}
          <div className="flex items-center gap-2">
            {canGoBack && onGoBack ? (
              <button
                onClick={onGoBack}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-[#FFFEFA] border border-[#DED4C5] text-xs font-semibold text-[#1F2421] hover:bg-[#DED4C5]/30 transition-colors min-h-[36px] shadow-2xs active:scale-95 cursor-pointer"
                id="btn-nav-header-back"
                aria-label="Retroceder"
              >
                <ArrowLeft className="w-4 h-4 text-[#756A5D]" />
                <span className="hidden xs:inline">Atrás</span>
              </button>
            ) : null}

            {/* Official FIXIT Logo */}
            <button
              onClick={() => onNavigate('home')}
              className="flex items-center gap-2 text-left focus:outline-none group active:scale-[0.98] transition-transform cursor-pointer"
              id="btn-nav-brand"
              aria-label="Ir al inicio de FIXIT"
            >
              <FixitLogo variant="compact" size={30} className="group-hover:opacity-90 transition-opacity" />
            </button>
          </div>

          {/* Navigation & Controls */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            
            {/* BOTÓN B2B FIXIT PRO (Estilo Minimalista Dos Tonos) */}
            <button
              onClick={() => onNavigate('pro')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-[#DED4C5]/30 transition-colors cursor-pointer active:scale-95"
              title="Mantenimiento para negocios"
            >
              <span className="font-serif font-black text-[15px] tracking-tight text-[#082D60]">
                FIXIT
              </span>
              <span className="text-[#0B72D9] font-sans font-extrabold text-[10px] uppercase px-1.5 py-0.5 rounded-md bg-[#0B72D9]/10 border border-[#0B72D9]/30 shadow-2xs">
                PRO
              </span>
            </button>

            {isLoading ? (
              <div className="w-20 h-7 rounded-full bg-[#DED4C5]/30 animate-pulse" />
            ) : user ? (
              <div className="flex items-center gap-1.5 pl-1">
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(true)}
                  className="flex items-center gap-2 px-2 py-1 rounded-2xl hover:bg-[#DED4C5]/30 transition-colors cursor-pointer text-left"
                  title="Ver y editar mi perfil"
                  id="btn-nav-profile"
                >
                  <div className="w-7 h-7 rounded-full bg-[#082D60] text-white flex items-center justify-center text-xs font-bold shrink-0">
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
                  <div className="hidden sm:block text-left leading-tight">
                    <p className="text-xs font-semibold text-[#1F2421] truncate max-w-[120px]">
                      {user.displayName || user.nombre}
                    </p>
                    <span className={`inline-block text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${
                      user.role === 'ADMIN' ? 'bg-[#082D60]/10 text-[#082D60] border-[#082D60]/30' :
                      user.role === 'OPERATOR' ? 'bg-[#0988F5]/10 text-[#0988F5] border-[#0988F5]/30' :
                      user.role === 'TECHNICIAN' ? 'bg-[#B98A43]/10 text-[#B98A43] border-[#B98A43]/30' :
                      'bg-[#53653D]/10 text-[#53653D] border-[#53653D]/30'
                    }`}>
                      {user.role}
                    </span>
                  </div>
                </button>

                {user.isAdmin && (
                  <button
                    type="button"
                    onClick={() => onNavigate('admin')}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#082D60] hover:bg-[#07244D] text-white text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                    title="Abrir Panel de Administración"
                    id="btn-nav-admin"
                  >
                    <Shield className="w-3.5 h-3.5 text-white" />
                    <span className="hidden sm:inline">Admin</span>
                  </button>
                )}

                <button
                  onClick={() => authService.signOut()}
                  className="p-1.5 rounded-full text-[#756A5D] hover:text-[#1F2421] hover:bg-[#DED4C5]/50 transition-colors cursor-pointer"
                  title="Cerrar sesión"
                  id="btn-nav-logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => onNavigate('login')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FFFEFA] hover:bg-[#DED4C5]/40 border border-[#DED4C5] text-xs font-medium text-[#082D60] transition-colors min-h-[36px] shadow-2xs cursor-pointer"
                title="Ingresar a tu cuenta"
                id="btn-nav-login"
              >
                <User className="w-3.5 h-3.5 text-[#756A5D]" />
                <span className="hidden xs:inline">Ingresar</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        user={user}
        onNavigateToAdmin={() => onNavigate('admin')}
      />
    </>
  );
};
