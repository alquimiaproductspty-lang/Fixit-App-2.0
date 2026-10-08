import React, { useState, useRef, useEffect } from 'react';
import { LogOut, ArrowLeft, User, Shield, Globe, ChevronDown, Check } from 'lucide-react';
import { authService, AuthState } from '../lib/firebase';
import { FixitLogo } from './FixitLogo';
import { UserProfileModal } from './auth/UserProfileModal';

interface NavbarProps {
  currentView: string;
  canGoBack?: boolean;
  onGoBack?: () => void;
  onNavigate: (view: 'home' | 'login' | 'register' | 'admin' | 'pro' | 'privacy' | 'terms' | 'pintura') => void;
  authState?: AuthState;
  hasUpdate?: boolean;
}

const LANGUAGES = [
  { code: 'es', shortCode: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'en', shortCode: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'zh-CN', shortCode: 'zh', label: '中文', flag: '🇨🇳' },
] as const;

export const Navbar: React.FC<NavbarProps> = ({
  canGoBack,
  onGoBack,
  onNavigate,
  authState,
}) => {
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);

  const user = authState?.user || null;
  const isLoading = authState?.loading ?? false;

  // Detectar idioma actual desde la cookie nativa googtrans
  const [currentLang, setCurrentLang] = useState<'es' | 'en' | 'zh'>('es');

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const match = document.cookie.match(/(?:^|;\s*)googtrans=([^;]+)/);
    if (match) {
      const val = decodeURIComponent(match[1]);
      if (val.includes('/en')) setCurrentLang('en');
      else if (val.includes('/zh-CN') || val.includes('/zh')) setCurrentLang('zh');
      else setCurrentLang('es');
    } else {
      setCurrentLang('es');
    }
  }, []);

  // Manejar clic afuera del menú de idiomas
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) {
        setIsLangMenuOpen(false);
      }
    };
    if (isLangMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isLangMenuOpen]);

  // Cambiar idioma manipulando la cookie nativa de Google Translate
  const changeLanguage = (langCode: string) => {
    if (langCode === 'es') {
      // Borrar la cookie para volver al idioma original
      document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname}`;
    } else {
      // Establecer la cookie de traducción de Google
      document.cookie = `googtrans=/es/${langCode}; path=/;`;
      document.cookie = `googtrans=/es/${langCode}; path=/; domain=${window.location.hostname}`;
    }
    window.location.reload();
  };

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
            
            {/* SELECTOR DE IDIOMAS MODERNO (Controla Google Translate) */}
            <div className="relative" ref={langMenuRef}>
              <button
                type="button"
                onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-[#FFFEFA] hover:bg-[#DED4C5]/30 border border-[#DED4C5] text-xs font-semibold text-[#1F2421] transition-colors min-h-[36px] shadow-2xs cursor-pointer active:scale-95"
                title="Cambiar idioma / Change language"
                id="btn-nav-language"
                aria-label="Selector de idioma"
              >
                <Globe className="w-3.5 h-3.5 text-[#0B72D9]" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#082D60]">
                  {currentLang.toUpperCase()}
                </span>
                <ChevronDown className={`w-3 h-3 text-[#756A5D] transition-transform duration-200 ${isLangMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {isLangMenuOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-36 bg-[#FFFEFA] border border-[#DED4C5] rounded-2xl shadow-lg py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#756A5D] border-b border-[#DED4C5]/60 mb-1">
                    Idioma / Language
                  </div>
                  {LANGUAGES.map((lang) => {
                    const isSelected = currentLang === lang.shortCode;
                    return (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => {
                          setIsLangMenuOpen(false);
                          changeLanguage(lang.code);
                        }}
                        className={`w-full px-3 py-2 text-left text-xs font-medium flex items-center justify-between transition-colors cursor-pointer hover:bg-[#F6F4EF] ${
                          isSelected
                            ? 'text-[#0B72D9] font-bold bg-[#0B72D9]/5'
                            : 'text-[#1F2421]'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span className="text-sm">{lang.flag}</span>
                          <span>{lang.label}</span>
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#0B72D9] stroke-[2.5]" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

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
