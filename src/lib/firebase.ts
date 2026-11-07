import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInAnonymously,
  signOut as fbSignOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  User as FirebaseUser,
  deleteUser
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  getDoc, 
  getDocFromServer,
  updateDoc, 
  deleteDoc,
  query, 
  where,
  orderBy,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { 
  AppRole, 
  UserRole, 
  UserStatus, 
  UserProfile, 
  normalizeRole, 
  ROLE_DISPLAY 
} from '../types';

// ============================================================================
// Firebase App & Database Initialization
// ============================================================================
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Firestore en base (default): ahi viven los documentos reales (users, requests, etc.).
export const db = getFirestore(app);
export const auth = getAuth(app);

// Explicitly ensure official Firebase browser local persistence for Safari iOS, Chrome Android, and installed PWAs
if (typeof window !== 'undefined') {
  setPersistence(auth, browserLocalPersistence).catch((err) => {
    console.warn('[FIXIT Auth] Local persistence notice:', err);
  });
}

// ============================================================================
// Mandatory Firebase Skill Error Handler
// ============================================================================
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test initial connection to Firestore (CRITICAL Skill Requirement)
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error: any) {
    // Gracefully handle transient connectivity or offline mode
    if (error?.code === 'unavailable') {
      // Normal offline resilience behavior, Firestore SDK logs its own notice
      return;
    }
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('[FIXIT Firebase] Operating in offline mode with cached persistence.');
    }
  }
}
testConnection(); console.info('[FIXIT Auth] modulo firebase cargado (build con fix loop)');

// ============================================================================
// Active User & AuthState Definition
// ============================================================================
export interface ActiveUser {
  uid: string;
  email: string;
  displayName: string;
  nombre: string;
  phone?: string;
  telefono?: string;
  photoURL?: string;
  role: AppRole;
  rol: UserRole;
  status: UserStatus;
  isActive: boolean;
  isAdmin: boolean;
  isOperator: boolean;
  isTechnician: boolean;
  isClient: boolean;
  isAnonymous?: boolean;
  technicianId?: string;
}

export interface AuthState {
  user: ActiveUser | null;
  loading: boolean;
  error?: string | null;
}

type Listener<T> = (data: T) => void;
const authListeners: Set<Listener<AuthState>> = new Set();

// Single source of truth for auth state, starting in loading state while Firebase confirms session
let currentAuthState: AuthState = {
  user: null,
  loading: true,
  error: null,
};

function notifyAuthListeners() {
  authListeners.forEach((l) => l(currentAuthState));
}

// Convert Firestore UserProfile or FirebaseUser to ActiveUser
export function buildActiveUser(
  uid: string, 
  email: string, 
  displayName: string, 
  role: AppRole, 
  status: UserStatus = 'ACTIVE',
  phone?: string,
  technicianId?: string,
  photoURL?: string,
  isAnonymous?: boolean
): ActiveUser {
  const normRole = normalizeRole(role);
  const rawStatus = (status || 'ACTIVE').toUpperCase();
  const normStatus: UserStatus = (rawStatus === 'INACTIVO' || rawStatus === 'INACTIVE') ? 'INACTIVE' : 'ACTIVE';
  const isActive = normStatus === 'ACTIVE';

  const finalDisplayName = displayName || (isAnonymous ? 'Invitado FIXIT' : (email ? email.split('@')[0] : 'Usuario FIXIT'));

  return {
    uid,
    email: email || '',
    displayName: finalDisplayName,
    nombre: finalDisplayName,
    phone,
    telefono: phone,
    photoURL,
    role: normRole,
    rol: ((ROLE_DISPLAY[normRole]?.es as unknown) as UserRole) || 'Cliente',
    status: normStatus,
    isActive,
    isAdmin: normRole === 'ADMIN',
    isOperator: normRole === 'ADMIN' || normRole === 'OPERATOR',
    isTechnician: normRole === 'ADMIN' || normRole === 'OPERATOR' || normRole === 'TECHNICIAN',
    isClient: normRole === 'CLIENT',
    isAnonymous: !!isAnonymous,
    technicianId: normRole === 'TECHNICIAN' ? (technicianId || uid) : undefined,
  };
}

// Synchronize Firebase Auth user with Firestore user document
export async function syncUserWithFirestore(fbUser: FirebaseUser): Promise<ActiveUser> {
  const userDocRef = doc(db, 'users', fbUser.uid);
  const now = new Date().toISOString();
  const isAnonymous = !!fbUser.isAnonymous;

  const isBootstrappedAdmin = !isAnonymous && !!fbUser.email && (
    fbUser.email.toLowerCase() === 'alquimiaproductspty@gmail.com' ||
    fbUser.email.toLowerCase() === 'ricardog20852016@gmail.com'
  );

  try {
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      const data = snap.data();
      // CRITICAL: NEVER overwrite ADMIN, OPERATOR, or TECHNICIAN with CLIENT!
      const role = isBootstrappedAdmin ? 'ADMIN' : normalizeRole(data.role || 'CLIENT');
      const rawStatus = (data.status || 'ACTIVE').toUpperCase();
      const status: UserStatus = (rawStatus === 'INACTIVO' || rawStatus === 'INACTIVE') ? 'INACTIVE' : 'ACTIVE';

      // Record last login and update profile metadata without touching role or status
      try {
        await updateDoc(userDocRef, {
          photoURL: fbUser.photoURL || data.photoURL || '',
          displayName: data.displayName || fbUser.displayName || (isAnonymous ? 'Invitado FIXIT' : 'Usuario FIXIT'),
          lastLoginAt: now,
          updatedAt: now,
        });
      } catch (err) {
        console.warn('[FIXIT Auth] Profile touch note:', err);
      }

      const activeUser = buildActiveUser(
        fbUser.uid,
        fbUser.email || data.email || '',
        data.displayName || fbUser.displayName || (isAnonymous ? 'Invitado FIXIT' : ''),
        role,
        status,
        data.phone || fbUser.phoneNumber || undefined,
        data.technicianId,
        fbUser.photoURL || data.photoURL || undefined,
        isAnonymous
      );

      return activeUser;
    } else {
      // Create new user profile in Firestore
      const role = isBootstrappedAdmin ? 'ADMIN' : 'customer';
      const defaultName = isAnonymous ? 'Invitado FIXIT' : (fbUser.displayName || fbUser.email?.split('@')[0] || (isBootstrappedAdmin ? 'Admin FIXIT' : 'Usuario FIXIT'));
      const profileData = {
        uid: fbUser.uid,
        email: (fbUser.email || '').toLowerCase().trim(),
        displayName: defaultName,
        phone: fbUser.phoneNumber || '',
        photoURL: fbUser.photoURL || '',
        role,
        city: 'Ciudad de Panamá',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        marketingOptIn: !isAnonymous,
        status: 'active',
      };

      try {
        await setDoc(userDocRef, profileData);
      } catch (setErr) {
        console.warn('[FIXIT Auth] Aviso al crear documento en Firestore durante sync:', setErr);
      }

      return buildActiveUser(
        fbUser.uid,
        profileData.email,
        profileData.displayName,
        isBootstrappedAdmin ? 'ADMIN' : 'CLIENT',
        'ACTIVE',
        profileData.phone,
        undefined,
        profileData.photoURL,
        isAnonymous
      );
    }
  } catch (err) {
    console.warn('[FIXIT Auth] Firestore sync notice, using verified auth fallback:', err);
    // Provide a resilient fallback from verified Firebase credentials
    // so momentary connectivity blips or permission propagation delays don't lock out the user
    return buildActiveUser(
      fbUser.uid,
      fbUser.email || '',
      fbUser.displayName || (isAnonymous ? 'Invitado FIXIT' : (fbUser.email?.split('@')[0] || 'Usuario FIXIT')),
      isBootstrappedAdmin ? 'ADMIN' : 'CLIENT',
      'ACTIVE',
      fbUser.phoneNumber || undefined,
      undefined,
      fbUser.photoURL || undefined,
      isAnonymous
    );
  }
}

let isAutoSigningInGuest = false; setTimeout(() => { if (currentAuthState.loading) { console.warn('[FIXIT Auth] watchdog: forzando salida del loader a los 15s'); currentAuthState = { user: null, loading: false, error: null }; notifyAuthListeners(); } }, 15000);

// Single, clean onAuthStateChanged listener
onAuthStateChanged(auth, async (fbUser) => { console.info('[FIXIT Auth] listener disparo, sesion:', !!fbUser);
  if (fbUser) {
    isAutoSigningInGuest = false;
    try {
      const activeUser = await Promise.race([syncUserWithFirestore(fbUser), new Promise<ActiveUser>((_, reject) => setTimeout(() => reject(new Error('[FIXIT Auth] Timeout en sincronizacion de perfil (12s)')), 12000))]);
      currentAuthState = { user: activeUser, loading: false, error: null };
    } catch (err: any) {
      console.error('[FIXIT Auth Error] onAuthStateChanged sync error:', err);
      const fallbackGuest = buildActiveUser(
        fbUser.uid,
        fbUser.email || '',
        fbUser.displayName || (fbUser.isAnonymous ? 'Invitado FIXIT' : 'Usuario FIXIT'),
        'CLIENT',
        'ACTIVE',
        undefined,
        undefined,
        undefined,
        fbUser.isAnonymous
      );
      currentAuthState = { user: fallbackGuest, loading: false, error: null };
    }
    notifyAuthListeners();
  } else {
    // Usuario no autenticado en Firebase Auth: inicializar automáticamente sesión de invitado
    if (!isAutoSigningInGuest) {
      isAutoSigningInGuest = true;
      try {
        console.info('[FIXIT Auth] boot: sin sesion -> login'); currentAuthState = { user: null, loading: false, error: null }; notifyAuthListeners(); // Admin CRM: sin auto-invitado (evita loop con App.tsx)
      } catch (err) {
        console.warn('[FIXIT Auth] Fallback automático de invitado en carga:', err);
        const fallbackGuest = buildActiveUser(
          'guest-' + Date.now(),
          '',
          'Invitado FIXIT',
          'CLIENT',
          'ACTIVE',
          undefined,
          undefined,
          undefined,
          true
        );
        currentAuthState = { user: fallbackGuest, loading: false, error: null };
        notifyAuthListeners();
      }
    }
  }
});

// ============================================================================
// Public Authentication Service API
// ============================================================================
export const authService = {
  subscribe(listener: Listener<AuthState>) {
    authListeners.add(listener);
    listener(currentAuthState);
    return () => authListeners.delete(listener);
  },

  getCurrentUser(): ActiveUser | null {
    return currentAuthState.user;
  },

  getAuthState(): AuthState {
    return currentAuthState;
  },

  // Google Sign-In with popup (Real Firebase Auth flow via Client SDK)
  async loginWithGoogle(): Promise<ActiveUser> {
    currentAuthState = { ...currentAuthState, loading: true, error: null };
    notifyAuthListeners();

    try {
      // 1. Instanciación correcta de GoogleAuthProvider
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });

      // 2. Ejecución con popup mediante el SDK de cliente de Firebase (firebase/auth)
      const result = await signInWithPopup(auth, provider);
      const activeUser = await syncUserWithFirestore(result.user);
      
      currentAuthState = { user: activeUser, loading: false, error: null };
      notifyAuthListeners();
      return activeUser;
    } catch (err: any) {
      const errorCode = err?.code || '';
      const errorMessage = err?.message || String(err);

      // Bloques de depuración en consola con diagnósticos específicos para facilitar la resolución
      if (errorCode === 'auth/unauthorized-domain') {
        const currentHostname = typeof window !== 'undefined' ? window.location.hostname : 'desconocido';
        console.error(
          `[FIXIT Auth Error] auth/unauthorized-domain: El dominio actual ("${currentHostname}") no está autorizado para OAuth en Firebase Authentication.\n` +
          `-> Solución: Abre Firebase Console (https://console.firebase.google.com/) > Tu Proyecto > Authentication > Settings (Configuración) > Authorized domains (Dominios autorizados) y añade "${currentHostname}".`
        );
      } else if (errorCode === 'auth/popup-blocked') {
        console.error(
          '[FIXIT Auth Error] auth/popup-blocked: La ventana emergente de Google fue bloqueada por el navegador. El usuario o navegador debe permitir ventanas emergentes para este dominio.'
        );
      } else if (errorCode === 'auth/popup-closed-by-user' || errorCode === 'auth/cancelled-popup-request') {
        console.warn(
          '[FIXIT Auth] auth/popup-closed-by-user: La ventana emergente de Google fue cerrada antes de completar la verificación.'
        );
      } else if (errorCode === 'auth/operation-not-allowed') {
        console.error(
          '[FIXIT Auth Error] auth/operation-not-allowed: El proveedor Google Sign-In no está habilitado en Firebase Console > Authentication > Sign-in method.'
        );
      } else if (errorCode === 'auth/admin-restricted-operation') {
        console.error(
          '[FIXIT Auth Error] auth/admin-restricted-operation: La operación de Google Auth está restringida por la configuración del proyecto en Firebase Console.'
        );
      } else {
        console.error('[FIXIT Auth Error] Error general en loginWithGoogle:', {
          code: errorCode,
          message: errorMessage,
          raw: err,
        });
      }

      currentAuthState = { ...currentAuthState, loading: false, error: errorMessage };
      notifyAuthListeners();
      throw err;
    }
  },

  // Anonymous Guest Sign-In (Frictionless entry)
  // Utiliza estrictamente el SDK de cliente de Firebase (firebase/auth)
  async loginAnonymously(): Promise<ActiveUser> {
    currentAuthState = { ...currentAuthState, loading: true, error: null };
    notifyAuthListeners();

    try {
      // 1. Llamada estrictamente mediante el SDK de cliente de Firebase
      const result = await signInAnonymously(auth);
      const activeUser = await syncUserWithFirestore(result.user);
      currentAuthState = { user: activeUser, loading: false, error: null };
      notifyAuthListeners();
      return activeUser;
    } catch (err: any) {
      const errorCode = err?.code || '';
      const errorMessage = err?.message || String(err);

      // Diagnóstico detallado para auth/admin-restricted-operation y auth/operation-not-allowed
      if (errorCode === 'auth/admin-restricted-operation' || errorCode === 'auth/operation-not-allowed') {
        console.warn(
          `[FIXIT Auth Warning] "${errorCode}": El método de inicio de sesión Anónimo no está habilitado en Firebase Console.\n` +
          `-> Explicación: Este error ("${errorCode}") es devuelto por el SDK de cliente de Firebase (firebase/auth) cuando el proveedor Anónimo no ha sido activado en la consola del proyecto.\n` +
          `-> No se debe a una mezcla con Firebase Admin SDK, sino a una restricción de configuración en Firebase Authentication.\n` +
          `-> Solución en Firebase Console: Ve a https://console.firebase.google.com/ > Tu Proyecto > Authentication > Sign-in method > Proveedores nativos > Anónimo (Anonymous) > Habilitar > Guardar.\n` +
          `-> Resiliencia: Se ha creado una sesión de invitado local segura para que el usuario explore la aplicación sin bloqueos.`
        );
        const fallbackGuest: ActiveUser = buildActiveUser(
          'guest-' + Date.now(),
          '',
          'Invitado FIXIT',
          'CLIENT',
          'ACTIVE',
          undefined,
          undefined,
          undefined,
          true
        );
        currentAuthState = { user: fallbackGuest, loading: false, error: null };
        notifyAuthListeners();
        return fallbackGuest;
      }

      console.error('[FIXIT Auth Error] Error en loginAnonymously:', {
        code: errorCode,
        message: errorMessage,
        raw: err,
      });

      // Para cualquier otro error inesperado, permitir fallback a invitado para máxima resiliencia
      const fallbackGuest: ActiveUser = buildActiveUser(
        'guest-' + Date.now(),
        '',
        'Invitado FIXIT',
        'CLIENT',
        'ACTIVE',
        undefined,
        undefined,
        undefined,
        true
      );
      currentAuthState = { user: fallbackGuest, loading: false, error: null };
      notifyAuthListeners();
      return fallbackGuest;
    }
  },

  // Email / Password Login
  async loginWithEmail(email: string, pass: string): Promise<ActiveUser> {
    currentAuthState = { ...currentAuthState, loading: true, error: null };
    notifyAuthListeners();

    try {
      const result = await signInWithEmailAndPassword(auth, email.trim(), pass);
      const activeUser = await syncUserWithFirestore(result.user);
      currentAuthState = { user: activeUser, loading: false, error: null };
      notifyAuthListeners();
      return activeUser;
    } catch (err: any) {
      currentAuthState = { ...currentAuthState, loading: false, error: err.message };
      notifyAuthListeners();
      throw err;
    }
  },

  // Register new client via Email & Password (creates account and stores profile in Firestore)
  async registerClient(name: string, email: string, pass: string, phone?: string): Promise<ActiveUser> {
    currentAuthState = { ...currentAuthState, loading: true, error: null };
    notifyAuthListeners();

    try {
      // 1. Invocar createUserWithEmailAndPassword y capturar user.uid
      const result = await createUserWithEmailAndPassword(auth, email.trim(), pass);
      const user = result.user;

      // 2. setDoc en la colección "users" con el UID como ID del documento
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const profileData = {
          uid: user.uid,
          email: email.toLowerCase().trim(),
          displayName: name || '',
          phone: phone || '',
          role: 'customer',
          city: 'Ciudad de Panamá',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          marketingOptIn: true,
          status: 'active'
        };

        await setDoc(userDocRef, profileData);
      } catch (firestoreError: any) {
        console.warn('[FIXIT Auth] Aviso al guardar perfil de usuario en Firestore:', firestoreError);
        handleFirestoreError(firestoreError, OperationType.WRITE, `users/${user.uid}`);
      }

      const activeUser = buildActiveUser(
        user.uid,
        email.toLowerCase().trim(),
        name || '',
        'CLIENT',
        'ACTIVE',
        phone || ''
      );

      currentAuthState = { user: activeUser, loading: false, error: null };
      notifyAuthListeners();
      return activeUser;
    } catch (err: any) {
      console.warn('[FIXIT Auth] registerClient notice:', err?.message || err);
      currentAuthState = { user: null, loading: false, error: err.message };
      notifyAuthListeners();
      throw err;
    }
  },

  // Aliases for registration flow
  async signUp(name: string, email: string, pass: string, phone?: string): Promise<ActiveUser> {
    return this.registerClient(name, email, pass, phone);
  },

  async register(name: string, email: string, pass: string, phone?: string): Promise<ActiveUser> {
    return this.registerClient(name, email, pass, phone);
  },

  // Update allowed user profile fields (displayName, phone, language, address)
  // MATHEMATICALLY IMPOSSIBLE to update role or status via this function
  async updateUserProfile(updates: {
    displayName?: string;
    phone?: string;
    languagePreference?: 'es' | 'en';
    direccion?: string;
  }): Promise<ActiveUser> {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      if (currentAuthState.user) {
        const updatedUser: ActiveUser = {
          ...currentAuthState.user,
          displayName: updates.displayName?.trim() || currentAuthState.user.displayName,
          nombre: updates.displayName?.trim() || currentAuthState.user.nombre,
          phone: updates.phone?.trim() ?? currentAuthState.user.phone,
          telefono: updates.phone?.trim() ?? currentAuthState.user.telefono,
        };
        currentAuthState = { ...currentAuthState, user: updatedUser };
        notifyAuthListeners();
        return updatedUser;
      }
      throw new Error('No hay una sesión activa para actualizar el perfil.');
    }

    const userDocRef = doc(db, 'users', currentUser.uid);
    const now = new Date().toISOString();

    // Whitelist ONLY non-privileged profile fields
    const safePayload: Record<string, any> = {
      updatedAt: now,
    };
    if (updates.displayName !== undefined) safePayload.displayName = updates.displayName.trim();
    if (updates.phone !== undefined) safePayload.phone = updates.phone.trim();
    if (updates.languagePreference !== undefined) safePayload.languagePreference = updates.languagePreference;
    if (updates.direccion !== undefined) safePayload.direccion = updates.direccion.trim();

    await updateDoc(userDocRef, safePayload);

    // Read back fresh document to ensure strict synchrony
    const snap = await getDoc(userDocRef);
    const data = snap.exists() ? snap.data() : {};
    const role = normalizeRole(data.role || currentAuthState.user?.role || 'CLIENT');
    const rawStatus = (data.status || currentAuthState.user?.status || 'ACTIVE').toUpperCase();
    const status: UserStatus = (rawStatus === 'INACTIVO' || rawStatus === 'INACTIVE') ? 'INACTIVE' : 'ACTIVE';

    const activeUser = buildActiveUser(
      currentUser.uid,
      currentUser.email || data.email || '',
      data.displayName || safePayload.displayName || currentAuthState.user?.displayName || '',
      role,
      status,
      data.phone || safePayload.phone || currentAuthState.user?.phone || undefined,
      data.technicianId,
      currentUser.photoURL || data.photoURL || undefined,
      currentUser.isAnonymous
    );

    currentAuthState = { user: activeUser, loading: false, error: null };
    notifyAuthListeners();
    return activeUser;
  },

  // Password recovery via Firebase
  async resetPassword(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (err: any) {
      console.warn('[FIXIT Auth] resetPassword notice:', err?.message || err);
      throw err;
    }
  },

  // Sign out
  async signOut(): Promise<void> {
    try {
      if (auth.currentUser) {
        await fbSignOut(auth);
      }
    } catch (err) {
      console.warn('[FIXIT Auth] Error al cerrar sesión:', err);
    }
    // Consola admin: caer siempre a logged-out y notificar, para mostrar el login
    // aunque no hubiera sesion Firebase (ej. invitado local). El null-branch del
    // listener aplica el mismo estado si fbSignOut dispara onAuthStateChanged.
    currentAuthState = { user: null, loading: false, error: null };
    notifyAuthListeners();
  },

  // Permanent Account & Data Deletion (Derechos ARCO / Privacidad)
  async deleteAccount(): Promise<void> {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('No hay una sesión activa para eliminar la cuenta.');
    }

    const uid = currentUser.uid;

    // 1. Eliminar registro del usuario en la base de datos de Firestore
    try {
      await deleteDoc(doc(db, 'users', uid));
    } catch (err) {
      console.warn('[FIXIT Auth] Aviso al eliminar documento en Firestore:', err);
    }

    // 2. Eliminar cuenta en Firebase Authentication
    try {
      await deleteUser(currentUser);
    } catch (err: any) {
      console.warn('[FIXIT Auth] Error al eliminar usuario de Firebase Auth:', err);
      if (err?.code === 'auth/requires-recent-login') {
        throw err;
      }
    }

    // 3. Cerrar sesión completamente
    await this.signOut();
  }
};

export async function registerUserWithEmailAndPassword(
  name: string,
  email: string,
  pass: string,
  phone?: string
): Promise<ActiveUser> {
  return authService.registerClient(name, email, pass, phone);
}

export async function signUpWithEmailAndPassword(
  name: string,
  email: string,
  pass: string,
  phone?: string
): Promise<ActiveUser> {
  return authService.registerClient(name, email, pass, phone);
}
