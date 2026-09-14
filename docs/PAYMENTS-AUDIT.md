# Pagos — auditoría y diseño de implementación

Estado: en desarrollo, no activar cobros reales. Rama feat/stripe-preview-validation.

## Estado actual — integración comercial del 14 de septiembre

Esta sección sustituye las listas pendientes del archivo histórico que figura debajo.

Implementado:

- Portal Familias → Pagos: botón de Stripe para recibos propios de campus aprobado, participación de torneo, tienda y otros recibos. Importe y propiedad resueltos en servidor. Retorno al mismo dominio y confirmación exclusivamente por webhook.
- Academia: pago completo o autorización de tarjeta seguida de una programación mensual finita, `end_behavior=cancel`, de 1–60 meses según el plan del dueño. La matrícula se añade una sola vez. El precio/duración queda congelado en el contrato y se compara con la oferta que aceptó la familia para rechazar cambios durante la compra.
- Una autorización no se registra como pago. Cada `invoice.paid` registra una cuota; facturas duplicadas no duplican ingresos. Eventos de fallo/autorización pendiente y cambios/bajas de suscripción actualizan un estado separado consultando Stripe para tolerar eventos fuera de orden.
- Familias y administración ven contratos y número de cobros confirmados. Un contrato iniciado se puede retomar sin abrir otro. Si hay un contrato activo no se ofrece pagar de nuevo los recibos antiguos.
- Se puede cancelar un intento abierto: primero se caduca la sesión en Stripe y después se libera en la web. Volver atrás o cerrar una pestaña no se interpreta como cancelación ni como pago.
- Confirmar un jugador en un torneo genera su recibo individual al precio vigente; los recibos anteriores por equipo se conservan para conciliación, sin reescribir el histórico.
- Stock agregado por producto (incluidas líneas repetidas), bloqueos ordenados, devolución del stock una sola vez al cancelar un pedido no pagado. Capacidad de campus validada bajo bloqueo en base de datos.
- Ledger TEST separado: ninguna confirmación test marca recibos reales pagados. Claves solo servidor y cobros LIVE bloqueados salvo activación explícita en producción.
- Migraciones aplicadas: `20260914193102_receipt_checkout_ledger`, `20260914193103_academy_checkout_contracts`, `20260914193104_tournament_player_receipts`, `20260914193109_store_order_stock_safety`.

Verificado:

- `npm run test:payments`: cinco suites, incluyendo contrato Stripe con SDK simulado, matrícula única, fin de programación, firmas, modo, idempotencia y fallos. No son pagos reales ni sustituyen una prueba end-to-end de Stripe.
- PostgreSQL 17 local vacío, pruebas con rollback: `scripts/test-commercial-checkout.sql` y `scripts/test-commercial-sources.sql`. Incluyen propiedad, RLS real de authenticated, duplicados, conservación del histórico, precio inmutable, duración, stock y plazas. Nunca ejecutar estos fixtures en producción.
- TypeScript, ESLint de archivos modificados y build Next.js correctos.
- Prueba de integración `scripts/test-preview-checkouts.cjs`: familia temporal autenticada, plan no publicado, recibo TEST y contratos privados. Apertura real de Checkout de recibo, pago completo y modo setup mensual; segundo clic reutiliza sesión, cancelación real en Stripe y recibo original pendiente. Perfiles/plan/recibos temporales eliminados. NO se proporcionó tarjeta ni se confirmó una factura: esta prueba no acredita el ciclo mensual completo.
- Lectura de Checkout, precios, clientes, suscripciones y programaciones comprobada en Preview. El webhook TEST existente conserva su URL y firma y ahora escucha nueve eventos: los cuatro de Checkout, `invoice.paid`, `invoice.payment_failed`, `invoice.payment_action_required`, `customer.subscription.updated` y `customer.subscription.deleted`.
- Asesor Supabase: no nuevas funciones de cobro expuestas a clientes. `receipt_checkout_events` no tiene políticas de cliente deliberadamente: solo service_role. Persisten avisos anteriores de RPC públicas y Auth; no se alteraron invitaciones ni accesos de trabajadores.

Pendiente antes de habilitar ventas:

1. Prueba real en entorno TEST del checkout comercial de cada módulo, incluyendo retorno autenticado, rechazo, abandono y confirmación.
2. Prueba de mensualidades con tarjeta TEST y Test Clock: primera factura, cuota siguiente, cuota fallida y finalización sin cobro extra. Verificar permisos de ESCRITURA de la clave restringida; que una consulta de lectura funcione no demuestra escritura.
3. Resolver incidencias de tarjeta y cambios de medio de pago desde Stripe; todavía no hay autoservicio de cambio de tarjeta en el portal. Reembolsos, ajustes y cancelaciones deben conciliarlos administración: no se ha implementado el flujo completo de devolución automática en cada módulo.
4. Tienda mantiene reserva de stock al crear el pedido. La cancelación impagada lo libera, pero no existe aún caducidad automática de pedidos abandonados. Los pedidos públicos requieren acceso del comprador al portal para pagar; no hay checkout público inmediato anónimo.
5. Revisar avisos Auth previos (caducidad OTP y protección de contraseñas filtradas) antes de entregar: [seguridad de producción](https://supabase.com/docs/guides/platform/going-into-prod#security). La tienda pública conserva una RPC intencionalmente anónima; endurecer anti-abuso antes de una campaña pública: [revisión SECURITY DEFINER](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable).
6. El dueño valida precios, duración, condiciones y políticas comerciales. Solo después: claves y webhook LIVE independientes, despliegue de producción y activación explícita. No se han habilitado ni hecho cobros reales.

### Operativa para el dueño

- Ajustes → Planes: habilitar pago completo y/o mensualidades, precio de cada opción, matrícula y duración. Las opciones online existentes siguen desactivadas hasta decisión del dueño; no se han inventado tarifas.
- Academia: asignar jugador a su grupo y plan. La familia revisa y acepta una modalidad en Pagos. No cambiar manualmente recibos de una membresía con contrato Stripe activo.
- Campus: aprobar la plaza; la familia paga el recibo desde Pagos. Aprobar no registra dinero recibido.
- Torneos: configurar precio por jugador y confirmar convocados. Los recibos históricos por equipo no se convierten automáticamente a individuales; revisarlos antes de emitir otra obligación.
- Tienda: se crea pedido/recibo pendiente; familias registradas lo pagan desde Pagos. Los pedidos impagados cancelados liberan stock; envío y pago son estados distintos.
- Conexión Stripe: diagnóstico y seguimiento de contratos, cobros confirmados e incidencias. Cobros LIVE todavía bloqueados.

## Archivo histórico — diagnóstico y avances anteriores

Las menciones a “pendiente” en las secciones siguientes reflejan su fecha, no sustituyen el estado actual de arriba.

## Correcciones verificadas (14 de septiembre)

- Migración `20260914163603_separate_booking_from_payment.sql` aplicada: confirmar campus/equipo o enviar un pedido ya no implica cobro. Se mantiene la acción explícita de marcar un pedido pagado y la gestión financiera manual.
- El trigger no recalcula importes ni métodos de recibos existentes al editar una inscripción. Conserva pagos, fallos y reembolsos; borrar el origen conserva el recibo sin referencia. No se reescribe el histórico.
- Prueba aislada PostgreSQL 17: `scripts/test-booking-payment-separation.sql`, siempre contra una base local vacía; rollback final. Verifica confirmación, cambio de tarifa, cancelación, devolución, envío y permisos del trigger.
- Acceso «Conexión Stripe» en menús de administración de escritorio y móvil. Tras volver de Checkout, la página espera el webhook y actualiza el estado sin crear otra sesión. La evidencia de confirmación proviene del ledger, no de la URL.
- `npm run test:payments` agrupa las cuatro suites de reglas, tarifas, retorno y firma del webhook. ESLint vuelve a ejecutar los scripts CommonJS sin errores de configuración.
- Siguen pendientes los adaptadores comerciales y sus pruebas completas indicados abajo. Esta entrega no habilita ventas ni demuestra todavía una suscripción mensual completa.

## Confirmación automática de pruebas (13 de septiembre)

- `/api/stripe/webhook` implementado, solo test; devuelve 503 sin secreto o para live. No es todavía un adaptador para pedidos/recibos reales.
- Verifica firma sobre cuerpo original, límite de 1 MB, modo, propósito y vínculo exacto sesión/intento/importe/moneda. No guarda datos de tarjeta ni payloads completos.
- Ledger aislado `stripe_test_attempts` + `stripe_test_events`. Escrituras y RPC exclusivas de service_role; el administrador solo puede leer sus intentos con su sesión normal.
- Una sesión activa por administrador y clave de idempotencia persistente por intento. Los avisos duplicados no repiten la confirmación y un aviso de expiración tardío no revierte un pago.
- La pantalla `/admin/stripe` diferencia consulta directa a Stripe de confirmación automática guardada. La URL de retorno no marca nada como pagado.
- Pruebas: `node scripts/test-stripe-webhook.cjs` (firma, límites, reintentos y entorno) y `scripts/test-stripe-ledger.sql` (transacción revertida, duplicados y permisos). Ambas pasan. Asesor de seguridad sin nuevos avisos para estos objetos.
- Destino snapshot TEST `Academy TEST — Checkout` creado (`we_1UFJ0wGk8vSBcmVd6SsPNwY3`), API 2024-11-20.acacia, cuenta propia. Eventos: checkout.session.completed, checkout.session.async_payment_succeeded, checkout.session.async_payment_failed, checkout.session.expired. `STRIPE_WEBHOOK_SECRET` guardado como Secret exclusivamente en Preview.
- Entrega real del evento TEST Stripe → webhook → ledger comprobada el 13/09 a las 20:10:28 UTC: intento `ba7e9983-41ee-4553-a033-3f57c3d96ca5`, estado `paid`, 100 céntimos EUR, evento `checkout.session.completed`. No es un cobro real ni una validación de mensualidades. No activar ventas. Documentación: https://docs.stripe.com/webhooks
- Preview desplegada con la firma: https://academycb-e4kedwtvo-roques-projects-bd4f7acb.vercel.app . Build correcto; POST con `vercel curl` autorizado devuelve `Missing signature`, confirmando que el handler carga la configuración y rechaza peticiones sin firma. Esto NO acredita aún una entrega firmada desde Stripe.
- Alias de la rama actualizado: https://academycb-git-feat-stripe-previ-bc1b74-roques-projects-bd4f7acb.vercel.app . El destino Stripe usa este alias y `/api/stripe/webhook`, con credencial Automation Bypass independiente autorizada por el usuario. La protección global y la credencial anterior permanecen sin cambios. No documentar el valor ni la URL con su query secreta. Mantener este alias actualizado al desplegar por CLI. Revocar el bypass al finalizar las pruebas. Referencia: https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation
- La primera prueba mostró un fallo de retorno: se usaba VERCEL_URL (host inmutable) en lugar del alias donde estaba la sesión. Corregido usando Origin validado contra el alias exacto del proyecto y su despliegue actual, sin ampliar cookies entre dominios ni permitir otros hosts Vercel. Sesiones pendientes de otro dominio no se reutilizan; el pago ya confirmado no se altera. Prueba `node scripts/test-stripe-return-origin.cjs` correcta. Pendiente repetición visual del retorno con una sesión nueva.

## Hallazgos comprobados

- La clave de pruebas funciona en Preview para lectura de Checkout. No se ha verificado todavía una compra completa.
- `place_store_order` calcula precios en base de datos y bloquea productos, pero descuenta stock antes del pago. No hay liberación automática por abandono. Además, validar cada línea antes de descontar permite que varias líneas del mismo producto superen juntas el stock; agrupar cantidades por producto antes de validar, bloquear siempre por ID.
- El portal Pagos muestra pedidos como tarjeta aunque su método sea manual, llama “Total abonado” a importes pendientes y reduce cancelados/reembolsados/fallidos a “Pendiente”.
- Campus tiene comprobación de capacidad separada de la inserción: dos altas simultáneas pueden superar el límite.
- Corregido el 14/09: los triggers ya no convierten campus/equipo confirmado en pagado; no se reclasificó retrospectivamente el histórico.
- Torneos tiene jugadores y equipos; el trigger financiero actual factura `tournament_teams`, no `tournament_players`. Hace falta definir unidad de precio.
- El portal muestra cuotas por hijo y pedidos por email; el nuevo pago debe comprobar relación real tutor-hijo o propietario del pedido en servidor, no confiar en IDs recibidos del cliente.
- El webhook y ledger técnico TEST ya existen; todavía falta conectarlos a las obligaciones de pago de cada módulo. El regreso a la web no debe marcar un pago como abonado.

## Experiencia prevista

| Área | Acción | Condición |
| --- | --- | --- |
| Tienda | Revisar pedido → Pagar con tarjeta | Precio calculado en servidor, stock reservado y caducidad |
| Academia | Pago completo o mensualidades autorizadas | Precio completo, cuota y duración configurables; sin renovación automática |
| Campus | Solicitar plaza → aprobación → Pagar inscripción | Mantener el flujo de aprobación; no cobrar solicitudes sin plaza |
| Torneos | Convocatoria aprobada → Pagar participación | Precio por jugador |
| Familias / Pagos | Pagar, ver estado y justificante | Solo operaciones propias; indicar hijo, concepto, vencimiento |
| Administración | Estado, referencia Stripe, conciliación | Nunca confundir matrícula confirmada con dinero recibido |

## Núcleo de seguridad preparado

- SDK Stripe fijado a versión exacta; claves solo servidor.
- Conversión estricta de euros a céntimos, sin aceptar totales del navegador.
- Clave de pruebas fuera de producción; producción requiere clave real, webhook y activación explícita.
- Clave de idempotencia basada en un intento persistente, no en cada clic.
- Verificación de firma del cuerpo original del webhook, antigüedad y modo test/live.
- Comprobación del ID de sesión, intento, moneda, importe y estado paid antes de procesar.
- Estos helpers no están conectados a botones de cobro público hasta terminar el registro transaccional.

## Pendiente de implementación y pruebas

1. Registro de intentos/eventos con restricciones únicas, bloqueo del recibo y una sesión activa por obligación.
2. Separación de pagos de pruebas: nunca actualizar recibos reales ni contabilidad real con un evento test.
3. Reservas atómicas de stock/plazas y liberación idempotente al caducar; cancelación visual no equivale a sesión expirada.
4. Webhook firmado con confirmación transaccional; duplicados, concurrencia, eventos fuera de orden y fallo temporal de base de datos.
5. Verificado el 14/09: separación de confirmación deportiva/envío y cobro, y conservación de historial. Pendiente extender el modelo a obligaciones Stripe por jugador.
6. Botones, estados y conciliación en cada módulo, sin duplicar ingresos de pedidos y ledger.
7. Pruebas: éxito, tarjeta rechazada, abandono, doble clic, importe manipulado, tutor ajeno, sin stock, última plaza, firma falsa, evento duplicado, cambio de precio, pago tardío y reembolso.
8. Entrega firmada Stripe → Preview → ledger técnico verificada el 13/09. Falta repetir el retorno visual y probar los futuros adaptadores comerciales. No desactivar globalmente la protección de Preview.
9. Validación final por el negocio antes de configurar claves reales y habilitar producción.

## Decisiones confirmadas por el propietario

- Academia: pago completo y/o mensualidad recurrente, con opciones, importes y duración de 1 a 60 meses configurables por el dueño. Sin renovación automática.
- El pago completo puede tener descuento frente a la suma de cuotas. Matrícula una sola vez, añadida al primer pago.
- Guardar precio, duración, modalidad y matrícula como snapshot del contrato. Editar el plan no modifica contratos ya aceptados.
- Torneos: precio por jugador.
- Mantener aprobación previa de nuevas solicitudes. No se cambia a matrícula automática sin autorización explícita.

## Avance de configuración de planes

- Nuevas opciones en Ajustes → Planes, sin sustituir la configuración manual anterior.
- Opciones online desactivadas por defecto: no inferir precios ni activar planes existentes.
- Validación de importes y duración en servidor y restricciones adicionales en base de datos.
- `academyPriceSnapshot` prepara un snapshot inmutable y calcula matrícula inicial y total; pendiente persistirlo en contratos y conectarlo a Stripe.
- `node scripts/test-academy-pricing.cjs` prueba límites, importes, matrícula única y cambio de precio sin modificar un snapshot anterior.
- Referencia para limitar la suscripción: https://docs.stripe.com/billing/subscriptions/subscription-schedules (`end_behavior=cancel`). Esta programación aún no está conectada.
- Migración aplicada y reconciliada con historial remoto: `20260913172823_configurable_academy_checkout_prices.sql`. Prueba SQL en transacción revertida: guardado válido y rechazo de decimales, precio ausente y duración excesiva.
- Asesor de seguridad: no se añaden tablas ni permisos. Persisten avisos anteriores sobre funciones SECURITY DEFINER públicas, OTP superior a una hora y protección de contraseñas filtradas desactivada; revisar antes de entrega. Referencias: https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable y https://supabase.com/docs/guides/platform/going-into-prod#security . No se cambian invitaciones ni permisos ajenos a estos planes.
