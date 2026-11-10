// Cliente mínimo de WhatsApp Cloud API (Meta Graph) + verificación de firma.
// Docs: developers.facebook.com/docs/whatsapp/cloud-api
import crypto from 'node:crypto';
import { optEnv, reqEnv } from './env';

export interface WaTextMessage {
  from: string;
  id: string;
  text: string;
  name: string;
  timestamp: string;
}

function apiBase(): string {
  // Versión fijable por env por si Meta depreca el default.
  const version = optEnv('WHATSAPP_API_VERSION', 'v22.0');
  return `https://graph.facebook.com/${version}`;
}

// HMAC-SHA256 sobre los bytes crudos tal como los envía Meta.
export function verifySignature(rawBody: Buffer, signatureHeader: string, appSecret: string): boolean {
  if (!signatureHeader.startsWith('sha256=')) return false;
  const theirs = signatureHeader.slice('sha256='.length);
  const ours = crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');
  const a = Buffer.from(theirs, 'utf8');
  const b = Buffer.from(ours, 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function sendTextMessage(
  to: string,
  body: string
): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  try {
    const token = reqEnv('WHATSAPP_TOKEN');
    const phoneId = reqEnv('WHATSAPP_PHONE_NUMBER_ID');
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10000);
    try {
      const res = await fetch(`${apiBase()}/${phoneId}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body: body.slice(0, 4000), preview_url: false },
        }),
        signal: ctrl.signal,
      });
      const data = (await res.json().catch(() => ({}))) as {
        messages?: { id: string }[];
        error?: { message?: string; code?: number };
      };
      if (!res.ok) {
        return { ok: false, error: `Meta ${res.status}: ${data?.error?.message || data?.error?.code || '?'}`.slice(0, 300) };
      }
      return { ok: true, messageId: data?.messages?.[0]?.id };
    } finally {
      clearTimeout(timer);
    }
  } catch (e) {
    return { ok: false, error: (e instanceof Error ? e.message : String(e)).slice(0, 300) };
  }
}

// Extrae mensajes de texto entrantes del payload webhook (ignora estados y recibos).
export function extractTextMessages(payload: unknown): WaTextMessage[] {
  const out: WaTextMessage[] = [];
  const entries = (payload as { entry?: unknown[] })?.entry;
  if (!Array.isArray(entries)) return out;
  for (const entry of entries) {
    const changes = (entry as { changes?: unknown[] })?.changes;
    if (!Array.isArray(changes)) continue;
    for (const change of changes) {
      const value = (change as { value?: Record<string, unknown> })?.value;
      const messages = value?.messages;
      if (!Array.isArray(messages)) continue;
      const contacts = Array.isArray(value?.contacts) ? (value.contacts as Record<string, unknown>[]) : [];
      const profileName =
        (contacts[0]?.profile as { name?: string } | undefined)?.name || '';
      for (const m of messages) {
        const msg = m as { from?: string; id?: string; timestamp?: string; type?: string; text?: { body?: string } };
        if (msg?.type === 'text' && msg.from && msg.text?.body) {
          out.push({
            from: String(msg.from),
            id: String(msg.id || ''),
            text: String(msg.text.body).slice(0, 2000),
            name: String(profileName).slice(0, 120),
            timestamp: String(msg.timestamp || ''),
          });
        }
      }
    }
  }
  return out;
}
