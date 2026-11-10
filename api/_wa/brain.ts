// Cerebro del bot (port del patrón oficina: reglas → prompt → JSON).
// Reglas de precio desde FIXIT_CATALOG (código); tunables en wa_config/fixit.
// Fase 2: el catálogo también baja a Firestore por negocio.
import { GoogleGenAI } from '@google/genai';
import { FIXIT_CATALOG, FIXIT_UPSELLS } from '../../src/data/catalog';
import { optEnv } from './env';
import type { WaBotConfig, WaSession } from './store';

export interface BrainResult {
  reply: string;
  serviceGuess: string | null;
  addressGuess: string | null;
  readyToQuote: boolean;
  suggestedPrice: number | null;
  needsVisit: boolean;
  confirmed: boolean;
  wantsHuman: boolean;
  isUrgent: boolean;
  note: string;
  modelError: string | null;
}

let genAI: GoogleGenAI | null = null;

function getClient(): GoogleGenAI | null {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) return null;
  if (!genAI) genAI = new GoogleGenAI({ apiKey });
  return genAI;
}

export function buildRulesText(visitFee: number): string {
  const lines = FIXIT_CATALOG.filter((s) => s.active !== false).map((s) => {
    const parts = [`- ${s.id} · ${s.service_name}: $${s.price.toFixed(2)}`];
    if (s.promo_price_usd) parts.push(`(promo $${s.promo_price_usd.toFixed(2)})`);
    if (s.addon_only) parts.push('(SOLO complemento, nunca solo)');
    return parts.join(' ');
  });
  const upsells = FIXIT_UPSELLS.filter((u) => u.active).map(
    (u) => `- EXTRA ${u.id} · ${u.name}: $${u.price_usd.toFixed(2)} instalado (el técnico lo ofrece en sitio)`
  );
  return [...lines, ...upsells, `- VISITA: visita técnica $${visitFee} (se abona al total si aprueba; si no aprueba paga $10 capital / $15 afuera)`].join('\n');
}

function buildPrompt(
  config: WaBotConfig,
  session: WaSession,
  message: string,
  clientName: string
): string {
  const historyText = session.history
    .map((h) => `${h.role === 'agent' ? 'Agente' : 'Cliente'}: ${h.content}`)
    .join('\n');
  const rulesText = buildRulesText(config.visitFee);
  const turn = session.turn + 1;
  return `Eres el asistente de WhatsApp de ${config.businessName} (reparaciones residenciales en Panamá). Cotizas con estas reglas (obedécelas sobre tu criterio):
${rulesText}
Instrucciones del dueño: ${config.extra || 'ninguna extra'}
Turno ${turn} de ${config.maxTurns} máximo. Conversación:
${historyText || '(inicio)'}
Cliente (${clientName || 'sin nombre'}): ${message}

Comportamiento: responde CORTO (máx 4 líneas), cálido, español panameño neutro, 1 pregunta por mensaje para afinar. NUNCA inventes precios fuera de las reglas. Cuando tengas servicio + alcance claros, da el precio. Pide visita técnica si es complejo, peligroso, supera $150 o llegas al último turno. Si el cliente confirma/agenda explícitamente (sí, agéndalo, de acuerdo, dale), márcalo. Si pide humano o hay urgencia/riesgo (agua con electricidad, chispas, humo, inundación activa, sin luz/agua en todo), márcalo.
Responde SOLO JSON válido, sin cercas ni texto extra: {"reply": "tu mensaje al cliente", "service_guess": "nombre corto o null", "address_guess": "dirección/zona si la dijo o null", "ready_to_quote": true/false, "suggested_price": number o null, "needs_visit": true/false, "confirmed": true/false, "wants_human": true/false, "is_urgent": true/false, "note": "resumen interno 1 línea"}`;
}

function extractJson(text: string): Record<string, unknown> | null {
  const clean = text.replace(/```json|```/g, '');
  const m = clean.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const p = JSON.parse(m[0]) as Record<string, unknown>;
    return p && typeof p === 'object' ? p : null;
  } catch {
    return null;
  }
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`IA tardó más de ${ms}ms`)), ms);
    p.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); }
    );
  });
}

const FALLBACK_REPLY =
  'Gracias por escribirnos. Un asesor revisará tu caso y te responderá en breve. Si es una urgencia (agua, luz, gas), llámanos directo.';

export async function think(
  config: WaBotConfig,
  session: WaSession,
  message: string,
  clientName: string
): Promise<BrainResult> {
  const fail = (modelError: string): BrainResult => ({
    reply: FALLBACK_REPLY,
    serviceGuess: null,
    addressGuess: null,
    readyToQuote: false,
    suggestedPrice: null,
    needsVisit: false,
    confirmed: false,
    wantsHuman: false,
    isUrgent: false,
    note: `IA caída: ${modelError}`.slice(0, 300),
    modelError,
  });

  const ai = getClient();
  if (!ai) return fail('Falta GEMINI_API_KEY');
  const model = (config.modelId || optEnv('GEMINI_MODEL', '') || 'gemini-3.8-flash').trim();
  const prompt = buildPrompt(config, session, message, clientName);

  try {
    const res = await withTimeout(
      ai.models.generateContent({
        model,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { responseMimeType: 'application/json', temperature: 0.4, maxOutputTokens: 700 },
      }),
      9000
    );
    const text = (res as { text?: string }).text || '';
    const p = extractJson(text);
    if (!p) return fail(`sin JSON (resp: ${text.slice(0, 120) || 'vacía'})`);
    const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
    const str = (v: unknown): string | null => {
      const s = String(v ?? '').trim();
      return s ? s.slice(0, 500) : null;
    };
    return {
      reply: str(p.reply) || FALLBACK_REPLY,
      serviceGuess: str(p.service_guess),
      addressGuess: str(p.address_guess),
      readyToQuote: p.ready_to_quote === true,
      suggestedPrice: num(p.suggested_price),
      needsVisit: p.needs_visit === true,
      confirmed: p.confirmed === true,
      wantsHuman: p.wants_human === true,
      isUrgent: p.is_urgent === true,
      note: str(p.note) || 'Turno sin conclusión.',
      modelError: null,
    };
  } catch (e) {
    return fail(e instanceof Error ? e.message : String(e));
  }
}
