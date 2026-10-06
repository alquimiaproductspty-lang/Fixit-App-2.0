import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';

export type FixitRoute =
  | { step: 'home' }
  | { step: 'category'; categoryId: string }
  | { step: 'service'; serviceId: string }
  | { step: 'detail'; serviceId: string }
  | { step: 'summary'; serviceId: string }
  | { step: 'login' }
  | { step: 'register' }
  | { step: 'admin' }
  | { step: 'pro' }
  | { step: 'privacy' }; // Agregado step 'privacy'

export type NavigationDirection = 'forward' | 'back' | 'none';

export function parsePath(path: string): FixitRoute {
  const clean = path.replace(/^\/+/, '');
  if (!clean || clean === 'home') {
    return { step: 'home' };
  }
  if (clean === 'admin' || clean === 'panel') {
    return { step: 'admin' };
  }
  if (clean === 'login' || clean === 'ingresar') {
    return { step: 'login' };
  }
  if (clean === 'register' || clean === 'registro') {
    return { step: 'register' };
  }
  if (clean === 'pro' || clean === 'empresas') { // 2. Agregado parsePath para 'pro'
    return { step: 'pro' };
  }
  if (clean === 'privacidad' || clean === 'privacy' || clean === 'privacy-policy' || clean === 'politica-de-privacidad' || clean === 'politica-privacidad') {
    return { step: 'privacy' };
  }
  const parts = clean.split('/');
  const prefix = parts[0];
  const id = decodeURIComponent(parts.slice(1).join('/'));

  if (prefix === 'category' && id) {
    return { step: 'category', categoryId: id };
  }
  if (prefix === 'service' && id) {
    return { step: 'service', serviceId: id };
  }
  if (prefix === 'detail' && id) {
    return { step: 'detail', serviceId: id };
  }
  if (prefix === 'summary' && id) {
    return { step: 'summary', serviceId: id };
  }
  return { step: 'home' };
}

export function routeToPath(route: FixitRoute): string {
  switch (route.step) {
    case 'home': return '';
    case 'login': return 'login';
    case 'register': return 'register';
    case 'admin': return 'admin';
    case 'pro': return 'pro'; // 3. Agregado routeToPath para 'pro'
    case 'privacy': return 'privacidad';
    case 'category': return `category/${encodeURIComponent(route.categoryId)}`;
    case 'service': return `service/${encodeURIComponent(route.serviceId)}`;
    case 'detail': return `detail/${encodeURIComponent(route.serviceId)}`;
    case 'summary': return `summary/${encodeURIComponent(route.serviceId)}`;
  }
}

export function routeToKey(route: FixitRoute): string {
  switch (route.step) {
    case 'home': return 'home';
    case 'login': return 'login';
    case 'register': return 'register';
    case 'admin': return 'admin';
    case 'pro': return 'pro'; // 4. Agregado routeToKey para 'pro'
    case 'privacy': return 'privacy';
    case 'category': return `category:${route.categoryId}`;
    case 'service': return `service:${route.serviceId}`;
    case 'detail': return `detail:${route.serviceId}`;
    case 'summary': return `summary:${route.serviceId}`;
  }
}

export function getParentRoute(route: FixitRoute, fallbackCategory?: string): FixitRoute {
  switch (route.step) {
    case 'summary': return { step: 'detail', serviceId: route.serviceId };
    case 'detail': return { step: 'service', serviceId: route.serviceId };
    case 'service':
      if (fallbackCategory) {
        return { step: 'category', categoryId: fallbackCategory.toLowerCase().replace(/\s+/g, '-') };
      }
      return { step: 'home' };
    case 'category': return { step: 'home' };
    case 'register': return { step: 'login' };
    case 'admin': return { step: 'home' };
    case 'pro': return { step: 'home' }; // 5. Agregado getParentRoute para volver al inicio desde 'pro'
    case 'privacy': return { step: 'home' };
    case 'login':
    default: return { step: 'home' };
  }
}

export function scrollGlobalToTop() {
  if (typeof window === 'undefined') return;
  try {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  } catch {
    window.scrollTo(0, 0);
  }
}

export function useFixitRouter() {
  const [currentRoute, setCurrentRoute] = useState<FixitRoute>(() => {
    return parsePath(typeof window !== 'undefined' ? window.location.pathname : '');
  });

  const currentRouteRef = useRef<FixitRoute>(currentRoute);
  currentRouteRef.current = currentRoute;

  const historyIndexRef = useRef<number>(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if ('scrollRestoration' in window.history) {
      try { window.history.scrollRestoration = 'manual'; } catch {}
    }

    const state = window.history.state;
    if (state && typeof state.fixitIdx === 'number') {
      historyIndexRef.current = state.fixitIdx;
    } else {
      const initialRoute = parsePath(window.location.pathname);
      const pathStr = routeToPath(initialRoute);
      const targetPath = pathStr ? `/${pathStr}` : '/';
      try {
        window.history.replaceState({ route: initialRoute, fixitIdx: 0 }, '', targetPath);
      } catch {}
      historyIndexRef.current = 0;
    }

    const handlePopState = (event: PopStateEvent) => {
      const prevIdx = historyIndexRef.current;
      const targetRoute = (event.state && event.state.route) 
        ? event.state.route 
        : parsePath(window.location.pathname);

      const targetIdx = (event.state && typeof event.state.fixitIdx === 'number')
        ? event.state.fixitIdx
        : Math.max(0, prevIdx - 1);

      historyIndexRef.current = targetIdx;
      setCurrentRoute(targetRoute);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;
    try { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); } catch { window.scrollTo(0, 0); }
  }, [currentRoute]);

  const navigate = useCallback((route: FixitRoute, replace = false) => {
    const pathStr = routeToPath(route);
    const targetPath = pathStr ? `/${pathStr}` : '/';

    let nextIdx = historyIndexRef.current;
    if (replace) {
      try { window.history.replaceState({ route, fixitIdx: nextIdx }, '', targetPath); } catch {}
    } else {
      nextIdx = historyIndexRef.current + 1;
      historyIndexRef.current = nextIdx;
      try { window.history.pushState({ route, fixitIdx: nextIdx }, '', targetPath); } catch {}
    }
    setCurrentRoute(route);
  }, []);

  const goBack = useCallback((fallbackRoute?: FixitRoute) => {
    if (historyIndexRef.current > 0) {
      window.history.back();
    } else if (fallbackRoute) {
      navigate(fallbackRoute, true);
    } else {
      navigate(getParentRoute(currentRouteRef.current), true);
    }
  }, [navigate]);

  return { currentRoute, navigate, goBack, isBackNav: false };
}
