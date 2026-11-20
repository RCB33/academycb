# Portal Familias — revisión del 20/11/2026

## Uso real del portal

Administración → Más herramientas (o Más en móvil) → Uso del Portal Familias, `/admin/familias`.

- Fichas de tutor, cuentas familiares, personas que han entrado, cuentas sin visita y fichas sin cuenta familiar.
- Cada ficha muestra jugadores activos, email, estado de cuenta, primera visita y última actividad. Búsqueda por tutor/email/jugador y filtros con un clic; actualización manual.
- El check es automático al montar el portal autenticado en una pestaña visible. No se rellena a mano ni se deduce de una contraseña guardada, de una sesión Auth o de la precarga de una página. Las visitas históricas son desconocidas; no se rellenan retrospectivamente.
- La actividad se actualiza al abrir/volver al portal y cada cinco minutos mientras está visible. No se almacena IP, dispositivo ni navegación detallada. Un fallo de registro no bloquea el portal.
- Solo administradores ven el informe. El endpoint verifica mismo origen, sesión y rol guardian; la identidad sale de la sesión. La función SQL es SECURITY INVOKER y solo service_role puede ejecutarla. Las familias no pueden leer ni editar la tabla.
- Los correos repetidos se señalan, sin fusionar fichas ni conceder acceso a niños por coincidencia de email. Las cuentas del equipo no se contabilizan como cuentas familiares.

## Estado observado antes de limpiar demos

- 21 jugadores activos: 16 sin indicación de prueba y cinco demos identificados. Dos demos deportivos no tienen tutor. Todos los otros jugadores tienen al menos un contacto vinculado; eso no garantiza que su cuenta pueda verlos.
- 24 fichas de tutor; 12 tienen cuenta guardian, dos están vinculadas a administradores y diez no tienen cuenta vinculada. Cinco direcciones aparecen en dos fichas. Algunas fichas repetidas tienen vínculos distintos: requieren comprobación humana, no una fusión por email.
- Cuatro fichas no tienen jugador activo vinculado. Un jugador real tiene solo un contacto sin cuenta con el email de otra cuenta familiar: revisar la titularidad antes de enlazarlo.
- Equipo real: Karen, Roque y Manu como administradores (Manu tiene dos cuentas); Mocere Coulibaly como entrenador. Hay además cuentas demo. No se cambian sus roles ni se eliminan familias reales.
- Se han solicitado los nombres de los dos jugadores que deben conservarse. No borrar hasta identificarlos. Uno de los demos tiene dos pagos: su borrado físico cambiaría `payments.child_id` por ON DELETE SET NULL, por lo que debe preservarse/archivarse bajo la restricción vigente de no cambiar pagos.

## Inscripción, aceptación y acceso

- El formulario exige privacidad y condiciones. Los permisos de imagen son opcionales, por hijo y por uso; se eligen en la bienvenida del portal junto a la firma y pueden retirarse después. Registrar a un jugador no autoriza automáticamente publicar su imagen.
- Nuevas solicitudes siguen requiriendo aceptación del equipo. La aceptación personalizada incluye la bienvenida animada aprobada y las instrucciones del portal. La invitación envía el código al email registrado; código, contraseña propia, pantalla de éxito y entrada explícita al portal. Recuperación al mismo email.
- Pruebas simuladas actuales: acceso/códigos, confirmación persistente, notificaciones y detalles de aceptación, inscripción combinada, planes familiares, medios privados y recibos. No se enviaron mensajes a familias durante esta revisión.
- La prueba de Auth extremo a extremo y la recepción real por el propietario están documentadas en PAYMENTS-AUDIT.md. Son evidencias diferentes: los cuatro mensajes de la cola consultada están `sent` (aceptados por proveedor, cero errores pendientes), pero no se puede afirmar entrega al buzón de cada familia.
- La galería privada y los recibos tienen pruebas de aislamiento entre familias. No se activan pagos LIVE ni se modifica el circuito financiero.

## Validación de esta actualización

- `node scripts/test-portal-usage.cjs`: filtros y búsqueda; separar cuentas internas y familiares; origen y autorización; ignorar identidades/fechas enviadas por cliente; pestañas ocultas; reintentos y limitación de frecuencia.
- `scripts/test-portal-usage.sql`: prueba real en transacción revertida con usuarios sintéticos. RLS, permisos, identidad familiar vinculada, primera/última visita, repetición, bloqueo de lectura/escritura/RPC del cliente. Sin usuarios QA residuales.
- Migración remota y archivo reconciliados: `20261120103335_guardian_portal_activity.sql`.
- Antes/después de pruebas SQL: 21 pagos, digest `13ac2fe6f6d8c3721523c18b62853160`, sin cambios.
- Asesor de seguridad sin hallazgos sobre tabla/función nuevas. Persisten avisos anteriores de funciones SECURITY DEFINER, tablas cerradas sin políticas y protección de contraseñas filtradas desactivada; no equivalen a nuevas vulnerabilidades demostradas ni a una auditoría completa de seguridad.

## Antes de una invitación masiva

Confirmar los dos jugadores protegidos, limpiar solo demos revisados y resolver fichas duplicadas o sin acceso, especialmente cuando el email podría pertenecer a otro tutor. No cambiar roles de administradores para hacerlos pasar por familias. Comprobar recepción real con una familia piloto y después consultar la nueva sección de uso.
