# Portal Familias — revisión del 20/11/2026

Actualización posterior: el propietario autorizó activar las mensualidades generales. Production tiene `STRIPE_RECURRING_PAYMENTS_ENABLED=true`; las nuevas solicitudes de Academia con tarjeta reciben el enlace individual al aceptar su plaza, siempre que la preparación y el vínculo familiar sean correctos. El enlace de las nuevas altas con tarjeta reúne primer mes, matrícula aplicable y Plus opcional; después solo se cobra la cuota mensual, sin renovación al finalizar temporada. Se ha publicado también la PWA con instalación y pantalla offline. Evidencia y límites de comprobación en la sección inicial de `PAYMENTS-AUDIT.md`; las menciones a mensualidades desactivadas de auditorías anteriores son históricas.

## Registros operativos — 20 noviembre 2026, 18:30 Madrid

Comprobación de solo lectura: diez tutores reales con cuenta guardian vinculada, ocho con marca de contraseña configurada y dos pendientes. Una visita visible registrada hoy; las demás visitas anteriores al contador son desconocidas. Una nueva solicitud de Academia recibida a las 17:14 Madrid sigue pendiente de aceptación. Son hechos distintos: cuenta, contraseña, solicitud y uso del portal. No se aceptaron solicitudes ni se enviaron mensajes durante esta revisión.

Vercel: consulta de errores de las últimas 24 horas devuelve 13 entradas de despliegues anteriores (sesiones no válidas y validación de oferta); la consulta de peticiones 5xx de 14:30–17:30 UTC devuelve cero. La oferta pública actual filtra borradores privados antes de validar; su regresión pasa. Supabase Auth, misma ventana: un rechazo por credenciales incorrectas y una sesión sin refresh token. Esto no atribuye los intentos a un padre concreto ni demuestra ausencia de todos los posibles errores. Outbox de inscripción: cinco mensajes con aceptación del proveedor, ninguno pendiente/fallido; no equivale a recepción o lectura en el buzón.

Se añaden logs JSON `academy_ops` a Vercel: arranque de instrumentación, excepciones capturadas por Next en servidor, códigos rechazados/expirados, contraseña guardada o rechazada, fallo de acceso automático, visita no registrada, correo fallido y errores de Checkout/webhook. Incluyen fecha, categoría, nivel, estado HTTP cuando aplica, versión y digest numérico de Next. No se serializan errores, mensajes libres, solicitudes, cookies, cabeceras, rutas reales, emails, tokens, códigos, contraseñas ni datos de pago. Vercel aporta la correlación de petición. No se crea una API pública de telemetría ni se añaden escrituras de base de datos por cada error.

Consulta operativa: `vercel logs --project academycb --scope roques-projects-bd4f7acb --environment production --since 24h --query academy_ops --json`. Los rechazos previstos son warnings; los fallos técnicos son errores. Conservar también Auth logs para el inicio de sesión del navegador. No constituye vigilancia humana continua, alertas externas ni cobertura de todos los fallos del navegador. La retención depende del proveedor.

Pruebas: redacción de datos sensibles, vocabulario cerrado, correlación por versión, severidad y fallo del logger sin interrumpir la operación; suites de acceso por código, contraseña, correos, visitas y Stripe con proveedores simulados. TypeScript y lint de archivos afectados. Se corrige un test de manipulación aleatoria para que cambie siempre el primer carácter, y el cargador de pruebas acepta el módulo de logs. Sin cambios de esquema, pagos, cuentas o suscripciones.

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
- El propietario aclaró después: retirar solo pruebas creadas por el agente y conservar todos los jugadores creados por Karen. Uno de los demos tiene dos pagos: su borrado físico cambiaría `payments.child_id` por ON DELETE SET NULL, por lo que se archiva bajo la restricción vigente de no cambiar pagos.

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

Resolver fichas duplicadas o sin acceso, especialmente cuando el email podría pertenecer a otro tutor. El propietario pidió dejar intactos los datos creados por Karen: estas incidencias quedan visibles, no se fusionan ni reasignan automáticamente. No cambiar roles de administradores para hacerlos pasar por familias. Comprobar recepción real con una familia piloto y después consultar la nueva sección de uso.

## Publicación y limpieza completadas

- Código `4e476ac`, Vercel `dpl_7W4cjdJ3XCC43NYfKbmQXbEM5vpw` READY. Build de producción correcto; TypeScript, lint del código nuevo y pruebas superadas.
- Repetida la prueba real de Auth en producción: ocho verificaciones de código incorrecto/usado, ausencia de sesión antes de contraseña, contraseña propia, login, recuperación y rechazo de contraseña anterior. Cuenta desechable eliminada; ningún correo enviado.
- Prueba HTTP adicional: SSR del portal responde 200 y no registra una visita; seguimiento anónimo o de otro origen recibe 403; una familia no puede abrir el informe administrativo.
- Prueba visual real: inicio de sesión familiar en Chrome registra la visita; administrador ve «Ha entrado», primera/última actividad y filtro con un clic. Revisión en escritorio y emulación de 390 px, incluida la ficha completa y su scroll. No se firmó ningún documento. Las dos cuentas temporales y su visita se eliminaron al terminar; contraseñas no guardadas en navegador.
- Borrados cuatro jugadores ficticios: Álex de prueba, Álex Demo, DEMO Alex y DEMO Dani, junto con sus dependencias exclusivamente de demostración. Retirados los dos tutores demo, las tres cuentas Auth demo y el trabajador/equipo/sesión/aviso ficticios. El avatar del jugador de prueba eliminado se retiró del almacenamiento.
- Jugador Demo Roque queda archivado, conservando sus dos pagos y referencias. Los planes privados de prueba ya estaban inactivos/no publicables; no se activaron ni alteraron importes.
- Actualización posterior por nueva autorización expresa de Roque: ese último demo se borró definitivamente tras confirmar el cobro real de 1 €. Sus dos recibos se conservan desvinculados; los otros 19 pagos y todos los jugadores reales permanecen intactos. Retirada y nuevo digest documentados en «Retirada autorizada del piloto de 1 €» de `PAYMENTS-AUDIT.md`.
- Antes de aplicar se ejecutó el borrado exacto en una transacción revertida. La aplicación definitiva verificó digests de todos los jugadores y tutores ajenos al alcance y de todos los pagos; cualquier cambio no previsto abortaba la transacción. Copia privada de los fixtures bajo `tmp/demo-cleanup/backup-20261120.json`, fuera del repositorio.
- Verificación final: 16 jugadores activos, sin niños QA; 22 fichas de tutor y 10 cuentas familiares. Equipo real conservado: Karen, Manu (dos emails), Roque y Mocere. Cero cuentas demo retiradas residuales. 21 pagos, mismo digest `13ac2fe6f6d8c3721523c18b62853160`.

## Fallo de inscripción detectado y resuelto en la revisión final

- La comprobación HTTP anónima detectó `/inscripcion` con 500. Los logs de Vercel identificaron una validación Zod de precio y fechas: `getAcademyOffer` validaba todos los planes antes de excluir los inactivos. El plan privado «Academia · Demo sin cobros», con precio cero y sin temporada, bloqueaba así la página pública aunque no estuviera publicado.
- Se retiró únicamente ese plan demo ya sin matrículas, comprobando que los pagos y los otros planes no cambiaban. `/inscripcion` volvió a 200 inmediatamente.
- El código filtra ahora planes inactivos, grupos no publicados y campus no publicados antes de validar la oferta pública. No relaja la validación de precios o fechas de la oferta publicada. Los borradores privados tampoco alteran la versión que valida una inscripción en curso.
- Regresión `scripts/test-public-offer-drafts.cjs`, incluida en `npm run test:offering`, reproduce el plan privado incompleto y verifica que la oferta pública sigue intacta; una oferta activa inválida continúa fallando. TypeScript y lint correctos.
- La prueba SQL de galería usa ahora una familia sintética creada y revertida dentro de su transacción, sin depender de las cuentas demo eliminadas. Repetida con RLS real y digest financiero intacto.
