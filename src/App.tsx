import React, { useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { CustomerData, Service, ServiceCategory, PaintingCalculation, ACInstallationDetails } from './types';
import { getServiceById, FIXIT_CATALOG } from './data/catalog';
import { authService, AuthState } from './lib/firebase';
import { Navbar } from './components/Navbar';
import { CategorySelectionStep } from './components/CategorySelectionStep';
import { ServiceSelectionStep } from './components/ServiceSelectionStep';
import { ServicePriceStep } from './components/ServicePriceStep';
import { ProblemDetailStep } from './components/ProblemDetailStep';
import { SummaryWhatsAppStep } from './components/SummaryWhatsAppStep';
import { AdminDashboardView } from './components/AdminDashboardView';
import { AuthLoginScreen } from './components/auth/AuthLoginScreen';
import { AuthRegisterScreen } from './components/auth/AuthRegisterScreen';
import { SplashScreen } from './components/SplashScreen';
import { Footer } from './components/Footer';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { PWAUpdatePrompt } from './components/PWAUpdatePrompt';
import { usePWAUpdate } from './hooks/usePWAUpdate';
import { useFixitRouter, getParentRoute } from './hooks/useFixitRouter';
import { FIXIT_WHATSAPP_NUMBER, openWhatsAppSafely, generateDirectWhatsAppLink } from './lib/whatsapp';
import { RotateCcw, ArrowRight } from 'lucide-react';
import { AnimatePresence } from 'motion/react';

// 1. NUEVO: Importamos el componente de FIXIT Pro
import FixitPro from './components/FixitPro'; 

const STORAGE_KEY_FIXIT_DRAFT = 'fixit_customer_draft_v2';

export default function App() {
  const { currentRoute, navigate, goBack } = useFixitRouter();
  const [authState, setAuthState] = useState<AuthState>(() => authService.getAuthState());
  const pwaUpdate = usePWAUpdate();

  // App Initial Launch Animated Splash Screen state:
  const [isInitialSplashActive, setIsInitialSplashActive] = useState(() => {
    try {
      return !sessionStorage.getItem('fixit_splash_shown');
    } catch {
      return true;
    }
  });

  const handleSplashFinish = () => {
    try {
      sessionStorage.setItem('fixit_splash_shown', 'true');
    } catch {}
    setIsInitialSplashActive(false);
  };

  // Core Request State
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory>('Plomería');
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [problemDescription, setProblemDescription] = useState<string>('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerAddress, setCustomerAddress] = useState<string>('');
  const [paintingCalculation, setPaintingCalculation] = useState<PaintingCalculation | null>(null);
  const [acDetails, setAcDetails] = useState<ACInstallationDetails | null>(null);
  const [adjustedPrice, setAdjustedPrice] = useState<number | null>(null);

  const activeService = useMemo(() => {
    if (
      currentRoute.step === 'service' ||
      currentRoute.step === 'detail' ||
      currentRoute.step === 'summary'
    ) {
      if (selectedService && selectedService.id === currentRoute.serviceId) {
        return selectedService;
      }
      return getServiceById(currentRoute.serviceId) || selectedService;
    }
    return selectedService;
  }, [currentRoute, selectedService]);

  const activeCategory = useMemo(() => {
    if (currentRoute.step === 'category') {
      const normalizedCat = currentRoute.categoryId.replace(/-/g, ' ');
      const match = FIXIT_CATALOG.find(
        (s) => s.category.toLowerCase() === normalizedCat.toLowerCase()
      );
      if (match) return match.category;
    }
    return activeService ? activeService.category : selectedCategory;
  }, [currentRoute, activeService, selectedCategory]);

  useEffect(() => {
    if (activeService && (!selectedService || selectedService.id !== activeService.id)) {
      setSelectedService(activeService);
      setSelectedCategory(activeService.category);
    } else if (currentRoute.step === 'category' && activeCategory !== selectedCategory) {
      setSelectedCategory(activeCategory);
    }
  }, [activeService, activeCategory, currentRoute.step, selectedService, selectedCategory]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_FIXIT_DRAFT);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.serviceId) {
          const s = getServiceById(parsed.serviceId);
          if (s) {
            setSelectedService(s);
            setSelectedCategory(s.category);
          }
        }
        if (parsed.selectedCategory) setSelectedCategory(parsed.selectedCategory);
        if (parsed.problemDescription) setProblemDescription(parsed.problemDescription);
        if (Array.isArray(parsed.photos)) setPhotos(parsed.photos);
        if (parsed.customerName) setCustomerName(parsed.customerName);
        if (parsed.customerPhone) setCustomerPhone(parsed.customerPhone);
        if (parsed.customerAddress) setCustomerAddress(parsed.customerAddress);
        if (parsed.paintingCalculation) setPaintingCalculation(parsed.paintingCalculation);
        if (parsed.acDetails) setAcDetails(parsed.acDetails);
        if (typeof parsed.adjustedPrice === 'number') setAdjustedPrice(parsed.adjustedPrice);
      }
    } catch (e) {
      console.warn('Error cargando borrador local:', e);
    }
  }, []);

  useEffect(() => {
    try {
      if (
        !activeService &&
        !problemDescription &&
        photos.length === 0 &&
        !customerName &&
        !customerPhone &&
        !customerAddress &&
        !paintingCalculation &&
        !acDetails &&
        !adjustedPrice
      ) {
        localStorage.removeItem(STORAGE_KEY_FIXIT_DRAFT);
        return;
      }

      const draft = {
        serviceId: activeService?.id,
        selectedCategory: activeCategory,
        problemDescription,
        photos,
        customerName,
        customerPhone,
        customerAddress,
        paintingCalculation,
        acDetails,
        adjustedPrice,
      };
      localStorage.setItem(STORAGE_KEY_FIXIT_DRAFT, JSON.stringify(draft));
    } catch (e) {
      console.warn('Error guardando borrador:', e);
    }
  }, [
    activeService,
    activeCategory,
    problemDescription,
    photos,
    customerName,
    customerPhone,
    customerAddress,
    paintingCalculation,
    acDetails,
    adjustedPrice,
  ]);

  const userPrefilledRef = useRef(false);

  useEffect(() => {
    const unsub = authService.subscribe((state) => {
      setAuthState(state);
      if (state.user && !userPrefilledRef.current) {
        userPrefilledRef.current = true;
        setCustomerName((prev) => prev || state.user?.nombre || '');
        setCustomerPhone((prev) => prev || state.user?.telefono || '');
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (authState.user && (currentRoute.step === 'login' || currentRoute.step === 'register')) {
      navigate({ step: 'home' }, true);
    }
  }, [authState.user, currentRoute.step, navigate]);

  const handleSelectCategory = (category: ServiceCategory) => {
    setSelectedCategory(category);
    const categorySlug = category.toLowerCase().replace(/\s+/g, '-');
    navigate({ step: 'category', categoryId: categorySlug });
  };

  const handleSelectService = (service: Service) => {
    setSelectedService(service);
    setSelectedCategory(service.category);
    navigate({ step: 'service', serviceId: service.id });
  };

  const handleContinueFromPrice = (details?: { 
    paintingCalculation?: PaintingCalculation; 
    acDetails?: ACInstallationDetails;
    adjustedPrice?: number;
  }) => {
    if (!activeService) return;
    if (details?.paintingCalculation) setPaintingCalculation(details.paintingCalculation);
    if (details?.acDetails) setAcDetails(details.acDetails);
    if (details?.adjustedPrice !== undefined) setAdjustedPrice(details.adjustedPrice);

    navigate({ step: 'detail', serviceId: activeService.id });
  };

  const handleContinueFromDetail = () => {
    if (!activeService) return;
    navigate({ step: 'summary', serviceId: activeService.id });
  };

  const handleOpenDirectWhatsApp = () => {
    const url = generateDirectWhatsAppLink('Hola FIXIT. Quisiera consultar sobre un servicio para mi hogar.');
    openWhatsAppSafely(url);
  };

  const handleResetDraft = () => {
    try {
      localStorage.removeItem(STORAGE_KEY_FIXIT_DRAFT);
    } catch {}
    userPrefilledRef.current = false;
    setSelectedService(null);
    setProblemDescription('');
    setPhotos([]);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setPaintingCalculation(null);
    setAcDetails(null);
    setAdjustedPrice(null);
    navigate({ step: 'home' });
  };

  const isSubStep = currentRoute.step !== 'home';

  if (currentRoute.step === 'login') {
    return (
      <AuthLoginScreen
        onSuccess={() => navigate({ step: 'home' }, true)}
        onNavigateToRegister={() => navigate({ step: 'register' })}
        onGoBack={() => goBack({ step: 'home' })}
      />
    );
  }

  if (currentRoute.step === 'register') {
    return (
      <AuthRegisterScreen
        onSuccess={() => navigate({ step: 'home' }, true)}
        onNavigateToLogin={() => navigate({ step: 'login' })}
        onGoBack={() => goBack({ step: 'login' })}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F4EF] text-[#1F2421] flex flex-col font-sans selection:bg-[#0B72D9]/15">
      <AnimatePresence>
        {isInitialSplashActive && (
          <SplashScreen onFinish={handleSplashFinish} />
        )}
      </AnimatePresence>

      <PWAInstallBanner />

      <Navbar
        currentView={currentRoute.step}
        canGoBack={isSubStep}
        onGoBack={() => {
          const parent = getParentRoute(currentRoute, activeCategory);
          goBack(parent);
        }}
        onNavigate={(view) => {
          if (view === 'login') {
            navigate({ step: 'login' });
          } else if (view === 'register') {
            navigate({ step: 'register' });
          } else if (view === 'admin') {
            navigate({ step: 'admin' });
          } else if (view === 'pro') {
            // 2. NUEVO: Agregamos la ruta en la navegación principal
            navigate({ step: 'pro' });
          } else {
            navigate({ step: 'home' });
          }
        }}
        authState={authState}
        hasUpdate={pwaUpdate.hasUpdate}
      />

      <main className="flex-1 pb-16">
        {currentRoute.step === 'home' && activeService && (
          <div className="max-w-xl mx-auto px-4 pt-3">
            <div className="bg-[#FFFEFA] border border-[#0B72D9]/30 rounded-2xl p-3 shadow-2xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0B72D9] animate-pulse shrink-0" />
                <p className="text-xs text-[#1F2421] truncate">
                  Solicitud en curso: <strong>{activeService.service_name}</strong>
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => navigate({ step: 'service', serviceId: activeService.id })}
                  className="text-xs font-bold text-[#0B72D9] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Continuar</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleResetDraft}
                  className="p-1 text-[#756A5D] hover:text-red-600 transition-colors cursor-pointer"
                  title="Descartar borrador"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="w-full">
          {currentRoute.step === 'home' && (
            <div key="step-home" className="w-full">
              <CategorySelectionStep
                onSelectCategory={handleSelectCategory}
                onSelectService={handleSelectService}
                onOpenWhatsAppDirect={handleOpenDirectWhatsApp}
              />
            </div>
          )}

          {currentRoute.step === 'category' && (
            <div key={`step-category-${activeCategory}`} className="w-full">
              <ServiceSelectionStep
                category={activeCategory}
                onSelectService={handleSelectService}
                onBack={() => goBack({ step: 'home' })}
              />
            </div>
          )}

          {currentRoute.step === 'service' && activeService && (
            <div key={`step-service-${activeService.id}`} className="w-full">
              <ServicePriceStep
                service={activeService}
                onContinue={handleContinueFromPrice}
                onBack={() => goBack({ step: 'category', categoryId: activeCategory.toLowerCase().replace(/\s+/g, '-') })}
              />
            </div>
          )}

          {currentRoute.step === 'detail' && activeService && (
            <div key={`step-detail-${activeService.id}`} className="w-full">
              <ProblemDetailStep
                service={activeService}
                description={problemDescription}
                onChangeDescription={setProblemDescription}
                photos={photos}
                onChangePhotos={setPhotos}
                onContinue={handleContinueFromDetail}
                onBack={() => goBack({ step: 'service', serviceId: activeService.id })}
              />
            </div>
          )}

          {currentRoute.step === 'summary' && activeService && (
            <div key={`step-summary-${activeService.id}`} className="w-full">
              <SummaryWhatsAppStep
                service={activeService}
                description={problemDescription}
                photos={photos}
                customerName={customerName}
                onChangeCustomerName={setCustomerName}
                customerPhone={customerPhone}
                onChangeCustomerPhone={setCustomerPhone}
                customerAddress={customerAddress}
                onChangeCustomerAddress={setCustomerAddress}
                paintingCalculation={paintingCalculation}
                acDetails={acDetails}
                adjustedPrice={adjustedPrice || undefined}
                onBack={() => goBack({ step: 'detail', serviceId: activeService.id })}
                onReset={handleResetDraft}
              />
            </div>
          )}

          {currentRoute.step === 'admin' && (
            <div key="step-admin" className="w-full">
              <AdminDashboardView
                authState={authState}
                onGoHome={() => navigate({ step: 'home' })}
              />
            </div>
          )}

          {/* 3. NUEVO: Agregamos la visualización del componente FIXIT Pro */}
          {currentRoute.step === 'pro' && (
            <div key="step-pro" className="w-full">
              <FixitPro />
            </div>
          )}

          {(currentRoute.step === 'service' || currentRoute.step === 'detail' || currentRoute.step === 'summary') && !activeService && (
            <div key="step-missing-service" className="w-full">
              <div className="w-full max-w-xl mx-auto px-4 py-10 text-center space-y-4">
                <div className="bg-[#FFFEFA] border border-[#DED4C5] rounded-3xl p-6 sm:p-8 shadow-2xs space-y-3">
                  <h3 className="font-serif font-bold text-lg text-[#1F2421]">
                    No se encontró el servicio seleccionado
                  </h3>
                  <p className="text-xs text-[#756A5D] leading-relaxed max-w-sm mx-auto">
                    Selecciona una categoría de nuestro catálogo para iniciar tu solicitud con precios estándar transparentes.
                  </p>
                  <button
                    onClick={() => navigate({ step: 'home' })}
                    className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-[#0B72D9] text-white font-semibold text-xs shadow-xs hover:bg-[#085ab0] transition-colors active:scale-95 cursor-pointer mt-2"
                  >
                    Ver catálogo FIXIT
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <PWAUpdatePrompt updateState={pwaUpdate} />
      <Footer version={pwaUpdate.currentVersion} hasUpdate={pwaUpdate.hasUpdate} />
    </div>
  );
} 
