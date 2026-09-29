# FIXIT Firebase Security Specification & RBAC Matrix

## 1. Data Invariants & Authorization Hierarchy

### Roles
- **ADMIN**: Acceso irrestricto a todas las colecciones, operaciones, auditoría, configuración, cambios de rol y eliminación definitiva.
- **OPERATOR**: Acceso operativo para gestionar solicitudes, técnicos, catálogo, cotizaciones y pagos. No puede crear ni modificar Administradores ni alterar configuraciones críticas. No puede realizar eliminación física definitiva (solo archivado).
- **TECHNICIAN**: Acceso restringido únicamente a solicitudes y pedidos asignados (`tecnico_id == uid` o `tecnico_asignado == nombre`). Puede actualizar estados de ejecución permitidos (`ASIGNADA`, `PROGRAMADA`, `EN_PROCESO`, `COMPLETADA`) y agregar notas/evidencias.
- **CLIENT**: Acceso exclusivo a sus propios datos, solicitudes creadas por su UID (`creado_por_uid == uid`), cotizaciones y pagos asociados. Sin acceso al Panel Operativo.

### Invariants
1. `users/{userId}`: El ID del documento debe coincidir con el UID de Firebase Authentication.
2. Un usuario recién registrado de forma pública solo puede obtener `role == 'CLIENT'`. No se permite la auto-asignación de roles privilegiados (`ADMIN`, `OPERATOR`, `TECHNICIAN`).
3. El primer administrador del sistema está protegido por lista blanca de correo (`ricardog20852016@gmail.com`) y el registro de `/admins/{uid}`.
4. Solo un usuario con rol `ADMIN` puede promover a otros usuarios a `ADMIN` o cambiar roles administrativos.
5. Las solicitudes archivadas (`estado == 'ARCHIVADA'`) conservan su historial de auditoría intacto y no se eliminan físicamente salvo por acción explícita de un `ADMIN`.
6. Las cotizaciones aprobadas conservan los precios pactados incluso si el catálogo de servicios sufre modificaciones posteriores.

---

## 2. The Dirty Dozen Security Payloads

1. **Payload 1 (Privilege Escalation on User Register)**:
   - `users/{uid}` con `role: "ADMIN"` enviado por usuario anónimo o cliente no autorizado.
   - *Resultado esperado*: RECHAZADO (PERMISSION_DENIED). Solo se permite `role == 'CLIENT'` en auto-registro.

2. **Payload 2 (Ghost Field Injection / Shadow Update)**:
   - Modificación de perfil añadiendo campos no autorizados como `isAdmin: true` o `bypassBilling: true`.
   - *Resultado esperado*: RECHAZADO (PERMISSION_DENIED por hasOnly/diff whitelist).

3. **Payload 3 (Unauthorized Cross-Tenant Request List Query)**:
   - Cliente consultando `requests` sin filtrar por su `creado_por_uid`.
   - *Resultado esperado*: RECHAZADO (Query Enforcer exige coincidencia de UID).

4. **Payload 4 (Technician Status Skipping to Terminated without Assignment)**:
   - Técnico intentando modificar una solicitud no asignada a él.
   - *Resultado esperado*: RECHAZADO (Técnico solo accede y edita cuando `tecnico_id == request.auth.uid`).

5. **Payload 5 (Operator Attempting to Delete User Permanently)**:
   - Operador llamando `deleteDoc(doc(db, 'users', uid))`.
   - *Resultado esperado*: RECHAZADO (Solo ADMIN puede borrar usuarios físicamente).

6. **Payload 6 (PII Harvesting by Unauthenticated User)**:
   - Solicitud GET anónima a `users/{userId}` o lista completa de clientes.
   - *Resultado esperado*: RECHAZADO (Acceso cerrado por isOwner || isOperator).

7. **Payload 7 (Catalog Price Manipulation by Client)**:
   - Cliente enviando `updateDoc` sobre `/services/PLO-001` con `price: 0.01`.
   - *Resultado esperado*: RECHAZADO (Solo OPERATOR o ADMIN pueden editar catálogo).

8. **Payload 8 (State Poisoning with Invalid State Enum)**:
   - Actualización de solicitud con `estado: "ESTADO_INVENTADO"`.
   - *Resultado esperado*: RECHAZADO (Validación estricta de los 14 estados oficiales).

9. **Payload 9 (Deletion of Audit Trail Logs)**:
   - Intento de borrar documentos en `/audit_logs/{id}`.
   - *Resultado esperado*: RECHAZADO (Audit logs son inmutables para no-admins).

10. **Payload 10 (Deactivated User Performing State Writes)**:
    - Usuario con `status: 'inactivo'` intentando crear nuevas órdenes o alterar datos.
    - *Resultado esperado*: RECHAZADO.

11. **Payload 11 (Oversized Payload / Denial of Wallet Attack)**:
    - Inyección de cadenas mayores a 2000 caracteres en notas o nombres.
    - *Resultado esperado*: RECHAZADO (Límites de tamaño en reglas).

12. **Payload 12 (Direct Injection into /admins Collection)**:
    - Cliente intentando crear un documento en `/admins/{su_uid}`.
    - *Resultado esperado*: RECHAZADO (Solo ADMIN o sistema verificado).
