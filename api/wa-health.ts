// Sonda mínima: si esto responde 200, el runtime de functions está sano
// y el problema está en el código del webhook; si esto también da 500,
// el problema es de plataforma/configuración.
// Incluye diagnóstico NO sensible del verify token (presencia + longitud,
// nunca el valor) para comparar contra lo pegado en Meta.
export default async function handler(_req: unknown, res: { status: (c: number) => { json: (b: unknown) => void } }): Promise<void> {
  const v = (process.env.WHATSAPP_VERIFY_TOKEN || '').trim();
  res.status(200).json({
    ok: true,
    fn: 'wa-health',
    time: new Date().toISOString(),
    verifyToken: { present: v.length > 0, length: v.length },
  });
}
