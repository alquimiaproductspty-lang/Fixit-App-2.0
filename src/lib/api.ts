import { 
  ServiceRequest, 
  Service, 
  AppRole
} from '../types';
import * as firestoreService from './firestoreService';
import { authService } from './firebase';

export interface UploadPhotosResponse {
  success: boolean;
  urls: string[];
  files?: { id: string; filename: string; url: string }[];
  count: number;
  message?: string;
}

export async function uploadPhotosToServer(photos: string[]): Promise<string[]> {
  if (!photos || photos.length === 0) return [];
  try {
    const res = await fetch('/api/upload-photos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photos }),
    });
    if (!res.ok) throw new Error(`Upload failed with status ${res.status}`);
    const data: UploadPhotosResponse = await res.json();
    return data.urls || [];
  } catch (err) {
    console.warn('[API] Error uploading photos to server, proceeding with local images:', err);
    return photos;
  }
}

// -------------------------------------------------------------
// Orders / Solicitudes (Direct Firestore Connection & Fallback)
// -------------------------------------------------------------
export async function registerOrderOnServer(payload: Partial<ServiceRequest>): Promise<ServiceRequest> {
  try {
    const currentUser = authService.getCurrentUser();
    const authorName = currentUser?.displayName || payload.cliente?.nombre || 'Cliente FIXIT';
    return await firestoreService.createOrderInFirestore(payload, authorName);
  } catch (err) {
    console.warn('[API] Firestore create order fallback:', err);
    // Server route fallback
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    return data.order;
  }
}

export async function fetchOrdersFromServer(filters?: {
  status?: string;
  category?: string;
  technicianId?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  showArchived?: boolean;
  role?: AppRole;
  userUid?: string;
}): Promise<ServiceRequest[]> {
  try {
    const currentUser = authService.getCurrentUser();
    return await firestoreService.getOrdersFromFirestore({
      ...filters,
      role: filters?.role || currentUser?.role,
      userUid: filters?.userUid || currentUser?.uid,
      technicianId: filters?.technicianId || currentUser?.technicianId,
      showArchived: filters?.showArchived,
    });
  } catch (err) {
    console.warn('[API] Firestore orders fetch error, trying backend route:', err);
    try {
      const query = new URLSearchParams();
      if (filters?.status) query.set('status', filters.status);
      if (filters?.category) query.set('category', filters.category);
      if (filters?.technicianId) query.set('technicianId', filters.technicianId);
      if (filters?.search) query.set('search', filters.search);
      const res = await fetch(`/api/orders?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        return data.orders || [];
      }
    } catch {}
    return [];
  }
}

export async function updateOrderOnServer(
  id: string, 
  updates: Partial<ServiceRequest>,
  author?: string,
  comment?: string
): Promise<ServiceRequest | null> {
  try {
    const current = authService.getCurrentUser();
    const authorName = author || current?.displayName || 'Administrador';
    return await firestoreService.updateOrderInFirestore(id, updates, authorName, comment);
  } catch (err) {
    console.warn('[API] Firestore order update fallback:', err);
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...updates, modificado_por: author }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.order;
      }
    } catch {}
    return null;
  }
}

export async function archiveOrderOnServer(
  id: string,
  author?: string,
  reason?: string
): Promise<ServiceRequest | null> {
  const current = authService.getCurrentUser();
  const authorName = author || current?.displayName || 'Administrador';
  return await firestoreService.archiveOrderInFirestore(id, authorName, reason);
}

export async function deleteOrderPermanentlyOnServer(
  id: string,
  author?: string
): Promise<{ success: boolean }> {
  const current = authService.getCurrentUser();
  const authorName = author || current?.displayName || 'Administrador';
  return await firestoreService.deleteOrderFromFirestore(id, authorName);
}

// -------------------------------------------------------------
// Services Catalog (Direct Firestore Connection)
// -------------------------------------------------------------
export async function fetchServicesFromServer(filters?: {
  category?: string;
  activeOnly?: boolean;
}): Promise<Service[]> {
  const allServices = await firestoreService.getServicesFromFirestore();
  if (!filters) return allServices;
  return allServices.filter((s) => {
    if (filters.activeOnly && s.active === false && s.activo === false) return false;
    if (filters.category && s.category?.toLowerCase() !== filters.category.toLowerCase() && s.categoria?.toLowerCase() !== filters.category.toLowerCase()) return false;
    return true;
  });
}

export async function createServiceOnServer(
  payload: Partial<Service>,
  author?: string
): Promise<Service | null> {
  const current = authService.getCurrentUser();
  const authorName = author || current?.displayName || 'Administrador';
  return await firestoreService.createServiceInFirestore(payload, authorName);
}

export async function updateServiceOnServer(
  id: string, 
  updates: Partial<Service>,
  author?: string
): Promise<Service | null> {
  const current = authService.getCurrentUser();
  const authorName = author || current?.displayName || 'Administrador';
  return await firestoreService.updateServiceInFirestore(id, updates, authorName);
}

export async function deleteServiceOnServer(
  id: string,
  author?: string
): Promise<{ success: boolean }> {
  const current = authService.getCurrentUser();
  const authorName = author || current?.displayName || 'Administrador';
  return await firestoreService.deleteServiceInFirestore(id, authorName);
}
