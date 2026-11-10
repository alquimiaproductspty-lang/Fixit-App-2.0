// Sonda mínima: si esto responde 200, el runtime de functions está sano
// y el problema está en el código del webhook; si esto también da 500,
// el problema es de plataforma/configuración.
export default async function handler(_req: unknown, res: { status: (c: number) => { json: (b: unknown) => void } }): Promise<void> {
  res.status(200).json({ ok: true, fn: 'wa-health', time: new Date().toISOString() });
}
