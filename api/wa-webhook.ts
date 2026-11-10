// Webhook de WhatsApp Cloud API — Fase 1 (piloto Fixit).
// GET  → verificación de Meta (hub.mode/hub.verify_token/hub.challenge).
// POST → valida firma, corre el cerebro (reglas→Gemini→JSON), responde,
//        crea pedido al confirmar, deriva a humano y alerta al dueño.
// Colecciones nuevas (Admin SDK, sin reglas): wa_config, wa_sessions.
import { think } from './_wa/brain';
import { extractTextMessages, sendTextMessage, verifySignature } from './_wa/meta';
import { createOrderFromBot } from './_wa/orders';
import {
  freshSession,
  getBotConfig,
  getSession,
  isStale,
  saveSession,
  type WaBotConfig,
  type WaSession,
} from './_wa/store';

// Pide cuerpo crudo (Next/Vercel lo honra; si lo ignora, caemos a req.body).
export const config = { api: { bodyParser: false } };

interface VercelReq {
  method?: string;
  query?: Record<string, string | string[] | undefined>;
  headers?: Record<string, string | string[] | undefined>;
  body?: unknown;
  [Symbol.asyncIterator]?: () => AsyncIterator<Buffer | string>;
}

interface VercelRes {
  status: (code: number) => VercelRes;
  send: (body: unknown) => void;
  json: (body: unknown) => void;
}

function first(v: string | string[] | undefined): string {
  return Array.isArray(v) ? v[0] || '' : v || '';
}

function reqEnvStrict(name: string): string {
  const v = (process.env[name] || '').trim();
  if (!v) throw new Error(`Falta variable de entorno: ${name}`);
  return v;
}

async function readRawBody(req: VercelReq): Promise<Buffer> {
  const chunks: Buffer[] = [];
  try {
    const it = req[Symbol.asyncIterator]?.bind(req);
    if (it) {
      for await (const c of { [Symbol.asyncIterator]: it }) {
        chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(String(c)));
      }
    }
  } catch {
    /* cae al fallback */
  }
  if (chunks.length > 0) return Buffer.concat(chunks);
  return Buffer.from(JSON.stringify(req.body ?? {}));
}

// Alerta al dueño por el mismo WhatsApp (best-effort, con throttle).
async function alertOwner(
  session: WaSession,
  text: string,
  opts: { force?: boolean } = {}
): Promise<void> {
  const owner = (process.env.OWNER_ALERT_PHONE || '').replace(/\D/g, '');
  if (!owner) return;
  const last = Date.parse(session.lastAlertAt || '');
  if (!opts.force && !Number.isNaN(last) && Date.now() - last < 15 * 60 * 1000) return;
  const r = await sendTextMessage(owner, text.slice(0, 1000));
  if (r.ok) {
    session.lastAlertAt = new Date().toISOString();
  } else {
    console.error('[wa] Alerta al dueño falló:', r.error);
  }
}

async function handleHandoff(
  config: WaBotConfig,
  session: WaSession,
  reason: 'keyword' | 'urgent' | 'maxTurns' | 'ai'
): Promise<string> {
  session.status = 'human';
  const biz = config.businessName;
  const reply =
    reason === 'urgent'
      ? `Entendido, esto suena urgente. Ya avisé a un asesor de ${biz}, te contactará en breve. Si hay riesgo inmediato, llama emergencias primero.`
      : `Te paso con un asesor humano de ${biz}, te escribirá en breve. Gracias por tu paciencia.`;
  session.history.push({ role: 'agent', content: reply });
  await alertOwner(
    session,
    `🔥 [FixitBot] ${session.name} (${session.phone}) pasó a humano (${reason}). Último resumen: ${(session.history.slice(-3).map((h) => h.content).join(' | ') || '—').slice(0, 400)}`,
    { force: reason === 'urgent' }
  );
  return reply;
}

export default async function handler(req: VercelReq, res: VercelRes): Promise<void> {
  // ---- Verificación inicial de Meta ----
  if (req.method === 'GET') {
    try {
      const mode = first(req.query?.['hub.mode']);
      const token = first(req.query?.['hub.verify_token']);
      const challenge = first(req.query?.['hub.challenge']);
      if (mode === 'subscribe' && challenge && token === reqEnvStrict('WHATSAPP_VERIFY_TOKEN')) {
        res.status(200).send(challenge);
        return;
      }
    } catch (e) {
      res.status(500).json({ ok: false, error: e instanceof Error ? e.message : String(e) });
      return;
    }
    res.status(403).json({ ok: false, error: 'Verify token inválido' });
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Método no soportado' });
    return;
  }

  // ---- Recepción de eventos ----
  try {
    const appSecret = reqEnvStrict('WHATSAPP_APP_SECRET');
    const raw = await readRawBody(req);
    const signature = first(req.headers?.['x-hub-signature-256'] as string | string[] | undefined);
    if (!verifySignature(raw, signature, appSecret)) {
      console.warn('[wa] Firma inválida (revisar WHATSAPP_APP_SECRET y cuerpo crudo)');
      res.status(403).json({ ok: false, error: 'Firma inválida' });
      return;
    }

    const payload = JSON.parse(raw.toString('utf8') || '{}') as unknown;
    const messages = extractTextMessages(payload);
    const botConfig = await getBotConfig();

    const results: { to: string; action: string; ok: boolean; error?: string }[] = [];
    for (const m of messages.slice(0, 5)) {
      try {
        const phone = m.from.replace(/\D/g, '');
        if (!phone) continue;
        let session = await getSession(phone);
        if (!session || isStale(session)) {
          session = freshSession(phone, m.name || session?.name || '');
        }
        if (m.name && (!session.name || session.name === 'Chat WhatsApp')) session.name = m.name;

        // Dedupe: Meta reintenta si no hubo 200; mismo id = ya atendido.
        if (session.lastInboundId === m.id) {
          results.push({ to: phone, action: 'dedup', ok: true });
          continue;
        }
        session.lastInboundId = m.id;

        if (!botConfig.enabled) {
          results.push({ to: phone, action: 'disabled', ok: true });
          continue;
        }

        session.history.push({ role: 'client', content: m.text });
        session.turn += 1;

        // En manos humanas: solo registra, no responde.
        if (session.status === 'human') {
          await saveSession(session);
          results.push({ to: phone, action: 'human_hold', ok: true });
          continue;
        }

        // Palabra clave de handoff (código, no solo IA).
        if (m.text.toUpperCase().includes(botConfig.handoffKeyword.toUpperCase())) {
          const reply = await handleHandoff(botConfig, session, 'keyword');
          await sendTextMessage(phone, reply);
          await saveSession(session);
          results.push({ to: phone, action: 'handoff_keyword', ok: true });
          continue;
        }

        if (session.turn > botConfig.maxTurns) {
          const reply = await handleHandoff(botConfig, session, 'maxTurns');
          await sendTextMessage(phone, reply);
          await saveSession(session);
          results.push({ to: phone, action: 'handoff_max_turns', ok: true });
          continue;
        }

        const brain = await think(botConfig, session, m.text, session.name);
        if (brain.addressGuess) session.address = brain.addressGuess;

        // IA caída: fallback + atención (reintenta en el próximo turno).
        if (brain.modelError) {
          session.history.push({ role: 'agent', content: brain.reply });
          await sendTextMessage(phone, brain.reply);
          await alertOwner(session, `⚠️ [FixitBot] IA caída con ${session.name} (${phone}): ${brain.modelError}`.slice(0, 500));
          await saveSession(session);
          results.push({ to: phone, action: 'ai_fallback', ok: true });
          continue;
        }

        if (brain.isUrgent || brain.wantsHuman) {
          const reply = await handleHandoff(botConfig, session, brain.isUrgent ? 'urgent' : 'ai');
          await sendTextMessage(phone, reply);
          await saveSession(session);
          results.push({ to: phone, action: brain.isUrgent ? 'handoff_urgent' : 'handoff_ai', ok: true });
          continue;
        }

        // Confirmación sobre cotización pendiente → crear pedido.
        if (brain.confirmed && session.pendingQuote && !session.requestId) {
          const q = session.pendingQuote;
          const address = session.address || 'Dirección por confirmar';
          const { numero } = await createOrderFromBot({
            phone,
            clientName: session.name,
            address,
            quote: q,
            transcriptNote: brain.note,
          });
          session.requestId = numero;
          session.pendingQuote = null;
          session.status = 'done';
          const reply =
            `¡Listo${session.name && session.name !== 'Chat WhatsApp' ? `, ${session.name.split(' ')[0]}` : ''}! Tu pedido ${numero} quedó registrado por $${q.price.toFixed(2)}${q.needsVisit ? ' (incluye visita técnica)' : ''}. Un asesor te confirmará la hora por aquí. ¡Gracias por preferir ${botConfig.businessName}!`;
          session.history.push({ role: 'agent', content: reply });
          await sendTextMessage(phone, reply);
          await alertOwner(session, `✅ [FixitBot] Pedido ${numero} creado desde WhatsApp: ${session.name} (${phone}), $${q.price.toFixed(2)} — ${q.service}. Dirección: ${address}`.slice(0, 500), { force: true });
          await saveSession(session);
          results.push({ to: phone, action: 'order_created', ok: true });
          continue;
        }

        // Cotización lista → guardar pendiente y pedir confirmación explícita.
        if (brain.readyToQuote && brain.suggestedPrice !== null && brain.suggestedPrice > 0) {
          session.requestId = null; // nueva cotización = nuevo ciclo (permite 2do pedido)
          session.status = 'bot';
          session.pendingQuote = {
            service: brain.serviceGuess || 'Servicio cotizado',
            price: brain.suggestedPrice,
            needsVisit: brain.needsVisit,
          };
          let reply = brain.reply;
          if (!/s[ií]\b/i.test(reply) || !/agend|confirm/i.test(reply)) {
            reply = `${reply}\n\n¿Agendo? Responde SÍ para confirmar 👍`;
          }
          session.history.push({ role: 'agent', content: reply });
          await sendTextMessage(phone, reply);
          await saveSession(session);
          results.push({ to: phone, action: 'quote_offered', ok: true });
          continue;
        }

        // Turno conversacional normal.
        session.history.push({ role: 'agent', content: brain.reply });
        await sendTextMessage(phone, brain.reply);
        await saveSession(session);
        results.push({ to: phone, action: 'reply', ok: true });
      } catch (msgErr) {
        console.error('[wa] Error con mensaje:', msgErr instanceof Error ? msgErr.message : msgErr);
        results.push({ to: m.from, action: 'error', ok: false, error: msgErr instanceof Error ? msgErr.message : String(msgErr) });
      }
    }

    res.status(200).json({ ok: true, received: messages.length, results });
  } catch (e) {
    // 200 igual: evita tormentas de reintentos de Meta ante un bug interno.
    console.error('[wa-webhook] Error interno:', e instanceof Error ? e.message : e);
    res.status(200).json({ ok: false, error: e instanceof Error ? e.message : String(e) });
  }
}
