import { useState, useEffect, useRef, useCallback } from 'react';
import { APP_VERSION, APP_BUILD_DATE, APP_BUILD_TIMESTAMP } from '../config/version';

export interface PWAUpdateState {
  hasUpdate: boolean;
  isChecking: boolean;
  isUpdating: boolean;
  currentVersion: string;
  serverVersion: string;
  buildDate: string;
  buildTimestamp: string;
  lastChecked: Date | null;
  dismissed: boolean;
  updateStatus: 'idle' | 'checking' | 'available' | 'up-to-date' | 'error';
  statusMessage: string;
  applyUpdate: () => Promise<void>;
  checkForUpdate: (force?: boolean) => Promise<boolean>;
  dismissUpdate: () => void;
  undismissUpdate: () => void;
  clearAllCachesAndReload: () => Promise<void>;
}

const MIN_CHECK_INTERVAL_MS = 60 * 1000; // 60 seconds throttle
const PERIODIC_CHECK_MS = 30 * 60 * 1000; // 30 minutes periodic check (production only)
const DISMISS_KEY = 'fixit_pwa_update_dismissed_version';
const REFRESHING_KEY = 'fixit_pwa_refreshing_lock';
const APPLIED_VERSION_KEY = 'fixit_last_applied_version';

/**
 * Compare semantic versions (e.g. "1.0.2" vs "1.0.1")
 * Returns:
 *   1 if vA > vB (vA is newer)
 *  -1 if vA < vB (vA is older)
 *   0 if equal
 */
function compareSemver(vA: string, vB: string): number {
  const partsA = vA.replace(/[^0-9.]/g, '').split('.').map((p) => parseInt(p, 10) || 0);
  const partsB = vB.replace(/[^0-9.]/g, '').split('.').map((p) => parseInt(p, 10) || 0);
  const maxLen = Math.max(partsA.length, partsB.length);

  for (let i = 0; i < maxLen; i++) {
    const a = partsA[i] || 0;
    const b = partsB[i] || 0;
    if (a > b) return 1;
    if (a < b) return -1;
  }
  return 0;
}

export function usePWAUpdate(): PWAUpdateState {
  const [hasUpdate, setHasUpdate] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [serverVersion, setServerVersion] = useState<string>(APP_VERSION);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [dismissed, setDismissed] = useState<boolean>(false);
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'available' | 'up-to-date' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string>(`FIXIT al día (v${APP_VERSION})`);

  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const waitingWorkerRef = useRef<ServiceWorker | null>(null);
  const lastCheckTimeRef = useRef<number>(0);
  const isRefreshingRef = useRef<boolean>(false);
  const refreshingFiredRef = useRef<boolean>(false);

  // Clear refresh lock on clean mount
  useEffect(() => {
    try {
      sessionStorage.removeItem(REFRESHING_KEY);
    } catch {}
  }, []);

  // Safe controlled reload guarding against reload loops
  const triggerReload = useCallback(() => {
    if (refreshingFiredRef.current) return;
    try {
      if (sessionStorage.getItem(REFRESHING_KEY) === 'true') {
        return;
      }
      sessionStorage.setItem(REFRESHING_KEY, 'true');
    } catch {}

    refreshingFiredRef.current = true;
    window.location.reload();
  }, []);

  // Check server API version directly
  const checkServerVersion = useCallback(async (): Promise<{ isNewer: boolean; version: string }> => {
    try {
      const res = await fetch(`/api/version?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
      });

      if (!res.ok) {
        return { isNewer: false, version: APP_VERSION };
      }

      const data = await res.json();
      const sVersion = (data.version || APP_VERSION).trim();
      setServerVersion(sVersion);

      const semverDiff = compareSemver(sVersion, APP_VERSION);
      const isNewer = semverDiff > 0;

      try {
        const dismissedVer = sessionStorage.getItem(DISMISS_KEY);
        if (dismissedVer === sVersion) {
          setDismissed(true);
        }
      } catch {}

      return { isNewer, version: sVersion };
    } catch (err) {
      return { isNewer: false, version: APP_VERSION };
    }
  }, []);

  // Check for updates
  const checkForUpdate = useCallback(async (force = false): Promise<boolean> => {
    // In development mode, Service Worker updates are disabled
    if (!import.meta.env.PROD) {
      return false;
    }

    const now = Date.now();
    if (!force && now - lastCheckTimeRef.current < MIN_CHECK_INTERVAL_MS) {
      return hasUpdate;
    }

    lastCheckTimeRef.current = now;
    setIsChecking(true);
    setUpdateStatus('checking');

    try {
      // 1. Verify server version first
      const serverCheck = await checkServerVersion();

      // 2. Query production Service Worker registration if available
      if ('serviceWorker' in navigator) {
        let reg = registrationRef.current;
        if (!reg) {
          reg = (await navigator.serviceWorker.getRegistration()) || null;
          registrationRef.current = reg;
        }

        if (reg) {
          const scriptURL = reg.active?.scriptURL || reg.installing?.scriptURL || reg.waiting?.scriptURL || '';
          // Ensure we only update production /sw.js
          if (scriptURL.includes('/sw.js')) {
            try {
              await reg.update();
            } catch (swErr) {
              console.warn('[FIXIT PWA] Aviso al verificar actualización:', swErr);
            }
          }

          if (reg.waiting) {
            waitingWorkerRef.current = reg.waiting;
            const appliedVersion = localStorage.getItem(APPLIED_VERSION_KEY);

            if (serverCheck.isNewer || (appliedVersion !== serverCheck.version && serverCheck.version !== APP_VERSION)) {
              setHasUpdate(true);
              setUpdateStatus('available');
              setStatusMessage(`Nueva versión v${serverCheck.version} lista.`);
              return true;
            }
          }
        }
      }

      if (serverCheck.isNewer) {
        setHasUpdate(true);
        setUpdateStatus('available');
        setStatusMessage(`Nueva versión v${serverCheck.version} disponible.`);
        return true;
      }

      setLastChecked(new Date());
      setHasUpdate(false);
      setUpdateStatus('up-to-date');
      setStatusMessage(`FIXIT al día (v${APP_VERSION}).`);
      return false;
    } catch (err) {
      setUpdateStatus('error');
      setStatusMessage('No se pudo comprobar la actualización.');
      return false;
    } finally {
      setIsChecking(false);
    }
  }, [checkServerVersion, hasUpdate]);

  // Main lifecycle setup
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    // DEVELOPMENT ENVIRONMENT:
    // Do NOT register /sw.js. Clean up any leftover registrations from dev or prior sessions.
    if (!import.meta.env.PROD) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const reg of registrations) {
          reg.unregister().catch(() => {});
        }
      }).catch(() => {});
      return;
    }

    // PRODUCTION ENVIRONMENT:
    // Register exclusively '/sw.js'
    let isMounted = true;

    const handleWaitingWorker = (worker: ServiceWorker) => {
      if (!isMounted) return;
      waitingWorkerRef.current = worker;

      checkServerVersion().then(({ isNewer, version }) => {
        if (!isMounted) return;
        const appliedVersion = localStorage.getItem(APPLIED_VERSION_KEY);
        if (isNewer || (version !== APP_VERSION && appliedVersion !== version)) {
          setHasUpdate(true);
          setUpdateStatus('available');
          setStatusMessage(`Nueva versión v${version} disponible.`);
        }
      });
    };

    const registerProductionSW = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        if (!isMounted) return;
        registrationRef.current = reg;

        // Check if there is already a waiting worker
        if (reg.waiting) {
          handleWaitingWorker(reg.waiting);
        }

        // Listen for new worker installation (updatefound)
        reg.addEventListener('updatefound', () => {
          const installingWorker = reg.installing;
          if (!installingWorker) return;

          installingWorker.addEventListener('statechange', () => {
            if (!isMounted) return;
            if (installingWorker.state === 'installed') {
              // If there is an existing controller, this is a new updated version
              if (navigator.serviceWorker.controller) {
                handleWaitingWorker(installingWorker);
              } else {
                console.log('[FIXIT PWA] Service Worker activo y precacheado para funcionamiento offline.');
              }
            }
          });
        });
      } catch (err) {
        console.error('[FIXIT PWA] Error registrando Service Worker (/sw.js):', err);
      }
    };

    registerProductionSW();

    // Listen to controllerchange: fires when the waiting worker skips waiting and claims clients
    const handleControllerChange = () => {
      console.log('[FIXIT PWA] Controllerchange detectado.');
      if (isRefreshingRef.current) {
        triggerReload();
      }
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    // Visibility and Online handlers for production
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkForUpdate(false);
      }
    };

    const handleOnline = () => {
      checkForUpdate(true);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);

    // Periodic check every 30 minutes in production
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        checkForUpdate(false);
      }
    }, PERIODIC_CHECK_MS);

    return () => {
      isMounted = false;
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      clearInterval(interval);
    };
  }, [checkForUpdate, checkServerVersion, triggerReload]);

  // Apply update when user clicks "Actualizar ahora"
  const applyUpdate = useCallback(async () => {
    setIsUpdating(true);
    setStatusMessage('Descargando e instalando nueva versión...');
    isRefreshingRef.current = true;

    try {
      // 1. Mark this version as applied in storage to prevent re-opening modal
      try {
        localStorage.setItem(APPLIED_VERSION_KEY, serverVersion);
        sessionStorage.setItem(REFRESHING_KEY, 'true');
      } catch {}

      // 2. Send SKIP_WAITING to the waiting worker
      const worker = waitingWorkerRef.current;
      if (worker) {
        console.log('[FIXIT PWA] Enviando SKIP_WAITING al Service Worker...');
        worker.postMessage({ type: 'SKIP_WAITING' });
      } else {
        const reg = registrationRef.current || (await navigator.serviceWorker.getRegistration());
        if (reg?.waiting) {
          console.log('[FIXIT PWA] Enviando SKIP_WAITING a reg.waiting...');
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        } else {
          // If no waiting worker was found, proceed directly to reload
          triggerReload();
          return;
        }
      }

      // 3. Dismiss update UI immediately
      setHasUpdate(false);

      // 4. Safety fallback reload if controllerchange does not fire within 2 seconds
      setTimeout(() => {
        triggerReload();
      }, 2000);
    } catch (err) {
      console.error('[FIXIT PWA] Error aplicando actualización:', err);
      triggerReload();
    }
  }, [serverVersion, triggerReload]);

  // Dismiss banner ("Más tarde")
  const dismissUpdate = useCallback(() => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, serverVersion);
    } catch {}
  }, [serverVersion]);

  // Re-open update prompt (if user re-initiates from settings/menu)
  const undismissUpdate = useCallback(() => {
    setDismissed(false);
    try {
      sessionStorage.removeItem(DISMISS_KEY);
    } catch {}
  }, []);

  // Emergency safety fallback: Clear all caches and reload
  const clearAllCachesAndReload = useCallback(async () => {
    setIsUpdating(true);
    try {
      if ('caches' in window) {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map((key) => caches.delete(key)));
        console.log('[FIXIT PWA] Cachés purgadas con éxito.');
      }
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((r) => r.unregister()));
        console.log('[FIXIT PWA] Service Workers desregistrados.');
      }
    } catch (e) {
      console.warn('[FIXIT PWA] Error limpiando cachés:', e);
    } finally {
      triggerReload();
    }
  }, [triggerReload]);

  return {
    hasUpdate,
    isChecking,
    isUpdating,
    currentVersion: APP_VERSION,
    serverVersion,
    buildDate: APP_BUILD_DATE,
    buildTimestamp: APP_BUILD_TIMESTAMP,
    lastChecked,
    dismissed,
    updateStatus,
    statusMessage,
    applyUpdate,
    checkForUpdate,
    dismissUpdate,
    undismissUpdate,
    clearAllCachesAndReload,
  };
}
