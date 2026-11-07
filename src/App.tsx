import React, { useState, useEffect } from 'react';
import { authService, AuthState } from './lib/firebase';
import { AuthLoginScreen } from './components/auth/AuthLoginScreen';
import { AdminDashboardView } from './components/AdminDashboardView';
import { FixerDashboardView } from './components/FixerDashboardView';
import { FixitLogo } from './components/FixitLogo';
import { Shield, ShieldCheck, LogOut, Loader2, Lock, Wrench, LayoutDashboard } from 'lucide-react';
import { PWAUpdatePrompt } from './components/PWAUpdatePrompt';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import { usePWAUpdate } from './hooks/usePWAUpdate';

/**
 * FIXIT App - Internal Operations Console & CRM Architecture
 * Exclusively for staff, technicians (Fixers) and administrative control (admin.tudominio.com).
 * Public customer quotation flows and install prompts have been decoupled.
 */
export default function App() {
  const [authState, setAuthState] = useState<AuthState>(() => authService.getAuthState());
  const [adminViewMode, setAdminViewMode] = useState<'admin' | 'fixer'>('admin');
  const pwaUpdate = usePWAUpdate();

  // Escuchar el estado de autenticación en tiempo real
  useEffect(() => {
    const unsub = authService.subscribe((state) => {
      setAuthState(state);
    });
    return () => unsub();
  }, []);

  // Eliminar sesiones anónimas heredadas del flujo público
  useEffect(() => {
    if (!authState.loading && authState.user?.isAnonymous) {
      console.info('[FIXIT CRM] Desconectando sesión anónima en subdominio administrativo...');
      authService.signOut().catch((err) => {
        console.warn('[FIXIT CRM] Error al cerrar sesión anónima:', err);
      });
    }
  }, [authState.loading, authState.user]);

  // 0. Rutas legales públicas (sin auth): los enlaces del login abren estas URLs en pestaña nueva
  const publicPath = typeof window !== 'undefined' ? window.location.pathname.replace(/^\/+|\/+$/g, '').toLowerCase() : '';
  if (['terminos', 'terms', 'terms-of-service', 'terminos-de-servicio', 'terminos-y-condiciones'].includes(publicPath)) {
    return <TermsOfService onBack={() => { window.location.href = '/'; }} onGoHome={() => { window.location.href = '/'; }} />;
  }
  if (['privacidad', 'privacy', 'privacy-policy', 'politica-de-privacidad', 'politica-privacidad'].includes(publicPath)) {
    return <PrivacyPolicy onBack={() => { window.location.href = '/'; }} onGoHome={() => { window.location.href = '/'; }} />;
  }

  // 1. Estado de Carga Inicial
  if (authState.loading) {
    return (
      <div className="min-h-screen bg-[#F6F4EF] flex flex-col items-center justify-center p-6 text-center space-y-4 font-sans select-none">
        <div className="w-14 h-14 rounded-2xl bg-[#082D60] text-white flex items-center justify-center shadow-md animate-pulse">
          <Shield className="w-7 h-7 text-white" />
        </div>
        <div className="space-y-1">
          <h2 className="font-serif font-bold text-xl text-[#082D60]">
            FIXIT Operations CRM
          </h2>
          <p className="text-xs text-[#756A5D] flex items-center justify-center gap-1.5">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0B72D9]" />
            <span>Verificando credenciales de acceso operativo...</span>
          </p>
        </div>
      </div>
    );
  }

  // 2. Si el usuario NO está autenticado (o era anónimo), obligar a Iniciar Sesión en la raíz
  const isAuthenticatedStaff = Boolean(authState.user && !authState.user.isAnonymous);

  if (!isAuthenticatedStaff) {
    return (
      <div className="min-h-screen bg-[#F6F4EF]">
        <AuthLoginScreen
          hideGuest={true}
          showBack={false}
          title="Consola Operativa FIXIT"
          subtitle="Acceso exclusivo para Administradores, Operadores y Técnicos Fixer (admin.fixitpanama.com)."
        />
        <PWAUpdatePrompt updateState={pwaUpdate} />
      </div>
    );
  }

  // 3. Verificación de Roles (ADMIN, OPERATOR, TECHNICIAN)
  const currentUser = authState.user!;
  const isAdmin = Boolean(currentUser.isAdmin || currentUser.role === 'ADMIN');
  const isOperator = currentUser.role === 'OPERATOR';
  const isTechnician = currentUser.role === 'TECHNICIAN';
  const hasConsoleAccess = isAdmin || isOperator || isTechnician;

  // 4. Si el usuario autenticado NO posee rol de ADMIN, OPERATOR ni TECHNICIAN, restringir acceso
  if (!hasConsoleAccess) {
    return (
      <div className="min-h-screen bg-[#F6F4EF] flex flex-col items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-[#FFFEFA] border border-[#DED4C5] rounded-3xl p-6 sm:p-8 shadow-md text-center space-y-5">
          <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
            <Lock className="w-7 h-7" />
          </div>

          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-700 px-2.5 py-0.5 rounded-full border border-rose-200">
              Acceso Restringido
            </span>
            <h1 className="font-serif font-bold text-xl sm:text-2xl text-[#1F2421]">
              Permisos Insuficientes
            </h1>
            <p className="text-xs text-[#756A5D] leading-relaxed">
              La cuenta <strong className="text-[#1F2421]">{currentUser.email || currentUser.displayName}</strong> está registrada con rol de <strong className="text-[#082D60]">{currentUser.role || 'Cliente'}</strong>.
            </p>
            <p className="text-xs text-[#756A5D] leading-relaxed">
              Este subdominio es de uso exclusivo para Administradores y Técnicos Fixer de FIXIT. Si crees que se trata de un error, solicita la elevación de permisos en Firebase.
            </p>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => authService.signOut()}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#082D60] hover:bg-[#07244D] text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-xs active:scale-[0.99]"
            >
              <LogOut className="w-4 h-4" />
              <span>Cerrar Sesión e Iniciar con Cuenta Autorizada</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Determinar si se muestra la Vista Fixer (obligatoria para TECHNICIAN, opcional para ADMIN/OPERATOR)
  const showFixerView = isTechnician || adminViewMode === 'fixer';

  // 5. Renderizar Consola Interna (CRM Admin o Vista Fixer)
  return (
    <div className="min-h-screen bg-[#F6F4EF] text-[#1F2421] flex flex-col font-sans selection:bg-[#0B72D9]/15">
      {/* Barra Superior Exclusiva para Equipo Interno */}
      <header className="sticky top-0 z-40 bg-[#FFFEFA]/95 backdrop-blur-md border-b border-[#DED4C5] px-4 sm:px-6 py-2.5 no-print">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
          {/* Brand & Subdomain Badge */}
          <div className="flex items-center gap-3">
            <FixitLogo variant="compact" size={28} />
            <div className="hidden sm:block border-l border-[#DED4C5] pl-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#082D60] block">
                {showFixerView ? 'Consola Técnica · Vista Fixer' : 'CRM & Control Operativo'}
              </span>
              <span className="text-[11px] text-[#756A5D] font-mono">
                admin.fixitpanama.com
              </span>
            </div>
          </div>

          {/* Connected Staff Identity, View Switcher & Logout */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Conmutador rápido CRM <-> Vista Fixer para ADMIN / OPERATOR */}
            {(isAdmin || isOperator) && (
              <button
                type="button"
                onClick={() => setAdminViewMode(showFixerView ? 'admin' : 'fixer')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                  showFixerView
                    ? 'bg-[#082D60] text-white border-[#082D60] hover:bg-[#07244D]'
                    : 'bg-[#0B72D9]/10 text-[#0B72D9] border-[#0B72D9]/30 hover:bg-[#0B72D9]/20'
                }`}
                title={showFixerView ? 'Volver al panel administrativo CRM' : 'Abrir Vista Fixer y Cotizador Oficial 1:1'}
              >
                {showFixerView ? (
                  <>
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    <span>Volver al CRM Admin</span>
                  </>
                ) : (
                  <>
                    <Wrench className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Vista Fixer / Cotizador</span>
                    <span className="sm:hidden">Fixer</span>
                  </>
                )}
              </button>
            )}

            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs font-bold text-[#1F2421]">
                {currentUser.displayName || currentUser.nombre || (isTechnician ? 'Técnico Fixer' : 'Administrador')}
              </span>
              <span className="text-[10px] text-[#756A5D]">
                {currentUser.email}
              </span>
            </div>

            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                isTechnician
                  ? 'bg-[#0B72D9]/10 border-[#0B72D9]/30 text-[#0B72D9]'
                  : 'bg-[#53653D]/10 border-[#53653D]/30 text-[#53653D]'
              }`}
            >
              {isTechnician ? <Wrench className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
              <span>{isTechnician ? 'FIXER' : isOperator ? 'OPERADOR' : 'ADMIN'}</span>
            </div>

            <button
              type="button"
              onClick={() => authService.signOut()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#DED4C5] hover:bg-[#DED4C5]/30 text-xs font-semibold text-[#756A5D] hover:text-red-700 transition-colors cursor-pointer ml-1"
              title="Cerrar sesión de la consola"
              id="btn-crm-logout"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Internal Console Dashboard */}
      <main className="flex-1 pb-12">
        {showFixerView ? (
          <FixerDashboardView authState={authState} />
        ) : (
          <AdminDashboardView
            authState={authState}
            onGoHome={() => {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onOpenFixerView={() => setAdminViewMode('fixer')}
          />
        )}
      </main>

      <PWAUpdatePrompt updateState={pwaUpdate} />
    </div>
  );
}
