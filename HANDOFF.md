# Handoff — Fixit-App: Fase 2 Vista Fixer

Documento para continuar este trabajo en otra herramienta de IA (ej. Antigravity).
Fecha: 2026-11-07. Idioma del usuario: español.

## 1. Proyecto

- Carpeta: `fixit-app` (repo Git `alquimiaproductspty-lang/Fixit-App-2.0`, rama `main`, árbol limpio).
- Último commit: `647c549` "Apuntar app a fixit-panama, login con correo y Fase A".
- Firebase: proyecto **`fixit-panama`** (nº 409363334329). Config en `firebase-applet-config.json`.
  Firestore en base `(default)`. Reglas ya publicadas desde `firestore.rules` (las de prueba
  habían expirado el 29-oct-2026 y bloqueaban todo; resuelto).
- Deploy: Vercel, dominio **`https://app.fixitpanama.com`** (sin `www`; `www.app...` no existe).
- Estado verificado: login admin funciona en local y producción; crear pedido manual funciona;
  dashboard muestra datos reales. `npm run lint` y `npm run build` en verde.

## 2. Arquitectura actual

- `src/App.tsx`: solo renderiza CRM admin (`AdminDashboardView`) para rol `ADMIN`.
  Los flujos de cliente/cotización están "desacoplados": existen componentes muertos
  (`FixitPro.jsx/.tsx`, `ServiceSelectionStep`, `ServicePriceStep`, `ProblemDetailStep`,
  `SummaryWhatsAppStep`, `useFixitRouter`) que NADA importa. Pueden reutilizarse o reescribirse.
- Roles (`src/types.ts` + `users/{uid}.role`): `ADMIN`, `OPERATOR`, `TECHNICIAN`, `CLIENT`.
- Fase A ya implementada: asignación manual de técnico por operador
  (`assignTechnicianToOrder` en `src/lib/firestoreService.ts` + modal en admin).
- Colecciones: `requests`, `orders`, `users`, `technicians`, `fixers`, `quotes`, `payments`,
  `services`, `counters`, `audit_logs`, `notifications`, `leads`. Ver `firestore.rules` (fuente de verdad).
- Catálogo de precios: `FIXIT_CATALOG` (en admin). Calculadoras: `PaintingCalculator.tsx`, `PinturaService.jsx`.
- Comandos: `npm run dev` (http://localhost:3000), `npm run lint` (= `tsc --noEmit`),
  `npm run build`. Si el build falla con EPERM de workbox: redirigir TEMP
  (`$env:TEMP="$PWD\.tmp-build"`) y borrar la carpeta después.

## 3. Decisiones ya tomadas (no re-preguntar)

1. Base admin se cierra primero → HECHO. Siguiente: vista fixer.
2. La app del fixer vive en el **MISMO proyecto** (vista por rol `TECHNICIAN`), no app separada.
3. Pagos estilo inDriver (fixer paga por solicitud) van **DESPUÉS**; esta fase es solo
   asignación + cotización. No implementar pasarelas ni cobros ahora.

## 4. Fase 2 a construir: vista fixer

- Login existente; si `role === 'TECHNICIAN'`, mostrar vista fixer (no el CRM ni "Acceso Restringido").
- El fixer ve: solicitudes/pedidos disponibles o asignados, lista de precios de servicios,
  calculadoras de apoyo (reutilizar la de pintura por m²), y puede **generar/enviar cotización
  en PDF con logo y cuenta bancaria**.
- El admin ve cuánto se genera (panel de ingresos/cotizaciones en el CRM).
- Respetar `firestore.rules`: no relajar reglas; si falta un permiso legítimo, proponer el cambio
  puntual de regla con justificación (el usuario publica reglas desde la consola; no hay CLI configurado).
- No romper: login, CRM admin, Fase A. Lint + build verdes antes de terminar.

## 5. Archivos clave

- `src/App.tsx` (puerta por rol), `src/components/AdminDashboardView.tsx` (CRM),
  `src/lib/firebase.ts` (auth + `db`), `src/lib/firestoreService.ts`, `src/lib/orderConsecutive.ts`,
  `src/types.ts`, `firestore.rules`, `firebase-applet-config.json`, `public/firebase-messaging-sw.js`.

## 6. Notas

- Ojo: existe una carpeta hermana `Fixi-App-2.0` (sin "t") y OTRO repo `Fixi-App-2.0`: obsoletos, ignorar.
- No hacer commit ni push sin que el usuario lo pida explícitamente.
- Verificación mínima por cambio: `npm run lint` + `npm run build` + prueba manual del flujo tocado.

## 7. Cotizador de referencia (replicar en vista fixer)

- Vivo en: https://cotizador-fixit.vercel.app/ — fuente local: carpeta hermana `../cotizador-fixit`
  (Vite + `src/main.js` 906 líneas + `src/style.css`; PDF con **`html2pdf.js@0.14`**).
- Encabezado: FIXIT PANAMÁ, Mantenimiento y Reparaciones Residenciales, R.U.C. 155743410-2-2023,
  WhatsApp +507 6535-6072. Cotización N° + folio. Garantía 30 días, validez 15 días.
- Cliente: nombre (def. "Consumidor Final"), teléfono/WhatsApp, ubicación/PH (def. Ciudad de Panamá).
- Tabla manual (+ Agregar Fila): Descripción | Cant. | Precio $ | Total. Sin catálogo fijo.
- Descuentos: 0/5/10/15% + manual (% y $). Toggle ITBMS 7%.
- Términos fijos: garantía 30 días mano de obra; ejecución 24-48h tras anticipo; validez 15 días;
  anticipo 50% obligatorio para separar cita; pagos directos al personal anulan garantía.
- Cuentas: Banco General, titular Virginia Palomino Hoyte, cta 04-72-98-545854-3, Yappy 6137-2394.
- Totales: subtotal bruto, descuento, subtotal neto, ITBMS, TOTAL USD, anticipo 50%.
- Acciones: Copiar para WhatsApp, Descargar PDF (1 pág), Compartir PDF (Web Share API si disponible),
  Imprimir, Nueva Cotización.
- La vista fixer debe reproducir este formato 1:1 en PDF (logo + cuenta bancaria) y guardar cada
  cotización emitida (colección `quotes`) para el panel de ingresos del admin.
