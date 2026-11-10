import React, { useState, useEffect, useRef, Component, ErrorInfo, ReactNode } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db, authService, AuthState } from './lib/firebase';
import { AuthLoginScreen } from './components/auth/AuthLoginScreen';
import { AuthRegisterScreen } from './components/auth/AuthRegisterScreen';
import { FixerOnboarding } from './components/auth/FixerOnboarding';
import { AdminDashboardView } from './components/AdminDashboardView';
import { FixerDashboardView } from './components/FixerDashboardView';
import { FixitLogo } from './components/FixitLogo';
import { Shield, ShieldCheck, LogOut, Loader2, Wrench, LayoutDashboard, AlertTriangle, RefreshCw } from 'lucide-react';
import { PWAUpdatePrompt } from './components/PWAUpdatePrompt';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import { usePWAUpdate } from './hooks/usePWAUpdate';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

class ConsoleErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  declare state: ErrorBoundaryState;
  declare props: Readonly<ErrorBoundaryProps>;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    const message = error instanceof Error ? error.message : String(error);
    return { hasError: true, errorMessage: message };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('[FIXIT Console ErrorBoundary] Error de renderizado capturado:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-xl mx-auto my-12 p-6 sm:p-8 bg-[#FFFEFA] border border-rose-200 rounded-3xl shadow-md text-center space-y-4 font-sans">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h2 className="font-serif font-bold text-xl text-[#1F2421]">
              Ocurrió un problema al cargar la vista
            </h2>
            <p className="text-xs text-[#756A5D]">
              Se interceptó un error inesperado para evitar el cierre de la consola.
            </p>
            {this.state.errorMessage && (
              <pre className="mt-2 p-3 rounded-xl bg-[#F6F4EF] border border-[#DED4C5] text-[11px] font-mono text-rose-700 overflow-x-auto text-left">
                {this.state.errorMessage}
              </pre>
            )}
          </div>
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="py-2.5 px-4 rounded-xl bg-[#082D60] hover:bg-[#07244D] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Recargar Consola</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * FIXIT App - Internal Operations Console & CRM Architecture
 * Exclusively for staff, technicians (Fixers) and administrative control (admin.tudominio.com).
 * Public customer quotation flows and install prompts have been decoupled.
 */
export default function App() {
  const [authState, setAuthState] = useState<AuthState>(() => authService.getAuthState());
  const [adminViewMode, setAdminViewMode] = useState<'admin' | 'fixer'>('admin');
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [checkingFixerDoc, setCheckingFixerDoc] = useState(false);
  const [missingFixerDoc, setMissingFixerDoc] = useState(false);
  const pwaUpdate = usePWAUpdate();

  // Escuchar el estado de autenticación en tiempo real
  useEffect(() => {
    const unsub = authService.subscribe((state) => {
      setAuthState(state);
    });
    return () => {
      unsub();
    };
  }, []);

  // Resetear la vista de auth a login solo en logout real (transición
  // con-usuario → sin-usuario). No en cada emisión sin sesión: eso desmontaba
  // AuthRegisterScreen tras un registro fallido y tragaba el mensaje de error.
  const prevAuthUserRef = useRef(authState.user);
  useEffect(() => {
    const hadUser = Boolean(prevAuthUserRef.current);
    prevAuthUserRef.current = authState.user;
    if (hadUser && !authState.user) {
      setAuthView('login');
    }
  }, [authState.user]);

  // Eliminar sesiones anónimas heredadas del flujo público
  useEffect(() => {
    if (!authState.loading && authState.user?.isAnonymous) {
      console.info('[FIXIT CRM] Desconectando sesión anónima en subdominio administrativo...');
      authService.signOut().catch((err) => {
        console.warn('[FIXIT CRM] Error al cerrar sesión anónima:', err);
      });
    }
  }, [authState.loading, authState.user]);

  // Verificar si un usuario TECHNICIAN ya posee su ficha en fixers/{uid}
  useEffect(() => {
    const u = authState.user;
    if (authState.loading || !u || u.isAnonymous || u.role !== 'TECHNICIAN') {
      setCheckingFixerDoc(false);
      setMissingFixerDoc(false);
      return;
    }

    let cancelled = false;
    setCheckingFixerDoc(true);
    getDoc(doc(db, 'fixers', u.uid))
      .then((snap) => {
        if (!cancelled) {
          setMissingFixerDoc(!snap.exists());
          setCheckingFixerDoc(false);
        }
      })
      .catch((err) => {
        console.warn('[FIXIT CRM] Error verificando ficha fixers/{uid}:', err);
        if (!cancelled) {
          setMissingFixerDoc(false);
          setCheckingFixerDoc(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authState.loading, authState.user?.uid, authState.user?.role]);

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
        {authView === 'register' ? (
          <AuthRegisterScreen
            onNavigateToLogin={() => setAuthView('login')}
            onGoBack={() => setAuthView('login')}
          />
        ) : (
          <AuthLoginScreen
            hideGuest={true}
            showBack={false}
            title="Consola Operativa FIXIT"
            subtitle="Acceso exclusivo para Administradores, Operadores y Técnicos Fixer (admin.fixitpanama.com)."
            onNavigateToRegister={() => setAuthView('register')}
          />
        )}
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

  // 4. Si el usuario autenticado tiene rol CLIENT (no posee ADMIN/OPERATOR/TECHNICIAN),
  // mostrar flujo de auto-registro Fixer con código de invitación
  if (!hasConsoleAccess) {
    return (
      <>
        <FixerOnboarding authState={authState} />
        <PWAUpdatePrompt updateState={pwaUpdate} />
      </>
    );
  }

  // 4b. Si es TECHNICIAN pero aún no tiene su ficha fixers/{uid}, mostrar modo solo-perfil
  if (isTechnician && checkingFixerDoc) {
    return (
      <div className="min-h-screen bg-[#F6F4EF] flex flex-col items-center justify-center p-6 text-center space-y-4 font-sans select-none">
        <div className="w-14 h-14 rounded-2xl bg-[#082D60] text-white flex items-center justify-center shadow-md animate-pulse">
          <Wrench className="w-7 h-7 text-white" />
        </div>
        <div className="space-y-1">
          <h2 className="font-serif font-bold text-xl text-[#082D60]">
            Consola Técnica FIXIT
          </h2>
          <p className="text-xs text-[#756A5D] flex items-center justify-center gap-1.5">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0B72D9]" />
            <span>Verificando ficha de perfil Fixer...</span>
          </p>
        </div>
      </div>
    );
  }

  if (isTechnician && missingFixerDoc) {
    return (
      <>
        <FixerOnboarding
          authState={authState}
          profileOnlyMode={true}
          onComplete={() => setMissingFixerDoc(false)}
        />
        <PWAUpdatePrompt updateState={pwaUpdate} />
      </>
    );
  }

  // Determinar si se muestra la Vista Fixer (obligatoria para TECHNICIAN, opcional para ADMIN/OPERATOR)
  const showFixerView = isTechnician || adminViewMode === 'fixer';

  // 5. Renderizar Consola Interna (CRM Admin o Vista Fixer)
  return (
    <div className={`min-h-screen flex flex-col font-sans ${showFixerView ? 'bg-[#0B0F17] text-[#F3F4F6] selection:bg-[#F59E0B]/30' : 'bg-[#F6F4EF] text-[#1F2421] selection:bg-[#0B72D9]/15'}`}>
      {/* Barra Superior Exclusiva para Equipo Interno */}
      <header className={`sticky top-0 z-40 backdrop-blur-md border-b px-4 sm:px-6 py-2.5 no-print ${showFixerView ? 'bg-[#0B0F17]/95 border-[#1F2937]' : 'bg-[#FFFEFA]/95 border-[#DED4C5]'}`}>
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
          {/* Brand & Subdomain Badge */}
          <div className="flex items-center gap-3">
            <FixitLogo variant="compact" size={28} />
            <div className={`hidden sm:block border-l pl-3 ${showFixerView ? 'border-[#1F2937]' : 'border-[#DED4C5]'}`}>
              <span className={`text-[10px] font-bold uppercase tracking-wider block ${showFixerView ? 'text-[#FBBF24]' : 'text-[#082D60]'}`}>
                {showFixerView ? 'Consola Técnica · Vista Fixer' : 'CRM & Control Operativo'}
              </span>
              <span className={`text-[11px] font-mono ${showFixerView ? 'text-[#9CA3AF]' : 'text-[#756A5D]'}`}>
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
                    ? 'bg-[#EA580C] text-white border-[#EA580C] hover:bg-[#C2410C]'
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
              <span className={`text-xs font-bold ${showFixerView ? 'text-[#F3F4F6]' : 'text-[#1F2421]'}`}>
                {currentUser.displayName || currentUser.nombre || (isTechnician ? 'Técnico Fixer' : 'Administrador')}
              </span>
              <span className={`text-[10px] ${showFixerView ? 'text-[#9CA3AF]' : 'text-[#756A5D]'}`}>
                {currentUser.email}
              </span>
            </div>

            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                showFixerView
                  ? isTechnician
                    ? 'bg-[#38BDF8]/15 border-[#38BDF8]/30 text-[#38BDF8]'
                    : 'bg-[#34D399]/15 border-[#34D399]/30 text-[#34D399]'
                  : isTechnician
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
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ml-1 ${showFixerView ? 'border-[#1F2937] hover:bg-white/10 text-[#9CA3AF] hover:text-red-400' : 'border-[#DED4C5] hover:bg-[#DED4C5]/30 text-[#756A5D] hover:text-red-700'}`}
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
        <ConsoleErrorBoundary>
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
        </ConsoleErrorBoundary>
      </main>

      <PWAUpdatePrompt updateState={pwaUpdate} />
    </div>
  );
}
