import React, { useState, useEffect } from 'react';
import { authService, AuthState } from './lib/firebase';
import { AuthLoginScreen } from './components/auth/AuthLoginScreen';
import { AdminDashboardView } from './components/AdminDashboardView';
import { FixitLogo } from './components/FixitLogo';
import { Shield, ShieldCheck, LogOut, AlertCircle, Loader2, Lock } from 'lucide-react';
import { PWAUpdatePrompt } from './components/PWAUpdatePrompt';
import { usePWAUpdate } from './hooks/usePWAUpdate';

/**
 * FIXIT App - Internal Operations Console & CRM Architecture
 * Exclusively for staff and administrative control (admin.tudominio.com).
 * Public customer quotation flows and install prompts have been decoupled.
 */
export default function App() {
  const [authState, setAuthState] = useState<AuthState>(() => authService.getAuthState());
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
            <span>Verificando credenciales de acceso administrativo...</span>
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
          subtitle="Acceso exclusivo para el equipo de administración y operaciones (admin.tudominio.com)."
        />
        <PWAUpdatePrompt updateState={pwaUpdate} />
      </div>
    );
  }

  // 3. Verificación de Rol de Administrador
  const currentUser = authState.user!;
  const isAdmin = Boolean(currentUser.isAdmin || currentUser.role === 'ADMIN');

  // 4. Si el usuario autenticado NO posee rol de ADMIN, restringir acceso
  if (!isAdmin) {
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
              Este subdominio es de uso exclusivo para Administradores de FIXIT. Si crees que se trata de un error, solicita la elevación de permisos en Firebase.
            </p>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => authService.signOut()}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#082D60] hover:bg-[#07244D] text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-xs active:scale-[0.99]"
            >
              <LogOut className="w-4 h-4" />
              <span>Cerrar Sesión e Iniciar con Cuenta Administradora</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 5. Usuario Autenticado con Rol de ADMIN: Renderizar CRM / AdminDashboardView
  return (
    <div className="min-h-screen bg-[#F6F4EF] text-[#1F2421] flex flex-col font-sans selection:bg-[#0B72D9]/15">
      {/* Barra Superior Exclusiva para Equipo Interno */}
      <header className="sticky top-0 z-40 bg-[#FFFEFA]/95 backdrop-blur-md border-b border-[#DED4C5] px-4 sm:px-6 py-2.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          {/* Brand & Subdomain Badge */}
          <div className="flex items-center gap-3">
            <FixitLogo variant="compact" size={28} />
            <div className="hidden sm:block border-l border-[#DED4C5] pl-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#082D60] block">
                CRM & Control Operativo
              </span>
              <span className="text-[11px] text-[#756A5D] font-mono">
                admin.fixitpanama.com
              </span>
            </div>
          </div>

          {/* Connected Admin Staff Identity & Logout */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs font-bold text-[#1F2421]">
                {currentUser.displayName || currentUser.nombre || 'Administrador'}
              </span>
              <span className="text-[10px] text-[#756A5D]">
                {currentUser.email}
              </span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#53653D]/10 border border-[#53653D]/30 text-[#53653D] text-[11px] font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>ADMIN</span>
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
        <AdminDashboardView
          authState={authState}
          onGoHome={() => {
            // En CRM interno, 'onGoHome' recarga o mantiene la vista en el panel
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      </main>

      <PWAUpdatePrompt updateState={pwaUpdate} />
    </div>
  );
}
