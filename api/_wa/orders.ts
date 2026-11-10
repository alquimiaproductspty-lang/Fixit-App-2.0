// Crea el pedido en Firestore cuando el cliente confirma por chat.
// Espeja handleCreateManualOrder (mismo consecutivo atómico, mirror en orders).
import { calcCommission, calcNet, round2 } from '../../src/lib/commissions';
import { getDb } from './store';

export interface BotQuote {
  service: string;
  price: number;
  needsVisit: boolean;
}

async function nextOrderNumber(date = new Date()): Promise<string> {
  const fullYear = date.getFullYear();
  const yy = String(fullYear).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const ref = getDb().doc(`counters/orders_${fullYear}_${mm}`);
  try {
    const next = await getDb().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const data = (snap.exists ? snap.data() : {}) as { currentCount?: unknown; count?: unknown };
      const current =
        typeof data.currentCount === 'number' ? data.currentCount
        : typeof data.count === 'number' ? data.count
        : 0;
      const newCount = current + 1;
      tx.set(
        ref,
        {
          currentCount: newCount,
          count: newCount,
          prefix: `FIX-${yy}${mm}`,
          year: fullYear,
          month: date.getMonth() + 1,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      return newCount;
    });
    return `FIX-${yy}${mm}-${String(next).padStart(4, '0')}`;
  } catch (e) {
    console.error('[wa] Contador atómico falló, fallback:', e instanceof Error ? e.message : e);
    return `FIX-${yy}${mm}-${String(Date.now()).slice(-4)}`;
  }
}

export async function createOrderFromBot(input: {
  phone: string;
  clientName: string;
  address: string;
  quote: BotQuote;
  transcriptNote: string;
}): Promise<{ orderId: string; numero: string }> {
  const db = getDb();
  const nowIso = new Date().toISOString();
  const numero = await nextOrderNumber();
  const orderId = `REQ-${Date.now().toString().slice(-6)}`;
  const total = round2(Math.max(0, input.quote.price));
  // Fase 1: todo es mano de obra salvo que el bot cotice visita/materiales explícitos.
  const laborBase = total;

  const payload: Record<string, unknown> = {
    id: orderId,
    numero_pedido: numero,
    consecutiveId: numero,
    orderNumber: numero,
    codigo_seguimiento: numero,
    creado_por_uid: 'whatsapp_bot',
    cliente: {
      id: `wa_${input.phone}`,
      nombre: input.clientName || 'Chat WhatsApp',
      telefono: input.phone,
    },
    servicio_probable: {
      id: 'COTIZACION',
      service_name: input.quote.service || 'Servicio cotizado',
      category: 'Servicio cotizado',
      price: total,
    },
    direccion: input.address || 'Dirección por confirmar',
    fecha: nowIso,
    horario_preferido: 'Hoy',
    precio_regular: total,
    total_facturado: total,
    cotizacion: total,
    visitOutcome: input.quote.needsVisit ? 'pendiente' : undefined,
    comision_fixit: calcCommission(laborBase, 0.15),
    costo_tecnico: calcNet(laborBase, 0.15),
    estado: 'APROBADA',
    origen: 'WHATSAPP_BOT',
    tipo_propiedad: 'Residencial',
    notas_internas: [
      `Generado por bot WhatsApp ($${total.toFixed(2)}${input.quote.needsVisit ? ', con visita' : ''}).`,
      input.address ? '' : 'Confirmar dirección del servicio.',
      input.transcriptNote ? `Resumen: ${input.transcriptNote}`.slice(0, 400) : '',
    ]
      .filter(Boolean)
      .join(' '),
    createdAt: nowIso,
    updatedAt: nowIso,
    isArchived: false,
    historial: [
      {
        id: `HIST-${Date.now()}`,
        estado_nuevo: 'APROBADA',
        fecha: nowIso,
        usuario: 'FixitBot WhatsApp',
        comentario: `Pedido ${numero} creado desde conversación WhatsApp.`,
      },
    ],
  };

  // Limpia undefined (sanitize simple: Admin SDK rechaza undefined).
  const clean = JSON.parse(JSON.stringify(payload)) as Record<string, unknown>;
  await db.doc(`requests/${orderId}`).set(clean);
  try {
    await db.doc(`orders/${orderId}`).set(clean);
  } catch (e) {
    console.error('[wa] Mirror orders falló (no fatal):', e instanceof Error ? e.message : e);
  }
  return { orderId, numero };
}
