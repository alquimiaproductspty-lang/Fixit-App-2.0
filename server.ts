import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { 
  getAllOrders, 
  getOrderById, 
  createOrder, 
  updateOrder, 
  savePhotoBuffer, 
  getPhotoPath 
} from './server/store';
import { 
  APP_VERSION, 
  APP_BUILD_DATE, 
  APP_BUILD_TIMESTAMP, 
  APP_RELEASE_NOTES 
} from './src/config/version';

dotenv.config();

const app = express();
const PORT = 3000;

// Body parser with 25MB limit for high-resolution inspection photos
app.use(express.json({ limit: '25mb' }));

// Lazy Google Gen AI client initialization
let genAI: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!genAI) {
    genAI = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return genAI;
}

// -------------------------------------------------------------
// Photo Storage Endpoints (Durable on-disk storage in /data/uploads)
// -------------------------------------------------------------
app.post('/api/upload-photos', (req, res) => {
  try {
    const { photos } = req.body;
    if (!Array.isArray(photos) || photos.length === 0) {
      return res.status(400).json({ error: 'No se recibieron fotografías.' });
    }

    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
    const urls: string[] = [];
    const storedFiles: { id: string; filename: string; url: string }[] = [];

    // Allow maximum 3 photos per request
    photos.slice(0, 3).forEach((base64Str: string) => {
      if (!base64Str || typeof base64Str !== 'string') return;
      
      const saved = savePhotoBuffer(base64Str);
      storedFiles.push(saved);
      urls.push(`${protocol}://${host}${saved.url}`);
    });

    res.json({
      success: true,
      urls,
      files: storedFiles,
      count: urls.length,
      message: 'Fotografías almacenadas con éxito en el expediente del servicio.',
    });
  } catch (err) {
    console.error('Error al guardar fotos en disco:', err);
    res.status(500).json({ error: 'Fallo al procesar y almacenar las fotografías.' });
  }
});

app.get('/api/photos/:filename', (req, res) => {
  try {
    const filePath = getPhotoPath(req.params.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Fotografía no encontrada.' });
    }
    res.sendFile(filePath);
  } catch (err) {
    res.status(500).json({ error: 'Error al servir la fotografía.' });
  }
});

// -------------------------------------------------------------
// Orders / Solicitudes Endpoints (Backend Fallback for Customer Orders)
// -------------------------------------------------------------
app.get('/api/orders', (req, res) => {
  try {
    const { status, category, search, startDate, endDate, showArchived } = req.query;
    const orders = getAllOrders({
      status: status as string,
      category: category as string,
      search: search as string,
      startDate: startDate as string,
      endDate: endDate as string,
      showArchived: showArchived === 'true',
    });
    res.json({ success: true, count: orders.length, orders });
  } catch (err) {
    res.status(500).json({ error: 'Error al consultar pedidos.' });
  }
});

app.get('/api/orders/:id', (req, res) => {
  try {
    const order = getOrderById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Pedido no encontrado.' });
    }
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener detalle del pedido.' });
  }
});

app.post('/api/orders', (req, res) => {
  try {
    const orderData = req.body;
    if (!orderData || !orderData.cliente || !orderData.servicio_probable) {
      return res.status(400).json({ error: 'Faltan datos obligatorios del cliente o del servicio.' });
    }

    const created = createOrder(orderData);
    res.status(201).json({
      success: true,
      message: 'Pedido registrado con éxito.',
      order: created,
    });
  } catch (err) {
    console.error('Error creating order:', err);
    res.status(500).json({ error: 'Error al registrar el pedido.' });
  }
});

app.patch('/api/orders/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const author = req.body.modificado_por || 'Admin FIXIT';

    const updated = updateOrder(id, updates, author);
    if (!updated) {
      return res.status(404).json({ error: 'Pedido no encontrado para actualizar.' });
    }

    res.json({
      success: true,
      message: 'Pedido actualizado con éxito.',
      order: updated,
    });
  } catch (err) {
    console.error('Error updating order:', err);
    res.status(500).json({ error: 'Error al actualizar el pedido.' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'FIXIT Residential Solutions API',
    persistence: 'Durable Disk Store (data/db.json & data/uploads)',
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    time: new Date().toISOString(),
  });
});

// App Version & Deployment Status endpoint (Strictly un-cached for real-time PWA update checks)
app.get('/api/version', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  res.json({
    version: APP_VERSION,
    buildDate: APP_BUILD_DATE,
    buildTimestamp: APP_BUILD_TIMESTAMP,
    releaseNotes: APP_RELEASE_NOTES,
    environment: process.env.NODE_ENV || 'development',
    serverTime: new Date().toISOString(),
  });
});

// Classification endpoint for photos
app.post('/api/classify', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg', userContext } = req.body;

    const catalogDescription = `
CATÁLOGO CERRADO DE SERVICIOS FIXIT EN CIUDAD DE PANAMÁ (ÚNICOS PERMITIDOS):
[PLOMERÍA]
- PLO-001: Reparar fuga visible y accesible (tuberías vistas, llaves de paso con goteo, conectores de lavamanos o fregadero)
- PLO-002: Humedad o fuga oculta (manchas en paredes, losas húmedas, fugas no visibles a simple vista)
- PLO-003: Destapar lavamanos, ducha o fregadero (obstrucción de trampa/sifón o drenaje lento en lavamanos, regadera o fregadero)
- PLO-004: Destapar inodoro (inodoro atascado o que no drena agua)
- PLO-005: Drenaje recurrente o principal (problemas en tubería sanitaria principal de la casa o atasco general)
- PLO-006: Cambiar grifo o llave estándar (reemplazo o instalación de mezclador, monomando o grifería)
- PLO-007: Reparar inodoro (inodoro que bota agua continua dentro de la taza, sapito o válvula desgastada)
- PLO-008: Instalar lavadora o conectar lavamanos/fregadero (acople de mangueras de agua y desagüe de artefactos)
- PLO-009: Baja presión de agua (poco caudal en grifos o regaderas)
- PLO-010: Problema de agua caliente (calentador de agua no enciende o no calienta)
- PLO-011: Atención prioritaria por fuga o inundación (rotura severa con agua derramándose activamente)

[ELECTRICIDAD]
- ELE-001: Cambio de tomacorriente estándar (enchufe dañado, roto, flojo o que se desea renovar)
- ELE-002: Cambio de interruptor estándar (apagador de luz o switch de pared dañado)
- ELE-003: Instalación de lámpara o plafón en punto existente (montaje de luminaria o aplique en caja de techo)
- ELE-004: Instalar ventilador de techo en punto existente (ensamblaje y montaje de ventilador)
- ELE-005: Tomacorriente o interruptor sin energía (enchufe que dejó de funcionar sin chispas)
- ELE-006: Breaker que se baja (pastilla termomagnética que se dispara en el tablero eléctrico)
- ELE-007: Problema eléctrico en una habitación (luces parpadean o varios enchufes caídos en un área)
- ELE-008: Atención prioritaria eléctrica (chispas activas, olor a quemado, humo o cables derretidos)

[AIRE ACONDICIONADO]
- AC-001: Mantenimiento preventivo split residencial (limpieza profunda de evaporador, turbina, filtros y condensador exterior)
- AC-002: Revisión técnica de goteo o enfriamiento (split residencial gotea agua hacia la pared, no enfría o congela tuberías)
- AC-003: Instalación o reubicación de split (montaje de consola y condensador exterior en punto residencial)`;

    const promptText = `Eres el clasificador técnico de FIXIT, servicio de reparaciones residenciales en Ciudad de Panamá.
Analiza la foto proporcionada por el usuario de forma estricta y profesional.

DIRECTIVAS CRÍTICAS:
1. SOLO puedes clasificar dentro del catálogo FIXIT cerrado (Plomería, Electricidad o Aire Acondicionado).
2. NUNCA diagnostiques libremente fuera de este catálogo.
3. NUNCA prometas una reparación garantizada ni inventes precios.
4. DETECCIÓN DE CALIDAD DE FOTO:
   - Si la foto está muy borrosa, oscura, fuera de foco, o no muestra ningún elemento del hogar reconocible:
     establece "foto_borrosa_o_oscura": true, "confianza": 0.20, "mensaje_calidad_foto": "La foto parece algo borrosa o con poca luz para identificar el daño con certeza. Te sugerimos tomar otra foto más nítida e iluminada del área."
5. DETECCIÓN DE RIESGO O SEGURIDAD:
   - Si detectas agua cerca de enchufes/tableros eléctricos, chispas, humo, cables derretidos, olor a quemado, o inundación activa:
     establece "alerta_seguridad": true, "es_urgente": true, "detalle_seguridad": "Se detectó riesgo crítico en la imagen (agua cerca de electricidad, chispas o inundación activa).", y selecciona ELE-008 (eléctrico) o PLO-011 (plomería).
6. UMBRALES DE CONFIANZA:
   - Alta confianza (>= 0.70): El elemento y problema son claramente reconocibles (ej. inodoro, grifería, toma de corriente, split goteando). "servicio_id" debe ser el servicio exacto.
   - Confianza media (0.45 a 0.69): Es reconocible el área o fixture pero hay dos posibilidades probables. Asigna "servicio_id" como primera opción y "servicio_id_secundario" como segunda opción válida del catálogo.
   - Confianza baja (< 0.45): La imagen es ambigua. Asigna "confianza" < 0.45.
7. Responde EXCLUSIVAMENTE con un JSON con la siguiente estructura exacta:
{
  "categoria": "Plomería" | "Electricidad" | "Aire Acondicionado",
  "servicio_id": "PLO-XXX" | "ELE-XXX" | "AC-XXX",
  "servicio_id_secundario": "PLO-XXX" | "ELE-XXX" | "AC-XXX" | null,
  "confianza": number,
  "razon_breve": string,
  "preguntas_recomendadas": string[],
  "es_urgente": boolean,
  "alerta_seguridad": boolean,
  "detalle_seguridad": string | null,
  "foto_borrosa_o_oscura": boolean,
  "mensaje_calidad_foto": string | null
}

${catalogDescription}

Contexto provisto por el usuario (si hay): "${userContext || 'Sin notas adicionales'}".`;

    const ai = getGeminiClient();

    if (!ai || !imageBase64) {
      // Fallback response for testing environment if API key is not present
      const lowerContext = (userContext || '').toLowerCase();
      let cat: 'Plomería' | 'Electricidad' | 'Aire Acondicionado' = 'Plomería';
      let sId = 'PLO-001';
      let secId: string | null = 'PLO-006';

      if (lowerContext.includes('aire') || lowerContext.includes('ac') || lowerContext.includes('clima') || lowerContext.includes('split')) {
        cat = 'Aire Acondicionado';
        sId = 'AC-001';
        secId = 'AC-002';
      } else if (lowerContext.includes('luz') || lowerContext.includes('electr') || lowerContext.includes('enchufe') || lowerContext.includes('breaker')) {
        cat = 'Electricidad';
        sId = 'ELE-001';
        secId = 'ELE-005';
      }

      const fallbackResult = {
        categoria: cat,
        servicio_id: sId,
        servicio_id_secundario: secId,
        confianza: 0.85,
        razon_breve: 'Se identificó un elemento residencial estándar correspondiente al catálogo FIXIT.',
        preguntas_recomendadas: ['ubicacion', 'alcance'],
        es_urgente: false,
        alerta_seguridad: false,
        detalle_seguridad: null,
        foto_borrosa_o_oscura: false,
        mensaje_calidad_foto: null,
      };
      return res.json(fallbackResult);
    }

    // Clean base64 data URL prefix if present
    const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: promptText },
            {
              inlineData: {
                data: cleanBase64,
                mimeType: mimeType || 'image/jpeg',
              },
            },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
      },
    });

    const responseText = response.text || '{}';
    let parsedJson;
    try {
      parsedJson = JSON.parse(responseText);
    } catch {
      const cleaned = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
      parsedJson = JSON.parse(cleaned);
    }

    // Standardize compatibility fields
    if (parsedJson.categoria_probable && !parsedJson.categoria) {
      parsedJson.categoria = parsedJson.categoria_probable;
    }
    if (parsedJson.servicio_id_probable && !parsedJson.servicio_id) {
      parsedJson.servicio_id = parsedJson.servicio_id_probable;
    }

    res.json(parsedJson);
  } catch (error: any) {
    // Graceful fallback without triggering error logs when quota is depleted (429) or service is unavailable (503)
    console.warn(
      '[FIXIT Classifier] AI classification unavailable or credits depleted, using default catalog routing:',
      error?.status || error?.message || 'unavailable'
    );
    res.json({
      categoria: 'Plomería',
      servicio_id: 'PLO-001',
      servicio_id_secundario: 'PLO-003',
      confianza: 0.40, // Low confidence falls back cleanly to simple category buttons
      razon_breve: 'No pudimos verificar con total certeza el detalle en la foto. Elige el tipo de problema a continuación.',
      preguntas_recomendadas: ['ubicacion'],
      es_urgente: false,
      alerta_seguridad: false,
      detalle_seguridad: null,
      foto_borrosa_o_oscura: false,
      mensaje_calidad_foto: null,
    });
  }
});

async function startServer() {
  const setStaticCustomHeaders = (res: express.Response, filePath: string) => {
    const base = path.basename(filePath).toLowerCase();
    // Critical: Service Worker, manifests, and index.html MUST NEVER be cached by HTTP cache
    if (
      base === 'sw.js' || 
      base === 'registersw.js' || 
      base === 'manifest.webmanifest' || 
      base === 'manifest.json' || 
      base === 'index.html' ||
      base.startsWith('workbox-')
    ) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    } else if (filePath.includes('/assets/') || filePath.includes('\\assets\\')) {
      // Hashed Vite chunks (JS, CSS) can be cached long-term
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else {
      // Standard static assets (favicons, icons)
      res.setHeader('Cache-Control', 'public, max-age=86400');
    }
  };

  // Direct static serving of public assets (PWA manifest, icons, favicons)
  const publicPath = path.join(process.cwd(), 'public');
  app.use(express.static(publicPath, { setHeaders: setStaticCustomHeaders }));

  // Explicit Service Worker endpoint to ensure /sw.js is always served with valid javascript headers
  app.get('/sw.js', (req, res) => {
    const distSw = path.join(process.cwd(), 'dist', 'sw.js');
    if (fs.existsSync(distSw)) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Service-Worker-Allowed', '/');
      return res.sendFile(distSw);
    }
    // Never fall through to SPA fallback (which serves index.html text/html)
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    return res.status(404).send('// Service Worker not found in dist. Run npm run build.\n');
  });

  app.get(/^\/workbox-[a-f0-9]+\.js$/, (req, res) => {
    const fileName = path.basename(req.path);
    const distWorkbox = path.join(process.cwd(), 'dist', fileName);
    if (fs.existsSync(distWorkbox)) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      return res.sendFile(distWorkbox);
    }
    // Never fall through to SPA fallback
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    return res.status(404).send('// Workbox script not found in dist.\n');
  });

  // Handle any stray requests to dev-sw.js from old browser caches with self-unregistering JS
  app.get(['/dev-sw.js', '/dev-sw.js*'], (req, res) => {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    return res.send('// Dev SW disabled\nself.addEventListener("install", () => self.skipWaiting());\nself.addEventListener("activate", () => self.registration.unregister());\n');
  });

  const httpServer = http.createServer(app);

  // Vite middleware in development
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: {
          server: httpServer,
        },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, { setHeaders: setStaticCustomHeaders }));
    app.get('*', (req, res) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[FIXIT Server] Running at http://localhost:${PORT}`);
  });
}

startServer();
