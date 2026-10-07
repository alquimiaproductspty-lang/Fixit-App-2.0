import React, { useState, useRef, useEffect } from 'react';
import { LogOut, ArrowLeft, User, Shield, Globe, Check, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { authService, AuthState } from '../lib/firebase';
import { FixitLogo } from './FixitLogo';
import { UserProfileModal } from './auth/UserProfileModal';
import { SUPPORTED_LANGUAGES, changeAppLanguage, SupportedLanguage } from '../i18n';

interface NavbarProps {
  currentView: string;
  canGoBack?: boolean;
  onGoBack?: () => void;
  onNavigate: (view: 'home' | 'login' | 'register' | 'admin' | 'pro' | 'privacy' | 'terms' | 'pintura') => void;
  authState?: AuthState;
  hasUpdate?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  canGoBack,
  onGoBack,
  onNavigate,
  authState,
}) => {
  const { t, i18n } = useTranslation();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);

  const user = authState?.user || null;
  const isLoading = authState?.loading ?? false;

  const currentLang = ((i18n.language || 'es').slice(0, 2) as SupportedLanguage) || 'es';

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) {
        setIsLangMenuOpen(false);
      }
    };
    if (isLangMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isLangMenuOpen]);

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
                aria-label={t('nav.back')}
              >
                <ArrowLeft className="w-4 h-4 text-[#756A5D]" />
                <span className="hidden xs:inline">{t('nav.back')}</span>
              </button>
            ) : null}

            {/* Official FIXIT Logo */}
            <button
              onClick={() => onNavigate('home')}
              className="flex items-center gap-2 text-left focus:outline-none group active:scale-[0.98] transition-transform cursor-pointer"
              id="btn-nav-brand"
              aria-label="FIXIT"
            >
              <FixitLogo variant="compact" size={30} className="group-hover:opacity-90 transition-opacity" />
            </button>
          </div>

          {/* Navigation & Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            
            {/* BOTÓN B2B FIXIT PRO (Estilo Minimalista Dos Tonos) */}
            <button
              onClick={() => onNavigate('pro')}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl hover:bg-[#DED4C5]/30 transition-colors cursor-pointer active:scale-95 min-h-[36px]"
              title={t('nav.b2bTitle')}
            >
              <span className="font-serif font-black text-[14px] sm:text-[15px] tracking-tight text-[#082D60]">
                FIXIT
              </span>
              <span className="text-[#0B72D9] font-sans font-extrabold text-[10px] uppercase px-1.5 py-0.5 rounded-md bg-[#0B72D9]/10 border border-[#0B72D9]/30 shadow-2xs">
                {t('nav.pro')}
              </span>
            </button>

            {/* Selector de idioma discreto y profesional (ES / EN / ZH) */}
            <div className="relative" ref={langMenuRef}>
              <button
                type="button"
                onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl bg-[#FFFEFA] hover:bg-[#DED4C5]/30 border border-[#DED4C5] text-xs font-semibold text-[#082D60] transition-colors shadow-2xs active:scale-95 cursor-pointer min-h-[36px]"
                title={t('nav.language')}
                id="btn-nav-lang-selector"
                aria-label={t('nav.language')}
              >
                <Globe className="w-3.5 h-3.5 text-[#756A5D]" />
                <span className="font-bold text-[11px] tracking-wider uppercase">
                  {currentLang.toUpperCase()}
                </span>
                <ChevronDown className="w-3 h-3 text-[#756A5D] hidden sm:block opacity-70" />
              </button>

              {isLangMenuOpen && (
                <div className="absolute right-0 mt-1.5 w-36 bg-[#FFFEFA] border border-[#DED4C5] rounded-2xl shadow-lg shadow-[#082D60]/10 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                  {SUPPORTED_LANGUAGES.map((lang) => {
                    const isSelected = currentLang === lang.code;
                    return (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => {
                          changeAppLanguage(lang.code);
                          setIsLangMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#0B72D9]/10 text-[#0B72D9] font-bold'
                            : 'text-[#1F2421] hover:bg-[#F6F4EF] font-medium'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span className="text-sm">{lang.flag}</span>
                          <span>{lang.label}</span>
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#0B72D9]" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {isLoading ? (
              <div className="w-16 sm:w-20 h-7 rounded-full bg-[#DED4C5]/30 animate-pulse" />
            ) : user ? (
              <div className="flex items-center gap-1 sm:gap-1.5 pl-0.5 sm:pl-1">
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(true)}
                  className="flex items-center gap-1.5 sm:gap-2 px-1.5 sm:px-2 py-1 rounded-2xl hover:bg-[#DED4C5]/30 transition-colors cursor-pointer text-left"
                  title={t('nav.viewProfile')}
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
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#082D60] hover:bg-[#07244D] text-white text-xs font-bold transition-colors cursor-pointer shadow-2xs min-h-[36px]"
                    title="Abrir Panel de Administración"
                    id="btn-nav-admin"
                  >
                    <Shield className="w-3.5 h-3.5 text-white" />
                    <span className="hidden sm:inline">{t('nav.admin')}</span>
                  </button>
                )}

                <button
                  onClick={() => authService.signOut()}
                  className="p-1.5 rounded-full text-[#756A5D] hover:text-[#1F2421] hover:bg-[#DED4C5]/50 transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                  title={t('nav.logout')}
                  id="btn-nav-logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => onNavigate('login')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FFFEFA] hover:bg-[#DED4C5]/40 border border-[#DED4C5] text-xs font-medium text-[#082D60] transition-colors min-h-[36px] shadow-2xs cursor-pointer"
                title={t('nav.login')}
                id="btn-nav-login"
              >
                <User className="w-3.5 h-3.5 text-[#756A5D]" />
                <span className="hidden xs:inline">{t('nav.login')}</span>
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
