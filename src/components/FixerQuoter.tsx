import React, { useState, useEffect, useRef, useMemo } from 'react';
import { FixitLogo } from './FixitLogo';
import { ActiveUser, db } from '../lib/firebase';
import { createQuoteInFirestore, sanitizeForFirestore } from '../lib/firestoreService';
import { getNextMonthlyQuoteFolio } from '../lib/orderConsecutive';
import { ManagedQuote, QuoteItem } from '../types';
import { doc, updateDoc } from 'firebase/firestore';

export const QUOTER_CONFIG = {
  COMPANY_NAME: 'FIXIT PANAMÁ',
  PREFIX: 'FIXIT',
  START_CONSECUTIVE: 100, // Cada mes inicia en 100 (ej: FIXIT-2026-11-100)
  RUC: '155743410-2-2023',
  WHATSAPP_SUPPORT: '+507 6535-6072',
  ITBMS_RATE: 0.07,
  DEPOSIT_RATE: 0.50,
  GUARANTEE_DAYS: 30,
  VALIDITY_DAYS: 15,
  DELIVERY_TIME: '24 a 48 hrs tras confirmación de anticipo',
  BANK_NAME: 'Banco General',
  ACCOUNT_HOLDER: 'Virginia Palomino Hoyte',
  ACCOUNT_NUMBER: '04-72-98-545854-3',
  YAPPY_PHONE: '6137-2394',
  STORAGE_KEY: 'fixit_quote_draft_v1',
  SEQUENCE_KEY: 'fixit_monthly_sequence_v1',
} as const;

export interface QuoterLineItem {
  id: number | string;
  description: string;
  qty: number;
  price: number;
}

export interface LinkedOrderContext {
  id: string;
  numero_pedido: string;
  cliente_nombre: string;
  cliente_telefono: string;
  direccion: string;
  servicio_nombre?: string;
  precio_sugerido?: number;
}

interface SequenceData {
  period: string;
  lastNumber: number;
  deliveredFolios: string[];
  lastDeliveredFolio: string | null;
  isCurrentDelivered: boolean;
}

function getPeriodInfo() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return { year, month, period: `${year}-${month}` };
}

function loadSequenceData(): SequenceData {
  const { period } = getPeriodInfo();
  try {
    const raw = localStorage.getItem(QUOTER_CONFIG.SEQUENCE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.lastNumber === 'number' && parsed.period === period) {
        return {
          period,
          lastNumber: parsed.lastNumber,
          deliveredFolios: Array.isArray(parsed.deliveredFolios) ? parsed.deliveredFolios : [],
          lastDeliveredFolio: parsed.lastDeliveredFolio || null,
          isCurrentDelivered: Boolean(parsed.isCurrentDelivered),
        };
      }
    }
  } catch (e) {
    console.warn('Error leyendo secuencia de cotizaciones:', e);
  }

  const initial: SequenceData = {
    period,
    lastNumber: QUOTER_CONFIG.START_CONSECUTIVE,
    deliveredFolios: [],
    lastDeliveredFolio: null,
    isCurrentDelivered: false,
  };
  saveSequenceData(initial);
  return initial;
}

function saveSequenceData(data: SequenceData) {
  try {
    localStorage.setItem(QUOTER_CONFIG.SEQUENCE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Error guardando secuencia de cotizaciones:', e);
  }
}

function formatFolio(num: number): string {
  const { year, month } = getPeriodInfo();
  const formattedNum = String(num).padStart(3, '0');
  return `${QUOTER_CONFIG.PREFIX}-${year}-${month}-${formattedNum}`;
}

function getActiveFolio(): string {
  const seq = loadSequenceData();
  return formatFolio(seq.lastNumber);
}

function advanceLocalConsecutive(): string {
  const seq = loadSequenceData();
  seq.lastNumber += 1;
  seq.isCurrentDelivered = false;
  saveSequenceData(seq);
  return formatFolio(seq.lastNumber);
}

interface FixerQuoterProps {
  currentUser: ActiveUser;
  linkedOrder?: LinkedOrderContext | null;
  onClearLinkedOrder?: () => void;
  pendingItemsToAdd?: QuoterLineItem[];
  onConsumePendingItems?: () => void;
  onQuoteSaved?: (quote: ManagedQuote) => void;
  onOpenCalculator?: () => void;
  onOpenCatalog?: () => void;
}

export const FixerQuoter: React.FC<FixerQuoterProps> = ({
  currentUser,
  linkedOrder,
  onClearLinkedOrder,
  pendingItemsToAdd,
  onConsumePendingItems,
  onQuoteSaved,
  onOpenCalculator,
  onOpenCatalog,
}) => {
  const sheetRef = useRef<HTMLDivElement>(null);

  const dateStr = useMemo(() => {
    return new Date().toLocaleDateString('es-PA', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }, []);

  // Load initial draft from LocalStorage
  const initialDraft = useMemo(() => {
    const { period } = getPeriodInfo();
    try {
      const saved = localStorage.getItem(QUOTER_CONFIG.STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.items) && parsed.items.length > 0) {
          const validFolio =
            parsed.quoteNumber && String(parsed.quoteNumber).startsWith(`${QUOTER_CONFIG.PREFIX}-${period}`)
              ? String(parsed.quoteNumber)
              : getActiveFolio();
          return {
            quoteNumber: validFolio,
            clientName: parsed.client?.name || '',
            clientPhone: parsed.client?.phone || '',
            clientLocation: parsed.client?.location || '',
            items: parsed.items as QuoterLineItem[],
            discountValue: typeof parsed.discount?.value === 'number' ? parsed.discount.value : 0,
            discountType: (parsed.discount?.type === 'fixed' ? 'fixed' : 'percent') as 'percent' | 'fixed',
            applyItbms: Boolean(parsed.applyItbms),
          };
        }
      }
    } catch (e) {
      console.warn('No se pudo cargar borrador de cotización:', e);
    }
    return {
      quoteNumber: getActiveFolio(),
      clientName: '',
      clientPhone: '',
      clientLocation: '',
      items: [{ id: 1, description: 'Mano de obra técnica especializada', qty: 1, price: 0 }] as QuoterLineItem[],
      discountValue: 0,
      discountType: 'percent' as 'percent' | 'fixed',
      applyItbms: false,
    };
  }, []);

  const [quoteNumber, setQuoteNumber] = useState<string>(initialDraft.quoteNumber);
  const [clientName, setClientName] = useState<string>(initialDraft.clientName);
  const [clientPhone, setClientPhone] = useState<string>(initialDraft.clientPhone);
  const [clientLocation, setClientLocation] = useState<string>(initialDraft.clientLocation);
  const [items, setItems] = useState<QuoterLineItem[]>(initialDraft.items);
  const [discountValue, setDiscountValue] = useState<number>(initialDraft.discountValue);
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>(initialDraft.discountType);
  const [applyItbms, setApplyItbms] = useState<boolean>(initialDraft.applyItbms);

  const [canSharePdf, setCanSharePdf] = useState<boolean>(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [isSavingQuote, setIsSavingQuote] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'warn' | 'info' } | null>(null);
  const [fallbackModalText, setFallbackModalText] = useState<string | null>(null);

  const showToast = (message: string, type: 'success' | 'warn' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 3500);
  };

  // Check Web Share API file support on mount
  useEffect(() => {
    try {
      if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
        const testFile = new File([''], 'test.pdf', { type: 'application/pdf' });
        if (navigator.canShare({ files: [testFile] })) {
          setCanSharePdf(true);
        }
      }
    } catch {
      // Silently ignore if unsupported
    }
  }, []);

  // Persist draft on changes
  useEffect(() => {
    try {
      localStorage.setItem(
        QUOTER_CONFIG.STORAGE_KEY,
        JSON.stringify({
          quoteNumber,
          client: {
            name: clientName,
            phone: clientPhone,
            location: clientLocation,
          },
          items,
          discount: {
            value: discountValue,
            type: discountType,
          },
          applyItbms,
        })
      );
    } catch {
      // Ignore storage quota errors
    }
  }, [quoteNumber, clientName, clientPhone, clientLocation, items, discountValue, discountType, applyItbms]);

  // Apply linked order context when selected from Fixer Dashboard
  useEffect(() => {
    if (!linkedOrder) return;
    setClientName(linkedOrder.cliente_nombre || '');
    setClientPhone(linkedOrder.cliente_telefono || '');
    setClientLocation(linkedOrder.direccion || 'Ciudad de Panamá');
    if (linkedOrder.servicio_nombre) {
      setItems((prev) => {
        const isDefaultEmpty =
          prev.length === 1 &&
          (prev[0].description === 'Mano de obra técnica especializada' || !prev[0].description.trim()) &&
          prev[0].price === 0;
        if (isDefaultEmpty) {
          return [
            {
              id: Date.now(),
              description: linkedOrder.servicio_nombre!,
              qty: 1,
              price: linkedOrder.precio_sugerido ?? 0,
            },
          ];
        }
        return prev;
      });
    }
    showToast(`📋 Datos cargados del pedido ${linkedOrder.numero_pedido}`, 'info');
  }, [linkedOrder?.id]);

  // Consume external items added from Catalog or Painting Calculator
  useEffect(() => {
    if (pendingItemsToAdd && pendingItemsToAdd.length > 0) {
      setItems((prev) => {
        const isDefaultEmpty =
          prev.length === 1 &&
          (prev[0].description === 'Mano de obra técnica especializada' || !prev[0].description.trim()) &&
          prev[0].price === 0;
        if (isDefaultEmpty) {
          return [...pendingItemsToAdd];
        }
        return [...prev, ...pendingItemsToAdd];
      });
      onConsumePendingItems?.();
      showToast(`✅ ${pendingItemsToAdd.length} ítem(s) agregado(s) al cotizador`, 'success');
    }
  }, [pendingItemsToAdd, onConsumePendingItems]);

  // Totals calculation engine (exact match to cotizador-fixit)
  const totals = useMemo(() => {
    const grossSubtotal = items.reduce((acc, cur) => {
      const q = isNaN(cur.qty) ? 0 : cur.qty;
      const p = isNaN(cur.price) ? 0 : cur.price;
      return acc + Math.max(0, q * p);
    }, 0);

    let discountAmount = 0;
    if (discountValue > 0) {
      if (discountType === 'percent') {
        const clampedPct = Math.min(100, Math.max(0, discountValue));
        discountAmount = grossSubtotal * (clampedPct / 100);
      } else {
        discountAmount = Math.min(discountValue, grossSubtotal);
      }
    }

    const netSubtotal = Math.max(0, grossSubtotal - discountAmount);
    const itbms = applyItbms ? netSubtotal * QUOTER_CONFIG.ITBMS_RATE : 0;
    const total = netSubtotal + itbms;
    const anticipo = total * QUOTER_CONFIG.DEPOSIT_RATE;

    return {
      grossSubtotal,
      discountAmount,
      netSubtotal,
      itbms,
      total,
      anticipo,
    };
  }, [items, discountValue, discountType, applyItbms]);

  // Advance consecutive folio (tries Firestore atomic counter, syncs local storage)
  const handleAdvanceFolio = async () => {
    const nextLocal = advanceLocalConsecutive();
    setQuoteNumber(nextLocal);
    showToast(`🔄 Consecutivo avanzado a: ${nextLocal}`, 'info');
    try {
      const remoteFolio = await getNextMonthlyQuoteFolio();
      const regex = /^FIXIT-\d{4}-\d{2}-(\d+)$/i;
      const matchLocal = nextLocal.match(regex);
      const matchRemote = remoteFolio.match(regex);
      if (matchLocal && matchRemote) {
        const localNum = parseInt(matchLocal[1], 10);
        const remoteNum = parseInt(matchRemote[1], 10);
        if (remoteNum > localNum) {
          const seq = loadSequenceData();
          seq.lastNumber = remoteNum;
          saveSequenceData(seq);
          setQuoteNumber(remoteFolio);
        }
      }
    } catch {
      // Keep local folio if offline
    }
  };

  // Record quote delivery locally AND persist in Firestore `quotes` collection
  const recordAndPersistQuote = async (medioEntrega: 'whatsapp' | 'pdf' | 'print' | 'manual'): Promise<ManagedQuote | null> => {
    const currentFolio = quoteNumber.trim() || getActiveFolio();
    const seq = loadSequenceData();

    const regex = new RegExp(`^${QUOTER_CONFIG.PREFIX}-\\d{4}-\\d{2}-(\\d+)$`, 'i');
    const match = currentFolio.match(regex);
    if (match) {
      const parsed = parseInt(match[1], 10);
      if (!isNaN(parsed) && parsed >= seq.lastNumber) {
        seq.lastNumber = parsed;
      }
    }
    if (!seq.deliveredFolios.includes(currentFolio)) {
      seq.deliveredFolios.push(currentFolio);
    }
    seq.lastDeliveredFolio = currentFolio;
    seq.isCurrentDelivered = true;
    saveSequenceData(seq);

    // Save to Firestore `quotes` collection for Admin revenue & quotes dashboard
    setIsSavingQuote(true);
    try {
      const nowIso = new Date().toISOString();
      const validUntilDate = new Date(Date.now() + QUOTER_CONFIG.VALIDITY_DAYS * 86400000).toISOString();
      const validItems = items.filter((i) => i.description.trim() !== '' || i.price > 0);

      const quoteItems: QuoteItem[] = (validItems.length > 0 ? validItems : items).map((it, idx) => ({
        id: String(it.id || idx + 1),
        descripcion: it.description.trim() || 'Mano de obra técnica especializada',
        cantidad: Math.max(1, Number(it.qty) || 1),
        precio_unitario: Math.max(0, Number(it.price) || 0),
        total: Math.round(Math.max(1, Number(it.qty) || 1) * Math.max(0, Number(it.price) || 0) * 100) / 100,
      }));

      const quoteDocId = currentFolio.replace(/[^a-zA-Z0-9_-]/g, '_');
      const fixerName = currentUser.displayName || currentUser.nombre || currentUser.email || 'Fixer FIXIT';
      const techId = currentUser.technicianId || currentUser.uid;

      const payload: Omit<ManagedQuote, 'id'> & { id?: string } = sanitizeForFirestore({
        id: quoteDocId,
        numero_cotizacion: currentFolio,
        codigo_cotizacion: currentFolio,
        solicitud_id: linkedOrder?.id || 'COTIZACION_DIRECTA',
        solicitud_codigo: linkedOrder?.numero_pedido || currentFolio,
        cliente_nombre: clientName.trim() || 'Consumidor Final',
        cliente_telefono: clientPhone.trim() || '—',
        cliente_ubicacion: clientLocation.trim() || 'Ciudad de Panamá',
        servicio_nombre: quoteItems.map((i) => i.descripcion).join(' + ').slice(0, 180) || 'Servicio Técnico FIXIT',
        mano_de_obra: Math.round(totals.grossSubtotal * 100) / 100,
        materiales: 0,
        cargos_adicionales: 0,
        subtotal: Math.round(totals.netSubtotal * 100) / 100,
        subtotal_bruto: Math.round(totals.grossSubtotal * 100) / 100,
        subtotal_neto: Math.round(totals.netSubtotal * 100) / 100,
        itbms: Math.round(totals.itbms * 100) / 100,
        apply_itbms: applyItbms,
        descuento: Math.round(totals.discountAmount * 100) / 100,
        descuento_tipo: discountType,
        descuento_valor: discountValue,
        total: Math.round(totals.total * 100) / 100,
        precio: Math.round(totals.total * 100) / 100,
        anticipo: Math.round(totals.anticipo * 100) / 100,
        items: quoteItems,
        tecnico_id: techId,
        tecnico_nombre: fixerName,
        creado_por: fixerName,
        creado_por_uid: currentUser.uid,
        fecha_creacion: nowIso,
        fecha_emision: dateStr,
        fecha_vencimiento: validUntilDate,
        valido_hasta: validUntilDate,
        estado: 'Enviada',
        aprobacion: {
          estado: 'pendiente',
          medio: medioEntrega,
        },
        terminos: `Garantía ${QUOTER_CONFIG.GUARANTEE_DAYS} días en mano de obra. Validez ${QUOTER_CONFIG.VALIDITY_DAYS} días. Anticipo 50% requerido.`,
      });

      const savedQuote = await createQuoteInFirestore(payload, fixerName);

      // If linked to an order, also sync the quoted amount onto the order if allowed
      if (linkedOrder?.id) {
        const roundedTotal = Math.round(totals.total * 100) / 100;
        try {
          await updateDoc(doc(db, 'requests', linkedOrder.id), {
            cotizacion: roundedTotal,
            total_facturado: roundedTotal,
            updatedAt: nowIso,
          });
        } catch {
          // Non-blocking if rules restrict direct order price update for unassigned order
        }
        try {
          await updateDoc(doc(db, 'orders', linkedOrder.id), {
            cotizacion: roundedTotal,
            total_facturado: roundedTotal,
            updatedAt: nowIso,
          });
        } catch {}
      }

      onQuoteSaved?.(savedQuote);
      return savedQuote;
    } catch (err) {
      console.warn('[Quoter] Error guardando cotización en Firestore:', err);
      return null;
    } finally {
      setIsSavingQuote(false);
    }
  };

  // Row operations
  const handleAddRow = () => {
    setItems((prev) => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        description: '',
        qty: 1,
        price: 0,
      },
    ]);
  };

  const handleRemoveRow = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: 'description' | 'qty' | 'price', rawVal: string) => {
    setItems((prev) =>
      prev.map((it, idx) => {
        if (idx !== index) return it;
        if (field === 'qty') {
          const parsed = parseInt(rawVal, 10);
          return { ...it, qty: isNaN(parsed) || parsed < 1 ? 1 : parsed };
        }
        if (field === 'price') {
          const parsed = parseFloat(rawVal);
          return { ...it, price: isNaN(parsed) || parsed < 0 ? 0 : parsed };
        }
        return { ...it, description: rawVal };
      })
    );
  };

  const handleSetPresetDiscount = (pct: number) => {
    setDiscountValue(pct);
    setDiscountType('percent');
  };

  // Build WhatsApp message (1:1 format from cotizador-fixit)
  const buildWhatsAppMessage = () => {
    const validItems = items.filter((i) => i.description && i.description.trim() !== '');
    const cName = clientName.trim() || 'Estimado/a Cliente';
    const loc = clientLocation.trim() || 'Ciudad de Panamá';
    const qNum = quoteNumber.trim() || getActiveFolio();

    const itemsText = validItems
      .map((i) => `• ${i.description.trim()} (x${i.qty}): $${(i.qty * i.price).toFixed(2)}`)
      .join('\n');

    let discountBlock = '';
    if (totals.discountAmount > 0) {
      discountBlock = `*Descuento aplicado:* -$${totals.discountAmount.toFixed(2)}\n*Subtotal con desc.:* $${totals.netSubtotal.toFixed(2)}\n`;
    }

    const itbmsBlock = applyItbms ? `*ITBMS (7%):* $${totals.itbms.toFixed(2)}\n` : '';

    return `🛠️ *COTIZACIÓN DE SERVICIOS — ${QUOTER_CONFIG.COMPANY_NAME}*
*N° de Cotización:* ${qNum}
*Fecha:* ${dateStr}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
*Cliente:* ${cName}
*Ubicación:* ${loc}

📋 *ALCANCE DE LOS TRABAJOS:*
${itemsText || '• Servicio técnico a convenir'}

💰 *RESUMEN DE PAGO:*
*Subtotal:* $${totals.grossSubtotal.toFixed(2)}
${discountBlock}${itbmsBlock}*TOTAL A PAGAR:* $${totals.total.toFixed(2)} USD
*Anticipo requerido (50%):* $${totals.anticipo.toFixed(2)} USD

⏱️ *TIEMPO DE ENTREGA / EJECUCIÓN:*
${QUOTER_CONFIG.DELIVERY_TIME}.

🗓️ *IMPORTANTE PARA AGENDAR:*
Para separar y asegurar su cita es indispensable el pago del anticipo de $${totals.anticipo.toFixed(2)}. Los cupos en agenda no se reservan sin confirmación de pago.

🛡️ *GARANTÍA Y VALIDEZ FIXIT:*
✅ ${QUOTER_CONFIG.GUARANTEE_DAYS} días de respaldo en mano de obra.
✅ Validez de la oferta: ${QUOTER_CONFIG.VALIDITY_DAYS} días continuos.
✅ Personal técnico verificado.

💳 *CANALES OFICIALES DE PAGO:*
• *Banco:* ${QUOTER_CONFIG.BANK_NAME}
• *Titular:* ${QUOTER_CONFIG.ACCOUNT_HOLDER}
• *N° Cuenta:* ${QUOTER_CONFIG.ACCOUNT_NUMBER}
• *Yappy:* ${QUOTER_CONFIG.YAPPY_PHONE}

⚠️ *Nota de seguridad:* Para validar su garantía, todos los pagos se realizan a estas cuentas oficiales. Acuerdos directos anulan la garantía.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
¿Desea separar su cita para confirmar el horario disponible?`;
  };

  const writeToClipboardWithFallback = async (text: string): Promise<boolean> => {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {
        // Fallback below
      }
    }
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.top = '-9999px';
      textArea.style.left = '-9999px';
      textArea.setAttribute('readonly', '');
      document.body.appendChild(textArea);
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    } catch {
      return false;
    }
  };

  const handleCopyToWhatsApp = async () => {
    const validItems = items.filter((i) => i.description && i.description.trim() !== '');
    if (validItems.length === 0 && totals.grossSubtotal === 0) {
      showToast('⚠️ Por favor ingresa al menos un servicio con su precio', 'warn');
      return;
    }

    const msg = buildWhatsAppMessage();
    const qNum = quoteNumber.trim() || getActiveFolio();
    const copied = await writeToClipboardWithFallback(msg);
    await recordAndPersistQuote('whatsapp');

    if (copied) {
      showToast(`✅ Cotización ${qNum} copiada y registrada en el CRM`, 'success');
    } else {
      setFallbackModalText(msg);
    }
  };

  // Direct WhatsApp send if client phone is available
  const handleSendDirectWhatsApp = async () => {
    const validItems = items.filter((i) => i.description && i.description.trim() !== '');
    if (validItems.length === 0 && totals.grossSubtotal === 0) {
      showToast('⚠️ Por favor ingresa al menos un servicio con su precio', 'warn');
      return;
    }
    const msg = buildWhatsAppMessage();
    await recordAndPersistQuote('whatsapp');

    let cleanPhone = clientPhone.replace(/\D/g, '');
    if (cleanPhone.length === 8 && !cleanPhone.startsWith('507')) {
      cleanPhone = `507${cleanPhone}`;
    }
    const waUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  // Download 1-page PDF using html2pdf.js@0.14
  const handleDownloadPDF = async () => {
    const validItems = items.filter((i) => i.description && i.description.trim() !== '');
    if (validItems.length === 0 && totals.grossSubtotal === 0) {
      showToast('⚠️ Agrega al menos un servicio antes de generar el PDF', 'warn');
      return;
    }

    const qNum = quoteNumber.trim() || getActiveFolio();
    const rawClient = clientName.trim() || 'Cliente';
    const cleanClient = rawClient.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_-]/g, '_');
    const filename = `Cotizacion_${qNum}_${cleanClient}.pdf`;

    showToast('⏳ Generando PDF oficial de 1 página...', 'info');
    setIsGeneratingPdf(true);

    try {
      const html2pdfModule = await import('html2pdf.js');
      const html2pdf = html2pdfModule.default || (html2pdfModule as any);

      const element = sheetRef.current;
      if (!element) throw new Error('Contenedor de cotización no encontrado');

      document.body.classList.add('generating-pdf');
      element.classList.add('generating-pdf');

      const opt = {
        margin: [5, 6, 5, 6] as [number, number, number, number],
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          scrollY: 0,
        },
        jsPDF: {
          unit: 'mm',
          format: 'letter',
          orientation: 'portrait' as const,
        },
      };

      await html2pdf().set(opt).from(element).save();
      await recordAndPersistQuote('pdf');
      showToast(`✅ PDF ${filename} descargado y registrado en el CRM`, 'success');
    } catch (err) {
      console.error('Error generando PDF con html2pdf, abriendo diálogo nativo:', err);
      await recordAndPersistQuote('pdf');
      showToast('⚠️ Generando mediante diálogo del sistema...', 'warn');
      window.print();
    } finally {
      document.body.classList.remove('generating-pdf');
      sheetRef.current?.classList.remove('generating-pdf');
      setIsGeneratingPdf(false);
    }
  };

  // Share PDF on mobile via Web Share API
  const handleSharePDF = async () => {
    const validItems = items.filter((i) => i.description && i.description.trim() !== '');
    if (validItems.length === 0 && totals.grossSubtotal === 0) {
      showToast('⚠️ Agrega al menos un servicio antes de compartir el PDF', 'warn');
      return;
    }

    const qNum = quoteNumber.trim() || getActiveFolio();
    const rawClient = clientName.trim() || 'Cliente';
    const cleanClient = rawClient.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_-]/g, '_');
    const filename = `Cotizacion_${qNum}_${cleanClient}.pdf`;

    showToast('⏳ Preparando PDF para compartir...', 'info');
    setIsGeneratingPdf(true);

    try {
      const html2pdfModule = await import('html2pdf.js');
      const html2pdf = html2pdfModule.default || (html2pdfModule as any);

      const element = sheetRef.current;
      if (!element) throw new Error('Contenedor no encontrado');

      document.body.classList.add('generating-pdf');
      element.classList.add('generating-pdf');

      const opt = {
        margin: [5, 6, 5, 6] as [number, number, number, number],
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
        jsPDF: { unit: 'mm', format: 'letter', orientation: 'portrait' as const },
      };

      const pdfBlob = await html2pdf().set(opt).from(element).output('blob');
      const pdfFile = new File([pdfBlob], filename, { type: 'application/pdf' });

      if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        await navigator.share({
          title: `Cotización ${qNum} - ${QUOTER_CONFIG.COMPANY_NAME}`,
          text: `Adjunto cotización formal de FIXIT Panamá para ${rawClient}.`,
          files: [pdfFile],
        });
        await recordAndPersistQuote('pdf');
        showToast('✅ ¡PDF compartido y registrado con éxito!', 'success');
      } else {
        await handleDownloadPDF();
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.error('Error al compartir PDF:', err);
        await handleDownloadPDF();
      }
    } finally {
      document.body.classList.remove('generating-pdf');
      sheetRef.current?.classList.remove('generating-pdf');
      setIsGeneratingPdf(false);
    }
  };

  const handlePrint = async () => {
    await recordAndPersistQuote('print');
    window.print();
  };

  const handleResetForm = async () => {
    const seq = loadSequenceData();
    const currentTrimmed = quoteNumber.trim();
    const isDelivered = seq.isCurrentDelivered || seq.deliveredFolios.includes(currentTrimmed);

    const confirmMsg = isDelivered
      ? '¿Deseas iniciar una nueva cotización con el siguiente número consecutivo?'
      : 'La cotización actual aún no ha sido entregada. ¿Deseas iniciar una nueva cotización avanzando el número consecutivo?';

    const confirmed = typeof window !== 'undefined' && typeof window.confirm === 'function'
      ? window.confirm(confirmMsg)
      : true;

    if (confirmed) {
      const nextFolio = advanceLocalConsecutive();
      setQuoteNumber(nextFolio);
      setClientName('');
      setClientPhone('');
      setClientLocation('');
      setItems([{ id: Date.now(), description: 'Mano de obra técnica especializada', qty: 1, price: 0 }]);
      setDiscountValue(0);
      setDiscountType('percent');
      setApplyItbms(false);
      onClearLinkedOrder?.();
      showToast(`✨ Nueva cotización ${nextFolio} iniciada`, 'success');
    }
  };

  return (
    <div className="space-y-4">
      {/* Banner de Pedido Vinculado o Accesos Rápidos de Apoyo (Oculto en PDF/Print) */}
      <div className="max-w-[820px] mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 bg-[#FFFEFA] border border-[#DED4C5] rounded-2xl p-3.5 shadow-2xs q-no-print fixer-nav-chrome">
        <div className="flex items-center gap-2.5 flex-wrap">
          {linkedOrder ? (
            <div className="inline-flex items-center gap-2 bg-[#082D60]/10 border border-[#082D60]/20 text-[#082D60] px-3 py-1 rounded-xl text-xs font-bold">
              <span>🔗 Pedido vinculado: {linkedOrder.numero_pedido}</span>
              {onClearLinkedOrder && (
                <button
                  type="button"
                  onClick={onClearLinkedOrder}
                  className="text-rose-600 hover:text-rose-800 font-extrabold ml-1 cursor-pointer"
                  title="Desvincular pedido"
                >
                  ×
                </button>
              )}
            </div>
          ) : (
            <span className="text-xs font-semibold text-[#756A5D]">
              💡 Cotización libre o vinculada a pedido asignado. Cada emisión se guarda en el CRM.
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onOpenCatalog && (
            <button
              type="button"
              onClick={onOpenCatalog}
              className="py-1.5 px-3 rounded-xl bg-[#082D60]/10 hover:bg-[#082D60]/15 text-[#082D60] font-bold text-xs cursor-pointer transition-colors"
            >
              📋 + Tarifario Oficial
            </button>
          )}
          {onOpenCalculator && (
            <button
              type="button"
              onClick={onOpenCalculator}
              className="py-1.5 px-3 rounded-xl bg-[#0B72D9]/10 hover:bg-[#0B72D9]/20 text-[#0B72D9] font-bold text-xs cursor-pointer transition-colors"
            >
              🎨 + Calculadora Pintura m²
            </button>
          )}
        </div>
      </div>

      {/* HOJA OFICIAL DEL COTIZADOR 1:1 (Se exporta a PDF en 1 página carta) */}
      <div ref={sheetRef} className="fixit-quoter-sheet" id="fixit-quoter-container">
        {/* Encabezado Corporativo Oficial */}
        <header className="q-header-wrapper">
          <div className="q-brand-section">
            <div className="q-brand-title-row">
              <FixitLogo variant="isotipo" size={32} />
              <FixitLogo variant="compact" size={26} />
              <h1 className="q-brand-name">PANAMÁ</h1>
            </div>
            <p className="q-brand-subtitle">Mantenimiento y Reparaciones Residenciales</p>
            <p className="q-brand-legal">
              <strong>R.U.C.:</strong> {QUOTER_CONFIG.RUC} | <strong>WhatsApp Oficial:</strong> {QUOTER_CONFIG.WHATSAPP_SUPPORT}
            </p>
          </div>

          {/* Metadatos de la Cotización */}
          <div className="q-meta-box">
            <div className="q-meta-header q-no-print">
              <label htmlFor="quote-number" className="q-meta-label">
                Cotización N°
              </label>
              <button
                type="button"
                id="btn-advance-folio"
                onClick={handleAdvanceFolio}
                className="q-btn-folio-step"
                title="Avanzar manualmente al siguiente número consecutivo"
              >
                + Folio
              </button>
            </div>
            <input
              type="text"
              id="quote-number"
              value={quoteNumber}
              onChange={(e) => setQuoteNumber(e.target.value)}
              title="Haz clic para modificar el número de folio si es necesario"
              className="q-number-input q-no-print"
            />
            <div id="print-quote-number" className="q-print-only q-quote-number-print">
              {quoteNumber.trim() || getActiveFolio()}
            </div>
            <p className="q-date" id="current-date">
              {dateStr}
            </p>
            <div className="q-meta-badges">
              <span className="q-badge-guarantee">Garantía: 30 Días</span>
              <span className="q-badge-validity">Validez: 15 Días</span>
            </div>
          </div>
        </header>

        {/* Datos del Cliente */}
        <section className="q-client-grid" aria-label="Información del Cliente">
          <div>
            <label htmlFor="client-name" className="q-field-label">
              Cliente
            </label>
            <input
              type="text"
              id="client-name"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Nombre y Apellido"
              className="q-field-input q-no-print"
              autoComplete="name"
            />
            <div id="print-client-name" className="q-print-only q-print-field-val">
              {clientName.trim() || 'Consumidor Final'}
            </div>
          </div>
          <div>
            <label htmlFor="client-phone" className="q-field-label">
              Teléfono / WhatsApp
            </label>
            <input
              type="tel"
              id="client-phone"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              placeholder="+507 6000-0000"
              className="q-field-input q-no-print"
              autoComplete="tel"
            />
            <div id="print-client-phone" className="q-print-only q-print-field-val">
              {clientPhone.trim() || '—'}
            </div>
          </div>
          <div>
            <label htmlFor="client-location" className="q-field-label">
              Ubicación / PH
            </label>
            <input
              type="text"
              id="client-location"
              value={clientLocation}
              onChange={(e) => setClientLocation(e.target.value)}
              placeholder="Ej: San Francisco, Calle 74"
              className="q-field-input q-no-print"
            />
            <div id="print-client-location" className="q-print-only q-print-field-val">
              {clientLocation.trim() || 'Ciudad de Panamá'}
            </div>
          </div>
        </section>

        {/* Tabla Detallada de Trabajos */}
        <section className="q-table-section" aria-label="Desglose de Servicios">
          <div className="q-table-header-bar">
            <h2 className="q-section-title">Alcance del Trabajo</h2>
            <button
              type="button"
              id="btn-add-row"
              onClick={handleAddRow}
              className="q-btn-add-row q-no-print"
            >
              + Agregar Fila
            </button>
          </div>

          <div className="overflow-x-auto rounded-md">
            <table className="q-services-table">
              <thead>
                <tr>
                  <th style={{ width: '50%' }}>Descripción del Servicio</th>
                  <th style={{ width: '12%', textAlign: 'center' }}>Cant.</th>
                  <th style={{ width: '18%', textAlign: 'right' }}>Precio ($)</th>
                  <th style={{ width: '15%', textAlign: 'right' }}>Total</th>
                  <th style={{ width: '5%' }} className="q-no-print"></th>
                </tr>
              </thead>
              <tbody id="items-table">
                {items.map((item, index) => {
                  const rowSubtotal = Math.max(0, (item.qty || 0) * (item.price || 0));
                  return (
                    <tr key={item.id}>
                      <td style={{ width: '50%' }}>
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                          placeholder="Descripción del servicio técnico..."
                          className="q-no-print"
                          style={{ width: '100%' }}
                        />
                        <div className="q-print-only q-text-desc-print">
                          {item.description.trim() || 'Mano de obra técnica especializada'}
                        </div>
                      </td>
                      <td style={{ width: '12%', textAlign: 'center' }}>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={item.qty}
                          onChange={(e) => handleItemChange(index, 'qty', e.target.value)}
                          className="q-no-print"
                          style={{ width: '100%', textAlign: 'center' }}
                        />
                        <span className="q-print-only">{item.qty}</span>
                      </td>
                      <td style={{ width: '18%', textAlign: 'right' }}>
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          value={item.price === 0 && item.description === '' ? '' : item.price}
                          onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                          placeholder="0.00"
                          className="q-no-print"
                          style={{ width: '100%', textAlign: 'right' }}
                        />
                        <span className="q-print-only">${Number(item.price || 0).toFixed(2)}</span>
                      </td>
                      <td
                        style={{
                          width: '15%',
                          textAlign: 'right',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          color: '#334155',
                        }}
                      >
                        ${rowSubtotal.toFixed(2)}
                      </td>
                      <td style={{ width: '5%', textAlign: 'center' }} className="q-no-print">
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(index)}
                            className="q-row-delete-btn"
                            title="Eliminar fila"
                          >
                            &times;
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Panel de Descuentos & ITBMS */}
        <section className="q-controls-panel q-no-print" aria-label="Ajustes de Precios e Impuestos">
          <div className="q-discount-group">
            <span className="q-section-title">Descuento demanda:</span>
            <div className="q-discount-btn-group" role="group" aria-label="Presets de descuento">
              {[0, 5, 10, 15].map((pct) => {
                const isActive = discountType === 'percent' && discountValue === pct;
                return (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => handleSetPresetDiscount(pct)}
                    className={`q-discount-preset-btn ${isActive ? 'active' : ''}`}
                  >
                    {pct}%
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-1 ml-1">
              <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Manual:</span>
              <input
                type="number"
                id="discount-val"
                min="0"
                step="1"
                value={discountValue}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setDiscountValue(isNaN(val) ? 0 : Math.max(0, val));
                }}
                className="q-discount-manual-input"
                aria-label="Valor de descuento manual"
              />
              <select
                id="discount-type"
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as 'percent' | 'fixed')}
                className="q-discount-type-select"
                aria-label="Tipo de descuento"
              >
                <option value="percent">%</option>
                <option value="fixed">$</option>
              </select>
            </div>
          </div>

          <label className="q-itbms-checkbox-label">
            <input
              type="checkbox"
              id="apply-itbms"
              checked={applyItbms}
              onChange={(e) => setApplyItbms(e.target.checked)}
            />
            <span>Aplicar ITBMS (7%)</span>
          </label>
        </section>

        {/* Términos, Métodos de Pago y Totales */}
        <div className="q-bottom-grid">
          {/* Términos y Pagos Oficiales */}
          <div className="q-terms-container">
            <p className="q-terms-title">Términos y Respaldo Oficial:</p>
            <p>
              • <strong>Garantía FIXIT:</strong> 30 días de respaldo formal en mano de obra.
            </p>
            <p>
              • <strong>Tiempo de Entrega / Ejecución:</strong> A coordinar con el cliente (disponibilidad 24 a 48 hrs tras confirmar anticipo).
            </p>
            <p>
              • <strong>Validez de la Oferta:</strong> 15 días continuos a partir de la fecha de emisión.
            </p>

            <div className="q-alert-condition">
              <p style={{ fontWeight: 800, fontSize: '0.65rem' }}>⚠️ CONDICIÓN PARA SEPARAR CITA:</p>
              <p style={{ marginTop: '0.15rem' }}>
                Para agendar y separar su cita es indispensable realizar el pago del anticipo (50%). Los cupos en agenda no se reservan sin comprobante de pago.
              </p>
            </div>

            <div className="q-accounts-box">
              <p className="q-accounts-title">💳 CUENTAS OFICIALES DE PAGO:</p>
              <div className="q-accounts-info">
                <p>
                  • <strong>Banco:</strong> {QUOTER_CONFIG.BANK_NAME}
                </p>
                <p>
                  • <strong>Titular:</strong> {QUOTER_CONFIG.ACCOUNT_HOLDER}
                </p>
                <p>
                  • <strong>N° de Cuenta:</strong> {QUOTER_CONFIG.ACCOUNT_NUMBER}
                </p>
                <p>
                  • <strong>Yappy Comercial:</strong> {QUOTER_CONFIG.YAPPY_PHONE}
                </p>
              </div>
              <p className="q-accounts-note">*Pagos directos al personal anulan la garantía de 30 días.</p>
            </div>
          </div>

          {/* Resumen Económico */}
          <div className="q-totals-box">
            <div className="q-totals-breakdown">
              <div className="q-total-row">
                <span>Subtotal Bruto:</span>
                <span id="label-subtotal-bruto" style={{ fontWeight: 700 }}>
                  ${totals.grossSubtotal.toFixed(2)}
                </span>
              </div>

              {totals.discountAmount > 0 && (
                <>
                  <div id="row-discount" className="q-total-row discount">
                    <span id="label-discount-title">
                      {discountType === 'percent' ? `Descuento (${discountValue}%):` : 'Descuento aplicado:'}
                    </span>
                    <span id="label-discount-amount">-${totals.discountAmount.toFixed(2)}</span>
                  </div>

                  <div id="row-subtotal-neto" className="q-total-row">
                    <span>Subtotal Neto:</span>
                    <span id="label-subtotal-neto">${totals.netSubtotal.toFixed(2)}</span>
                  </div>
                </>
              )}

              {applyItbms && (
                <div id="row-itbms" className="q-total-row">
                  <span>ITBMS (7%):</span>
                  <span id="label-itbms" style={{ fontWeight: 700 }}>
                    ${totals.itbms.toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <div className="q-total-final-row">
                <span className="q-total-final-label">TOTAL:</span>
                <span id="label-total" className="q-total-final-val">
                  ${totals.total.toFixed(2)} USD
                </span>
              </div>
              <div className="q-anticipo-pill">
                <span>Anticipo 50% (Para agendar):</span>
                <span id="label-anticipo">${totals.anticipo.toFixed(2)} USD</span>
              </div>
            </div>
          </div>
        </div>

        {/* Barra de Acciones (1:1 con cotizador-fixit + envío directo WhatsApp) */}
        <div className="q-actions-bar q-no-print">
          <button
            type="button"
            id="btn-copy-whatsapp"
            onClick={handleCopyToWhatsApp}
            disabled={isSavingQuote}
            className="q-btn"
            style={{ background: '#059669', color: '#ffffff' }}
            title="Copiar texto formateado para WhatsApp y registrar cotización"
          >
            <span>📲</span> Copiar para WhatsApp
          </button>

          {clientPhone.trim() && (
            <button
              type="button"
              id="btn-send-whatsapp-direct"
              onClick={handleSendDirectWhatsApp}
              disabled={isSavingQuote}
              className="q-btn"
              style={{ background: '#047857', color: '#ffffff' }}
              title="Abrir chat de WhatsApp del cliente con la cotización"
            >
              <span>💬</span> Enviar a WhatsApp
            </button>
          )}

          <button
            type="button"
            id="btn-download-pdf"
            onClick={handleDownloadPDF}
            disabled={isGeneratingPdf}
            className="q-btn"
            style={{ background: '#1e3a8a', color: '#ffffff' }}
            title="Descargar documento PDF oficial de 1 página listo para entrega"
          >
            <span>📄</span> {isGeneratingPdf ? 'Generando PDF...' : 'Descargar PDF (1 Pág)'}
          </button>

          {canSharePdf && (
            <button
              type="button"
              id="btn-share-pdf"
              onClick={handleSharePDF}
              disabled={isGeneratingPdf}
              className="q-btn"
              style={{ background: '#0284c7', color: '#ffffff' }}
              title="Compartir PDF directamente en el móvil"
            >
              <span>📤</span> Compartir PDF
            </button>
          )}

          <button
            type="button"
            id="btn-print"
            onClick={handlePrint}
            className="q-btn"
            style={{ background: '#0b2046', color: '#ffffff' }}
            title="Abrir cuadro de impresión o guardar del sistema"
          >
            <span>🖨️</span> Imprimir
          </button>

          <button
            type="button"
            id="btn-reset"
            onClick={handleResetForm}
            className="q-btn"
            style={{ background: '#e2e8f0', color: '#334155' }}
            title="Reiniciar formulario y asignar siguiente número consecutivo"
          >
            <span>✨</span> Nueva Cotización
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 q-no-print">
          <div
            className={`px-4 py-3 rounded-xl shadow-lg text-xs font-bold text-white flex items-center gap-2 ${
              toast.type === 'success'
                ? 'bg-[#064e3b] border border-[#059669]'
                : toast.type === 'warn'
                ? 'bg-[#78350f] border border-[#d97706]'
                : 'bg-[#0f172a]'
            }`}
          >
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Modal de Fallback si el navegador bloquea el portapapeles */}
      {fallbackModalText && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 q-no-print">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full space-y-3">
            <h3 className="font-bold text-base text-[#0b2046]">Copiar Mensaje para WhatsApp</h3>
            <p className="text-xs text-slate-500">
              Selecciona y copia el texto directamente:
            </p>
            <textarea
              readOnly
              value={fallbackModalText}
              className="w-full h-48 text-xs p-2.5 border border-slate-300 rounded-lg font-mono"
            />
            <button
              type="button"
              onClick={() => setFallbackModalText(null)}
              className="w-full py-2.5 bg-[#0b2046] text-white rounded-lg font-bold text-xs cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

