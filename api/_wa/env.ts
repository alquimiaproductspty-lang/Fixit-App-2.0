// Helpers pequeños para leer variables de entorno en serverless.
// Los secretos NUNCA van en código: solo se leen de process.env (dashboard Vercel).
export function reqEnv(name: string): string {
  const v = (process.env[name] || '').trim();
  if (!v) throw new Error(`Falta variable de entorno: ${name}`);
  return v;
}

export function optEnv(name: string, fallback: string): string {
  const v = (process.env[name] || '').trim();
  return v || fallback;
}
